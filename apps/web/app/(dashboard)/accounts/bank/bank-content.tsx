'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Landmark,
  ArrowRightLeft,
  PlusCircle,
  X,
  CreditCard,
  Building,
  CheckCircle2,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
} from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  description: string;
  referenceType?: string;
  debit: number;
  credit: number;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban?: string;
  branchCode?: string;
  openingBalance: number;
  currentBalance: number;
  accountId?: string;
  transactions: Transaction[];
}

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  accountType: string;
}

const pkr = (n: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

export function BankContent() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [chartAccounts, setChartAccounts] = useState<ChartAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  // Add Bank Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [bankName, setBankName] = useState('Meezan Bank Ltd');
  const [accountTitle, setAccountTitle] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Transfer Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bankRes, chartRes] = await Promise.all([
        api.get('/accounts/bank'),
        api.get('/accounts/chart'),
      ]);
      setBankAccounts(bankRes.data || []);
      setChartAccounts((chartRes.data || []).filter((a: ChartAccount) => a.accountType === 'asset'));

      if (bankRes.data && bankRes.data.length > 0 && !selectedAccountId) {
        setSelectedAccountId(bankRes.data[0].id);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load bank accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedBank = bankAccounts.find((b) => b.id === selectedAccountId) || bankAccounts[0];
  const totalLiquid = bankAccounts.reduce((s, b) => s + Number(b.currentBalance), 0);

  const submitAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAdd(true);
    try {
      await api.post('/accounts/bank', {
        bankName,
        accountTitle,
        accountNumber,
        iban,
        branchCode,
        openingBalance: parseFloat(openingBalance) || 0,
      });

      toast.success(`${bankName} account added successfully`);
      setIsAddModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to add bank account');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const submitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(transferAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid transfer amount');
      return;
    }
    if (fromAccount === toAccount) {
      toast.error('Source and destination accounts must be different');
      return;
    }

    setSubmittingTransfer(true);
    try {
      await api.post('/accounts/bank/transfer', {
        fromAccountId: fromAccount,
        toAccountId: toAccount,
        amount,
        notes: transferNotes,
      });

      toast.success(`Transferred PKR ${amount.toLocaleString()} successfully`);
      setIsTransferModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to complete fund transfer');
    } finally {
      setSubmittingTransfer(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="h-7 w-7 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Bank Accounts & Treasury</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Corporate Bank Accounts, Cash Books & Internal Fund Transfers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              if (chartAccounts.length >= 2) {
                setFromAccount(chartAccounts[0].id);
                setToAccount(chartAccounts[1].id);
              }
              setTransferAmount('');
              setTransferNotes('');
              setIsTransferModalOpen(true);
            }}
            className="btn-ghost border bg-white shadow-sm text-gray-700"
          >
            <ArrowRightLeft size={15} /> Internal Transfer
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className="btn-primary">
            <PlusCircle size={15} /> Add Bank Account
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-20 text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          Loading bank accounts...
        </div>
      ) : (
        <>
          {/* Key KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card bg-gradient-to-br from-blue-50/70 to-white border-blue-100">
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Total Liquid Treasury</span>
              <p className="text-2xl font-bold text-gray-900 mt-2">{pkr(totalLiquid)}</p>
              <span className="text-xs text-gray-500 mt-1 block">Across all corporate bank accounts</span>
            </div>

            <div className="card bg-gradient-to-br from-emerald-50/70 to-white border-emerald-100">
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Active Bank Accounts</span>
              <p className="text-2xl font-bold text-gray-900 mt-2">{bankAccounts.length}</p>
              <span className="text-xs text-gray-500 mt-1 block">Linked to automated general ledger</span>
            </div>

            <div className="card bg-gradient-to-br from-purple-50/70 to-white border-purple-100">
              <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Primary Banking Partner</span>
              <p className="text-lg font-bold text-gray-900 mt-2">
                {selectedBank ? selectedBank.bankName : 'Meezan Bank Ltd'}
              </p>
              <span className="text-xs text-gray-500 mt-1 block">
                {selectedBank?.iban ? `IBAN: ${selectedBank.iban.slice(0, 14)}...` : 'Islamic Commercial Banking'}
              </span>
            </div>
          </div>

          {/* Bank Accounts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bankAccounts.map((b) => (
              <div
                key={b.id}
                onClick={() => setSelectedAccountId(b.id)}
                className={`card cursor-pointer transition-all p-5 ${
                  selectedBank?.id === b.id
                    ? 'ring-2 ring-blue-600 border-transparent shadow-md bg-blue-50/20'
                    : 'hover:border-blue-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-blue-600" />
                    <h3 className="font-bold text-gray-900 text-sm">{b.bankName}</h3>
                  </div>
                  <span className="badge badge-green text-[10px]">Active</span>
                </div>

                <div className="mt-3 text-xs text-gray-500 space-y-1">
                  <div>
                    Title: <strong className="text-gray-800">{b.accountTitle}</strong>
                  </div>
                  <div>
                    A/C #: <span className="font-mono text-gray-800">{b.accountNumber}</span>
                  </div>
                  {b.iban && (
                    <div>
                      IBAN: <span className="font-mono text-gray-600 text-[11px]">{b.iban}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Current Balance:</span>
                  <span className="text-base font-bold text-blue-700">{pkr(b.currentBalance)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Selected Account Recent Statement */}
          {selectedBank && (
            <div className="card space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">
                    Recent Statement & Transactions: {selectedBank.bankName}
                  </h3>
                  <p className="text-xs text-gray-500">
                    A/C #{selectedBank.accountNumber} • Opening Balance: {pkr(selectedBank.openingBalance)}
                  </p>
                </div>
                <span className="text-sm font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                  Net Balance: {pkr(selectedBank.currentBalance)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs divide-y divide-gray-200">
                  <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Reference</th>
                      <th className="py-2.5 px-3 text-right">Debit (Inflow)</th>
                      <th className="py-2.5 px-3 text-right">Credit (Outflow)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedBank.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">
                          No recent transactions recorded on this bank account.
                        </td>
                      </tr>
                    ) : (
                      selectedBank.transactions.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50/50">
                          <td className="py-2 px-3 text-gray-500 whitespace-nowrap">
                            {new Date(t.date).toLocaleDateString('en-PK')}
                          </td>
                          <td className="py-2 px-3 font-medium text-gray-900">{t.description}</td>
                          <td className="py-2 px-3 font-mono text-gray-500">{t.referenceType || 'Journal'}</td>
                          <td className="py-2 px-3 text-right font-semibold text-emerald-700">
                            {t.debit > 0 ? pkr(t.debit) : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-red-700">
                            {t.credit > 0 ? pkr(t.credit) : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Bank Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-gray-900 text-lg">Add Bank Account</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submitAddBank} className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Name</label>
                <select
                  className="input text-sm cursor-pointer"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                >
                  <option value="Meezan Bank Ltd">Meezan Bank Ltd</option>
                  <option value="Habib Bank Ltd (HBL)">Habib Bank Ltd (HBL)</option>
                  <option value="Bank Alfalah Ltd">Bank Alfalah Ltd</option>
                  <option value="MCB Bank Ltd">MCB Bank Ltd</option>
                  <option value="Faysal Bank Ltd">Faysal Bank Ltd</option>
                  <option value="United Bank Ltd (UBL)">United Bank Ltd (UBL)</option>
                  <option value="Dubai Islamic Bank">Dubai Islamic Bank</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Account Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Al-Shifa Pharmacy (Pvt) Ltd"
                  className="input text-sm"
                  value={accountTitle}
                  onChange={(e) => setAccountTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 01020100456789"
                  className="input text-sm font-mono"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">IBAN (24 Characters)</label>
                <input
                  type="text"
                  placeholder="PK65MEZN0001020100456789"
                  className="input text-sm font-mono"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Branch Code</label>
                  <input
                    type="text"
                    placeholder="0102"
                    className="input text-sm font-mono"
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Opening Balance</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    className="input text-sm"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn-ghost text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={submittingAdd} className="btn-primary text-sm px-5">
                  {submittingAdd ? 'Saving...' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Internal Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-gray-900 text-lg">Internal Fund Transfer</h3>
              <button onClick={() => setIsTransferModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submitTransfer} className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Transfer From (Disbursing)</label>
                <select
                  className="input text-sm cursor-pointer"
                  value={fromAccount}
                  onChange={(e) => setFromAccount(e.target.value)}
                  required
                >
                  {chartAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Transfer To (Receiving)</label>
                <select
                  className="input text-sm cursor-pointer"
                  value={toAccount}
                  onChange={(e) => setToAccount(e.target.value)}
                  required
                >
                  {chartAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Amount (PKR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  step="any"
                  placeholder="e.g. 50000"
                  className="input font-semibold text-base"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Narration</label>
                <input
                  type="text"
                  placeholder="e.g. Cash deposit from register into bank"
                  className="input text-sm"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button type="button" onClick={() => setIsTransferModalOpen(false)} className="btn-ghost text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={submittingTransfer} className="btn-primary text-sm px-5">
                  {submittingTransfer ? 'Transferring...' : 'Confirm Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}