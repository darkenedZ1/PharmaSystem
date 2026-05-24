import type { Metadata } from 'next';
import { ModuleGate } from '@/components/shell/module-gate';
import { AdjustmentsContent } from './adjustments-content';

export const metadata: Metadata = { title: 'Stock Adjustments' };

export default function AdjustmentsPage() {
  return (
    <ModuleGate moduleId="inventory">
      <AdjustmentsContent />
    </ModuleGate>
  );
}
