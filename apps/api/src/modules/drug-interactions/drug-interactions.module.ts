import { Module } from '@nestjs/common';
import { DrugInteractionsController } from './drug-interactions.controller';
import { DrugInteractionsService } from './drug-interactions.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DrugInteractionsController],
  providers: [DrugInteractionsService],
})
export class DrugInteractionsModule {}
