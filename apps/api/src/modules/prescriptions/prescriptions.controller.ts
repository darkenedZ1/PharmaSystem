import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
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

  // ── Patients ─────────────────────────────────────────────────────────────────

  @Get('patients')
  listPatients(@CurrentUser() user: JwtPayload, @Query('q') search?: string) {
    return this.prescriptionsService.listPatients(user.tenantId, search);
  }

  @Post('patients')
  createPatient(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.prescriptionsService.createPatient(user.tenantId, body);
  }

  // ── Prescriptions ─────────────────────────────────────────────────────────────

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
  ) {
    return this.prescriptionsService.list(user.tenantId, customerId, status);
  }

  @Get(':id')
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.prescriptionsService.get(user.tenantId, id);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.prescriptionsService.create(user.tenantId, user.sub, body);
  }

  @Post(':id/dispense')
  dispense(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: any) {
    return this.prescriptionsService.dispense(user.tenantId, id, body);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.prescriptionsService.cancel(user.tenantId, id);
  }

  // ── Doctors ─────────────────────────────────────────────────────────────────

  @Get('doctors')
  listDoctors(@CurrentUser() user: JwtPayload, @Query('q') search?: string) {
    return this.prescriptionsService.listDoctors(user.tenantId, search);
  }

  @Post('doctors')
  createDoctor(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.prescriptionsService.createDoctor(user.tenantId, body);
  }

  @Put('doctors/:id')
  updateDoctor(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: any) {
    return this.prescriptionsService.updateDoctor(user.tenantId, id, body);
  }
}
