import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getProducts(tenantId: string, search?: string) {
    return this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { genericName: { contains: search, mode: 'insensitive' } },
            { barcodes: { has: search } },
          ],
        }),
      },
      include: { category: true },
      take: 50,
    });
  }

  async getStockLevels(tenantId: string, branchId?: string) {
    return this.prisma.stockLevel.findMany({
      where: { tenantId, ...(branchId && { branchId }) },
      include: {
        product: { select: { name: true, genericName: true, reorderPoint: true } },
        batch: { select: { batchNumber: true, expiryDate: true } },
        branch: { select: { name: true } },
      },
    });
  }

  async getNearExpiry(tenantId: string, daysThreshold = 90) {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + daysThreshold);

    return this.prisma.batch.findMany({
      where: {
        tenantId,
        expiryDate: { lte: threshold, gt: new Date() },
        stockLevels: { some: { quantity: { gt: 0 } } },
      },
      include: {
        product: { select: { name: true, salePrice: true } },
        stockLevels: { include: { branch: { select: { name: true } } } },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async getLowStock(tenantId: string) {
    const products = await this.prisma.product.findMany({
      where: { tenantId, isActive: true, reorderPoint: { gt: 0 } },
      include: {
        stockLevels: { select: { quantity: true } },
      },
    });

    return products
      .map((p) => ({
        ...p,
        totalStock: p.stockLevels.reduce((s, l) => s + l.quantity, 0),
      }))
      .filter((p) => p.totalStock <= p.reorderPoint);
  }

  async createProduct(tenantId: string, data: any) {
    return this.prisma.product.create({ data: { ...data, tenantId } });
  }

  async adjustStock(tenantId: string, userId: string, data: {
    productId: string;
    batchId: string;
    branchId: string;
    quantity: number;
    reason: string;
  }) {
    const { productId, batchId, branchId, quantity, reason } = data;

    await this.prisma.$transaction([
      this.prisma.stockLevel.upsert({
        where: { tenantId_productId_batchId_branchId: { tenantId, productId, batchId, branchId } },
        create: { tenantId, productId, batchId, branchId, quantity },
        update: { quantity: { increment: quantity } },
      }),
      this.prisma.stockMovement.create({
        data: {
          tenantId, productId, batchId, branchId,
          movementType: 'adjustment',
          quantity,
          notes: reason,
          performedById: userId,
        },
      }),
    ]);

    return { message: 'Stock adjusted successfully' };
  }
}
