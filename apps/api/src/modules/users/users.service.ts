import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        roleId: true,
        branchAccess: true,
        role: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async listRoles(tenantId: string) {
    return this.prisma.role.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async createRole(tenantId: string, dto: any) {
    return this.prisma.role.create({
      data: {
        tenantId,
        name: dto.name,
        permissions: dto.permissions ?? {},
        isSystem: false,
      },
    });
  }

  async inviteUser(tenantId: string, dto: any) {
    const tempPassword = 'ChangeMe@123';
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        roleId: dto.roleId,
        branchAccess: dto.branchId ? [dto.branchId] : [],
        passwordHash,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        roleId: true,
        branchAccess: true,
        isActive: true,
        createdAt: true,
        role: { select: { name: true } },
      },
    });

    return user;
  }

  async updateUser(tenantId: string, id: string, dto: any) {
    const user = await this.prisma.user.findFirst({
      where: { tenantId, id },
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        roleId: dto.roleId,
        branchAccess: dto.branchAccess,
        isActive: dto.isActive,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        roleId: true,
        branchAccess: true,
        isActive: true,
        role: { select: { name: true } },
      },
    });
  }

  async deactivateUser(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { tenantId, id },
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, name: true, isActive: true },
    });
  }

  async listBranches(tenantId: string) {
    return this.prisma.branch.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async createBranch(tenantId: string, dto: any) {
    return this.prisma.branch.create({
      data: {
        tenantId,
        name: dto.name,
        address: dto.address,
        phone: dto.phone,
        fbrPosId: dto.fbrPosId,
        isActive: true,
      },
    });
  }

  async updateBranch(tenantId: string, id: string, dto: any) {
    const branch = await this.prisma.branch.findFirst({
      where: { tenantId, id },
    });

    if (!branch) {
      throw new NotFoundException(`Branch ${id} not found`);
    }

    return this.prisma.branch.update({
      where: { id },
      data: {
        name: dto.name,
        address: dto.address,
        phone: dto.phone,
        fbrPosId: dto.fbrPosId,
        isActive: dto.isActive,
      },
    });
  }
}
