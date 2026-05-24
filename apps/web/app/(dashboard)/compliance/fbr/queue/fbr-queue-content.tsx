'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle, XCircle, Clock, Wifi, RotateCcw } from 'lucide-react';

interface FbrQueueItem {
  id: string;
  status: 'pending' | 'success' | 'failed' | 'offline_pending';
  attempts: number;
  lastError?: string;
  createdAt: string;
  nextRetryAt?: string;
  sale?: {
    invoiceNumber?: string;
    total?: number;
    saleDate?: string;
  };
}

interface QueueData {
  pending: number;
  failed: number;
  success: number;
  recentFailed: FbrQueueItem[];
}

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: JSX.Element }> = {
  success: {
    label: 'Synced',
    badge: 'badge-green',
    icon: <CheckCircle size={13} />,
  },
  pending: {
    label: 'Pending',
    badge: 'badge-yellow',
    icon: <Clock size={13} />,
  },
  failed: {
    label: 'Failed',
    badge: 'badge-red',
    icon: <XCircle size={13} />,
  },
  offline_pending: {
    label: 'Offline',
    badge: 'badge-gray',
    icon: <Wifi size={13} />,
  },
};

export function FbrQueueContent() {
  const [data, setData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [resuming, setResuming] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/fbr/queue')
      .then((r) => setData(r.data))
      .catch(() => toast.error('Failed to load FBR queue'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRetry = async (id: string) => {
    setRetrying(id);
    try {
      await api.post(`/fbr/retry/${id}`);
      toast.success('Retry queued successfully');
      load();
    } catch (err: any) {
      if (err?.response?.status === 404) {
        toast.info('Retry endpoint coming soon');
      } else {
        toast.error(err?.response?.data?.message ?? 'Failed to retry');
      }
    } finally {
      setRetrying(null);
    }
  };

  const handleResumeOffline = async () => {
    setResuming(true);
    try {
      const r = await api.post('/fbr/resume-offline');
      toast.success(r.data.message ?? 'Offline queue resumed');
      load();
    } catch {
      toast.error('Failed to resume offline queue');
    } finally {
      setResuming(false);
    }
  };

  // Build a combined display list: all recentFailed + pending stubs
  const displayItems: FbrQueueItem[] = data?.recentFailed ?? [];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">FBR Compliance Queue</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleResumeOffline}
            className="btn-ghost"
            disabled={resuming}
          >
            <Wifi size={14} />
            {resuming ? 'Resuming…' : 'Resume Offline'}
          </button>
          <button onClick={load} className="btn-ghost" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <div className="mb-2 flex justify-center">
            <Clock size={24} className="text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {loading ? '—' : data?.pending ?? 0}
          </p>
          <p className="mt-1 text-xs text-gray-500">Total Pending</p>
        </div>
        <div className="card p-4 text-center">
          <div className="mb-2 flex justify-center">
            <XCircle size={24} className="text-red-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {loading ? '—' : data?.failed ?? 0}
          </p>
          <p className="mt-1 text-xs text-gray-500">Total Failed</p>
        </div>
        <div className="card p-4 text-center">
          <div className="mb-2 flex justify-center">
            <CheckCircle size={24} className="text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {loading ? '—' : data?.success ?? 0}
          </p>
          <p className="mt-1 text-xs text-gray-500">Synced (Total)</p>
        </div>
      </div>

      {/* Queue table */}
      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b px-4 py-3 bg-gray-50">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Recent Failed Invoices
          </p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Invoice #</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Attempts</th>
              <th className="px-4 py-3 text-left max-w-[260px]">Last Error</th>
              <th className="px-4 py-3 text-left">Created At</th>
              <th className="px-4 py-3 text-left">Next Retry</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-gray-400">Loading…</td>
              </tr>
            ) : displayItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <CheckCircle size={32} className="text-green-400" />
                    <p className="text-sm font-medium text-gray-600">All clear!</p>
                    <p className="text-xs">No failed invoices in the queue</p>
                  </div>
                </td>
              </tr>
            ) : (
              displayItems.map((item) => {
                const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-gray-800">
                      {item.sale?.invoiceNumber ?? item.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${cfg.badge} flex w-fit items-center gap-1`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-600">
                      {item.attempts}
                    </td>
                    <td className="px-4 py-3 max-w-[260px]">
                      {item.lastError ? (
                        <span
                          className="block truncate text-xs text-red-600"
                          title={item.lastError}
                        >
                          {item.lastError}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(item.createdAt).toLocaleString('en-PK')}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {item.nextRetryAt
                        ? new Date(item.nextRetryAt).toLocaleString('en-PK')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.status === 'failed' && (
                        <button
                          onClick={() => handleRetry(item.id)}
                          disabled={retrying === item.id}
                          className="btn-ghost py-1 px-2 text-xs text-blue-600 hover:text-blue-800"
                        >
                          <RotateCcw size={13} className={retrying === item.id ? 'animate-spin' : ''} />
                          {retrying === item.id ? 'Retrying…' : 'Retry'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
