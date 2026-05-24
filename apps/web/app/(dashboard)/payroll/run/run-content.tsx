'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Play, CheckCircle, Clock } from 'lucide-react';

interface PayrollLine {
  employeeId: string;
  employeeName: string;
  workingDays: number;
  presentDays: number;
  grossPay: number;
  incomeTax: number;
  eobi: number;
  deductions: number;
  netPay: number;
}

interface PayrollRun {
  id: string;
  year: number;
  month: number;
  status: 'draft' | 'approved' | 'paid';
  processedAt: string;
  totalNetPay: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pkr = (n: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

const now = new Date();

const STATUS_BADGE: Record<string, string> = {
  draft: 'badge-yellow',
  approved: 'badge-blue',
  paid: 'badge-green',
};

export function RunPayrollContent() {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [lines, setLines] = useState<PayrollLine[]>([]);
  const [runStatus, setRunStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [previousRuns, setPreviousRuns] = useState<PayrollRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);

  const loadRuns = async () => {
    setRunsLoading(true);
    try {
      const res = await api.get('/payroll/runs');
      setPreviousRuns(res.data);
    } catch {
      // No previous runs or API not ready
      setPreviousRuns([]);
    } finally {
      setRunsLoading(false);
    }
  };

  const loadCurrentRun = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payroll/runs/${year}/${month}`);
      setLines(res.data.lines ?? []);
      setRunStatus(res.data.status ?? null);
    } catch {
      setLines([]);
      setRunStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRuns(); }, []);
  useEffect(() => { loadCurrentRun(); }, [month, year]);

  const processPayroll = async () => {
    setProcessing(true);
    try {
      const res = await api.post('/payroll/runs/process', { month, year });
      setLines(res.data.lines ?? []);
      setRunStatus(res.data.status ?? 'draft');
      toast.success('Payroll processed successfully');
      loadRuns();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to process payroll');
    } finally {
      setProcessing(false);
    }
  };

  const approvePayroll = async () => {
    setApproving(true);
    try {
      await api.post(`/payroll/runs/${year}/${month}/approve`);
      setRunStatus('approved');
      toast.success('Payroll approved');
      loadRuns();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to approve payroll');
    } finally {
      setApproving(false);
    }
  };

  const totals = lines.reduce(
    (acc, l) => ({
      gross: acc.gross + Number(l.grossPay),
      deductions: acc.deductions + Number(l.deductions),
      net: acc.net + Number(l.netPay),
    }),
    { gross: 0, deductions: 0, net: 0 },
  );

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Run Payroll</h1>
          <p className="mt-1 text-sm text-gray-500">Process and approve monthly payroll</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Main payroll area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Controls */}
          <div className="card">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Month</label>
                <select
                  className="input w-40 text-sm"
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Year</label>
                <select
                  className="input w-28 text-sm"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={processPayroll}
                disabled={processing}
                className="btn-primary"
              >
                <Play size={16} /> {processing ? 'Processing…' : 'Process Payroll'}
              </button>
              {runStatus === 'draft' && (
                <button
                  onClick={approvePayroll}
                  disabled={approving}
                  className="btn-ghost text-green-600 border-green-300"
                >
                  <CheckCircle size={16} /> {approving ? 'Approving…' : 'Approve Payroll'}
                </button>
              )}
              {runStatus && (
                <span className={STATUS_BADGE[runStatus] ?? 'badge-gray'}>
                  Status: {runStatus}
                </span>
              )}
            </div>
          </div>

          {/* Results Table */}
          {loading ? (
            <div className="card flex items-center justify-center py-12 text-gray-400">Loading...</div>
          ) : lines.length === 0 ? (
            <div className="card flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
              <Play size={40} />
              <p>Click "Process Payroll" to generate payroll for {MONTHS[month - 1]} {year}</p>
            </div>
          ) : (
            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3 text-right">Working Days</th>
                    <th className="px-4 py-3 text-right">Present</th>
                    <th className="px-4 py-3 text-right">Gross Pay</th>
                    <th className="px-4 py-3 text-right">Deductions</th>
                    <th className="px-4 py-3 text-right">Net Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.map((l) => (
                    <tr key={l.employeeId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{l.employeeName}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{l.workingDays}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{l.presentDays}</td>
                      <td className="px-4 py-3 text-right">{pkr(Number(l.grossPay))}</td>
                      <td className="px-4 py-3 text-right text-red-600">
                        {pkr(Number(l.deductions))}
                        <div className="text-xs text-gray-400 font-normal">
                          Tax: {pkr(Number(l.incomeTax))} · EOBI: {pkr(Number(l.eobi))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{pkr(Number(l.netPay))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Totals</td>
                    <td className="px-4 py-3 text-right font-semibold">{pkr(totals.gross)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">{pkr(totals.deductions)}</td>
                    <td className="px-4 py-3 text-right font-bold text-lg text-gray-900">{pkr(totals.net)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Right: Previous runs */}
        <div className="card h-fit">
          <h2 className="mb-4 font-semibold text-gray-900">Previous Runs</h2>
          {runsLoading ? (
            <p className="text-sm text-gray-400 text-center py-4">Loading...</p>
          ) : previousRuns.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-gray-400">
              <Clock size={32} />
              <p className="text-sm">No previous runs</p>
            </div>
          ) : (
            <div className="space-y-2">
              {previousRuns.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm cursor-pointer hover:bg-gray-50"
                  onClick={() => { setMonth(run.month); setYear(run.year); }}
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {MONTHS[run.month - 1]} {run.year}
                    </p>
                    <span className={STATUS_BADGE[run.status] ?? 'badge-gray'}>{run.status}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{pkr(Number(run.totalNetPay))}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(run.processedAt).toLocaleDateString('en-PK')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
