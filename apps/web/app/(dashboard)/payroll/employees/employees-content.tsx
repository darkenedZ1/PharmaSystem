'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Users } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  designation: string | null;
  department: string | null;
  phone: string | null;
  basicSalary: number;
  dateOfJoining: string;
  isActive: boolean;
  eobi: boolean;
}

const EMPTY_FORM = {
  name: '', designation: '', department: '', phone: '', email: '',
  dateOfJoining: new Date().toISOString().slice(0, 10),
  basicSalary: 0,
  bankName: '', bankAccount: '',
  eobi: false, sessi: false,
};

const pkr = (n: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

export function EmployeesContent() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/payroll/employees');
      setEmployees(res.data);
    } catch {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (e: Employee) => {
    setEditing(e);
    setForm({
      name: e.name, designation: e.designation ?? '', department: e.department ?? '',
      phone: e.phone ?? '', email: '',
      dateOfJoining: e.dateOfJoining.slice(0, 10),
      basicSalary: Number(e.basicSalary),
      bankName: '', bankAccount: '',
      eobi: e.eobi, sessi: false,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.basicSalary) { toast.error('Basic salary is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/payroll/employees/${editing.id}`, form);
        toast.success('Employee updated');
      } else {
        await api.post('/payroll/employees', form);
        toast.success('Employee added');
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const terminate = async (id: string) => {
    if (!confirm('Mark this employee as terminated?')) return;
    try {
      await api.post(`/payroll/employees/${id}/terminate`, { dateOfLeaving: new Date().toISOString().slice(0, 10) });
      toast.success('Employee terminated');
      load();
    } catch {
      toast.error('Failed to terminate employee');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="mt-1 text-sm text-gray-500">{employees.length} active employees</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Add Employee
        </button>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12 text-gray-400">Loading...</div>
      ) : employees.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
          <Users size={40} />
          <p>No employees yet</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Basic Salary</th>
                <th className="px-4 py-3">EOBI</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{emp.name}</p>
                    <p className="text-xs text-gray-400">{emp.designation ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{emp.department ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{emp.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(emp.dateOfJoining).toLocaleDateString('en-PK')}</td>
                  <td className="px-4 py-3 font-medium">{pkr(Number(emp.basicSalary))}</td>
                  <td className="px-4 py-3">
                    {emp.eobi ? <span className="badge-green">Yes</span> : <span className="badge-gray">No</span>}
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => openEdit(emp)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => terminate(emp.id)} className="text-xs text-red-500 hover:underline">Terminate</button>
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
            <h2 className="mb-4 text-lg font-bold">{editing ? 'Edit Employee' : 'Add Employee'}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ['Name *', 'name', 'text'],
                ['Designation', 'designation', 'text'],
                ['Department', 'department', 'text'],
                ['Phone', 'phone', 'tel'],
                ['Email', 'email', 'email'],
                ['Date of Joining *', 'dateOfJoining', 'date'],
              ] as const).map(([label, field, type]) => (
                <div key={field}>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
                  <input type={type} className="input text-sm" value={(form as any)[field]} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Basic Salary (PKR) *</label>
                <input type="number" className="input text-sm" value={form.basicSalary} onChange={(e) => setForm((f) => ({ ...f, basicSalary: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Bank Name</label>
                <input className="input text-sm" value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Bank Account</label>
                <input className="input text-sm" value={form.bankAccount} onChange={(e) => setForm((f) => ({ ...f, bankAccount: e.target.value }))} />
              </div>
            </div>
            <div className="mt-3 flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.eobi} onChange={(e) => setForm((f) => ({ ...f, eobi: e.target.checked }))} />
                EOBI Enrolled
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.sessi} onChange={(e) => setForm((f) => ({ ...f, sessi: e.target.checked }))} />
                SESSI/PESSI
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
