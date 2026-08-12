'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  setAdminForbiddenHandler,
  setAdminTokenProvider,
  setAdminUnauthorizedHandler,
} from '../services/adminApi';

const TOKEN_KEY = 'chokro.admin.token';

export type SessionStatus = 'loading' | 'signed-out' | 'signed-in';

export type AdminAuthContextType = {
  status: SessionStatus;
  token: string | null;
  sessionMessage: string;
  permissionMessage: string;
  clearPermissionMessage: () => void;
  setTokenAndSignIn: (token: string) => void;
  logout: () => void;
  request: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function useAdminAuth(): AdminAuthContextType {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used inside the AdminAuthProvider.');
  }
  return context;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState('');
  const [permissionMessage, setPermissionMessage] = useState('');

  // Synchronize token provider with adminApi service
  useEffect(() => {
    setAdminTokenProvider(() => token);
  }, [token]);

  // Handle initial hydration from session storage
  useEffect(() => {
    try {
      const storedToken = window.sessionStorage.getItem(TOKEN_KEY);
      setToken(storedToken);
      setStatus(storedToken ? 'signed-in' : 'signed-out');
    } catch {
      setStatus('signed-out');
    }
  }, []);

  const logout = useCallback(() => {
    try {
      window.sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore storage errors in restricted contexts
    }
    setToken(null);
    setPermissionMessage('');
    setSessionMessage('You have signed out.');
    setStatus('signed-out');
    queryClient.clear();
  }, [queryClient]);

  const handleUnauthorized = useCallback(() => {
    try {
      window.sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore storage errors
    }
    setToken(null);
    setPermissionMessage('');
    setSessionMessage('Your session has expired. Sign in again to continue.');
    setStatus('signed-out');
    queryClient.clear();
  }, [queryClient]);

  const handleForbidden = useCallback((message?: string) => {
    setPermissionMessage(
      message || 'This admin account does not have permission to complete that request.',
    );
  }, []);

  useEffect(() => {
    setAdminUnauthorizedHandler(handleUnauthorized);
    setAdminForbiddenHandler(handleForbidden);

    return () => {
      setAdminUnauthorizedHandler(null);
      setAdminForbiddenHandler(null);
      setAdminTokenProvider(null);
    };
  }, [handleUnauthorized, handleForbidden]);

  const setTokenAndSignIn = useCallback((nextToken: string) => {
    try {
      window.sessionStorage.setItem(TOKEN_KEY, nextToken);
    } catch {
      // Ignore storage errors
    }
    setToken(nextToken);
    setSessionMessage('');
    setPermissionMessage('');
    setStatus('signed-in');
  }, []);

  const clearPermissionMessage = useCallback(() => {
    setPermissionMessage('');
  }, []);

  const request = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      const response = await fetch(input, { ...init, headers });

      if (response.status === 401) {
        handleUnauthorized();
      } else if (response.status === 403) {
        handleForbidden();
      } else if (response.ok) {
        setPermissionMessage('');
      }

      return response;
    },
    [token, handleUnauthorized, handleForbidden],
  );

  return (
    <AdminAuthContext.Provider
      value={{
        status,
        token,
        sessionMessage,
        permissionMessage,
        clearPermissionMessage,
        setTokenAndSignIn,
        logout,
        request,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}
