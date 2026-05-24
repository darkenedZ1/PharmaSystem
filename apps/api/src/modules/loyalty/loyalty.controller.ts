import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { RequiresModule } from '../../common/decorators/requires-module.decorator';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
import { LoyaltyService } from './loyalty.service';

@ApiTags('Loyalty')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequiresModule('loyalty')
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('program')
  @ApiOperation({ summary: 'Get loyalty program settings' })
  getProgram(@CurrentUser() user: JwtPayload) {
    return this.loyaltyService.getProgram(user.tenantId);
  }

  @Put('program')
  @ApiOperation({ summary: 'Update loyalty program settings' })
  updateProgram(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.loyaltyService.updateProgram(user.tenantId, body);
  }

  @Get('customers/:id')
  @ApiOperation({ summary: 'Get customer loyalty details and recent transactions' })
  getCustomerLoyalty(@CurrentUser() user: JwtPayload, @Param('id') customerId: string) {
    return this.loyaltyService.getCustomerLoyalty(user.tenantId, customerId);
  }

  @Post('customers/:id/earn')
  @ApiOperation({ summary: 'Earn loyalty points for a sale' })
  earnPoints(
    @CurrentUser() user: JwtPayload,
    @Param('id') customerId: string,
    @Body() body: { saleId: string; saleTotal: number },
  ) {
    return this.loyaltyService.earnPoints(user.tenantId, customerId, body.saleId, body.saleTotal);
  }

  @Post('customers/:id/redeem')
  @ApiOperation({ summary: 'Redeem loyalty points' })
  redeemPoints(
    @CurrentUser() user: JwtPayload,
    @Param('id') customerId: string,
    @Body() body: { points: number },
  ) {
    return this.loyaltyService.redeemPoints(user.tenantId, customerId, body.points);
  }

  @Post('customers/:id/adjust')
  @ApiOperation({ summary: 'Manually adjust loyalty points' })
  adjustPoints(
    @CurrentUser() user: JwtPayload,
    @Param('id') customerId: string,
    @Body() body: { points: number; notes: string },
  ) {
    return this.loyaltyService.adjustPoints(user.tenantId, customerId, body.points, body.notes);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'List loyalty transactions' })
  listTransactions(
    @CurrentUser() user: JwtPayload,
    @Query('customerId') customerId?: string,
  ) {
    return this.loyaltyService.listTransactions(user.tenantId, customerId);
  }
}
