import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';

const OPENFDA_NDC_URL = 'https://api.fda.gov/drug/ndc.json';
const BATCH_SIZE = 100;

// Map DEA schedules → Pakistan drug schedule nomenclature
function mapSchedule(deaSchedule: string | undefined, productType: string): string {
  if (!deaSchedule) {
    if (productType?.includes('PRESCRIPTION')) return 'Schedule H';
    return 'OTC';
  }
  const s = deaSchedule.toUpperCase();
  if (s === 'CI' || s === 'CII') return 'Schedule X';   // High abuse potential
  if (s === 'CIII' || s === 'CIV' || s === 'CV') return 'Schedule H'; // Prescription only
  return 'OTC';
}

function mapProductType(productType: string): { isRxOnly: boolean; isControlled: boolean } {
  const t = productType?.toUpperCase() ?? '';
  return {
    isRxOnly: t.includes('PRESCRIPTION'),
    isControlled: t.includes('CONTROLLED'),
  };
}

@Injectable()
export class DrugSyncService {
  private readonly logger = new Logger(DrugSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('drug-sync') private readonly syncQueue: Queue,
  ) {}

  // ── Queue trigger ────────────────────────────────────────────────────────────

  async triggerSync(source: 'openfda' = 'openfda') {
    const job = await this.syncQueue.add('sync', { source }, {
      removeOnComplete: 20,
      removeOnFail: 20,
    });
    return { jobId: job.id, message: 'Drug sync queued' };
  }

  // ── Core sync logic (called by the Bull processor) ───────────────────────────

  async runSync(source: 'openfda' = 'openfda'): Promise<{ newFound: number; updated: number }> {
    const log = await this.prisma.drugSyncLog.create({
      data: { source, status: 'running' },
    });

    let newFound = 0;
    let updated = 0;

    try {
      const results = await this.fetchFromOpenFDA();

      for (const drug of results) {
        const externalId = drug.product_ndc as string;
        if (!externalId) continue;

        const { isRxOnly, isControlled } = mapProductType(drug.product_type ?? '');
        const drugSchedule = mapSchedule(drug.dea_schedule, drug.product_type ?? '');
        const brandName = (drug.brand_name as string)?.trim() || undefined;
        const genericName = (drug.generic_name as string)?.trim() || undefined;
        const name = brandName || genericName || externalId;

        const data = {
          source,
          name,
          genericName: genericName || null,
          brandName: brandName || null,
          manufacturer: (drug.labeler_name as string)?.trim() || null,
          drugSchedule,
          isRxOnly,
          isControlled,
          dosageForm: (drug.dosage_form as string)?.trim() || null,
          route: Array.isArray(drug.route) ? drug.route[0] : drug.route || null,
          activeIngredients: drug.active_ingredients || null,
          pharmClass: Array.isArray(drug.pharm_class)
            ? (drug.pharm_class as string[]).join('; ')
            : drug.pharm_class || null,
        };

        const existing = await this.prisma.pendingDrug.findUnique({
          where: { source_externalId: { source, externalId } },
        });

        if (!existing) {
          await this.prisma.pendingDrug.create({ data: { ...data, externalId } });
          newFound++;
        } else if (existing.status === 'pending') {
          // Update metadata even for pending entries
          await this.prisma.pendingDrug.update({
            where: { id: existing.id },
            data,
          });
          updated++;
        }
      }

      await this.prisma.drugSyncLog.update({
        where: { id: log.id },
        data: { completedAt: new Date(), status: 'completed', newFound, updated },
      });

      this.logger.log(`Drug sync completed: ${newFound} new, ${updated} updated`);
      return { newFound, updated };
    } catch (err: any) {
      this.logger.error('Drug sync failed', err.message);
      await this.prisma.drugSyncLog.update({
        where: { id: log.id },
        data: { completedAt: new Date(), status: 'failed', errors: err.message },
      });
      throw err;
    }
  }

  // ── OpenFDA fetcher ──────────────────────────────────────────────────────────

  private async fetchFromOpenFDA(): Promise<any[]> {
    const allResults: any[] = [];

    // Fetch prescription drugs and OTC separately to get a balanced set
    const queries = [
      `${OPENFDA_NDC_URL}?limit=${BATCH_SIZE}&search=marketing_status:"Prescription"&skip=0`,
      `${OPENFDA_NDC_URL}?limit=${BATCH_SIZE}&search=marketing_status:"OTC"&skip=0`,
      `${OPENFDA_NDC_URL}?limit=${BATCH_SIZE}&search=marketing_status:"Prescription"&skip=${BATCH_SIZE}`,
    ];

    for (const url of queries) {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'SmartBizPro/1.0' },
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) continue;
        const json = await res.json() as { results?: any[] };
        if (json.results) allResults.push(...json.results);
      } catch (e) {
        this.logger.warn(`OpenFDA fetch failed for ${url}: ${(e as Error).message}`);
      }
    }

    return allResults;
  }

  // ── Review queue ─────────────────────────────────────────────────────────────

  async listPending(status: string = 'pending', page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where = { status };
    const [items, total] = await Promise.all([
      this.prisma.pendingDrug.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.pendingDrug.count({ where }),
    ]);
    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  async approveDrug(id: string, tenantId: string, overrides?: Partial<{
    name: string; costPrice: number; salePrice: number; taxRate: number; reorderPoint: number;
  }>) {
    const pending = await this.prisma.pendingDrug.findUnique({ where: { id } });
    if (!pending) throw new NotFoundException('Pending drug not found');

    // Create product in the tenant's catalog
    const product = await this.prisma.product.create({
      data: {
        tenantId,
        name: overrides?.name ?? pending.name,
        genericName: pending.genericName,
        brandName: pending.brandName,
        manufacturer: pending.manufacturer,
        drugSchedule: pending.drugSchedule,
        isControlled: pending.isControlled,
        isRxOnly: pending.isRxOnly,
        barcodes: [],
        costPrice: overrides?.costPrice ?? undefined,
        salePrice: overrides?.salePrice ?? undefined,
        taxRate: overrides?.taxRate ?? 0,
        reorderPoint: overrides?.reorderPoint ?? 10,
        isActive: true,
      },
    });

    // Mark as approved
    await this.prisma.pendingDrug.update({
      where: { id },
      data: { status: 'approved', notes: `Approved into tenant ${tenantId}` },
    });

    return product;
  }

  async rejectDrug(id: string, reason?: string) {
    const pending = await this.prisma.pendingDrug.findUnique({ where: { id } });
    if (!pending) throw new NotFoundException('Pending drug not found');
    return this.prisma.pendingDrug.update({
      where: { id },
      data: { status: 'rejected', notes: reason ?? 'Rejected by pharmacist' },
    });
  }

  async bulkReject(ids: string[]) {
    return this.prisma.pendingDrug.updateMany({
      where: { id: { in: ids }, status: 'pending' },
      data: { status: 'rejected' },
    });
  }

  // ── Status ───────────────────────────────────────────────────────────────────

  async getStatus() {
    const [lastSync, pendingCount, approvedCount] = await Promise.all([
      this.prisma.drugSyncLog.findFirst({ orderBy: { startedAt: 'desc' } }),
      this.prisma.pendingDrug.count({ where: { status: 'pending' } }),
      this.prisma.pendingDrug.count({ where: { status: 'approved' } }),
    ]);
    return { lastSync, pendingCount, approvedCount };
  }

  async getSyncHistory(limit = 10) {
    return this.prisma.drugSyncLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }
}
