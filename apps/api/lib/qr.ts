import crypto from 'crypto';

const NON_PRODUCTION_QR_SECRET = 'chokro-local-qr-secret-2026';

function getQrSecret() {
  if (process.env.QR_SECRET) return process.env.QR_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('QR_SECRET is required in production');
  }
  return NON_PRODUCTION_QR_SECRET;
}

function signature(payload: string) {
  return crypto.createHmac('sha256', getQrSecret()).update(payload).digest('base64url');
}

export function createQrToken() {
  const payload = crypto.randomBytes(32).toString('base64url');
  return `${payload}.${signature(payload)}`;
}

export function isValidQrToken(token: string) {
  const [payload, suppliedSignature, extra] = token.split('.');
  if (!payload || !suppliedSignature || extra) return false;
  const expectedSignature = signature(payload);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}
