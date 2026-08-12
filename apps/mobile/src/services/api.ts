import Constants from 'expo-constants';
import { Platform } from 'react-native';

const configuredUrl = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl;

function resolveApiUrl(): string {
  const base = String(configuredUrl || 'http://localhost:3000').replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    // On web when opening on localhost, prefer localhost:3000 if configuredUrl is LAN IP
    if (base.includes('192.168.') || base.includes('10.0.')) {
      return 'http://localhost:3000';
    }
  }
  return base;
}

export const API_URL = resolveApiUrl();

/** Called by AuthContext to register a global handler for 401 responses. */
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(cb: (() => void) | null) {
  onUnauthorized = cb;
}

let currentToken: string | null = null;
let tokenProvider: (() => string | null | undefined) | null = null;

export function setAuthToken(token: string | null | undefined): void {
  currentToken = token ?? null;
}

export function setAuthTokenProvider(provider: (() => string | null | undefined) | null): void {
  tokenProvider = provider;
}

export function getAuthToken(): string | null {
  if (tokenProvider) {
    const provided = tokenProvider();
    if (provided !== undefined) {
      return provided ?? null;
    }
  }
  return currentToken;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ApiRequestOptions = Omit<RequestInit, 'headers'> & {
  token?: string;
  headers?: Record<string, string>;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { token, headers, ...requestOptions } = options;
  const activeToken = token ?? getAuthToken();

  const authHeader: Record<string, string> = {};
  if (activeToken && (!headers || (!headers.Authorization && !headers.authorization))) {
    authHeader.Authorization = `Bearer ${activeToken}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...requestOptions,
    headers: {
      Accept: 'application/json',
      ...(requestOptions.body ? { 'Content-Type': 'application/json' } : {}),
      ...authHeader,
      ...headers,
    },
  });

  const text = await response.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (!response.ok) {
        throw new ApiError(`Server returned an unreadable response (${response.status}).`, response.status);
      }
    }
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' && data && 'error' in data && typeof data.error === 'string'
        ? data.error
        : `Request failed (${response.status}).`;
    if (response.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    throw new ApiError(message, response.status);
  }

  return data as T;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) return `Could not reach the Chokro API at ${API_URL}.`;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
