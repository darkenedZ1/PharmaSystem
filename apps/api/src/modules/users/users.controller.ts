import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async me(@CurrentUser() user: JwtPayload) {
    return this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { id: true, name: true, email: true, phone: true, branchAccess: true, roleId: true },
    });
  }

  @Get('roles')
  @ApiOperation({ summary: 'List all roles for tenant' })
  listRoles(@CurrentUser() user: JwtPayload) {
    return this.usersService.listRoles(user.tenantId);
  }

  @Post('roles')
  @ApiOperation({ summary: 'Create a new role' })
  createRole(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.usersService.createRole(user.tenantId, body);
  }

  @Get('branches')
  @ApiOperation({ summary: 'List all branches for tenant' })
  listBranches(@CurrentUser() user: JwtPayload) {
    return this.usersService.listBranches(user.tenantId);
  }

  @Post('branches')
  @ApiOperation({ summary: 'Create a new branch' })
  createBranch(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.usersService.createBranch(user.tenantId, body);
  }

  @Put('branches/:id')
  @ApiOperation({ summary: 'Update a branch' })
  updateBranch(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.usersService.updateBranch(user.tenantId, id, body);
  }

  @Get()
  @ApiOperation({ summary: 'List all users for tenant' })
  listUsers(@CurrentUser() user: JwtPayload) {
    return this.usersService.listUsers(user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Invite a new user' })
  inviteUser(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.usersService.inviteUser(user.tenantId, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a user' })
  updateUser(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.usersService.updateUser(user.tenantId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a user' })
  deactivateUser(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.usersService.deactivateUser(user.tenantId, id);
  }
}
