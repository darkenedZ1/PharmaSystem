'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Bike, X } from 'lucide-react';

interface Rider {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  vehicleNumber: string | null;
  isActive: boolean;
  totalDeliveries?: number;
}

const VEHICLE_TYPES = ['Motorcycle', 'Bicycle', 'Car', 'Walk'];

const EMPTY_FORM = { name: '', phone: '', vehicleType: 'Motorcycle', vehicleNumber: '' };

export function RidersContent() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Rider | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/delivery/riders');
      setRiders(Array.isArray(res.data) ? res.data : (res.data.riders ?? []));
    } catch {
      toast.error('Failed to load riders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (r: Rider) => {
    setEditing(r);
    setForm({
      name: r.name,
      phone: r.phone,
      vehicleType: r.vehicleType,
      vehicleNumber: r.vehicleNumber ?? '',
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.phone.trim()) { toast.error('Phone is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/delivery/riders/${editing.id}`, form);
        toast.success('Rider updated');
      } else {
        await api.post('/delivery/riders', form);
        toast.success('Rider added');
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (r: Rider) => {
    try {
      await api.put(`/delivery/riders/${r.id}`, { ...r, isActive: !r.isActive });
      toast.success(r.isActive ? 'Rider deactivated' : 'Rider activated');
      load();
    } catch {
      toast.error('Update failed');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Riders</h1>
          <p className="mt-1 text-sm text-gray-500">
            {riders.filter((r) => r.isActive).length} active · {riders.length} total
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={16} /> Add Rider
        </button>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12 text-gray-400">Loading…</div>
      ) : riders.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
          <Bike size={40} />
          <p>No riders yet — add one to start dispatching deliveries</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {riders.map((r) => (
            <div key={r.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                    <Bike size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{r.name}</p>
                    <p className="text-sm text-gray-500">{r.phone}</p>
                  </div>
                </div>
                <span className={r.isActive ? 'badge-green' : 'badge-gray'}>
                  {r.isActive ? 'Active' : 'Off duty'}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                <span className="rounded bg-gray-100 px-2 py-0.5">{r.vehicleType}</span>
                {r.vehicleNumber && <span>{r.vehicleNumber}</span>}
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => openEdit(r)} className="btn-ghost flex-1 text-xs py-1.5">
                  Edit
                </button>
                <button
                  onClick={() => toggleActive(r)}
                  className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    r.isActive
                      ? 'border-red-200 text-red-600 hover:bg-red-50'
                      : 'border-green-200 text-green-600 hover:bg-green-50'
                  }`}
                >
                  {r.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">{editing ? 'Edit Rider' : 'Add Rider'}</h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Full Name *</label>
                <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Phone *</label>
                <input className="input" type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Vehicle Type</label>
                  <select className="input" value={form.vehicleType} onChange={(e) => setForm((f) => ({ ...f, vehicleType: e.target.value }))}>
                    {VEHICLE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Vehicle Number</label>
                  <input className="input" placeholder="e.g. LHR-1234" value={form.vehicleNumber} onChange={(e) => setForm((f) => ({ ...f, vehicleNumber: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
