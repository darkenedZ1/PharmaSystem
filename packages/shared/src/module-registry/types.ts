export type ModuleCategory =
  | 'core'
  | 'clinical'
  | 'financial'
  | 'compliance'
  | 'operations'
  | 'analytics'
  | 'engagement';

export type ModuleId =
  | 'core'
  | 'pos'
  | 'inventory'
  | 'prescriptions'
  | 'drug-interactions'
  | 'purchasing'
  | 'accounts'
  | 'fbr'
  | 'payroll'
  | 'reports'
  | 'notifications'
  | 'loyalty'
  | 'delivery'
  | 'saas-admin';

export interface ModulePermission {
  action: 'read' | 'create' | 'update' | 'delete' | 'approve' | 'export' | 'manage';
  resource: string;
}

export interface ModuleMenuItem {
  label: string;
  href: string;
  icon: string;
  children?: ModuleMenuItem[];
}

export interface ModuleDefinition {
  id: ModuleId;
  name: string;
  description: string;
  icon: string;
  category: ModuleCategory;
  /** Other modules that must be enabled for this one to work */
  dependencies: ModuleId[];
  /** Core modules load for every tenant automatically */
  isCore: boolean;
  /** Monthly price in PKR — 0 for core/internal modules */
  pricePKR: number;
  menuItems: ModuleMenuItem[];
  permissions: ModulePermission[];
  /** API route prefixes handled by this module */
  apiPrefixes: string[];
}

export type PresetPlanId = 'starter' | 'standard' | 'professional' | 'enterprise';

export interface PresetPlan {
  id: PresetPlanId;
  name: string;
  description: string;
  pricePKR: number;
  modules: ModuleId[];
  highlighted?: boolean;
}
