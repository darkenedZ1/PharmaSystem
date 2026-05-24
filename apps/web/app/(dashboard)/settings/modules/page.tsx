import type { Metadata } from 'next';
import { ModuleManager } from './module-manager';

export const metadata: Metadata = { title: 'Modules' };

export default function ModulesPage() {
  return <ModuleManager />;
}
