'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

interface ExpiryItem {
  id: string;
  batchNumber?: string;
  expiryDate: string;
  quantity: number;
  branch?: { name: string };
  product: {
    name: string;
    genericName?: string;
  };
}

const DAY_OPTIONS = [30, 60, 90] as const;

export function ExpiryContent() {
  const [items, setItems] = useState<ExpiryItem[]>([]);
  const [days, setDays] = useState<30 | 60 | 90>(90);
  const [loading, setLoading] = useState(true);

  const load = (d: number) => {
    setLoading(true);
    api
      .get('/inventory/expiry', { params: { days: d } })
      .then((r) => setItems(r.data))
      .catch(() => toast.error('Failed to load expiry data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(days); }, [days]);

  const daysLeft = (expiryDate: string) =>
    Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const rowClass = (d: number) => {
    if (d < 30) return 'bg-red-50';
    if (d < 60) return 'bg-yellow-50';
    return '';
  };

  const daysClass = (d: number) => {
    if (d < 30) return 'badge-red';
    if (d < 60) return 'badge-yellow';
    return 'badge-blue';
  };

  const critical = items.filter((i) => daysLeft(i.expiryDate) < 30).length;
  const warning = items.filter((i) => {
    const d = daysLeft(i.expiryDate);
    return d >= 30 && d < 60;
  }).length;
  const ok = items.filter((i) => daysLeft(i.expiryDate) >= 60).length;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle size={22} className="text-orange-500" />
          <h1 className="text-xl font-bold text-gray-900">Near Expiry</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Show next</span>
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                days === d
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="card p-4 text-center border-red-200">
          <p className="text-2xl font-bold text-red-600">{critical}</p>
          <p className="mt-1 text-xs text-gray-500">Critical (&lt; 30 days)</p>
        </div>
        <div className="card p-4 text-center border-yellow-200">
          <p className="text-2xl font-bold text-yellow-600">{warning}</p>
          <p className="mt-1 text-xs text-gray-500">Warning (30–60 days)</p>
        </div>
        <div className="card p-4 text-center border-blue-200">
          <p className="text-2xl font-bold text-blue-600">{ok}</p>
          <p className="mt-1 text-xs text-gray-500">Approaching (60–{days} days)</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-left">Generic</th>
              <th className="px-4 py-3 text-left">Batch #</th>
              <th className="px-4 py-3 text-left">Expiry Date</th>
              <th className="px-4 py-3 text-right">Days Left</th>
              <th className="px-4 py-3 text-left">Branch</th>
              <th className="px-4 py-3 text-right">Qty</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-gray-400">Loading…</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-gray-400">
                  No items expiring within {days} days
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const dl = daysLeft(item.expiryDate);
                return (
                  <tr key={item.id} className={`${rowClass(dl)} hover:brightness-95 transition-all`}>
                    <td className="px-4 py-3 font-medium text-gray-800">{item.product.name}</td>
                    <td className="px-4 py-3 text-gray-500">{item.product.genericName ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-gray-600">{item.batchNumber ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(item.expiryDate).toLocaleDateString('en-PK')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`badge ${daysClass(dl)}`}>{dl} days</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.branch?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{item.quantity}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
