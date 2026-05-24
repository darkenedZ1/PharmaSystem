'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';

interface PnlAccount {
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: number;
}

interface PnlData {
  revenue: PnlAccount[];
  expenses: PnlAccount[];
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}

const pkr = (n: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

const now = new Date();
const janFirst = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
const todayStr = now.toISOString().slice(0, 10);

export function PnlContent() {
  const [data, setData] = useState<PnlData | null>(null);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState(janFirst);
  const [to, setTo] = useState(todayStr);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/accounts/pnl', { params: { from, to } });
      setData(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load P&L statement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [from, to]);

  const isProfit = data ? data.netProfit >= 0 : true;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit & Loss Statement</h1>
          <p className="mt-1 text-sm text-gray-500">
            {new Date(from).toLocaleDateString('en-PK')} — {new Date(to).toLocaleDateString('en-PK')}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12 text-gray-400">Loading statement...</div>
      ) : !data ? (
        <div className="card flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
          <BarChart2 size={40} />
          <p>No data available for the selected period</p>
        </div>
      ) : (
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Revenue Section */}
          <div className="card">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-green-600" />
              <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide">Revenue</h2>
            </div>
            <div className="space-y-2">
              {data.revenue.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">No revenue accounts</p>
              ) : (
                data.revenue.map((acc) => (
                  <div key={acc.accountId} className="flex justify-between text-sm py-1">
                    <span className="text-gray-700">
                      <span className="font-mono text-xs text-gray-400 mr-2">{acc.accountCode}</span>
                      {acc.accountName}
                    </span>
                    <span className="font-medium text-gray-900">{pkr(Number(acc.amount))}</span>
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 flex justify-between border-t pt-3 font-semibold">
              <span className="text-gray-700">Total Revenue</span>
              <span className="text-green-700 text-base">{pkr(Number(data.totalRevenue))}</span>
            </div>
          </div>

          {/* Expenses Section */}
          <div className="card">
            <div className="mb-4 flex items-center gap-2">
              <TrendingDown size={18} className="text-red-500" />
              <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide">Expenses</h2>
            </div>
            <div className="space-y-2">
              {data.expenses.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">No expense accounts</p>
              ) : (
                data.expenses.map((acc) => (
                  <div key={acc.accountId} className="flex justify-between text-sm py-1">
                    <span className="text-gray-700">
                      <span className="font-mono text-xs text-gray-400 mr-2">{acc.accountCode}</span>
                      {acc.accountName}
                    </span>
                    <span className="font-medium text-gray-900">{pkr(Number(acc.amount))}</span>
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 flex justify-between border-t pt-3 font-semibold">
              <span className="text-gray-700">Total Expenses</span>
              <span className="text-red-600 text-base">{pkr(Number(data.totalExpenses))}</span>
            </div>
          </div>

          {/* Net Profit / Loss */}
          <div className={`rounded-xl border-2 p-6 ${isProfit ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isProfit ? (
                  <TrendingUp size={28} className="text-green-600" />
                ) : (
                  <TrendingDown size={28} className="text-red-600" />
                )}
                <div>
                  <p className={`text-sm font-medium ${isProfit ? 'text-green-700' : 'text-red-700'}`}>
                    {isProfit ? 'Net Profit' : 'Net Loss'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(from).toLocaleDateString('en-PK')} — {new Date(to).toLocaleDateString('en-PK')}
                  </p>
                </div>
              </div>
              <span className={`text-3xl font-bold ${isProfit ? 'text-green-700' : 'text-red-700'}`}>
                {isProfit ? '' : '-'}{pkr(Math.abs(Number(data.netProfit)))}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
