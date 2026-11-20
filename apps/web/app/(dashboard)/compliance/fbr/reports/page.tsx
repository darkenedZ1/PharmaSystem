import type { Metadata } from 'next';
import { FbrReportsContent } from './fbr-reports-content';

export const metadata: Metadata = {
  title: 'FBR Reports & Annexure-C — SmartBiz Pro Pharmacy',
};

export default function FbrReportsPage() {
  return <FbrReportsContent />;
}
