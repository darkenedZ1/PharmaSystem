import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
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

  @Get('categories')
  @ApiOperation({ summary: 'Get all categories' })
  getCategories(@CurrentUser() user: JwtPayload) {
    return this.inventoryService.getCategories(user.tenantId);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create category' })
  createCategory(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.inventoryService.createCategory(user.tenantId, body);
  }

  @Get('stock/movements')
  @ApiOperation({ summary: 'Get stock audit movements' })
  getStockMovements(
    @CurrentUser() user: JwtPayload,
    @Query('branchId') branchId?: string,
    @Query('productId') productId?: string,
  ) {
    return this.inventoryService.getStockMovements(user.tenantId, branchId, productId);
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

  @Get('transfers')
  @ApiOperation({ summary: 'Get inter-branch stock transfers' })
  getTransfers(@CurrentUser() user: JwtPayload) {
    return this.inventoryService.getTransfers(user.tenantId);
  }

  @Post('transfers')
  @ApiOperation({ summary: 'Create inter-branch stock transfer' })
  createTransfer(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.inventoryService.createTransfer(user.tenantId, user.sub, body);
  }

  @Post('transfers/:id/dispatch')
  @ApiOperation({ summary: 'Dispatch transfer shipment (decrements source branch stock)' })
  dispatchTransfer(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.inventoryService.dispatchTransfer(user.tenantId, user.sub, id);
  }

  @Post('transfers/:id/receive')
  @ApiOperation({ summary: 'Receive transfer shipment (increments target branch stock)' })
  receiveTransfer(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.inventoryService.receiveTransfer(user.tenantId, user.sub, id);
  }

  @Get('products')
  @ApiOperation({ summary: 'Search products by name, generic name, or barcode' })
  getProducts(@CurrentUser() user: JwtPayload, @Query('q') search?: string) {
    return this.inventoryService.getProducts(user.tenantId, search);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get single product details' })
  getProduct(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.inventoryService.getProduct(user.tenantId, id);
  }

  @Post('products')
  createProduct(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.inventoryService.createProduct(user.tenantId, body);
  }

  @Put('products/:id')
  @ApiOperation({ summary: 'Update a product' })
  updateProduct(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.inventoryService.updateProduct(user.tenantId, id, body);
  }
}
