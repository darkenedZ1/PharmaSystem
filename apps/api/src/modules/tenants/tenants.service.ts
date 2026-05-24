import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  MODULE_REGISTRY,
  resolveModuleDependencies,
  validateModuleSet,
  getModuleDependents,
  type ModuleId,
} from '@pharmacy/shared';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async getModules(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { enabledModules: true, planId: true },
    });

    const enabled = (tenant?.enabledModules ?? []) as ModuleId[];

    return Object.values(MODULE_REGISTRY).map((mod) => ({
      ...mod,
      isEnabled: enabled.includes(mod.id) || mod.isCore,
      canEnable: !mod.isCore,
      dependenciesMet: mod.dependencies.every((dep) => enabled.includes(dep)),
      dependents: getModuleDependents(mod.id),
    }));
  }

  async enableModule(tenantId: string, moduleId: ModuleId) {
    const mod = MODULE_REGISTRY[moduleId];
    if (!mod) throw new BadRequestException(`Unknown module: ${moduleId}`);
    if (mod.isCore) throw new BadRequestException('Core modules are always enabled');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const current = (tenant?.enabledModules ?? []) as ModuleId[];

    const withNew = [...new Set([...current, moduleId])];
    const resolved = resolveModuleDependencies(withNew);
    const errors = validateModuleSet(resolved);

    if (errors.length) throw new BadRequestException(errors.join('; '));

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { enabledModules: resolved },
    });

    return { enabledModules: resolved };
  }

  async getProfile(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, planId: true, enabledModules: true, settings: true },
    });
    if (!tenant) return null;
    const s = (tenant.settings as Record<string, any>) ?? {};
    return {
      id: tenant.id,
      name: tenant.name,
      planId: tenant.planId,
      enabledModules: tenant.enabledModules,
      email: s.email ?? null,
      phone: s.phone ?? null,
      address: s.address ?? null,
      city: s.city ?? null,
      ntn: s.ntn ?? null,
      strn: s.strn ?? null,
      currency: s.currency ?? 'PKR',
      timezone: s.timezone ?? 'Asia/Karachi',
      dateFormat: s.dateFormat ?? 'DD/MM/YYYY',
    };
  }

  async updateProfile(tenantId: string, dto: any) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const existing = (tenant?.settings as Record<string, any>) ?? {};
    const merged = {
      ...existing,
      email: dto.email ?? existing.email,
      phone: dto.phone ?? existing.phone,
      address: dto.address ?? existing.address,
      city: dto.city ?? existing.city,
      ntn: dto.ntn ?? existing.ntn,
      strn: dto.strn ?? existing.strn,
      currency: dto.currency ?? existing.currency ?? 'PKR',
      timezone: dto.timezone ?? existing.timezone ?? 'Asia/Karachi',
      dateFormat: dto.dateFormat ?? existing.dateFormat ?? 'DD/MM/YYYY',
    };
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { name: dto.name, settings: merged },
    });
    return { name: dto.name, ...merged };
  }

  async disableModule(tenantId: string, moduleId: ModuleId) {
    const mod = MODULE_REGISTRY[moduleId];
    if (!mod) throw new BadRequestException(`Unknown module: ${moduleId}`);
    if (mod.isCore) throw new BadRequestException('Core modules cannot be disabled');

    const dependents = getModuleDependents(moduleId);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const current = (tenant?.enabledModules ?? []) as ModuleId[];

    const activeDependents = dependents.filter((d) => current.includes(d));
    if (activeDependents.length) {
      const names = activeDependents.map((d) => MODULE_REGISTRY[d]?.name).join(', ');
      throw new BadRequestException(
        `Cannot disable "${mod.name}" — it is required by: ${names}. Disable those first.`,
      );
    }

    const updated = current.filter((id) => id !== moduleId);
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { enabledModules: updated },
    });

    return { enabledModules: updated };
  }
}
