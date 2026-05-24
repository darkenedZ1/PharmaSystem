import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';

interface SendMessageOptions {
  tenantId: string;
  phone: string;       // E.164 format: +923001234567
  templateKey: string;
  variables: Record<string, string>;
  recipientType: 'customer' | 'employee';
  recipientId: string;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly apiUrl = 'https://graph.facebook.com/v19.0';

  constructor(private readonly prisma: PrismaService) {}

  async send(opts: SendMessageOptions): Promise<void> {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: {
        tenantId_key_channel: {
          tenantId: opts.tenantId,
          key: opts.templateKey,
          channel: 'whatsapp',
        },
      },
    });

    if (!template || !template.isActive) return;

    const body = this.interpolate(template.body, opts.variables);
    const phoneId = process.env.META_WHATSAPP_PHONE_ID;
    const token = process.env.META_WHATSAPP_TOKEN;

    const logEntry = await this.prisma.notificationLog.create({
      data: {
        tenantId: opts.tenantId,
        recipientType: opts.recipientType,
        recipientId: opts.recipientId,
        channel: 'whatsapp',
        templateKey: opts.templateKey,
        payload: { phone: opts.phone, body, variables: opts.variables },
        status: 'queued',
      },
    });

    try {
      const response = await axios.post(
        `${this.apiUrl}/${phoneId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: opts.phone,
          type: 'text',
          text: { preview_url: false, body },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      await this.prisma.notificationLog.update({
        where: { id: logEntry.id },
        data: {
          status: 'sent',
          externalId: response.data?.messages?.[0]?.id,
          sentAt: new Date(),
        },
      });
    } catch (err) {
      this.logger.error(`WhatsApp send failed: ${err}`);
      await this.prisma.notificationLog.update({
        where: { id: logEntry.id },
        data: { status: 'failed', errorMessage: String(err) },
      });
    }
  }

  async sendPrescriptionReady(tenantId: string, customerId: string, phone: string, patientName: string) {
    await this.send({
      tenantId,
      phone,
      templateKey: 'prescription_ready',
      variables: { name: patientName },
      recipientType: 'customer',
      recipientId: customerId,
    });
  }

  async sendRefillReminder(tenantId: string, customerId: string, phone: string, medicineName: string) {
    await this.send({
      tenantId,
      phone,
      templateKey: 'refill_reminder',
      variables: { medicine: medicineName },
      recipientType: 'customer',
      recipientId: customerId,
    });
  }

  private interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  }
}
