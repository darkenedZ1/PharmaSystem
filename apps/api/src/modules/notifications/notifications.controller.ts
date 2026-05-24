import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { RequiresModule } from '../../common/decorators/requires-module.decorator';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequiresModule('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('log')
  @ApiOperation({ summary: 'Get notification delivery log' })
  getLogs(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.getLogs(user.tenantId);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List notification templates for tenant' })
  listTemplates(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.listTemplates(user.tenantId);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create a notification template' })
  createTemplate(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.notificationsService.createTemplate(user.tenantId, body);
  }

  @Put('templates/:id')
  @ApiOperation({ summary: 'Update a notification template' })
  updateTemplate(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.notificationsService.updateTemplate(user.tenantId, id, body);
  }

  @Post('send')
  @ApiOperation({ summary: 'Send a notification to a recipient' })
  sendNotification(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.notificationsService.sendNotification(user.tenantId, body);
  }
}
