'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Building2, Plus, X, Edit2 } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  fbrPosId?: string;
  isActive: boolean;
}

const emptyForm = { name: '', address: '', phone: '', fbrPosId: '' };

export function BranchesContent() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get('/users/branches')
      .then((r) => setBranches(r.data))
      .catch(() => toast.error('Failed to load branches'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (b: Branch) => {
    setEditing(b);
    setForm({
      name: b.name,
      address: b.address ?? '',
      phone: b.phone ?? '',
      fbrPosId: b.fbrPosId ?? '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Branch name is required'); return; }
    setSaving(true);
    const body = {
      name: form.name.trim(),
      address: form.address || undefined,
      phone: form.phone || undefined,
      fbrPosId: form.fbrPosId || undefined,
    };
    try {
      if (editing) {
        await api.put(`/users/branches/${editing.id}`, body);
        toast.success('Branch updated');
      } else {
        await api.post('/users/branches', body);
        toast.success('Branch created');
      }
      closeModal();
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to save branch');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 size={22} className="text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">Branches</h1>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Branch
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Branch Name</th>
              <th className="px-4 py-3 text-left">Address</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">FBR POS ID</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm text-gray-400">Loading…</td>
              </tr>
            ) : branches.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm text-gray-400">
                  No branches found. Add your first branch.
                </td>
              </tr>
            ) : (
              branches.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{b.name}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[220px] truncate">
                    {b.address ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{b.phone ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-gray-600">{b.fbrPosId ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={b.isActive ? 'badge-green' : 'badge-gray'}>
                      {b.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(b)}
                      className="btn-ghost py-1 px-2 text-xs"
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-md p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editing ? 'Edit Branch' : 'Add Branch'}
              </h2>
              <button onClick={closeModal} className="btn-ghost p-1">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Branch Name <span className="text-red-500">*</span>
                </label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Address</label>
                <textarea
                  className="input min-h-[70px] resize-y"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Phone</label>
                <input
                  className="input"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">FBR POS ID</label>
                <input
                  className="input font-mono"
                  placeholder="e.g. FBR-POS-001"
                  value={form.fbrPosId}
                  onChange={(e) => setForm((f) => ({ ...f, fbrPosId: e.target.value }))}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Assigned by FBR for this point-of-sale location
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
