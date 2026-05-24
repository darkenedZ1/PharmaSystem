import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
import { DrugSyncService } from './drug-sync.service';

@ApiTags('Drug Sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('drug-sync')
export class DrugSyncController {
  constructor(private readonly drugSyncService: DrugSyncService) {}

  // ── Status & history ─────────────────────────────────────────────────────────

  @Get('status')
  @ApiOperation({ summary: 'Get drug sync status: last run, pending count, approved count' })
  getStatus() {
    return this.drugSyncService.getStatus();
  }

  @Get('history')
  @ApiOperation({ summary: 'Get sync job history' })
  getSyncHistory() {
    return this.drugSyncService.getSyncHistory();
  }

  // ── Trigger sync ─────────────────────────────────────────────────────────────

  @Post('trigger')
  @ApiOperation({ summary: 'Manually trigger a drug sync from OpenFDA' })
  triggerSync() {
    return this.drugSyncService.triggerSync('openfda');
  }

  // ── Review queue ─────────────────────────────────────────────────────────────

  @Get('pending')
  @ApiOperation({ summary: 'List drugs pending review' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'rejected'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  listPending(
    @Query('status') status: string = 'pending',
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    return this.drugSyncService.listPending(status, Number(page), Number(limit));
  }

  @Post('pending/:id/approve')
  @ApiOperation({ summary: 'Approve a pending drug and add it to this tenant\'s product catalog' })
  approveDrug(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      costPrice?: number;
      salePrice?: number;
      taxRate?: number;
      reorderPoint?: number;
    },
  ) {
    return this.drugSyncService.approveDrug(id, user.tenantId, body);
  }

  @Put('pending/:id/reject')
  @ApiOperation({ summary: 'Reject a pending drug' })
  rejectDrug(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.drugSyncService.rejectDrug(id, body.reason);
  }

  @Delete('pending/bulk-reject')
  @ApiOperation({ summary: 'Reject multiple pending drugs at once' })
  bulkReject(@Body() body: { ids: string[] }) {
    return this.drugSyncService.bulkReject(body.ids);
  }
}
