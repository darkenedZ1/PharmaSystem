import type { Metadata } from 'next';
import { BranchesContent } from './branches-content';

export const metadata: Metadata = { title: 'Branches' };

export default function BranchesPage() {
  return <BranchesContent />;
}
