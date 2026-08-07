'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { AdminButton } from './components/ui/AdminButton';
import { AdminInput } from './components/ui/AdminInput';
import { AdminStatusMessage } from './components/ui/AdminStatusMessage';
import { useAdminAuth } from './context/AdminAuthContext';
import { AdminProviders } from './providers/AdminProviders';
import { parseApiError } from './services/adminApi';

export { useAdminAuth, useAdminAuth as useAdminSession };

export function AdminConsole({ children }: { children: ReactNode }) {
  return (
    <AdminProviders>
      <AdminShell>{children}</AdminShell>
    </AdminProviders>
  );
}

function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { status, sessionMessage, permissionMessage, clearPermissionMessage, logout, setTokenAndSignIn } =
    useAdminAuth();

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
    return <SignIn initialMessage={sessionMessage} onSuccess={setTokenAndSignIn} />;
  }

  const navigation = [
    { href: '/admin', label: 'Overview' },
    { href: '/admin/rate-card', label: 'Rate card' },
    { href: '/admin/partners', label: 'Partner queue' },
    { href: '/admin/drop-zones', label: 'Drop zones' },
  ];

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
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
            {navigation.map((item) => {
              const isCurrent =
                item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href);
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

function SignIn({
  initialMessage,
  onSuccess,
}: {
  initialMessage: string;
  onSuccess: (token: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setError(
          await parseApiError(
            response,
            'Sign-in failed. Check your credentials and try again.',
          ),
        );
        return;
      }

      const body = (await response.json()) as {
        token?: string;
        user?: { role?: string };
      };

      if (body.user?.role !== 'ADMIN') {
        setError('This account is not authorized for the admin console.');
        return;
      }

      if (!body.token) {
        setError('The server did not return an admin session token.');
        return;
      }

      onSuccess(body.token);
    } catch {
      setError('The admin service could not be reached. Try again shortly.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="admin-auth-shell">
      <section className="admin-auth-brand" aria-labelledby="admin-sign-in-intro">
        <div className="admin-auth-wordmark">
          <span className="admin-brand-mark" aria-hidden="true">
            C
          </span>
          <span>Chokro Admin</span>
        </div>
        <div className="admin-auth-intro">
          <h1 className="admin-auth-title" id="admin-sign-in-intro">
            Operate the circular network.
          </h1>
          <p className="admin-auth-copy">
            Publish market rates and review partner applications from one focused operations workspace.
          </p>
        </div>
        <p className="admin-auth-footnote">Internal Sprint 1 operations console</p>
      </section>

      <section className="admin-auth-form-wrap" aria-labelledby="admin-sign-in-title">
        <div className="admin-auth-form-card">
          <h2 className="admin-auth-form-title" id="admin-sign-in-title">
            Admin sign in
          </h2>
          <p className="admin-auth-form-copy">Use an account with the ADMIN role to continue.</p>

          {(error || initialMessage) && (
            <AdminStatusMessage tone={error ? 'error' : 'success'}>
              {error || initialMessage}
            </AdminStatusMessage>
          )}

          <form className="admin-form" onSubmit={handleSubmit}>
            <AdminInput
              id="admin-email"
              label="Email address"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <AdminInput
              id="admin-password"
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <AdminButton
              variant="primary"
              fullWidth
              type="submit"
              loading={submitting}
              loadingText="Signing in..."
            >
              Sign in
            </AdminButton>
          </form>
          <p className="admin-auth-note">
            The token is kept in session storage and is cleared when this tab closes.
          </p>
        </div>
      </section>
    </main>
  );
}
