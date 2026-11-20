import type { Metadata } from 'next';
import { AnalyticsSalesContent } from './analytics-sales-content';

export const metadata: Metadata = {
  title: 'Sales Analytics — SmartBiz Pro Pharmacy',
};

export default function AnalyticsSalesPage() {
  return <AnalyticsSalesContent />;
}
