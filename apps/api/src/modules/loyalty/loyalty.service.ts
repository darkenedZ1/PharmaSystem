import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const TIER_THRESHOLDS = {
  platinum: 5000,
  gold: 2000,
  silver: 500,
};

function calculateTier(points: number): string {
  if (points >= TIER_THRESHOLDS.platinum) return 'platinum';
  if (points >= TIER_THRESHOLDS.gold) return 'gold';
  if (points >= TIER_THRESHOLDS.silver) return 'silver';
  return 'standard';
}

@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}

  async getProgram(tenantId: string) {
    let program = await this.prisma.loyaltyProgram.findFirst({
      where: { tenantId },
    });

    if (!program) {
      program = await this.prisma.loyaltyProgram.create({
        data: {
          tenantId,
          pointsPerRupee: 1,
          rupeePerPoint: 0.1,
          pointsExpireDays: 365,
          isActive: true,
        },
      });
    }

    return program;
  }

  async updateProgram(tenantId: string, dto: any) {
    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { tenantId },
    });

    if (!program) {
      return this.prisma.loyaltyProgram.create({
        data: {
          tenantId,
          pointsPerRupee: dto.pointsPerRupee ?? 1,
          rupeePerPoint: dto.rupeePerPoint ?? 0.1,
          pointsExpireDays: dto.pointsExpireDays ?? 365,
          isActive: dto.isActive ?? true,
        },
      });
    }

    return this.prisma.loyaltyProgram.update({
      where: { id: program.id },
      data: {
        pointsPerRupee: dto.pointsPerRupee,
        rupeePerPoint: dto.rupeePerPoint,
        pointsExpireDays: dto.pointsExpireDays,
        isActive: dto.isActive,
      },
    });
  }

  async getCustomerLoyalty(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { tenantId, id: customerId },
      select: {
        id: true,
        name: true,
        loyaltyPoints: true,
        loyaltyTier: true,
        walletBalance: true,
        creditLimit: true,
        creditBalance: true,
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    const transactions = await this.prisma.loyaltyTransaction.findMany({
      where: { tenantId, customerId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return { customer, transactions };
  }

  async earnPoints(tenantId: string, customerId: string, saleId: string, saleTotal: number) {
    const program = await this.getProgram(tenantId);

    if (!program.isActive) {
      throw new BadRequestException('Loyalty program is not active');
    }

    const pointsEarned = Math.floor(saleTotal * Number(program.pointsPerRupee));

    const customer = await this.prisma.customer.findFirst({
      where: { tenantId, id: customerId },
      select: { id: true, loyaltyPoints: true },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    const newBalance = (customer.loyaltyPoints ?? 0) + pointsEarned;
    const newTier = calculateTier(newBalance);

    await this.prisma.customer.update({
      where: { id: customerId },
      data: { loyaltyPoints: newBalance, loyaltyTier: newTier },
    });

    return this.prisma.loyaltyTransaction.create({
      data: {
        tenantId,
        customerId,
        saleId,
        type: 'earn',
        points: pointsEarned,
        balanceAfter: newBalance,
      },
    });
  }

  async redeemPoints(tenantId: string, customerId: string, points: number) {
    const customer = await this.prisma.customer.findFirst({
      where: { tenantId, id: customerId },
      select: { id: true, loyaltyPoints: true },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    const currentPoints = customer.loyaltyPoints ?? 0;
    if (currentPoints < points) {
      throw new BadRequestException(
        `Insufficient loyalty points. Available: ${currentPoints}, Requested: ${points}`,
      );
    }

    const newBalance = currentPoints - points;
    const newTier = calculateTier(newBalance);

    await this.prisma.customer.update({
      where: { id: customerId },
      data: { loyaltyPoints: newBalance, loyaltyTier: newTier },
    });

    return this.prisma.loyaltyTransaction.create({
      data: {
        tenantId,
        customerId,
        type: 'redeem',
        points: -points,
        balanceAfter: newBalance,
      },
    });
  }

  async adjustPoints(tenantId: string, customerId: string, points: number, notes: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { tenantId, id: customerId },
      select: { id: true, loyaltyPoints: true },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    const newBalance = Math.max(0, (customer.loyaltyPoints ?? 0) + points);
    const newTier = calculateTier(newBalance);

    await this.prisma.customer.update({
      where: { id: customerId },
      data: { loyaltyPoints: newBalance, loyaltyTier: newTier },
    });

    return this.prisma.loyaltyTransaction.create({
      data: {
        tenantId,
        customerId,
        type: 'adjust',
        points,
        balanceAfter: newBalance,
        notes,
      },
    });
  }

  async listTransactions(tenantId: string, customerId?: string) {
    return this.prisma.loyaltyTransaction.findMany({
      where: {
        tenantId,
        ...(customerId ? { customerId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
