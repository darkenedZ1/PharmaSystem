import { SetMetadata } from '@nestjs/common';
import type { ModuleId } from '@pharmacy/shared';

export const REQUIRES_MODULE_KEY = 'requires_module';
export const RequiresModule = (moduleId: ModuleId) =>
  SetMetadata(REQUIRES_MODULE_KEY, moduleId);
