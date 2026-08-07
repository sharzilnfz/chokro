export async function parseApiError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || fallback;
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
  const { token, headers: initHeaders, ...init } = options;
  const headers = new Headers(initHeaders);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(input, { ...init, headers });

  if (!response.ok) {
    const message = await parseApiError(response, `Request failed with status ${response.status}`);
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return (await response.json()) as T;
}
