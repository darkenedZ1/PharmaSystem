import type { Metadata } from 'next';
import { ModuleGate } from '@/components/shell/module-gate';
import { FbrQueueContent } from './fbr-queue-content';

export const metadata: Metadata = { title: 'FBR Compliance Queue' };

export default function FbrQueuePage() {
  return (
    <ModuleGate moduleId="fbr">
      <FbrQueueContent />
    </ModuleGate>
  );
}
