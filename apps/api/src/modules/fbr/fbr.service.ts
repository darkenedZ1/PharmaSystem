import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import axios, { AxiosError } from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { FBR_PHARMA_SCENARIO } from '@pharmacy/shared';

interface FbrInvoiceItem {
  hsCode: string;
  productDescription: string;
  rate: number;
  uoM: string;
  quantity: number;
  valueSalesExcludingST: number;
  salesTaxApplicable: number;
  saleType: number;
}

interface FbrInvoicePayload {
  invoiceType: number;
  invoiceDate: string;
  invoiceNumber: string;
  POSID: number;
  USIN: string;
  sellerBusinessName: string;
  sellerNTNCNIC: string;
  sellerSTRN?: string;
  sellerAddress: string;
  sellerProvince: string;
  buyerNTNCNIC?: string;
  buyerBusinessName?: string;
  buyerProvince?: string;
  buyerAddress?: string;
  scenarioId: string;
  sroScheduleNo: string;
  sroItemSerialNo: string;
  totalAmount: number;
  totalSalesTax: number;
  totalQuantity: number;
  InvoiceItems: FbrInvoiceItem[];
}

@Injectable()
export class FbrService {
  private readonly logger = new Logger(FbrService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('fbr-sync') private readonly fbrQueue: Queue,
  ) {}

  /** Called immediately after a sale completes — queues async FBR submission */
  async enqueueSale(tenantId: string, saleId: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: { include: { product: true } },
        tenant: true,
        branch: true,
      },
    });

    if (!sale) return;

    const payload = this.buildFbrPayload(sale);

    await this.prisma.fbrSyncQueue.upsert({
      where: { id: saleId },
      create: {
        tenantId,
        saleId,
        payload: payload as any,
        status: 'pending',
        nextRetryAt: new Date(),
      },
      update: { payload: payload as any, status: 'pending', nextRetryAt: new Date() },
    });

    await this.fbrQueue.add(
      'sync-invoice',
      { tenantId, saleId },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 60_000 }, // 1min → 2min → 4min → 8min → 16min
        removeOnComplete: true,
      },
    );
  }

  /** Actual HTTP call to FBR — called by the BullMQ processor */
  async submitToFbr(tenantId: string, saleId: string): Promise<void> {
    const queueEntry = await this.prisma.fbrSyncQueue.findFirst({
      where: { tenantId, saleId },
    });

    if (!queueEntry || queueEntry.status === 'success') return;

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const settings = tenant?.settings as Record<string, string> | null;
    const fbrToken = settings?.fbrToken;
    const fbrUrl = settings?.fbrSandbox
      ? (process.env.FBR_SANDBOX_URL ?? '')
      : (process.env.FBR_API_URL ?? '');

    if (!fbrToken) {
      this.logger.warn(`Tenant ${tenantId} has no FBR token configured`);
      await this.markFailed(queueEntry.id, 'FBR token not configured');
      return;
    }

    try {
      const response = await axios.post(fbrUrl, queueEntry.payload, {
        headers: {
          Authorization: `Bearer ${fbrToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10_000,
      });

      const fbrInvoiceNumber = response.data?.InvoiceNumber ?? response.data?.invoiceNumber;

      await this.prisma.$transaction([
        this.prisma.fbrSyncQueue.update({
          where: { id: queueEntry.id },
          data: {
            status: 'success',
            fbrResponse: response.data,
            syncedAt: new Date(),
          },
        }),
        this.prisma.sale.update({
          where: { id: saleId },
          data: { fbrInvoiceNumber, fbrSyncStatus: 'success' },
        }),
      ]);

      this.logger.log(`FBR sync success: sale ${saleId} → FBR# ${fbrInvoiceNumber}`);
    } catch (err) {
      const message = err instanceof AxiosError
        ? `${err.response?.status}: ${JSON.stringify(err.response?.data)}`
        : String(err);

      await this.prisma.fbrSyncQueue.update({
        where: { id: queueEntry.id },
        data: {
          attempts: { increment: 1 },
          lastError: message,
          status: 'failed',
        },
      });

      this.logger.error(`FBR sync failed for sale ${saleId}: ${message}`);
      throw err; // re-throw so BullMQ retries
    }
  }

  /** Mark all pending FBR entries as offline — called when connectivity is lost */
  async markOffline(tenantId: string) {
    await this.prisma.fbrSyncQueue.updateMany({
      where: { tenantId, status: 'pending' },
      data: { status: 'offline_pending' },
    });
  }

  /** Resume offline-pending entries when connectivity returns */
  async resumeOffline(tenantId: string) {
    const pending = await this.prisma.fbrSyncQueue.findMany({
      where: { tenantId, status: 'offline_pending' },
      select: { saleId: true },
    });

    for (const { saleId } of pending) {
      await this.prisma.fbrSyncQueue.updateMany({
        where: { tenantId, saleId },
        data: { status: 'pending', nextRetryAt: new Date() },
      });
      await this.fbrQueue.add('sync-invoice', { tenantId, saleId }, { attempts: 5 });
    }

    return pending.length;
  }

  private buildFbrPayload(sale: any): FbrInvoicePayload {
    const settings = sale.tenant.settings as Record<string, any>;

    return {
      invoiceType: 1,
      invoiceDate: sale.saleDate.toISOString().split('T')[0]!,
      invoiceNumber: sale.invoiceNumber,
      POSID: Number(sale.branch.fbrPosId ?? 1),
      USIN: sale.clientId,
      sellerBusinessName: sale.tenant.name,
      sellerNTNCNIC: settings?.ntn ?? '',
      sellerSTRN: settings?.strn,
      sellerAddress: settings?.address ?? '',
      sellerProvince: settings?.province ?? 'Punjab',
      scenarioId: FBR_PHARMA_SCENARIO.scenarioId,
      sroScheduleNo: FBR_PHARMA_SCENARIO.sroScheduleNo,
      sroItemSerialNo: FBR_PHARMA_SCENARIO.sroItemSerialNo,
      totalAmount: Number(sale.total),
      totalSalesTax: Number(sale.taxAmount),
      totalQuantity: sale.items.reduce((s: number, i: any) => s + i.quantity, 0),
      InvoiceItems: sale.items.map((item: any) => ({
        hsCode: item.product.atcCode ?? '30049099',
        productDescription: item.product.name,
        rate: Number(item.unitPrice),
        uoM: item.product.unitOfMeasure,
        quantity: item.quantity,
        valueSalesExcludingST: Number(item.lineTotal) - Number(item.taxAmount),
        salesTaxApplicable: Number(item.taxAmount),
        saleType: 1,
      })),
    };
  }

  private async markFailed(queueId: string, error: string) {
    await this.prisma.fbrSyncQueue.update({
      where: { id: queueId },
      data: { status: 'failed', lastError: error },
    });
  }
}
