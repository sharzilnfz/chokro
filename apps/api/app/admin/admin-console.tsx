'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';

const TOKEN_KEY = 'chokro.admin.token';

type SessionStatus = 'loading' | 'signed-out' | 'signed-in';

type AdminSession = {
  request: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  logout: () => void;
};

const AdminSessionContext = createContext<AdminSession | null>(null);

async function responseError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

export function useAdminSession() {
  const session = useContext(AdminSessionContext);
  if (!session) {
    throw new Error('useAdminSession must be used inside the admin console.');
  }
  return session;
}

export function AdminConsole({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState('');
  const [permissionMessage, setPermissionMessage] = useState('');

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const storedToken = window.sessionStorage.getItem(TOKEN_KEY);
      setToken(storedToken);
      setStatus(storedToken ? 'signed-in' : 'signed-out');
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const logout = useCallback(() => {
    window.sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setPermissionMessage('');
    setSessionMessage('You have signed out.');
    setStatus('signed-out');
  }, []);

  const request = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (token) headers.set('Authorization', `Bearer ${token}`);

      const response = await fetch(input, { ...init, headers });

      if (response.status === 401) {
        window.sessionStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setPermissionMessage('');
        setSessionMessage('Your session has expired. Sign in again to continue.');
        setStatus('signed-out');
      } else if (response.status === 403) {
        setPermissionMessage('This admin account does not have permission to complete that request.');
      } else if (response.ok) {
        setPermissionMessage('');
      }

      return response;
    },
    [token],
  );

  if (status === 'loading') {
    return (
      <div className="admin-auth-loading" role="status" aria-live="polite">
        <div className="admin-auth-loading-mark">
          <span className="admin-brand-mark" aria-hidden="true">C</span>
          <span>Restoring admin session</span>
        </div>
      </div>
    );
  }

  if (status === 'signed-out') {
    return (
      <SignIn
        initialMessage={sessionMessage}
        onSuccess={(nextToken) => {
          window.sessionStorage.setItem(TOKEN_KEY, nextToken);
          setToken(nextToken);
          setSessionMessage('');
          setStatus('signed-in');
        }}
      />
    );
  }

  const navigation = [
    { href: '/admin', label: 'Overview' },
    { href: '/admin/rate-card', label: 'Rate card' },
    { href: '/admin/partners', label: 'Partner queue' },
    { href: '/admin/drop-zones', label: 'Drop zones' },
  ];

  return (
    <AdminSessionContext.Provider value={{ request, logout }}>
      <div className="admin-shell">
        <header className="admin-topbar">
          <div className="admin-topbar-inner">
            <Link className="admin-brand" href="/admin" aria-label="Chokro admin overview">
              <span className="admin-brand-mark" aria-hidden="true">C</span>
              <span className="admin-brand-copy">
                <span className="admin-brand-name">Chokro</span>
                <span className="admin-brand-context">Admin console</span>
              </span>
            </Link>

            <nav className="admin-nav" aria-label="Admin navigation">
              {navigation.map((item) => {
                const isCurrent = item.href === '/admin'
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
              <button className="admin-button admin-button-quiet" type="button" onClick={logout}>
                Sign out
              </button>
            </div>
          </div>
        </header>

        {permissionMessage && (
          <div className="admin-global-alert" role="alert">
            <span>{permissionMessage}</span>
            <button
              className="admin-button admin-button-quiet"
              type="button"
              onClick={() => setPermissionMessage('')}
            >
              Dismiss
            </button>
          </div>
        )}

        <main className="admin-main">{children}</main>
      </div>
    </AdminSessionContext.Provider>
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
        setError(await responseError(response, 'Sign-in failed. Check your credentials and try again.'));
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
          <span className="admin-brand-mark" aria-hidden="true">C</span>
          <span>Chokro Admin</span>
        </div>
        <div className="admin-auth-intro">
          <h1 className="admin-auth-title" id="admin-sign-in-intro">Operate the circular network.</h1>
          <p className="admin-auth-copy">
            Publish market rates and review partner applications from one focused operations workspace.
          </p>
        </div>
        <p className="admin-auth-footnote">Internal Sprint 1 operations console</p>
      </section>

      <section className="admin-auth-form-wrap" aria-labelledby="admin-sign-in-title">
        <div className="admin-auth-form-card">
          <h2 className="admin-auth-form-title" id="admin-sign-in-title">Admin sign in</h2>
          <p className="admin-auth-form-copy">Use an account with the ADMIN role to continue.</p>

          {(error || initialMessage) && (
            <p className="admin-status-message" data-tone={error ? 'error' : 'success'} role={error ? 'alert' : 'status'}>
              {error || initialMessage}
            </p>
          )}

          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="admin-field">
              <label className="admin-label" htmlFor="admin-email">Email address</label>
              <input
                className="admin-input"
                id="admin-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="admin-password">Password</label>
              <input
                className="admin-input"
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <button className="admin-button admin-button-primary admin-button-block" type="submit" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <p className="admin-auth-note">The token is kept in session storage and is cleared when this tab closes.</p>
        </div>
      </section>
    </main>
  );
}
