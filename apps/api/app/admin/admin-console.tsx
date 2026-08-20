// Client entry point for the admin console: layers providers and the auth-aware shell around every admin route.
'use client';

import type { ReactNode } from 'react';
import { AdminShell } from './components/layout/AdminShell';
import { useAdminAuth } from './context/AdminAuthContext';
import { AdminProviders } from './providers/AdminProviders';

// Re-export the auth hook so feature pages can read the session from the console entry point.
export { useAdminAuth };

// Wraps content in query/auth providers, then the admin shell handling sign-in, nav, and layout.
export function AdminConsole({ children }: { children: ReactNode }) {
  return (
    <AdminProviders>
      <AdminShell>{children}</AdminShell>
    </AdminProviders>
  );
}
