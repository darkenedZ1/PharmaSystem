'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Mail, CheckCircle, XCircle, Clock } from 'lucide-react';

interface NotifLog {
  id: string;
  createdAt: string;
  channel: 'whatsapp' | 'sms' | 'email';
  recipient: string;
  body: string;
  status: 'sent' | 'failed' | 'pending';
  error: string | null;
}

const CHANNEL_BADGE: Record<string, string> = {
  whatsapp: 'badge-green',
  sms: 'badge-blue',
  email: 'badge-gray',
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'sent') return <CheckCircle size={14} className="text-green-500" />;
  if (status === 'failed') return <XCircle size={14} className="text-red-500" />;
  return <Clock size={14} className="text-yellow-500" />;
};

export function NotifLogContent() {
  const [logs, setLogs] = useState<NotifLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications/log');
      setLogs(Array.isArray(res.data) ? res.data : (res.data.logs ?? []));
    } catch {
      toast.error('Failed to load notification log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = logs.filter((l) => {
    if (channelFilter !== 'all' && l.channel !== channelFilter) return false;
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    return true;
  });

  const sent = logs.filter((l) => l.status === 'sent').length;
  const failed = logs.filter((l) => l.status === 'failed').length;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notification Log</h1>
          <p className="mt-1 text-sm text-gray-500">
            {logs.length} total · {sent} sent · {failed} failed
          </p>
        </div>
        <button onClick={load} className="btn-ghost text-sm">Refresh</button>
      </div>

      <div className="mb-4 flex gap-2">
        {(['all', 'whatsapp', 'sms', 'email'] as const).map((c) => (
          <button
            key={c}
            onClick={() => setChannelFilter(c)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
              channelFilter === c ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {c}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          {(['all', 'sent', 'failed', 'pending'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12 text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
          <Mail size={40} />
          <p>No notifications found</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('en-PK', {
                      month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={CHANNEL_BADGE[log.channel] ?? 'badge-gray'}>{log.channel}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-700">{log.recipient}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{log.body}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <StatusIcon status={log.status} />
                      <span className={`capitalize text-xs font-medium ${
                        log.status === 'sent' ? 'text-green-700' :
                        log.status === 'failed' ? 'text-red-700' : 'text-yellow-700'
                      }`}>{log.status}</span>
                    </div>
                    {log.error && (
                      <p className="text-xs text-red-500 mt-0.5 truncate max-w-[200px]">{log.error}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
