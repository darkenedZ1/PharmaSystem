'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { SlidersHorizontal, Search, Clock } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  genericName?: string;
}

interface StockLevel {
  id: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity: number;
  branchId?: string;
  branch?: { id: string; name: string };
  productId: string;
}

export function AdjustmentsContent() {
  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [batches, setBatches] = useState<StockLevel[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchProducts = useCallback(() => {
    if (!productSearch.trim()) { setProducts([]); return; }
    api
      .get('/inventory/products', { params: { q: productSearch } })
      .then((r) => setProducts(r.data.slice(0, 10)))
      .catch(() => {});
  }, [productSearch]);

  useEffect(() => {
    const t = setTimeout(searchProducts, 300);
    return () => clearTimeout(t);
  }, [searchProducts]);

  const selectProduct = (p: Product) => {
    setSelectedProduct(p);
    setProductSearch(p.name);
    setShowDropdown(false);
    setSelectedBatch('');
    setBatches([]);
    api
      .get('/inventory/stock', { params: {} })
      .then((r) => {
        const filtered = (r.data as StockLevel[]).filter((s) => s.productId === p.id);
        setBatches(filtered);
      })
      .catch(() => toast.error('Failed to load batches'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) { toast.error('Select a product'); return; }
    if (!selectedBatch) { toast.error('Select a batch'); return; }
    if (!quantity || quantity === '0') { toast.error('Enter a non-zero quantity'); return; }
    if (!reason.trim()) { toast.error('Reason is required'); return; }

    const batch = batches.find((b) => b.id === selectedBatch);
    if (!batch) return;

    setSubmitting(true);
    try {
      await api.post('/inventory/adjustments', {
        productId: selectedProduct.id,
        batchId: selectedBatch,
        branchId: batch.branchId,
        quantity: Number(quantity),
        reason: reason.trim(),
      });
      toast.success('Adjustment submitted successfully');
      setSelectedProduct(null);
      setProductSearch('');
      setBatches([]);
      setSelectedBatch('');
      setQuantity('');
      setReason('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to submit adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <SlidersHorizontal size={22} className="text-blue-600" />
        <h1 className="text-xl font-bold text-gray-900">Stock Adjustments</h1>
      </div>

      <div className="card mb-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">New Adjustment</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product search */}
          <div className="relative">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Product <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input pl-9"
                placeholder="Search product name…"
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setShowDropdown(true);
                  setSelectedProduct(null);
                }}
                onFocus={() => setShowDropdown(true)}
              />
            </div>
            {showDropdown && products.length > 0 && (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border bg-white shadow-lg">
                {products.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="flex w-full flex-col px-4 py-2 text-left hover:bg-gray-50"
                    onClick={() => selectProduct(p)}
                  >
                    <span className="text-sm font-medium text-gray-800">{p.name}</span>
                    {p.genericName && (
                      <span className="text-xs text-gray-400">{p.genericName}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Batch selection */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Batch <span className="text-red-500">*</span>
            </label>
            <select
              className="input"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              disabled={batches.length === 0}
            >
              <option value="">
                {batches.length === 0
                  ? selectedProduct
                    ? 'No batches found for this product'
                    : '— Select a product first —'
                  : '— Select batch —'}
              </option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchNumber ?? 'No batch #'}
                  {b.expiryDate ? ` · Exp: ${new Date(b.expiryDate).toLocaleDateString('en-PK')}` : ''}
                  {b.branch ? ` · ${b.branch.name}` : ''}
                  {` · Qty: ${b.quantity}`}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              className="input"
              type="number"
              placeholder="Use negative for removal (e.g. -10)"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-400">
              Positive = add stock, Negative = remove stock
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              className="input min-h-[80px] resize-y"
              placeholder="e.g. Received new shipment, Damaged goods, Expired stock removal…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Adjustment'}
            </button>
          </div>
        </form>
      </div>

      {/* Adjustment history placeholder */}
      <div className="card border-dashed">
        <div className="flex items-center gap-3 text-gray-400">
          <Clock size={20} />
          <div>
            <p className="text-sm font-medium text-gray-600">Adjustment History</p>
            <p className="text-xs text-gray-400">Adjustment history coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}
