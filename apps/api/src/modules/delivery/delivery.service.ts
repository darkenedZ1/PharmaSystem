import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  async listOrders(tenantId: string, status?: string) {
    return this.prisma.deliveryOrder.findMany({
      where: {
        tenantId,
        ...(status ? { status } : {}),
      },
      include: {
        customer: { select: { name: true, phone: true } },
        rider: { select: { name: true, phone: true } },
        sale: { select: { invoiceNumber: true, total: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getOrder(tenantId: string, id: string) {
    const order = await this.prisma.deliveryOrder.findFirst({
      where: { tenantId, id },
      include: {
        customer: { select: { name: true, phone: true } },
        rider: { select: { name: true, phone: true, vehicleType: true } },
        sale: { select: { invoiceNumber: true, total: true } },
      },
    });

    if (!order) {
      throw new NotFoundException(`Delivery order ${id} not found`);
    }

    return order;
  }

  async createOrder(tenantId: string, dto: any) {
    return this.prisma.deliveryOrder.create({
      data: {
        tenantId,
        saleId: dto.saleId,
        customerId: dto.customerId,
        address: dto.address,
        deliveryCharge: dto.deliveryCharge ?? 0,
        status: 'pending',
      },
    });
  }

  async assignRider(tenantId: string, orderId: string, riderId: string) {
    const order = await this.prisma.deliveryOrder.findFirst({
      where: { tenantId, id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Delivery order ${orderId} not found`);
    }

    const rider = await this.prisma.deliveryRider.findFirst({
      where: { tenantId, id: riderId, isActive: true },
    });

    if (!rider) {
      throw new NotFoundException(`Rider ${riderId} not found or inactive`);
    }

    return this.prisma.deliveryOrder.update({
      where: { id: orderId },
      data: { riderId, status: 'confirmed' },
    });
  }

  async updateStatus(tenantId: string, orderId: string, status: string) {
    const order = await this.prisma.deliveryOrder.findFirst({
      where: { tenantId, id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Delivery order ${orderId} not found`);
    }

    const updateData: any = { status };

    if (status === 'dispatched') {
      updateData.dispatchedAt = new Date();
    } else if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    }

    return this.prisma.deliveryOrder.update({
      where: { id: orderId },
      data: updateData,
    });
  }

  async listRiders(tenantId: string) {
    return this.prisma.deliveryRider.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createRider(tenantId: string, dto: any) {
    return this.prisma.deliveryRider.create({
      data: {
        tenantId,
        name: dto.name,
        phone: dto.phone,
        vehicleType: dto.vehicleType,
        employeeId: dto.employeeId,
        isActive: true,
      },
    });
  }

  async updateRider(tenantId: string, id: string, dto: any) {
    const rider = await this.prisma.deliveryRider.findFirst({
      where: { tenantId, id },
    });

    if (!rider) {
      throw new NotFoundException(`Rider ${id} not found`);
    }

    return this.prisma.deliveryRider.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        vehicleType: dto.vehicleType,
        isActive: dto.isActive,
      },
    });
  }

  // ── Delivery Zones & Pricing ────────────────────────────────────────────────

  async getZones(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const settings = (tenant?.settings as any) || {};
    if (settings.deliveryZones && settings.deliveryZones.length > 0) {
      return settings.deliveryZones;
    }

    const defaultZones = [
      {
        id: 'zone-dha-clifton',
        name: 'DHA & Clifton Zone',
        areas: 'DHA Phases 1-8, Clifton Blocks 1-9, Bath Island',
        deliveryFee: 150,
        freeDeliveryAbove: 2000,
        estimatedMinutes: 30,
        isActive: true,
      },
      {
        id: 'zone-gulshan-johar',
        name: 'Gulshan & Johar Zone',
        areas: 'Gulshan-e-Iqbal Blocks 1-13, Gulistan-e-Johar, University Road',
        deliveryFee: 200,
        freeDeliveryAbove: 2500,
        estimatedMinutes: 45,
        isActive: true,
      },
      {
        id: 'zone-gulberg-cantt',
        name: 'Gulberg & Cantt Zone',
        areas: 'Main Boulevard, Gulberg II-III, Lahore Cantt, Cavalry Ground',
        deliveryFee: 150,
        freeDeliveryAbove: 2000,
        estimatedMinutes: 35,
        isActive: true,
      },
      {
        id: 'zone-express-citywide',
        name: 'Express Urgent Delivery (All Areas)',
        areas: 'Any address within 15km radius (Special temperature-controlled rider)',
        deliveryFee: 350,
        freeDeliveryAbove: 5000,
        estimatedMinutes: 20,
        isActive: true,
      },
    ];

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: { ...settings, deliveryZones: defaultZones } },
    });

    return defaultZones;
  }

  async saveZones(tenantId: string, zones: any[]) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const settings = (tenant?.settings as any) || {};

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: { ...settings, deliveryZones: zones } },
    });

    return zones;
  }
}
