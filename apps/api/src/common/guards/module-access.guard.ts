import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRES_MODULE_KEY } from '../decorators/requires-module.decorator';
import type { JwtPayload } from '../decorators/current-user.decorator';

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredModule = this.reflector.getAllAndOverride<string>(
      REQUIRES_MODULE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No module requirement — public or core route
    if (!requiredModule) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;

    if (!user) return false;

    const hasAccess = user.enabledModules.includes(requiredModule);
    if (!hasAccess) {
      throw new ForbiddenException(
        `Your plan does not include the "${requiredModule}" module. Upgrade to access this feature.`,
      );
    }

    return true;
  }
}
