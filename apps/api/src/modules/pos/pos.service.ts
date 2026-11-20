import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FbrService } from '../fbr/fbr.service';
import type { Decimal } from '@prisma/client/runtime/library';

interface SaleItemInput {
  productId: string;
  batchId?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

interface CreateSaleDto {
  clientId: string; // UUID from client — idempotency key for offline sync
  branchId: string;
  customerId?: string;
  prescriptionId?: string;
  items: SaleItemInput[];
  payments: { method: string; amount: number }[];
  discountAmount?: number;
  notes?: string;
}

@Injectable()
export class PosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fbrService: FbrService,
  ) {}

  async createSale(tenantId: string, cashierId: string, dto: CreateSaleDto) {
    // Idempotency: if this clientId was already processed, return existing sale
    const existing = await this.prisma.sale.findUnique({
      where: { clientId: dto.clientId },
      include: { items: true },
    });
    if (existing) return existing;

    // Resolve valid branch
    let branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, tenantId },
    });
    if (!branch) {
      branch = await this.prisma.branch.findFirst({
        where: { tenantId, isActive: true },
      });
    }
    if (!branch) {
      branch = await this.prisma.branch.create({
        data: {
          tenantId,
          name: 'Main Branch',
          address: 'Main Store',
        },
      });
    }
    const branchId = branch.id;

    // Validate stock availability (FEFO — pick earliest expiring batch first)
    const resolvedItems = await this.resolveItemBatches(tenantId, branchId, dto.items);

    const subtotal = resolvedItems.reduce((s, i) => s + i.lineTotal, 0);
    const discountAmount = dto.discountAmount ?? 0;
    const taxAmount = resolvedItems.reduce((s, i) => s + i.taxAmount, 0);
    const total = subtotal - discountAmount + taxAmount;

    const invoiceNumber = await this.generateInvoiceNumber(tenantId, branchId);

    const sale = await this.prisma.$transaction(async (tx) => {
      const s = await tx.sale.create({
        data: {
          clientId: dto.clientId,
          tenantId,
          branchId,
          customerId: dto.customerId,
          prescriptionId: dto.prescriptionId,
          cashierId,
          invoiceNumber,
          subtotal,
          discountAmount,
          taxAmount,
          total,
          payments: dto.payments,
          notes: dto.notes,
          fbrSyncStatus: 'pending',
          items: {
            create: resolvedItems.map((i) => ({
              productId: i.productId,
              batchId: i.batchId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              discount: i.discount,
              taxAmount: i.taxAmount,
              lineTotal: i.lineTotal,
            })),
          },
        },
        include: { items: true },
      });

      // Decrement stock levels (FEFO respected by resolvedItems)
      for (const item of resolvedItems) {
        if (item.batchId) {
          await tx.stockLevel.updateMany({
            where: { tenantId, productId: item.productId, batchId: item.batchId, branchId },
            data: { quantity: { decrement: item.quantity } },
          });
        }

        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            batchId: item.batchId,
            branchId,
            movementType: 'sale',
            quantity: -item.quantity,
            referenceType: 'Sale',
            referenceId: s.id,
            performedById: cashierId,
          },
        });
      }

      // Update customer credit balance if credit payment
      const creditPayment = dto.payments.find((p) => p.method === 'credit');
      if (creditPayment && dto.customerId) {
        await tx.customer.update({
          where: { id: dto.customerId },
          data: { creditBalance: { increment: creditPayment.amount } },
        });
      }

      return s;
    });

    // Async: enqueue FBR submission (non-blocking)
    this.fbrService.enqueueSale(tenantId, sale.id).catch(() => {
      // FBR failure never blocks the sale — it retries via queue
    });

    return sale;
  }

  async getSales(tenantId: string, branchId?: string, from?: Date, to?: Date) {
    return this.prisma.sale.findMany({
      where: {
        tenantId,
        ...(branchId && { branchId }),
        ...(from && to && { saleDate: { gte: from, lte: to } }),
      },
      include: {
        items: { include: { product: { select: { name: true, genericName: true } } } },
        customer: { select: { name: true, phone: true } },
        cashier: { select: { name: true } },
      },
      orderBy: { saleDate: 'desc' },
      take: 100,
    });
  }

  async getSale(tenantId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, tenantId },
      include: {
        items: {
          include: {
            product: { select: { name: true, genericName: true, drapNumber: true } },
            batch: { select: { batchNumber: true, expiryDate: true } },
          },
        },
        customer: { select: { name: true, phone: true, cnic: true } },
        cashier: { select: { name: true } },
        branch: { select: { name: true, address: true, phone: true } },
      },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  async voidSale(tenantId: string, saleId: string, reason: string, userId: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, tenantId },
      include: { items: true },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    if (sale.status !== 'completed') throw new BadRequestException('Only completed sales can be voided');

    await this.prisma.$transaction(async (tx) => {
      await tx.sale.update({ where: { id: saleId }, data: { status: 'voided', notes: reason } });

      // Restore stock
      for (const item of sale.items) {
        if (item.batchId) {
          await tx.stockLevel.updateMany({
            where: { tenantId, productId: item.productId, batchId: item.batchId },
            data: { quantity: { increment: item.quantity } },
          });
        }
        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            batchId: item.batchId ?? undefined,
            branchId: sale.branchId,
            movementType: 'return',
            quantity: item.quantity,
            referenceType: 'Sale',
            referenceId: saleId,
            performedById: userId,
            notes: `Void: ${reason}`,
          },
        });
      }
    });

    return { message: 'Sale voided successfully' };
  }

  private async resolveItemBatches(tenantId: string, branchId: string, items: SaleItemInput[]) {
    const resolved = [];

    for (const item of items) {
      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, tenantId },
      });
      if (!product) throw new NotFoundException(`Product ${item.productId} not found`);

      let batchId = item.batchId;

      if (!batchId) {
        // FEFO: pick the batch expiring soonest with enough stock
        const stock = await this.prisma.stockLevel.findFirst({
          where: {
            tenantId,
            productId: item.productId,
            branchId,
            quantity: { gte: item.quantity },
          },
          include: { batch: true },
          orderBy: { batch: { expiryDate: 'asc' } },
        });

        if (!stock) {
          throw new BadRequestException(
            `Insufficient stock for product: ${product.name}`,
          );
        }
        batchId = stock.batchId;
      }

      const taxRate = Number(product.taxRate) / 100;
      const lineSubtotal = item.unitPrice * item.quantity - (item.discount ?? 0);
      const taxAmount = lineSubtotal * taxRate;

      resolved.push({
        productId: item.productId,
        batchId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount ?? 0,
        taxAmount,
        lineTotal: lineSubtotal + taxAmount,
      });
    }

    return resolved;
  }

  private async generateInvoiceNumber(tenantId: string, branchId: string): Promise<string> {
    const today = new Date();
    const prefix = `INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    const count = await this.prisma.sale.count({
      where: {
        tenantId,
        branchId,
        invoiceNumber: { startsWith: prefix },
      },
    });

    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }

  async getCurrentDrawer(tenantId: string) {
    const drawer = await this.prisma.cashDrawer.findFirst({
      where: { tenantId, closedAt: null },
      orderBy: { openedAt: 'desc' },
    });

    if (!drawer) return null;

    const sales = await this.prisma.sale.aggregate({
      where: {
        tenantId,
        saleDate: { gte: drawer.openedAt },
        status: 'completed',
      },
      _sum: { total: true },
    });

    const salesTotal = Number(sales._sum.total ?? 0);
    const openingCash = Number(drawer.openingCash);

    return {
      id: drawer.id,
      status: 'open',
      openingCash,
      salesTotal,
      expectedCash: openingCash + salesTotal,
      openedAt: drawer.openedAt.toISOString(),
      openedBy: drawer.openedById,
    };
  }

  async openDrawer(tenantId: string, userId: string, openingCash: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const branch = await this.prisma.branch.findFirst({ where: { tenantId } });
    const branchId = user?.branchId || branch?.id;

    if (!branchId) throw new BadRequestException('Branch not found');

    const active = await this.prisma.cashDrawer.findFirst({
      where: { tenantId, closedAt: null },
    });
    if (active) throw new BadRequestException('A cash drawer is already open');

    return this.prisma.cashDrawer.create({
      data: {
        tenantId,
        branchId,
        openedById: userId,
        openingCash,
      },
    });
  }

  async closeDrawer(tenantId: string, userId: string, closingCash: number, notes?: string) {
    const active = await this.prisma.cashDrawer.findFirst({
      where: { tenantId, closedAt: null },
      orderBy: { openedAt: 'desc' },
    });
    if (!active) throw new NotFoundException('No open cash drawer found');

    const sales = await this.prisma.sale.aggregate({
      where: {
        tenantId,
        saleDate: { gte: active.openedAt },
        status: 'completed',
      },
      _sum: { total: true },
    });

    const salesTotal = Number(sales._sum.total ?? 0);
    const expectedCash = Number(active.openingCash) + salesTotal;
    const variance = closingCash - expectedCash;

    return this.prisma.cashDrawer.update({
      where: { id: active.id },
      data: {
        closedById: userId,
        closedAt: new Date(),
        closingCash,
        expectedCash,
        variance,
        notes,
      },
    });
  }
}
