'use client';

import { MODULE_REGISTRY, type ModuleId } from '@pharmacy/shared';

export function useModules() {
  // All modules unlocked
  const isEnabled = (_moduleId?: ModuleId) => true;
  const enabledModulesList = Object.values(MODULE_REGISTRY);

  return { isEnabled, enabledModules: enabledModulesList };
}
