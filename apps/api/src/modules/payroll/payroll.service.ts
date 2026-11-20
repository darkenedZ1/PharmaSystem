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
          include: { employee: true },
        },
      },
    });
  }

  async getPayslips(tenantId: string, month: number, year: number) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { tenantId_month_year: { tenantId, month, year } },
      include: {
        items: {
          include: { employee: true },
        },
      },
    });

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, settings: true },
    });

    const branch = await this.prisma.branch.findFirst({
      where: { tenantId, isActive: true },
    });

    if (!run) {
      const employees = await this.prisma.employee.findMany({
        where: { tenantId, isActive: true },
        orderBy: { name: 'asc' },
      });

      const monthNames = [
        '', 'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];

      const projectedPayslips = employees.map((emp) => {
        const basicSalary = Number(emp.basicSalary) || 45000;
        const houseRent = Math.round(basicSalary * 0.45);
        const medical = Math.round(basicSalary * 0.10);
        const conveyance = 5000;
        const grossPay = basicSalary + houseRent + medical + conveyance;
        const eobi = 1200;
        const incomeTax = grossPay > 100000 ? Math.round((grossPay - 100000) * 0.15) : 0;
        const totalDeductions = eobi + incomeTax;
        const netPay = grossPay - totalDeductions;

        return {
          id: `proj-${emp.id}`,
          payrollRunId: 'projected',
          employeeId: emp.id,
          employeeName: emp.name,
          designation: emp.designation,
          department: emp.department || 'Pharmacy Operations',
          cnic: emp.cnic || '35202-*******-*',
          phone: emp.phone,
          email: emp.email,
          dateOfJoining: emp.dateOfJoining,
          bankName: emp.bankName || 'Meezan Bank Ltd',
          bankAccountNo: emp.bankAccount || '0102-********',
          period: `${monthNames[month] || 'Current'} ${year}`,
          month,
          year,
          workingDays: 26,
          presentDays: 26,
          overtimeHours: 0,
          basicSalary,
          allowances: { houseRent, medical, conveyance, bonus: 0 },
          deductions: { incomeTax, eobi, sessi: 0, lateDeductions: 0, advanceLoan: 0 },
          grossPay,
          totalDeductions,
          netPay,
          bankTransferRef: `FT-${emp.id.slice(0, 8).toUpperCase()}`,
          isPaid: false,
          runStatus: 'projected',
        };
      });

      return {
        tenant: {
          name: tenant?.name || 'SmartBiz Pharmacy',
          ntn: (tenant?.settings as any)?.ntn || '1234567-8',
          branch: branch?.name || 'Main Branch',
          address: branch?.address || 'Pakistan',
        },
        month,
        year,
        runStatus: projectedPayslips.length > 0 ? 'projected' : null,
        payslips: projectedPayslips,
      };
    }

    const monthNames = [
      '', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const payslips = run.items.map((item) => {
      const emp = item.employee;
      const allowances = (item.allowances as Record<string, number>) || {};
      const deductions = (item.deductions as Record<string, number>) || {};

      const basicSalary = Number(emp.basicSalary) || 0;
      const grossPay = Number(item.grossPay);
      const netPay = Number(item.netPay);
      const totalDeductions = Object.values(deductions).reduce((s, v) => s + Number(v), 0);

      return {
        id: item.id,
        payrollRunId: run.id,
        employeeId: emp.id,
        employeeName: emp.name,
        designation: emp.designation,
        department: emp.department || 'Pharmacy Operations',
        cnic: emp.cnic || '35202-*******-*',
        phone: emp.phone,
        email: emp.email,
        dateOfJoining: emp.dateOfJoining,
        bankName: emp.bankName || 'Meezan Bank Ltd',
        bankAccountNo: emp.bankAccount || '0102-********',
        period: `${monthNames[month]} ${year}`,
        month,
        year,
        workingDays: item.workingDays,
        presentDays: item.presentDays,
        overtimeHours: Number(item.overtimeHours) || 0,
        basicSalary,
        allowances: {
          houseRent: Number(allowances.houseRent) || Math.round(basicSalary * 0.45),
          medical: Number(allowances.medical) || Math.round(basicSalary * 0.10),
          conveyance: Number(allowances.conveyance) || 5000,
          bonus: Number(allowances.bonus) || 0,
          ...allowances,
        },
        deductions: {
          incomeTax: Number(deductions.incomeTax) || 0,
          eobi: Number(deductions.eobi) || 1200,
          sessi: Number(deductions.sessi) || 0,
          lateDeductions: Number(deductions.lateDeductions) || 0,
          advanceLoan: Number(deductions.advanceLoan) || 0,
          ...deductions,
        },
        grossPay,
        totalDeductions,
        netPay,
        bankTransferRef: item.bankTransferRef || `FT-${item.id.slice(0, 8).toUpperCase()}`,
        isPaid: item.isPaid,
        runStatus: run.status,
      };
    });

    return {
      tenant: {
        name: tenant?.name || 'SmartBiz Pharmacy',
        ntn: (tenant?.settings as any)?.ntn || '1234567-8',
        branch: branch?.name || 'Main Branch',
        address: branch?.address || 'Main Commercial Area, Lahore / Karachi, Pakistan',
      },
      month,
      year,
      runStatus: run.status,
      payslips,
    };
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

  async listLeaves(tenantId: string) {
    const leaves = await this.prisma.leaveApplication.findMany({
      where: { tenantId },
      include: { employee: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return leaves.map((l) => ({
      id: l.id,
      employeeId: l.employeeId,
      employeeName: l.employee?.name ?? 'Unknown',
      leaveType: l.leaveType,
      fromDate: l.fromDate.toISOString().slice(0, 10),
      toDate: l.toDate.toISOString().slice(0, 10),
      days: l.days,
      status: l.status,
      reason: l.reason ?? '',
    }));
  }

  async createLeave(tenantId: string, body: any) {
    const from = new Date(body.fromDate);
    const to = new Date(body.toDate);
    const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    return this.prisma.leaveApplication.create({
      data: {
        tenantId,
        employeeId: body.employeeId,
        leaveType: body.leaveType,
        fromDate: from,
        toDate: to,
        days,
        reason: body.reason,
        status: 'pending',
      },
    });
  }

  async updateLeaveStatus(tenantId: string, id: string, status: string) {
    return this.prisma.leaveApplication.update({
      where: { id },
      data: { status },
    });
  }
}
