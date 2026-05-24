'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { TrendingUp, Package, AlertTriangle, ShoppingCart, BarChart2 } from 'lucide-react';

interface SalesReport {
  summary: { totalRevenue: number; totalTransactions: number; totalTax: number; totalDiscount: number; avgOrderValue: number };
  byDate: { date: string; revenue: number; transactions: number }[];
  topProducts: { productId: string; name: string; qty: number; revenue: number }[];
  paymentMethods: { method: string; count: number; amount: number }[];
}

interface InventoryReport {
  nearExpiry30Days: any[];
  outOfStock: { id: string; name: string }[];
  belowReorder: { id: string; name: string; totalStock: number; reorderPoint: number }[];
  totalStockValue: number;
}

const pkr = (n: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

export function AnalyticsContent() {
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [invReport, setInvReport] = useState<InventoryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'sales' | 'inventory'>('sales');
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const loadSales = async () => {
    try {
      const res = await api.get('/reports/sales', { params: { from, to } });
      setSalesReport(res.data);
    } catch {
      toast.error('Failed to load sales report');
    }
  };

  const loadInventory = async () => {
    try {
      const res = await api.get('/reports/inventory');
      setInvReport(res.data);
    } catch {
      toast.error('Failed to load inventory report');
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadSales(), loadInventory()]).finally(() => setLoading(false));
  }, []);

  const handleDateChange = () => { setLoading(true); loadSales().finally(() => setLoading(false)); };

  const maxRevenue = salesReport?.byDate.reduce((m, d) => Math.max(m, d.revenue), 0) ?? 1;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <div className="flex gap-2">
          <div className="flex rounded-lg border bg-white overflow-hidden text-sm">
            <button onClick={() => setTab('sales')} className={`px-3 py-1.5 ${tab === 'sales' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Sales</button>
            <button onClick={() => setTab('inventory')} className={`px-3 py-1.5 ${tab === 'inventory' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Inventory</button>
          </div>
        </div>
      </div>

      {tab === 'sales' && (
        <>
          <div className="mb-4 flex gap-2 items-end">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">From</label>
              <input type="date" className="input text-sm w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">To</label>
              <input type="date" className="input text-sm w-40" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <button onClick={handleDateChange} className="btn-primary">Apply</button>
          </div>

          {loading || !salesReport ? (
            <div className="card flex items-center justify-center py-12 text-gray-400">Loading...</div>
          ) : (
            <>
              <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Revenue', value: pkr(salesReport.summary.totalRevenue), icon: <TrendingUp size={18} className="text-green-600" />, color: 'green' },
                  { label: 'Transactions', value: String(salesReport.summary.totalTransactions), icon: <ShoppingCart size={18} className="text-blue-600" />, color: 'blue' },
                  { label: 'Avg Order', value: pkr(salesReport.summary.avgOrderValue), icon: <BarChart2 size={18} className="text-purple-600" />, color: 'purple' },
                  { label: 'Tax Collected', value: pkr(salesReport.summary.totalTax), icon: <Package size={18} className="text-orange-600" />, color: 'orange' },
                ].map((stat) => (
                  <div key={stat.label} className="card">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{stat.label}</p>
                        <p className="mt-1 text-xl font-bold text-gray-900">{stat.value}</p>
                      </div>
                      <div className={`rounded-lg p-2 bg-${stat.color}-50`}>{stat.icon}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Revenue bar chart */}
              {salesReport.byDate.length > 0 && (
                <div className="card mb-4">
                  <h3 className="mb-4 text-sm font-semibold text-gray-700">Daily Revenue</h3>
                  <div className="flex items-end gap-1 h-32">
                    {salesReport.byDate.map((d) => (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                        <div
                          className="w-full rounded-t bg-blue-500 hover:bg-blue-600 transition-colors"
                          style={{ height: `${(d.revenue / maxRevenue) * 100}%`, minHeight: d.revenue > 0 ? 2 : 0 }}
                          title={`${d.date}: ${pkr(d.revenue)}`}
                        />
                        <span className="text-[9px] text-gray-400 truncate w-full text-center">
                          {new Date(d.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                {/* Top products */}
                <div className="card">
                  <h3 className="mb-3 text-sm font-semibold text-gray-700">Top Products</h3>
                  <div className="space-y-2">
                    {salesReport.topProducts.slice(0, 8).map((p, i) => (
                      <div key={p.productId} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                          <span className="text-gray-800 truncate max-w-[180px]">{p.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">{pkr(p.revenue)}</p>
                          <p className="text-xs text-gray-400">{p.qty} units</p>
                        </div>
                      </div>
                    ))}
                    {salesReport.topProducts.length === 0 && <p className="text-sm text-gray-400">No sales in this period</p>}
                  </div>
                </div>

                {/* Payment methods */}
                <div className="card">
                  <h3 className="mb-3 text-sm font-semibold text-gray-700">Payment Methods</h3>
                  <div className="space-y-2">
                    {salesReport.paymentMethods.map((pm) => (
                      <div key={pm.method} className="flex items-center justify-between text-sm">
                        <span className="capitalize text-gray-700">{pm.method}</span>
                        <div className="text-right">
                          <p className="font-medium">{pkr(pm.amount)}</p>
                          <p className="text-xs text-gray-400">{pm.count} txns</p>
                        </div>
                      </div>
                    ))}
                    {salesReport.paymentMethods.length === 0 && <p className="text-sm text-gray-400">No data</p>}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {tab === 'inventory' && (
        <>
          {loading || !invReport ? (
            <div className="card flex items-center justify-center py-12 text-gray-400">Loading...</div>
          ) : (
            <>
              <div className="mb-4 grid gap-4 sm:grid-cols-3">
                <div className="card">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Stock Value</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">{pkr(invReport.totalStockValue)}</p>
                </div>
                <div className="card">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Out of Stock</p>
                  <p className={`mt-1 text-xl font-bold ${invReport.outOfStock.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {invReport.outOfStock.length} products
                  </p>
                </div>
                <div className="card">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Expiring in 30 Days</p>
                  <p className={`mt-1 text-xl font-bold ${invReport.nearExpiry30Days.length > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                    {invReport.nearExpiry30Days.length} batches
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="card">
                  <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-orange-700">
                    <AlertTriangle size={14} /> Near Expiry (30 days)
                  </h3>
                  {invReport.nearExpiry30Days.length === 0 ? (
                    <p className="text-sm text-gray-400">No batches expiring soon</p>
                  ) : (
                    <div className="space-y-2">
                      {invReport.nearExpiry30Days.map((b: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div>
                            <p className="font-medium text-gray-800">{b.product.name}</p>
                            <p className="text-xs text-gray-400">Batch {b.batchNumber}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-orange-600 font-medium">{new Date(b.expiryDate).toLocaleDateString('en-PK')}</p>
                            <p className="text-xs text-gray-400">{b.stockLevels.reduce((s: number, l: any) => s + l.quantity, 0)} units</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card">
                  <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-red-700">
                    <Package size={14} /> Below Reorder Point
                  </h3>
                  {invReport.belowReorder.length === 0 ? (
                    <p className="text-sm text-gray-400">All products above reorder point</p>
                  ) : (
                    <div className="space-y-2">
                      {invReport.belowReorder.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between text-sm">
                          <p className="font-medium text-gray-800">{p.name}</p>
                          <div className="text-right">
                            <p className="text-red-600 font-medium">{p.totalStock} left</p>
                            <p className="text-xs text-gray-400">reorder at {p.reorderPoint}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
