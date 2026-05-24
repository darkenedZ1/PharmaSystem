'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Building2 } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  ntn: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  paymentTerms: number;
  leadDays: number;
  isActive: boolean;
}

const EMPTY_FORM = { name: '', ntn: '', contactPerson: '', phone: '', email: '', address: '', paymentTerms: 30, leadDays: 7 };

export function SuppliersContent() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/purchasing/suppliers');
      setSuppliers(res.data);
    } catch {
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ name: s.name, ntn: s.ntn ?? '', contactPerson: s.contactPerson ?? '', phone: s.phone ?? '', email: s.email ?? '', address: s.address ?? '', paymentTerms: s.paymentTerms, leadDays: s.leadDays });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Supplier name is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/purchasing/suppliers/${editing.id}`, form);
        toast.success('Supplier updated');
      } else {
        await api.post('/purchasing/suppliers', form);
        toast.success('Supplier added');
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="mt-1 text-sm text-gray-500">{suppliers.length} suppliers</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12 text-gray-400">Loading...</div>
      ) : suppliers.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
          <Building2 size={40} />
          <p>No suppliers yet</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Payment Terms</th>
                <th className="px-4 py-3">Lead Days</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{s.name}</p>
                    {s.ntn && <p className="text-xs text-gray-400">NTN: {s.ntn}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.contactPerson ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{s.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{s.paymentTerms} days</td>
                  <td className="px-4 py-3 text-gray-600">{s.leadDays} days</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(s)} className="text-xs text-blue-600 hover:underline">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold">{editing ? 'Edit Supplier' : 'Add Supplier'}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Name *', 'name', 'text'],
                ['NTN', 'ntn', 'text'],
                ['Contact Person', 'contactPerson', 'text'],
                ['Phone', 'phone', 'tel'],
                ['Email', 'email', 'email'],
              ].map(([label, field, type]) => (
                <div key={field}>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
                  <input
                    type={type}
                    className="input text-sm"
                    value={(form as any)[field]}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Payment Terms (days)</label>
                <input
                  type="number"
                  className="input text-sm"
                  value={form.paymentTerms}
                  onChange={(e) => setForm((f) => ({ ...f, paymentTerms: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Lead Days</label>
                <input
                  type="number"
                  className="input text-sm"
                  value={form.leadDays}
                  onChange={(e) => setForm((f) => ({ ...f, leadDays: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-gray-600">Address</label>
              <textarea
                className="input text-sm"
                rows={2}
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
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
