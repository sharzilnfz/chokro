// Central HTTP client for the Chokro API: base URL, auth token wiring, and typed errors.
// Expo config for the API URL plus platform checks.
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// API URL from env (highest priority) or Expo extra config.
const configuredUrl = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl;

// Pick the most reachable base URL for the current platform.
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

// Resolved, exported base URL used by every request.
export const API_URL = resolveApiUrl();

/** Called by AuthContext to register a global handler for 401 responses. */
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(cb: (() => void) | null) {
  onUnauthorized = cb;
}

// Auth token, either set directly or pulled from a live provider.
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

// Error carrying the HTTP status so callers can branch on status codes.
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Request options with a dedicated token override and plain headers record.
type ApiRequestOptions = Omit<RequestInit, 'headers'> & {
  token?: string;
  headers?: Record<string, string>;
};

// Performs the fetch, attaches auth, parses JSON, and normalizes failures.
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { token, headers, ...requestOptions } = options;
  const activeToken = token ?? getAuthToken();

  // Reuse the active token unless the caller explicitly overrides auth.
  const authHeader: Record<string, string> = {};
  if (activeToken && !headers?.Authorization && !headers?.authorization) {
    authHeader.Authorization = `Bearer ${activeToken}`;
  }

  // Compose the request: standard JSON headers, bearer auth, plus any extras.
  const response = await fetch(`${API_URL}${path}`, {
    ...requestOptions,
    headers: {
      Accept: 'application/json',
      ...(requestOptions.body ? { 'Content-Type': 'application/json' } : {}),
      ...authHeader,
      ...headers,
    },
  });

  // Parse the body as JSON, tolerating empty or malformed responses.
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

  // Surface non-2xx responses as a typed error and notify the 401 handler.
  if (!response.ok) {
    let message =
      typeof data === 'object' && data && 'error' in data && typeof data.error === 'string'
        ? data.error
        : `Request failed (${response.status}).`;

    // Extract specific validation message if formatted details are present
    if (typeof data === 'object' && data && 'details' in data && typeof data.details === 'object' && data.details) {
      const details = data.details as Record<string, { _errors?: string[] } | string[] | unknown>;
      for (const [key, val] of Object.entries(details)) {
        if (key === '_errors' && Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') {
          message = val[0];
          break;
        }
        if (typeof val === 'object' && val && '_errors' in (val as Record<string, unknown>) && Array.isArray((val as { _errors?: unknown[] })._errors)) {
          const errs = (val as { _errors: unknown[] })._errors;
          if (errs.length > 0 && typeof errs[0] === 'string') {
            message = `${key}: ${errs[0]}`;
            break;
          }
        }
      }
    }

    if (response.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    throw new ApiError(message, response.status);
  }

  return data as T;
}

// Best-effort human-readable message from any thrown value, for display.
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) return `Could not reach the Chokro API at ${API_URL}.`;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
