import type { ModuleDefinition, ModuleId, PresetPlan } from './types';

export const MODULE_REGISTRY: Record<ModuleId, ModuleDefinition> = {
  core: {
    id: 'core',
    name: 'Core',
    description: 'Authentication, users, roles, and tenant administration — always on',
    icon: 'Shield',
    category: 'core',
    dependencies: [],
    isCore: true,
    pricePKR: 0,
    menuItems: [
      { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
      {
        label: 'Settings',
        href: '/settings',
        icon: 'Settings',
        children: [
          { label: 'Users & Roles', href: '/settings/users', icon: 'Users' },
          { label: 'Branches', href: '/settings/branches', icon: 'Building2' },
          { label: 'Modules', href: '/settings/modules', icon: 'Puzzle' },
          { label: 'General', href: '/settings/general', icon: 'SlidersHorizontal' },
        ],
      },
    ],
    permissions: [
      { action: 'read', resource: 'dashboard' },
      { action: 'manage', resource: 'users' },
      { action: 'manage', resource: 'roles' },
      { action: 'manage', resource: 'branches' },
    ],
    apiPrefixes: ['/auth', '/users', '/roles', '/tenants', '/branches'],
  },

  inventory: {
    id: 'inventory',
    name: 'Inventory',
    description: 'Products, batches, expiry tracking, FEFO stock rotation, and recall management',
    icon: 'Package',
    category: 'operations',
    dependencies: [],
    isCore: false,
    pricePKR: 1999,
    menuItems: [
      { label: 'Products', href: '/inventory/products', icon: 'Package' },
      { label: 'Stock Levels', href: '/inventory/stock', icon: 'BarChart3' },
      { label: 'Near Expiry', href: '/inventory/expiry', icon: 'AlertTriangle' },
      { label: 'Adjustments', href: '/inventory/adjustments', icon: 'RefreshCw' },
      { label: 'Stock Transfers', href: '/inventory/transfers', icon: 'ArrowLeftRight' },
    ],
    permissions: [
      { action: 'read', resource: 'products' },
      { action: 'create', resource: 'products' },
      { action: 'update', resource: 'products' },
      { action: 'read', resource: 'stock' },
      { action: 'create', resource: 'stock_adjustments' },
      { action: 'approve', resource: 'stock_transfers' },
    ],
    apiPrefixes: ['/inventory', '/products', '/batches', '/stock'],
  },

  pos: {
    id: 'pos',
    name: 'Point of Sale',
    description: 'Billing, invoicing, barcode scanning, thermal printing, and offline mode',
    icon: 'ShoppingCart',
    category: 'operations',
    dependencies: ['inventory'],
    isCore: false,
    pricePKR: 2999,
    menuItems: [
      { label: 'POS Terminal', href: '/pos', icon: 'ShoppingCart' },
      { label: 'Sales History', href: '/pos/sales', icon: 'Receipt' },
      { label: 'Returns', href: '/pos/returns', icon: 'RotateCcw' },
      { label: 'Cash Management', href: '/pos/cash', icon: 'Banknote' },
      { label: 'Customers', href: '/pos/customers', icon: 'Users' },
    ],
    permissions: [
      { action: 'create', resource: 'sales' },
      { action: 'read', resource: 'sales' },
      { action: 'create', resource: 'returns' },
      { action: 'manage', resource: 'customers' },
      { action: 'read', resource: 'cash_drawer' },
    ],
    apiPrefixes: ['/pos', '/sales', '/customers'],
  },

  fbr: {
    id: 'fbr',
    name: 'FBR Compliance',
    description: 'FBR POS API integration with async retry queue, offline queuing, and fiscal receipts',
    icon: 'BadgeCheck',
    category: 'compliance',
    dependencies: ['pos'],
    isCore: false,
    pricePKR: 999,
    menuItems: [
      { label: 'FBR Status', href: '/compliance/fbr', icon: 'BadgeCheck' },
      { label: 'Sync Queue', href: '/compliance/fbr/queue', icon: 'RefreshCw' },
      { label: 'FBR Reports', href: '/compliance/fbr/reports', icon: 'FileSpreadsheet' },
      { label: 'FBR Settings', href: '/compliance/fbr/settings', icon: 'Settings' },
    ],
    permissions: [
      { action: 'read', resource: 'fbr_status' },
      { action: 'manage', resource: 'fbr_settings' },
      { action: 'read', resource: 'fbr_queue' },
      { action: 'export', resource: 'fbr_reports' },
    ],
    apiPrefixes: ['/fbr', '/compliance'],
  },

  purchasing: {
    id: 'purchasing',
    name: 'Purchasing & Suppliers',
    description: 'Purchase orders, GRN, supplier management, 3-way matching, and payables',
    icon: 'Truck',
    category: 'operations',
    dependencies: ['inventory'],
    isCore: false,
    pricePKR: 1999,
    menuItems: [
      { label: 'Purchase Orders', href: '/purchasing/orders', icon: 'ClipboardList' },
      { label: 'Receive Stock (GRN)', href: '/purchasing/grn', icon: 'PackageCheck' },
      { label: 'Suppliers', href: '/purchasing/suppliers', icon: 'Building2' },
      { label: 'Payables', href: '/purchasing/payables', icon: 'CreditCard' },
      { label: 'Returns to Supplier', href: '/purchasing/returns', icon: 'RotateCcw' },
    ],
    permissions: [
      { action: 'create', resource: 'purchase_orders' },
      { action: 'read', resource: 'purchase_orders' },
      { action: 'approve', resource: 'purchase_orders' },
      { action: 'create', resource: 'grn' },
      { action: 'manage', resource: 'suppliers' },
      { action: 'read', resource: 'payables' },
    ],
    apiPrefixes: ['/purchasing', '/suppliers', '/grn'],
  },

  prescriptions: {
    id: 'prescriptions',
    name: 'Prescriptions & Patients',
    description: 'Patient profiles, prescription tracking, partial fills, and medication history',
    icon: 'FileText',
    category: 'clinical',
    dependencies: ['pos'],
    isCore: false,
    pricePKR: 2499,
    menuItems: [
      { label: 'Patients', href: '/patients', icon: 'Users' },
      { label: 'Prescriptions', href: '/prescriptions', icon: 'FileText' },
      { label: 'Doctors', href: '/prescriptions/doctors', icon: 'Stethoscope' },
      { label: 'Controlled Substances', href: '/prescriptions/controlled', icon: 'ShieldAlert' },
    ],
    permissions: [
      { action: 'manage', resource: 'patients' },
      { action: 'create', resource: 'prescriptions' },
      { action: 'read', resource: 'prescriptions' },
      { action: 'update', resource: 'prescriptions' },
      { action: 'manage', resource: 'doctors' },
      { action: 'read', resource: 'controlled_substance_log' },
    ],
    apiPrefixes: ['/patients', '/prescriptions', '/doctors'],
  },

  'drug-interactions': {
    id: 'drug-interactions',
    name: 'Drug Safety Engine',
    description: 'Drug interaction checker, allergy alerts, and generic substitution at POS',
    icon: 'ShieldAlert',
    category: 'clinical',
    dependencies: ['prescriptions'],
    isCore: false,
    pricePKR: 1499,
    menuItems: [
      { label: 'Drug Sync', href: '/drug-safety/database', icon: 'RefreshCw' },
      { label: 'Check Interactions', href: '/drug-safety/check', icon: 'ShieldAlert' },
      { label: 'Override Log', href: '/drug-safety/overrides', icon: 'ClipboardList' },
    ],
    permissions: [
      { action: 'read', resource: 'drug_database' },
      { action: 'read', resource: 'drug_interactions' },
      { action: 'create', resource: 'interaction_overrides' },
    ],
    apiPrefixes: ['/drug-interactions', '/drug-safety', '/drug-sync'],
  },

  accounts: {
    id: 'accounts',
    name: 'Accounts & Finance',
    description: 'Double-entry bookkeeping, AR/AP, bank reconciliation, and financial statements',
    icon: 'Calculator',
    category: 'financial',
    dependencies: ['pos', 'purchasing'],
    isCore: false,
    pricePKR: 2499,
    menuItems: [
      { label: 'Ledger', href: '/accounts/ledger', icon: 'BookOpen' },
      { label: 'Receivables', href: '/accounts/receivables', icon: 'TrendingUp' },
      { label: 'Payables', href: '/accounts/payables', icon: 'TrendingDown' },
      { label: 'Bank Accounts', href: '/accounts/bank', icon: 'Landmark' },
      { label: 'P&L Statement', href: '/accounts/pnl', icon: 'BarChart' },
      { label: 'Balance Sheet', href: '/accounts/balance-sheet', icon: 'Scale' },
      { label: 'Tax Summary', href: '/accounts/tax', icon: 'FileCheck' },
    ],
    permissions: [
      { action: 'read', resource: 'accounts' },
      { action: 'create', resource: 'journal_entries' },
      { action: 'approve', resource: 'journal_entries' },
      { action: 'read', resource: 'financial_reports' },
      { action: 'manage', resource: 'bank_accounts' },
    ],
    apiPrefixes: ['/accounts', '/journal', '/financial'],
  },

  payroll: {
    id: 'payroll',
    name: 'Payroll & Attendance',
    description: 'Salary processing, ZKTeco biometric attendance, leave management, Pakistan tax slabs',
    icon: 'UserCheck',
    category: 'operations',
    dependencies: [],
    isCore: false,
    pricePKR: 1999,
    menuItems: [
      { label: 'Employees', href: '/payroll/employees', icon: 'Users' },
      { label: 'Attendance', href: '/payroll/attendance', icon: 'Calendar' },
      { label: 'Leave Management', href: '/payroll/leave', icon: 'CalendarOff' },
      { label: 'Run Payroll', href: '/payroll/run', icon: 'Play' },
      { label: 'Payslips', href: '/payroll/payslips', icon: 'Receipt' },
    ],
    permissions: [
      { action: 'manage', resource: 'employees' },
      { action: 'manage', resource: 'attendance' },
      { action: 'approve', resource: 'leave_applications' },
      { action: 'create', resource: 'payroll_runs' },
      { action: 'approve', resource: 'payroll_runs' },
    ],
    apiPrefixes: ['/payroll', '/attendance', '/employees'],
  },

  notifications: {
    id: 'notifications',
    name: 'WhatsApp & SMS',
    description: 'Automated WhatsApp and SMS for prescription alerts, refill reminders, and campaigns',
    icon: 'MessageSquare',
    category: 'engagement',
    dependencies: [],
    isCore: false,
    pricePKR: 1499,
    menuItems: [
      { label: 'Templates', href: '/notifications/templates', icon: 'FileEdit' },
      { label: 'Sent Log', href: '/notifications/log', icon: 'Mail' },
      { label: 'Campaigns', href: '/notifications/campaigns', icon: 'Send' },
      { label: 'Settings', href: '/notifications/settings', icon: 'Settings' },
    ],
    permissions: [
      { action: 'manage', resource: 'notification_templates' },
      { action: 'read', resource: 'notification_logs' },
      { action: 'create', resource: 'campaigns' },
    ],
    apiPrefixes: ['/notifications'],
  },

  reports: {
    id: 'reports',
    name: 'Reports & Analytics',
    description: 'Custom report builder, executive dashboard, and scheduled report email delivery',
    icon: 'BarChart2',
    category: 'analytics',
    dependencies: ['pos'],
    isCore: false,
    pricePKR: 1499,
    menuItems: [
      { label: 'Executive Dashboard', href: '/analytics', icon: 'LayoutDashboard' },
      { label: 'Sales Reports', href: '/analytics/sales', icon: 'TrendingUp' },
      { label: 'Inventory Reports', href: '/analytics/inventory', icon: 'Package' },
      { label: 'Custom Reports', href: '/analytics/custom', icon: 'Sliders' },
      { label: 'Scheduled Reports', href: '/analytics/scheduled', icon: 'Clock' },
    ],
    permissions: [
      { action: 'read', resource: 'reports' },
      { action: 'create', resource: 'custom_reports' },
      { action: 'export', resource: 'reports' },
    ],
    apiPrefixes: ['/reports', '/analytics'],
  },

  loyalty: {
    id: 'loyalty',
    name: 'Customer Loyalty',
    description: 'Points, tiers, wallet, and birthday rewards for repeat customers',
    icon: 'Gift',
    category: 'engagement',
    dependencies: ['pos'],
    isCore: false,
    pricePKR: 1299,
    menuItems: [
      { label: 'Loyalty Program', href: '/loyalty', icon: 'Gift' },
      { label: 'Customer Wallets', href: '/loyalty/wallets', icon: 'Wallet' },
      { label: 'Tiers', href: '/loyalty/tiers', icon: 'Star' },
      { label: 'Campaigns', href: '/loyalty/campaigns', icon: 'Megaphone' },
    ],
    permissions: [
      { action: 'manage', resource: 'loyalty_program' },
      { action: 'read', resource: 'loyalty_transactions' },
      { action: 'manage', resource: 'customer_wallets' },
    ],
    apiPrefixes: ['/loyalty'],
  },

  delivery: {
    id: 'delivery',
    name: 'Home Delivery',
    description: 'Delivery orders, rider assignment, GPS tracking, and proof of delivery',
    icon: 'MapPin',
    category: 'operations',
    dependencies: ['pos', 'notifications'],
    isCore: false,
    pricePKR: 1999,
    menuItems: [
      { label: 'Delivery Orders', href: '/delivery', icon: 'Package' },
      { label: 'Riders', href: '/delivery/riders', icon: 'Bike' },
      { label: 'Zones & Pricing', href: '/delivery/zones', icon: 'Map' },
      { label: 'Live Tracking', href: '/delivery/tracking', icon: 'Navigation' },
    ],
    permissions: [
      { action: 'manage', resource: 'delivery_orders' },
      { action: 'manage', resource: 'riders' },
      { action: 'read', resource: 'delivery_tracking' },
    ],
    apiPrefixes: ['/delivery'],
  },

  'saas-admin': {
    id: 'saas-admin',
    name: 'SaaS Admin',
    description: 'Internal: tenant management, subscriptions, platform metrics, and impersonation',
    icon: 'Crown',
    category: 'core',
    dependencies: [],
    isCore: false,
    pricePKR: 0,
    menuItems: [
      { label: 'Tenants', href: '/admin/tenants', icon: 'Building2' },
      { label: 'Subscriptions', href: '/admin/subscriptions', icon: 'CreditCard' },
      { label: 'Platform Health', href: '/admin/health', icon: 'Activity' },
      { label: 'Feature Flags', href: '/admin/flags', icon: 'Flag' },
    ],
    permissions: [
      { action: 'manage', resource: 'tenants' },
      { action: 'manage', resource: 'subscriptions' },
      { action: 'read', resource: 'platform_metrics' },
    ],
    apiPrefixes: ['/admin'],
  },
};

export const PRESET_PLANS: Record<string, PresetPlan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Single-branch pharmacy getting started',
    pricePKR: 4999,
    modules: ['inventory', 'pos', 'fbr'],
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    description: 'Full operations for an established pharmacy',
    pricePKR: 8999,
    modules: ['inventory', 'pos', 'fbr', 'purchasing', 'accounts', 'notifications'],
    highlighted: true,
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'Clinical-grade management with complete feature set',
    pricePKR: 14999,
    modules: [
      'inventory', 'pos', 'fbr', 'purchasing', 'accounts',
      'notifications', 'prescriptions', 'drug-interactions',
      'loyalty', 'reports', 'payroll',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Everything, including delivery, for pharmacy chains',
    pricePKR: 29999,
    modules: [
      'inventory', 'pos', 'fbr', 'purchasing', 'accounts',
      'notifications', 'prescriptions', 'drug-interactions',
      'loyalty', 'reports', 'payroll', 'delivery',
    ],
  },
};

