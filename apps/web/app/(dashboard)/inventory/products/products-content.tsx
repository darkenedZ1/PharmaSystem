'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Search, Plus, X, Edit2, Package } from 'lucide-react';

const pkr = (n: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

const DRUG_SCHEDULES = ['OTC', 'Schedule H', 'Schedule X', 'Schedule C'];
const UNITS = ['pcs', 'strips', 'bottles', 'vials', 'ml', 'mg'];

interface Product {
  id: string;
  name: string;
  genericName?: string;
  brandName?: string;
  manufacturer?: string;
  drugSchedule?: string;
  isControlled: boolean;
  isRxOnly: boolean;
  atcCode?: string;
  drapNumber?: string;
  packSize?: number;
  unitOfMeasure?: string;
  barcodes: string[];
  costPrice?: number;
  salePrice?: number;
  taxRate?: number;
  reorderPoint?: number;
  maxStock?: number;
  categoryId?: string;
  isActive: boolean;
  stockLevels?: { quantity: number }[];
}

const emptyForm = {
  name: '',
  genericName: '',
  brandName: '',
  manufacturer: '',
  drugSchedule: '',
  isControlled: false,
  isRxOnly: false,
  atcCode: '',
  drapNumber: '',
  packSize: '',
  unitOfMeasure: '',
  barcodes: '',
  costPrice: '',
  salePrice: '',
  taxRate: '',
  reorderPoint: '',
  maxStock: '',
  categoryId: '',
};

export function ProductsContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/inventory/products', { params: search ? { q: search } : {} })
      .then((r) => setProducts(r.data))
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      genericName: p.genericName ?? '',
      brandName: p.brandName ?? '',
      manufacturer: p.manufacturer ?? '',
      drugSchedule: p.drugSchedule ?? '',
      isControlled: p.isControlled,
      isRxOnly: p.isRxOnly,
      atcCode: p.atcCode ?? '',
      drapNumber: p.drapNumber ?? '',
      packSize: p.packSize?.toString() ?? '',
      unitOfMeasure: p.unitOfMeasure ?? '',
      barcodes: p.barcodes?.join(', ') ?? '',
      costPrice: p.costPrice?.toString() ?? '',
      salePrice: p.salePrice?.toString() ?? '',
      taxRate: p.taxRate?.toString() ?? '',
      reorderPoint: p.reorderPoint?.toString() ?? '',
      maxStock: p.maxStock?.toString() ?? '',
      categoryId: p.categoryId ?? '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Product name is required'); return; }
    setSaving(true);
    const body = {
      name: form.name.trim(),
      genericName: form.genericName || undefined,
      brandName: form.brandName || undefined,
      manufacturer: form.manufacturer || undefined,
      drugSchedule: form.drugSchedule || undefined,
      isControlled: form.isControlled,
      isRxOnly: form.isRxOnly,
      atcCode: form.atcCode || undefined,
      drapNumber: form.drapNumber || undefined,
      packSize: form.packSize ? Number(form.packSize) : undefined,
      unitOfMeasure: form.unitOfMeasure || undefined,
      barcodes: form.barcodes ? form.barcodes.split(',').map((b) => b.trim()).filter(Boolean) : [],
      costPrice: form.costPrice ? Number(form.costPrice) : undefined,
      salePrice: form.salePrice ? Number(form.salePrice) : undefined,
      taxRate: form.taxRate ? Number(form.taxRate) : undefined,
      reorderPoint: form.reorderPoint ? Number(form.reorderPoint) : undefined,
      maxStock: form.maxStock ? Number(form.maxStock) : undefined,
      categoryId: form.categoryId || undefined,
    };
    try {
      if (editing) {
        await api.put(`/inventory/products/${editing.id}`, body);
        toast.success('Product updated');
      } else {
        await api.post('/inventory/products', body);
        toast.success('Product created');
      }
      closeModal();
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const totalStock = (p: Product) =>
    p.stockLevels?.reduce((s, l) => s + l.quantity, 0) ?? 0;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package size={22} className="text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">Products</h1>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9 max-w-sm"
          placeholder="Search by name, generic, barcode…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Generic</th>
              <th className="px-4 py-3 text-left">Drug Schedule</th>
              <th className="px-4 py-3 text-right">Sale Price</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-gray-400">
                  No products found
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{p.name}</p>
                    {p.brandName && (
                      <p className="text-xs text-gray-400">{p.brandName}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.genericName ?? '—'}</td>
                  <td className="px-4 py-3">
                    {p.drugSchedule ? (
                      <span
                        className={`badge ${
                          p.isControlled
                            ? 'badge-red'
                            : p.isRxOnly
                            ? 'badge-yellow'
                            : 'badge-gray'
                        }`}
                      >
                        {p.drugSchedule}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-700">
                    {p.salePrice != null ? pkr(Number(p.salePrice)) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-700">
                    {totalStock(p)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={p.isActive ? 'badge-green' : 'badge-gray'}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(p)}
                      className="btn-ghost py-1 px-2 text-xs"
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editing ? 'Edit Product' : 'Add Product'}
              </h2>
              <button onClick={closeModal} className="btn-ghost p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Generic Name</label>
                  <input
                    className="input"
                    value={form.genericName}
                    onChange={(e) => setForm((f) => ({ ...f, genericName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Brand Name</label>
                  <input
                    className="input"
                    value={form.brandName}
                    onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Manufacturer</label>
                  <input
                    className="input"
                    value={form.manufacturer}
                    onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Drug Schedule</label>
                  <select
                    className="input"
                    value={form.drugSchedule}
                    onChange={(e) => setForm((f) => ({ ...f, drugSchedule: e.target.value }))}
                  >
                    <option value="">— None —</option>
                    {DRUG_SCHEDULES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">ATC Code</label>
                  <input
                    className="input"
                    value={form.atcCode}
                    onChange={(e) => setForm((f) => ({ ...f, atcCode: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">DRAP Number</label>
                  <input
                    className="input"
                    value={form.drapNumber}
                    onChange={(e) => setForm((f) => ({ ...f, drapNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Pack Size</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={form.packSize}
                    onChange={(e) => setForm((f) => ({ ...f, packSize: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Unit of Measure</label>
                  <select
                    className="input"
                    value={form.unitOfMeasure}
                    onChange={(e) => setForm((f) => ({ ...f, unitOfMeasure: e.target.value }))}
                  >
                    <option value="">— Select —</option>
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Barcodes (comma-separated)
                  </label>
                  <input
                    className="input"
                    placeholder="e.g. 1234567890, 9876543210"
                    value={form.barcodes}
                    onChange={(e) => setForm((f) => ({ ...f, barcodes: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Cost Price (PKR)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.costPrice}
                    onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Sale Price (PKR)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.salePrice}
                    onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Tax Rate (%)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.taxRate}
                    onChange={(e) => setForm((f) => ({ ...f, taxRate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Category ID</label>
                  <input
                    className="input"
                    value={form.categoryId}
                    onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Reorder Point</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={form.reorderPoint}
                    onChange={(e) => setForm((f) => ({ ...f, reorderPoint: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Max Stock</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={form.maxStock}
                    onChange={(e) => setForm((f) => ({ ...f, maxStock: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isControlled}
                    onChange={(e) => setForm((f) => ({ ...f, isControlled: e.target.checked }))}
                    className="rounded"
                  />
                  Controlled substance
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isRxOnly}
                    onChange={(e) => setForm((f) => ({ ...f, isRxOnly: e.target.checked }))}
                    className="rounded"
                  />
                  Prescription only (Rx)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
