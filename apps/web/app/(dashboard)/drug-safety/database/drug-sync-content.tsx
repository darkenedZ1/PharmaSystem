'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  RefreshCw, CheckCircle, XCircle, Clock, Database,
  ChevronLeft, ChevronRight, Loader2, ShieldAlert, Pill,
} from 'lucide-react';

interface SyncStatus {
  lastSync: {
    id: string;
    startedAt: string;
    completedAt: string | null;
    status: 'running' | 'completed' | 'failed';
    newFound: number;
    updated: number;
    errors: string | null;
  } | null;
  pendingCount: number;
  approvedCount: number;
}

interface PendingDrug {
  id: string;
  source: string;
  externalId: string;
  name: string;
  genericName: string | null;
  brandName: string | null;
  manufacturer: string | null;
  drugSchedule: string | null;
  isControlled: boolean;
  isRxOnly: boolean;
  dosageForm: string | null;
  route: string | null;
  pharmClass: string | null;
  activeIngredients: { name: string; strength: string }[] | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface PagedResult {
  items: PendingDrug[];
  total: number;
  page: number;
  pages: number;
}

type ActiveTab = 'pending' | 'approved' | 'rejected';

const SCHEDULE_BADGE: Record<string, string> = {
  'OTC': 'badge-green',
  'Schedule H': 'badge-blue',
  'Schedule X': 'badge-red',
  'Schedule C': 'badge-yellow',
};

const STATUS_COLOR: Record<string, string> = {
  completed: 'text-green-600',
  failed: 'text-red-600',
  running: 'text-blue-600',
};

export function DrugSyncContent() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [data, setData] = useState<PagedResult>({ items: [], total: 0, page: 1, pages: 1 });
  const [activeTab, setActiveTab] = useState<ActiveTab>('pending');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Approve modal state
  const [approving, setApproving] = useState<PendingDrug | null>(null);
  const [approveForm, setApproveForm] = useState({ costPrice: '', salePrice: '', taxRate: '0', reorderPoint: '10' });
  const [approveSaving, setApproveSaving] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const res = await api.get('/drug-sync/status');
      setStatus(res.data);
    } catch { /* silent */ }
  }, []);

  const loadDrugs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/drug-sync/pending', { params: { status: activeTab, page, limit: 30 } });
      setData(res.data);
    } catch {
      toast.error('Failed to load drugs');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    loadStatus();
    loadDrugs();
  }, [loadStatus, loadDrugs]);

  // Re-poll status while a sync is running
  useEffect(() => {
    if (status?.lastSync?.status !== 'running') return;
    const t = setTimeout(() => { loadStatus(); loadDrugs(); }, 5000);
    return () => clearTimeout(t);
  }, [status, loadStatus, loadDrugs]);

  const triggerSync = async () => {
    setSyncing(true);
    try {
      await api.post('/drug-sync/trigger');
      toast.success('Sync started — checking OpenFDA for new medicines…');
      setTimeout(loadStatus, 2000);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to start sync');
    } finally {
      setSyncing(false);
    }
  };

  const openApprove = (drug: PendingDrug) => {
    setApproving(drug);
    setApproveForm({ costPrice: '', salePrice: '', taxRate: '0', reorderPoint: '10' });
  };

  const confirmApprove = async () => {
    if (!approving) return;
    setApproveSaving(true);
    try {
      await api.post(`/drug-sync/pending/${approving.id}/approve`, {
        costPrice: approveForm.costPrice ? Number(approveForm.costPrice) : undefined,
        salePrice: approveForm.salePrice ? Number(approveForm.salePrice) : undefined,
        taxRate: Number(approveForm.taxRate) || 0,
        reorderPoint: Number(approveForm.reorderPoint) || 10,
      });
      toast.success(`${approving.name} added to your product catalog`);
      setApproving(null);
      loadStatus();
      loadDrugs();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Approval failed');
    } finally {
      setApproveSaving(false);
    }
  };

  const reject = async (id: string, name: string) => {
    try {
      await api.put(`/drug-sync/pending/${id}/reject`, {});
      toast.success(`${name} rejected`);
      loadDrugs();
      loadStatus();
    } catch { toast.error('Failed to reject'); }
  };

  const bulkReject = async () => {
    if (!selected.size) return;
    try {
      await api.delete('/drug-sync/pending/bulk-reject', { data: { ids: [...selected] } });
      toast.success(`${selected.size} drugs rejected`);
      setSelected(new Set());
      loadDrugs();
      loadStatus();
    } catch { toast.error('Bulk reject failed'); }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === data.items.length) setSelected(new Set());
    else setSelected(new Set(data.items.map((d) => d.id)));
  };

  const isRunning = status?.lastSync?.status === 'running';

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drug Database Sync</h1>
          <p className="mt-1 text-sm text-gray-500">
            Automatically fetches new medicines from OpenFDA. Review and approve them to add to your product catalog.
          </p>
        </div>
        <button
          onClick={triggerSync}
          disabled={syncing || isRunning}
          className="btn-primary shrink-0"
        >
          {syncing || isRunning ? (
            <><Loader2 size={16} className="animate-spin" /> Syncing…</>
          ) : (
            <><RefreshCw size={16} /> Sync Now</>
          )}
        </button>
      </div>

      {/* Stats cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-50">
              <Clock size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{status?.pendingCount ?? '—'}</p>
              <p className="text-xs text-gray-500">Pending Review</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{status?.approvedCount ?? '—'}</p>
              <p className="text-xs text-gray-500">Added to Catalog</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              status?.lastSync?.status === 'completed' ? 'bg-blue-50' :
              status?.lastSync?.status === 'failed' ? 'bg-red-50' : 'bg-gray-50'
            }`}>
              <Database size={20} className={STATUS_COLOR[status?.lastSync?.status ?? ''] ?? 'text-gray-400'} />
            </div>
            <div>
              <p className={`text-sm font-semibold capitalize ${STATUS_COLOR[status?.lastSync?.status ?? ''] ?? 'text-gray-400'}`}>
                {status?.lastSync ? (
                  isRunning ? 'Running…' : status.lastSync.status
                ) : 'Never synced'}
              </p>
              <p className="text-xs text-gray-500">
                {status?.lastSync?.completedAt
                  ? new Date(status.lastSync.completedAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })
                  : status?.lastSync?.startedAt
                  ? `Started ${new Date(status.lastSync.startedAt).toLocaleTimeString('en-PK', { timeStyle: 'short' })}`
                  : 'Click "Sync Now" to start'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {status?.lastSync?.status === 'completed' && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
          Last sync found <strong>{status.lastSync.newFound} new medicines</strong> and updated {status.lastSync.updated} existing entries.
        </div>
      )}
      {status?.lastSync?.status === 'failed' && status.lastSync.errors && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          Last sync failed: {status.lastSync.errors}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex items-center justify-between border-b">
        <div className="flex gap-1">
          {(['pending', 'approved', 'rejected'] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPage(1); setSelected(new Set()); }}
              className={`border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
              {tab === 'pending' && status?.pendingCount ? (
                <span className="ml-1.5 rounded-full bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700">
                  {status.pendingCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        {activeTab === 'pending' && selected.size > 0 && (
          <button onClick={bulkReject} className="text-xs text-red-600 hover:underline font-medium">
            Reject selected ({selected.size})
          </button>
        )}
      </div>

      {/* Drug list */}
      {loading ? (
        <div className="card flex items-center justify-center py-12 text-gray-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : data.items.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
          <Pill size={40} />
          <p className="text-sm">
            {activeTab === 'pending'
              ? 'No pending medicines — run a sync to fetch new ones'
              : `No ${activeTab} medicines`}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                {activeTab === 'pending' && (
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={selected.size === data.items.length && data.items.length > 0}
                      onChange={selectAll}
                      className="rounded"
                    />
                  </th>
                )}
                <th className="px-4 py-3">Medicine</th>
                <th className="px-4 py-3">Manufacturer</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Dosage Form</th>
                {activeTab === 'pending' && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((drug) => (
                <tr key={drug.id} className="hover:bg-gray-50">
                  {activeTab === 'pending' && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(drug.id)}
                        onChange={() => toggleSelect(drug.id)}
                        className="rounded"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{drug.brandName || drug.name}</p>
                    {drug.genericName && (
                      <p className="text-xs text-gray-400">{drug.genericName}</p>
                    )}
                    {drug.activeIngredients && drug.activeIngredients.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {drug.activeIngredients.map((ai) => `${ai.name} ${ai.strength}`).join(', ')}
                      </p>
                    )}
                    <div className="mt-1 flex gap-1 flex-wrap">
                      {drug.isRxOnly && <span className="badge-blue text-xs">Rx Only</span>}
                      {drug.isControlled && (
                        <span className="flex items-center gap-0.5 badge-red text-xs">
                          <ShieldAlert size={10} /> Controlled
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{drug.manufacturer ?? '—'}</td>
                  <td className="px-4 py-3">
                    {drug.drugSchedule ? (
                      <span className={SCHEDULE_BADGE[drug.drugSchedule] ?? 'badge-gray'}>
                        {drug.drugSchedule}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 capitalize">
                    {drug.dosageForm?.toLowerCase() ?? '—'}
                    {drug.route && <span className="text-xs text-gray-400 block">{drug.route}</span>}
                  </td>
                  {activeTab === 'pending' && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openApprove(drug)}
                          className="flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
                        >
                          <CheckCircle size={12} /> Add
                        </button>
                        <button
                          onClick={() => reject(drug.id, drug.name)}
                          className="flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                        >
                          <XCircle size={12} /> Skip
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-gray-500">
                {(page - 1) * 30 + 1}–{Math.min(page * 30, data.total)} of {data.total}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-ghost p-1 disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                  disabled={page === data.pages}
                  className="btn-ghost p-1 disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Approve modal */}
      {approving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-bold text-gray-900">Add to Catalog</h2>
            <p className="mb-4 text-sm text-gray-500">
              <strong>{approving.brandName || approving.name}</strong>
              {approving.genericName && ` (${approving.genericName})`}
              {approving.manufacturer && ` · ${approving.manufacturer}`}
            </p>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Cost Price (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Leave blank to set later"
                    className="input text-sm"
                    value={approveForm.costPrice}
                    onChange={(e) => setApproveForm((f) => ({ ...f, costPrice: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Sale Price (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Leave blank to set later"
                    className="input text-sm"
                    value={approveForm.salePrice}
                    onChange={(e) => setApproveForm((f) => ({ ...f, salePrice: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    className="input text-sm"
                    value={approveForm.taxRate}
                    onChange={(e) => setApproveForm((f) => ({ ...f, taxRate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Reorder Point</label>
                  <input
                    type="number"
                    min="0"
                    className="input text-sm"
                    value={approveForm.reorderPoint}
                    onChange={(e) => setApproveForm((f) => ({ ...f, reorderPoint: e.target.value }))}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">
                You can fill prices later from the Products page. The medicine will be added as inactive until you set a price.
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setApproving(null)} className="btn-ghost">Cancel</button>
              <button onClick={confirmApprove} disabled={approveSaving} className="btn-primary">
                {approveSaving ? 'Adding…' : 'Add to Catalog'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
