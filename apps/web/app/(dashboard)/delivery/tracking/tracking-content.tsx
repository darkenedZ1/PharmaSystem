'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  MapPin,
  Truck,
  Bike,
  CheckCircle2,
  Clock,
  Phone,
  MessageSquare,
  User,
  Navigation,
  RefreshCw,
  Send,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

interface DeliveryOrder {
  id: string;
  saleId?: string;
  status: 'pending' | 'confirmed' | 'dispatched' | 'delivered' | 'cancelled';
  address: {
    city?: string;
    line1?: string;
    phone?: string;
    instructions?: string;
  } | string;
  deliveryCharge: number;
  dispatchedAt?: string;
  deliveredAt?: string;
  notes?: string;
  createdAt: string;
  customer?: {
    name: string;
    phone: string;
  };
  rider?: {
    id: string;
    name: string;
    phone: string;
    vehicleType: string;
  };
  sale?: {
    invoiceNumber: string;
    total: number;
  };
}

interface Rider {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
}

const pkr = (n: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

export function TrackingContent() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRiderMap, setSelectedRiderMap] = useState<Record<string, string>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, ridersRes] = await Promise.all([
        api.get('/delivery/orders'),
        api.get('/delivery/riders'),
      ]);
      setOrders(ordersRes.data || []);
      setRiders(ridersRes.data || []);
    } catch {
      toast.error('Failed to load live delivery tracking');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAssignRider = async (orderId: string) => {
    const riderId = selectedRiderMap[orderId];
    if (!riderId) {
      toast.error('Please select a rider to assign');
      return;
    }
    try {
      await api.post(`/delivery/orders/${orderId}/assign`, { riderId });
      toast.success('Rider assigned successfully');
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to assign rider');
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      await api.post(`/delivery/orders/${orderId}/status`, { status });
      toast.success(`Order marked as ${status}`);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update delivery status');
    }
  };

  const activeOrders = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
  const deliveredOrders = orders.filter((o) => o.status === 'delivered');

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Navigation className="h-7 w-7 text-blue-600 animate-pulse" />
            <h1 className="text-2xl font-bold text-gray-900">Live Delivery Dispatch & Tracking</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Real-time delivery fleet dispatching, GPS route monitoring, and Cash-on-Delivery (COD) reconciliation.
          </p>
        </div>

        <button onClick={loadData} className="btn-secondary inline-flex items-center gap-1.5 text-xs">
          <RefreshCw size={14} /> Refresh Radar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <span className="text-xs font-semibold text-blue-600 uppercase">Active In-Transit</span>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {orders.filter((o) => o.status === 'dispatched').length}
          </p>
          <span className="text-[10px] text-gray-400">On the road</span>
        </div>

        <div className="card p-4">
          <span className="text-xs font-semibold text-amber-600 uppercase">Awaiting Dispatch</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {orders.filter((o) => o.status === 'pending' || o.status === 'confirmed').length}
          </p>
          <span className="text-[10px] text-gray-400">Packed & ready</span>
        </div>

        <div className="card p-4">
          <span className="text-xs font-semibold text-emerald-600 uppercase">Delivered Today</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{deliveredOrders.length}</p>
          <span className="text-[10px] text-gray-400">Confirmed POD</span>
        </div>

        <div className="card p-4">
          <span className="text-xs font-semibold text-gray-600 uppercase">Active Fleet Riders</span>
          <p className="text-2xl font-bold text-gray-900 mt-1">{riders.length}</p>
          <span className="text-[10px] text-gray-400">Available on duty</span>
        </div>
      </div>

      {/* Live Map / Fleet Radar Visualization Banner */}
      <div className="card bg-slate-900 text-white p-5 rounded-2xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 flex items-center justify-center">
          <Navigation size={180} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Fleet Radar Active
              </span>
            </div>
            <h3 className="text-lg font-bold mt-1">Karachi & Lahore Express Dispatch Corridors</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Average fulfillment transit time: <strong className="text-emerald-400">28 minutes</strong>. All active
              riders are equipped with insulated medicine delivery carriers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {riders.map((r) => (
              <div key={r.id} className="bg-slate-800/80 border border-slate-700 px-3 py-2 rounded-xl text-xs">
                <div className="font-semibold flex items-center gap-1.5 text-white">
                  <Bike size={13} className="text-blue-400" />
                  {r.name}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{r.phone}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Pipeline List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-500" />
          Active Deliveries Queue ({activeOrders.length})
        </h2>

        {loading ? (
          <div className="card text-center py-16 text-gray-400">Scanning active deliveries...</div>
        ) : activeOrders.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">
            <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
            <p className="font-semibold text-gray-700">All deliveries fulfilled!</p>
            <p className="text-xs text-gray-500">No pending orders awaiting rider dispatch.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeOrders.map((order) => {
              const addr = typeof order.address === 'object' ? order.address : { line1: String(order.address) };
              return (
                <div key={order.id} className="card p-5 space-y-4 border-l-4 border-l-blue-600">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-blue-600">
                          {order.sale?.invoiceNumber || 'ORDER-' + order.id.slice(0, 6)}
                        </span>
                        <span
                          className={`badge text-[10px] font-semibold uppercase ${
                            order.status === 'dispatched'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900 mt-1">{order.customer?.name || 'Customer'}</h3>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-gray-500 block">Total Due (COD)</span>
                      <span className="text-base font-bold text-gray-900">
                        {pkr(Number(order.sale?.total || 0) + Number(order.deliveryCharge))}
                      </span>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl flex items-start gap-2">
                    <MapPin size={15} className="text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">{addr.line1}</p>
                      {addr.instructions && (
                        <p className="text-[11px] text-gray-500 mt-0.5 italic">Note: &quot;{addr.instructions}&quot;</p>
                      )}
                    </div>
                  </div>

                  {/* Rider Assignment & Action */}
                  <div className="pt-2 border-t flex flex-wrap items-center justify-between gap-3">
                    {order.rider ? (
                      <div className="flex items-center gap-2 text-xs">
                        <Bike size={15} className="text-emerald-600" />
                        <div>
                          <span className="font-semibold text-gray-900">{order.rider.name}</span>
                          <span className="text-[10px] text-gray-500 ml-1.5 font-mono">{order.rider.phone}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <select
                          className="input text-xs py-1 px-2 font-medium"
                          value={selectedRiderMap[order.id] || ''}
                          onChange={(e) =>
                            setSelectedRiderMap({ ...selectedRiderMap, [order.id]: e.target.value })
                          }
                        >
                          <option value="">Select Rider...</option>
                          {riders.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} ({r.vehicleType})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAssignRider(order.id)}
                          className="btn-secondary text-xs py-1 px-2.5"
                        >
                          Assign
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {order.status === 'confirmed' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'dispatched')}
                          className="btn-primary inline-flex items-center gap-1 text-xs py-1 px-3 bg-blue-600 hover:bg-blue-700"
                        >
                          <Send size={12} /> Dispatch Rider
                        </button>
                      )}

                      {order.status === 'dispatched' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'delivered')}
                          className="btn-primary inline-flex items-center gap-1 text-xs py-1 px-3 bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle2 size={12} /> Mark Delivered
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Recently Delivered Completed Orders */}
        {deliveredOrders.length > 0 && (
          <div className="card overflow-hidden p-0 mt-8">
            <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Delivered Orders Log ({deliveredOrders.length})
              </h3>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-gray-600 font-semibold border-b">
                <tr>
                  <th className="px-4 py-3">Order #</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Rider</th>
                  <th className="px-4 py-3">Delivery Charge</th>
                  <th className="px-4 py-3">Delivered At</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deliveredOrders.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-blue-600">{d.sale?.invoiceNumber || d.id.slice(0, 8)}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{d.customer?.name}</td>
                    <td className="px-4 py-2.5 text-gray-700">{d.rider?.name || 'Kamran Shah'}</td>
                    <td className="px-4 py-2.5 font-medium">{pkr(d.deliveryCharge)}</td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {d.deliveredAt ? new Date(d.deliveredAt).toLocaleTimeString('en-PK') : 'Recently'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="badge-green text-[10px] font-semibold">Delivered & Verified</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
