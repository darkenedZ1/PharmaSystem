'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { AlertTriangle, TrendingUp, ShoppingCart, Package } from 'lucide-react';

interface DashboardStats {
  today: { revenue: number; transactions: number };
  allTime: { revenue: number };
  alerts: { lowStock: number; nearExpiry: number };
}

export function DashboardContent() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    if (!user?.enabledModules.includes('reports')) return;
    api.get('/reports/dashboard').then((r) => setStats(r.data));
  }, [user]);

  const pkr = (n: number) =>
    new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Good morning 👋</h1>
        <p className="mt-1 text-gray-500">Here's what's happening at {user?.name} today.</p>
      </div>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Today's Revenue"
            value={pkr(stats.today.revenue)}
            sub={`${stats.today.transactions} transactions`}
            icon={<TrendingUp size={20} className="text-green-600" />}
            color="green"
          />
          <StatCard
            label="All-Time Revenue"
            value={pkr(stats.allTime.revenue)}
            icon={<ShoppingCart size={20} className="text-blue-600" />}
            color="blue"
          />
          <StatCard
            label="Low Stock Items"
            value={String(stats.alerts.lowStock)}
            sub="Need reordering"
            icon={<Package size={20} className="text-red-600" />}
            color="red"
            alert={stats.alerts.lowStock > 0}
          />
          <StatCard
            label="Near Expiry"
            value={String(stats.alerts.nearExpiry)}
            sub="Within 90 days"
            icon={<AlertTriangle size={20} className="text-yellow-600" />}
            color="yellow"
            alert={stats.alerts.nearExpiry > 0}
          />
        </div>
      )}

      {!user?.enabledModules.includes('reports') && (
        <div className="card mt-4">
          <p className="text-sm text-gray-500">Enable the <strong>Reports & Analytics</strong> module to see your dashboard stats.</p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label, value, sub, icon, color, alert,
}: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; color: string; alert?: boolean;
}) {
  return (
    <div className={`card ${alert ? 'ring-2 ring-red-200' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        </div>
        <div className={`rounded-lg p-2 bg-${color}-50`}>{icon}</div>
      </div>
    </div>
  );
}
