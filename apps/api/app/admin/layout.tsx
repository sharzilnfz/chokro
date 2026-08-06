import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AdminConsole } from './admin-console';

export const metadata: Metadata = {
  title: 'Admin Console',
  description: 'Manage Chokro rate cards and partner verification.',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminConsole>{children}</AdminConsole>;
}
