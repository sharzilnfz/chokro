// qr.ts: extracts the signed drop-zone token from a scanned QR payload.

export function parseDropZoneToken(payload: string): string {
  const trimmed = (payload || '').trim();
  // If the payload is a URL, prefer its ?token= param; otherwise it is the token.
  try {
    const url = new URL(trimmed);
    return url.searchParams.get('token')?.trim() || trimmed;
  } catch {
    return trimmed;
  }
}