import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DrugInteractionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll() {
    return this.prisma.drugInteraction.findMany({
      orderBy: { severity: 'desc' },
      take: 100,
    });
  }

  async checkByProductIds(tenantId: string, productIds: string[]) {
    const products = await this.prisma.product.findMany({
      where: { tenantId, id: { in: productIds } },
      select: { id: true, name: true, atcCode: true, genericName: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    const pairs: Array<[string, string, string, string]> = [];

    for (let i = 0; i < productIds.length; i++) {
      for (let j = i + 1; j < productIds.length; j++) {
        const a = productMap.get(productIds[i]!);
        const b = productMap.get(productIds[j]!);
        if (a?.atcCode && b?.atcCode) {
          pairs.push([productIds[i]!, productIds[j]!, a.atcCode, b.atcCode]);
        }
      }
    }

    const results = await Promise.all(
      pairs.map(async ([idA, idB, atcA, atcB]) => {
        const interaction = await this.prisma.drugInteraction.findFirst({
          where: {
            OR: [
              { drugAAtc: atcA, drugBAtc: atcB },
              { drugAAtc: atcB, drugBAtc: atcA },
            ],
          },
        });
        if (!interaction) return null;
        return {
          ...interaction,
          productA: productMap.get(idA),
          productB: productMap.get(idB),
        };
      }),
    );

    return results.filter(Boolean);
  }

  async checkByAtcCodes(atcCodes: string[]) {
    const pairs: Array<[string, string]> = [];

    for (let i = 0; i < atcCodes.length; i++) {
      for (let j = i + 1; j < atcCodes.length; j++) {
        pairs.push([atcCodes[i]!, atcCodes[j]!]);
      }
    }

    const results = await Promise.all(
      pairs.map(([a, b]) =>
        this.prisma.drugInteraction.findFirst({
          where: {
            OR: [
              { drugAAtc: a, drugBAtc: b },
              { drugAAtc: b, drugBAtc: a },
            ],
          },
        }),
      ),
    );

    return results.filter(Boolean);
  }

  async listOverrides(tenantId: string) {
    return this.prisma.interactionOverride.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createOverride(tenantId: string, userId: string, dto: any) {
    return this.prisma.interactionOverride.create({
      data: {
        tenantId,
        saleId: dto.saleId,
        productAId: dto.productAId,
        productBId: dto.productBId,
        severity: dto.severity,
        overriddenById: userId,
        reason: dto.reason,
      },
    });
  }

  async seedInteraction(dto: any) {
    return this.prisma.drugInteraction.upsert({
      where: {
        drugAAtc_drugBAtc: {
          drugAAtc: dto.drugAAtc,
          drugBAtc: dto.drugBAtc,
        },
      },
      update: {
        severity: dto.severity,
        description: dto.description,
        mechanism: dto.mechanism,
        management: dto.management,
      },
      create: {
        drugAAtc: dto.drugAAtc,
        drugBAtc: dto.drugBAtc,
        severity: dto.severity,
        description: dto.description,
        mechanism: dto.mechanism,
        management: dto.management,
      },
    });
  }
}
