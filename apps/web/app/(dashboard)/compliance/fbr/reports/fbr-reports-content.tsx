'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt,
  TrendingUp,
  Percent,
} from 'lucide-react';

interface ReportMetrics {
  totalInvoices: number;
  totalSales: number;
  totalTax: number;
  totalExemptSales: number;
  totalStandardSales: number;
  verifiedCount: number;
  queuedCount: number;
  compliancePercentage: number;
}

interface AnnexureCRow {
  id: string;
  invoiceNumber: string;
  fbrInvoiceNumber: string;
  usin: string;
  dateTime: string;
  buyerName: string;
  buyerType: string;
  buyerNTN: string;
  grossAmount: number;
  taxRate: string;
  taxAmount: number;
  totalAmount: number;
  fbrStatus: string;
}

const pkr = (n: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

export function FbrReportsContent() {
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
  const [rows, setRows] = useState<AnnexureCRow[]>([]);
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
      const res = await api.get('/fbr/reports', { params: { from, to } });
      setMetrics(res.data.metrics);
      setRows(res.data.annexureCRows || []);
    } catch {
      toast.error('Failed to load FBR reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [from, to]);

  const exportAnnexureCCsv = () => {
    if (!rows.length) {
      toast.error('No invoices to export for this period');
      return;
    }

    const headers = [
      'Sr No',
      'Invoice Number',
      'FBR USIN / Invoice ID',
      'Date Time',
      'Buyer Name',
      'Buyer Type',
      'Buyer NTN/CNIC',
      'Value Sales Excl Tax (PKR)',
      'Sales Tax Rate',
      'Sales Tax Amount (PKR)',
      'Total Invoice Amount (PKR)',
      'FBR Sync Status',
    ];

    const csvRows = rows.map((r, i) => [
      i + 1,
      `"${r.invoiceNumber}"`,
      `"${r.fbrInvoiceNumber || r.usin}"`,
      `"${new Date(r.dateTime).toLocaleString('en-PK')}"`,
      `"${r.buyerName}"`,
      `"${r.buyerType}"`,
      `"${r.buyerNTN}"`,
      r.grossAmount.toFixed(2),
      `"${r.taxRate}"`,
      r.taxAmount.toFixed(2),
      r.totalAmount.toFixed(2),
      `"${r.fbrStatus}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FBR_Annexure_C_${from}_to_${to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Annexure-C CSV file downloaded');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto print:p-0">
      {/* Header toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-7 w-7 text-emerald-600" />
            <h1 className="text-2xl font-bold text-gray-900">FBR Sales Tax & Annexure-C Reports</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Monthly Sales Tax Returns, Zero-Rated Drug Schedules, and IRIS-Compatible Fiscal Invoices.
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
            onClick={exportAnnexureCCsv}
            className="btn-secondary inline-flex items-center gap-1.5 text-xs font-semibold"
          >
            <Download size={14} /> Export IRIS Annex-C
          </button>

          <button
            onClick={() => window.print()}
            className="btn-primary inline-flex items-center gap-1.5 text-xs font-semibold"
          >
            <Printer size={14} /> Print Report
          </button>
        </div>
      </div>

      {/* Printable Letterhead Header */}
      <div className="hidden print:block border-b pb-4 mb-4">
        <h1 className="text-xl font-bold">SmartBiz Pharmacy — FBR Sales Tax Register (Annexure-C)</h1>
        <p className="text-xs text-gray-600">
          Period: {from} to {to} · Generated On: {new Date().toLocaleDateString('en-PK')}
        </p>
      </div>

      {/* KPI Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="card p-4">
            <span className="text-xs font-medium text-gray-500">Total Invoices</span>
            <p className="text-xl font-bold text-gray-900 mt-1">{metrics.totalInvoices}</p>
            <span className="text-[10px] text-gray-400">Fiscal period</span>
          </div>

          <div className="card p-4">
            <span className="text-xs font-medium text-gray-500">Total Gross Sales</span>
            <p className="text-xl font-bold text-gray-900 mt-1">{pkr(metrics.totalSales)}</p>
            <span className="text-[10px] text-gray-400">Excl / Incl Tax</span>
          </div>

          <div className="card p-4">
            <span className="text-xs font-medium text-emerald-700">Exempt Drugs (0%)</span>
            <p className="text-xl font-bold text-emerald-600 mt-1">{pkr(metrics.totalExemptSales)}</p>
            <span className="text-[10px] text-emerald-600">5th Schedule DRAP</span>
          </div>

          <div className="card p-4">
            <span className="text-xs font-medium text-blue-700">Taxable Goods (18%)</span>
            <p className="text-xl font-bold text-blue-600 mt-1">{pkr(metrics.totalStandardSales)}</p>
            <span className="text-[10px] text-blue-500">Cosmetics / OTC</span>
          </div>

          <div className="card p-4">
            <span className="text-xs font-medium text-purple-700">GST Collected</span>
            <p className="text-xl font-bold text-purple-600 mt-1">{pkr(metrics.totalTax)}</p>
            <span className="text-[10px] text-purple-500">Output tax liability</span>
          </div>

          <div className="card p-4">
            <span className="text-xs font-medium text-gray-500">FBR Compliance</span>
            <p className="text-xl font-bold text-emerald-600 mt-1">{metrics.compliancePercentage}%</p>
            <span className="text-[10px] text-emerald-600">{metrics.verifiedCount} verified</span>
          </div>
        </div>
      )}

      {/* Annexure-C Fiscal Register */}
      <div className="card overflow-hidden p-0">
        <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">
              FBR Annexure-C Invoice Register ({rows.length} records)
            </h2>
          </div>
          <span className="text-xs text-gray-500">Iris POS XML/JSON Spec v1.2</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading FBR fiscal data...</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-gray-400 space-y-2">
            <FileText size={36} className="mx-auto text-gray-300" />
            <p>No invoices recorded in this period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-gray-600 font-semibold border-b">
                <tr>
                  <th className="px-3 py-2.5">Invoice #</th>
                  <th className="px-3 py-2.5">FBR USIN / Invoice ID</th>
                  <th className="px-3 py-2.5">Date & Time</th>
                  <th className="px-3 py-2.5">Buyer Category</th>
                  <th className="px-3 py-2.5 text-right">Value Excl. ST</th>
                  <th className="px-3 py-2.5 text-center">Tax Rate</th>
                  <th className="px-3 py-2.5 text-right">Sales Tax</th>
                  <th className="px-3 py-2.5 text-right font-bold">Total (PKR)</th>
                  <th className="px-3 py-2.5 text-center">FBR Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 font-mono font-medium text-blue-600">{row.invoiceNumber}</td>
                    <td className="px-3 py-2 font-mono text-gray-600 truncate max-w-[140px]" title={row.fbrInvoiceNumber}>
                      {row.fbrInvoiceNumber}
                    </td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      {new Date(row.dateTime).toLocaleString('en-PK', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      <div>{row.buyerName}</div>
                      <span className="text-[10px] text-gray-400">{row.buyerType}</span>
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700">{pkr(row.grossAmount)}</td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          row.taxRate.includes('0%')
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {row.taxRate}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-purple-700">{pkr(row.taxAmount)}</td>
                    <td className="px-3 py-2 text-right font-bold text-gray-900">{pkr(row.totalAmount)}</td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                          row.fbrStatus === 'success'
                            ? 'bg-emerald-100 text-emerald-700'
                            : row.fbrStatus === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {row.fbrStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-bold border-t text-xs">
                <tr>
                  <td colSpan={4} className="px-3 py-2.5 text-gray-700">Total Period Summary</td>
                  <td className="px-3 py-2.5 text-right">{metrics ? pkr(metrics.totalSales - metrics.totalTax) : ''}</td>
                  <td></td>
                  <td className="px-3 py-2.5 text-right text-purple-700">{metrics ? pkr(metrics.totalTax) : ''}</td>
                  <td className="px-3 py-2.5 text-right text-gray-900">{metrics ? pkr(metrics.totalSales) : ''}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
