export function parseDropZoneToken(payload: string): string {
  const trimmed = (payload || '').trim();
  try {
    const url = new URL(trimmed);
    return url.searchParams.get('token')?.trim() || trimmed;
  } catch {
    return trimmed;
  }
}

export function isValidDropZoneToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  return parseDropZoneToken(token).length > 0;
}
