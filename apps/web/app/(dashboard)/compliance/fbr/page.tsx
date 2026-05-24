import type { Metadata } from 'next';
import { ModuleGate } from '@/components/shell/module-gate';
import { FbrStatus } from './fbr-status';

export const metadata: Metadata = { title: 'FBR Compliance' };

export default function FbrPage() {
  return (
    <ModuleGate moduleId="fbr">
      <FbrStatus />
    </ModuleGate>
  );
}
