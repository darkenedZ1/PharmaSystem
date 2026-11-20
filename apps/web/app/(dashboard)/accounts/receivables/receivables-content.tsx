'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Users,
  AlertTriangle,
  Clock,
  Search,
  CheckCircle2,
  X,
  Phone,
  MessageCircle,
  Download,
  ShieldAlert,
  ArrowDownLeft,
} from 'lucide-react';

interface CustomerReceivable {
  id: string;
  name: string;
  phone?: string;
  cnic?: string;
  creditLimit: number;
  creditBalance: number;
  utilization: number;
  isOverLimit: boolean;
  lastSaleDate: string;
  aging: {
    current: number;
    days30_60: number;
    days60_90: number;
    over90: number;
  };
  recentSales: {
    id: string;
    invoiceNumber: string;
    total: number;
    saleDate: string;
  }[];
}

interface ReceivablesData {
  summary: {
    totalReceivable: number;
    customerCount: number;
    creditLimitExceeded: number;
    agingSummary: {
      current: number;
      days30_60: number;
      days60_90: number;
      over90: number;
    };
  };
  customers: CustomerReceivable[];
}

const pkr = (n: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

export function ReceivablesContent() {
  const [data, setData] = useState<ReceivablesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterOverLimit, setFilterOverLimit] = useState(false);

  // Collection Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerReceivable | null>(null);
  const [collectAmount, setCollectAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'card' | 'easypaisa' | 'jazzcash'>('cash');
  const [refNumber, setRefNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/accounts/receivables');
      setData(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load Accounts Receivable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCollectionModal = (cust: CustomerReceivable) => {
    setSelectedCustomer(cust);
    setCollectAmount(cust.creditBalance > 0 ? cust.creditBalance.toString() : '');
    setRefNumber('');
    setNotes('');
    setIsModalOpen(true);
  };

  const submitCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const amount = parseFloat(collectAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid collection amount');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/accounts/receivables/collect', {
        customerId: selectedCustomer.id,
        amount,
        paymentMethod,
        referenceNumber: refNumber,
        notes,
      });

      toast.success(res.data.message || 'Payment collected successfully');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to record customer collection');
    } finally {
      setSubmitting(false);
    }
  };

  const sendWhatsAppReminder = (cust: CustomerReceivable) => {
    if (!cust.phone) {
      toast.error('Customer has no phone number on record');
      return;
    }
    const cleanPhone = cust.phone.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('92') ? cleanPhone : '92' + cleanPhone.replace(/^0/, '');
    const text = encodeURIComponent(
      `Assalam-o-Alaikum ${cust.name}, this is a gentle reminder from SmartBiz Pharmacy regarding your outstanding credit balance of PKR ${cust.creditBalance.toLocaleString()}. Kindly arrange payment at your earliest convenience. Thank you!`
    );
    window.open(`https://wa.me/${phoneWithCountry}?text=${text}`, '_blank');
  };

  const filteredCustomers = (data?.customers || []).filter((c) => {
    const matches =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search)) ||
      (c.cnic && c.cnic.includes(search));

    if (filterOverLimit) {
      return matches && c.isOverLimit;
    }
    return matches;
  });

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ['Customer Name', 'Phone', 'Credit Limit', 'Credit Balance', 'Utilization %', 'Over Limit', 'Last Transaction'],
      ...data.customers.map((c) => [
        c.name,
        c.phone || '',
        c.creditLimit.toString(),
        c.creditBalance.toString(),
        `${c.utilization}%`,
        c.isOverLimit ? 'YES' : 'NO',
        new Date(c.lastSaleDate).toLocaleDateString('en-PK'),
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Accounts_Receivable_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Receivables report exported to CSV');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-7 w-7 text-emerald-600" />
            <h1 className="text-2xl font-bold text-gray-900">Accounts Receivable (AR)</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Customer Credit Ledger, Aging Schedules & Payment Recovery
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mr-3"></div>
          Loading customer receivables ledger...
        </div>
      ) : !data ? (
        <div className="card text-center py-16 text-gray-400">No receivable records found.</div>
      ) : (
        <>
          {/* Key KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card bg-gradient-to-br from-emerald-50/70 to-white border-emerald-100">
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Total Receivables</span>
              <p className="text-2xl font-bold text-gray-900 mt-2">{pkr(data.summary.totalReceivable)}</p>
              <span className="text-xs text-gray-500 mt-1 block">Due from {data.summary.customerCount} credit customers</span>
            </div>

            <div className="card bg-gradient-to-br from-red-50/70 to-white border-red-100">
              <span className="text-xs font-semibold text-red-700 uppercase tracking-wider flex items-center gap-1">
                <ShieldAlert size={14} /> Limit Breached
              </span>
              <p className="text-2xl font-bold text-red-700 mt-2">{data.summary.creditLimitExceeded}</p>
              <span className="text-xs text-red-600/80 mt-1 block">Customers exceeding authorized credit limit</span>
            </div>

            <div className="card bg-gradient-to-br from-blue-50/70 to-white border-blue-100">
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                <Clock size={14} /> Current (0–30d)
              </span>
              <p className="text-2xl font-bold text-gray-900 mt-2">{pkr(data.summary.agingSummary.current)}</p>
              <span className="text-xs text-gray-500 mt-1 block">Healthy recovery cycle</span>
            </div>

            <div className="card bg-gradient-to-br from-purple-50/70 to-white border-purple-100">
              <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Aging Breakdown</span>
              <div className="mt-2 text-xs space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>31–60 Days:</span>
                  <strong className="text-gray-900">{pkr(data.summary.agingSummary.days30_60)}</strong>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>61–90 Days:</span>
                  <strong>{pkr(data.summary.agingSummary.days60_90)}</strong>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>90+ Days:</span>
                  <strong>{pkr(data.summary.agingSummary.over90)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Aging Distribution Visual Bar */}
          <div className="card bg-white p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-gray-700">
              <span>Receivables Aging Distribution</span>
              <span>Total: {pkr(data.summary.totalReceivable)}</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
              {data.summary.totalReceivable > 0 ? (
                <>
                  <div
                    style={{ width: `${(data.summary.agingSummary.current / data.summary.totalReceivable) * 100}%` }}
                    className="bg-emerald-500 h-full"
                    title={`Current: ${pkr(data.summary.agingSummary.current)}`}
                  />
                  <div
                    style={{ width: `${(data.summary.agingSummary.days30_60 / data.summary.totalReceivable) * 100}%` }}
                    className="bg-yellow-400 h-full"
                    title={`31-60d: ${pkr(data.summary.agingSummary.days30_60)}`}
                  />
                  <div
                    style={{ width: `${(data.summary.agingSummary.days60_90 / data.summary.totalReceivable) * 100}%` }}
                    className="bg-orange-500 h-full"
                    title={`61-90d: ${pkr(data.summary.agingSummary.days60_90)}`}
                  />
                  <div
                    style={{ width: `${(data.summary.agingSummary.over90 / data.summary.totalReceivable) * 100}%` }}
                    className="bg-red-600 h-full"
                    title={`90+d: ${pkr(data.summary.agingSummary.over90)}`}
                  />
                </>
              ) : (
                <div className="w-full bg-emerald-200 h-full" />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-1">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> 0–30 Days (Current)</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-400"></span> 31–60 Days</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-500"></span> 61–90 Days</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-600"></span> 90+ Days (High Risk)</span>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search customer name, phone, or CNIC..."
                className="input pl-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterOverLimit(!filterOverLimit)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  filterOverLimit
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                }`}
              >
                {filterOverLimit ? 'Showing Over Limit Only' : 'Filter Over Limit'}
              </button>
            </div>
          </div>

          {/* Customer Receivables Table */}
          <div className="card p-0 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm divide-y divide-gray-200">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Customer</th>
                    <th className="px-4 py-3.5 text-right">Credit Limit</th>
                    <th className="px-4 py-3.5 text-right">Outstanding Balance</th>
                    <th className="px-4 py-3.5">Limit Utilization</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                        No customers match the current search or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-gray-900">{c.name}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                            {c.phone && (
                              <span className="flex items-center gap-1 font-mono text-gray-400">
                                <Phone size={11} /> {c.phone}
                              </span>
                            )}
                            {c.cnic && <span className="font-mono text-gray-400">• CNIC: {c.cnic}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right font-medium text-gray-600">
                          {c.creditLimit > 0 ? pkr(c.creditLimit) : <span className="text-gray-400">No Limit</span>}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="font-bold text-gray-900">{pkr(c.creditBalance)}</span>
                        </td>
                        <td className="px-4 py-4">
                          {c.creditLimit > 0 ? (
                            <div className="space-y-1 w-36">
                              <div className="flex justify-between text-[11px] font-semibold text-gray-600">
                                <span>{c.utilization}%</span>
                                <span>{c.isOverLimit ? 'BREACH' : 'OK'}</span>
                              </div>
                              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${Math.min(100, c.utilization)}%` }}
                                  className={`h-full ${
                                    c.isOverLimit ? 'bg-red-600' : c.utilization > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {c.isOverLimit ? (
                            <span className="badge badge-red">Limit Exceeded</span>
                          ) : c.creditBalance === 0 ? (
                            <span className="badge badge-green">Clear</span>
                          ) : (
                            <span className="badge badge-blue">Active Credit</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {c.phone && c.creditBalance > 0 && (
                              <button
                                onClick={() => sendWhatsAppReminder(c)}
                                title="Send WhatsApp Payment Reminder"
                                className="p-1.5 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 transition-colors"
                              >
                                <MessageCircle size={15} />
                              </button>
                            )}
                            <button
                              onClick={() => openCollectionModal(c)}
                              disabled={c.creditBalance <= 0}
                              className="btn-primary text-xs py-1.5 px-3 disabled:opacity-40"
                            >
                              Collect Payment
                            </button>
                          </div>
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

      {/* Collect Payment Modal */}
      {isModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Receive Customer Payment</h3>
                <p className="text-xs text-gray-500 mt-0.5">Debit Cash/Bank & Credit Accounts Receivable</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submitCollection} className="p-6 space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                <div className="text-xs text-emerald-800 font-medium">Customer:</div>
                <div className="font-bold text-gray-900 text-base">{selectedCustomer.name}</div>
                <div className="text-xs text-emerald-900 mt-1 flex justify-between">
                  <span>Current Outstanding Credit:</span>
                  <strong>{pkr(selectedCustomer.creditBalance)}</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Collection Amount (PKR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  step="any"
                  placeholder="e.g. 5000"
                  className="input font-semibold text-base"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Method / Channel</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-colors ${
                      paymentMethod === 'cash'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bank_transfer')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-colors ${
                      paymentMethod === 'bank_transfer'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Meezan Bank
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('jazzcash')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-colors ${
                      paymentMethod === 'jazzcash'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    JazzCash / Easypaisa
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Reference / Transaction ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. JC-782190 or Slip #104"
                  className="input text-sm"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Narration</label>
                <input
                  type="text"
                  placeholder="e.g. Partial recovery for monthly prescription"
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
                  className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-sm px-5"
                >
                  {submitting ? 'Recording...' : 'Confirm Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}