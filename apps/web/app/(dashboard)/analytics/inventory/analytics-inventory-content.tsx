'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Boxes,
  AlertTriangle,
  Clock,
  Printer,
  Download,
  PackageX,
  TrendingDown,
  RefreshCw,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

interface NearExpiryBatch {
  id: string;
  batchNumber: string;
  expiryDate: string;
  product: {
    name: string;
    salePrice: number;
  };
  stockLevels: {
    quantity: number;
    branch: { name: string };
  }[];
}

interface ReorderProduct {
  id: string;
  name: string;
  genericName?: string;
  reorderPoint: number;
  totalStock: number;
}

interface InventoryReportData {
  totalStockValue: number;
  nearExpiry30Days: NearExpiryBatch[];
  nearExpiry90Days: NearExpiryBatch[];
  outOfStock: { id: string; name: string; genericName?: string; reorderPoint: number }[];
  belowReorder: ReorderProduct[];
}

const pkr = (n: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

export function AnalyticsInventoryContent() {
  const [data, setData] = useState<InventoryReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/inventory');
      setData(res.data);
    } catch {
      toast.error('Failed to load inventory analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const exportCsv = () => {
    if (!data) return;

    const headers = ['Medicine / Product', 'Batch Number', 'Expiry Date', 'Quantity in Stock', 'Status'];
    const rows = (data.nearExpiry90Days || []).map((b) => {
      const qty = b.stockLevels.reduce((s, sl) => s + sl.quantity, 0);
      return [
        `"${b.product.name}"`,
        `"${b.batchNumber}"`,
        new Date(b.expiryDate).toLocaleDateString('en-PK'),
        qty,
        new Date(b.expiryDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000
          ? 'Critical Expiry (<30d)'
          : 'Near Expiry (<90d)',
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Inventory_Health_Expiry_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Inventory report CSV downloaded');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto print:p-0">
      {/* Header toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="h-7 w-7 text-emerald-600" />
            <h1 className="text-2xl font-bold text-gray-900">Inventory Valuation & Health Analytics</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Stock valuation at cost, near-expiry financial exposure risk, and automatic reorder deficit queues.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="btn-secondary inline-flex items-center gap-1.5 text-xs font-semibold"
          >
            <Download size={14} /> Export Expiry CSV
          </button>

          <button
            onClick={() => window.print()}
            className="btn-primary inline-flex items-center gap-1.5 text-xs font-semibold"
          >
            <Printer size={14} /> Print Audit Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-20 text-gray-400">
          <RefreshCw className="animate-spin mr-2 h-5 w-5" />
          Auditing warehouse stock valuation...
        </div>
      ) : !data ? (
        <div className="card text-center py-16 text-gray-400">No inventory audit data available</div>
      ) : (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4 border-l-4 border-l-emerald-600">
              <span className="text-xs font-semibold text-gray-500 uppercase">Total Stock Valuation</span>
              <p className="text-2xl font-bold text-gray-900 mt-1">{pkr(data.totalStockValue)}</p>
              <span className="text-[10px] text-emerald-600 font-medium">At current procurement cost</span>
            </div>

            <div className="card p-4 border-l-4 border-l-red-500">
              <span className="text-xs font-semibold text-red-600 uppercase">Critical Expiry (&lt;30d)</span>
              <p className="text-2xl font-bold text-red-600 mt-1">{data.nearExpiry30Days.length} batches</p>
              <span className="text-[10px] text-red-500">Immediate RTV return candidate</span>
            </div>

            <div className="card p-4 border-l-4 border-l-amber-500">
              <span className="text-xs font-semibold text-amber-600 uppercase">Near Expiry (&lt;90d)</span>
              <p className="text-2xl font-bold text-amber-600 mt-1">{data.nearExpiry90Days.length} batches</p>
              <span className="text-[10px] text-amber-600">Prioritize FEFO dispensing</span>
            </div>

            <div className="card p-4 border-l-4 border-l-blue-500">
              <span className="text-xs font-semibold text-blue-600 uppercase">Below Reorder Level</span>
              <p className="text-2xl font-bold text-blue-600 mt-1">{data.belowReorder.length} SKUs</p>
              <span className="text-[10px] text-blue-500">Generate purchase order</span>
            </div>
          </div>

          {/* Near-Expiry Batches Table */}
          <div className="card overflow-hidden p-0">
            <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <h2 className="text-sm font-bold text-gray-900">
                  Near-Expiry Risk Register (&lt; 90 Days)
                </h2>
              </div>
              <span className="text-xs text-gray-500">FEFO priority dispatch</span>
            </div>

            {data.nearExpiry90Days.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs">
                <CheckCircle2 size={30} className="mx-auto text-emerald-500 mb-1" />
                All inventory batches have healthy shelf life (&gt;90 days).
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-600 font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3">Medicine</th>
                    <th className="px-4 py-3">Batch #</th>
                    <th className="px-4 py-3">Expiry Date</th>
                    <th className="px-4 py-3 text-right">In-Stock Qty</th>
                    <th className="px-4 py-3 text-right">Unit Price</th>
                    <th className="px-4 py-3 text-right font-bold">Exposure (PKR)</th>
                    <th className="px-4 py-3 text-center">Urgency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.nearExpiry90Days.map((b) => {
                    const qty = b.stockLevels.reduce((s, sl) => s + sl.quantity, 0);
                    const daysLeft = Math.round(
                      (new Date(b.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    );
                    const isCritical = daysLeft <= 30;
                    return (
                      <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-gray-900">{b.product.name}</td>
                        <td className="px-4 py-2.5 font-mono text-gray-600">{b.batchNumber}</td>
                        <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                          {new Date(b.expiryDate).toLocaleDateString('en-PK')}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-medium">{qty}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-gray-600">
                          {pkr(Number(b.product.salePrice))}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-red-600">
                          {pkr(qty * Number(b.product.salePrice))}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                              isCritical ? 'bg-red-100 text-red-800 animate-pulse' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {daysLeft} days left
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Low Stock Reorder Table */}
          <div className="card overflow-hidden p-0">
            <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <h2 className="text-sm font-bold text-gray-900">
                  Stock Deficit & Reorder Queue ({data.belowReorder.length})
                </h2>
              </div>
              <span className="text-xs text-gray-500">Auto-calculated against minimum thresholds</span>
            </div>

            {data.belowReorder.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs">
                All inventory items are currently above their reorder thresholds.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-600 font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3">Medicine</th>
                    <th className="px-4 py-3">Generic Name</th>
                    <th className="px-4 py-3 text-right">Current Stock</th>
                    <th className="px-4 py-3 text-right">Reorder Threshold</th>
                    <th className="px-4 py-3 text-right font-bold">Replenishment Deficit</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.belowReorder.map((p) => {
                    const deficit = p.reorderPoint - p.totalStock;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-gray-900">{p.name}</td>
                        <td className="px-4 py-2.5 text-gray-500 italic">{p.genericName || '—'}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-red-600">{p.totalStock}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-gray-600">{p.reorderPoint}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-blue-600">+{deficit} units</td>
                        <td className="px-4 py-2.5 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                              p.totalStock === 0 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {p.totalStock === 0 ? 'Stockout' : 'Low Stock'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
