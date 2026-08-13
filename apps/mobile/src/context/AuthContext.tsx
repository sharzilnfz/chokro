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

const TOKEN_KEY = 'chokro.authToken';

type RestoreState = 'loading' | 'ready' | 'error';
type AuthMode = 'login' | 'signup';
type Credentials = { email: string; password: string };

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

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [restoreState, setRestoreState] = useState<RestoreState>('loading');
  const [restoreError, setRestoreError] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('login');

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

  const login = useCallback(async (nextSession: AuthSession) => {
    await storage.setItem(TOKEN_KEY, nextSession.token);
    setAuthToken(nextSession.token);
    setSession(nextSession);
    setAuthMode('login');
  }, []);

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

const signIn = useCallback(
  (credentials: Credentials) => authenticate('/api/auth/login', credentials),
  [authenticate],
);

const signUp = useCallback(
  (credentials: Credentials) => authenticate('/api/auth/signup', credentials),
  [authenticate],
);

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
