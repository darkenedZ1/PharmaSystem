import type { Metadata } from 'next';
import { ModuleGate } from '@/components/shell/module-gate';
import { ProductsContent } from './products-content';

export const metadata: Metadata = { title: 'Products' };

export default function ProductsPage() {
  return (
    <ModuleGate moduleId="inventory">
      <ProductsContent />
    </ModuleGate>
  );
}
