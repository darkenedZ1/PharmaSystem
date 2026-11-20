'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  CreditCard,
  AlertCircle,
  Calendar,
  Clock,
  Search,
  PlusCircle,
  X,
  FileText,
  Building,
  CheckCircle2,
  Phone,
  Download,
} from 'lucide-react';

interface SupplierPayable {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  paymentTerms: number;
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
  overdueAmount: number;
  aging: {
    current: number;
    days30_60: number;
    days60_90: number;
    over90: number;
  };
  recentGrns: {
    id: string;
    invoiceNumber: string;
    receivedDate: string;
    total: number;
  }[];
}

interface PayablesData {
  summary: {
    totalPayable: number;
    overduePayable: number;
    dueThisWeek: number;
    supplierCount: number;
    agingSummary: {
      current: number;
      days30_60: number;
      days60_90: number;
      over90: number;
    };
  };
  suppliers: SupplierPayable[];
}

const pkr = (n: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

export function PayablesContent() {
  const [data, setData] = useState<PayablesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterOverdue, setFilterOverdue] = useState(false);

  // Payment Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierPayable | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<'cash' | 'bank_transfer' | 'cheque'>('bank_transfer');
  const [refNumber, setRefNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/accounts/payables');
      setData(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load Accounts Payable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openPaymentModal = (supplier: SupplierPayable) => {
    setSelectedSupplier(supplier);
    setPayAmount(supplier.outstandingBalance > 0 ? supplier.outstandingBalance.toString() : '');
    setRefNumber('');
    setNotes('');
    setIsModalOpen(true);
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/accounts/payables/payment', {
        supplierId: selectedSupplier.id,
        amount,
        paymentMethod: payMethod,
        referenceNumber: refNumber,
        notes,
      });

      toast.success(res.data.message || 'Payment recorded successfully');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to record supplier payment');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSuppliers = (data?.suppliers || []).filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.phone && s.phone.includes(search)) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(search.toLowerCase()));

    if (filterOverdue) {
      return matchesSearch && s.overdueAmount > 0;
    }
    return matchesSearch;
  });

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ['Supplier Name', 'Phone', 'Payment Terms', 'Total Invoiced', 'Total Paid', 'Outstanding Balance', 'Overdue Amount'],
      ...data.suppliers.map((s) => [
        s.name,
        s.phone || '',
        `${s.paymentTerms} Days`,
        s.totalInvoiced.toString(),
        s.totalPaid.toString(),
        s.outstandingBalance.toString(),
        s.overdueAmount.toString(),
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Accounts_Payable_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Payables report exported to CSV');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-amber-600" />
            <h1 className="text-2xl font-bold text-gray-900">Accounts Payable (AP)</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Distributor Bills, Outstanding Balances & Aging Schedules
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={exportCSV} className="btn-ghost border bg-white shadow-sm text-gray-700">
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-20 text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mr-3"></div>
          Loading Accounts Payable ledger...
        </div>
      ) : !data ? (
        <div className="card text-center py-16 text-gray-400">No payable records found.</div>
      ) : (
        <>
          {/* Key KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card bg-gradient-to-br from-amber-50/70 to-white border-amber-100">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Total Outstanding</span>
              <p className="text-2xl font-bold text-gray-900 mt-2">{pkr(data.summary.totalPayable)}</p>
              <span className="text-xs text-gray-500 mt-1 block">Payable to {data.summary.supplierCount} active distributors</span>
            </div>

            <div className="card bg-gradient-to-br from-red-50/70 to-white border-red-100">
              <span className="text-xs font-semibold text-red-700 uppercase tracking-wider flex items-center gap-1">
                <AlertCircle size={14} /> Overdue Amount
              </span>
              <p className="text-2xl font-bold text-red-700 mt-2">{pkr(data.summary.overduePayable)}</p>
              <span className="text-xs text-red-600/80 mt-1 block">Past agreed distributor credit terms</span>
            </div>

            <div className="card bg-gradient-to-br from-blue-50/70 to-white border-blue-100">
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                <Clock size={14} /> Due This Week
              </span>
              <p className="text-2xl font-bold text-gray-900 mt-2">{pkr(data.summary.dueThisWeek)}</p>
              <span className="text-xs text-gray-500 mt-1 block">Maturing within 7 days</span>
            </div>

            <div className="card bg-gradient-to-br from-gray-50 to-white border-gray-200">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Aging Breakdown</span>
              <div className="mt-2 text-xs space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>0–30 Days (Current):</span>
                  <strong className="text-gray-900">{pkr(data.summary.agingSummary.current)}</strong>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>31–60 Days:</span>
                  <strong>{pkr(data.summary.agingSummary.days30_60)}</strong>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>61+ Days:</span>
                  <strong>{pkr(data.summary.agingSummary.days60_90 + data.summary.agingSummary.over90)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Aging Distribution Visual Bar */}
          <div className="card bg-white p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-gray-700">
              <span>Payables Aging Spectrum</span>
              <span>Total: {pkr(data.summary.totalPayable)}</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
              {data.summary.totalPayable > 0 ? (
                <>
                  <div
                    style={{ width: `${(data.summary.agingSummary.current / data.summary.totalPayable) * 100}%` }}
                    className="bg-green-500 h-full"
                    title={`Current: ${pkr(data.summary.agingSummary.current)}`}
                  />
                  <div
                    style={{ width: `${(data.summary.agingSummary.days30_60 / data.summary.totalPayable) * 100}%` }}
                    className="bg-yellow-400 h-full"
                    title={`31-60d: ${pkr(data.summary.agingSummary.days30_60)}`}
                  />
                  <div
                    style={{ width: `${(data.summary.agingSummary.days60_90 / data.summary.totalPayable) * 100}%` }}
                    className="bg-orange-500 h-full"
                    title={`61-90d: ${pkr(data.summary.agingSummary.days60_90)}`}
                  />
                  <div
                    style={{ width: `${(data.summary.agingSummary.over90 / data.summary.totalPayable) * 100}%` }}
                    className="bg-red-600 h-full"
                    title={`90+d: ${pkr(data.summary.agingSummary.over90)}`}
                  />
                </>
              ) : (
                <div className="w-full bg-green-200 h-full" />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-1">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500"></span> 0–30 Days (Current)</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-400"></span> 31–60 Days</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-500"></span> 61–90 Days</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-600"></span> 90+ Days (Critical)</span>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search supplier name, contact, or phone..."
                className="input pl-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterOverdue(!filterOverdue)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  filterOverdue
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                }`}
              >
                {filterOverdue ? 'Showing Overdue Only' : 'Filter Overdue'}
              </button>
            </div>
          </div>

          {/* Supplier Payables Table */}
          <div className="card p-0 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm divide-y divide-gray-200">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Supplier / Distributor</th>
                    <th className="px-4 py-3.5">Terms</th>
                    <th className="px-4 py-3.5 text-right">Total Invoiced</th>
                    <th className="px-4 py-3.5 text-right">Total Paid</th>
                    <th className="px-4 py-3.5 text-right">Outstanding</th>
                    <th className="px-4 py-3.5 text-center">Aging Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                        No suppliers match the current search or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((supplier) => (
                      <tr key={supplier.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-gray-900">{supplier.name}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                            {supplier.contactPerson && <span>{supplier.contactPerson}</span>}
                            {supplier.phone && (
                              <span className="flex items-center gap-1 text-gray-400 font-mono">
                                <Phone size={11} /> {supplier.phone}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs">
                          <span className="badge badge-gray font-mono">{supplier.paymentTerms} Days</span>
                        </td>
                        <td className="px-4 py-4 text-right font-medium text-gray-600">
                          {pkr(supplier.totalInvoiced)}
                        </td>
                        <td className="px-4 py-4 text-right font-medium text-green-700">
                          {pkr(supplier.totalPaid)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="font-bold text-gray-900">{pkr(supplier.outstandingBalance)}</span>
                          {supplier.overdueAmount > 0 && (
                            <span className="block text-[11px] font-semibold text-red-600">
                              Overdue: {pkr(supplier.overdueAmount)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {supplier.outstandingBalance === 0 ? (
                            <span className="badge badge-green">Paid in Full</span>
                          ) : supplier.overdueAmount > 0 ? (
                            <span className="badge badge-red">Overdue</span>
                          ) : (
                            <span className="badge badge-blue">Within Terms</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => openPaymentModal(supplier)}
                            disabled={supplier.outstandingBalance <= 0}
                            className="btn-primary text-xs py-1.5 px-3 disabled:opacity-40"
                          >
                            Pay Supplier
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Record Payment Modal */}
      {isModalOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Record Supplier Payment</h3>
                <p className="text-xs text-gray-500 mt-0.5">Debit Accounts Payable & Credit Cash/Bank</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submitPayment} className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <div className="text-xs text-amber-800 font-medium">Paying Supplier:</div>
                <div className="font-bold text-gray-900 text-base">{selectedSupplier.name}</div>
                <div className="text-xs text-amber-900 mt-1 flex justify-between">
                  <span>Current Outstanding Balance:</span>
                  <strong>{pkr(selectedSupplier.outstandingBalance)}</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Payment Amount (PKR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  step="any"
                  placeholder="e.g. 25000"
                  className="input font-semibold text-base"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayMethod('bank_transfer')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-colors ${
                      payMethod === 'bank_transfer'
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Meezan Bank
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod('cash')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-colors ${
                      payMethod === 'cash'
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Cash in Hand
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod('cheque')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-colors ${
                      payMethod === 'cheque'
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Cheque
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Reference / Cheque Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. CHQ-98421 or IBFT-492104"
                  className="input text-sm"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Narration</label>
                <input
                  type="text"
                  placeholder="e.g. Clearing invoice for Augmentin batch"
                  className="input text-sm"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-ghost text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-sm px-5"
                >
                  {submitting ? 'Recording...' : 'Confirm & Post Journal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}