export function parseDropZoneToken(payload: string): string {
  const trimmed = (payload || '').trim();
  try {
    const url = new URL(trimmed);
    return url.searchParams.get('token')?.trim() || trimmed;
  } catch {
    return trimmed;
  }
}