'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { BookOpen } from 'lucide-react';

interface Account {
  id: string;
  code: string;
  name: string;
  accountType: string;
  balance: number;
}

interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

const ACCOUNT_TYPE_ORDER = ['asset', 'liability', 'equity', 'revenue', 'expense'];
const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expenses',
};

const pkr = (n: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

const now = new Date();
const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
const todayStr = now.toISOString().slice(0, 10);

export function LedgerContent() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selected, setSelected] = useState<Account | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(todayStr);
  const [accsLoading, setAccsLoading] = useState(true);
  const [entriesLoading, setEntriesLoading] = useState(false);

  useEffect(() => {
    setAccsLoading(true);
    api.get('/accounts/chart')
      .then((res) => setAccounts(res.data))
      .catch(() => toast.error('Failed to load accounts'))
      .finally(() => setAccsLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setEntriesLoading(true);
    api.get(`/accounts/ledger/${selected.id}`, { params: { from, to } })
      .then((res) => setEntries(Array.isArray(res.data) ? res.data : (res.data.entries ?? [])))
      .catch(() => toast.error('Failed to load ledger entries'))
      .finally(() => setEntriesLoading(false));
  }, [selected, from, to]);

  const grouped = ACCOUNT_TYPE_ORDER.reduce<Record<string, Account[]>>((acc, type) => {
    acc[type] = accounts.filter((a) => a.accountType === type);
    return acc;
  }, {});

  const closingBalance = entries.length > 0 ? entries[entries.length - 1].balance : 0;

  return (
    <div className="flex h-full gap-0">
      {/* Left Panel: Account Tree */}
      <div className="w-64 flex-shrink-0 border-r overflow-y-auto">
        {accsLoading ? (
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Loading...</div>
        ) : (
          <div className="p-3">
            {ACCOUNT_TYPE_ORDER.map((type) => {
              const group = grouped[type];
              if (!group || group.length === 0) return null;
              return (
                <div key={type} className="mb-4">
                  <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {ACCOUNT_TYPE_LABELS[type]}
                  </p>
                  {group.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => setSelected(acc)}
                      className={`w-full rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                        selected?.id === acc.id
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-mono text-xs text-gray-400 mr-1">{acc.code}</span>
                      {acc.name}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Panel: Ledger Entries */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400 p-6">
            <BookOpen size={48} />
            <p className="text-lg font-medium">Select an Account</p>
            <p className="text-sm text-center max-w-sm">
              Choose an account from the left panel to view its ledger entries
            </p>
          </div>
        ) : (
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  <span className="text-gray-400 mr-2 font-mono text-base">{selected.code}</span>
                  {selected.name}
                </h2>
                <p className="text-sm text-gray-500 capitalize">{selected.accountType}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="input w-36 text-sm"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
                <span className="text-gray-400 text-sm">to</span>
                <input
                  type="date"
                  className="input w-36 text-sm"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </div>

            {entriesLoading ? (
              <div className="card flex items-center justify-center py-12 text-gray-400">Loading entries...</div>
            ) : entries.length === 0 ? (
              <div className="card flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
                <BookOpen size={40} />
                <p>No entries for the selected period</p>
              </div>
            ) : (
              <div className="card overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-right">Debit</th>
                      <th className="px-4 py-3 text-right">Credit</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {entries.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">
                          {new Date(e.date).toLocaleDateString('en-PK')}
                        </td>
                        <td className="px-4 py-3 text-gray-800">{e.description}</td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {Number(e.debit) > 0 ? pkr(Number(e.debit)) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {Number(e.credit) > 0 ? pkr(Number(e.credit)) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {pkr(Number(e.balance))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t bg-gray-50">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                        Closing Balance
                      </td>
                      <td className="px-4 py-3 text-right text-base font-bold text-gray-900">
                        {pkr(closingBalance)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
