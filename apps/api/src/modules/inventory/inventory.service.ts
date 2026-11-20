import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
      include: { category: true, batches: true },
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

  async updateProduct(tenantId: string, id: string, data: any) {
    const { id: _, tenantId: __, category, stockLevels, ...updateData } = data;
    return this.prisma.product.update({
      where: { id },
      data: updateData,
    });
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

  async getProduct(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        category: true,
        batches: {
          include: { stockLevels: true },
        },
        stockLevels: true,
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async getCategories(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(tenantId: string, data: { name: string; parentId?: string }) {
    return this.prisma.category.create({
      data: {
        tenantId,
        name: data.name,
        parentId: data.parentId,
      },
    });
  }

  async getStockMovements(tenantId: string, branchId?: string, productId?: string) {
    return this.prisma.stockMovement.findMany({
      where: {
        tenantId,
        ...(branchId && { branchId }),
        ...(productId && { productId }),
      },
      include: {
        product: { select: { name: true, genericName: true } },
        batch: { select: { batchNumber: true, expiryDate: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // ── Stock Transfers ─────────────────────────────────────────────────────────

  async getTransfers(tenantId: string) {
    const transfers = await (this.prisma as any).stockTransfer.findMany({
      where: { tenantId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    const [branches, products, batches] = await Promise.all([
      this.prisma.branch.findMany({ where: { tenantId } }),
      this.prisma.product.findMany({ where: { tenantId }, select: { id: true, name: true, genericName: true } }),
      this.prisma.batch.findMany({ where: { tenantId }, select: { id: true, batchNumber: true, expiryDate: true } }),
    ]);

    const branchMap = new Map(branches.map((b) => [b.id, b.name]));
    const productMap = new Map(products.map((p) => [p.id, p]));
    const batchMap = new Map(batches.map((b) => [b.id, b]));

    return transfers.map((t: any) => ({
      id: t.id,
      transferNumber: t.transferNumber,
      sourceBranchId: t.sourceBranchId,
      sourceBranchName: branchMap.get(t.sourceBranchId) || 'Unknown Branch',
      targetBranchId: t.targetBranchId,
      targetBranchName: branchMap.get(t.targetBranchId) || 'Unknown Branch',
      status: t.status,
      notes: t.notes,
      dispatchedAt: t.dispatchedAt,
      receivedAt: t.receivedAt,
      createdAt: t.createdAt,
      items: t.items.map((i: any) => ({
        id: i.id,
        productId: i.productId,
        productName: productMap.get(i.productId)?.name || 'Unknown Product',
        genericName: productMap.get(i.productId)?.genericName || '',
        batchId: i.batchId,
        batchNumber: batchMap.get(i.batchId)?.batchNumber || 'N/A',
        expiryDate: batchMap.get(i.batchId)?.expiryDate,
        quantity: i.quantity,
      })),
    }));
  }

  async createTransfer(tenantId: string, userId: string, dto: {
    sourceBranchId: string;
    targetBranchId: string;
    notes?: string;
    items: { productId: string; batchId: string; quantity: number }[];
  }) {
    if (dto.sourceBranchId === dto.targetBranchId) {
      throw new BadRequestException('Source and destination branches cannot be the same');
    }
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Transfer must contain at least one item');
    }

    const count = await (this.prisma as any).stockTransfer.count({ where: { tenantId } });
    const transferNumber = `TRF-${String(count + 1).padStart(4, '0')}`;

    return (this.prisma as any).stockTransfer.create({
      data: {
        tenantId,
        transferNumber,
        sourceBranchId: dto.sourceBranchId,
        targetBranchId: dto.targetBranchId,
        notes: dto.notes,
        createdById: userId,
        status: 'draft',
        items: {
          create: dto.items.map((i) => ({
            productId: i.productId,
            batchId: i.batchId,
            quantity: Number(i.quantity),
          })),
        },
      },
      include: { items: true },
    });
  }

  async dispatchTransfer(tenantId: string, userId: string, id: string) {
    const transfer = await (this.prisma as any).stockTransfer.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.status !== 'draft') {
      throw new BadRequestException(`Cannot dispatch transfer with status '${transfer.status}'`);
    }

    // Decrement source stock levels and record transfer_out movement
    for (const item of transfer.items) {
      await this.prisma.$transaction([
        this.prisma.stockLevel.upsert({
          where: {
            tenantId_productId_batchId_branchId: {
              tenantId,
              productId: item.productId,
              batchId: item.batchId,
              branchId: transfer.sourceBranchId,
            },
          },
          create: {
            tenantId,
            productId: item.productId,
            batchId: item.batchId,
            branchId: transfer.sourceBranchId,
            quantity: -item.quantity,
          },
          update: { quantity: { decrement: item.quantity } },
        }),
        this.prisma.stockMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            batchId: item.batchId,
            branchId: transfer.sourceBranchId,
            movementType: 'transfer',
            referenceType: 'Transfer',
            referenceId: transfer.id,
            quantity: -item.quantity,
            notes: `Transfer Out (${transfer.transferNumber})`,
            performedById: userId,
          },
        }),
      ]);
    }

    return (this.prisma as any).stockTransfer.update({
      where: { id },
      data: { status: 'in_transit', dispatchedAt: new Date() },
    });
  }

  async receiveTransfer(tenantId: string, userId: string, id: string) {
    const transfer = await (this.prisma as any).stockTransfer.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.status !== 'in_transit') {
      throw new BadRequestException(`Cannot receive transfer with status '${transfer.status}'. It must be 'in_transit'`);
    }

    // Increment destination stock levels and record transfer_in movement
    for (const item of transfer.items) {
      await this.prisma.$transaction([
        this.prisma.stockLevel.upsert({
          where: {
            tenantId_productId_batchId_branchId: {
              tenantId,
              productId: item.productId,
              batchId: item.batchId,
              branchId: transfer.targetBranchId,
            },
          },
          create: {
            tenantId,
            productId: item.productId,
            batchId: item.batchId,
            branchId: transfer.targetBranchId,
            quantity: item.quantity,
          },
          update: { quantity: { increment: item.quantity } },
        }),
        this.prisma.stockMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            batchId: item.batchId,
            branchId: transfer.targetBranchId,
            movementType: 'transfer',
            referenceType: 'Transfer',
            referenceId: transfer.id,
            quantity: item.quantity,
            notes: `Transfer In (${transfer.transferNumber})`,
            performedById: userId,
          },
        }),
      ]);
    }

    return (this.prisma as any).stockTransfer.update({
      where: { id },
      data: { status: 'completed', receivedAt: new Date() },
    });
  }
}
