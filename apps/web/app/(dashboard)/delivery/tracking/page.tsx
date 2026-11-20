import type { Metadata } from 'next';
import { TrackingContent } from './tracking-content';

export const metadata: Metadata = {
  title: 'Live Delivery Tracking — SmartBiz Pro Pharmacy',
};

export default function LiveTrackingPage() {
  return <TrackingContent />;
}
