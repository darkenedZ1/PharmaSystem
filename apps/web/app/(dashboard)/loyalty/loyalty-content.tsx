'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Save, Star, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface LoyaltyProgram {
  pointsPerRupee: number;
  rupeePerPoint: number;
  pointsExpireDays: number;
  isActive: boolean;
}

interface LoyaltyTransaction {
  id: string;
  createdAt: string;
  customerName: string;
  type: 'earn' | 'redeem' | 'adjust';
  points: number;
  balanceAfter: number;
  notes: string | null;
}

const pkr = (n: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

const TYPE_BADGE: Record<string, string> = {
  earn: 'badge-green',
  redeem: 'badge-blue',
  adjust: 'badge-gray',
};

const TypeIcon = ({ type }: { type: string }) => {
  if (type === 'earn') return <ArrowUp size={12} className="text-green-600" />;
  if (type === 'redeem') return <ArrowDown size={12} className="text-blue-600" />;
  return <Minus size={12} className="text-gray-400" />;
};

export function LoyaltyContent() {
  const [program, setProgram] = useState<LoyaltyProgram>({
    pointsPerRupee: 1,
    rupeePerPoint: 1,
    pointsExpireDays: 365,
    isActive: true,
  });
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loadingProgram, setLoadingProgram] = useState(true);
  const [loadingTx, setLoadingTx] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load program settings
    api.get('/loyalty/program')
      .then((res) => setProgram(res.data))
      .catch(() => { /* use defaults */ })
      .finally(() => setLoadingProgram(false));

    // Load transactions
    api.get('/loyalty/transactions')
      .then((res) => setTransactions(Array.isArray(res.data) ? res.data : (res.data.transactions ?? [])))
      .catch(() => { /* empty state */ })
      .finally(() => setLoadingTx(false));
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/loyalty/program', program);
      toast.success('Loyalty program settings saved');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Loyalty Program</h1>
        <p className="mt-1 text-sm text-gray-500">Manage points, tiers and customer rewards</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Settings Card */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="mb-4 flex items-center gap-2">
              <Star size={18} className="text-yellow-500" />
              <h2 className="font-semibold text-gray-900">Program Settings</h2>
            </div>

            {loadingProgram ? (
              <p className="text-sm text-gray-400 py-4 text-center">Loading...</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Points Earned per PKR 1 Spent
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    className="input text-sm"
                    value={program.pointsPerRupee}
                    onChange={(e) => setProgram((p) => ({ ...p, pointsPerRupee: Number(e.target.value) }))}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    e.g. 1 = customer earns 1 point per rupee
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    PKR Value per Point (Redemption Rate)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    className="input text-sm"
                    value={program.rupeePerPoint}
                    onChange={(e) => setProgram((p) => ({ ...p, rupeePerPoint: Number(e.target.value) }))}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    e.g. 0.5 = 100 points = PKR 50
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Points Expiry (days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="input text-sm"
                    value={program.pointsExpireDays}
                    onChange={(e) => setProgram((p) => ({ ...p, pointsExpireDays: Number(e.target.value) }))}
                  />
                  <p className="mt-1 text-xs text-gray-400">0 = never expire</p>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Program Active</p>
                    <p className="text-xs text-gray-400">Enable/disable the loyalty program</p>
                  </div>
                  <button
                    onClick={() => setProgram((p) => ({ ...p, isActive: !p.isActive }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      program.isActive ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        program.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="btn-primary w-full justify-center"
                >
                  <Save size={16} />
                  {saving ? 'Saving…' : 'Save Settings'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Transactions */}
        <div className="lg:col-span-2">
          <div className="card overflow-hidden p-0">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-900">Recent Transactions</h2>
            </div>
            {loadingTx ? (
              <div className="flex items-center justify-center py-12 text-gray-400">Loading...</div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
                <Star size={40} />
                <p>No loyalty transactions yet</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Points</th>
                    <th className="px-4 py-3 text-right">Balance After</th>
                    <th className="px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(tx.createdAt).toLocaleDateString('en-PK')}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{tx.customerName}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <TypeIcon type={tx.type} />
                          <span className={TYPE_BADGE[tx.type] ?? 'badge-gray'}>{tx.type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={tx.type === 'earn' ? 'text-green-600 font-semibold' : tx.type === 'redeem' ? 'text-blue-600 font-semibold' : 'text-gray-700'}>
                          {tx.type === 'earn' ? '+' : tx.type === 'redeem' ? '-' : ''}{tx.points}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{tx.balanceAfter}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{tx.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
