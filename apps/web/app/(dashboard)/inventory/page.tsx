import type { Metadata } from 'next';
import { ModuleGate } from '@/components/shell/module-gate';
import { InventoryContent } from './inventory-content';

export const metadata: Metadata = { title: 'Inventory' };

export default function InventoryPage() {
  return (
    <ModuleGate moduleId="inventory">
      <InventoryContent />
    </ModuleGate>
  );
}
