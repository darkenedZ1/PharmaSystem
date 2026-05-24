import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { RequiresModule } from '../../common/decorators/requires-module.decorator';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
import { AccountsService } from './accounts.service';

@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequiresModule('accounts')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get('chart')
  getChartOfAccounts(@CurrentUser() user: JwtPayload) {
    return this.accountsService.getChartOfAccounts(user.tenantId);
  }

  @Post('chart')
  createAccount(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.accountsService.createAccount(user.tenantId, body);
  }

  @Get('journal')
  getJournalEntries(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.accountsService.getJournalEntries(
      user.tenantId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Post('journal')
  createJournalEntry(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.accountsService.createJournalEntry(user.tenantId, user.sub, body);
  }

  @Get('ledger/:accountId')
  getLedger(
    @CurrentUser() user: JwtPayload,
    @Param('accountId') accountId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.accountsService.getLedger(
      user.tenantId,
      accountId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('pnl')
  getProfitAndLoss(
    @CurrentUser() user: JwtPayload,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = to ? new Date(to) : new Date();
    return this.accountsService.getProfitAndLoss(user.tenantId, fromDate, toDate);
  }

  @Get('trial-balance')
  getTrialBalance(@CurrentUser() user: JwtPayload) {
    return this.accountsService.getTrialBalance(user.tenantId);
  }
}
