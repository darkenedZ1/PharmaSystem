'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, CalendarOff } from 'lucide-react';

interface LeaveApplication {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
}

interface Employee {
  id: string;
  name: string;
}

const LEAVE_TYPES = ['annual', 'sick', 'casual', 'unpaid'];

const STATUS_BADGE: Record<string, string> = {
  pending: 'badge-yellow',
  approved: 'badge-green',
  rejected: 'badge-red',
};

const EMPTY_FORM = {
  employeeId: '',
  leaveType: 'annual',
  fromDate: '',
  toDate: '',
  reason: '',
};

const calcDays = (from: string, to: string) => {
  if (!from || !to) return 0;
  const diff = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
};

export function LeaveContent() {
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiAvailable, setApiAvailable] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadEmployees = async () => {
    try {
      const res = await api.get('/payroll/employees');
      setEmployees(res.data);
    } catch {
      // silently fail
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/payroll/leave');
      setLeaves(res.data);
      setApiAvailable(true);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setApiAvailable(false);
      } else {
        toast.error('Failed to load leave applications');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
    load();
  }, []);

  const save = async () => {
    if (!form.employeeId) { toast.error('Select an employee'); return; }
    if (!form.fromDate || !form.toDate) { toast.error('Select date range'); return; }
    setSaving(true);
    try {
      await api.post('/payroll/leave', {
        ...form,
        days: calcDays(form.fromDate, form.toDate),
      });
      toast.success('Leave application submitted');
      setShowForm(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Submit failed');
    } finally {
      setSaving(false);
    }
  };

  const action = async (id: string, act: 'approve' | 'reject') => {
    try {
      await api.post(`/payroll/leave/${id}/${act}`);
      toast.success(`Leave ${act}d`);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Action failed');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="mt-1 text-sm text-gray-500">{leaves.length} applications</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> New Leave
        </button>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12 text-gray-400">Loading...</div>
      ) : !apiAvailable ? (
        <div className="card flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
          <CalendarOff size={48} />
          <p className="text-lg font-medium text-gray-500">Leave Management API Coming Soon</p>
          <p className="text-sm text-gray-400 max-w-sm text-center">
            The leave management service is not yet available. You can still submit leave requests and they will be processed once the API is ready.
          </p>
        </div>
      ) : leaves.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
          <CalendarOff size={40} />
          <p>No leave applications found</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">To</th>
                <th className="px-4 py-3">Days</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {leaves.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{l.employeeName}</td>
                  <td className="px-4 py-3">
                    <span className="capitalize badge-blue">{l.leaveType}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(l.fromDate).toLocaleDateString('en-PK')}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(l.toDate).toLocaleDateString('en-PK')}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{l.days}</td>
                  <td className="px-4 py-3">
                    <span className={STATUS_BADGE[l.status] ?? 'badge-gray'}>{l.status}</span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    {l.status === 'pending' && (
                      <>
                        <button
                          onClick={() => action(l.id, 'approve')}
                          className="text-xs text-green-600 hover:underline"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => action(l.id, 'reject')}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {l.status !== 'pending' && <span className="text-xs text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Leave Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold">New Leave Application</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Employee *</label>
                <select
                  className="input text-sm"
                  value={form.employeeId}
                  onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
                >
                  <option value="">Select employee...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Leave Type *</label>
                <select
                  className="input text-sm"
                  value={form.leaveType}
                  onChange={(e) => setForm((f) => ({ ...f, leaveType: e.target.value }))}
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">From Date *</label>
                  <input
                    type="date"
                    className="input text-sm"
                    value={form.fromDate}
                    onChange={(e) => setForm((f) => ({ ...f, fromDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">To Date *</label>
                  <input
                    type="date"
                    className="input text-sm"
                    value={form.toDate}
                    onChange={(e) => setForm((f) => ({ ...f, toDate: e.target.value }))}
                  />
                </div>
              </div>
              {form.fromDate && form.toDate && (
                <p className="text-xs text-blue-600">
                  Duration: {calcDays(form.fromDate, form.toDate)} day(s)
                </p>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Reason</label>
                <textarea
                  className="input text-sm"
                  rows={3}
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Reason for leave..."
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? 'Submitting…' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
