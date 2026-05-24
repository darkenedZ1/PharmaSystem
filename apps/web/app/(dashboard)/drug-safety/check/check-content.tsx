'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Search, Plus, X, ShieldCheck, AlertTriangle, Pill } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  genericName: string | null;
  atcCode: string | null;
}

interface Interaction {
  id: string;
  severity: 'contraindicated' | 'major' | 'moderate' | 'minor';
  description: string;
  mechanism: string | null;
  management: string | null;
  productA: { name: string };
  productB: { name: string };
}

const SEVERITY_BADGE: Record<string, string> = {
  contraindicated: 'badge-red',
  major: 'badge-yellow',
  moderate: 'badge-yellow',
  minor: 'badge-gray',
};

const SEVERITY_COLOR: Record<string, string> = {
  contraindicated: 'border-red-300 bg-red-50',
  major: 'border-orange-300 bg-orange-50',
  moderate: 'border-yellow-300 bg-yellow-50',
  minor: 'border-gray-200 bg-gray-50',
};

const SEVERITY_ICON_COLOR: Record<string, string> = {
  contraindicated: 'text-red-600',
  major: 'text-orange-500',
  moderate: 'text-yellow-500',
  minor: 'text-gray-400',
};

export function DrugCheckContent() {
  const [q, setQ] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [interactionsLoading, setInteractionsLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const searchProducts = useCallback(async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    try {
      const res = await api.get('/inventory/products', { params: { q: query } });
      setSearchResults((res.data as Product[]).filter(
        (p) => !selectedProducts.some((s) => s.id === p.id),
      ));
    } catch {
      setSearchResults([]);
    }
  }, [selectedProducts]);

  useEffect(() => {
    const t = setTimeout(() => searchProducts(q), 300);
    return () => clearTimeout(t);
  }, [q, searchProducts]);

  const addProduct = (product: Product) => {
    setSelectedProducts((prev) => [...prev, product]);
    setQ('');
    setSearchResults([]);
  };

  const removeProduct = (id: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== id));
    setInteractions([]);
    setChecked(false);
  };

  const checkInteractions = useCallback(async (products: Product[]) => {
    if (products.length < 2) { setInteractions([]); setChecked(false); return; }
    setInteractionsLoading(true);
    try {
      const ids = products.map((p) => p.id).join(',');
      const res = await api.get('/drug-interactions/check', { params: { productIds: ids } });
      setInteractions(Array.isArray(res.data) ? res.data : (res.data.interactions ?? []));
      setChecked(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Interaction check failed');
    } finally {
      setInteractionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProducts.length >= 2) {
      checkInteractions(selectedProducts);
    } else {
      setInteractions([]);
      setChecked(false);
    }
  }, [selectedProducts, checkInteractions]);

  const clearAll = () => {
    setSelectedProducts([]);
    setInteractions([]);
    setChecked(false);
    setQ('');
    setSearchResults([]);
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drug Interaction Checker</h1>
          <p className="mt-1 text-sm text-gray-500">Add medications to check for interactions</p>
        </div>
        {selectedProducts.length > 0 && (
          <button onClick={clearAll} className="btn-ghost text-sm">
            <X size={16} /> Clear All
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Product search + list */}
        <div className="space-y-4">
          {/* Search */}
          <div className="card">
            <label className="mb-2 block text-sm font-medium text-gray-700">Add Medication</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input pl-9"
                placeholder="Search by product name or generic name..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border bg-white shadow-md">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addProduct(p)}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{p.name}</p>
                      {p.genericName && <p className="text-xs text-gray-400">{p.genericName}</p>}
                    </div>
                    <Plus size={14} className="text-blue-500" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected medications */}
          <div className="card">
            <h2 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Medication List ({selectedProducts.length})
            </h2>
            {selectedProducts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-gray-400">
                <Pill size={32} />
                <p className="text-sm">Add at least 2 medications to check interactions</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                      <p className="text-xs text-gray-400">
                        {p.genericName ?? 'No generic name'}
                        {p.atcCode && <span className="ml-2 font-mono">[{p.atcCode}]</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => removeProduct(p.id)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Interactions */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Interaction Results
            </h2>

            {selectedProducts.length < 2 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-gray-400">
                <ShieldCheck size={32} />
                <p className="text-sm">Add 2 or more medications to check</p>
              </div>
            ) : interactionsLoading ? (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <p className="text-sm">Checking interactions...</p>
              </div>
            ) : checked && interactions.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-green-300 bg-green-50 py-8">
                <ShieldCheck size={36} className="text-green-600" />
                <p className="font-semibold text-green-700">No interactions found</p>
                <p className="text-xs text-green-600 text-center px-4">
                  No known drug interactions were found between the selected medications.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {interactions.map((i) => (
                  <div
                    key={i.id}
                    className={`rounded-lg border p-4 ${SEVERITY_COLOR[i.severity] ?? 'border-gray-200 bg-gray-50'}`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className={SEVERITY_ICON_COLOR[i.severity] ?? 'text-gray-400'} />
                        <span className="text-sm font-semibold text-gray-900">
                          {i.productA.name} + {i.productB.name}
                        </span>
                      </div>
                      <span className={`capitalize text-xs font-medium px-2 py-0.5 rounded-full border ${
                        i.severity === 'contraindicated' ? 'bg-red-100 text-red-700 border-red-300' :
                        i.severity === 'major' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                        i.severity === 'moderate' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                        'bg-gray-100 text-gray-600 border-gray-300'
                      }`}>
                        {i.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-1">{i.description}</p>
                    {i.mechanism && (
                      <p className="text-xs text-gray-500"><span className="font-medium">Mechanism:</span> {i.mechanism}</p>
                    )}
                    {i.management && (
                      <p className="text-xs text-gray-600 mt-1 font-medium">Management: {i.management}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
