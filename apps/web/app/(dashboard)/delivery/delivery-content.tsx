'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Package, Truck, CheckCircle, User } from 'lucide-react';

interface DeliveryOrder {
  id: string;
  invoiceNumber: string;
  status: 'placed' | 'confirmed' | 'dispatched' | 'delivered' | 'cancelled';
  customerName: string;
  deliveryAddress: any; // JSON - contains city, street etc.
  riderId: string | null;
  riderName: string | null;
  deliveryCharge: number;
  createdAt: string;
}

interface Rider {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  isActive: boolean;
}

const STATUS_BADGE: Record<string, string> = {
  placed: 'badge-yellow',
  confirmed: 'badge-blue',
  dispatched: 'badge-yellow',
  delivered: 'badge-green',
  cancelled: 'badge-red',
};

const STATUS_TABS = ['All', 'Placed', 'Confirmed', 'Dispatched', 'Delivered'];

const pkr = (n: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

export function DeliveryContent() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [ridersLoading, setRidersLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [activeTab, setActiveTab] = useState<'orders' | 'riders'>('orders');

  // Assign rider modal
  const [assignTarget, setAssignTarget] = useState<DeliveryOrder | null>(null);
  const [selectedRider, setSelectedRider] = useState('');
  const [assigning, setAssigning] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'All') params.status = statusFilter.toLowerCase();
      const res = await api.get('/delivery/orders', { params });
      setOrders(Array.isArray(res.data) ? res.data : (res.data.orders ?? []));
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const loadRiders = async () => {
    setRidersLoading(true);
    try {
      const res = await api.get('/delivery/riders');
      setRiders(Array.isArray(res.data) ? res.data : (res.data.riders ?? []));
    } catch {
      setRiders([]);
    } finally {
      setRidersLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, [statusFilter]);
  useEffect(() => { loadRiders(); }, []);

  const assignRider = async () => {
    if (!assignTarget || !selectedRider) { toast.error('Select a rider'); return; }
    setAssigning(true);
    try {
      await api.post(`/delivery/orders/${assignTarget.id}/assign`, { riderId: selectedRider });
      toast.success('Rider assigned');
      setAssignTarget(null);
      setSelectedRider('');
      loadOrders();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to assign rider');
    } finally {
      setAssigning(false);
    }
  };

  const updateStatus = async (order: DeliveryOrder, newStatus: string) => {
    try {
      await api.post(`/delivery/orders/${order.id}/status`, { status: newStatus });
      toast.success(`Order ${newStatus}`);
      loadOrders();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Status update failed');
    }
  };

  const getCity = (addr: any): string => {
    if (!addr) return '—';
    if (typeof addr === 'string') {
      try { addr = JSON.parse(addr); } catch { return addr; }
    }
    return addr.city ?? addr.street ?? JSON.stringify(addr).slice(0, 30);
  };

  const filteredOrders = statusFilter === 'All'
    ? orders
    : orders.filter((o) => o.status === statusFilter.toLowerCase());

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Orders</h1>
          <p className="mt-1 text-sm text-gray-500">{filteredOrders.length} orders</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={activeTab === 'orders' ? 'btn-primary' : 'btn-ghost'}
          >
            <Package size={16} /> Orders
          </button>
          <button
            onClick={() => setActiveTab('riders')}
            className={activeTab === 'riders' ? 'btn-primary' : 'btn-ghost'}
          >
            <Truck size={16} /> Riders
          </button>
        </div>
      </div>

      {activeTab === 'orders' ? (
        <>
          {/* Status Tabs */}
          <div className="mb-4 flex gap-1 border-b">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  statusFilter === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="card flex items-center justify-center py-12 text-gray-400">Loading...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="card flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
              <Package size={40} />
              <p>No delivery orders found</p>
            </div>
          ) : (
            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Invoice #</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3">Rider</th>
                    <th className="px-4 py-3">Charge</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-medium text-gray-900">
                        {order.invoiceNumber ?? order.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-gray-800">{order.customerName}</td>
                      <td className="px-4 py-3 text-gray-600">{getCity(order.deliveryAddress)}</td>
                      <td className="px-4 py-3 text-gray-600">{order.riderName ?? '—'}</td>
                      <td className="px-4 py-3">{pkr(Number(order.deliveryCharge))}</td>
                      <td className="px-4 py-3">
                        <span className={STATUS_BADGE[order.status] ?? 'badge-gray'}>{order.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {['placed', 'confirmed'].includes(order.status) && (
                            <button
                              onClick={() => { setAssignTarget(order); setSelectedRider(order.riderId ?? ''); }}
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <User size={12} /> Assign Rider
                            </button>
                          )}
                          {order.status === 'confirmed' && (
                            <button
                              onClick={() => updateStatus(order, 'dispatched')}
                              className="text-xs text-orange-600 hover:underline flex items-center gap-1"
                            >
                              <Truck size={12} /> Dispatch
                            </button>
                          )}
                          {order.status === 'dispatched' && (
                            <button
                              onClick={() => updateStatus(order, 'delivered')}
                              className="text-xs text-green-600 hover:underline flex items-center gap-1"
                            >
                              <CheckCircle size={12} /> Mark Delivered
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        /* Riders Tab */
        <div>
          {ridersLoading ? (
            <div className="card flex items-center justify-center py-12 text-gray-400">Loading riders...</div>
          ) : riders.length === 0 ? (
            <div className="card flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
              <Truck size={40} />
              <p>No riders found</p>
            </div>
          ) : (
            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Rider Name</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {riders.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                      <td className="px-4 py-3 text-gray-600">{r.phone}</td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{r.vehicleType}</td>
                      <td className="px-4 py-3">
                        {r.isActive ? (
                          <span className="badge-green">Active</span>
                        ) : (
                          <span className="badge-gray">Inactive</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Assign Rider Modal */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-bold text-gray-900">Assign Rider</h2>
            <p className="mb-4 text-sm text-gray-500">
              Order: <span className="font-mono font-semibold">{assignTarget.invoiceNumber ?? assignTarget.id.slice(0, 8).toUpperCase()}</span>
              {' '}&mdash; {assignTarget.customerName}
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Select Rider *</label>
              <select
                className="input text-sm"
                value={selectedRider}
                onChange={(e) => setSelectedRider(e.target.value)}
              >
                <option value="">Choose a rider...</option>
                {riders.filter((r) => r.isActive).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — {r.vehicleType} ({r.phone})
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setAssignTarget(null)} className="btn-ghost">Cancel</button>
              <button onClick={assignRider} disabled={assigning} className="btn-primary">
                {assigning ? 'Assigning…' : 'Assign Rider'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
