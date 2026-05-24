import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { RequiresModule } from '../../common/decorators/requires-module.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('SaaS Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequiresModule('saas-admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('tenants')
  async listTenants() {
    return this.prisma.tenant.findMany({
      select: {
        id: true, name: true, subdomain: true, planId: true,
        status: true, enabledModules: true, createdAt: true,
        _count: { select: { users: true, sales: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('stats')
  async getStats() {
    const [tenants, users, sales] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.sale.count({ where: { status: 'completed' } }),
    ]);
    return { tenants, activeUsers: users, completedSales: sales };
  }
}
