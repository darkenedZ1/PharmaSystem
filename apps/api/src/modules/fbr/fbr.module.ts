import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { FbrService } from './fbr.service';
import { FbrController } from './fbr.controller';
import { FbrProcessor } from './fbr.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'fbr-sync' }),
  ],
  providers: [FbrService, FbrProcessor],
  controllers: [FbrController],
  exports: [FbrService],
})
export class FbrModule {}
