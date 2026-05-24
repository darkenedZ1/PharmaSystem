import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { FbrService } from './fbr.service';

@Processor('fbr-sync')
export class FbrProcessor {
  private readonly logger = new Logger(FbrProcessor.name);

  constructor(private readonly fbrService: FbrService) {}

  @Process('sync-invoice')
  async handle(job: Job<{ tenantId: string; saleId: string }>) {
    const { tenantId, saleId } = job.data;
    this.logger.debug(`Processing FBR sync: sale ${saleId} (attempt ${job.attemptsMade + 1})`);
    await this.fbrService.submitToFbr(tenantId, saleId);
  }
}
