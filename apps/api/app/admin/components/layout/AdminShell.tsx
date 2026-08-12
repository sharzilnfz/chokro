'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { SignInForm } from '../auth/SignInForm';
import { AdminButton } from '../ui/AdminButton';

const NAVIGATION_ITEMS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/rate-card', label: 'Rate card' },
  { href: '/admin/partners', label: 'Partner queue' },
  { href: '/admin/drop-zones', label: 'Drop zones' },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const {
    status,
    sessionMessage,
    permissionMessage,
    clearPermissionMessage,
    logout,
    setTokenAndSignIn,
  } = useAdminAuth();

  if (status === 'loading') {
    return (
      <div className="admin-auth-loading" role="status" aria-live="polite">
        <div className="admin-auth-loading-mark">
          <span className="admin-brand-mark" aria-hidden="true">
            C
          </span>
          <span>Restoring admin session</span>
        </div>
      </div>
    );
  }

  if (status === 'signed-out') {
    return <SignInForm initialMessage={sessionMessage} onSuccess={setTokenAndSignIn} />;
  }

  return (
    <div className="admin-shell">
      <header className="admin-topbar" role="banner">
        <div className="admin-topbar-inner">
          <Link className="admin-brand" href="/admin" aria-label="Chokro admin overview">
            <span className="admin-brand-mark" aria-hidden="true">
              C
            </span>
            <span className="admin-brand-copy">
              <span className="admin-brand-name">Chokro</span>
              <span className="admin-brand-context">Admin console</span>
            </span>
          </Link>

          <nav className="admin-nav" aria-label="Admin navigation">
            {NAVIGATION_ITEMS.map((item) => {
              const isCurrent =
                item.href === '/admin'
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

              return (
                <Link
                  className="admin-nav-link"
                  href={item.href}
                  key={item.href}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="admin-session-control">
            <span className="admin-session-label">Admin session</span>
            <AdminButton variant="quiet" type="button" onClick={logout}>
              Sign out
            </AdminButton>
          </div>
        </div>
      </header>

      {permissionMessage && (
        <div className="admin-global-alert" role="alert">
          <span>{permissionMessage}</span>
          <AdminButton variant="quiet" type="button" onClick={clearPermissionMessage}>
            Dismiss
          </AdminButton>
        </div>
      )}

      <main className="admin-main">{children}</main>
    </div>
  );
}
