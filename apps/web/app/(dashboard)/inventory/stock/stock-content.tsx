'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Layers, AlertTriangle } from 'lucide-react';

interface StockLevel {
  id: string;
  quantity: number;
  batchNumber?: string;
  expiryDate?: string;
  branch?: { id: string; name: string };
  product: {
    id: string;
    name: string;
    genericName?: string;
    reorderPoint?: number;
  };
}

export function StockContent() {
  const [stock, setStock] = useState<StockLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchId, setBranchId] = useState('');

  const load = (bid: string) => {
    setLoading(true);
    api
      .get('/inventory/stock', { params: bid ? { branchId: bid } : {} })
      .then((r) => {
        const sorted = [...r.data].sort((a, b) => a.quantity - b.quantity);
        setStock(sorted);
      })
      .catch(() => toast.error('Failed to load stock levels'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(branchId); }, [branchId]);

  const quantityClass = (level: StockLevel) => {
    if (level.quantity === 0) return 'text-red-600 font-bold';
    if (level.product.reorderPoint && level.quantity <= level.product.reorderPoint)
      return 'text-yellow-600 font-semibold';
    return 'text-gray-700';
  };

  const lowCount = stock.filter(
    (s) => s.quantity === 0 || (s.product.reorderPoint && s.quantity <= s.product.reorderPoint),
  ).length;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers size={22} className="text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">Stock Levels</h1>
        </div>
        <select
          className="input max-w-[200px]"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
        >
          <option value="">All Branches</option>
        </select>
      </div>

      {!loading && lowCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <AlertTriangle size={16} className="text-yellow-500 shrink-0" />
          <span>
            <strong>{lowCount}</strong> batch{lowCount > 1 ? 'es are' : ' is'} at or below reorder point
          </span>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Product Name</th>
              <th className="px-4 py-3 text-left">Generic Name</th>
              <th className="px-4 py-3 text-left">Batch #</th>
              <th className="px-4 py-3 text-left">Expiry Date</th>
              <th className="px-4 py-3 text-left">Branch</th>
              <th className="px-4 py-3 text-right">Quantity</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : stock.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm text-gray-400">
                  No stock records found
                </td>
              </tr>
            ) : (
              stock.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{s.product.name}</td>
                  <td className="px-4 py-3 text-gray-500">{s.product.genericName ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-gray-600">{s.batchNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {s.expiryDate
                      ? new Date(s.expiryDate).toLocaleDateString('en-PK')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.branch?.name ?? '—'}</td>
                  <td className={`px-4 py-3 text-right font-mono ${quantityClass(s)}`}>
                    {s.quantity}
                    {s.quantity === 0 && (
                      <span className="ml-2 badge badge-red">Out</span>
                    )}
                    {s.quantity > 0 &&
                      s.product.reorderPoint &&
                      s.quantity <= s.product.reorderPoint && (
                        <span className="ml-2 badge badge-yellow">Low</span>
                      )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
