'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';
import { Plus, RefreshCw, ClipboardList } from 'lucide-react';

interface PO {
  id: string;
  poNumber: string;
  status: string;
  expectedDate: string | null;
  createdAt: string;
  supplier: { name: string; phone: string | null };
  items: { productId: string; qtyOrdered: number; qtyReceived: number; unitCost: number; lineTotal: number; product: { name: string } }[];
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'badge-gray',
  sent: 'badge-blue',
  partial: 'badge-yellow',
  received: 'badge-green',
  closed: 'badge-green',
  cancelled: 'badge-red',
};

export function PurchaseOrdersContent() {
  const user = useAuthStore((s) => s.user);
  const [pos, setPos] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState<PO | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; costPrice: number }[]>([]);
  const [form, setForm] = useState({ supplierId: '', expectedDate: '', notes: '', items: [{ productId: '', qtyOrdered: 1, unitCost: 0 }] });
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/purchasing/orders', { params: { ...(statusFilter && { status: statusFilter }) } });
      setPos(res.data);
    } catch {
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  useEffect(() => {
    if (!showCreate) return;
    Promise.all([
      api.get('/purchasing/suppliers'),
      api.get('/inventory/products'),
    ]).then(([s, p]) => {
      setSuppliers(s.data);
      setProducts(p.data);
    });
  }, [showCreate]);

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { productId: '', qtyOrdered: 1, unitCost: 0 }] }));
  const removeItem = (i: number) => setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i: number, field: string, value: any) =>
    setForm((f) => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: value } : item) }));

  const handleProductChange = (i: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    updateItem(i, 'productId', productId);
    if (product) updateItem(i, 'unitCost', Number(product.costPrice));
  };

  const submitPO = async () => {
    if (!form.supplierId) { toast.error('Select a supplier'); return; }
    if (form.items.some((i) => !i.productId)) { toast.error('Select a product for each line'); return; }
    setSaving(true);
    try {
      await api.post('/purchasing/orders', {
        supplierId: form.supplierId,
        branchId: user?.tenantId ?? '',
        expectedDate: form.expectedDate || undefined,
        notes: form.notes || undefined,
        items: form.items,
      });
      toast.success('Purchase order created');
      setShowCreate(false);
      setForm({ supplierId: '', expectedDate: '', notes: '', items: [{ productId: '', qtyOrdered: 1, unitCost: 0 }] });
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to create PO');
    } finally {
      setSaving(false);
    }
  };

  const approve = async (id: string) => {
    try {
      await api.post(`/purchasing/orders/${id}/approve`);
      toast.success('Purchase order approved');
      load();
    } catch {
      toast.error('Failed to approve PO');
    }
  };

  const poTotal = (po: PO) => po.items.reduce((s, i) => s + i.lineTotal, 0);
  const pkr = (n: number) => `PKR ${n.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="mt-1 text-sm text-gray-500">{pos.length} orders</p>
        </div>
        <div className="flex gap-2">
          <select
            className="input w-40 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="partial">Partial</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button onClick={load} className="btn-ghost">
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} /> New PO
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12 text-gray-400">Loading...</div>
      ) : pos.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
          <ClipboardList size={40} />
          <p>No purchase orders yet</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">PO #</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Expected</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pos.map((po) => (
                <tr key={po.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-blue-600">
                    <button onClick={() => setSelectedPO(po)}>{po.poNumber}</button>
                  </td>
                  <td className="px-4 py-3 text-gray-800">{po.supplier.name}</td>
                  <td className="px-4 py-3 text-gray-500">{po.items.length} items</td>
                  <td className="px-4 py-3 font-medium">{pkr(poTotal(po))}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {po.expectedDate ? new Date(po.expectedDate).toLocaleDateString('en-PK') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={STATUS_BADGE[po.status] ?? 'badge-gray'}>{po.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {po.status === 'draft' && (
                      <button onClick={() => approve(po.id)} className="text-xs text-blue-600 hover:underline">
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PO Detail Modal */}
      {selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold">{selectedPO.poNumber}</h2>
                <p className="text-sm text-gray-500">{selectedPO.supplier.name}</p>
              </div>
              <span className={STATUS_BADGE[selectedPO.status] ?? 'badge-gray'}>{selectedPO.status}</span>
            </div>
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs text-gray-500">
                <tr>
                  <th className="pb-2">Product</th>
                  <th className="pb-2 text-right">Ordered</th>
                  <th className="pb-2 text-right">Received</th>
                  <th className="pb-2 text-right">Unit Cost</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {selectedPO.items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2">{item.product.name}</td>
                    <td className="py-2 text-right">{item.qtyOrdered}</td>
                    <td className="py-2 text-right text-green-600">{item.qtyReceived}</td>
                    <td className="py-2 text-right">{pkr(item.unitCost)}</td>
                    <td className="py-2 text-right font-medium">{pkr(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t">
                <tr>
                  <td colSpan={4} className="pt-2 font-medium text-gray-500">Total</td>
                  <td className="pt-2 text-right font-bold">{pkr(poTotal(selectedPO))}</td>
                </tr>
              </tfoot>
            </table>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setSelectedPO(null)} className="btn-ghost">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Create PO Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold">New Purchase Order</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Supplier *</label>
                <select
                  className="input text-sm"
                  value={form.supplierId}
                  onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))}
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Expected Date</label>
                <input
                  type="date"
                  className="input text-sm"
                  value={form.expectedDate}
                  onChange={(e) => setForm((f) => ({ ...f, expectedDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Items</p>
                <button onClick={addItem} className="text-xs text-blue-600 hover:underline">+ Add item</button>
              </div>
              <div className="space-y-2">
                {form.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2">
                    <div className="col-span-6">
                      <select
                        className="input text-sm"
                        value={item.productId}
                        onChange={(e) => handleProductChange(i, e.target.value)}
                      >
                        <option value="">Select product</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        className="input text-sm"
                        placeholder="Qty"
                        min={1}
                        value={item.qtyOrdered}
                        onChange={(e) => updateItem(i, 'qtyOrdered', Number(e.target.value))}
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        className="input text-sm"
                        placeholder="Unit cost"
                        value={item.unitCost}
                        onChange={(e) => updateItem(i, 'unitCost', Number(e.target.value))}
                      />
                    </div>
                    <div className="col-span-1 flex items-center">
                      <button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-500 text-lg leading-none">×</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-right text-sm font-medium text-gray-700">
                Total: {pkr(form.items.reduce((s, i) => s + i.qtyOrdered * i.unitCost, 0))}
              </div>
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-gray-600">Notes</label>
              <textarea
                className="input text-sm"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
              <button onClick={submitPO} disabled={saving} className="btn-primary">
                {saving ? 'Creating…' : 'Create PO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
