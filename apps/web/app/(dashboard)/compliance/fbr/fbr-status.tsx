'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { CheckCircle, XCircle, RefreshCw, Clock } from 'lucide-react';

export function FbrStatus() {
  const [status, setStatus] = useState<any>(null);

  const load = () => {
    api.get('/fbr/queue').then((r) => setStatus(r.data));
  };

  useEffect(() => { load(); }, []);

  const resumeOffline = async () => {
    try {
      const r = await api.post('/fbr/resume-offline');
      toast.success(r.data.message);
      load();
    } catch {
      toast.error('Failed to resume offline queue');
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">FBR Compliance</h1>
        <button onClick={load} className="btn-ghost">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {status && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="card text-center">
              <Clock size={24} className="mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold">{status.pending}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
            <div className="card text-center">
              <CheckCircle size={24} className="mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{status.success}</p>
              <p className="text-xs text-gray-500">Synced</p>
            </div>
            <div className="card text-center">
              <XCircle size={24} className="mx-auto mb-2 text-red-500" />
              <p className="text-2xl font-bold">{status.failed}</p>
              <p className="text-xs text-gray-500">Failed</p>
            </div>
          </div>

          {status.failed > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Failed Invoices</h3>
              <div className="space-y-2">
                {status.recentFailed.map((f: any) => (
                  <div key={f.id} className="card bg-red-50 border-red-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{f.sale?.invoiceNumber}</p>
                        <p className="text-xs text-gray-500 truncate max-w-xs">{f.lastError}</p>
                      </div>
                      <span className="text-xs text-gray-400">
                        PKR {Number(f.sale?.total).toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={resumeOffline} className="btn-primary">
            <RefreshCw size={14} /> Retry Offline Queue
          </button>
        </>
      )}
    </div>
  );
}
