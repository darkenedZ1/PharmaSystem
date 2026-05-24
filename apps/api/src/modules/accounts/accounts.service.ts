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
}
