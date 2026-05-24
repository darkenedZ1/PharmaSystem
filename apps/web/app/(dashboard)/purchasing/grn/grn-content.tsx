'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';
import { Plus, PackageCheck } from 'lucide-react';

interface GrnRow { id: string; receivedDate: string; status: string; po: { poNumber: string } | null; items: { qtyReceived: number }[] }

export function GrnContent() {
  const user = useAuthStore((s) => s.user);
  const [grns, setGrns] = useState<GrnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    supplierId: '',
    supplierInvoiceNumber: '',
    notes: '',
    items: [{ productId: '', batchNumber: '', expiryDate: '', qtyReceived: 1, costPerUnit: 0 }],
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/purchasing/grn');
      setGrns(res.data);
    } catch {
      toast.error('Failed to load GRNs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!showCreate) return;
    Promise.all([api.get('/purchasing/suppliers'), api.get('/inventory/products')]).then(([s, p]) => {
      setSuppliers(s.data);
      setProducts(p.data);
    });
  }, [showCreate]);

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { productId: '', batchNumber: '', expiryDate: '', qtyReceived: 1, costPerUnit: 0 }] }));
  const removeItem = (i: number) => setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i: number, field: string, value: any) =>
    setForm((f) => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: value } : item) }));

  const submit = async () => {
    if (!form.supplierId) { toast.error('Select a supplier'); return; }
    if (form.items.some((i) => !i.productId || !i.batchNumber || !i.expiryDate)) {
      toast.error('Fill all item fields (product, batch, expiry)');
      return;
    }
    setSaving(true);
    try {
      await api.post('/purchasing/grn', {
        supplierId: form.supplierId,
        branchId: user?.tenantId ?? '',
        supplierInvoiceNumber: form.supplierInvoiceNumber || undefined,
        notes: form.notes || undefined,
        items: form.items,
      });
      toast.success('Stock received successfully');
      setShowCreate(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to receive stock');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receive Stock (GRN)</h1>
          <p className="mt-1 text-sm text-gray-500">{grns.length} receipts</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16} /> Receive Stock
        </button>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12 text-gray-400">Loading...</div>
      ) : grns.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
          <PackageCheck size={40} />
          <p>No goods received yet</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Linked PO</th>
                <th className="px-4 py-3">Items Received</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {grns.map((grn) => (
                <tr key={grn.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{new Date(grn.receivedDate).toLocaleDateString('en-PK')}</td>
                  <td className="px-4 py-3 font-mono text-sm text-blue-600">{grn.po?.poNumber ?? '—'}</td>
                  <td className="px-4 py-3">{grn.items.reduce((s, i) => s + i.qtyReceived, 0)} units</td>
                  <td className="px-4 py-3"><span className="badge-green">{grn.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold">Receive Stock</h2>
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
                <label className="mb-1 block text-xs font-medium text-gray-600">Supplier Invoice #</label>
                <input
                  className="input text-sm"
                  value={form.supplierInvoiceNumber}
                  onChange={(e) => setForm((f) => ({ ...f, supplierInvoiceNumber: e.target.value }))}
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Items Received</p>
                <button onClick={addItem} className="text-xs text-blue-600 hover:underline">+ Add item</button>
              </div>
              <div className="space-y-2">
                {form.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2">
                    <div className="col-span-4">
                      <select
                        className="input text-xs"
                        value={item.productId}
                        onChange={(e) => updateItem(i, 'productId', e.target.value)}
                      >
                        <option value="">Product</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input className="input text-xs" placeholder="Batch #" value={item.batchNumber} onChange={(e) => updateItem(i, 'batchNumber', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <input type="date" className="input text-xs" value={item.expiryDate} onChange={(e) => updateItem(i, 'expiryDate', e.target.value)} />
                    </div>
                    <div className="col-span-1">
                      <input type="number" className="input text-xs" placeholder="Qty" min={1} value={item.qtyReceived} onChange={(e) => updateItem(i, 'qtyReceived', Number(e.target.value))} />
                    </div>
                    <div className="col-span-2">
                      <input type="number" className="input text-xs" placeholder="Cost" value={item.costPerUnit} onChange={(e) => updateItem(i, 'costPerUnit', Number(e.target.value))} />
                    </div>
                    <div className="col-span-1 flex items-center">
                      <button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-500 text-lg">×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
              <button onClick={submit} disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : 'Post GRN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
