'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  RotateCcw,
  Search,
  PlusCircle,
  X,
  FileText,
  Building,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Download,
  PackageX,
  Trash2,
} from 'lucide-react';

interface ReturnItem {
  id: string;
  productId: string;
  batchId?: string;
  batchNumber?: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
  reason?: string;
}

interface PurchaseReturn {
  id: string;
  returnNumber: string;
  status: string;
  reason: string;
  refundMethod: string;
  totalAmount: number;
  notes?: string;
  createdAt: string;
  supplier: {
    id: string;
    name: string;
    phone?: string;
  };
  items: ReturnItem[];
}

interface SupplierOption {
  id: string;
  name: string;
}

interface ProductOption {
  id: string;
  name: string;
  costPrice: number;
  batches?: { id: string; batchNumber: string; expiryDate: string }[];
}

const pkr = (n: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

const reasonLabels: Record<string, string> = {
  near_expiry: 'Near Expiry',
  expired: 'Expired Batch',
  damaged: 'Damaged Stock',
  recalled: 'Batch Recalled',
  overstocked: 'Overstocked',
  wrong_item: 'Wrong Item Delivered',
};

export function ReturnsContent() {
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // New Return Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [returnReason, setReturnReason] = useState('near_expiry');
  const [refundMethod, setRefundMethod] = useState('credit_note');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<
    { productId: string; batchNumber: string; quantity: number; unitCost: number }[]
  >([{ productId: '', batchNumber: '', quantity: 1, unitCost: 0 }]);
  const [submitting, setSubmitting] = useState(false);

  // Selected Return Detail for View/Print
  const [selectedReturn, setSelectedReturn] = useState<PurchaseReturn | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/purchasing/returns');
      setReturns(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load purchase returns');
    } finally {
      setLoading(false);
    }
  };

  const loadDropdowns = async () => {
    try {
      const [supRes, prodRes] = await Promise.all([
        api.get('/purchasing/suppliers'),
        api.get('/inventory/products'),
      ]);
      setSuppliers(supRes.data || []);
      setProducts(prodRes.data?.data || prodRes.data || []);
    } catch {
      // silently fail dropdown load
    }
  };

  useEffect(() => {
    loadData();
    loadDropdowns();
  }, []);

  const openNewReturnModal = () => {
    if (suppliers.length > 0) setSelectedSupplierId(suppliers[0].id);
    if (products.length > 0) {
      setItems([
        {
          productId: products[0].id,
          batchNumber: 'BATCH-01',
          quantity: 1,
          unitCost: Number(products[0].costPrice) || 100,
        },
      ]);
    }
    setReturnReason('near_expiry');
    setRefundMethod('credit_note');
    setNotes('');
    setIsModalOpen(true);
  };

  const addItemRow = () => {
    const defaultProd = products[0];
    setItems([
      ...items,
      {
        productId: defaultProd ? defaultProd.id : '',
        batchNumber: 'BATCH-01',
        quantity: 1,
        unitCost: defaultProd ? Number(defaultProd.costPrice) : 100,
      },
    ]);
  };

  const removeItemRow = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItemField = (idx: number, field: string, val: any) => {
    const copy = [...items];
    (copy[idx] as any)[field] = val;
    if (field === 'productId') {
      const found = products.find((p) => p.id === val);
      if (found) copy[idx].unitCost = Number(found.costPrice) || 0;
    }
    setItems(copy);
  };

  const calculateTotal = () => {
    return items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitCost) || 0), 0);
  };

  const submitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      toast.error('Please select a supplier');
      return;
    }
    if (items.some((i) => !i.productId || i.quantity <= 0)) {
      toast.error('Please specify valid products and return quantities');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/purchasing/returns', {
        supplierId: selectedSupplierId,
        branchId: 'main-branch',
        reason: returnReason,
        refundMethod,
        notes,
        items: items.map((i) => ({
          productId: i.productId,
          batchNumber: i.batchNumber,
          quantity: Number(i.quantity),
          unitCost: Number(i.unitCost),
          reason: returnReason,
        })),
      });

      toast.success(`Purchase Return ${res.data.returnNumber} created & inventory updated`);
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to create return note');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredReturns = returns.filter((r) => {
    const matchesSearch =
      r.returnNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.supplier.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.notes && r.notes.toLowerCase().includes(search.toLowerCase()));

    if (statusFilter !== 'all') {
      return matchesSearch && r.status === statusFilter;
    }
    return matchesSearch;
  });

  const totalReturnValue = returns.reduce((s, r) => s + Number(r.totalAmount), 0);

  const exportCSV = () => {
    const rows = [
      ['Return Number', 'Date', 'Supplier', 'Reason', 'Refund Method', 'Status', 'Total (PKR)'],
      ...returns.map((r) => [
        r.returnNumber,
        new Date(r.createdAt).toLocaleDateString('en-PK'),
        r.supplier.name,
        reasonLabels[r.reason] || r.reason,
        r.refundMethod,
        r.status,
        r.totalAmount.toString(),
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Purchase_Returns_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Purchase returns report exported to CSV');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <RotateCcw className="h-7 w-7 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Purchase Returns (RTV)</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Return to Vendor • Debit Notes for Expired, Damaged & Near-Expiry Medicines
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={exportCSV} className="btn-ghost border bg-white shadow-sm text-gray-700">
            <Download size={15} /> Export CSV
          </button>
          <button onClick={openNewReturnModal} className="btn-primary">
            <PlusCircle size={16} /> New Return Note (RTV)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-indigo-50/70 to-white border-indigo-100">
          <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Total Return Value</span>
          <p className="text-2xl font-bold text-gray-900 mt-2">{pkr(totalReturnValue)}</p>
          <span className="text-xs text-gray-500 mt-1 block">Value credited/debited back to pharmacy</span>
        </div>

        <div className="card bg-gradient-to-br from-emerald-50/70 to-white border-emerald-100">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Processed Returns</span>
          <p className="text-2xl font-bold text-gray-900 mt-2">{returns.filter((r) => r.status === 'completed').length}</p>
          <span className="text-xs text-gray-500 mt-1 block">Completed distributor debit notes</span>
        </div>

        <div className="card bg-gradient-to-br from-amber-50/70 to-white border-amber-100">
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1">
            <PackageX size={14} /> Near-Expiry / Expired
          </span>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {returns.filter((r) => r.reason === 'near_expiry' || r.reason === 'expired').length}
          </p>
          <span className="text-xs text-gray-500 mt-1 block">Reclaimed under supplier return policy</span>
        </div>

        <div className="card bg-gradient-to-br from-purple-50/70 to-white border-purple-100">
          <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Refund Method</span>
          <div className="mt-2 text-xs space-y-1">
            <div className="flex justify-between text-gray-600">
              <span>Credit Note (AP):</span>
              <strong className="text-gray-900">{returns.filter((r) => r.refundMethod === 'credit_note').length}</strong>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Cash / Bank:</span>
              <strong className="text-gray-900">{returns.filter((r) => r.refundMethod !== 'credit_note').length}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search return number, supplier, or notes..."
            className="input pl-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            className="input text-xs font-semibold w-36 cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="draft">Draft</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Returns Table */}
      {loading ? (
        <div className="card flex items-center justify-center py-20 text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
          Loading purchase returns...
        </div>
      ) : (
        <div className="card p-0 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm divide-y divide-gray-200">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Return #</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Supplier / Distributor</th>
                  <th className="px-4 py-3.5">Reason</th>
                  <th className="px-4 py-3.5">Refund Channel</th>
                  <th className="px-4 py-3.5 text-right">Total Amount</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                      No purchase return records found. Click &quot;New Return Note (RTV)&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  filteredReturns.map((ret) => (
                    <tr key={ret.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-indigo-700">
                        {ret.returnNumber}
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-500">
                        {new Date(ret.createdAt).toLocaleDateString('en-PK')}
                      </td>
                      <td className="px-4 py-4 font-semibold text-gray-900">
                        {ret.supplier.name}
                      </td>
                      <td className="px-4 py-4 text-xs">
                        <span className="badge badge-yellow">
                          {reasonLabels[ret.reason] || ret.reason}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-600 capitalize">
                        {ret.refundMethod.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-gray-900">
                        {pkr(ret.totalAmount)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="badge badge-green">Completed</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setSelectedReturn(ret)}
                          className="btn-ghost text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          View Debit Note
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Return Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50 shrink-0">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Create Return to Vendor (RTV)</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Generates Debit Note, decrements stock & adjusts Accounts Payable
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submitReturn} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Select Supplier / Distributor <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="input text-sm cursor-pointer"
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    required
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Return Reason</label>
                  <select
                    className="input text-sm cursor-pointer"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                  >
                    <option value="near_expiry">Near Expiry (&lt; 90 days)</option>
                    <option value="expired">Expired Medicine Batch</option>
                    <option value="damaged">Damaged in Transit / Broken Seal</option>
                    <option value="recalled">DRAP / Manufacturer Recall</option>
                    <option value="overstocked">Excess / Overstocked</option>
                    <option value="wrong_item">Wrong Item Delivered</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Refund / Settlement Method</label>
                  <select
                    className="input text-sm cursor-pointer"
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value)}
                  >
                    <option value="credit_note">Credit Note (Deduct from Accounts Payable)</option>
                    <option value="cash">Cash Refund Received</option>
                    <option value="bank_transfer">Direct Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Distributor Memo</label>
                  <input
                    type="text"
                    placeholder="e.g. Return authorization per distributor rep"
                    className="input text-sm"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="border rounded-lg p-3 bg-gray-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">Return Items</span>
                  <button type="button" onClick={addItemRow} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1">
                    <PlusCircle size={13} /> Add Product
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 bg-white p-2.5 rounded-lg border">
                      <div className="flex-1 w-full sm:w-auto">
                        <select
                          className="input text-xs"
                          value={item.productId}
                          onChange={(e) => updateItemField(idx, 'productId', e.target.value)}
                          required
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-full sm:w-28">
                        <input
                          type="text"
                          placeholder="Batch #"
                          className="input text-xs font-mono"
                          value={item.batchNumber}
                          onChange={(e) => updateItemField(idx, 'batchNumber', e.target.value)}
                        />
                      </div>

                      <div className="w-full sm:w-20">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          className="input text-xs"
                          value={item.quantity}
                          onChange={(e) => updateItemField(idx, 'quantity', parseInt(e.target.value) || 1)}
                          required
                        />
                      </div>

                      <div className="w-full sm:w-24">
                        <input
                          type="number"
                          step="any"
                          placeholder="Cost"
                          className="input text-xs"
                          value={item.unitCost}
                          onChange={(e) => updateItemField(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                          required
                        />
                      </div>

                      <div className="w-24 text-right font-semibold text-xs text-gray-900 pr-1">
                        {pkr((item.quantity || 0) * (item.unitCost || 0))}
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="text-gray-400 hover:text-red-600 p-1"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2 border-t font-semibold text-sm">
                  <span>Total Debit Note Value:</span>
                  <span className="text-base font-bold text-indigo-700">{pkr(calculateTotal())}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-ghost text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary bg-indigo-600 hover:bg-indigo-700 text-sm px-5">
                  {submitting ? 'Processing Return...' : 'Confirm & Generate Debit Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Debit Note Modal */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <FileText className="text-indigo-600" size={20} />
                <h3 className="font-bold text-gray-900 text-lg">Debit Note #{selectedReturn.returnNumber}</h3>
              </div>
              <button onClick={() => setSelectedReturn(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="flex justify-between border-b pb-3">
                <div>
                  <span className="text-xs text-gray-500 block">Supplier:</span>
                  <strong className="text-gray-900">{selectedReturn.supplier.name}</strong>
                  {selectedReturn.supplier.phone && (
                    <span className="text-xs text-gray-400 block font-mono">{selectedReturn.supplier.phone}</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 block">Date Issued:</span>
                  <strong className="text-gray-900">
                    {new Date(selectedReturn.createdAt).toLocaleDateString('en-PK', { dateStyle: 'medium' })}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Reason:</span>{' '}
                  <strong className="text-gray-800">{reasonLabels[selectedReturn.reason] || selectedReturn.reason}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Settlement:</span>{' '}
                  <strong className="text-gray-800 capitalize">{selectedReturn.refundMethod.replace('_', ' ')}</strong>
                </div>
              </div>

              {selectedReturn.notes && (
                <div className="p-2.5 bg-gray-50 rounded text-xs text-gray-600 italic">
                  Note: {selectedReturn.notes}
                </div>
              )}

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs divide-y">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="p-2">Batch</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Cost</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedReturn.items.map((item) => (
                      <tr key={item.id}>
                        <td className="p-2 font-mono text-gray-700">{item.batchNumber || '—'}</td>
                        <td className="p-2 text-center">{item.quantity}</td>
                        <td className="p-2 text-right">{pkr(Number(item.unitCost))}</td>
                        <td className="p-2 text-right font-semibold">{pkr(Number(item.lineTotal))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2 border-t font-bold text-base">
                <span>Total Debit Amount:</span>
                <span className="text-indigo-700">{pkr(selectedReturn.totalAmount)}</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button onClick={() => window.print()} className="btn-ghost border text-xs gap-1.5">
                  <Printer size={14} /> Print Debit Note
                </button>
                <button onClick={() => setSelectedReturn(null)} className="btn-primary text-xs px-4">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}