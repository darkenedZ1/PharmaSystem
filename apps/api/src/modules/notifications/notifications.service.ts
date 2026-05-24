import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from './whatsapp.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsappService,
  ) {}

  async getLogs(tenantId: string) {
    return this.prisma.notificationLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async listTemplates(tenantId: string) {
    return this.prisma.notificationTemplate.findMany({
      where: { tenantId },
      orderBy: { key: 'asc' },
    });
  }

  async createTemplate(tenantId: string, dto: any) {
    return this.prisma.notificationTemplate.create({
      data: {
        tenantId,
        key: dto.key,
        channel: dto.channel,
        subject: dto.subject,
        body: dto.body,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateTemplate(tenantId: string, id: string, dto: any) {
    const template = await this.prisma.notificationTemplate.findFirst({
      where: { tenantId, id },
    });

    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }

    return this.prisma.notificationTemplate.update({
      where: { id },
      data: {
        key: dto.key,
        channel: dto.channel,
        subject: dto.subject,
        body: dto.body,
        isActive: dto.isActive,
      },
    });
  }

  async sendNotification(tenantId: string, dto: any) {
    const { recipientId, recipientType, channel, templateKey, variables = {} } = dto;

    const template = await this.prisma.notificationTemplate.findFirst({
      where: { tenantId, key: templateKey, channel },
    });

    if (!template || !template.isActive) {
      throw new NotFoundException(`Active template '${templateKey}' for channel '${channel}' not found`);
    }

    const interpolatedBody = template.body.replace(
      /\{\{(\w+)\}\}/g,
      (_: string, key: string) => variables[key] ?? `{{${key}}}`,
    );

    if (channel === 'whatsapp') {
      const recipient = await this.resolveRecipient(tenantId, recipientType, recipientId);
      if (recipient?.phone) {
        await this.whatsapp.send({
          tenantId,
          phone: recipient.phone,
          templateKey,
          variables,
          recipientType,
          recipientId,
        });
        return { success: true, message: 'WhatsApp notification queued' };
      }
    }

    // For non-whatsapp channels or fallback, log directly
    const log = await this.prisma.notificationLog.create({
      data: {
        tenantId,
        recipientType,
        recipientId,
        channel,
        templateKey,
        payload: { body: interpolatedBody, variables },
        status: 'sent',
        sentAt: new Date(),
      },
    });

    return { success: true, log };
  }

  private async resolveRecipient(tenantId: string, recipientType: string, recipientId: string) {
    if (recipientType === 'customer') {
      return this.prisma.customer.findFirst({
        where: { tenantId, id: recipientId },
        select: { phone: true, name: true },
      });
    }
    if (recipientType === 'employee') {
      return this.prisma.user.findFirst({
        where: { tenantId, id: recipientId },
        select: { phone: true, name: true },
      });
    }
    return null;
  }
}
