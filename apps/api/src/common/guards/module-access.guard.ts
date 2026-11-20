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
  canActivate(): boolean {
    return true;
  }
}
