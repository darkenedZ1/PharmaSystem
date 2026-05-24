import type { Metadata } from 'next';
import { UsersContent } from './users-content';

export const metadata: Metadata = { title: 'Users & Roles' };

export default function UsersPage() {
  return <UsersContent />;
}
