import type { Metadata } from 'next';
import { TaxContent } from './tax-content';

export const metadata: Metadata = {
  title: 'Tax Summary & Filings — SmartBiz Pro Pharmacy',
};

export default function TaxSummaryPage() {
  return <TaxContent />;
}
