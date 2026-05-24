import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { RequiresModule } from '../../common/decorators/requires-module.decorator';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
import { DrugInteractionsService } from './drug-interactions.service';

@ApiTags('Drug Safety')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequiresModule('drug-interactions')
@Controller('drug-interactions')
export class DrugInteractionsController {
  constructor(private readonly drugInteractionsService: DrugInteractionsService) {}

  @Get('check')
  @ApiOperation({ summary: 'Check drug interactions by product IDs' })
  async checkByProductIds(
    @CurrentUser() user: JwtPayload,
    @Query('productIds') productIdsParam: string,
  ) {
    const productIds = productIdsParam.split(',').map((id) => id.trim()).filter(Boolean);
    return this.drugInteractionsService.checkByProductIds(user.tenantId, productIds);
  }

  @Get('check-atc')
  @ApiOperation({ summary: 'Check drug interactions by ATC codes' })
  async checkByAtcCodes(
    @CurrentUser() _user: JwtPayload,
    @Query('atcCodes') atcCodesParam: string,
  ) {
    const atcCodes = atcCodesParam.split(',').map((c) => c.trim()).filter(Boolean);
    return this.drugInteractionsService.checkByAtcCodes(atcCodes);
  }

  @Get('overrides')
  @ApiOperation({ summary: 'List interaction overrides for this tenant' })
  async listOverrides(@CurrentUser() user: JwtPayload) {
    return this.drugInteractionsService.listOverrides(user.tenantId);
  }

  @Post('overrides')
  @ApiOperation({ summary: 'Log an interaction override' })
  async createOverride(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.drugInteractionsService.createOverride(user.tenantId, user.sub, body);
  }
}
