import type { Metadata } from 'next';
import { FbrSettingsContent } from './fbr-settings-content';

export const metadata: Metadata = {
  title: 'FBR POS Settings — SmartBiz Pro Pharmacy',
};

export default function FbrSettingsPage() {
  return <FbrSettingsContent />;
}
