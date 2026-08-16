// AuthContext holds global authentication state: it persists and restores the
// session token, wires 401 auto-logout and the token provider into the API
// layer, and exposes login/signup/logout helpers consumed across the app.

// Imports: React hooks, persistent storage, the API layer, and shared types.
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { storage } from '@/services/storage';
import {
  apiRequest,
  ApiError,
  getErrorMessage,
  setOnUnauthorized,
  setAuthToken,
  setAuthTokenProvider,
} from '@/services/api';
import { queryClient } from '@/lib/queryClient';
import type { AuthSession, User } from '@/types';

// AsyncStorage key that persists the session token between launches.
const TOKEN_KEY = 'chokro.authToken';

// RestoreState tracks session rehydration; AuthMode picks login vs. signup.
type RestoreState = 'loading' | 'ready' | 'error';
type AuthMode = 'login' | 'signup';
type Credentials = { email: string; password: string };

// The context's public surface, consumed through useAuth.
type AuthContextValue = {
  session: AuthSession | null;
  token: string | undefined;
  user: User | null;
  restoreState: RestoreState;
  restoreError: string;
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  login: (session: AuthSession) => Promise<void>;
  signIn: (credentials: Credentials) => Promise<void>;
  signUp: (credentials: Credentials) => Promise<void>;
  logout: () => Promise<void>;
  retryRestore: () => void;
  clearAndRestart: () => void;
};

// The context object and a hook that fails loudly if used outside the provider.
const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Session plus the restore phase it is currently going through.
  const [session, setSession] = useState<AuthSession | null>(null);
  const [restoreState, setRestoreState] = useState<RestoreState>('loading');
  const [restoreError, setRestoreError] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  // Tears down the session: clears storage, API token, caches, and auth mode.
  const logout = useCallback(async () => {
    try {
      await storage.deleteItem(TOKEN_KEY);
    } finally {
      setAuthToken(null);
      queryClient.clear();
      setSession(null);
      setAuthMode('login');
    }
  }, []);

  // Rehydrates the token from storage and validates it against /api/auth/me.
  const restoreSession = useCallback(async () => {
    setRestoreState('loading');
    setRestoreError('');

    try {
      const token = await storage.getItem(TOKEN_KEY);
      if (!token) {
        setAuthToken(null);
        setSession(null);
        setRestoreState('ready');
        return;
      }

      setAuthToken(token);
      const data = await apiRequest<{ user: User }>('/api/auth/me', { token });
      setSession({ token, user: data.user });
      setRestoreState('ready');
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
        try {
          await storage.deleteItem(TOKEN_KEY);
        } catch {
          // The rejected token remains unusable even if device storage cannot be updated.
        }
        setAuthToken(null);
        setSession(null);
        setRestoreState('ready');
        return;
      }
      setRestoreError(getErrorMessage(error, 'Could not restore your session.'));
      setRestoreState('error');
    }
  }, []);

  // Kick off session restoration once when the provider mounts.
  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  // Register global 401 handler so any API call auto-logs out on expired tokens.
  useEffect(() => {
    setOnUnauthorized(() => void logout());
    return () => setOnUnauthorized(null);
  }, [logout]);

  // Register auth token provider with the API layer
  useEffect(() => {
    setAuthTokenProvider(() => session?.token ?? null);
    return () => setAuthTokenProvider(null);
  }, [session]);

  // Persists and activates a freshly issued session (token + user).
  const login = useCallback(async (nextSession: AuthSession) => {
    await storage.setItem(TOKEN_KEY, nextSession.token);
    setAuthToken(nextSession.token);
    setSession(nextSession);
    setAuthMode('login');
  }, []);

  // Shared auth path: posts credentials and stores the returned session.
  const authenticate = useCallback(
  async (path: '/api/auth/login' | '/api/auth/signup', credentials: Credentials) => {
    const nextSession = await apiRequest<{ token: string; user: User }>(path, {
      method: 'POST',
      body: JSON.stringify({ email: credentials.email.trim().toLowerCase(), password: credentials.password }),
    });
    await login(nextSession);
  },
  [login],
);

// signIn and signUp are thin wrappers over authenticate with a fixed endpoint.
const signIn = useCallback(
  (credentials: Credentials) => authenticate('/api/auth/login', credentials),
  [authenticate],
);

const signUp = useCallback(
  (credentials: Credentials) => authenticate('/api/auth/signup', credentials),
  [authenticate],
);

  // Hard reset used by "Use another account" after session restore fails.
  const clearAndRestart = useCallback(() => {
    void (async () => {
      try {
        await storage.deleteItem(TOKEN_KEY);
      } finally {
        setAuthToken(null);
        setSession(null);
        setRestoreState('ready');
      }
    })();
  }, []);

  // Assemble the context value and hand it to the whole tree.
  const value: AuthContextValue = {
    session,
    token: session?.token,
    user: session?.user ?? null,
    restoreState,
    restoreError,
    authMode,
    setAuthMode,
    login,
    signIn,
    signUp,
    logout,
    retryRestore: () => void restoreSession(),
    clearAndRestart,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
