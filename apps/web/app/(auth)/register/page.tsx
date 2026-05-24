'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { PRESET_PLANS } from '@pharmacy/shared';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    tenantName: '',
    email: '',
    password: '',
    phone: '',
    planId: 'starter' as string,
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      toast.success('Account created! 14-day free trial started.');
      router.push('/login');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 className="mb-6 text-xl font-semibold text-gray-800">Start your free trial</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Pharmacy Name</label>
          <input required className="input" value={form.tenantName} onChange={set('tenantName')} placeholder="Al-Shifa Pharmacy" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
          <input type="email" required className="input" value={form.email} onChange={set('email')} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Phone (WhatsApp)</label>
          <input type="tel" required className="input" value={form.phone} onChange={set('phone')} placeholder="+923001234567" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
          <input type="password" required minLength={8} className="input" value={form.password} onChange={set('password')} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Plan</label>
          <select className="input" value={form.planId} onChange={set('planId')}>
            {Object.values(PRESET_PLANS).map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} — PKR {plan.pricePKR.toLocaleString()}/mo
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">14-day free trial, no credit card required</p>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
          {loading ? 'Creating account…' : 'Start free trial'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-600 hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