/** Returns the full dependency tree for a set of module IDs (recursive) */
export function resolveModuleDependencies(moduleIds: ModuleId[]): ModuleId[] {
  const resolved = new Set<ModuleId>();

  function resolve(id: ModuleId) {
    if (resolved.has(id)) return;
    const mod = MODULE_REGISTRY[id];
    if (!mod) return;
    mod.dependencies.forEach(resolve);
    resolved.add(id);
  }

  moduleIds.forEach(resolve);
  return Array.from(resolved);
}

/** Returns all modules that depend on the given module (for removal warnings) */
export function getModuleDependents(moduleId: ModuleId): ModuleId[] {
  return Object.values(MODULE_REGISTRY)
    .filter((m) => m.dependencies.includes(moduleId))
    .map((m) => m.id);
}

/** Validates a proposed module set — returns error messages or empty array */
export function validateModuleSet(moduleIds: ModuleId[]): string[] {
  const errors: string[] = [];
  for (const id of moduleIds) {
    const mod = MODULE_REGISTRY[id];
    if (!mod) { errors.push(`Unknown module: ${id}`); continue; }
    for (const dep of mod.dependencies) {
      if (!moduleIds.includes(dep)) {
        errors.push(
          `Module "${mod.name}" requires "${MODULE_REGISTRY[dep]?.name ?? dep}" to be enabled`,
        );
      }
    }
  }
  return errors;
}
