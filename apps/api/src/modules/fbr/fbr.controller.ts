import { Controller, Get, Post, UseGuards } from '@nestjs/common';
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
}
