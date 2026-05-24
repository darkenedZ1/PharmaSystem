'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

interface TenantSettings {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  ntn: string | null;
  strn: string | null;
  currency: string;
  timezone: string;
  dateFormat: string;
}

const CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad',
  'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala', 'Other',
];

const TIMEZONES = ['Asia/Karachi'];

export function SettingsGeneralContent() {
  const [settings, setSettings] = useState<TenantSettings>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    ntn: '',
    strn: '',
    currency: 'PKR',
    timezone: 'Asia/Karachi',
    dateFormat: 'DD/MM/YYYY',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/tenants/me')
      .then((res) => {
        const t = res.data;
        setSettings({
          name: t.name ?? '',
          email: t.email ?? '',
          phone: t.phone ?? '',
          address: t.address ?? '',
          city: t.city ?? '',
          ntn: t.ntn ?? '',
          strn: t.strn ?? '',
          currency: t.currency ?? 'PKR',
          timezone: t.timezone ?? 'Asia/Karachi',
          dateFormat: t.dateFormat ?? 'DD/MM/YYYY',
        });
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/tenants/me', settings);
      toast.success('Settings saved');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof TenantSettings) => ({
    value: settings[key] as string ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setSettings((s) => ({ ...s, [key]: e.target.value })),
  });

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh] text-gray-400">Loading…</div>;
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">General Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Pharmacy / business details shown on invoices and reports</p>
      </div>

      <div className="space-y-6">
        {/* Business Details */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-700">Business Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">Business Name *</label>
              <input className="input" {...field('name')} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
              <input className="input" type="email" {...field('email')} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Phone</label>
              <input className="input" type="tel" {...field('phone')} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">Address</label>
              <textarea className="input min-h-[72px] resize-none" {...field('address')} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">City</label>
              <select className="input" {...field('city')}>
                <option value="">— Select city —</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Tax Registration */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-700">Tax Registration</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">NTN (National Tax Number)</label>
              <input className="input font-mono" placeholder="0000000-0" {...field('ntn')} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">STRN (Sales Tax Reg. No.)</label>
              <input className="input font-mono" placeholder="00-00-0000-000-00" {...field('strn')} />
            </div>
          </div>
        </div>

        {/* Regional */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-700">Regional Settings</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Currency</label>
              <select className="input" {...field('currency')}>
                <option value="PKR">PKR — Pakistani Rupee</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Timezone</label>
              <select className="input" {...field('timezone')}>
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Date Format</label>
              <select className="input" {...field('dateFormat')}>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={save} disabled={saving} className="btn-primary">
            <Save size={16} /> {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
