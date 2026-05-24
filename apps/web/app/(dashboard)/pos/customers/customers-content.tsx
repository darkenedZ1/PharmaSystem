'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Search, Users, ChevronDown, ChevronUp } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  chronicConditions: string | null;
  allergies: string | null;
  creditLimit: number;
  creditBalance: number;
  walletBalance: number;
  loyaltyTier: string | null;
  loyaltyPoints: number;
  prescriptionsCount?: number;
}

const TIER_BADGE: Record<string, string> = {
  bronze: 'badge-yellow',
  silver: 'badge-gray',
  gold: 'badge-blue',
  platinum: 'badge-green',
};

const EMPTY_FORM = {
  name: '', phone: '', email: '', gender: '', dateOfBirth: '', chronicConditions: '',
};

const pkr = (n: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

export function CustomersContent() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async (search = '') => {
    setLoading(true);
    try {
      const res = await api.get('/prescriptions/patients', { params: { q: search } });
      setCustomers(res.data);
    } catch {
      toast.error('Failed to load customers');
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

  const save = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      await api.post('/prescriptions/patients', form);
      toast.success('Customer added');
      setShowForm(false);
      setForm(EMPTY_FORM);
      load(q);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="mt-1 text-sm text-gray-500">{customers.length} customers</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Search by name or phone..."
          value={q}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12 text-gray-400">Loading...</div>
      ) : customers.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
          <Users size={40} />
          <p>No customers found</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Loyalty Tier</th>
                <th className="px-4 py-3">Points</th>
                <th className="px-4 py-3">Credit Balance</th>
                <th className="px-4 py-3">Wallet Balance</th>
                <th className="px-4 py-3">Rx Count</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.map((c) => (
                <>
                  <tr
                    key={c.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleExpand(c.id)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{c.name}</p>
                      {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      {c.loyaltyTier ? (
                        <span className={TIER_BADGE[c.loyaltyTier.toLowerCase()] ?? 'badge'}>
                          {c.loyaltyTier}
                        </span>
                      ) : (
                        <span className="badge-gray">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-700">{c.loyaltyPoints ?? 0}</td>
                    <td className="px-4 py-3">{pkr(Number(c.creditBalance ?? 0))}</td>
                    <td className="px-4 py-3">{pkr(Number(c.walletBalance ?? 0))}</td>
                    <td className="px-4 py-3">{c.prescriptionsCount ?? 0}</td>
                    <td className="px-4 py-3">
                      {expanded === c.id ? (
                        <ChevronUp size={16} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={16} className="text-gray-400" />
                      )}
                    </td>
                  </tr>
                  {expanded === c.id && (
                    <tr key={`${c.id}-expand`} className="bg-blue-50">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Allergies</p>
                            <p className="mt-0.5 text-gray-800">{c.allergies || 'None recorded'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Chronic Conditions</p>
                            <p className="mt-0.5 text-gray-800">{c.chronicConditions || 'None recorded'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Credit Limit</p>
                            <p className="mt-0.5 text-gray-800">{pkr(Number(c.creditLimit ?? 0))}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Gender / DOB</p>
                            <p className="mt-0.5 text-gray-800">
                              {c.gender ?? '—'} / {c.dateOfBirth ? new Date(c.dateOfBirth).toLocaleDateString('en-PK') : '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Customer Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold">Add Customer</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Name *</label>
                <input className="input text-sm" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Phone</label>
                <input type="tel" className="input text-sm" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
                <input type="email" className="input text-sm" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Gender</label>
                <select className="input text-sm" value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}>
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Date of Birth</label>
                <input type="date" className="input text-sm" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600">Chronic Conditions</label>
                <textarea
                  className="input text-sm"
                  rows={2}
                  value={form.chronicConditions}
                  onChange={(e) => setForm((f) => ({ ...f, chronicConditions: e.target.value }))}
                  placeholder="e.g. Diabetes, Hypertension"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : 'Save Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
