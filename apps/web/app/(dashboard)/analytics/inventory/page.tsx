import type { Metadata } from 'next';
import { AnalyticsInventoryContent } from './analytics-inventory-content';

export const metadata: Metadata = {
  title: 'Inventory Analytics — SmartBiz Pro Pharmacy',
};

export default function AnalyticsInventoryPage() {
  return <AnalyticsInventoryContent />;
}
