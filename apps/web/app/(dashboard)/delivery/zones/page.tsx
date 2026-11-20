import type { Metadata } from 'next';
import { ZonesContent } from './zones-content';

export const metadata: Metadata = {
  title: 'Delivery Zones & Pricing — SmartBiz Pro Pharmacy',
};

export default function DeliveryZonesPage() {
  return <ZonesContent />;
}
