'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { RotateCcw, Filter } from 'lucide-react';

interface Sale {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  createdAt: string;
  customer?: { name: string; phone: string | null } | null;
  items?: any[];
}

const STATUS_BADGE: Record<string, string> = {
  completed: 'badge-green',
  voided: 'badge-red',
  pending: 'badge-yellow',
  refunded: 'badge-gray',
};

const pkr = (n: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

const today = new Date().toISOString().slice(0, 10);

export function ReturnsContent() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [statusFilter, setStatusFilter] = useState('completed');
  const [voidTarget, setVoidTarget] = useState<Sale | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/pos/sales', { params: { from, to } });
      setSales(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load sales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [from, to]);

  const voidSale = async () => {
    if (!voidTarget) return;
    if (!voidReason.trim()) { toast.error('Reason is required'); return; }
    setVoiding(true);
    try {
      await api.post(`/pos/sales/${voidTarget.id}/void`, { reason: voidReason });
      toast.success(`Sale ${voidTarget.invoiceNumber} voided`);
      setVoidTarget(null);
      setVoidReason('');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Void failed');
    } finally {
      setVoiding(false);
    }
  };

  const filtered = statusFilter
    ? sales.filter((s) => s.status === statusFilter)
    : sales;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Returns & Void</h1>
          <p className="mt-1 text-sm text-gray-500">{filtered.length} sales</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Filter size={14} />
          <span>Date:</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="input w-40 text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            className="input w-40 text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <select
          className="input w-40 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="voided">Voided</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12 text-gray-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
          <RotateCcw size={40} />
          <p>No sales found for the selected period</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">
                    {sale.invoiceNumber ?? sale.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{sale.customer?.name ?? 'Walk-in'}</p>
                    {sale.customer?.phone && (
                      <p className="text-xs text-gray-400">{sale.customer.phone}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(sale.createdAt).toLocaleDateString('en-PK')}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{pkr(Number(sale.total))}</td>
                  <td className="px-4 py-3">
                    <span className={STATUS_BADGE[sale.status] ?? 'badge-gray'}>{sale.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {sale.status === 'completed' && (
                      <button
                        onClick={() => { setVoidTarget(sale); setVoidReason(''); }}
                        className="flex items-center gap-1 text-xs text-red-600 hover:underline"
                      >
                        <RotateCcw size={12} /> Void
                      </button>
                    )}
                    {sale.status === 'voided' && (
                      <span className="text-xs text-gray-400">Already voided</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Void Confirmation Modal */}
      {voidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-bold text-gray-900">Void Sale</h2>
            <p className="mb-4 text-sm text-gray-500">
              You are voiding invoice{' '}
              <span className="font-mono font-semibold text-gray-800">
                {voidTarget.invoiceNumber ?? voidTarget.id.slice(0, 8).toUpperCase()}
              </span>{' '}
              — {pkr(Number(voidTarget.total))}. This action cannot be undone.
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Reason for Void *</label>
              <textarea
                className="input"
                rows={3}
                placeholder="Enter reason for voiding this sale..."
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setVoidTarget(null)} className="btn-ghost">Cancel</button>
              <button
                onClick={voidSale}
                disabled={voiding}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {voiding ? 'Voiding…' : 'Confirm Void'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
