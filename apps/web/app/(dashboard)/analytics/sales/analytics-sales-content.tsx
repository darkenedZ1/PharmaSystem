'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  TrendingUp,
  DollarSign,
  Receipt,
  CreditCard,
  Printer,
  Download,
  Calendar,
  Layers,
  Award,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';

interface SalesReportData {
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    totalTax: number;
    totalDiscount: number;
    avgOrderValue: number;
  };
  byDate: {
    date: string;
    revenue: number;
    transactions: number;
    tax: number;
    discount: number;
  }[];
  topProducts: {
    productId: string;
    name: string;
    qty: number;
    revenue: number;
  }[];
  paymentMethods: {
    method: string;
    count: number;
    amount: number;
  }[];
}

const pkr = (n: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

export function AnalyticsSalesContent() {
  const [data, setData] = useState<SalesReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/sales', { params: { from, to } });
      setData(res.data);
    } catch {
      toast.error('Failed to load sales report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [from, to]);

  const exportCsv = () => {
    if (!data) return;

    const headers = ['Date', 'Revenue (PKR)', 'Transactions', 'Sales Tax', 'Discount'];
    const rows = data.byDate.map((d) => [
      d.date,
      d.revenue.toFixed(2),
      d.transactions,
      d.tax.toFixed(2),
      d.discount.toFixed(2),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sales_Analytics_${from}_to_${to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Sales report CSV downloaded');
  };

  const maxDailyRevenue = data?.byDate.length
    ? Math.max(...data.byDate.map((d) => d.revenue), 1)
    : 1;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto print:p-0">
      {/* Header toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Sales Analytics & Revenue Performance</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Real-time sales velocity, revenue trends, basket sizes, payment mix, and best-selling medications.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5 shadow-sm">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              className="text-xs border-0 focus:ring-0 p-0 text-gray-700"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="date"
              className="text-xs border-0 focus:ring-0 p-0 text-gray-700"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <button
            onClick={exportCsv}
            className="btn-secondary inline-flex items-center gap-1.5 text-xs font-semibold"
          >
            <Download size={14} /> Export CSV
          </button>

          <button
            onClick={() => window.print()}
            className="btn-primary inline-flex items-center gap-1.5 text-xs font-semibold"
          >
            <Printer size={14} /> Print Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-20 text-gray-400">
          <RefreshCw className="animate-spin mr-2 h-5 w-5" />
          Aggregating sales analytics...
        </div>
      ) : !data ? (
        <div className="card text-center py-16 text-gray-400">No sales data found</div>
      ) : (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="card p-4">
              <span className="text-xs font-medium text-gray-500">Total Net Sales</span>
              <p className="text-2xl font-bold text-gray-900 mt-1">{pkr(data.summary.totalRevenue)}</p>
              <span className="text-[10px] text-emerald-600 font-medium">Completed POS volume</span>
            </div>

            <div className="card p-4">
              <span className="text-xs font-medium text-gray-500">Total Transactions</span>
              <p className="text-2xl font-bold text-gray-900 mt-1">{data.summary.totalTransactions}</p>
              <span className="text-[10px] text-gray-400">Invoices billed</span>
            </div>

            <div className="card p-4">
              <span className="text-xs font-medium text-blue-600">Average Basket (AOV)</span>
              <p className="text-2xl font-bold text-blue-600 mt-1">{pkr(data.summary.avgOrderValue)}</p>
              <span className="text-[10px] text-gray-400">Per patient order</span>
            </div>

            <div className="card p-4">
              <span className="text-xs font-medium text-purple-600">Sales Tax (GST)</span>
              <p className="text-2xl font-bold text-purple-600 mt-1">{pkr(data.summary.totalTax)}</p>
              <span className="text-[10px] text-purple-500">FBR output tax</span>
            </div>

            <div className="card p-4">
              <span className="text-xs font-medium text-amber-600">Discounts Conceded</span>
              <p className="text-2xl font-bold text-amber-600 mt-1">{pkr(data.summary.totalDiscount)}</p>
              <span className="text-[10px] text-amber-600">Loyalty & promo</span>
            </div>
          </div>

          {/* Daily Sales Chart & Payment Methods Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily Trend */}
            <div className="card lg:col-span-2 p-5 space-y-4">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-600" />
                Daily Revenue Velocity
              </h2>

              {data.byDate.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs">No daily records</div>
              ) : (
                <div className="space-y-2 pt-2">
                  {data.byDate.slice(-10).map((d) => {
                    const pct = Math.round((d.revenue / maxDailyRevenue) * 100);
                    return (
                      <div key={d.date} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-mono text-gray-600">
                            {new Date(d.date).toLocaleDateString('en-PK', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <span className="font-bold text-gray-900">{pkr(d.revenue)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(pct, 4)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Payment Method Distribution */}
            <div className="card p-5 space-y-4">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <CreditCard size={16} className="text-purple-600" />
                Payment Channels Mix
              </h2>

              <div className="space-y-3 pt-1">
                {data.paymentMethods.map((pm) => (
                  <div key={pm.method} className="p-3 rounded-xl border bg-gray-50/50 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-gray-800 uppercase tracking-wide">
                        {pm.method.replace('_', ' ')}
                      </span>
                      <span className="font-bold text-gray-900">{pkr(pm.amount)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-500">
                      <span>{pm.count} transactions</span>
                      <span>
                        {data.summary.totalRevenue > 0
                          ? Math.round((pm.amount / data.summary.totalRevenue) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Selling Products Leaderboard */}
          <div className="card overflow-hidden p-0">
            <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-bold text-gray-900">
                  Top 10 High-Revenue Medicines & Products
                </h2>
              </div>
              <span className="text-xs text-gray-500">Fastest selling SKUs</span>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-gray-600 font-semibold border-b">
                <tr>
                  <th className="px-4 py-3 text-center">Rank</th>
                  <th className="px-4 py-3">Medicine / Product</th>
                  <th className="px-4 py-3 text-right">Units Sold</th>
                  <th className="px-4 py-3 text-right">Total Revenue (PKR)</th>
                  <th className="px-4 py-3 text-right">Revenue Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.topProducts.map((p, idx) => {
                  const share = data.summary.totalRevenue > 0
                    ? ((p.revenue / data.summary.totalRevenue) * 100).toFixed(1)
                    : '0';
                  return (
                    <tr key={p.productId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-center font-bold text-gray-500">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{p.name}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-700">{p.qty} units</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-blue-700">{pkr(p.revenue)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="badge-blue text-[10px] font-semibold">{share}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
