import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { RequiresModule } from '../../common/decorators/requires-module.decorator';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
import { PayrollService } from './payroll.service';

// Pakistan FBR income tax slabs (FY 2024-25, salaried individual)
function calculateIncomeTax(annualIncome: number): number {
  if (annualIncome <= 600_000) return 0;
  if (annualIncome <= 1_200_000) return (annualIncome - 600_000) * 0.05;
  if (annualIncome <= 2_200_000) return 30_000 + (annualIncome - 1_200_000) * 0.15;
  if (annualIncome <= 3_200_000) return 180_000 + (annualIncome - 2_200_000) * 0.25;
  if (annualIncome <= 4_100_000) return 430_000 + (annualIncome - 3_200_000) * 0.30;
  return 700_000 + (annualIncome - 4_100_000) * 0.35;
}

@ApiTags('Payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequiresModule('payroll')
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  // ── Employees ───────────────────────────────────────────────────────────────

  @Get('employees')
  listEmployees(@CurrentUser() user: JwtPayload) {
    return this.payrollService.listEmployees(user.tenantId);
  }

  @Get('employees/:id')
  getEmployee(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.payrollService.getEmployee(user.tenantId, id);
  }

  @Post('employees')
  createEmployee(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.payrollService.createEmployee(user.tenantId, body);
  }

  @Put('employees/:id')
  updateEmployee(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: any) {
    return this.payrollService.updateEmployee(user.tenantId, id, body);
  }

  @Post('employees/:id/terminate')
  terminateEmployee(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: { dateOfLeaving: string }) {
    return this.payrollService.terminateEmployee(user.tenantId, id, body.dateOfLeaving);
  }

  // ── Attendance ──────────────────────────────────────────────────────────────

  @Post('attendance')
  markAttendance(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.payrollService.markAttendance(user.tenantId, body);
  }

  @Get('attendance')
  getAttendance(
    @CurrentUser() user: JwtPayload,
    @Query('branchId') branchId: string,
    @Query('date') date: string,
  ) {
    return this.payrollService.getAttendance(user.tenantId, branchId, date || new Date().toISOString().slice(0, 10));
  }

  @Get('attendance/:employeeId')
  getEmployeeAttendance(
    @CurrentUser() user: JwtPayload,
    @Param('employeeId') employeeId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();
    return this.payrollService.getEmployeeAttendance(user.tenantId, employeeId, fromDate, toDate);
  }

  // ── Payroll Runs ────────────────────────────────────────────────────────────

  @Get('payslips')
  getPayslips(
    @CurrentUser() user: JwtPayload,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const now = new Date();
    const m = month ? Number(month) : now.getMonth() === 0 ? 12 : now.getMonth();
    const y = year ? Number(year) : now.getFullYear();
    return this.payrollService.getPayslips(user.tenantId, m, y);
  }

  @Get('runs')
  listPayrollRuns(@CurrentUser() user: JwtPayload) {
    return this.payrollService.listPayrollRuns(user.tenantId);
  }

  @Get('runs/:year/:month')
  getPayrollRun(
    @CurrentUser() user: JwtPayload,
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    return this.payrollService.getPayrollRun(user.tenantId, Number(month), Number(year));
  }

  @Post('runs/process')
  runPayroll(
    @CurrentUser() user: JwtPayload,
    @Body() body: { month: number; year: number },
  ) {
    return this.payrollService.runPayroll(user.tenantId, user.sub, body.month, body.year);
  }

  @Post('runs/:year/:month/approve')
  approvePayroll(
    @CurrentUser() user: JwtPayload,
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    return this.payrollService.approvePayroll(user.tenantId, Number(month), Number(year), user.sub);
  }

  // Tax preview (existing endpoint kept)
  @Get('tax-preview')
  async getTaxPreview(@CurrentUser() user: JwtPayload) {
    const employees = await this.payrollService.listEmployees(user.tenantId);
    return employees.map((e) => {
      const annualSalary = Number(e.basicSalary) * 12;
      const annualTax = calculateIncomeTax(annualSalary);
      return { id: e.id, name: e.name, designation: e.designation, annualSalary, annualTax, monthlyTax: Math.round(annualTax / 12) };
    });
  }

  // Leave Management
  @Get('leave')
  listLeaves(@CurrentUser() user: JwtPayload) {
    return this.payrollService.listLeaves(user.tenantId);
  }

  @Post('leave')
  createLeave(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.payrollService.createLeave(user.tenantId, body);
  }

  @Post('leave/:id/:action')
  updateLeaveStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('action') action: 'approved' | 'rejected',
  ) {
    return this.payrollService.updateLeaveStatus(user.tenantId, id, action);
  }
}
