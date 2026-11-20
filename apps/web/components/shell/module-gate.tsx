'use client';

import type { ModuleId } from '@pharmacy/shared';

interface ModuleGateProps {
  moduleId?: ModuleId;
  children: React.ReactNode;
}

/**
 * All modules unlocked. Renders content unconditionally.
 */
export function ModuleGate({ children }: ModuleGateProps) {
  return <>{children}</>;
}
