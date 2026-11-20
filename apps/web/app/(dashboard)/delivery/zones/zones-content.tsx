'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  MapPin,
  Clock,
  Plus,
  Save,
  Trash2,
  Edit,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Compass,
} from 'lucide-react';

interface DeliveryZone {
  id: string;
  name: string;
  areas: string;
  deliveryFee: number;
  freeDeliveryAbove: number;
  estimatedMinutes: number;
  isActive: boolean;
}

const pkr = (n: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

export function ZonesContent() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [areas, setAreas] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(150);
  const [freeDeliveryAbove, setFreeDeliveryAbove] = useState(2000);
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);

  const loadZones = async () => {
    setLoading(true);
    try {
      const res = await api.get('/delivery/zones');
      setZones(res.data || []);
    } catch {
      toast.error('Failed to load delivery zones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadZones();
  }, []);

  const openAddModal = () => {
    setEditingZone(null);
    setName('');
    setAreas('');
    setDeliveryFee(150);
    setFreeDeliveryAbove(2000);
    setEstimatedMinutes(30);
    setModalOpen(true);
  };

  const openEditModal = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setName(zone.name);
    setAreas(zone.areas);
    setDeliveryFee(zone.deliveryFee);
    setFreeDeliveryAbove(zone.freeDeliveryAbove);
    setEstimatedMinutes(zone.estimatedMinutes);
    setModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Zone name is required');
      return;
    }

    let updatedList: DeliveryZone[];
    if (editingZone) {
      updatedList = zones.map((z) =>
        z.id === editingZone.id
          ? { ...z, name, areas, deliveryFee, freeDeliveryAbove, estimatedMinutes }
          : z
      );
    } else {
      const newZone: DeliveryZone = {
        id: 'zone-' + Date.now(),
        name,
        areas,
        deliveryFee,
        freeDeliveryAbove,
        estimatedMinutes,
        isActive: true,
      };
      updatedList = [...zones, newZone];
    }

    setZones(updatedList);
    setModalOpen(false);
    persistZones(updatedList);
  };

  const handleDeleteZone = (id: string) => {
    const updated = zones.filter((z) => z.id !== id);
    setZones(updated);
    persistZones(updated);
  };

  const handleToggleActive = (id: string) => {
    const updated = zones.map((z) => (z.id === id ? { ...z, isActive: !z.isActive } : z));
    setZones(updated);
    persistZones(updated);
  };

  const persistZones = async (updatedList: DeliveryZone[]) => {
    setSaving(true);
    try {
      await api.put('/delivery/zones', updatedList);
      toast.success('Delivery zones updated successfully');
    } catch {
      toast.error('Failed to save zones');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="h-7 w-7 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Delivery Zones & Dynamic Pricing</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Define local delivery sectors, neighborhood coverage, standard transit times, and free shipping thresholds.
          </p>
        </div>

        <button onClick={openAddModal} className="btn-primary inline-flex items-center gap-2">
          <Plus size={16} /> Add Delivery Zone
        </button>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-20 text-gray-400">
          <RefreshCw className="animate-spin mr-2 h-5 w-5" />
          Loading delivery zones...
        </div>
      ) : zones.length === 0 ? (
        <div className="card text-center py-16 text-gray-400 space-y-2">
          <MapPin size={36} className="mx-auto text-gray-300" />
          <p className="font-semibold text-gray-700">No delivery zones configured</p>
          <p className="text-xs text-gray-500">Click &quot;Add Delivery Zone&quot; to configure delivery areas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className={`card p-5 space-y-4 border transition-all ${
                zone.isActive ? 'border-gray-200 bg-white hover:border-blue-300' : 'border-gray-200 bg-gray-50/70 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600 shrink-0" />
                    <h3 className="font-bold text-gray-900 text-base">{zone.name}</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 pl-6">{zone.areas}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(zone)}
                    className="text-gray-400 hover:text-blue-600 p-1"
                    title="Edit Zone"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteZone(zone.id)}
                    className="text-gray-400 hover:text-red-600 p-1"
                    title="Delete Zone"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-xl text-center text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Delivery Fee</span>
                  <span className="font-bold text-gray-900">{pkr(zone.deliveryFee)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Free Delivery</span>
                  <span className="font-bold text-emerald-600">&gt; {pkr(zone.freeDeliveryAbove)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block">Est. Time</span>
                  <span className="font-bold text-blue-600">{zone.estimatedMinutes} mins</span>
                </div>
              </div>

              <div className="pt-2 border-t flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  Status: <strong className={zone.isActive ? 'text-emerald-600' : 'text-gray-400'}>
                    {zone.isActive ? 'Active' : 'Disabled'}
                  </strong>
                </span>

                <button
                  onClick={() => handleToggleActive(zone.id)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                    zone.isActive ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {zone.isActive ? 'Pause Zone' : 'Activate Zone'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Zone Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-gray-900">
                {editingZone ? 'Edit Delivery Zone' : 'Add Delivery Zone'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Zone Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DHA & Clifton Zone"
                  className="input text-xs"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Coverage Areas & Sectors</label>
                <textarea
                  rows={2}
                  placeholder="e.g. DHA Phases 1-8, Clifton Blocks 1-9"
                  className="input text-xs"
                  value={areas}
                  onChange={(e) => setAreas(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Standard Delivery Fee (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="input text-xs font-mono"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Free Delivery Above (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="input text-xs font-mono"
                    value={freeDeliveryAbove}
                    onChange={(e) => setFreeDeliveryAbove(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Estimated Transit Time (Minutes)</label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  required
                  className="input text-xs font-mono"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  {editingZone ? 'Update Zone' : 'Create Zone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
