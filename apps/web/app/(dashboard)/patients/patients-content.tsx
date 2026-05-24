'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Search, Plus, Users } from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  chronicConditions: string | null;
  loyaltyTier: string;
  _count: { prescriptions: number; sales: number };
}

const EMPTY_FORM = { name: '', phone: '', email: '', gender: '', dateOfBirth: '', chronicConditions: '' };

export function PatientsContent() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const res = await api.get('/prescriptions/patients', { params: { q } });
      setPatients(res.data);
    } catch {
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const handleSearch = (q: string) => {
    setSearch(q);
    const timer = setTimeout(() => load(q || undefined), 400);
    return () => clearTimeout(timer);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Patient name is required'); return; }
    setSaving(true);
    try {
      await api.post('/prescriptions/patients', { ...form, dateOfBirth: form.dateOfBirth || undefined });
      toast.success('Patient added');
      setShowForm(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to add patient');
    } finally {
      setSaving(false);
    }
  };

  const tierBadge = (tier: string) => {
    if (tier === 'gold') return 'badge-yellow';
    if (tier === 'platinum') return 'badge-blue';
    if (tier === 'silver') return 'badge-gray';
    return '';
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="mt-1 text-sm text-gray-500">{patients.length} patients</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> Add Patient
        </button>
      </div>

      <div className="mb-4 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12 text-gray-400">Loading...</div>
      ) : patients.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
          <Users size={40} />
          <p>No patients found</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Gender</th>
                <th className="px-4 py-3">Conditions</th>
                <th className="px-4 py-3">Rx</th>
                <th className="px-4 py-3">Visits</th>
                <th className="px-4 py-3">Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {patients.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.name}</p>
                    {p.email && <p className="text-xs text-gray-400">{p.email}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{p.gender ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{p.chronicConditions ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{p._count.prescriptions}</td>
                  <td className="px-4 py-3 text-gray-600">{p._count.sales}</td>
                  <td className="px-4 py-3">
                    {p.loyaltyTier !== 'none' && (
                      <span className={tierBadge(p.loyaltyTier)}>{p.loyaltyTier}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold">Add Patient</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {([['Name *', 'name', 'text'], ['Phone', 'phone', 'tel'], ['Email', 'email', 'email'], ['Date of Birth', 'dateOfBirth', 'date']] as const).map(([label, field, type]) => (
                <div key={field}>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
                  <input type={type} className="input text-sm" value={(form as any)[field]} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Gender</label>
                <select className="input text-sm" value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}>
                  <option value="">Select</option>
                  <option>male</option>
                  <option>female</option>
                  <option>other</option>
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-gray-600">Chronic Conditions / Allergies</label>
              <textarea className="input text-sm" rows={2} value={form.chronicConditions} onChange={(e) => setForm((f) => ({ ...f, chronicConditions: e.target.value }))} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Add Patient'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
