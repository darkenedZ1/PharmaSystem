import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../../prisma/prisma.module';
import { DrugSyncService } from './drug-sync.service';
import { DrugSyncJob } from './drug-sync.job';
import { DrugSyncController } from './drug-sync.controller';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: 'drug-sync' }),
  ],
  providers: [DrugSyncService, DrugSyncJob],
  controllers: [DrugSyncController],
  exports: [DrugSyncService],
})
export class DrugSyncModule {}
