// Admin section layout: sets console-specific metadata and renders all /admin pages inside the AdminConsole provider shell.
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AdminConsole } from './admin-console';

// Admin console metadata; pages under /admin inherit the Admin Console title and are excluded from search indexing.
export const metadata: Metadata = {
  title: {
    default: 'Admin Console',
    template: '%s | Chokro Admin',
  },
  description: 'Manage Chokro rate cards, drop zones, and partner verification.',
  robots: { index: false, follow: false },
};

// Passes route content into the shared admin shell that handles auth gating and console chrome.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminConsole>{children}</AdminConsole>;
}
