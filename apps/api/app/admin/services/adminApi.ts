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

let tokenProvider: (() => string | null) | null = null;
let unauthorizedHandler: (() => void) | null = null;
let forbiddenHandler: ((message?: string) => void) | null = null;

export function setAdminTokenProvider(provider: (() => string | null) | null) {
  tokenProvider = provider;
}

export function setAdminUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export function setAdminForbiddenHandler(handler: ((message?: string) => void) | null) {
  forbiddenHandler = handler;
}

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
};

export async function adminApiRequest<T>(
  input: RequestInfo | URL,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { token: explicitToken, headers: initHeaders, ...init } = options;
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

  return (await response.json()) as T;
}
