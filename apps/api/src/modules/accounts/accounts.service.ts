import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface JournalEntryDto {
  entryDate: string;
  description: string;
  referenceType?: string;
  referenceId?: string;
  lines: { accountId: string; debit: number; credit: number; narration?: string }[];
}

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async getChartOfAccounts(tenantId: string) {
    return this.prisma.account.findMany({
      where: { tenantId, isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  async createAccount(tenantId: string, dto: {
    code: string; name: string; accountType: string; parentId?: string;
  }) {
    const existing = await this.prisma.account.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code } },
    });
    if (existing) throw new BadRequestException(`Account code ${dto.code} already exists`);

    return this.prisma.account.create({ data: { tenantId, ...dto } });
  }

  async getJournalEntries(tenantId: string, from?: Date, to?: Date) {
    return this.prisma.journalEntry.findMany({
      where: {
        tenantId,
        ...(from && to && { entryDate: { gte: from, lte: to } }),
      },
      include: {
        lines: { include: { account: { select: { code: true, name: true, accountType: true } } } },
      },
      orderBy: { entryDate: 'desc' },
      take: 200,
    });
  }

  async createJournalEntry(tenantId: string, userId: string, dto: JournalEntryDto) {
    const totalDebit = dto.lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = dto.lines.reduce((s, l) => s + l.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(
        `Journal entry not balanced: debits ${totalDebit} ≠ credits ${totalCredit}`,
      );
    }

    return this.prisma.journalEntry.create({
      data: {
        tenantId,
        entryDate: new Date(dto.entryDate),
        description: dto.description,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        createdById: userId,
        isPosted: true,
        lines: {
          create: dto.lines.map((l) => ({
            accountId: l.accountId,
            debit: l.debit,
            credit: l.credit,
            narration: l.narration,
          })),
        },
      },
      include: { lines: { include: { account: { select: { code: true, name: true } } } } },
    });
  }

  async getLedger(tenantId: string, accountId: string, from?: Date, to?: Date) {
    const account = await this.prisma.account.findFirst({ where: { id: accountId, tenantId } });
    if (!account) throw new NotFoundException('Account not found');

    const lines = await this.prisma.journalLine.findMany({
      where: {
        accountId,
        journalEntry: {
          tenantId,
          isPosted: true,
          ...(from && to && { entryDate: { gte: from, lte: to } }),
        },
      },
      include: {
        journalEntry: { select: { entryDate: true, description: true, referenceType: true } },
      },
      orderBy: { journalEntry: { entryDate: 'asc' } },
    });

    let runningBalance = 0;
    const entries = lines.map((line) => {
      const debit = Number(line.debit);
      const credit = Number(line.credit);

      if (['asset', 'expense'].includes(account.accountType)) {
        runningBalance += debit - credit;
      } else {
        runningBalance += credit - debit;
      }

      return {
        date: line.journalEntry.entryDate,
        description: line.journalEntry.description,
        referenceType: line.journalEntry.referenceType,
        debit,
        credit,
        balance: runningBalance,
      };
    });

    return { account, entries, closingBalance: runningBalance };
  }

  async getProfitAndLoss(tenantId: string, from: Date, to: Date) {
    const entries = await this.prisma.journalLine.findMany({
      where: {
        journalEntry: { tenantId, isPosted: true, entryDate: { gte: from, lte: to } },
        account: { accountType: { in: ['revenue', 'expense'] } },
      },
      include: {
        account: { select: { id: true, code: true, name: true, accountType: true, parentId: true } },
      },
    });

    const revenue: Record<string, { name: string; amount: number }> = {};
    const expenses: Record<string, { name: string; amount: number }> = {};

    for (const line of entries) {
      const { accountType, id, name } = line.account;
      const amount = Number(line.credit) - Number(line.debit);

      if (accountType === 'revenue') {
        if (!revenue[id]) revenue[id] = { name, amount: 0 };
        revenue[id].amount += amount;
      } else {
        if (!expenses[id]) expenses[id] = { name, amount: 0 };
        expenses[id].amount += Math.abs(amount);
      }
    }

    const totalRevenue = Object.values(revenue).reduce((s, v) => s + v.amount, 0);
    const totalExpenses = Object.values(expenses).reduce((s, v) => s + v.amount, 0);

    return {
      from,
      to,
      revenue: Object.entries(revenue).map(([id, v]) => ({ accountId: id, ...v })),
      expenses: Object.entries(expenses).map(([id, v]) => ({ accountId: id, ...v })),
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
    };
  }

  async getTrialBalance(tenantId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { tenantId, isActive: true },
      include: {
        journalLines: {
          where: { journalEntry: { tenantId, isPosted: true } },
          select: { debit: true, credit: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    return accounts
      .map((acc) => {
        const totalDebit = acc.journalLines.reduce((s, l) => s + Number(l.debit), 0);
        const totalCredit = acc.journalLines.reduce((s, l) => s + Number(l.credit), 0);
        return {
          id: acc.id,
          code: acc.code,
          name: acc.name,
          accountType: acc.accountType,
          totalDebit,
          totalCredit,
          balance: totalDebit - totalCredit,
        };
      })
      .filter((a) => a.totalDebit !== 0 || a.totalCredit !== 0);
  }

  // ── Balance Sheet ──────────────────────────────────────────────────────────

  async getBalanceSheet(tenantId: string, asOfDate?: Date) {
    const asOf = asOfDate || new Date();

    const accounts = await this.prisma.account.findMany({
      where: { tenantId, isActive: true },
      include: {
        journalLines: {
          where: {
            journalEntry: {
              tenantId,
              isPosted: true,
              entryDate: { lte: asOf },
            },
          },
          select: { debit: true, credit: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    const mapped = accounts.map((acc) => {
      const debit = acc.journalLines.reduce((s, l) => s + Number(l.debit), 0);
      const credit = acc.journalLines.reduce((s, l) => s + Number(l.credit), 0);
      let balance = 0;
      if (acc.accountType === 'asset' || acc.accountType === 'expense') {
        balance = debit - credit;
      } else {
        balance = credit - debit;
      }
      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        accountType: acc.accountType,
        debit,
        credit,
        balance,
      };
    });

    const assets = mapped.filter((a) => a.accountType === 'asset');
    const liabilities = mapped.filter((a) => a.accountType === 'liability');
    const equity = mapped.filter((a) => a.accountType === 'equity');

    const revenueTotal = mapped
      .filter((a) => a.accountType === 'revenue')
      .reduce((s, a) => s + a.balance, 0);
    const expenseTotal = mapped
      .filter((a) => a.accountType === 'expense')
      .reduce((s, a) => s + a.balance, 0);
    const netEarnings = revenueTotal - expenseTotal;

    const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
    const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);
    const baseEquity = equity.reduce((s, a) => s + a.balance, 0);
    const totalEquity = baseEquity + netEarnings;

    const difference = Math.abs(totalAssets - (totalLiabilities + totalEquity));
    const isBalanced = difference < 1.0;

    return {
      asOf,
      assets: {
        items: assets,
        total: totalAssets,
      },
      liabilities: {
        items: liabilities,
        total: totalLiabilities,
      },
      equity: {
        items: equity,
        currentYearEarnings: netEarnings,
        total: totalEquity,
      },
      totalAssets,
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
      workingCapital: totalAssets - totalLiabilities,
      debtToEquityRatio: totalEquity > 0 ? Number((totalLiabilities / totalEquity).toFixed(2)) : 0,
      isBalanced,
      difference,
    };
  }

  // ── Tax Summary (Pakistani FBR / Provincial Filings) ───────────────────────

  async getTaxSummary(tenantId: string, fromDate?: Date, toDate?: Date) {
    const from = fromDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = toDate || new Date();

    const [sales, grns, tenant] = await Promise.all([
      this.prisma.sale.findMany({
        where: { tenantId, saleDate: { gte: from, lte: to }, status: 'completed' },
        include: { items: { include: { product: true } } },
      }),
      this.prisma.grn.findMany({
        where: { tenantId, receivedDate: { gte: from, lte: to } },
        include: { items: true },
      }),
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, settings: true },
      }),
    ]);

    const settings = (tenant?.settings as any) || {};

    let grossSales = 0;
    let outputTax = 0;
    let zeroRatedPharmaSales = 0;
    let standardTaxableSales = 0;

    for (const sale of sales) {
      const saleTotal = Number(sale.total);
      const taxAmount = Number(sale.taxAmount || 0);
      grossSales += saleTotal;
      outputTax += taxAmount;
      if (taxAmount > 0) {
        standardTaxableSales += (saleTotal - taxAmount);
      } else {
        zeroRatedPharmaSales += saleTotal;
      }
    }

    let totalPurchases = 0;
    let inputTaxPaid = 0;
    for (const grn of grns) {
      for (const item of grn.items) {
        const itemTotal = item.qtyReceived * Number(item.costPerUnit);
        totalPurchases += itemTotal;
      }
    }

    const whtSuppliers = Math.round(totalPurchases * 0.045);
    const netSalesTaxPayable = Math.max(0, outputTax - inputTaxPaid);

    return {
      period: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
      taxpayer: {
        businessName: tenant?.name || 'SmartBiz Pharmacy',
        ntn: settings?.ntn || '1234567-8',
        strn: settings?.strn || '3277876123456',
        jurisdiction: settings?.province || 'Punjab (PRA / FBR)',
      },
      outputTax: {
        grossSales,
        zeroRatedPharmaSales,
        standardTaxableSales,
        taxCollected: outputTax,
        standardRate: '18%',
        pharmaRate: '0% (Exempt)',
      },
      inputTax: {
        totalPurchases,
        inputTaxClaimable: inputTaxPaid,
        grnCount: grns.length,
      },
      withholdingTax: {
        section153Supplies: whtSuppliers,
        rate: '4.5%',
        description: 'WHT deducted on distributor invoice payments (Section 153)',
      },
      settlement: {
        netSalesTaxPayable,
        whtLiability: whtSuppliers,
        totalTaxPayableToGovt: netSalesTaxPayable + whtSuppliers,
        status: netSalesTaxPayable === 0 ? 'Exempt / Fully Zero-Rated' : 'Payment Required',
        filingDeadline: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 15).toISOString().slice(0, 10),
      },
    };
  }

  // ── Accounts Payable ────────────────────────────────────────────────────────

  async getPayables(tenantId: string) {
    const suppliers = await this.prisma.supplier.findMany({
      where: { tenantId, isActive: true },
      include: {
        purchaseOrders: {
          select: { id: true, poNumber: true, status: true, expectedDate: true, createdAt: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const grns = await this.prisma.grn.findMany({
      where: { tenantId },
      include: { items: true },
      orderBy: { receivedDate: 'desc' },
    });

    const supplierPayments = await this.prisma.journalLine.findMany({
      where: {
        account: { code: '2000', tenantId },
        debit: { gt: 0 },
        journalEntry: { tenantId, isPosted: true },
      },
      include: { journalEntry: true },
    });

    const now = Date.now();
    let totalPayable = 0;
    let overduePayable = 0;
    let dueThisWeek = 0;
    const agingSummary = { current: 0, days30_60: 0, days60_90: 0, over90: 0 };

    const supplierDetails = suppliers.map((sup) => {
      const supGrns = grns.filter((g) => g.supplierId === sup.id);
      const totalInvoiced = supGrns.reduce((sum, g) => {
        return sum + g.items.reduce((s, item) => s + Number(item.costPerUnit) * item.qtyReceived, 0);
      }, 0);

      const supPayments = supplierPayments
        .filter((l) => l.journalEntry.referenceId === sup.id || l.journalEntry.description.toLowerCase().includes(sup.name.toLowerCase()))
        .reduce((sum, l) => sum + Number(l.debit), 0);

      const outstandingBalance = Math.max(0, totalInvoiced - supPayments);
      totalPayable += outstandingBalance;

      const aging = { current: 0, days30_60: 0, days60_90: 0, over90: 0 };
      let supOverdue = 0;
      let supDueWeek = 0;

      let remainingBalance = outstandingBalance;
      for (const grn of supGrns) {
        if (remainingBalance <= 0) break;
        const grnTotal = grn.items.reduce((s, item) => s + Number(item.costPerUnit) * item.qtyReceived, 0);
        const billAmount = Math.min(remainingBalance, grnTotal);
        remainingBalance -= billAmount;

        const ageDays = Math.floor((now - new Date(grn.receivedDate).getTime()) / (1000 * 60 * 60 * 24));
        if (ageDays <= 30) {
          aging.current += billAmount;
          agingSummary.current += billAmount;
        } else if (ageDays <= 60) {
          aging.days30_60 += billAmount;
          agingSummary.days30_60 += billAmount;
        } else if (ageDays <= 90) {
          aging.days60_90 += billAmount;
          agingSummary.days60_90 += billAmount;
        } else {
          aging.over90 += billAmount;
          agingSummary.over90 += billAmount;
        }

        if (ageDays > (sup.paymentTerms || 30)) {
          supOverdue += billAmount;
          overduePayable += billAmount;
        } else if ((sup.paymentTerms || 30) - ageDays <= 7) {
          supDueWeek += billAmount;
          dueThisWeek += billAmount;
        }
      }

      if (remainingBalance > 0) {
        aging.current += remainingBalance;
        agingSummary.current += remainingBalance;
      }

      return {
        id: sup.id,
        name: sup.name,
        contactPerson: sup.contactPerson,
        phone: sup.phone,
        email: sup.email,
        paymentTerms: sup.paymentTerms,
        totalInvoiced,
        totalPaid: supPayments,
        outstandingBalance,
        overdueAmount: supOverdue,
        aging,
        recentGrns: supGrns.slice(0, 3).map((g) => ({
          id: g.id,
          invoiceNumber: g.supplierInvoiceNumber || g.id.slice(0, 8),
          receivedDate: g.receivedDate,
          total: g.items.reduce((s, item) => s + Number(item.costPerUnit) * item.qtyReceived, 0),
        })),
      };
    });

    return {
      summary: {
        totalPayable,
        overduePayable,
        dueThisWeek,
        supplierCount: supplierDetails.filter((s) => s.outstandingBalance > 0).length,
        agingSummary,
      },
      suppliers: supplierDetails,
    };
  }

  async recordPayablePayment(
    tenantId: string,
    userId: string,
    dto: {
      supplierId: string;
      amount: number;
      paymentMethod: 'cash' | 'bank_transfer' | 'cheque';
      bankAccountId?: string;
      referenceNumber?: string;
      notes?: string;
    },
  ) {
    if (dto.amount <= 0) throw new BadRequestException('Payment amount must be greater than 0');

    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplierId, tenantId },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const apAccount = await this.prisma.account.findFirst({
      where: { tenantId, code: '2000' },
    });
    if (!apAccount) throw new BadRequestException('Accounts Payable account (2000) not found');

    const paymentAccountCode = dto.paymentMethod === 'cash' ? '1000' : '1100';
    const paymentAccount = await this.prisma.account.findFirst({
      where: { tenantId, code: paymentAccountCode },
    });
    if (!paymentAccount) throw new BadRequestException(`Payment account (${paymentAccountCode}) not found`);

    const ref = dto.referenceNumber ? ` Ref: ${dto.referenceNumber}` : '';
    const description = `Supplier Payment to ${supplier.name} via ${dto.paymentMethod.replace('_', ' ')}${ref}`;

    const journal = await this.createJournalEntry(tenantId, userId, {
      entryDate: new Date().toISOString(),
      description,
      referenceType: 'SupplierPayment',
      referenceId: supplier.id,
      lines: [
        {
          accountId: apAccount.id,
          debit: dto.amount,
          credit: 0,
          narration: `Debit AP for ${supplier.name}`,
        },
        {
          accountId: paymentAccount.id,
          debit: 0,
          credit: dto.amount,
          narration: `Disbursement from ${paymentAccount.name}`,
        },
      ],
    });

    return {
      success: true,
      message: `Payment of PKR ${dto.amount.toLocaleString()} to ${supplier.name} recorded successfully`,
      journalEntryId: journal.id,
    };
  }

  // ── Accounts Receivable ─────────────────────────────────────────────────────

  async getReceivables(tenantId: string) {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, isActive: true },
      include: {
        sales: {
          select: { id: true, invoiceNumber: true, total: true, saleDate: true },
          orderBy: { saleDate: 'desc' },
          take: 5,
        },
      },
      orderBy: { name: 'asc' },
    });

    const now = Date.now();
    let totalReceivable = 0;
    let creditLimitExceeded = 0;
    const agingSummary = { current: 0, days30_60: 0, days60_90: 0, over90: 0 };

    const customerDetails = customers
      .filter((c) => Number(c.creditBalance) > 0 || Number(c.creditLimit) > 0)
      .map((c) => {
        const balance = Number(c.creditBalance);
        const limit = Number(c.creditLimit);
        totalReceivable += balance;

        if (limit > 0 && balance > limit) {
          creditLimitExceeded++;
        }

        const aging = { current: 0, days30_60: 0, days60_90: 0, over90: 0 };
        const lastSale = c.sales[0];
        const lastSaleDate = lastSale ? lastSale.saleDate : c.createdAt;
        const ageDays = Math.floor((now - new Date(lastSaleDate).getTime()) / (1000 * 60 * 60 * 24));

        if (ageDays <= 30) {
          aging.current = balance;
          agingSummary.current += balance;
        } else if (ageDays <= 60) {
          aging.days30_60 = balance;
          agingSummary.days30_60 += balance;
        } else if (ageDays <= 90) {
          aging.days60_90 = balance;
          agingSummary.days60_90 += balance;
        } else {
          aging.over90 = balance;
          agingSummary.over90 += balance;
        }

        const utilization = limit > 0 ? Math.min(100, Math.round((balance / limit) * 100)) : 0;

        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          cnic: c.cnic,
          creditLimit: limit,
          creditBalance: balance,
          utilization,
          isOverLimit: limit > 0 && balance > limit,
          lastSaleDate,
          aging,
          recentSales: c.sales,
        };
      });

    return {
      summary: {
        totalReceivable,
        customerCount: customerDetails.filter((c) => c.creditBalance > 0).length,
        creditLimitExceeded,
        agingSummary,
      },
      customers: customerDetails,
    };
  }

  async recordReceivableCollection(
    tenantId: string,
    userId: string,
    dto: {
      customerId: string;
      amount: number;
      paymentMethod: 'cash' | 'bank_transfer' | 'card' | 'easypaisa' | 'jazzcash';
      referenceNumber?: string;
      notes?: string;
    },
  ) {
    if (dto.amount <= 0) throw new BadRequestException('Collection amount must be greater than 0');

    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const arAccount = await this.prisma.account.findFirst({
      where: { tenantId, code: '1200' },
    });
    if (!arAccount) throw new BadRequestException('Accounts Receivable account (1200) not found');

    const depositAccountCode = dto.paymentMethod === 'cash' ? '1000' : '1100';
    const depositAccount = await this.prisma.account.findFirst({
      where: { tenantId, code: depositAccountCode },
    });
    if (!depositAccount) throw new BadRequestException(`Deposit account (${depositAccountCode}) not found`);

    // Decrement customer credit balance
    const updatedBalance = Math.max(0, Number(customer.creditBalance) - dto.amount);
    await this.prisma.customer.update({
      where: { id: dto.customerId },
      data: { creditBalance: updatedBalance },
    });

    const ref = dto.referenceNumber ? ` Ref: ${dto.referenceNumber}` : '';
    const description = `Customer Recovery from ${customer.name} via ${dto.paymentMethod.replace('_', ' ')}${ref}`;

    const journal = await this.createJournalEntry(tenantId, userId, {
      entryDate: new Date().toISOString(),
      description,
      referenceType: 'CustomerCollection',
      referenceId: customer.id,
      lines: [
        {
          accountId: depositAccount.id,
          debit: dto.amount,
          credit: 0,
          narration: `Collection deposit into ${depositAccount.name}`,
        },
        {
          accountId: arAccount.id,
          debit: 0,
          credit: dto.amount,
          narration: `Credit AR settlement for ${customer.name}`,
        },
      ],
    });

    return {
      success: true,
      message: `Received PKR ${dto.amount.toLocaleString()} from ${customer.name}. New balance: PKR ${updatedBalance.toLocaleString()}`,
      newBalance: updatedBalance,
      journalEntryId: journal.id,
    };
  }

  // ── Bank Accounts ───────────────────────────────────────────────────────────

  async getBankAccounts(tenantId: string) {
    const bankAccounts = await this.prisma.bankAccount.findMany({
      where: { tenantId, isActive: true },
    });

    const results = await Promise.all(
      bankAccounts.map(async (b) => {
        let currentBalance = Number(b.openingBalance);
        let transactions: any[] = [];

        if (b.accountId) {
          const lines = await this.prisma.journalLine.findMany({
            where: {
              accountId: b.accountId,
              journalEntry: { tenantId, isPosted: true },
            },
            include: {
              journalEntry: { select: { entryDate: true, description: true, referenceType: true } },
            },
            orderBy: { journalEntry: { entryDate: 'desc' } },
            take: 10,
          });

          const allLines = await this.prisma.journalLine.findMany({
            where: {
              accountId: b.accountId,
              journalEntry: { tenantId, isPosted: true },
            },
            select: { debit: true, credit: true },
          });

          const totalDebit = allLines.reduce((s, l) => s + Number(l.debit), 0);
          const totalCredit = allLines.reduce((s, l) => s + Number(l.credit), 0);
          currentBalance = totalDebit - totalCredit;

          transactions = lines.map((l) => ({
            id: l.id,
            date: l.journalEntry.entryDate,
            description: l.journalEntry.description,
            referenceType: l.journalEntry.referenceType,
            debit: Number(l.debit),
            credit: Number(l.credit),
          }));
        }

        return {
          id: b.id,
          bankName: b.bankName,
          accountTitle: b.accountTitle,
          accountNumber: b.accountNumber,
          iban: b.iban,
          branchCode: b.branchCode,
          openingBalance: Number(b.openingBalance),
          currentBalance,
          accountId: b.accountId,
          transactions,
        };
      }),
    );

    return results;
  }

  async createBankAccount(
    tenantId: string,
    dto: {
      bankName: string;
      accountTitle: string;
      accountNumber: string;
      iban?: string;
      branchCode?: string;
      openingBalance?: number;
    },
  ) {
    const count = await this.prisma.bankAccount.count({ where: { tenantId } });
    const code = `110${count + 1}`;
    const account = await this.prisma.account.create({
      data: {
        tenantId,
        code,
        name: `${dto.bankName} - ${dto.accountNumber.slice(-4)}`,
        accountType: 'asset',
      },
    });

    const bankAccount = await this.prisma.bankAccount.create({
      data: {
        tenantId,
        accountId: account.id,
        bankName: dto.bankName,
        accountTitle: dto.accountTitle,
        accountNumber: dto.accountNumber,
        iban: dto.iban,
        branchCode: dto.branchCode,
        openingBalance: dto.openingBalance || 0,
      },
    });

    return bankAccount;
  }

  async transferBankFunds(
    tenantId: string,
    userId: string,
    dto: {
      fromAccountId: string;
      toAccountId: string;
      amount: number;
      notes?: string;
    },
  ) {
    if (dto.amount <= 0) throw new BadRequestException('Transfer amount must be positive');
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException('Source and destination accounts must be different');
    }

    const fromAccount = await this.prisma.account.findFirst({ where: { id: dto.fromAccountId, tenantId } });
    const toAccount = await this.prisma.account.findFirst({ where: { id: dto.toAccountId, tenantId } });

    if (!fromAccount || !toAccount) throw new NotFoundException('One or both accounts not found');

    const desc = `Internal Fund Transfer from ${fromAccount.name} to ${toAccount.name}${dto.notes ? ' - ' + dto.notes : ''}`;

    return this.createJournalEntry(tenantId, userId, {
      entryDate: new Date().toISOString(),
      description: desc,
      referenceType: 'BankTransfer',
      lines: [
        { accountId: toAccount.id, debit: dto.amount, credit: 0, narration: `Deposit into ${toAccount.name}` },
        { accountId: fromAccount.id, debit: 0, credit: dto.amount, narration: `Disbursement from ${fromAccount.name}` },
      ],
    });
  }
}
