import type { Metadata } from 'next';
import { ModuleGate } from '@/components/shell/module-gate';
import { ExpiryContent } from './expiry-content';

export const metadata: Metadata = { title: 'Near Expiry' };

export default function ExpiryPage() {
  return (
    <ModuleGate moduleId="inventory">
      <ExpiryContent />
    </ModuleGate>
  );
}
