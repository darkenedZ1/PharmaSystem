'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  User,
  Building,
  CheckCircle2,
  DollarSign,
  MessageCircle,
  CreditCard,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface AllowanceMap {
  houseRent: number;
  medical: number;
  conveyance: number;
  bonus: number;
  [key: string]: number;
}

interface DeductionMap {
  incomeTax: number;
  eobi: number;
  sessi: number;
  lateDeductions: number;
  advanceLoan: number;
  [key: string]: number;
}

interface Payslip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  department: string;
  cnic: string;
  phone?: string;
  email?: string;
  dateOfJoining?: string;
  bankName: string;
  bankAccountNo: string;
  period: string;
  month: number;
  year: number;
  workingDays: number;
  presentDays: number;
  overtimeHours: number;
  basicSalary: number;
  allowances: AllowanceMap;
  deductions: DeductionMap;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  bankTransferRef: string;
  isPaid: boolean;
  runStatus: string;
}

interface PayslipData {
  tenant: {
    name: string;
    ntn: string;
    branch: string;
    address: string;
  };
  month: number;
  year: number;
  runStatus: string | null;
  payslips: Payslip[];
}

const pkr = (n: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

function inWords(num: number): string {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if ((num = Math.floor(num)) === 0) return 'Zero';
  function toWords(n: number): string {
    let str = '';
    if (n >= 10000000) {
      str += toWords(Math.floor(n / 10000000)) + 'Crore ';
      n %= 10000000;
    }
    if (n >= 100000) {
      str += toWords(Math.floor(n / 100000)) + 'Lakh ';
      n %= 100000;
    }
    if (n >= 1000) {
      str += toWords(Math.floor(n / 1000)) + 'Thousand ';
      n %= 1000;
    }
    if (n >= 100) {
      str += toWords(Math.floor(n / 100)) + 'Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (str !== '') str += 'and ';
      if (n < 20) str += a[n];
      else {
        str += b[Math.floor(n / 10)];
        if (n % 10 > 0) str += ' ' + a[n % 10];
      }
    }
    return str;
  }
  return 'Rupees ' + toWords(num).trim() + ' Only';
}

export function PayslipsContent() {
  const [data, setData] = useState<PayslipData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(10); // default to October (seeded)
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  const loadPayslips = async () => {
    setLoading(true);
    try {
      const res = await api.get('/payroll/payslips', {
        params: { month: selectedMonth, year: selectedYear },
      });
      setData(res.data);
      if (res.data?.payslips?.length > 0 && !selectedEmployeeId) {
        setSelectedEmployeeId(res.data.payslips[0].employeeId);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load payslips');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayslips();
  }, [selectedMonth, selectedYear]);

  const payslip = data?.payslips.find((p) => p.employeeId === selectedEmployeeId) || data?.payslips[0];

  const sendWhatsApp = (p: Payslip) => {
    if (!p.phone) {
      toast.error('No phone number on record for this employee');
      return;
    }
    const cleanPhone = p.phone.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('92') ? cleanPhone : '92' + cleanPhone.replace(/^0/, '');
    const message = encodeURIComponent(
      `Assalam-o-Alaikum ${p.employeeName},\n\nYour salary payslip for *${p.period}* is ready.\n\n` +
      `*Gross Pay:* ${pkr(p.grossPay)}\n` +
      `*Total Deductions:* ${pkr(p.totalDeductions)}\n` +
      `*Net Payable:* ${pkr(p.netPay)}\n` +
      `*Bank Ref:* ${p.bankTransferRef}\n` +
      `*Disbursed To:* ${p.bankName} (${p.bankAccountNo})\n\n` +
      `Please contact HR if you have any questions.\n- ${data?.tenant?.name || 'SmartBiz Pharmacy'}`
    );
    window.open(`https://wa.me/${phoneWithCountry}?text=${message}`, '_blank');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto print:p-0">
      {/* Header toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-7 w-7 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Employee Payslips</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Official Salary Slips, Statutory Deductions (EOBI / Tax) & Printable PDF Statements
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month selector */}
          <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5 shadow-sm">
            <Calendar size={14} className="text-gray-400" />
            <select
              className="text-sm font-medium text-gray-800 bg-transparent focus:outline-none cursor-pointer"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              <option value={1}>January</option>
              <option value={2}>February</option>
              <option value={3}>March</option>
              <option value={4}>April</option>
              <option value={5}>May</option>
              <option value={6}>June</option>
              <option value={7}>July</option>
              <option value={8}>August</option>
              <option value={9}>September</option>
              <option value={10}>October</option>
              <option value={11}>November</option>
              <option value={12}>December</option>
            </select>
            <select
              className="text-sm font-medium text-gray-800 bg-transparent focus:outline-none cursor-pointer border-l pl-2"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>

          <button
            onClick={() => window.print()}
            className="btn-primary"
            disabled={!payslip}
          >
            <Printer size={15} /> Print Payslip
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-20 text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          Generating employee payslips...
        </div>
      ) : !data || data.payslips.length === 0 ? (
        <div className="card text-center py-16 text-gray-400 space-y-2">
          <FileText size={40} className="mx-auto text-gray-300" />
          <p className="font-semibold text-gray-700">No payroll run found for this period</p>
          <p className="text-xs text-gray-500">
            Please run and approve payroll for this month in Payroll &rarr; Process Payroll.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Employee Selector (hidden on print) */}
          <div className="lg:col-span-1 space-y-3 print:hidden">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase px-1">
              <span>Staff Members ({data.payslips.length})</span>
              <span className="badge badge-green text-[10px]">Approved</span>
            </div>

            <div className="space-y-1.5 max-h-[700px] overflow-y-auto">
              {data.payslips.map((p) => (
                <div
                  key={p.employeeId}
                  onClick={() => setSelectedEmployeeId(p.employeeId)}
                  className={`p-3 rounded-xl border text-sm cursor-pointer transition-all ${
                    (payslip?.employeeId === p.employeeId)
                      ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-600'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-semibold text-gray-900">{p.employeeName}</div>
                  <div className="text-xs text-gray-500">{p.designation}</div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-mono text-gray-400">{p.department}</span>
                    <strong className="text-blue-700">{pkr(p.netPay)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Formal Printable Payslip */}
          <div className="lg:col-span-3">
            {payslip && (
              <div className="card bg-white p-8 border border-gray-300 shadow-md space-y-6 print:border-none print:shadow-none print:p-0">
                {/* Pharmacy Brand & Header */}
                <div className="flex items-start justify-between border-b-2 border-gray-900 pb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building className="h-6 w-6 text-blue-700" />
                      <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                        {data.tenant.name}
                      </h2>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{data.tenant.address}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span><strong>NTN / STRN:</strong> {data.tenant.ntn}</span>
                      <span>•</span>
                      <span><strong>Branch:</strong> {data.tenant.branch}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block bg-blue-900 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded">
                      SALARY PAYSLIP
                    </span>
                    <div className="text-sm font-bold text-gray-900 mt-2">{payslip.period}</div>
                    <div className="text-xs text-gray-500 font-mono">Ref: {payslip.bankTransferRef}</div>
                  </div>
                </div>

                {/* Employee Particulars Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50/70 border rounded-lg text-xs">
                  <div>
                    <span className="text-gray-400 block font-medium">Employee Name</span>
                    <strong className="text-gray-900 text-sm">{payslip.employeeName}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">Designation / Role</span>
                    <strong className="text-gray-800">{payslip.designation}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">Department</span>
                    <span className="text-gray-800">{payslip.department}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">CNIC Number</span>
                    <span className="text-gray-800 font-mono">{payslip.cnic}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">Bank Name</span>
                    <span className="text-gray-800">{payslip.bankName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">Account / IBAN</span>
                    <span className="text-gray-800 font-mono">{payslip.bankAccountNo}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">Working Days</span>
                    <span className="text-gray-800">{payslip.presentDays} / {payslip.workingDays} Days</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">Overtime Hours</span>
                    <span className="text-gray-800">{payslip.overtimeHours} hrs</span>
                  </div>
                </div>

                {/* Side-by-Side Earnings & Deductions Tables */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Earnings Table */}
                  <div className="border rounded-lg overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="bg-emerald-50 border-b px-4 py-2 text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center justify-between">
                        <span>Earnings</span>
                        <span>Amount (PKR)</span>
                      </div>
                      <div className="divide-y divide-gray-100 text-xs">
                        <div className="px-4 py-2 flex justify-between">
                          <span className="text-gray-600">Basic Salary</span>
                          <span className="font-semibold text-gray-900">{pkr(payslip.basicSalary)}</span>
                        </div>
                        <div className="px-4 py-2 flex justify-between">
                          <span className="text-gray-600">House Rent Allowance (45%)</span>
                          <span className="font-semibold text-gray-900">{pkr(payslip.allowances.houseRent)}</span>
                        </div>
                        <div className="px-4 py-2 flex justify-between">
                          <span className="text-gray-600">Medical Allowance (10%)</span>
                          <span className="font-semibold text-gray-900">{pkr(payslip.allowances.medical)}</span>
                        </div>
                        <div className="px-4 py-2 flex justify-between">
                          <span className="text-gray-600">Conveyance Allowance</span>
                          <span className="font-semibold text-gray-900">{pkr(payslip.allowances.conveyance)}</span>
                        </div>
                        {payslip.allowances.bonus > 0 && (
                          <div className="px-4 py-2 flex justify-between">
                            <span className="text-gray-600">Performance Bonus</span>
                            <span className="font-semibold text-gray-900">{pkr(payslip.allowances.bonus)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-emerald-50/50 border-t px-4 py-2.5 flex justify-between text-xs font-bold text-emerald-950">
                      <span>GROSS EARNINGS</span>
                      <span className="text-sm">{pkr(payslip.grossPay)}</span>
                    </div>
                  </div>

                  {/* Deductions Table */}
                  <div className="border rounded-lg overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="bg-red-50 border-b px-4 py-2 text-xs font-bold text-red-900 uppercase tracking-wider flex items-center justify-between">
                        <span>Deductions</span>
                        <span>Amount (PKR)</span>
                      </div>
                      <div className="divide-y divide-gray-100 text-xs">
                        <div className="px-4 py-2 flex justify-between">
                          <span className="text-gray-600">Income Tax (Withholding)</span>
                          <span className="font-semibold text-gray-900">{pkr(payslip.deductions.incomeTax)}</span>
                        </div>
                        <div className="px-4 py-2 flex justify-between">
                          <span className="text-gray-600">EOBI Contribution (Employee)</span>
                          <span className="font-semibold text-gray-900">{pkr(payslip.deductions.eobi)}</span>
                        </div>
                        {payslip.deductions.sessi > 0 && (
                          <div className="px-4 py-2 flex justify-between">
                            <span className="text-gray-600">SESSI / Social Security</span>
                            <span className="font-semibold text-gray-900">{pkr(payslip.deductions.sessi)}</span>
                          </div>
                        )}
                        {payslip.deductions.lateDeductions > 0 && (
                          <div className="px-4 py-2 flex justify-between">
                            <span className="text-gray-600">Late / Absence Deduction</span>
                            <span className="font-semibold text-gray-900">{pkr(payslip.deductions.lateDeductions)}</span>
                          </div>
                        )}
                        {payslip.deductions.advanceLoan > 0 && (
                          <div className="px-4 py-2 flex justify-between">
                            <span className="text-gray-600">Salary Advance / Loan Recovery</span>
                            <span className="font-semibold text-gray-900">{pkr(payslip.deductions.advanceLoan)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-red-50/50 border-t px-4 py-2.5 flex justify-between text-xs font-bold text-red-950">
                      <span>TOTAL DEDUCTIONS</span>
                      <span className="text-sm">{pkr(payslip.totalDeductions)}</span>
                    </div>
                  </div>
                </div>

                {/* Net Pay Callout */}
                <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-blue-200 font-semibold uppercase tracking-wider block">
                      NET PAYABLE SALARY
                    </span>
                    <span className="text-xs text-blue-100 italic mt-0.5 block">
                      {inWords(payslip.netPay)}
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {pkr(payslip.netPay)}
                  </div>
                </div>

                {/* Signature Blocks */}
                <div className="pt-8 border-t grid grid-cols-3 gap-8 text-center text-xs">
                  <div>
                    <div className="h-10 border-b border-gray-400"></div>
                    <span className="text-gray-500 mt-2 block font-medium">Prepared By (Accounts)</span>
                  </div>
                  <div>
                    <div className="h-10 border-b border-gray-400"></div>
                    <span className="text-gray-500 mt-2 block font-medium">Verified by Pharmacist-in-Charge</span>
                  </div>
                  <div>
                    <div className="h-10 border-b border-gray-400"></div>
                    <span className="text-gray-500 mt-2 block font-medium">Employee Signature</span>
                  </div>
                </div>

                {/* Statutory Footer */}
                <div className="text-center text-[10px] text-gray-400 border-t pt-3">
                  Computer-generated salary payslip per Employment & Labour Laws of Pakistan • System: SmartBiz Pro Pharmacy
                </div>

                {/* Action buttons (hidden on print) */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t print:hidden">
                  {payslip.phone && (
                    <button
                      onClick={() => sendWhatsApp(payslip)}
                      className="btn-ghost border text-xs gap-1.5 text-green-700 hover:bg-green-50"
                    >
                      <MessageCircle size={15} /> Send via WhatsApp
                    </button>
                  )}
                  <button
                    onClick={() => window.print()}
                    className="btn-primary text-xs"
                  >
                    <Printer size={15} /> Print / Save PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}