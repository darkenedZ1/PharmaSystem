'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { ShieldAlert, Download } from 'lucide-react';

interface ControlledLog {
  id: string;
  date: string;
  productName: string;
  customerName: string;
  customerCnic: string;
  doctorPmdc: string;
  quantity: number;
  dispensedBy: string;
}

const maskCnic = (cnic: string) => {
  if (!cnic) return '—';
  const cleaned = cnic.replace(/[-\s]/g, '');
  if (cleaned.length < 5) return cnic;
  return cleaned.slice(0, 5) + '-***-***-*';
};

const today = new Date().toISOString().slice(0, 10);
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

export function ControlledContent() {
  const [logs, setLogs] = useState<ControlledLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiAvailable, setApiAvailable] = useState(true);
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/prescriptions/controlled-log', { params: { from, to } });
      setLogs(Array.isArray(res.data) ? res.data : (res.data.logs ?? []));
      setApiAvailable(true);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setApiAvailable(false);
      } else {
        toast.error('Failed to load controlled substance log');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [from, to]);

  const exportCsv = () => {
    if (logs.length === 0) {
      toast.info('No data to export');
      return;
    }
    const headers = ['Date', 'Product', 'Customer', 'CNIC', 'Doctor PMDC', 'Quantity', 'Dispensed By'];
    const rows = logs.map((l) => [
      new Date(l.date).toLocaleDateString('en-PK'),
      l.productName,
      l.customerName,
      maskCnic(l.customerCnic),
      l.doctorPmdc ?? '—',
      l.quantity,
      l.dispensedBy,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const uri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    const a = document.createElement('a');
    a.href = uri;
    a.download = `controlled-log-${from}-to-${to}.csv`;
    a.click();
    toast.success('Exported successfully');
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Controlled Substances Log</h1>
          <p className="mt-1 text-sm text-gray-500">Regulatory dispensing record</p>
        </div>
        <button onClick={exportCsv} className="btn-ghost text-sm">
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm text-gray-600">Date range:</span>
        <input
          type="date"
          className="input w-36 text-sm"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <span className="text-gray-400 text-sm">to</span>
        <input
          type="date"
          className="input w-36 text-sm"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12 text-gray-400">Loading...</div>
      ) : !apiAvailable ? (
        <div className="card flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
          <ShieldAlert size={48} />
          <p className="text-lg font-medium text-gray-500">Controlled Substance Log</p>
          <p className="text-sm text-gray-400 max-w-sm text-center">
            Controlled substance log will appear here once dispensing begins.
          </p>
        </div>
      ) : logs.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
          <ShieldAlert size={40} />
          <p>No controlled substance records for this period</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">CNIC</th>
                <th className="px-4 py-3">Doctor PMDC</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3">Dispensed By</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(log.date).toLocaleDateString('en-PK')}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{log.productName}</td>
                  <td className="px-4 py-3 text-gray-700">{log.customerName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{maskCnic(log.customerCnic)}</td>
                  <td className="px-4 py-3 font-mono text-gray-600">{log.doctorPmdc ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{log.quantity}</td>
                  <td className="px-4 py-3 text-gray-600">{log.dispensedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
