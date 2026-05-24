import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { calculateIncomeTax } from '@pharmacy/shared';

interface CreateEmployeeDto {
  name: string;
  cnic?: string;
  designation?: string;
  department?: string;
  phone?: string;
  email?: string;
  dateOfJoining: string;
  basicSalary: number;
  salaryComponents?: Record<string, number>;
  branchId?: string;
  bankName?: string;
  bankAccount?: string;
  eobi?: boolean;
  sessi?: boolean;
}

interface AttendanceDto {
  employeeId: string;
  branchId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  isAbsent?: boolean;
  isLeave?: boolean;
  overtimeMinutes?: number;
  notes?: string;
}

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Employees ───────────────────────────────────────────────────────────────

  async listEmployees(tenantId: string, active = true) {
    return this.prisma.employee.findMany({
      where: { tenantId, ...(active && { isActive: true }) },
      orderBy: { name: 'asc' },
    });
  }

  async getEmployee(tenantId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, tenantId },
      include: {
        leaveBalances: true,
        attendanceRecords: { orderBy: { date: 'desc' }, take: 30 },
      },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async createEmployee(tenantId: string, dto: CreateEmployeeDto) {
    return this.prisma.employee.create({
      data: {
        tenantId,
        name: dto.name,
        cnic: dto.cnic,
        designation: dto.designation,
        department: dto.department,
        phone: dto.phone,
        email: dto.email,
        dateOfJoining: new Date(dto.dateOfJoining),
        basicSalary: dto.basicSalary,
        salaryComponents: dto.salaryComponents ?? {},
        branchId: dto.branchId,
        bankName: dto.bankName,
        bankAccount: dto.bankAccount,
        eobi: dto.eobi ?? false,
        sessi: dto.sessi ?? false,
      },
    });
  }

  async updateEmployee(tenantId: string, id: string, dto: Partial<CreateEmployeeDto>) {
    const existing = await this.prisma.employee.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Employee not found');
    return this.prisma.employee.update({
      where: { id },
      data: {
        ...dto,
        dateOfJoining: dto.dateOfJoining ? new Date(dto.dateOfJoining) : undefined,
      },
    });
  }

  async terminateEmployee(tenantId: string, id: string, dateOfLeaving: string) {
    const existing = await this.prisma.employee.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Employee not found');
    return this.prisma.employee.update({
      where: { id },
      data: { isActive: false, dateOfLeaving: new Date(dateOfLeaving) },
    });
  }

  // ── Attendance ──────────────────────────────────────────────────────────────

  async markAttendance(tenantId: string, dto: AttendanceDto) {
    return this.prisma.attendanceRecord.upsert({
      where: {
        tenantId_employeeId_date: {
          tenantId,
          employeeId: dto.employeeId,
          date: new Date(dto.date),
        },
      },
      create: {
        tenantId,
        employeeId: dto.employeeId,
        branchId: dto.branchId,
        date: new Date(dto.date),
        checkIn: dto.checkIn ? new Date(dto.checkIn) : undefined,
        checkOut: dto.checkOut ? new Date(dto.checkOut) : undefined,
        isAbsent: dto.isAbsent ?? false,
        isLeave: dto.isLeave ?? false,
        overtimeMinutes: dto.overtimeMinutes ?? 0,
        notes: dto.notes,
      },
      update: {
        checkIn: dto.checkIn ? new Date(dto.checkIn) : undefined,
        checkOut: dto.checkOut ? new Date(dto.checkOut) : undefined,
        isAbsent: dto.isAbsent,
        isLeave: dto.isLeave,
        overtimeMinutes: dto.overtimeMinutes,
        notes: dto.notes,
      },
    });
  }

  async getAttendance(tenantId: string, branchId: string, date: string) {
    return this.prisma.attendanceRecord.findMany({
      where: { tenantId, branchId, date: new Date(date) },
      include: { employee: { select: { name: true, designation: true } } },
    });
  }

  async getEmployeeAttendance(tenantId: string, employeeId: string, from: Date, to: Date) {
    return this.prisma.attendanceRecord.findMany({
      where: { tenantId, employeeId, date: { gte: from, lte: to } },
      orderBy: { date: 'asc' },
    });
  }

  // ── Payroll Run ─────────────────────────────────────────────────────────────

  async runPayroll(tenantId: string, userId: string, month: number, year: number) {
    const existing = await this.prisma.payrollRun.findUnique({
      where: { tenantId_month_year: { tenantId, month, year } },
    });
    if (existing && existing.status !== 'draft') {
      throw new BadRequestException('Payroll for this period is already processed');
    }

    const employees = await this.prisma.employee.findMany({
      where: { tenantId, isActive: true },
    });

    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0);
    const totalDays = periodEnd.getDate();

    const payrollItems = await Promise.all(
      employees.map(async (emp) => {
        const attendance = await this.prisma.attendanceRecord.findMany({
          where: {
            tenantId,
            employeeId: emp.id,
            date: { gte: periodStart, lte: periodEnd },
          },
        });

        const presentDays = attendance.filter((a) => !a.isAbsent && !a.isLeave).length;
        const overtimeMinutes = attendance.reduce((s, a) => s + a.overtimeMinutes, 0);
        const overtimeHours = overtimeMinutes / 60;

        const basicSalary = Number(emp.basicSalary);
        const components = emp.salaryComponents as Record<string, number>;
        const totalAllowances = Object.values(components).reduce((s, v) => s + v, 0);
        const grossPay = ((basicSalary + totalAllowances) / totalDays) * presentDays;

        const annualGross = grossPay * 12;
        const incomeTax = calculateIncomeTax(annualGross) / 12;
        const eobiDeduction = emp.eobi ? Math.min(basicSalary * 0.01, 250) : 0;

        const deductions = {
          incomeTax: Math.round(incomeTax),
          eobi: Math.round(eobiDeduction),
        };

        const totalDeductions = Object.values(deductions).reduce((s, v) => s + v, 0);
        const netPay = grossPay - totalDeductions;

        return {
          employeeId: emp.id,
          workingDays: totalDays,
          presentDays,
          overtimeHours,
          grossPay,
          allowances: components,
          deductions,
          netPay,
        };
      }),
    );

    return this.prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.payrollItem.deleteMany({ where: { payrollRunId: existing.id } });
        await tx.payrollRun.update({
          where: { id: existing.id },
          data: { processedById: userId, status: 'draft' },
        });

        for (const item of payrollItems) {
          await tx.payrollItem.create({ data: { payrollRunId: existing.id, ...item } });
        }

        return tx.payrollRun.findUnique({
          where: { id: existing.id },
          include: { items: { include: { employee: { select: { name: true, designation: true } } } } },
        });
      }

      return tx.payrollRun.create({
        data: {
          tenantId,
          month,
          year,
          processedById: userId,
          status: 'draft',
          items: { create: payrollItems },
        },
        include: { items: { include: { employee: { select: { name: true, designation: true } } } } },
      });
    });
  }

  async getPayrollRun(tenantId: string, month: number, year: number) {
    return this.prisma.payrollRun.findUnique({
      where: { tenantId_month_year: { tenantId, month, year } },
      include: {
        items: {
          include: { employee: { select: { name: true, designation: true, department: true } } },
        },
      },
    });
  }

  async approvePayroll(tenantId: string, month: number, year: number, userId: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { tenantId_month_year: { tenantId, month, year } },
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== 'draft') throw new BadRequestException('Only draft payroll can be approved');

    return this.prisma.payrollRun.update({
      where: { id: run.id },
      data: { status: 'approved', approvedById: userId },
    });
  }

  async listPayrollRuns(tenantId: string) {
    return this.prisma.payrollRun.findMany({
      where: { tenantId },
      select: { id: true, month: true, year: true, status: true, createdAt: true, paidAt: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }
}
