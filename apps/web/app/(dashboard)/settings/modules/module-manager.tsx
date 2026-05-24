'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { MODULE_REGISTRY, type ModuleId } from '@pharmacy/shared';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { Check, Lock, Puzzle, AlertTriangle } from 'lucide-react';

interface ModuleStatus {
  id: ModuleId;
  name: string;
  description: string;
  isEnabled: boolean;
  isCore: boolean;
  canEnable: boolean;
  dependenciesMet: boolean;
  dependents: ModuleId[];
  pricePKR: number;
  category: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  core: 'Core (Always On)',
  operations: 'Operations',
  clinical: 'Clinical',
  financial: 'Finance',
  compliance: 'Compliance',
  analytics: 'Analytics',
  engagement: 'Customer Engagement',
};

export function ModuleManager() {
  const [modules, setModules] = useState<ModuleStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = () => {
    api.get('/tenants/modules').then((r) => {
      setModules(r.data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const toggle = async (mod: ModuleStatus) => {
    if (mod.isCore) return;
    setToggling(mod.id);

    try {
      if (mod.isEnabled) {
        if (mod.dependents.length > 0) {
          const names = mod.dependents
            .map((d) => MODULE_REGISTRY[d]?.name)
            .filter(Boolean)
            .join(', ');
          toast.error(`Disable "${names}" first before disabling ${mod.name}`);
          return;
        }
        await api.delete(`/tenants/modules/${mod.id}/disable`);
        toast.success(`${mod.name} disabled`);
      } else {
        await api.post(`/tenants/modules/${mod.id}/enable`);
        toast.success(`${mod.name} enabled`);
      }
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to update module');
    } finally {
      setToggling(null);
    }
  };

  const grouped = modules.reduce(
    (acc, m) => {
      if (!acc[m.category]) acc[m.category] = [];
      acc[m.category]!.push(m);
      return acc;
    },
    {} as Record<string, ModuleStatus[]>,
  );

  const categoryOrder = ['core', 'operations', 'clinical', 'financial', 'compliance', 'analytics', 'engagement'];

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading modules…</div>;

  const monthlyCost = modules
    .filter((m) => m.isEnabled && !m.isCore)
    .reduce((s, m) => s + m.pricePKR, 0);

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Module Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Enable or disable modules to tailor the system to your needs.
            Dependencies are resolved automatically.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Active module cost</p>
          <p className="text-lg font-bold text-blue-600">
            PKR {monthlyCost.toLocaleString()}/mo
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {categoryOrder.map((cat) => {
          const mods = grouped[cat];
          if (!mods?.length) return null;

          return (
            <section key={cat}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
                <Puzzle size={14} />
                {CATEGORY_LABELS[cat] ?? cat}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {mods.map((mod) => (
                  <div
                    key={mod.id}
                    className={clsx(
                      'card cursor-pointer transition-all',
                      mod.isEnabled && !mod.isCore && 'ring-2 ring-blue-200',
                      mod.isCore && 'opacity-80',
                    )}
                    onClick={() => !mod.isCore && toggle(mod)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={clsx(
                          'mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-sm',
                          mod.isEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400',
                        )}
                      >
                        {mod.isCore ? <Lock size={16} /> : mod.isEnabled ? <Check size={16} /> : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-800">{mod.name}</p>
                          {mod.isCore && <span className="badge-gray">Always on</span>}
                          {!mod.isCore && mod.isEnabled && <span className="badge-blue">Active</span>}
                          {!mod.dependenciesMet && !mod.isEnabled && (
                            <span className="badge-yellow flex items-center gap-1">
                              <AlertTriangle size={10} /> Deps missing
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{mod.description}</p>
                        {!mod.isCore && (
                          <p className="mt-1 text-xs font-medium text-gray-400">
                            {mod.pricePKR > 0 ? `PKR ${mod.pricePKR.toLocaleString()}/mo` : 'Included'}
                          </p>
                        )}
                      </div>
                      {toggling === mod.id && (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
