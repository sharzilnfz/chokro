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
  // Controlled form fields and submission/error state.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
