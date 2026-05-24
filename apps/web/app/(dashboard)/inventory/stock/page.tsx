import type { Metadata } from 'next';
import { ModuleGate } from '@/components/shell/module-gate';
import { StockContent } from './stock-content';

export const metadata: Metadata = { title: 'Stock Levels' };

export default function StockPage() {
  return (
    <ModuleGate moduleId="inventory">
      <StockContent />
    </ModuleGate>
  );
}
