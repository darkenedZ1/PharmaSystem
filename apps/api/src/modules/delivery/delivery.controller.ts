import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { RequiresModule } from '../../common/decorators/requires-module.decorator';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
import { DeliveryService } from './delivery.service';

@ApiTags('Delivery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequiresModule('delivery')
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get('orders')
  @ApiOperation({ summary: 'List delivery orders' })
  listOrders(@CurrentUser() user: JwtPayload, @Query('status') status?: string) {
    return this.deliveryService.listOrders(user.tenantId, status);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get a delivery order by ID' })
  getOrder(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.deliveryService.getOrder(user.tenantId, id);
  }

  @Post('orders')
  @ApiOperation({ summary: 'Create a new delivery order' })
  createOrder(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.deliveryService.createOrder(user.tenantId, body);
  }

  @Post('orders/:id/assign')
  @ApiOperation({ summary: 'Assign a rider to a delivery order' })
  assignRider(
    @CurrentUser() user: JwtPayload,
    @Param('id') orderId: string,
    @Body() body: { riderId: string },
  ) {
    return this.deliveryService.assignRider(user.tenantId, orderId, body.riderId);
  }

  @Post('orders/:id/status')
  @ApiOperation({ summary: 'Update delivery order status' })
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') orderId: string,
    @Body() body: { status: string },
  ) {
    return this.deliveryService.updateStatus(user.tenantId, orderId, body.status);
  }

  @Get('riders')
  @ApiOperation({ summary: 'List active delivery riders' })
  listRiders(@CurrentUser() user: JwtPayload) {
    return this.deliveryService.listRiders(user.tenantId);
  }

  @Post('riders')
  @ApiOperation({ summary: 'Create a new delivery rider' })
  createRider(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.deliveryService.createRider(user.tenantId, body);
  }

  @Put('riders/:id')
  @ApiOperation({ summary: 'Update a delivery rider' })
  updateRider(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.deliveryService.updateRider(user.tenantId, id, body);
  }
}
