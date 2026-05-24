'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AlertTriangle, Package, Search } from 'lucide-react';

export function InventoryContent() {
  const [products, setProducts] = useState<any[]>([]);
  const [nearExpiry, setNearExpiry] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'products' | 'expiry'>('products');

  useEffect(() => {
    if (tab === 'products') {
      api.get('/inventory/products', { params: search ? { q: search } : {} })
        .then((r) => setProducts(r.data));
    } else {
      api.get('/inventory/expiry').then((r) => setNearExpiry(r.data));
    }
  }, [tab, search]);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Inventory</h1>
        <button className="btn-primary">+ Add Product</button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 border-b">
        {[
          { key: 'products', label: 'Products', icon: <Package size={14} /> },
          { key: 'expiry', label: 'Near Expiry', icon: <AlertTriangle size={14} /> },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-1.5 border-b-2 px-4 pb-2 text-sm transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'products' && (
        <>
          <div className="relative mb-4">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9 max-w-sm"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="overflow-hidden rounded-xl border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-left">Generic Name</th>
                  <th className="px-4 py-3 text-left">Schedule</th>
                  <th className="px-4 py-3 text-right">Sale Price</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">{p.genericName ?? '—'}</td>
                    <td className="px-4 py-3">
                      {p.drugSchedule ? (
                        <span className={`badge ${p.isControlled ? 'badge-red' : p.isRxOnly ? 'badge-yellow' : 'badge-gray'}`}>
                          {p.drugSchedule}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      PKR {Number(p.salePrice).toFixed(0)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={p.isActive ? 'badge-green' : 'badge-gray'}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {products.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-400">No products found</p>
            )}
          </div>
        </>
      )}

      {tab === 'expiry' && (
        <div className="space-y-3">
          {nearExpiry.length === 0 && (
            <p className="text-sm text-gray-400">No near-expiry stock found — great news!</p>
          )}
          {nearExpiry.map((b) => {
            const daysLeft = Math.ceil(
              (new Date(b.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
            );
            return (
              <div key={b.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">{b.product.name}</p>
                  <p className="text-xs text-gray-400">
                    Batch {b.batchNumber} · Expires{' '}
                    {new Date(b.expiryDate).toLocaleDateString('en-PK')}
                  </p>
                </div>
                <span
                  className={`badge ${
                    daysLeft <= 30 ? 'badge-red' : daysLeft <= 60 ? 'badge-yellow' : 'badge-blue'
                  }`}
                >
                  {daysLeft} days
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
