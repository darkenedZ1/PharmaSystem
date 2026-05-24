'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { ShieldOff } from 'lucide-react';

interface Override {
  id: string;
  createdAt: string;
  productAName: string;
  productBName: string;
  severity: string;
  overrideReason: string;
  overriddenBy: string;
}

const SEVERITY_BADGE: Record<string, string> = {
  contraindicated: 'badge-red',
  major: 'badge-yellow',
  moderate: 'badge-yellow',
  minor: 'badge-gray',
};

export function OverridesContent() {
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiAvailable, setApiAvailable] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/drug-interactions/overrides')
      .then((res) => {
        setOverrides(Array.isArray(res.data) ? res.data : (res.data.overrides ?? []));
        setApiAvailable(true);
      })
      .catch((err) => {
        if (err?.response?.status === 404) {
          setApiAvailable(false);
        } else {
          toast.error('Failed to load override log');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Drug Interaction Override Log</h1>
        <p className="mt-1 text-sm text-gray-500">
          Record of pharmacist overrides for drug interaction alerts
        </p>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12 text-gray-400">Loading...</div>
      ) : !apiAvailable ? (
        <div className="card flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
          <ShieldOff size={48} />
          <p className="text-lg font-medium text-gray-500">No Override Records</p>
          <p className="text-sm text-gray-400 max-w-sm text-center">
            Override records will appear here when pharmacists override drug interaction alerts during dispensing.
          </p>
        </div>
      ) : overrides.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
          <ShieldOff size={40} />
          <p>No overrides recorded yet</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Product A</th>
                <th className="px-4 py-3">Product B</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Override Reason</th>
                <th className="px-4 py-3">Overridden By</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {overrides.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(o.createdAt).toLocaleDateString('en-PK')}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{o.productAName}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{o.productBName}</td>
                  <td className="px-4 py-3">
                    <span className={`capitalize ${SEVERITY_BADGE[o.severity] ?? 'badge-gray'}`}>
                      {o.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{o.overrideReason}</td>
                  <td className="px-4 py-3 text-gray-600">{o.overriddenBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
