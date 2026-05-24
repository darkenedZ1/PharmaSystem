'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';
import { Save, CheckCircle, Calendar } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  designation: string | null;
}

interface AttendanceRow {
  employeeId: string;
  checkIn: string;
  checkOut: string;
  status: 'present' | 'absent' | 'leave';
  overtimeMinutes: number;
}

const today = new Date().toISOString().slice(0, 10);

export function AttendanceContent() {
  const user = useAuthStore((s) => s.user);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRow>>({});
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(today);
  const [saving, setSaving] = useState(false);

  const loadEmployees = async () => {
    try {
      const res = await api.get('/payroll/employees');
      return res.data as Employee[];
    } catch {
      toast.error('Failed to load employees');
      return [];
    }
  };

  const loadAttendance = async (emps: Employee[], d: string) => {
    const initial: Record<string, AttendanceRow> = {};
    emps.forEach((e) => {
      initial[e.id] = {
        employeeId: e.id,
        checkIn: '',
        checkOut: '',
        status: 'present',
        overtimeMinutes: 0,
      };
    });

    try {
      const res = await api.get('/payroll/attendance', {
        params: { branchId: user?.tenantId ?? '', date: d },
      });
      const records: any[] = Array.isArray(res.data) ? res.data : [];
      records.forEach((r) => {
        if (initial[r.employeeId]) {
          initial[r.employeeId] = {
            employeeId: r.employeeId,
            checkIn: r.checkIn ? r.checkIn.slice(11, 16) : '',
            checkOut: r.checkOut ? r.checkOut.slice(11, 16) : '',
            status: r.status ?? 'present',
            overtimeMinutes: r.overtimeMinutes ?? 0,
          };
        }
      });
    } catch {
      // No attendance for this date yet — start fresh
    }
    return initial;
  };

  const init = async (d: string) => {
    setLoading(true);
    const emps = await loadEmployees();
    setEmployees(emps);
    const att = await loadAttendance(emps, d);
    setAttendance(att);
    setLoading(false);
  };

  useEffect(() => { init(date); }, [date]);

  const update = (empId: string, field: keyof AttendanceRow, value: string | number) => {
    setAttendance((prev) => ({
      ...prev,
      [empId]: { ...prev[empId], [field]: value },
    }));
  };

  const markAllPresent = () => {
    setAttendance((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id] = { ...updated[id], status: 'present' };
      });
      return updated;
    });
    toast.info('All employees marked as present');
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const records = Object.values(attendance).map((row) => ({
        employeeId: row.employeeId,
        date,
        checkIn: row.checkIn ? `${date}T${row.checkIn}:00` : null,
        checkOut: row.checkOut ? `${date}T${row.checkOut}:00` : null,
        status: row.status,
        overtimeMinutes: row.overtimeMinutes,
        branchId: user?.tenantId ?? '',
      }));
      await api.post('/payroll/attendance', { records });
      toast.success('Attendance saved');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const STATUS_OPTIONS = [
    { value: 'present', label: 'Present' },
    { value: 'absent', label: 'Absent' },
    { value: 'leave', label: 'Leave' },
  ];

  const STATUS_BADGE: Record<string, string> = {
    present: 'badge-green',
    absent: 'badge-red',
    leave: 'badge-yellow',
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="mt-1 text-sm text-gray-500">{employees.length} employees</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <input
              type="date"
              className="input w-40 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <button onClick={markAllPresent} className="btn-ghost text-sm">
            <CheckCircle size={16} /> Mark All Present
          </button>
          <button onClick={saveAll} disabled={saving} className="btn-primary">
            <Save size={16} /> {saving ? 'Saving…' : 'Save All'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12 text-gray-400">Loading...</div>
      ) : employees.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
          <p>No employees found. Add employees in the Payroll section first.</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3">Check In</th>
                <th className="px-4 py-3">Check Out</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Overtime (min)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {employees.map((emp) => {
                const row = attendance[emp.id];
                if (!row) return null;
                return (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{emp.name}</td>
                    <td className="px-4 py-3 text-gray-500">{emp.designation ?? '—'}</td>
                    <td className="px-4 py-3">
                      <input
                        type="time"
                        className="input w-32 text-sm"
                        value={row.checkIn}
                        onChange={(e) => update(emp.id, 'checkIn', e.target.value)}
                        disabled={row.status === 'absent'}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="time"
                        className="input w-32 text-sm"
                        value={row.checkOut}
                        onChange={(e) => update(emp.id, 'checkOut', e.target.value)}
                        disabled={row.status === 'absent'}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="input w-28 text-sm"
                        value={row.status}
                        onChange={(e) => update(emp.id, 'status', e.target.value)}
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        className="input w-24 text-sm"
                        value={row.overtimeMinutes}
                        min={0}
                        onChange={(e) => update(emp.id, 'overtimeMinutes', Number(e.target.value))}
                        disabled={row.status === 'absent'}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
