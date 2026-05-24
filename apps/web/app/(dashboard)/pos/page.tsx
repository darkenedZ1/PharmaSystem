import type { Metadata } from 'next';
import { ModuleGate } from '@/components/shell/module-gate';
import { PosTerminal } from './pos-terminal';

export const metadata: Metadata = { title: 'POS Terminal' };

export default function PosPage() {
  return (
    <ModuleGate moduleId="pos">
      <PosTerminal />
    </ModuleGate>
  );
}
