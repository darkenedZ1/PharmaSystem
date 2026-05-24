'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, FileText } from 'lucide-react';

interface Prescription {
  id: string;
  status: string;
  issueDate: string;
  expiryDate: string | null;
  diagnosis: string | null;
  customer: { name: string; phone: string | null };
  doctor: { name: string; pmdcNumber: string | null } | null;
  items: { id: string; qtyPrescribed: number; qtyDispensed: number; instructions: string | null; isControlled: boolean }[];
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'badge-yellow',
  partial: 'badge-blue',
  filled: 'badge-green',
  expired: 'badge-gray',
  cancelled: 'badge-red',
};

export function PrescriptionsContent() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Prescription | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/prescriptions', { params: { ...(statusFilter && { status: statusFilter }) } });
      setPrescriptions(res.data);
    } catch {
      toast.error('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const dispenseAll = async (rx: Prescription) => {
    try {
      await api.post(`/prescriptions/${rx.id}/dispense`, {
        items: rx.items.map((i) => ({
          prescriptionItemId: i.id,
          qtyDispensed: i.qtyPrescribed - i.qtyDispensed,
        })).filter((i) => i.qtyDispensed > 0),
      });
      toast.success('Prescription dispensed');
      load();
      setSelected(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Dispense failed');
    }
  };

  const cancel = async (id: string) => {
    try {
      await api.post(`/prescriptions/${id}/cancel`);
      toast.success('Prescription cancelled');
      load();
      setSelected(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Cancel failed');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
          <p className="mt-1 text-sm text-gray-500">{prescriptions.length} prescriptions</p>
        </div>
        <div className="flex gap-2">
          <select className="input w-40 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="filled">Filled</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12 text-gray-400">Loading...</div>
      ) : prescriptions.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
          <FileText size={40} />
          <p>No prescriptions found</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Issue Date</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {prescriptions.map((rx) => (
                <tr key={rx.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{rx.customer.name}</p>
                    <p className="text-xs text-gray-400">{rx.customer.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{rx.doctor?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(rx.issueDate).toLocaleDateString('en-PK')}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {rx.items.length} items
                    {rx.items.some((i) => i.isControlled) && (
                      <span className="ml-1 badge-red text-[10px]">controlled</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={STATUS_BADGE[rx.status] ?? 'badge-gray'}>{rx.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelected(rx)} className="text-xs text-blue-600 hover:underline">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold">{selected.customer.name}</h2>
                <p className="text-sm text-gray-500">{selected.doctor?.name ?? 'No doctor'} · {new Date(selected.issueDate).toLocaleDateString('en-PK')}</p>
                {selected.diagnosis && <p className="mt-1 text-xs text-gray-400">Diagnosis: {selected.diagnosis}</p>}
              </div>
              <span className={STATUS_BADGE[selected.status] ?? 'badge-gray'}>{selected.status}</span>
            </div>

            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs text-gray-500">
                <tr>
                  <th className="pb-2">Item</th>
                  <th className="pb-2 text-right">Prescribed</th>
                  <th className="pb-2 text-right">Dispensed</th>
                  <th className="pb-2 text-right">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {selected.items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2">
                      Item {i + 1}
                      {item.isControlled && <span className="ml-1 badge-red text-[10px]">controlled</span>}
                      {item.instructions && <p className="text-xs text-gray-400">{item.instructions}</p>}
                    </td>
                    <td className="py-2 text-right">{item.qtyPrescribed}</td>
                    <td className="py-2 text-right text-green-600">{item.qtyDispensed}</td>
                    <td className="py-2 text-right font-medium">{item.qtyPrescribed - item.qtyDispensed}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setSelected(null)} className="btn-ghost">Close</button>
              {['pending', 'partial'].includes(selected.status) && (
                <>
                  <button onClick={() => cancel(selected.id)} className="btn-ghost text-red-500">Cancel Rx</button>
                  <button onClick={() => dispenseAll(selected)} className="btn-primary">Dispense All</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
