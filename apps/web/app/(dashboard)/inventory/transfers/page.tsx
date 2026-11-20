import type { Metadata } from 'next';
import { TransfersContent } from './transfers-content';

export const metadata: Metadata = {
  title: 'Stock Transfers — SmartBiz Pro Pharmacy',
};

export default function StockTransfersPage() {
  return <TransfersContent />;
}
