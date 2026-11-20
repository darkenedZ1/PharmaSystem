import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import {
  MODULE_REGISTRY,
  resolveModuleDependencies,
  PRESET_PLANS,
  type ModuleId,
} from '@pharmacy/shared';
import type { RegisterTenantDto, LoginDto } from '@pharmacy/shared';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async registerTenant(dto: RegisterTenantDto) {
    const exists = await this.prisma.tenant.findFirst({
      where: { users: { some: { email: dto.email } } },
    });
    if (exists) throw new ConflictException('Email already registered');

    const plan = PRESET_PLANS[dto.planId];
    const modules = resolveModuleDependencies(plan.modules as ModuleId[]);
    const subdomain = dto.tenantName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const tenant = await this.prisma.$transaction(async (tx) => {
      const t = await tx.tenant.create({
        data: {
          name: dto.tenantName,
          subdomain: `${subdomain}-${Date.now()}`,
          planId: dto.planId,
          enabledModules: modules,
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      });

      const branch = await tx.branch.create({
        data: { tenantId: t.id, name: 'Main Branch' },
      });

      const role = await tx.role.create({
        data: {
          tenantId: t.id,
          name: 'Admin',
          isSystem: true,
          permissions: [{ action: 'manage', resource: '*' }],
        },
      });

      await tx.user.create({
        data: {
          tenantId: t.id,
          branchId: branch.id,
          email: dto.email,
          name: dto.tenantName,
          phone: dto.phone,
          passwordHash,
          roleId: role.id,
        },
      });

      // Seed default chart of accounts
      await this.seedDefaultAccounts(tx, t.id);

      return t;
    });

    return { message: 'Account created. 14-day free trial started.', tenantId: tenant.id };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, isActive: true },
      include: { tenant: true, role: true },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.tenant.status === 'suspended') {
      throw new UnauthorizedException('Account suspended. Contact support.');
    }

    const allModules = Object.keys(MODULE_REGISTRY) as ModuleId[];
    const tokens = await this.generateTokens(user, allModules);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roleId: user.roleId,
        tenantId: user.tenantId,
        enabledModules: allModules,
      },
    };
  }

  async refreshTokens(refreshToken: string) {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: await this.hashToken(refreshToken) },
      include: { user: { include: { tenant: true } } },
    });

    if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotate: revoke old, issue new
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    const allModules = Object.keys(MODULE_REGISTRY) as ModuleId[];
    return this.generateTokens(
      tokenRecord.user,
      allModules,
    );
  }

  private async generateTokens(user: { id: string; email: string; tenantId: string; roleId: string }, enabledModules: ModuleId[]) {
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roleId: user.roleId,
      enabledModules,
    };

    const accessToken = this.jwt.sign(payload, { expiresIn: '15m' });
    const refreshToken = crypto.randomUUID();

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: await this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  private async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Buffer.from(hash).toString('hex');
  }

  private async seedDefaultAccounts(tx: any, tenantId: string) {
    const accounts = [
      { code: '1000', name: 'Cash in Hand', accountType: 'asset' },
      { code: '1100', name: 'Bank Account', accountType: 'asset' },
      { code: '1200', name: 'Accounts Receivable', accountType: 'asset' },
      { code: '1300', name: 'Inventory', accountType: 'asset' },
      { code: '2000', name: 'Accounts Payable', accountType: 'liability' },
      { code: '2100', name: 'Sales Tax Payable', accountType: 'liability' },
      { code: '3000', name: 'Owner Equity', accountType: 'equity' },
      { code: '4000', name: 'Sales Revenue', accountType: 'revenue' },
      { code: '4100', name: 'Other Income', accountType: 'revenue' },
      { code: '5000', name: 'Cost of Goods Sold', accountType: 'expense' },
      { code: '5100', name: 'Salary Expense', accountType: 'expense' },
      { code: '5200', name: 'Rent Expense', accountType: 'expense' },
      { code: '5300', name: 'Utilities', accountType: 'expense' },
    ];

    await tx.account.createMany({
      data: accounts.map((a) => ({ ...a, tenantId, isSystem: true })),
    });
  }
}
