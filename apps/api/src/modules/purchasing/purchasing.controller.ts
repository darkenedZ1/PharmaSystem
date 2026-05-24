import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { RequiresModule } from '../../common/decorators/requires-module.decorator';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
import { PurchasingService } from './purchasing.service';

@ApiTags('Purchasing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequiresModule('purchasing')
@Controller('purchasing')
export class PurchasingController {
  constructor(private readonly purchasingService: PurchasingService) {}

  // ── Suppliers ───────────────────────────────────────────────────────────────

  @Get('suppliers')
  listSuppliers(@CurrentUser() user: JwtPayload) {
    return this.purchasingService.listSuppliers(user.tenantId);
  }

  @Post('suppliers')
  createSupplier(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.purchasingService.createSupplier(user.tenantId, body);
  }

  @Put('suppliers/:id')
  updateSupplier(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: any) {
    return this.purchasingService.updateSupplier(user.tenantId, id, body);
  }

  @Delete('suppliers/:id')
  deactivateSupplier(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.purchasingService.deactivateSupplier(user.tenantId, id);
  }

  // ── Purchase Orders ─────────────────────────────────────────────────────────

  @Get('orders')
  listPOs(
    @CurrentUser() user: JwtPayload,
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
  ) {
    return this.purchasingService.listPOs(user.tenantId, branchId, status);
  }

  @Get('orders/:id')
  getPO(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.purchasingService.getPO(user.tenantId, id);
  }

  @Post('orders')
  createPO(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.purchasingService.createPO(user.tenantId, user.sub, body);
  }

  @Post('orders/:id/approve')
  approvePO(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.purchasingService.approvePO(user.tenantId, id, user.sub);
  }

  @Post('orders/:id/cancel')
  cancelPO(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.purchasingService.cancelPO(user.tenantId, id);
  }

  // ── GRN ─────────────────────────────────────────────────────────────────────

  @Get('grn')
  listGrns(@CurrentUser() user: JwtPayload, @Query('branchId') branchId?: string) {
    return this.purchasingService.listGrns(user.tenantId, branchId);
  }

  @Post('grn')
  createGrn(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.purchasingService.createGrn(user.tenantId, user.sub, body);
  }
}
