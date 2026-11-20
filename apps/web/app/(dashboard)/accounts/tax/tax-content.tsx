'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Calculator,
  Printer,
  Download,
  Calendar,
  Building,
  ShieldCheck,
  FileCheck,
  AlertCircle,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';

interface TaxData {
  period: { from: string; to: string };
  taxpayer: {
    businessName: string;
    ntn: string;
    strn: string;
    jurisdiction: string;
  };
  outputTax: {
    grossSales: number;
    zeroRatedPharmaSales: number;
    standardTaxableSales: number;
    taxCollected: number;
    standardRate: string;
    pharmaRate: string;
  };
  inputTax: {
    totalPurchases: number;
    inputTaxClaimable: number;
    grnCount: number;
  };
  withholdingTax: {
    section153Supplies: number;
    rate: string;
    description: string;
  };
  settlement: {
    netSalesTaxPayable: number;
    whtLiability: number;
    totalTaxPayableToGovt: number;
    status: string;
    filingDeadline: string;
  };
}

const pkr = (n: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

export function TaxContent() {
  const [data, setData] = useState<TaxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/accounts/tax-summary', { params: { from, to } });
      setData(res.data);
    } catch {
      toast.error('Failed to load tax summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [from, to]);

  const exportCsv = () => {
    if (!data) return;

    const rows = [
      ['Tax Metric / Schedule', 'Amount (PKR)', 'Applicable Rate / Section'],
      ['Gross POS Sales', data.outputTax.grossSales.toFixed(2), 'Total Revenue'],
      ['Zero-Rated Drug Sales (DRAP 5th Sched)', data.outputTax.zeroRatedPharmaSales.toFixed(2), '0% (Exempt)'],
      ['Taxable Non-Pharma Goods', data.outputTax.standardTaxableSales.toFixed(2), data.outputTax.standardRate],
      ['Output Sales Tax Collected', data.outputTax.taxCollected.toFixed(2), 'FBR Output GST'],
      ['Total Stock Purchases (GRN)', data.inputTax.totalPurchases.toFixed(2), `${data.inputTax.grnCount} Shipments`],
      ['Input Tax Paid to Distributors', data.inputTax.inputTaxClaimable.toFixed(2), 'Claimable GST'],
      ['Net Sales Tax Due to FBR', data.settlement.netSalesTaxPayable.toFixed(2), 'Output - Input'],
      ['Withholding Tax Deducted on Suppliers', data.withholdingTax.section153Supplies.toFixed(2), 'Section 153 (4.5%)'],
      ['Total Government Tax Remittance', data.settlement.totalTaxPayableToGovt.toFixed(2), 'Payment Due'],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Tax_Summary_${from}_to_${to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Tax summary CSV exported');
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto print:p-0">
      {/* Header toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="h-7 w-7 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Pakistani Tax Summary & Filings</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            FBR Federal Sales Tax, Withholding Tax (Section 153), Provincial Filings & Zero-Rated Drug Status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5 shadow-sm">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              className="text-xs border-0 focus:ring-0 p-0 text-gray-700"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="date"
              className="text-xs border-0 focus:ring-0 p-0 text-gray-700"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <button
            onClick={exportCsv}
            className="btn-secondary inline-flex items-center gap-1.5 text-xs font-semibold"
          >
            <Download size={14} /> Export CSV
          </button>

          <button
            onClick={() => window.print()}
            className="btn-primary inline-flex items-center gap-1.5 text-xs font-semibold"
          >
            <Printer size={14} /> Print Filing Summary
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-24 text-gray-400">
          <RefreshCw className="animate-spin mr-2 h-5 w-5" />
          Computing fiscal tax statements...
        </div>
      ) : !data ? (
        <div className="card text-center py-16 text-gray-400">No tax data found for this period</div>
      ) : (
        <div className="space-y-6">
          {/* Taxpayer Registration Banner */}
          <div className="card bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                  Registered Tax Entity
                </span>
                <h2 className="text-2xl font-bold mt-1">{data.taxpayer.businessName}</h2>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-300 font-mono">
                  <span>NTN: <strong className="text-white">{data.taxpayer.ntn}</strong></span>
                  <span>STRN: <strong className="text-white">{data.taxpayer.strn}</strong></span>
                  <span>Jurisdiction: <strong className="text-white">{data.taxpayer.jurisdiction}</strong></span>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-right">
                <span className="text-xs text-indigo-200">Upcoming E-Filing Deadline</span>
                <p className="text-lg font-bold font-mono text-amber-300 mt-0.5">
                  {new Date(data.settlement.filingDeadline).toLocaleDateString('en-PK', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <span className="text-[10px] text-gray-300">15th of the month via Iris</span>
              </div>
            </div>
          </div>

          {/* Top 3 Settlement Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Output Tax */}
            <div className="card p-5 border-l-4 border-l-blue-500">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Output Sales Tax (Collected)
              </span>
              <p className="text-2xl font-bold text-gray-900 mt-2">{pkr(data.outputTax.taxCollected)}</p>
              <div className="mt-3 text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>Standard Goods (18%):</span>
                  <span className="font-medium text-gray-700">{pkr(data.outputTax.standardTaxableSales)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Zero-Rated Medicines (0%):</span>
                  <span>{pkr(data.outputTax.zeroRatedPharmaSales)}</span>
                </div>
              </div>
            </div>

            {/* Input Tax */}
            <div className="card p-5 border-l-4 border-l-emerald-500">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Input Tax Claimable (Purchases)
              </span>
              <p className="text-2xl font-bold text-emerald-600 mt-2">{pkr(data.inputTax.inputTaxClaimable)}</p>
              <div className="mt-3 text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>Total Stock Procured:</span>
                  <span className="font-medium text-gray-700">{pkr(data.inputTax.totalPurchases)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GRN Batches Received:</span>
                  <span className="font-medium text-gray-700">{data.inputTax.grnCount} shipments</span>
                </div>
              </div>
            </div>

            {/* Net Due / Settlement */}
            <div className="card p-5 border-l-4 border-l-purple-500 bg-purple-50/20">
              <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                Total Tax Payable to Govt
              </span>
              <p className="text-2xl font-bold text-purple-900 mt-2">
                {pkr(data.settlement.totalTaxPayableToGovt)}
              </p>
              <div className="mt-3 text-xs text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Net FBR Sales Tax:</span>
                  <span className="font-bold">{pkr(data.settlement.netSalesTaxPayable)}</span>
                </div>
                <div className="flex justify-between">
                  <span>WHT Liability (Sec 153):</span>
                  <span className="font-bold">{pkr(data.withholdingTax.section153Supplies)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Tax Schedules Table */}
          <div className="card overflow-hidden p-0">
            <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">
                Statutory Tax Reconciliation Breakdown
              </h3>
              <span className="text-xs text-gray-500">Federal Sales Tax Act 1990 & ITO 2001</span>
            </div>

            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-xs font-semibold text-gray-600 border-b">
                <tr>
                  <th className="px-4 py-3">Schedule / Statutory Section</th>
                  <th className="px-4 py-3">Transaction Base (PKR)</th>
                  <th className="px-4 py-3 text-center">Statutory Rate</th>
                  <th className="px-4 py-3 text-right">Tax Obligation (PKR)</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">5th Schedule — Prescription Pharmaceuticals</div>
                    <div className="text-xs text-gray-500">DRAP approved registered medicines (Finished Goods)</div>
                  </td>
                  <td className="px-4 py-3 font-mono">{pkr(data.outputTax.zeroRatedPharmaSales)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="badge-green text-xs font-semibold">0% Zero-Rated</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-600 font-medium">Rs. 0</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs text-emerald-600 font-medium">Tax Exempt</span>
                  </td>
                </tr>

                <tr>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">Standard Schedule — OTC Cosmetics & Goods</div>
                    <div className="text-xs text-gray-500">Surgics, baby food, toiletries, unexempt consumer goods</div>
                  </td>
                  <td className="px-4 py-3 font-mono">{pkr(data.outputTax.standardTaxableSales)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="badge-blue text-xs font-semibold">18% Standard</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">
                    {pkr(data.outputTax.taxCollected)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs text-blue-600 font-medium">Output Collected</span>
                  </td>
                </tr>

                <tr>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">Input Tax Offset — Supplier Goods</div>
                    <div className="text-xs text-gray-500">Sales tax invoiced by registered pharmaceutical distributors</div>
                  </td>
                  <td className="px-4 py-3 font-mono">{pkr(data.inputTax.totalPurchases)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="badge-gray text-xs">Section 8 / 8A</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-600 font-medium">
                    -{pkr(data.inputTax.inputTaxClaimable)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs text-emerald-600 font-medium">Claimable Offset</span>
                  </td>
                </tr>

                <tr className="bg-purple-50/30">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-purple-950">Section 153 — WHT on Supplier Payments</div>
                    <div className="text-xs text-purple-700">Withholding income tax deducted from distributor cheques</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-purple-950">{pkr(data.inputTax.totalPurchases)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="badge-yellow text-xs font-semibold">4.5% Supplies</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-purple-900">
                    {pkr(data.withholdingTax.section153Supplies)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs text-purple-700 font-medium">Monthly CPR Slip</span>
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-gray-100 font-bold text-gray-900">
                <tr>
                  <td colSpan={3} className="px-4 py-3">Net Balance Remittance to State Bank / FBR</td>
                  <td className="px-4 py-3 text-right font-mono text-base text-indigo-700">
                    {pkr(data.settlement.totalTaxPayableToGovt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="badge-blue text-xs">Filing Required</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
