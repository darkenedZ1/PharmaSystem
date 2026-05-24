'use client';

import { useAuthStore } from '@/stores/auth.store';
import { MODULE_REGISTRY, type ModuleId } from '@pharmacy/shared';

export function useModules() {
  const enabledModules = useAuthStore((s) => s.user?.enabledModules ?? []);

  const isEnabled = (moduleId: ModuleId) =>
    MODULE_REGISTRY[moduleId]?.isCore || enabledModules.includes(moduleId);

  const enabledModulesList = Object.values(MODULE_REGISTRY).filter(
    (m) => m.isCore || enabledModules.includes(m.id),
  );

  return { isEnabled, enabledModules: enabledModulesList };
}
