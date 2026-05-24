import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [WhatsappService, NotificationsService],
  controllers: [NotificationsController],
  exports: [WhatsappService, NotificationsService],
})
export class NotificationsModule {}
