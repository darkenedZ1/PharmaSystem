'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Search, Stethoscope } from 'lucide-react';

interface Doctor {
  id: string;
  name: string;
  pmdcNumber: string | null;
  specialization: string | null;
  clinicName: string | null;
  phone: string | null;
  isActive: boolean;
}

const EMPTY_FORM = {
  name: '',
  pmdcNumber: '',
  specialization: '',
  clinicName: '',
  clinicAddress: '',
  phone: '',
  email: '',
  isActive: true,
};

export function DoctorsContent() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async (search = '') => {
    setLoading(true);
    try {
      const res = await api.get('/prescriptions/doctors', { params: { q: search } });
      setDoctors(res.data);
    } catch {
      toast.error('Failed to load doctors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (val: string) => {
    setQ(val);
    const t = setTimeout(() => load(val), 350);
    return () => clearTimeout(t);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (d: Doctor) => {
    setEditing(d);
    setForm({
      name: d.name,
      pmdcNumber: d.pmdcNumber ?? '',
      specialization: d.specialization ?? '',
      clinicName: d.clinicName ?? '',
      clinicAddress: '',
      phone: d.phone ?? '',
      email: '',
      isActive: d.isActive,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/prescriptions/doctors/${editing.id}`, form);
        toast.success('Doctor updated');
      } else {
        await api.post('/prescriptions/doctors', form);
        toast.success('Doctor added');
      }
      setShowForm(false);
      load(q);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (d: Doctor) => {
    try {
      await api.put(`/prescriptions/doctors/${d.id}`, { ...d, isActive: !d.isActive });
      toast.success(`Doctor ${d.isActive ? 'deactivated' : 'activated'}`);
      load(q);
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctors</h1>
          <p className="mt-1 text-sm text-gray-500">{doctors.length} doctors</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Add Doctor
        </button>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Search by name, PMDC number..."
          value={q}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12 text-gray-400">Loading...</div>
      ) : doctors.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
          <Stethoscope size={40} />
          <p>No doctors found</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">PMDC #</th>
                <th className="px-4 py-3">Specialization</th>
                <th className="px-4 py-3">Clinic</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {doctors.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{d.name}</td>
                  <td className="px-4 py-3 font-mono text-gray-600">{d.pmdcNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{d.specialization ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{d.clinicName ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{d.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    {d.isActive ? (
                      <span className="badge-green">Active</span>
                    ) : (
                      <span className="badge-gray">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3 flex gap-3">
                    <button onClick={() => openEdit(d)} className="text-xs text-blue-600 hover:underline">
                      Edit
                    </button>
                    <button
                      onClick={() => toggle(d)}
                      className={`text-xs hover:underline ${d.isActive ? 'text-red-500' : 'text-green-600'}`}
                    >
                      {d.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold">{editing ? 'Edit Doctor' : 'Add Doctor'}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Full Name *</label>
                <input className="input text-sm" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">PMDC Number</label>
                <input className="input text-sm" value={form.pmdcNumber} onChange={(e) => setForm((f) => ({ ...f, pmdcNumber: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Specialization</label>
                <input className="input text-sm" placeholder="e.g. Cardiologist" value={form.specialization} onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Clinic / Hospital</label>
                <input className="input text-sm" value={form.clinicName} onChange={(e) => setForm((f) => ({ ...f, clinicName: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Phone</label>
                <input type="tel" className="input text-sm" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
                <input type="email" className="input text-sm" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600">Clinic Address</label>
                <input className="input text-sm" value={form.clinicAddress} onChange={(e) => setForm((f) => ({ ...f, clinicAddress: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  Active
                </label>
              </div>
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
