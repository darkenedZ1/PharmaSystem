'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  Download,
  Printer,
  ChevronRight,
  TrendingUp,
  Building2,
  Wallet,
  ShieldCheck,
} from 'lucide-react';

interface AccountItem {
  id: string;
  code: string;
  name: string;
  accountType: string;
  debit: number;
  credit: number;
  balance: number;
}

interface BalanceSheetData {
  asOf: string;
  assets: {
    items: AccountItem[];
    total: number;
  };
  liabilities: {
    items: AccountItem[];
    total: number;
  };
  equity: {
    items: AccountItem[];
    currentYearEarnings: number;
    total: number;
  };
  totalAssets: number;
  totalLiabilitiesAndEquity: number;
  workingCapital: number;
  debtToEquityRatio: number;
  isBalanced: boolean;
  difference: number;
}

const pkr = (n: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

const todayStr = new Date().toISOString().slice(0, 10);

export function BalanceSheetContent() {
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [asOf, setAsOf] = useState(todayStr);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/accounts/balance-sheet', { params: { asOf } });
      setData(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load Balance Sheet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [asOf]);

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ['Account Code', 'Account Name', 'Category', 'Balance (PKR)'],
      ...data.assets.items.map((a) => [a.code, a.name, 'Asset', a.balance.toString()]),
      ['', 'Total Assets', '', data.totalAssets.toString()],
      ...data.liabilities.items.map((l) => [l.code, l.name, 'Liability', l.balance.toString()]),
      ['', 'Total Liabilities', '', data.liabilities.total.toString()],
      ...data.equity.items.map((e) => [e.code, e.name, 'Equity', e.balance.toString()]),
      ['', 'Current Period Net Earnings', 'Equity', data.equity.currentYearEarnings.toString()],
      ['', 'Total Liabilities & Equity', '', data.totalLiabilitiesAndEquity.toString()],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Balance_Sheet_${asOf}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Balance sheet exported to CSV');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto print:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 print:border-none">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="h-7 w-7 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Balance Sheet</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Statement of Financial Position • As of {new Date(asOf).toLocaleDateString('en-PK', { dateStyle: 'long' })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5 shadow-sm">
            <span className="text-xs font-medium text-gray-500">As of Date:</span>
            <input
              type="date"
              className="text-sm font-medium text-gray-800 focus:outline-none cursor-pointer"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
            />
          </div>

          <button onClick={exportCSV} className="btn-ghost border bg-white shadow-sm text-gray-700">
            <Download size={15} /> Export CSV
          </button>

          <button onClick={() => window.print()} className="btn-ghost border bg-white shadow-sm text-gray-700">
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-20 text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          Calculating Statement of Financial Position...
        </div>
      ) : !data ? (
        <div className="card text-center py-16 text-gray-400">No accounting data found for this date.</div>
      ) : (
        <>
          {/* Key Financial Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
            <div className="card bg-gradient-to-br from-blue-50/60 to-white border-blue-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Total Assets</span>
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{pkr(data.totalAssets)}</p>
              <span className="text-xs text-gray-500 mt-1 block">Cash, Bank, Receivables & Inventory</span>
            </div>

            <div className="card bg-gradient-to-br from-amber-50/60 to-white border-amber-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Total Liabilities</span>
                <Building2 className="h-5 w-5 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{pkr(data.liabilities.total)}</p>
              <span className="text-xs text-gray-500 mt-1 block">Distributor Payables & Taxes</span>
            </div>

            <div className="card bg-gradient-to-br from-emerald-50/60 to-white border-emerald-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Total Equity</span>
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{pkr(data.equity.total)}</p>
              <span className="text-xs text-gray-500 mt-1 block">Owner Capital & Retained Earnings</span>
            </div>

            <div className="card bg-gradient-to-br from-purple-50/60 to-white border-purple-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Accounting Health</span>
                <ShieldCheck className="h-5 w-5 text-purple-600" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                {data.isBalanced ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                    <CheckCircle2 size={14} className="text-green-600" /> Balanced
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                    <AlertTriangle size={14} className="text-red-600" /> Variance: {pkr(data.difference)}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500 mt-1 block">
                Working Capital: <strong className="text-gray-800">{pkr(data.workingCapital)}</strong>
              </span>
            </div>
          </div>

          {/* Detailed Statement Table Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">
            {/* ASSETS COLUMN */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-600"></div>
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight">ASSETS</h2>
                </div>
                <span className="text-xs font-semibold text-gray-500 uppercase">Current & Non-Current</span>
              </div>

              <div className="divide-y divide-gray-100">
                {data.assets.items.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4">No asset accounts found</p>
                ) : (
                  data.assets.items.map((acc) => (
                    <div key={acc.id} className="py-2.5 flex items-center justify-between text-sm hover:bg-gray-50/50 px-1 rounded transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{acc.code}</span>
                        <span className="text-gray-800 font-medium">{acc.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900">{pkr(acc.balance)}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Total Assets Footer */}
              <div className="mt-4 pt-4 border-t-2 border-gray-900 flex items-center justify-between bg-blue-50/30 p-3 rounded-lg">
                <span className="text-base font-bold text-gray-900 uppercase">TOTAL ASSETS</span>
                <span className="text-xl font-extrabold text-blue-700">{pkr(data.totalAssets)}</span>
              </div>
            </div>

            {/* LIABILITIES & EQUITY COLUMN */}
            <div className="card space-y-6">
              {/* Liabilities Subsection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-amber-600"></div>
                    <h2 className="text-lg font-bold text-gray-900 tracking-tight">LIABILITIES</h2>
                  </div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Payables & Obligations</span>
                </div>

                <div className="divide-y divide-gray-100">
                  {data.liabilities.items.length === 0 ? (
                    <p className="text-sm text-gray-400 py-3">No liability accounts found</p>
                  ) : (
                    data.liabilities.items.map((acc) => (
                      <div key={acc.id} className="py-2.5 flex items-center justify-between text-sm hover:bg-gray-50/50 px-1 rounded transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{acc.code}</span>
                          <span className="text-gray-800 font-medium">{acc.name}</span>
                        </div>
                        <span className="font-semibold text-gray-900">{pkr(acc.balance)}</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between text-sm font-semibold text-gray-700 border-t border-dashed">
                  <span>Total Liabilities:</span>
                  <span>{pkr(data.liabilities.total)}</span>
                </div>
              </div>

              {/* Equity Subsection */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-600"></div>
                    <h2 className="text-lg font-bold text-gray-900 tracking-tight">EQUITY</h2>
                  </div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Capital & Retained Earnings</span>
                </div>

                <div className="divide-y divide-gray-100">
                  {data.equity.items.map((acc) => (
                    <div key={acc.id} className="py-2.5 flex items-center justify-between text-sm hover:bg-gray-50/50 px-1 rounded transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{acc.code}</span>
                        <span className="text-gray-800 font-medium">{acc.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900">{pkr(acc.balance)}</span>
                    </div>
                  ))}

                  <div className="py-2.5 flex items-center justify-between text-sm hover:bg-emerald-50/40 px-1 rounded transition-colors">
                    <div className="flex items-center gap-2">
                      <ChevronRight size={14} className="text-emerald-600" />
                      <span className="text-emerald-900 font-medium">Current Period Net Profit (P&L)</span>
                    </div>
                    <span className={`font-semibold ${data.equity.currentYearEarnings >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {pkr(data.equity.currentYearEarnings)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-sm font-semibold text-gray-700 border-t border-dashed">
                  <span>Total Equity:</span>
                  <span>{pkr(data.equity.total)}</span>
                </div>
              </div>

              {/* Total Liabilities & Equity Footer */}
              <div className="mt-4 pt-4 border-t-2 border-gray-900 flex items-center justify-between bg-amber-50/30 p-3 rounded-lg">
                <span className="text-base font-bold text-gray-900 uppercase">TOTAL LIABILITIES & EQUITY</span>
                <span className="text-xl font-extrabold text-amber-800">{pkr(data.totalLiabilitiesAndEquity)}</span>
              </div>
            </div>
          </div>

          {/* Compliance & Balance Verification Note */}
          <div className="card bg-gray-50/70 border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-blue-600 shrink-0" />
              <span>
                Generated from double-entry journal logs per IFRS and Pakistan Companies Act standards. Total Assets must equal Total Liabilities + Equity.
              </span>
            </div>
            <div className="font-mono text-gray-500 whitespace-nowrap">
              Diff: {pkr(data.difference)} • Status: {data.isBalanced ? 'PERFECTLY BALANCED' : 'REQUIRES RECONCILIATION'}
            </div>
          </div>
        </>
      )}
    </div>
  );
}