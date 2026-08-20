// Admin sign-in screen: validates credentials against the auth API and hands the session token up to the shell.
'use client';

// Form state, API error parsing, and admin form primitives.
import { useState, type FormEvent } from 'react';
import { parseApiError } from '../../services/adminApi';
import { AdminButton } from '../ui/AdminButton';
import { AdminInput } from '../ui/AdminInput';
import { AdminStatusMessage } from '../ui/AdminStatusMessage';

// Props contract: optional banner message plus the callback fired with a valid token.
export type SignInFormProps = {
  initialMessage?: string;
  onSuccess: (token: string) => void;
};

export function SignInForm({ initialMessage, onSuccess }: SignInFormProps) {
  // Controlled form fields, password visibility toggle, and submission/error state.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Submits credentials and only forwards the token when the account has the ADMIN role.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
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
      setError('The admin authentication service could not be reached. Try again shortly.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    // Split-screen layout: brand/positioning copy on the left, the form card on the right
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

          {/* Session banner for auth-service messages or credential errors */}
          {(error || initialMessage) && (
            <AdminStatusMessage tone={error ? 'error' : 'success'}>
              {error || initialMessage}
            </AdminStatusMessage>
          )}

          {/* Credential fields plus the submit button */}
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
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              rightSlot={
                <button
                  type="button"
                  className="admin-input-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  ) : (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              }
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
