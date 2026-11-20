'use client';

import { useState } from 'react';
import { Printer, X, CheckCircle2, QrCode, Copy, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export interface ThermalReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface ThermalReceiptData {
  invoiceNumber: string;
  fbrInvoiceNumber?: string;
  date: string;
  cashierName: string;
  customerName?: string;
  customerPhone?: string;
  items: ThermalReceiptItem[];
  subtotal: number;
  discountAmount?: number;
  taxAmount?: number;
  total: number;
  payments: { method: string; amount: number }[];
  pharmacyName?: string;
  pharmacyAddress?: string;
  pharmacyPhone?: string;
  ntn?: string;
  posId?: number | string;
}

interface ThermalReceiptModalProps {
  receipt: ThermalReceiptData;
  onClose: () => void;
}

const pkr = (n: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

export function ThermalReceiptModal({ receipt, onClose }: ThermalReceiptModalProps) {
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');

  const pharmacyName = receipt.pharmacyName || 'AL-SHIFA SMARTBIZ PHARMACY';
  const address = receipt.pharmacyAddress || 'Main Commercial Area, Lahore / Karachi';
  const phone = receipt.pharmacyPhone || '+92-42-35889900';
  const ntn = receipt.ntn || '1234567-8';
  const posId = receipt.posId || '100049';
  const fbrUsin = receipt.fbrInvoiceNumber || `FBR-${posId}-${receipt.invoiceNumber.replace(/[^0-9]/g, '').slice(-8)}`;

  const handlePrint = () => {
    window.print();
  };

  const copyFbrUsin = () => {
    navigator.clipboard.writeText(fbrUsin);
    toast.success('FBR Invoice Number copied');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      {/* Print-only CSS injected */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #thermal-receipt-paper,
          #thermal-receipt-paper * {
            visibility: visible !important;
          }
          #thermal-receipt-paper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${paperWidth === '80mm' ? '76mm' : '54mm'} !important;
            padding: 2mm !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
            font-size: ${paperWidth === '80mm' ? '11px' : '9px'} !important;
            line-height: 1.25 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[95vh]">
        {/* Modal Controls Header */}
        <div className="px-5 py-3 border-b flex items-center justify-between bg-gray-50 no-print shrink-0">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-blue-600" />
            <h3 className="font-bold text-gray-900 text-sm">Thermal POS Receipt</h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Paper width selector */}
            <div className="flex items-center bg-gray-200/80 rounded-lg p-0.5 text-xs font-semibold text-gray-700">
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`px-2 py-1 rounded-md transition-all ${
                  paperWidth === '80mm' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                80mm
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`px-2 py-1 rounded-md transition-all ${
                  paperWidth === '58mm' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                58mm
              </button>
            </div>

            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Preview Area */}
        <div className="p-4 overflow-y-auto flex-1 bg-gray-100 flex justify-center">
          <div
            id="thermal-receipt-paper"
            style={{ width: paperWidth === '80mm' ? '300px' : '230px' }}
            className="bg-white p-4 shadow-sm border border-gray-200 font-mono text-xs text-gray-900 leading-tight transition-all duration-200"
          >
            {/* Store Header */}
            <div className="text-center space-y-1 pb-2 border-b border-dashed border-gray-400">
              <div className="font-bold text-sm tracking-tight uppercase">{pharmacyName}</div>
              <div className="text-[10px] text-gray-600">{address}</div>
              <div className="text-[10px] text-gray-600">Tel: {phone}</div>
              <div className="text-[10px] text-gray-700 font-semibold">
                NTN: {ntn} • POS ID: {posId}
              </div>
              <div className="text-[9px] text-gray-500">Drug Sale License: 05-LHR-2024</div>
            </div>

            {/* Invoice Meta */}
            <div className="py-2 space-y-0.5 text-[11px] border-b border-dashed border-gray-400">
              <div className="flex justify-between font-bold">
                <span>INVOICE #:</span>
                <span>{receipt.invoiceNumber}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Date:</span>
                <span>{new Date(receipt.date).toLocaleDateString('en-PK')}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Time:</span>
                <span>{new Date(receipt.date).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Cashier:</span>
                <span>{receipt.cashierName}</span>
              </div>
              {receipt.customerName && (
                <div className="flex justify-between text-gray-700">
                  <span>Customer:</span>
                  <span>{receipt.customerName}</span>
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div className="py-2 border-b border-dashed border-gray-400">
              <div className="flex justify-between font-bold text-[10px] uppercase pb-1 border-b border-gray-300">
                <span>Item / Batch</span>
                <span className="text-right">Qty x Rate = Total</span>
              </div>

              <div className="divide-y divide-gray-100 py-1 space-y-1">
                {receipt.items.map((item, idx) => (
                  <div key={idx} className="pt-1">
                    <div className="font-semibold">{item.name}</div>
                    <div className="flex justify-between text-[10px] text-gray-600">
                      <span>{item.batchNumber ? `B# ${item.batchNumber}` : ''}</span>
                      <span className="font-mono">
                        {item.quantity} x {Number(item.unitPrice).toFixed(0)} = {pkr(Number(item.lineTotal))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="py-2 space-y-1 text-[11px] border-b border-dashed border-gray-400">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono">{pkr(receipt.subtotal)}</span>
              </div>
              {receipt.discountAmount && receipt.discountAmount > 0 ? (
                <div className="flex justify-between text-red-600">
                  <span>Discount:</span>
                  <span className="font-mono">-{pkr(receipt.discountAmount)}</span>
                </div>
              ) : null}
              {receipt.taxAmount && receipt.taxAmount > 0 ? (
                <div className="flex justify-between">
                  <span>Sales Tax (FBR GST):</span>
                  <span className="font-mono">{pkr(receipt.taxAmount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-sm font-extrabold pt-1 border-t border-gray-900">
                <span>NET PAYABLE:</span>
                <span className="font-mono">{pkr(receipt.total)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-2 space-y-0.5 text-[10px] text-gray-600 border-b border-dashed border-gray-400">
              {receipt.payments.map((p, i) => (
                <div key={i} className="flex justify-between capitalize">
                  <span>Paid via {p.method.replace('_', ' ')}:</span>
                  <span className="font-mono font-semibold text-gray-900">{pkr(p.amount)}</span>
                </div>
              ))}
            </div>

            {/* FBR Fiscal Stamp & QR Box */}
            <div className="py-3 text-center space-y-1.5 border-b border-dashed border-gray-400">
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                <CheckCircle2 size={11} className="text-green-600" />
                FBR DIGITAL INVOICE VERIFIED
              </div>
              <div className="text-[9px] font-mono text-gray-500 break-all">
                FBR USIN: {fbrUsin}
              </div>

              {/* Graphical QR Code Placeholder */}
              <div className="mx-auto w-24 h-24 border-2 border-black p-1 flex items-center justify-center bg-white my-1">
                <div className="text-center">
                  <QrCode size={64} className="text-black mx-auto" />
                  <span className="text-[8px] font-bold block text-black">TAX ASAAN</span>
                </div>
              </div>
              <div className="text-[8px] text-gray-500">Scan via FBR Tax Asaan App to verify invoice</div>
            </div>

            {/* DRAP Pharmacy Statutory Disclaimer */}
            <div className="pt-2 text-center text-[8px] text-gray-500 leading-tight space-y-1">
              <div>Medicines once sold will not be returned without cash receipt within 3 days.</div>
              <div>Keep all medicines stored in a cool & dry place below 25°C.</div>
              <div className="font-bold text-gray-800 pt-1">THANK YOU FOR YOUR PATRONAGE!</div>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="px-5 py-3 border-t flex items-center justify-between bg-white no-print shrink-0">
          <button
            type="button"
            onClick={copyFbrUsin}
            className="btn-ghost text-xs gap-1 text-gray-600"
          >
            <Copy size={13} /> Copy FBR USIN
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost text-xs"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="btn-primary text-xs px-4"
            >
              <Printer size={14} /> Print ESC/POS ({paperWidth})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}