// qr: minting and validating HMAC-signed QR tokens, used to physically identify
// drop zones (payload.signature format).
//
// Node crypto provides randomness and the HMAC-SHA256 signature.
import crypto from 'crypto';

// Dev-only fallback; production must always supply QR_SECRET via the environment.
const NON_PRODUCTION_QR_SECRET = 'chokro-local-qr-secret-2026';

// Resolve the signing secret, refusing to sign tokens in production without one.
function getQrSecret() {
  if (process.env.QR_SECRET) return process.env.QR_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('QR_SECRET is required in production');
  }
  return NON_PRODUCTION_QR_SECRET;
}

// HMAC-SHA256 digest over the payload, URL-safe encoded.
function signature(payload: string) {
  return crypto.createHmac('sha256', getQrSecret()).update(payload).digest('base64url');
}

// Fresh token: a random 256-bit payload followed by its signature.
export function createQrToken() {
  const payload = crypto.randomBytes(32).toString('base64url');
  return `${payload}.${signature(payload)}`;
}

// Verify a token's signature in constant time; reject malformed tokens and any
// that carry extra segments beyond payload.signature.
export function isValidQrToken(token: string) {
  const [payload, suppliedSignature, extra] = token.split('.');
  if (!payload || !suppliedSignature || extra) return false;
  const expectedSignature = signature(payload);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}
