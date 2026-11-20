import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { RequiresModule } from '../../common/decorators/requires-module.decorator';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
import { FbrService } from './fbr.service';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('FBR Compliance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequiresModule('fbr')
@Controller('fbr')
export class FbrController {
  constructor(
    private readonly fbrService: FbrService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get overall FBR integration & compliance status' })
  async getStatus(@CurrentUser() user: JwtPayload) {
    const [pending, failed, success] = await Promise.all([
      this.prisma.fbrSyncQueue.count({ where: { tenantId: user.tenantId, status: 'pending' } }),
      this.prisma.fbrSyncQueue.count({ where: { tenantId: user.tenantId, status: 'failed' } }),
      this.prisma.fbrSyncQueue.count({ where: { tenantId: user.tenantId, status: 'success' } }),
    ]);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true, settings: true },
    });
    const settings = (tenant?.settings as any) || {};

    return {
      environment: process.env.NODE_ENV === 'production' ? 'Production' : 'Sandbox Simulator',
      posId: 100049,
      isConfigured: true,
      businessName: tenant?.name || 'SmartBiz Pharmacy',
      ntn: settings?.ntn || '1234567-8',
      queue: { pending, failed, success, total: pending + failed + success },
      complianceRate: success + failed > 0 ? Math.round((success / (success + failed)) * 100) : 100,
      lastSyncAt: new Date(),
    };
  }

  @Get('queue')
  @ApiOperation({ summary: 'Get FBR sync queue status' })
  async getQueue(@CurrentUser() user: JwtPayload) {
    const [pending, failed, success] = await Promise.all([
      this.prisma.fbrSyncQueue.count({ where: { tenantId: user.tenantId, status: 'pending' } }),
      this.prisma.fbrSyncQueue.count({ where: { tenantId: user.tenantId, status: 'failed' } }),
      this.prisma.fbrSyncQueue.count({ where: { tenantId: user.tenantId, status: 'success' } }),
    ]);

    const recentFailed = await this.prisma.fbrSyncQueue.findMany({
      where: { tenantId: user.tenantId, status: 'failed' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { sale: { select: { invoiceNumber: true, total: true, saleDate: true } } },
    });

    return { pending, failed, success, recentFailed };
  }

  @Post('resume-offline')
  @ApiOperation({ summary: 'Resume offline-pending FBR submissions' })
  async resumeOffline(@CurrentUser() user: JwtPayload) {
    const count = await this.fbrService.resumeOffline(user.tenantId);
    return { message: `Queued ${count} offline-pending invoices for FBR submission` };
  }

  @Post('retry/:id')
  @ApiOperation({ summary: 'Retry a failed FBR queue invoice' })
  async retryQueueItem(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.fbrService.retryInvoice(user.tenantId, id);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get FBR configuration settings' })
  getSettings(@CurrentUser() user: JwtPayload) {
    return this.fbrService.getSettings(user.tenantId);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update FBR configuration settings' })
  updateSettings(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.fbrService.updateSettings(user.tenantId, body);
  }

  @Post('test-connection')
  @ApiOperation({ summary: 'Test connection to FBR IMS' })
  testConnection(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.fbrService.testConnection(user.tenantId, body);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get FBR Sales Tax & Annexure-C reports' })
  getReports(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.fbrService.getReports(user.tenantId, from, to);
  }
}
