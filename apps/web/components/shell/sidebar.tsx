'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useModules } from '@/hooks/use-modules';
import { useAuthStore } from '@/stores/auth.store';
import { MODULE_REGISTRY, type ModuleDefinition, type ModuleMenuItem } from '@pharmacy/shared';
import { clsx } from 'clsx';
import {
  LayoutDashboard, Settings, Package, ShoppingCart, BadgeCheck,
  Truck, FileText, ShieldAlert, Calculator, UserCheck, BarChart2,
  MessageSquare, Gift, MapPin, Crown, Shield, Users,
  Building2, Puzzle, SlidersHorizontal, Receipt, RotateCcw,
  Banknote, BarChart3, AlertTriangle, RefreshCw, ArrowLeftRight,
  ClipboardList, PackageCheck, CreditCard, BookOpen, TrendingUp,
  TrendingDown, Landmark, BarChart, Scale, FileCheck,
  Calendar, CalendarOff, Play, FileEdit, Mail, Send,
  Stethoscope, Database, FileSpreadsheet, Navigation, Bike, Map,
  Activity, Flag, Megaphone, Wallet, Star, Sliders, Clock,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number | string; className?: string }>> = {
  LayoutDashboard, Settings, Package, ShoppingCart, BadgeCheck,
  Truck, FileText, ShieldAlert, Calculator, UserCheck, BarChart2,
  MessageSquare, Gift, MapPin, Crown, Shield, Users,
  Building2, Puzzle, SlidersHorizontal, Receipt, RotateCcw,
  Banknote, BarChart3, AlertTriangle, RefreshCw, ArrowLeftRight,
  ClipboardList, PackageCheck, CreditCard, BookOpen, TrendingUp,
  TrendingDown, Landmark, BarChart, Scale, FileCheck,
  Calendar, CalendarOff, Play, FileEdit, Mail, Send,
  Stethoscope, Database, FileSpreadsheet, Navigation, Bike, Map,
  Activity, Flag, Megaphone, Wallet, Star, Sliders, Clock,
};

function NavItem({ item, depth = 0 }: { item: ModuleMenuItem; depth?: number }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const Icon = ICON_MAP[item.icon];

  return (
    <li>
      <Link
        href={item.href}
        className={clsx(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
          depth > 0 && 'ml-4 text-xs',
          isActive
            ? 'bg-blue-50 text-blue-700 font-medium'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        )}
      >
        {Icon && <Icon size={depth === 0 ? 16 : 14} />}
        {item.label}
      </Link>
      {item.children && (
        <ul className="mt-0.5 space-y-0.5">
          {item.children.map((child) => (
            <NavItem key={child.href} item={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  core: 'General',
  operations: 'Operations',
  clinical: 'Clinical',
  financial: 'Finance',
  compliance: 'Compliance',
  analytics: 'Analytics',
  engagement: 'Engagement',
};

export function Sidebar() {
  const { enabledModules } = useModules();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  // Group enabled modules by category
  const grouped = enabledModules.reduce(
    (acc, mod) => {
      const key = mod.category;
      if (!acc[key]) acc[key] = [];
      acc[key]!.push(mod);
      return acc;
    },
    {} as Record<string, ModuleDefinition[]>,
  );

  const categoryOrder = ['core', 'operations', 'clinical', 'financial', 'compliance', 'analytics', 'engagement'];

  return (
    <aside className="flex h-screen w-[260px] flex-col border-r bg-white">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <span className="text-sm font-bold text-white">P</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">PharmaSaaS</p>
          <p className="text-xs text-gray-400 truncate max-w-[160px]">{user?.name}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        {categoryOrder.map((cat) => {
          const mods = grouped[cat];
          if (!mods?.length) return null;

          return (
            <div key={cat} className="mb-4">
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {CATEGORY_LABELS[cat] ?? cat}
              </p>
              <ul className="space-y-0.5">
                {mods.flatMap((mod) =>
                  mod.menuItems.map((item) => <NavItem key={item.href} item={item} />),
                )}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-3">
        <button
          onClick={clearAuth}
          className="w-full btn-ghost text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
