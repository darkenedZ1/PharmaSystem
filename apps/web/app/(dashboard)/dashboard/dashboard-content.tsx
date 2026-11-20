'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import {
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
  Package,
  ArrowRight,
  PlusCircle,
  Pill,
  Clock,
  Layers,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

interface DashboardStats {
  today: { revenue: number; transactions: number };
  month: { revenue: number; transactions: number };
  allTime: { revenue: number };
  alerts: {
    lowStock: number;
    nearExpiry: number;
    nearExpiry30Days: number;
    nearExpiry90Days: number;
    pendingPOs: number;
  };
}

interface RecentSale {
  id: string;
  invoiceNumber: string;
  total: number;
  saleDate: string;
  status: string;
  fbrSyncStatus?: string;
  customer?: { name: string; phone?: string };
  cashier?: { name: string };
  items?: { id: string }[];
}

interface NearExpiryItem {
  id: string;
  batchNumber: string;
  expiryDate: string;
  product: { name: string; salePrice: number };
  stockLevels: { quantity: number; branch: { name: string } }[];
}

interface LowStockItem {
  id: string;
  name: string;
  genericName?: string;
  reorderPoint: number;
  totalStock: number;
  unitOfMeasure?: string;
}

export function DashboardContent() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [nearExpiryItems, setNearExpiryItems] = useState<NearExpiryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token && !user) return;

    setLoading(true);
    Promise.allSettled([
      api.get('/reports/dashboard'),
      api.get('/pos/sales'),
      api.get('/inventory/low-stock'),
      api.get('/inventory/expiry', { params: { days: 90 } }),
    ])
      .then(([dashRes, salesRes, lowStockRes, expiryRes]) => {
        if (dashRes.status === 'fulfilled' && dashRes.value.data) {
          setStats(dashRes.value.data);
        }
        if (salesRes.status === 'fulfilled' && Array.isArray(salesRes.value.data)) {
          setRecentSales(salesRes.value.data.slice(0, 5));
        }
        if (lowStockRes.status === 'fulfilled' && Array.isArray(lowStockRes.value.data)) {
          setLowStockItems(lowStockRes.value.data.slice(0, 4));
        }
        if (expiryRes.status === 'fulfilled' && Array.isArray(expiryRes.value.data)) {
          setNearExpiryItems(expiryRes.value.data.slice(0, 4));
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user, token]);

  const pkr = (n: number) =>
    new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0,
    }).format(n ?? 0);

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-PK', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  const formatTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString('en-PK', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Good day, {user?.name ?? 'Pharmacist'} 👋</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome to SmartBiz Pharmacy Management. Here is your store's live status today.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/pos"
            className="btn-primary"
          >
            <ShoppingCart size={16} />
            <span>Open POS Terminal</span>
          </Link>
          <Link
            href="/inventory/products"
            className="btn-ghost border bg-white shadow-sm"
          >
            <PlusCircle size={16} />
            <span>Manage Medicines</span>
          </Link>
        </div>
      </div>

      {/* Quick Action Navigation Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/pos"
          className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-blue-300 hover:shadow transition-all group"
        >
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <ShoppingCart size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Point of Sale</p>
            <p className="text-sm font-semibold text-gray-900">New Sale</p>
          </div>
        </Link>

        <Link
          href="/inventory/products"
          className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-emerald-300 hover:shadow transition-all group"
        >
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <Pill size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Medicine Directory</p>
            <p className="text-sm font-semibold text-gray-900">25+ Products</p>
          </div>
        </Link>

        <Link
          href="/inventory/expiry"
          className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-amber-300 hover:shadow transition-all group"
        >
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <AlertTriangle size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Near Expiry</p>
            <p className="text-sm font-semibold text-gray-900">Batch Tracker</p>
          </div>
        </Link>

        <Link
          href="/inventory/stock"
          className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-purple-300 hover:shadow transition-all group"
        >
          <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <Layers size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Inventory</p>
            <p className="text-sm font-semibold text-gray-900">Stock Levels</p>
          </div>
        </Link>
      </div>

      {/* Loading Skeleton */}
      {loading && !stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-100 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      )}

      {/* Main KPI Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Today's Revenue"
            value={pkr(stats.today.revenue)}
            sub={`${stats.today.transactions} completed orders`}
            icon={<TrendingUp size={20} className="text-emerald-600" />}
            color="emerald"
          />
          <StatCard
            label="Month Revenue"
            value={pkr(stats.month?.revenue ?? stats.allTime.revenue)}
            sub={`${stats.month?.transactions ?? stats.today.transactions} monthly sales`}
            icon={<ShoppingCart size={20} className="text-blue-600" />}
            color="blue"
          />
          <StatCard
            label="Low Stock Items"
            value={String(stats.alerts.lowStock ?? 0)}
            sub="At or below reorder level"
            icon={<Package size={20} className="text-red-600" />}
            color="red"
            alert={(stats.alerts.lowStock ?? 0) > 0}
            href="/inventory/stock"
          />
          <StatCard
            label="Near Expiry Batches"
            value={String(stats.alerts.nearExpiry ?? stats.alerts.nearExpiry90Days ?? 0)}
            sub="Expiring within 90 days"
            icon={<AlertTriangle size={20} className="text-amber-600" />}
            color="amber"
            alert={(stats.alerts.nearExpiry ?? stats.alerts.nearExpiry90Days ?? 0) > 0}
            href="/inventory/expiry"
          />
        </div>
      )}

      {/* Two Column Grid: Recent Sales & Inventory Alerts */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Recent Sales (4 cols) */}
        <div className="card lg:col-span-4 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b mb-3">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-blue-600" />
                <h2 className="text-base font-semibold text-gray-900">Recent Sales Activity</h2>
              </div>
              <Link
                href="/pos/sales"
                className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                View all <ArrowRight size={12} />
              </Link>
            </div>

            {recentSales.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">
                          {sale.invoiceNumber}
                        </span>
                        <span className="badge-green text-[10px]">
                          {sale.status}
                        </span>
                        {sale.fbrSyncStatus === 'success' && (
                          <span className="badge-blue text-[10px]">
                            FBR Synced
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {sale.customer?.name ?? 'Walk-in Customer'} • {formatDate(sale.saleDate)} {formatTime(sale.saleDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{pkr(sale.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-400">
                <ShoppingCart size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No sales recorded yet today.</p>
                <Link href="/pos" className="btn-primary mt-3 text-xs inline-flex">
                  Record First Sale
                </Link>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t bg-gray-50 -mx-5 -mb-5 px-5 py-3 rounded-b-xl flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">All sales automatically sync with FBR & Stock</span>
            <Link href="/pos" className="text-xs font-semibold text-blue-600 hover:underline">
              Go to POS →
            </Link>
          </div>
        </div>

        {/* Inventory Critical Alerts (3 cols) */}
        <div className="card lg:col-span-3 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                <h2 className="text-base font-semibold text-gray-900">Inventory Attention</h2>
              </div>
              <Link
                href="/inventory/expiry"
                className="text-xs font-medium text-amber-600 hover:text-amber-800 flex items-center gap-1"
              >
                Manage <ArrowRight size={12} />
              </Link>
            </div>

            <div className="space-y-3">
              {/* Near Expiry section */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Near Expiry Medicines (≤ 90 Days)
                </p>
                {nearExpiryItems.length > 0 ? (
                  <div className="space-y-1.5">
                    {nearExpiryItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-amber-950">{item.product.name}</p>
                          <p className="text-amber-700 text-[11px]">
                            Batch {item.batchNumber} • Expires {formatDate(item.expiryDate)}
                          </p>
                        </div>
                        <span className="badge-yellow text-[11px] font-semibold">
                          {item.stockLevels?.reduce((acc, s) => acc + s.quantity, 0) ?? 0} left
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 py-1 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500" /> No batches expiring soon.
                  </p>
                )}
              </div>

              {/* Low Stock section */}
              <div className="pt-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Low Stock Medicines
                </p>
                {lowStockItems.length > 0 ? (
                  <div className="space-y-1.5">
                    {lowStockItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-lg bg-red-50 border border-red-200/60 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-red-950">{item.name}</p>
                          <p className="text-red-700 text-[11px]">
                            Reorder point: {item.reorderPoint} {item.unitOfMeasure ?? 'units'}
                          </p>
                        </div>
                        <span className="badge-red text-[11px] font-semibold">
                          {item.totalStock} in stock
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 py-1 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500" /> All stocks above reorder level.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t bg-gray-50 -mx-5 -mb-5 px-5 py-3 rounded-b-xl flex items-center justify-between">
            <span className="text-xs text-gray-500">25 medicines currently tracked</span>
            <Link href="/inventory/products" className="text-xs font-semibold text-blue-600 hover:underline">
              View All Medicines →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  color,
  alert,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  alert?: boolean;
  href?: string;
}) {
  const content = (
    <div
      className={`card transition-shadow hover:shadow-md ${
        alert ? 'ring-2 ring-red-300 bg-red-50/20' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        </div>
        <div className="rounded-xl p-2.5 bg-gray-50 border border-gray-100">{icon}</div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }

  return content;
}
