import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { RequiresModule } from '../../common/decorators/requires-module.decorator';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
import { PrescriptionsService } from './prescriptions.service';

@ApiTags('Prescriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequiresModule('prescriptions')
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  // ── Patients ───────────────────────────────────────────────────────────────

  @Get('patients')
  @ApiOperation({ summary: 'List patients' })
  listPatients(@CurrentUser() user: JwtPayload, @Query('q') search?: string) {
    return this.prescriptionsService.listPatients(user.tenantId, search);
  }

  @Post('patients')
  @ApiOperation({ summary: 'Create patient record' })
  createPatient(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.prescriptionsService.createPatient(user.tenantId, body);
  }

  // ── Doctors ────────────────────────────────────────────────────────────────

  @Get('doctors')
  @ApiOperation({ summary: 'List doctors' })
  listDoctors(@CurrentUser() user: JwtPayload, @Query('q') search?: string) {
    return this.prescriptionsService.listDoctors(user.tenantId, search);
  }

  @Post('doctors')
  @ApiOperation({ summary: 'Register a doctor' })
  createDoctor(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.prescriptionsService.createDoctor(user.tenantId, body);
  }

  @Put('doctors/:id')
  @ApiOperation({ summary: 'Update doctor details' })
  updateDoctor(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: any) {
    return this.prescriptionsService.updateDoctor(user.tenantId, id, body);
  }

  // ── Controlled Substance Log ───────────────────────────────────────────────

  @Get('controlled-log')
  @ApiOperation({ summary: 'Get controlled substance dispensing log' })
  getControlledLog(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.prescriptionsService.getControlledLog(
      user.tenantId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  // ── Prescriptions ──────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List prescriptions' })
  list(
    @CurrentUser() user: JwtPayload,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
  ) {
    return this.prescriptionsService.list(user.tenantId, customerId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get prescription details' })
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.prescriptionsService.get(user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create prescription' })
  create(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.prescriptionsService.create(user.tenantId, user.sub, body);
  }

  @Post(':id/dispense')
  @ApiOperation({ summary: 'Dispense prescription' })
  dispense(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: any) {
    return this.prescriptionsService.dispense(user.tenantId, id, body);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel prescription' })
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.prescriptionsService.cancel(user.tenantId, id);
  }
}
