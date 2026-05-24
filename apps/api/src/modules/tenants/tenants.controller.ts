import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
import { TenantsService } from './tenants.service';
import type { ModuleId } from '@pharmacy/shared';

@ApiTags('Tenant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  // ── Tenant Profile ───────────────────────────────────────────────────────────

  @Get('me')
  @ApiOperation({ summary: 'Get current tenant profile and settings' })
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.tenantsService.getProfile(user.tenantId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update tenant profile and settings' })
  updateProfile(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.tenantsService.updateProfile(user.tenantId, body);
  }

  // ── Module Management ────────────────────────────────────────────────────────

  @Get('modules')
  @ApiOperation({ summary: 'List all modules with enabled/disabled status for this tenant' })
  getModules(@CurrentUser() user: JwtPayload) {
    return this.tenantsService.getModules(user.tenantId);
  }

  @Post('modules/:moduleId/enable')
  @ApiOperation({ summary: 'Enable a module (auto-enables dependencies)' })
  enable(@CurrentUser() user: JwtPayload, @Param('moduleId') moduleId: ModuleId) {
    return this.tenantsService.enableModule(user.tenantId, moduleId);
  }

  @Delete('modules/:moduleId/disable')
  @ApiOperation({ summary: 'Disable a module (blocked if other enabled modules depend on it)' })
  disable(@CurrentUser() user: JwtPayload, @Param('moduleId') moduleId: ModuleId) {
    return this.tenantsService.disableModule(user.tenantId, moduleId);
  }
}
