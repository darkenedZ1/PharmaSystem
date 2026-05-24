import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface CreateSupplierDto {
  name: string;
  ntn?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTerms?: number;
  leadDays?: number;
}

interface CreatePoDto {
  supplierId: string;
  branchId: string;
  items: { productId: string; qtyOrdered: number; unitCost: number }[];
  expectedDate?: string;
  notes?: string;
}

interface CreateGrnDto {
  poId?: string;
  supplierId: string;
  branchId: string;
  supplierInvoiceNumber?: string;
  items: {
    productId: string;
    batchNumber: string;
    expiryDate: string;
    qtyReceived: number;
    costPerUnit: number;
    lotNumber?: string;
  }[];
  notes?: string;
}

@Injectable()
export class PurchasingService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Suppliers ───────────────────────────────────────────────────────────────

  async listSuppliers(tenantId: string, active = true) {
    return this.prisma.supplier.findMany({
      where: { tenantId, ...(active && { isActive: true }) },
      orderBy: { name: 'asc' },
    });
  }

  async createSupplier(tenantId: string, dto: CreateSupplierDto) {
    return this.prisma.supplier.create({ data: { tenantId, ...dto } });
  }

  async updateSupplier(tenantId: string, id: string, dto: Partial<CreateSupplierDto>) {
    const existing = await this.prisma.supplier.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Supplier not found');
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  async deactivateSupplier(tenantId: string, id: string) {
    const existing = await this.prisma.supplier.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Supplier not found');
    return this.prisma.supplier.update({ where: { id }, data: { isActive: false } });
  }

  // ── Purchase Orders ─────────────────────────────────────────────────────────

  async listPOs(tenantId: string, branchId?: string, status?: string) {
    return this.prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        ...(branchId && { branchId }),
        ...(status && { status }),
      },
      include: {
        supplier: { select: { name: true, phone: true } },
        items: {
          include: { product: { select: { name: true, genericName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getPO(tenantId: string, id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: {
        supplier: true,
        items: { include: { product: { select: { name: true, genericName: true, unitOfMeasure: true } } } },
        grns: { select: { id: true, receivedDate: true, status: true } },
      },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async createPO(tenantId: string, userId: string, dto: CreatePoDto) {
    const poNumber = await this.generatePoNumber(tenantId);

    return this.prisma.purchaseOrder.create({
      data: {
        tenantId,
        supplierId: dto.supplierId,
        branchId: dto.branchId,
        poNumber,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        notes: dto.notes,
        createdById: userId,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            qtyOrdered: item.qtyOrdered,
            qtyReceived: 0,
            unitCost: item.unitCost,
            lineTotal: item.qtyOrdered * item.unitCost,
          })),
        },
      },
      include: {
        supplier: { select: { name: true } },
        items: { include: { product: { select: { name: true } } } },
      },
    });
  }

  async approvePO(tenantId: string, id: string, userId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({ where: { id, tenantId } });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== 'draft') throw new BadRequestException('Only draft POs can be approved');

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'sent', approvedById: userId },
    });
  }

  async cancelPO(tenantId: string, id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({ where: { id, tenantId } });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (['received', 'closed'].includes(po.status)) {
      throw new BadRequestException('Cannot cancel a received or closed PO');
    }
    return this.prisma.purchaseOrder.update({ where: { id }, data: { status: 'cancelled' } });
  }

  // ── GRN (Goods Received Notes) ──────────────────────────────────────────────

  async listGrns(tenantId: string, branchId?: string) {
    return this.prisma.grn.findMany({
      where: { tenantId, ...(branchId && { branchId }) },
      include: {
        po: { select: { poNumber: true } },
        items: {
          include: { grn: false },
        },
      },
      orderBy: { receivedDate: 'desc' },
      take: 100,
    });
  }

  async createGrn(tenantId: string, userId: string, dto: CreateGrnDto) {
    return this.prisma.$transaction(async (tx) => {
      const grn = await tx.grn.create({
        data: {
          tenantId,
          poId: dto.poId ?? null,
          branchId: dto.branchId,
          supplierId: dto.supplierId,
          supplierInvoiceNumber: dto.supplierInvoiceNumber,
          receivedById: userId,
          status: 'posted',
          notes: dto.notes,
        },
      });

      for (const item of dto.items) {
        const batch = await tx.batch.create({
          data: {
            tenantId,
            productId: item.productId,
            supplierId: dto.supplierId,
            grnId: grn.id,
            batchNumber: item.batchNumber,
            lotNumber: item.lotNumber,
            expiryDate: new Date(item.expiryDate),
            qtyReceived: item.qtyReceived,
            costPerUnit: item.costPerUnit,
          },
        });

        await tx.grnItem.create({
          data: {
            grnId: grn.id,
            productId: item.productId,
            batchId: batch.id,
            qtyReceived: item.qtyReceived,
            costPerUnit: item.costPerUnit,
          },
        });

        await tx.stockLevel.upsert({
          where: {
            tenantId_productId_batchId_branchId: {
              tenantId,
              productId: item.productId,
              batchId: batch.id,
              branchId: dto.branchId,
            },
          },
          create: {
            tenantId,
            productId: item.productId,
            batchId: batch.id,
            branchId: dto.branchId,
            quantity: item.qtyReceived,
          },
          update: { quantity: { increment: item.qtyReceived } },
        });

        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            batchId: batch.id,
            branchId: dto.branchId,
            movementType: 'purchase',
            quantity: item.qtyReceived,
            referenceType: 'Grn',
            referenceId: grn.id,
            performedById: userId,
          },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: { costPrice: item.costPerUnit },
        });
      }

      if (dto.poId) {
        for (const item of dto.items) {
          await tx.poItem.updateMany({
            where: { poId: dto.poId, productId: item.productId },
            data: { qtyReceived: { increment: item.qtyReceived } },
          });
        }

        const po = await tx.purchaseOrder.findUnique({
          where: { id: dto.poId },
          include: { items: true },
        });
        if (po) {
          const isFullyReceived = po.items.every((i) => i.qtyReceived >= i.qtyOrdered);
          await tx.purchaseOrder.update({
            where: { id: dto.poId },
            data: { status: isFullyReceived ? 'received' : 'partial' },
          });
        }
      }

      return grn;
    });
  }

  private async generatePoNumber(tenantId: string): Promise<string> {
    const count = await this.prisma.purchaseOrder.count({ where: { tenantId } });
    const year = new Date().getFullYear();
    return `PO-${year}-${String(count + 1).padStart(4, '0')}`;
  }
}
