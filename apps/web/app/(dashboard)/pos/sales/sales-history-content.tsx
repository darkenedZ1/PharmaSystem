'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Receipt, Printer } from 'lucide-react';
import { ThermalReceiptModal, type ThermalReceiptData } from '@/components/pos/thermal-receipt-modal';

interface Sale {
  id: string;
  invoiceNumber: string;
  saleDate: string;
  total: number;
  discountAmount: number;
  taxAmount: number;
  fbrSyncStatus: string;
  status: string;
  payments: { method: string; amount: number }[];
  customer: { name: string; phone: string | null } | null;
  cashier: { name: string };
  items: { quantity: number; unitPrice: number; lineTotal: number; product: { name: string } }[];
}

const SYNC_BADGE: Record<string, string> = {
  success: 'badge-green',
  pending: 'badge-yellow',
  failed: 'badge-red',
  offline_pending: 'badge-gray',
};

const pkr = (n: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

export function SalesHistoryContent() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Sale | null>(null);
  const [thermalReceipt, setThermalReceipt] = useState<ThermalReceiptData | null>(null);
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const openThermal = (sale: Sale) => {
    setThermalReceipt({
      invoiceNumber: sale.invoiceNumber,
      date: sale.saleDate,
      cashierName: sale.cashier?.name || 'Cashier',
      customerName: sale.customer?.name ?? 'Walk-in Customer',
      customerPhone: sale.customer?.phone ?? undefined,
      items: (sale.items || []).map((i) => ({
        name: i.product?.name || 'Item',
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        lineTotal: Number(i.lineTotal),
      })),
      subtotal: Number(sale.total) - Number(sale.taxAmount || 0) + Number(sale.discountAmount || 0),
      discountAmount: Number(sale.discountAmount || 0),
      taxAmount: Number(sale.taxAmount || 0),
      total: Number(sale.total),
      payments: sale.payments || [{ method: 'cash', amount: Number(sale.total) }],
    });
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/pos/sales', { params: { from: new Date(from).toISOString(), to: new Date(to + 'T23:59:59').toISOString() } });
      setSales(res.data);
    } catch {
      toast.error('Failed to load sales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const todayRevenue = sales.filter((s) => s.status === 'completed').reduce((sum, s) => sum + Number(s.total), 0);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales History</h1>
          <p className="mt-1 text-sm text-gray-500">{sales.length} sales · {pkr(todayRevenue)} total</p>
        </div>
        <div className="flex gap-2 items-end">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">From</label>
            <input type="date" className="input text-sm w-36" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">To</label>
            <input type="date" className="input text-sm w-36" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button onClick={load} className="btn-primary">Search</button>
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12 text-gray-400">Loading...</div>
      ) : sales.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
          <Receipt size={40} />
          <p>No sales in this period</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Cashier</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">FBR</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm text-blue-600">
                    <button onClick={() => setSelected(sale)}>{sale.invoiceNumber}</button>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(sale.saleDate).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{sale.customer?.name ?? 'Walk-in'}</td>
                  <td className="px-4 py-3 text-gray-500">{sale.cashier.name}</td>
                  <td className="px-4 py-3 text-gray-500">{sale.items.length}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{pkr(Number(sale.total))}</td>
                  <td className="px-4 py-3">
                    <span className={SYNC_BADGE[sale.fbrSyncStatus] ?? 'badge-gray'}>{sale.fbrSyncStatus}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={sale.status === 'voided' ? 'badge-red' : 'badge-green'}>{sale.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openThermal(sale)}
                      title="Print 80mm/58mm Thermal Receipt"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded"
                    >
                      <Printer size={13} /> Print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold font-mono">{selected.invoiceNumber}</h2>
                <p className="text-sm text-gray-500">
                  {new Date(selected.saleDate).toLocaleString('en-PK')} · {selected.cashier.name}
                </p>
              </div>
              <span className={selected.status === 'voided' ? 'badge-red' : 'badge-green'}>{selected.status}</span>
            </div>

            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs text-gray-500">
                <tr>
                  <th className="pb-2">Product</th>
                  <th className="pb-2 text-right">Qty</th>
                  <th className="pb-2 text-right">Price</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {selected.items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2">{item.product.name}</td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">{pkr(Number(item.unitPrice))}</td>
                    <td className="py-2 text-right font-medium">{pkr(Number(item.lineTotal))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t text-sm">
                {Number(selected.discountAmount) > 0 && (
                  <tr><td colSpan={3} className="pt-1 text-gray-500">Discount</td><td className="pt-1 text-right text-red-600">-{pkr(Number(selected.discountAmount))}</td></tr>
                )}
                <tr><td colSpan={3} className="pt-1 text-gray-500">Tax</td><td className="pt-1 text-right">{pkr(Number(selected.taxAmount))}</td></tr>
                <tr><td colSpan={3} className="pt-2 font-bold">Total</td><td className="pt-2 text-right font-bold text-lg">{pkr(Number(selected.total))}</td></tr>
              </tfoot>
            </table>

            <div className="mt-3 flex flex-wrap gap-2">
              {selected.payments.map((p, i) => (
                <span key={i} className="badge-blue capitalize">{p.method}: {pkr(p.amount)}</span>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => openThermal(selected)}
                className="btn-secondary inline-flex items-center gap-1.5 text-xs"
              >
                <Printer size={14} /> Print Thermal (80mm / 58mm)
              </button>
              <button onClick={() => setSelected(null)} className="btn-ghost">Close</button>
            </div>
          </div>
        </div>
      )}

      {thermalReceipt && (
        <ThermalReceiptModal
          receipt={thermalReceipt}
          onClose={() => setThermalReceipt(null)}
        />
      )}
    </div>
  );
}
