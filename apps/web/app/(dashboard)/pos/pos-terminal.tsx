'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { queueOfflineSale, searchOfflineProducts } from '@/lib/offline/db';
import { toast } from 'sonner';
import { Trash2, Search, Plus, Minus, WifiOff, Printer } from 'lucide-react';
import { ThermalReceiptModal, type ThermalReceiptData } from '@/components/pos/thermal-receipt-modal';

interface CartItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  taxRate: number;
}

export function PosTerminal() {
  const user = useAuthStore((s) => s.user);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [completedReceipt, setCompletedReceipt] = useState<ThermalReceiptData | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get('/users/branches').then((res) => {
      const bList = res.data || [];
      if (bList.length > 0) setSelectedBranchId(bList[0].id);
    }).catch(() => {});
  }, []);

  const handleSearch = useCallback(async (q: string) => {
    setSearch(q);
    if (!q.trim()) { setSearchResults([]); return; }

    if (!isOnline) {
      const offline = await searchOfflineProducts(q, user?.tenantId ?? '');
      setSearchResults(offline);
      return;
    }

    try {
      const res = await api.get('/inventory/products', { params: { q } });
      setSearchResults(res.data);
    } catch {
      const offline = await searchOfflineProducts(q, user?.tenantId ?? '');
      setSearchResults(offline);
    }
  }, [isOnline, user]);

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        unitPrice: Number(product.salePrice ?? product.unitPrice),
        quantity: 1,
        taxRate: Number(product.taxRate ?? 0),
      }];
    });
    setSearch('');
    setSearchResults([]);
    searchRef.current?.focus();
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => i.productId === productId ? { ...i, quantity: i.quantity + delta } : i)
        .filter((i) => i.quantity > 0),
    );
  };

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const tax = cart.reduce((s, i) => s + i.unitPrice * i.quantity * (i.taxRate / 100), 0);
  const total = subtotal + tax;

  const checkout = async () => {
    if (!cart.length) { toast.error('Cart is empty'); return; }
    setProcessing(true);

    const payload = {
      clientId: crypto.randomUUID(),
      branchId: selectedBranchId,
      items: cart.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      payments: [{ method: paymentMethod, amount: total }],
    };

    try {
      if (isOnline) {
        const res = await api.post('/pos/sales', payload);
        toast.success(`Sale completed — PKR ${total.toFixed(0)}`);
        setCompletedReceipt({
          invoiceNumber: res.data?.invoiceNumber || `INV-${new Date().getTime().toString().slice(-6)}`,
          fbrInvoiceNumber: res.data?.fbrInvoiceNumber,
          date: res.data?.saleDate || new Date().toISOString(),
          cashierName: user?.name || 'Cashier',
          customerName: 'Walk-in Customer',
          items: cart.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            lineTotal: i.quantity * i.unitPrice,
          })),
          subtotal,
          taxAmount: tax,
          total,
          payments: [{ method: paymentMethod, amount: total }],
        });
      } else {
        await queueOfflineSale(user?.tenantId ?? '', payload.branchId, payload);
        toast.info('Offline sale saved — will sync when internet returns', { icon: <WifiOff size={16} /> });
      }
      setCart([]);
    } catch (err: any) {
      if (!navigator.onLine) {
        await queueOfflineSale(user?.tenantId ?? '', payload.branchId, payload);
        toast.info('Queued offline — will sync automatically');
        setCart([]);
      } else {
        toast.error(err?.response?.data?.message ?? 'Sale failed');
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex h-full gap-0">
      {/* Left: Search + Cart */}
      <div className="flex flex-1 flex-col border-r">
        {/* Search bar */}
        <div className="border-b p-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              className="input pl-9"
              placeholder="Search by name, generic name, or scan barcode…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
            {!isOnline && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                <WifiOff size={14} className="text-orange-400" />
              </span>
            )}
          </div>

          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute z-50 mt-1 max-h-64 w-[calc(100%-2rem)] overflow-y-auto rounded-lg border bg-white shadow-lg">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-900">{p.name}</p>
                    {p.genericName && <p className="text-xs text-gray-400">{p.genericName}</p>}
                  </div>
                  <span className="text-sm font-semibold text-blue-600">
                    PKR {Number(p.salePrice ?? p.unitPrice).toFixed(0)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="flex h-full items-center justify-center text-gray-400">
              <p className="text-sm">Scan a barcode or search to add items</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500">
                  <th className="pb-2">Product</th>
                  <th className="pb-2 text-center">Qty</th>
                  <th className="pb-2 text-right">Price</th>
                  <th className="pb-2 text-right">Total</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {cart.map((item) => (
                  <tr key={item.productId}>
                    <td className="py-2 font-medium text-gray-800">{item.name}</td>
                    <td className="py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => updateQty(item.productId, -1)}
                          className="rounded p-0.5 hover:bg-gray-100"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-6 text-center font-mono">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.productId, 1)}
                          className="rounded p-0.5 hover:bg-gray-100"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="py-2 text-right text-gray-600">{item.unitPrice.toFixed(0)}</td>
                    <td className="py-2 text-right font-medium">
                      {(item.unitPrice * item.quantity).toFixed(0)}
                    </td>
                    <td className="py-2 pl-2">
                      <button
                        onClick={() => setCart((c) => c.filter((i) => i.productId !== item.productId))}
                        className="text-gray-300 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right: Totals + Checkout */}
      <div className="flex w-72 flex-col bg-gray-50">
        <div className="flex-1 p-4">
          <h3 className="mb-4 font-semibold text-gray-700">Order Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>PKR {subtotal.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax</span>
              <span>PKR {tax.toFixed(0)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-bold text-gray-900">
              <span>Total</span>
              <span>PKR {total.toFixed(0)}</span>
            </div>
          </div>

          <div className="mt-6">
            <label className="mb-1 block text-xs font-medium text-gray-600">Payment Method</label>
            <select
              className="input text-sm"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="jazzcash">JazzCash</option>
              <option value="easypaisa">EasyPaisa</option>
              <option value="card">Card</option>
              <option value="credit">Credit Account</option>
            </select>
          </div>
        </div>

        <div className="border-t p-4">
          <button
            onClick={checkout}
            disabled={processing || !cart.length}
            className="btn-primary w-full justify-center text-base py-3"
          >
            {processing ? 'Processing…' : `Charge PKR ${total.toFixed(0)}`}
          </button>
          {!isOnline && (
            <p className="mt-2 text-center text-xs text-orange-500 flex items-center justify-center gap-1">
              <WifiOff size={12} /> Offline mode — sale will sync automatically
            </p>
          )}
        </div>
      </div>

      {completedReceipt && (
        <ThermalReceiptModal
          receipt={completedReceipt}
          onClose={() => setCompletedReceipt(null)}
        />
      )}
    </div>
  );
}
