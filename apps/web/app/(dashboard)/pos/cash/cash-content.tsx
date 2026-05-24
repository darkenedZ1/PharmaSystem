'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { DollarSign, Lock, Unlock } from 'lucide-react';

interface DrawerState {
  id: string;
  status: 'open' | 'closed';
  openingCash: number;
  salesTotal: number;
  expectedCash: number;
  openedAt: string;
  openedBy: string;
}

const pkr = (n: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

export function CashDrawerContent() {
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerFound, setDrawerFound] = useState(true);

  // Open drawer form
  const [openingCash, setOpeningCash] = useState('');
  const [openingBusy, setOpeningBusy] = useState(false);

  // Close drawer form
  const [closingCash, setClosingCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [closingBusy, setClosingBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/pos/cash-drawer/current');
      setDrawer(res.data);
      setDrawerFound(true);
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.response?.status === 400) {
        setDrawer(null);
        setDrawerFound(true); // API exists but no open drawer
      } else {
        setDrawerFound(false);
        setDrawer(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openDrawer = async () => {
    if (!openingCash) { toast.error('Enter opening cash amount'); return; }
    setOpeningBusy(true);
    try {
      await api.post('/pos/cash-drawer/open', { openingCash: Number(openingCash) });
      toast.success('Cash drawer opened');
      setOpeningCash('');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to open drawer');
    } finally {
      setOpeningBusy(false);
    }
  };

  const closeDrawer = async () => {
    if (!closingCash) { toast.error('Enter closing cash amount'); return; }
    setClosingBusy(true);
    try {
      await api.post('/pos/cash-drawer/close', {
        closingCash: Number(closingCash),
        notes: closeNotes,
      });
      toast.success('Cash drawer closed');
      setClosingCash('');
      setCloseNotes('');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to close drawer');
    } finally {
      setClosingBusy(false);
    }
  };

  const variance =
    drawer && closingCash
      ? Number(closingCash) - drawer.expectedCash
      : null;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cash Drawer</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your daily cash drawer</p>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Status Card */}
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className={`rounded-full p-2 ${drawer ? 'bg-green-100' : 'bg-gray-100'}`}>
                {drawer ? (
                  <Unlock size={20} className="text-green-600" />
                ) : (
                  <Lock size={20} className="text-gray-500" />
                )}
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Drawer Status</h2>
                <span className={drawer ? 'badge-green' : 'badge-gray'}>
                  {drawer ? 'Open' : 'Closed'}
                </span>
              </div>
            </div>

            {drawer ? (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Opened At</dt>
                  <dd className="font-medium text-gray-900">
                    {new Date(drawer.openedAt).toLocaleTimeString('en-PK')}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Opened By</dt>
                  <dd className="font-medium text-gray-900">{drawer.openedBy}</dd>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <dt className="text-gray-500">Opening Cash</dt>
                  <dd className="font-medium text-gray-900">{pkr(Number(drawer.openingCash))}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Sales Total</dt>
                  <dd className="font-medium text-green-600">+ {pkr(Number(drawer.salesTotal ?? 0))}</dd>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <dt className="font-semibold text-gray-700">Expected Cash</dt>
                  <dd className="text-lg font-bold text-gray-900">{pkr(Number(drawer.expectedCash ?? (Number(drawer.openingCash) + Number(drawer.salesTotal ?? 0))))}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No drawer is currently open</p>
            )}
          </div>

          {/* Action Card */}
          {drawer ? (
            <div className="card">
              <h2 className="mb-4 font-semibold text-gray-900">Close Drawer</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Actual Closing Cash (PKR)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Enter counted cash amount"
                    value={closingCash}
                    onChange={(e) => setClosingCash(e.target.value)}
                  />
                </div>

                {variance !== null && (
                  <div className={`rounded-lg p-3 text-sm ${variance >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    <span className="font-medium">Variance: </span>
                    {variance >= 0 ? '+' : ''}{pkr(variance)}
                    {Math.abs(variance) > 0 && (
                      <span className="ml-1 text-xs">({variance > 0 ? 'overage' : 'shortage'})</span>
                    )}
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Notes (optional)</label>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Any notes about the closing..."
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                  />
                </div>

                <button
                  onClick={closeDrawer}
                  disabled={closingBusy}
                  className="btn-primary w-full justify-center"
                >
                  <Lock size={16} />
                  {closingBusy ? 'Closing…' : 'Close Drawer'}
                </button>
              </div>
            </div>
          ) : (
            <div className="card">
              <h2 className="mb-4 font-semibold text-gray-900">Open Drawer</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Opening Cash (PKR)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Enter starting cash amount"
                    value={openingCash}
                    onChange={(e) => setOpeningCash(e.target.value)}
                  />
                </div>
                <button
                  onClick={openDrawer}
                  disabled={openingBusy}
                  className="btn-primary w-full justify-center"
                >
                  <Unlock size={16} />
                  {openingBusy ? 'Opening…' : 'Open Drawer'}
                </button>
              </div>

              {!drawerFound && (
                <p className="mt-4 text-xs text-amber-600 bg-amber-50 rounded p-2">
                  Cash drawer API is not yet available. Drawer management will be functional once the API is deployed.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
