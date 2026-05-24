import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { RequiresModule } from '../../common/decorators/requires-module.decorator';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
import { InventoryService } from './inventory.service';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequiresModule('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('products')
  @ApiOperation({ summary: 'Search products by name, generic name, or barcode' })
  getProducts(@CurrentUser() user: JwtPayload, @Query('q') search?: string) {
    return this.inventoryService.getProducts(user.tenantId, search);
  }

  @Post('products')
  createProduct(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.inventoryService.createProduct(user.tenantId, body);
  }

  @Get('stock')
  @ApiOperation({ summary: 'Get stock levels per product/batch/branch' })
  getStock(@CurrentUser() user: JwtPayload, @Query('branchId') branchId?: string) {
    return this.inventoryService.getStockLevels(user.tenantId, branchId);
  }

  @Get('expiry')
  @ApiOperation({ summary: 'Get near-expiry batches (default: within 90 days)' })
  getNearExpiry(@CurrentUser() user: JwtPayload, @Query('days') days?: string) {
    return this.inventoryService.getNearExpiry(user.tenantId, days ? Number(days) : 90);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get products below reorder point' })
  getLowStock(@CurrentUser() user: JwtPayload) {
    return this.inventoryService.getLowStock(user.tenantId);
  }

  @Post('adjustments')
  @ApiOperation({ summary: 'Manually adjust stock level with reason' })
  adjustStock(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.inventoryService.adjustStock(user.tenantId, user.sub, body);
  }
}
