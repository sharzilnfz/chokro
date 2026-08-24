// Shared fetch layer for the admin console: attaches the session token, classifies API failures, and routes auth callbacks.
// Error type carrying the HTTP status and optional response payload for structured failure handling.
export class AdminApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.data = data;
  }
}

// Module-level hooks registered by the auth context to react to session/authorization events.
let tokenProvider: (() => string | null) | null = null;
let unauthorizedHandler: (() => void) | null = null;
let forbiddenHandler: ((message?: string) => void) | null = null;

// Setters used by AdminAuthProvider to wire the token source and auth-error callbacks.
export function setAdminTokenProvider(provider: (() => string | null) | null) {
  tokenProvider = provider;
}

export function setAdminUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export function setAdminForbiddenHandler(handler: ((message?: string) => void) | null) {
  forbiddenHandler = handler;
}

// Extracts a human-readable message from a failed API response body, falling back to a default.
export async function parseApiError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string; message?: string };
    return body.error || body.message || fallback;
  } catch {
    return fallback;
  }
}

export type ApiRequestOptions = RequestInit & {
  token?: string | null;
  // Optional Zod schema; when provided the JSON body is parsed through it.
  schema?: { parse: (data: unknown) => unknown };
};

// Fetch wrapper that injects the bearer token and normalizes auth/HTTP failures into AdminApiError.
// Pass `schema` to validate the response body instead of blind-casting it.
export async function adminApiRequest<T>(
  input: RequestInfo | URL,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { token: explicitToken, headers: initHeaders, schema, ...init } = options;
  const headers = new Headers(initHeaders);

  const activeToken = explicitToken ?? (tokenProvider ? tokenProvider() : null);

  if (activeToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${activeToken}`);
  }

  const response = await fetch(input, { ...init, headers });

  if (response.status === 401) {
    if (unauthorizedHandler) {
      unauthorizedHandler();
    }
    const message = await parseApiError(response, 'Your admin session has expired.');
    throw new AdminApiError(message, 401);
  }

  if (response.status === 403) {
    const message = await parseApiError(
      response,
      'This admin account is not authorized to perform this action.',
    );
    if (forbiddenHandler) {
      forbiddenHandler(message);
    }
    throw new AdminApiError(message, 403);
  }

  if (!response.ok) {
    const message = await parseApiError(
      response,
      `Request failed with status ${response.status}`,
    );
    throw new AdminApiError(message, response.status);
  }

  const body = await response.json();
  if (schema) {
    return schema.parse(body) as T;
  }
  return body as T;
}
