'use client';

import Link from 'next/link';
import { useModules } from '@/hooks/use-modules';
import type { ModuleId } from '@pharmacy/shared';
import { MODULE_REGISTRY } from '@pharmacy/shared';
import { Lock } from 'lucide-react';

interface ModuleGateProps {
  moduleId: ModuleId;
  children: React.ReactNode;
}

/**
 * Wrap any page or component with this to show an upgrade prompt
 * when the tenant does not have the required module enabled.
 */
export function ModuleGate({ moduleId, children }: ModuleGateProps) {
  const { isEnabled } = useModules();

  if (isEnabled(moduleId)) return <>{children}</>;

  const mod = MODULE_REGISTRY[moduleId];

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
        <Lock size={24} className="text-gray-400" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-800">{mod?.name} Module</h2>
        <p className="mt-1 max-w-sm text-sm text-gray-500">{mod?.description}</p>
        {mod?.pricePKR ? (
          <p className="mt-2 text-sm font-medium text-blue-600">
            PKR {mod.pricePKR.toLocaleString()}/month
          </p>
        ) : null}
      </div>
      <Link href="/settings/modules" className="btn-primary">
        Enable this module
      </Link>
    </div>
  );
}
