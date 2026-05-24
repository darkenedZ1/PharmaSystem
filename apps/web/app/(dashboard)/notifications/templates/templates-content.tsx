'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, FileEdit, X, MessageSquare } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  channel: 'whatsapp' | 'sms' | 'email';
  trigger: string;
  body: string;
  isActive: boolean;
}

const CHANNELS = ['whatsapp', 'sms', 'email'];
const TRIGGERS = [
  'sale_complete',
  'prescription_ready',
  'refill_reminder',
  'payment_due',
  'appointment_reminder',
  'low_stock_alert',
  'custom',
];

const CHANNEL_BADGE: Record<string, string> = {
  whatsapp: 'badge-green',
  sms: 'badge-blue',
  email: 'badge-gray',
};

const EMPTY_FORM = { name: '', channel: 'whatsapp', trigger: 'sale_complete', body: '', isActive: true };

export function NotifTemplatesContent() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications/templates');
      setTemplates(Array.isArray(res.data) ? res.data : (res.data.templates ?? []));
    } catch {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({ name: t.name, channel: t.channel, trigger: t.trigger, body: t.body, isActive: t.isActive });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Template name is required'); return; }
    if (!form.body.trim()) { toast.error('Template body is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/notifications/templates/${editing.id}`, form);
        toast.success('Template updated');
      } else {
        await api.post('/notifications/templates', form);
        toast.success('Template created');
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Message Templates</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage WhatsApp, SMS and email templates. Use{' '}
            <code className="rounded bg-gray-100 px-1 text-xs">{'{{variable}}'}</code> for dynamic values.
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={16} /> New Template
        </button>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12 text-gray-400">Loading…</div>
      ) : templates.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
          <MessageSquare size={40} />
          <p>No templates yet — create one to start sending automated messages</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="card flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900">{t.name}</p>
                  <span className={CHANNEL_BADGE[t.channel] ?? 'badge-gray'}>{t.channel}</span>
                  <span className="badge-gray text-xs">{t.trigger.replace(/_/g, ' ')}</span>
                  {!t.isActive && <span className="badge-red text-xs">Inactive</span>}
                </div>
                <p className="text-sm text-gray-500 truncate">{t.body}</p>
              </div>
              <button onClick={() => openEdit(t)} className="btn-ghost py-1 px-2 text-xs shrink-0">
                <FileEdit size={13} /> Edit
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">{editing ? 'Edit Template' : 'New Template'}</h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Template Name *</label>
                <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Channel</label>
                  <select className="input" value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}>
                    {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Trigger</label>
                  <select className="input" value={form.trigger} onChange={(e) => setForm((f) => ({ ...f, trigger: e.target.value }))}>
                    {TRIGGERS.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Message Body *</label>
                <textarea
                  className="input min-h-[120px] resize-y"
                  placeholder={'Hello {{customer_name}}, your order {{invoice_number}} is ready for pickup.'}
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Available variables: {'{{customer_name}}'}, {'{{invoice_number}}'}, {'{{amount}}'}, {'{{product_name}}'}
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
                Template is active
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
