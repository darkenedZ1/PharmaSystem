import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { RequiresModule } from '../../common/decorators/requires-module.decorator';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
import { PosService } from './pos.service';

@ApiTags('POS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequiresModule('pos')
@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Post('sales')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a sale (idempotent — safe to retry on offline reconnect)' })
  createSale(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.posService.createSale(user.tenantId, user.sub, body);
  }

  @Get('sales')
  @ApiOperation({ summary: 'List recent sales' })
  getSales(
    @CurrentUser() user: JwtPayload,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.posService.getSales(
      user.tenantId,
      branchId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('sales/:id')
  @ApiOperation({ summary: 'Get single sale details' })
  getSale(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.posService.getSale(user.tenantId, id);
  }

  @Post('sales/:id/void')
  @ApiOperation({ summary: 'Void a completed sale (requires supervisor)' })
  voidSale(
    @CurrentUser() user: JwtPayload,
    @Param('id') saleId: string,
    @Body('reason') reason: string,
  ) {
    return this.posService.voidSale(user.tenantId, saleId, reason, user.sub);
  }

  @Get('cash-drawer/current')
  @ApiOperation({ summary: 'Get current active cash drawer' })
  getCurrentDrawer(@CurrentUser() user: JwtPayload) {
    return this.posService.getCurrentDrawer(user.tenantId);
  }

  @Post('cash-drawer/open')
  @ApiOperation({ summary: 'Open a cash drawer' })
  openDrawer(@CurrentUser() user: JwtPayload, @Body('openingCash') openingCash: number) {
    return this.posService.openDrawer(user.tenantId, user.sub, Number(openingCash));
  }

  @Post('cash-drawer/close')
  @ApiOperation({ summary: 'Close the current cash drawer' })
  closeDrawer(
    @CurrentUser() user: JwtPayload,
    @Body('closingCash') closingCash: number,
    @Body('notes') notes?: string,
  ) {
    return this.posService.closeDrawer(user.tenantId, user.sub, Number(closingCash), notes);
  }
}
