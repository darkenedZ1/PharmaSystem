'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  ShieldCheck,
  Server,
  Key,
  Building,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
  Info,
} from 'lucide-react';

interface FbrSettings {
  businessName: string;
  posId: string;
  ntn: string;
  strn: string;
  fbrToken: string;
  fbrEnvironment: 'sandbox' | 'production';
  invoicePrefix: string;
  defaultTaxRate: number;
  nonPharmaTaxRate: number;
  autoSyncEnabled: boolean;
  province: string;
  sroScheduleNo: string;
  sroItemSerialNo: string;
  status: string;
}

export function FbrSettingsContent() {
  const [settings, setSettings] = useState<FbrSettings>({
    businessName: '',
    posId: '100049',
    ntn: '1234567-8',
    strn: '3277876123456',
    fbrToken: '',
    fbrEnvironment: 'sandbox',
    invoicePrefix: 'INV-',
    defaultTaxRate: 0,
    nonPharmaTaxRate: 18,
    autoSyncEnabled: true,
    province: 'Punjab',
    sroScheduleNo: '5th Schedule (Zero Rated Pharma)',
    sroItemSerialNo: 'Table 1, Item 12',
    status: 'connected',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs: number;
  } | null>(null);

  const loadSettings = async () => {
    try {
      const res = await api.get('/fbr/settings');
      setSettings(res.data);
    } catch {
      toast.error('Failed to load FBR settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/fbr/settings', settings);
      setSettings(res.data);
      toast.success('FBR Compliance settings saved successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post('/fbr/test-connection', {
        fbrEnvironment: settings.fbrEnvironment,
        posId: settings.posId,
      });
      setTestResult(res.data);
      toast.success('FBR Handshake Successful!');
    } catch (err: any) {
      toast.error('FBR Handshake Failed');
      setTestResult({
        success: false,
        message: err?.response?.data?.message || 'Failed to contact FBR Gateway',
        latencyMs: 0,
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-20 text-gray-400">
        <RefreshCw className="animate-spin mr-2 h-5 w-5" />
        Loading FBR configuration...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-emerald-600" />
            <h1 className="text-2xl font-bold text-gray-900">FBR Fiscal POS Integration Settings</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Configure Federal Board of Revenue POS Digital Invoicing, Iris API tokens, and tax schedules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="btn-secondary inline-flex items-center gap-1.5 text-xs font-semibold"
          >
            {testing ? <RefreshCw className="animate-spin h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5 text-amber-500" />}
            {testing ? 'Testing Handshake...' : 'Test FBR Connection'}
          </button>
        </div>
      </div>

      {/* Handshake Result Alert */}
      {testResult && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 ${
            testResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          )}
          <div className="text-sm">
            <p className="font-semibold">{testResult.message}</p>
            {testResult.success && (
              <p className="text-xs text-emerald-600 mt-0.5">
                Latency: {testResult.latencyMs}ms · Protocol: HTTPS/REST (Iris POS Invoicing API v1.2)
              </p>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Environment Selector */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Server className="h-4 w-4 text-blue-600" />
            FBR Operating Environment
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                settings.fbrEnvironment === 'sandbox'
                  ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="fbrEnvironment"
                value="sandbox"
                checked={settings.fbrEnvironment === 'sandbox'}
                onChange={() => setSettings({ ...settings, fbrEnvironment: 'sandbox' })}
                className="mt-1"
              />
              <div>
                <span className="font-semibold text-sm text-gray-900 block">
                  Sandbox Simulator (Recommended for Testing)
                </span>
                <span className="text-xs text-gray-500 mt-1 block">
                  Invoices receive valid mock FBR USIN & QR codes without reporting taxable revenue to live Iris portal.
                </span>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                settings.fbrEnvironment === 'production'
                  ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="fbrEnvironment"
                value="production"
                checked={settings.fbrEnvironment === 'production'}
                onChange={() => setSettings({ ...settings, fbrEnvironment: 'production' })}
                className="mt-1"
              />
              <div>
                <span className="font-semibold text-sm text-gray-900 block">
                  Live Production (FBR Iris Gateway)
                </span>
                <span className="text-xs text-gray-500 mt-1 block">
                  Direct real-time fiscal synchronization with Federal Board of Revenue central servers.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Fiscal Identity & POS Configuration */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Building className="h-4 w-4 text-blue-600" />
            Business Fiscal Credentials
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                FBR POS ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="input font-mono text-sm"
                placeholder="e.g. 100049"
                value={settings.posId}
                onChange={(e) => setSettings({ ...settings, posId: e.target.value })}
              />
              <p className="text-[11px] text-gray-500 mt-1">6-digit POS ID assigned by FBR</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                National Tax Number (NTN) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="input font-mono text-sm"
                placeholder="e.g. 1234567-8"
                value={settings.ntn}
                onChange={(e) => setSettings({ ...settings, ntn: e.target.value })}
              />
              <p className="text-[11px] text-gray-500 mt-1">7-digit NTN with check digit</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                STRN (Sales Tax Reg. No.)
              </label>
              <input
                type="text"
                className="input font-mono text-sm"
                placeholder="e.g. 3277876123456"
                value={settings.strn}
                onChange={(e) => setSettings({ ...settings, strn: e.target.value })}
              />
              <p className="text-[11px] text-gray-500 mt-1">13-digit sales tax registration</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tax Jurisdiction / Province
              </label>
              <select
                className="input text-sm"
                value={settings.province}
                onChange={(e) => setSettings({ ...settings, province: e.target.value })}
              >
                <option value="Punjab">Punjab (PRA)</option>
                <option value="Sindh">Sindh (SRB)</option>
                <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa (KPRA)</option>
                <option value="Balochistan">Balochistan (BRA)</option>
                <option value="Islamabad Capital Territory">Islamabad Capital Territory (FBR)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Invoice Number Prefix
              </label>
              <input
                type="text"
                className="input font-mono text-sm"
                placeholder="e.g. INV-"
                value={settings.invoicePrefix}
                onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Security & Authentication */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Key className="h-4 w-4 text-blue-600" />
            Iris API Key & Cryptographic Token
          </h2>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              FBR Bearer Authorization Token
            </label>
            <input
              type="text"
              className="input font-mono text-sm"
              placeholder="Paste Iris POS Bearer Token"
              value={settings.fbrToken}
              onChange={(e) => setSettings({ ...settings, fbrToken: e.target.value })}
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Obtained from FBR e-Services &rarr; POS Registration &rarr; View Authorization Key.
            </p>
          </div>
        </div>

        {/* Pharmaceutical SRO & Statutory Exemption Rules */}
        <div className="card space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Info className="h-4 w-4 text-emerald-600" />
                Pharma Sales Tax Schedules (Sales Tax Act 1990)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Prescription medicines registered under DRAP Act 2012 enjoy 0% GST / Zero-rated status.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Prescription Drugs GST Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                className="input text-sm"
                value={settings.defaultTaxRate}
                onChange={(e) => setSettings({ ...settings, defaultTaxRate: Number(e.target.value) })}
              />
              <p className="text-[11px] text-emerald-600 font-medium mt-1">0% (Zero Rated under 5th Schedule)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Non-Pharma Goods GST Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                className="input text-sm"
                value={settings.nonPharmaTaxRate}
                onChange={(e) => setSettings({ ...settings, nonPharmaTaxRate: Number(e.target.value) })}
              />
              <p className="text-[11px] text-gray-500 mt-1">Standard GST for cosmetics, baby formula, surgicals (18%)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                SRO / Schedule Citation
              </label>
              <input
                type="text"
                className="input text-sm font-mono"
                value={settings.sroScheduleNo}
                onChange={(e) => setSettings({ ...settings, sroScheduleNo: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                SRO Item Serial No
              </label>
              <input
                type="text"
                className="input text-sm font-mono"
                value={settings.sroItemSerialNo}
                onChange={(e) => setSettings({ ...settings, sroItemSerialNo: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-3 border-t">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoSyncEnabled}
                onChange={(e) => setSettings({ ...settings, autoSyncEnabled: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Automatic Background Queue Synchronization
                </span>
                <span className="text-xs text-gray-500 block">
                  Instantly transmits POS sales to FBR via BullMQ worker without blocking POS cashier checkout speed.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary inline-flex items-center gap-2 px-6 py-2.5"
          >
            {saving ? <RefreshCw className="animate-spin h-4 w-4" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save FBR Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
