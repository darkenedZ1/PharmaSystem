import { Process, Processor, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { DrugSyncService } from './drug-sync.service';

@Processor('drug-sync')
export class DrugSyncJob {
  private readonly logger = new Logger(DrugSyncJob.name);

  constructor(private readonly drugSyncService: DrugSyncService) {}

  @Process('sync')
  async handleSync(job: Job<{ source: 'openfda' }>) {
    this.logger.log(`Processing drug sync job ${job.id} from ${job.data.source}`);
    return this.drugSyncService.runSync(job.data.source ?? 'openfda');
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: { newFound: number; updated: number }) {
    this.logger.log(
      `Drug sync job ${job.id} completed — ${result.newFound} new, ${result.updated} updated`,
    );
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(`Drug sync job ${job.id} failed: ${err.message}`);
  }
}
