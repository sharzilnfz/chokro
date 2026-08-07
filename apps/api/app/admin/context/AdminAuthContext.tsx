'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { parseApiError } from '../services/adminApi';

const TOKEN_KEY = 'chokro.admin.token';

type SessionStatus = 'loading' | 'signed-out' | 'signed-in';

type AdminAuthContextType = {
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

  const setTokenAndSignIn = useCallback((nextToken: string) => {
    window.sessionStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
    setSessionMessage('');
    setPermissionMessage('');
    setStatus('signed-in');
  }, []);

  const logout = useCallback(() => {
    window.sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setPermissionMessage('');
    setSessionMessage('You have signed out.');
    setStatus('signed-out');
  }, []);

  const clearPermissionMessage = useCallback(() => {
    setPermissionMessage('');
  }, []);

  const request = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

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
