// Admin app chrome: gates content behind sign-in, renders the top navigation, session controls, and page body.
'use client';

// Next navigation for active-link state, auth context, and shared UI primitives.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { SignInForm } from '../auth/SignInForm';
import { AdminButton } from '../ui/AdminButton';

// Top-level sections that make up the console navigation.
const NAVIGATION_ITEMS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/redemptions', label: 'Redemptions (A10)' },
  { href: '/admin/liability', label: 'Liability (A11)' },
  { href: '/admin/rate-card', label: 'Rate card' },
  { href: '/admin/partners', label: 'Partner queue' },
  { href: '/admin/kyc-queue', label: 'KYC Queue' },
  { href: '/admin/leaderboard', label: 'Leaderboard' },
  { href: '/admin/campuses', label: 'Campuses' },
  { href: '/admin/drop-zones', label: 'Drop zones' },
  { href: '/admin/zone-capacity', label: 'Zone capacity' },
  { href: '/admin/thresholds', label: 'Trust thresholds' },
  { href: '/admin/trust-gate', label: 'Escalations (A07)' },
] as const;


export function AdminShell({ children }: { children: ReactNode }) {
  // Track the current route and read the session/lifecycle actions from the auth context.
  const pathname = usePathname();
  const {
    status,
    sessionMessage,
    permissionMessage,
    clearPermissionMessage,
    logout,
    setTokenAndSignIn,
  } = useAdminAuth();

  // While rehydrating the stored session, show a brief restoring indicator.
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

  // Without a session, render the sign-in form in place of the console.
  if (status === 'signed-out') {
    return <SignInForm initialMessage={sessionMessage} onSuccess={setTokenAndSignIn} />;
  }

  // Signed-in console: branded top bar with nav, then the routed page content.
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

          {/* Navigation links with the active section highlighted */}
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

          {/* Session control with a sign-out action */}
          <div className="admin-session-control">
            <span className="admin-session-label">Admin session</span>
            <AdminButton variant="quiet" type="button" onClick={logout}>
              Sign out
            </AdminButton>
          </div>
        </div>
      </header>

      {/* Dismissible global banner for permission-denied feedback */}
      {permissionMessage && (
        <div className="admin-global-alert" role="alert">
          <span>{permissionMessage}</span>
          <AdminButton variant="quiet" type="button" onClick={clearPermissionMessage}>
            Dismiss
          </AdminButton>
        </div>
      )}

      {/* Routed page content */}
      <main className="admin-main">{children}</main>
    </div>
  );
}
