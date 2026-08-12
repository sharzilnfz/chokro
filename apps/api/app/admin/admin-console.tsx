'use client';

import type { ReactNode } from 'react';
import { AdminShell } from './components/layout/AdminShell';
import { useAdminAuth } from './context/AdminAuthContext';
import { AdminProviders } from './providers/AdminProviders';

export { useAdminAuth, useAdminAuth as useAdminSession };

export function AdminConsole({ children }: { children: ReactNode }) {
  return (
    <AdminProviders>
      <AdminShell>{children}</AdminShell>
    </AdminProviders>
  );
}
