/** Pakistan drug schedule classifications per DRAP */
export const DRUG_SCHEDULES = {
  OTC: 'OTC',
  SCHEDULE_A: 'Schedule A',
  SCHEDULE_C: 'Schedule C',
  SCHEDULE_F: 'Schedule F',
  SCHEDULE_G: 'Schedule G',
  SCHEDULE_H: 'Schedule H',   // Prescription only
  SCHEDULE_X: 'Schedule X',   // Controlled / narcotic
} as const;

export type DrugSchedule = (typeof DRUG_SCHEDULES)[keyof typeof DRUG_SCHEDULES];

/** FBR invoice scenario for pharmaceuticals (Eighth Schedule Table 1, item 81, 0% GST) */
export const FBR_PHARMA_SCENARIO = {
  scenarioId: 'SN025',
  sroScheduleNo: 'EIGHTH SCHEDULE Table 1',
  sroItemSerialNo: '81',
  taxRate: 0,
} as const;

export const PAYMENT_METHODS = {
  CASH: 'cash',
  JAZZCASH: 'jazzcash',
  EASYPAISA: 'easypaisa',
  CARD: 'card',
  CREDIT: 'credit',
  WALLET: 'wallet',
} as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

export const SALE_STATUSES = {
  DRAFT: 'draft',
  COMPLETED: 'completed',
  VOIDED: 'voided',
  RETURNED: 'returned',
} as const;

export const FBR_SYNC_STATUSES = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  OFFLINE_PENDING: 'offline_pending',
} as const;

export const NOTIFICATION_CHANNELS = {
  WHATSAPP: 'whatsapp',
  SMS: 'sms',
  EMAIL: 'email',
  PUSH: 'push',
} as const;

export const LEAVE_TYPES = {
  ANNUAL: 'annual',
  SICK: 'sick',
  CASUAL: 'casual',
  UNPAID: 'unpaid',
  MATERNITY: 'maternity',
  PATERNITY: 'paternity',
} as const;

/** Pakistan income tax slabs FY 2024-25 */
export const PAKISTAN_TAX_SLABS = [
  { min: 0,        max: 600_000,    rate: 0,    fixedTax: 0 },
  { min: 600_001,  max: 1_200_000,  rate: 0.05, fixedTax: 0 },
  { min: 1_200_001, max: 2_200_000, rate: 0.15, fixedTax: 30_000 },
  { min: 2_200_001, max: 3_200_000, rate: 0.25, fixedTax: 180_000 },
  { min: 3_200_001, max: 4_100_000, rate: 0.30, fixedTax: 430_000 },
  { min: 4_100_001, max: Infinity,  rate: 0.35, fixedTax: 700_000 },
] as const;

export function calculateIncomeTax(annualSalary: number): number {
  const slab = PAKISTAN_TAX_SLABS.find(
    (s) => annualSalary >= s.min && annualSalary <= s.max,
  );
  if (!slab) return 0;
  return slab.fixedTax + (annualSalary - slab.min) * slab.rate;
}
