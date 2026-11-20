'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  ArrowRightLeft,
  Truck,
  CheckCircle2,
  Clock,
  Plus,
  Building,
  Package,
  Layers,
  RefreshCw,
  X,
  Send,
  Calendar,
} from 'lucide-react';

interface TransferItem {
  id: string;
  productId: string;
  productName: string;
  genericName?: string;
  batchId: string;
  batchNumber: string;
  expiryDate?: string;
  quantity: number;
}

interface StockTransfer {
  id: string;
  transferNumber: string;
  sourceBranchId: string;
  sourceBranchName: string;
  targetBranchId: string;
  targetBranchName: string;
  status: 'draft' | 'in_transit' | 'completed' | 'cancelled';
  notes?: string;
  dispatchedAt?: string;
  receivedAt?: string;
  createdAt: string;
  items: TransferItem[];
}

interface Branch {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  batches: { id: string; batchNumber: string; expiryDate: string }[];
}

export function TransfersContent() {
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [sourceBranchId, setSourceBranchId] = useState('');
  const [targetBranchId, setTargetBranchId] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [quantity, setQuantity] = useState(10);

  const loadData = async () => {
    setLoading(true);
    try {
      const [transfersRes, branchesRes, productsRes] = await Promise.all([
        api.get('/inventory/transfers'),
        api.get('/users/branches'),
        api.get('/inventory/products'),
      ]);
      setTransfers(transfersRes.data);
      const bList = branchesRes.data || [];
      setBranches(bList);
      if (bList.length >= 2) {
        setSourceBranchId(bList[0].id);
        setTargetBranchId(bList[1].id);
      }
      const pList = productsRes.data || [];
      setProducts(pList);
      if (pList.length > 0) {
        setSelectedProductId(pList[0].id);
        if (pList[0].batches?.length > 0) {
          setSelectedBatchId(pList[0].batches[0].id);
        }
      }
    } catch {
      toast.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod && prod.batches?.length > 0) {
      setSelectedBatchId(prod.batches[0].id);
    } else {
      setSelectedBatchId('');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceBranchId || !targetBranchId) {
      toast.error('Please select source and destination branches');
      return;
    }
    if (sourceBranchId === targetBranchId) {
      toast.error('Source and destination branches cannot be the same');
      return;
    }
    if (!selectedProductId || !selectedBatchId) {
      toast.error('Please select product and batch');
      return;
    }
    if (quantity <= 0) {
      toast.error('Quantity must be greater than zero');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/inventory/transfers', {
        sourceBranchId,
        targetBranchId,
        notes,
        items: [{ productId: selectedProductId, batchId: selectedBatchId, quantity }],
      });
      toast.success('Transfer requisition created');
      setModalOpen(false);
      setNotes('');
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispatch = async (id: string) => {
    try {
      await api.post(`/inventory/transfers/${id}/dispatch`);
      toast.success('Stock dispatched! Status is now In-Transit');
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to dispatch transfer');
    }
  };

  const handleReceive = async (id: string) => {
    try {
      await api.post(`/inventory/transfers/${id}/receive`);
      toast.success('Transfer received! Destination branch inventory updated');
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to receive transfer');
    }
  };

  const currentProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-7 w-7 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Inter-Branch Stock Transfers</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Requisition, dispatch, and track inventory movements between pharmacy branches with complete chain of custody.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus size={16} /> New Stock Transfer
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <span className="text-xs font-semibold text-gray-500 uppercase">Total Transfers</span>
          <p className="text-2xl font-bold text-gray-900 mt-1">{transfers.length}</p>
        </div>
        <div className="card p-4">
          <span className="text-xs font-semibold text-amber-600 uppercase">Draft Requisitions</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {transfers.filter((t) => t.status === 'draft').length}
          </p>
        </div>
        <div className="card p-4">
          <span className="text-xs font-semibold text-blue-600 uppercase">In-Transit Shipments</span>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {transfers.filter((t) => t.status === 'in_transit').length}
          </p>
        </div>
        <div className="card p-4">
          <span className="text-xs font-semibold text-emerald-600 uppercase">Completed Deliveries</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {transfers.filter((t) => t.status === 'completed').length}
          </p>
        </div>
      </div>

      {/* Transfers Table */}
      <div className="card overflow-hidden p-0">
        <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Transfer Shipments ({transfers.length})</h2>
          <button onClick={loadData} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-gray-400">Loading transfers...</div>
        ) : transfers.length === 0 ? (
          <div className="py-16 text-center text-gray-400 space-y-2">
            <Truck size={36} className="mx-auto text-gray-300" />
            <p className="font-semibold text-gray-700">No stock transfers found</p>
            <p className="text-xs text-gray-500">
              Click &quot;New Stock Transfer&quot; to transfer stock between pharmacy branches.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-gray-600 font-semibold border-b">
                <tr>
                  <th className="px-4 py-3">Transfer #</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Source &rarr; Destination Branch</th>
                  <th className="px-4 py-3">Items Transferred</th>
                  <th className="px-4 py-3">Total Qty</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transfers.map((t) => {
                  const totalUnits = t.items.reduce((s, i) => s + i.quantity, 0);
                  return (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-blue-600">{t.transferNumber}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(t.createdAt).toLocaleDateString('en-PK')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 font-medium text-gray-900">
                          <span>{t.sourceBranchName}</span>
                          <span className="text-gray-400">&rarr;</span>
                          <span className="text-blue-700">{t.targetBranchName}</span>
                        </div>
                        {t.notes && <p className="text-[11px] text-gray-400 mt-0.5">{t.notes}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          {t.items.map((item, idx) => (
                            <div key={idx} className="text-gray-800">
                              <span className="font-medium">{item.productName}</span>
                              <span className="text-[10px] text-gray-500 ml-1 font-mono">
                                (Batch: {item.batchNumber})
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-gray-900">{totalUnits} units</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                            t.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : t.status === 'in_transit'
                              ? 'bg-blue-100 text-blue-800'
                              : t.status === 'draft'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {t.status === 'draft' && (
                          <button
                            onClick={() => handleDispatch(t.id)}
                            className="btn-secondary inline-flex items-center gap-1 text-[11px] py-1 px-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100"
                          >
                            <Send size={12} /> Dispatch Shipment
                          </button>
                        )}
                        {t.status === 'in_transit' && (
                          <button
                            onClick={() => handleReceive(t.id)}
                            className="btn-primary inline-flex items-center gap-1 text-[11px] py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700"
                          >
                            <CheckCircle2 size={12} /> Confirm Receipt
                          </button>
                        )}
                        {t.status === 'completed' && (
                          <span className="text-[11px] text-emerald-600 font-medium inline-flex items-center gap-1">
                            <CheckCircle2 size={13} /> Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Transfer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold text-gray-900">Create Inter-Branch Transfer</h2>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Source Branch (Origin)
                  </label>
                  <select
                    className="input text-xs"
                    value={sourceBranchId}
                    onChange={(e) => setSourceBranchId(e.target.value)}
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Target Branch (Destination)
                  </label>
                  <select
                    className="input text-xs"
                    value={targetBranchId}
                    onChange={(e) => setTargetBranchId(e.target.value)}
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select Medicine / Product</label>
                <select
                  className="input text-xs"
                  value={selectedProductId}
                  onChange={(e) => handleProductChange(e.target.value)}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Select Batch</label>
                  <select
                    className="input text-xs font-mono"
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                  >
                    {currentProduct?.batches?.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batchNumber} (Exp: {new Date(b.expiryDate).toLocaleDateString('en-PK')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Transfer Quantity (Units)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="input text-xs font-mono"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Transfer Notes / Gate Pass Ref
                </label>
                <input
                  type="text"
                  placeholder="e.g. Urgent stock requisition for evening rush"
                  className="input text-xs"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs inline-flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="animate-spin h-3.5 w-3.5" /> : <Plus size={14} />}
                  {submitting ? 'Creating...' : 'Create Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
