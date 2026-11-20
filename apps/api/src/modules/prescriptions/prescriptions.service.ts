import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface CreatePrescriptionDto {
  customerId: string;
  branchId: string;
  doctorId?: string;
  issueDate: string;
  expiryDate?: string;
  diagnosis?: string;
  notes?: string;
  items: {
    productId: string;
    qtyPrescribed: number;
    instructions?: string;
    isControlled?: boolean;
  }[];
}

interface DispenseDto {
  items: { prescriptionItemId: string; qtyDispensed: number }[];
  saleId?: string;
}

interface CreateDoctorDto {
  name: string;
  pmdcNumber?: string;
  specialization?: string;
  clinicName?: string;
  phone?: string;
}

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, customerId?: string, status?: string) {
    return this.prisma.prescription.findMany({
      where: {
        tenantId,
        ...(customerId && { customerId }),
        ...(status && { status }),
      },
      include: {
        customer: { select: { name: true, phone: true } },
        doctor: { select: { name: true, pmdcNumber: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async get(tenantId: string, id: string) {
    const rx = await this.prisma.prescription.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        doctor: true,
        items: {
          include: {
            prescription: false,
          },
        },
      },
    });
    if (!rx) throw new NotFoundException('Prescription not found');
    return rx;
  }

  async create(tenantId: string, userId: string, dto: CreatePrescriptionDto) {
    return this.prisma.prescription.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        branchId: dto.branchId,
        doctorId: dto.doctorId,
        issueDate: new Date(dto.issueDate),
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        diagnosis: dto.diagnosis,
        notes: dto.notes,
        createdById: userId,
        status: 'pending',
        items: {
          create: dto.items.map((i) => ({
            productId: i.productId,
            qtyPrescribed: i.qtyPrescribed,
            qtyDispensed: 0,
            instructions: i.instructions,
            isControlled: i.isControlled ?? false,
          })),
        },
      },
      include: {
        customer: { select: { name: true, phone: true } },
        doctor: { select: { name: true } },
        items: true,
      },
    });
  }

  async dispense(tenantId: string, id: string, dto: DispenseDto) {
    const rx = await this.prisma.prescription.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });
    if (!rx) throw new NotFoundException('Prescription not found');
    if (rx.status === 'filled') throw new BadRequestException('Prescription is already fully dispensed');
    if (rx.status === 'expired') throw new BadRequestException('Prescription has expired');
    if (rx.status === 'cancelled') throw new BadRequestException('Prescription is cancelled');

    await this.prisma.$transaction(async (tx) => {
      for (const d of dto.items) {
        const item = rx.items.find((i) => i.id === d.prescriptionItemId);
        if (!item) continue;

        const remaining = item.qtyPrescribed - item.qtyDispensed;
        if (d.qtyDispensed > remaining) {
          throw new BadRequestException(
            `Cannot dispense ${d.qtyDispensed} — only ${remaining} remaining for item`,
          );
        }

        await tx.prescriptionItem.update({
          where: { id: d.prescriptionItemId },
          data: { qtyDispensed: { increment: d.qtyDispensed } },
        });
      }

      const updated = await tx.prescriptionItem.findMany({ where: { prescriptionId: id } });
      const fullyFilled = updated.every((i) => i.qtyDispensed >= i.qtyPrescribed);
      const anyDispensed = updated.some((i) => i.qtyDispensed > 0);

      await tx.prescription.update({
        where: { id },
        data: { status: fullyFilled ? 'filled' : anyDispensed ? 'partial' : 'pending' },
      });
    });

    return this.get(tenantId, id);
  }

  async cancel(tenantId: string, id: string) {
    const rx = await this.prisma.prescription.findFirst({ where: { id, tenantId } });
    if (!rx) throw new NotFoundException('Prescription not found');
    if (rx.status === 'filled') throw new BadRequestException('Cannot cancel a filled prescription');

    return this.prisma.prescription.update({ where: { id }, data: { status: 'cancelled' } });
  }

  // ── Doctors ─────────────────────────────────────────────────────────────────

  async listDoctors(tenantId: string, search?: string) {
    return this.prisma.doctor.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { pmdcNumber: { contains: search } },
          ],
        }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async createDoctor(tenantId: string, dto: CreateDoctorDto) {
    return this.prisma.doctor.create({ data: { tenantId, ...dto } });
  }

  async updateDoctor(tenantId: string, id: string, dto: Partial<CreateDoctorDto>) {
    const existing = await this.prisma.doctor.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Doctor not found');
    return this.prisma.doctor.update({ where: { id }, data: dto });
  }

  // ── Patients (customers with prescriptions) ─────────────────────────────────

  async listPatients(tenantId: string, search?: string) {
    return this.prisma.customer.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
          ],
        }),
      },
      include: {
        _count: { select: { prescriptions: true, sales: true } },
      },
      orderBy: { name: 'asc' },
      take: 50,
    });
  }

  async createPatient(tenantId: string, dto: {
    name: string; phone?: string; email?: string;
    dateOfBirth?: string; gender?: string; allergies?: string[];
    chronicConditions?: string;
  }) {
    return this.prisma.customer.create({
      data: {
        tenantId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        allergies: dto.allergies ?? [],
        chronicConditions: dto.chronicConditions,
      },
    });
  }

  // ── Controlled Substance Log ────────────────────────────────────────────────

  async getControlledLog(tenantId: string, from?: Date, to?: Date) {
    const logs = await this.prisma.controlledSubstanceLog.findMany({
      where: {
        tenantId,
        ...(from && to && { dispensedAt: { gte: from, lte: to } }),
      },
      orderBy: { dispensedAt: 'desc' },
      take: 200,
    });

    const productIds = [...new Set(logs.map((l) => l.productId))];
    const customerIds = [...new Set(logs.map((l) => l.customerId))];
    const userIds = [...new Set(logs.map((l) => l.dispensedById))];

    const [products, customers, users] = await Promise.all([
      this.prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } }),
      this.prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, name: true } }),
      this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }),
    ]);

    const prodMap = new Map(products.map((p) => [p.id, p.name]));
    const custMap = new Map(customers.map((c) => [c.id, c.name]));
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    return logs.map((l) => ({
      id: l.id,
      date: l.dispensedAt.toISOString(),
      productName: prodMap.get(l.productId) || 'Controlled Medicine',
      customerName: custMap.get(l.customerId) || 'Walk-in Patient',
      customerCnic: l.customerCnic,
      doctorPmdc: l.doctorPmdc || '—',
      quantity: l.quantity,
      dispensedBy: userMap.get(l.dispensedById) || 'Pharmacist',
    }));
  }
}
