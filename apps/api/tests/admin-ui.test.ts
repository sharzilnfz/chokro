import {
  formatDate,
  formatLabel,
  formatPrice,
  unitForCategory,
} from '../app/admin/lib/formatters';
import {
  AdminApiError,
  adminApiRequest,
  parseApiError,
  setAdminForbiddenHandler,
  setAdminTokenProvider,
  setAdminUnauthorizedHandler,
} from '../app/admin/services/adminApi';

describe('Admin UI Architecture & Formatters', () => {
  describe('formatLabel', () => {
    it('converts screaming snake case to capitalized label', () => {
      expect(formatLabel('PLASTICS')).toBe('Plastics');
      expect(formatLabel('E_WASTE')).toBe('E waste');
      expect(formatLabel('APPLIANCES')).toBe('Appliances');
    });
  });

  describe('formatPrice', () => {
    it('formats numeric prices with BDT currency symbol and two decimals', () => {
      expect(formatPrice(45)).toBe('৳45.00');
      expect(formatPrice('120.5')).toBe('৳120.50');
      expect(formatPrice(0)).toBe('৳0.00');
    });

    it('returns raw string for non-finite numeric input', () => {
      expect(formatPrice('invalid')).toBe('invalid');
    });
  });

  describe('formatDate', () => {
    it('formats valid ISO dates', () => {
      const formatted = formatDate('2026-08-12T12:00:00Z');
      expect(formatted).not.toBe('Date unavailable');
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('returns fallback for invalid dates', () => {
      expect(formatDate('not-a-date')).toBe('Date unavailable');
    });
  });

  describe('unitForCategory', () => {
    it('resolves kg for materials and piece for electronics/appliances', () => {
      expect(unitForCategory('PLASTICS')).toBe('kg');
      expect(unitForCategory('METAL')).toBe('kg');
      expect(unitForCategory('PAPER')).toBe('kg');
      expect(unitForCategory('E_WASTE')).toBe('piece');
      expect(unitForCategory('APPLIANCES')).toBe('piece');
    });
  });
});

describe('Admin API Client & Error Handling', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    setAdminTokenProvider(null);
    setAdminUnauthorizedHandler(null);
    setAdminForbiddenHandler(null);
  });

  describe('AdminApiError', () => {
    it('instantiates with status and message', () => {
      const error = new AdminApiError('Forbidden resource', 403, { reason: 'insufficient_role' });
      expect(error.name).toBe('AdminApiError');
      expect(error.message).toBe('Forbidden resource');
      expect(error.status).toBe(403);
      expect(error.data).toEqual({ reason: 'insufficient_role' });
    });
  });

  describe('parseApiError', () => {
    it('extracts error field from JSON response', async () => {
      const response = new Response(JSON.stringify({ error: 'Specific failure' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
      const message = await parseApiError(response, 'Fallback');
      expect(message).toBe('Specific failure');
    });

    it('extracts message field if error field is absent', async () => {
      const response = new Response(JSON.stringify({ message: 'Alternative error' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
      const message = await parseApiError(response, 'Fallback');
      expect(message).toBe('Alternative error');
    });

    it('returns fallback if response is not valid JSON', async () => {
      const response = new Response('<html>500 Internal Server Error</html>', {
        status: 500,
      });
      const message = await parseApiError(response, 'Fallback error');
      expect(message).toBe('Fallback error');
    });
  });

  describe('adminApiRequest', () => {
    it('automatically injects Authorization header from tokenProvider', async () => {
      setAdminTokenProvider(() => 'test-admin-jwt-token');

      let capturedHeaders: Headers | undefined;
      global.fetch = jest.fn().mockImplementation((_url: string, init?: RequestInit) => {
        capturedHeaders = new Headers(init?.headers);
        return Promise.resolve(
          new Response(JSON.stringify({ ok: true, data: [1, 2, 3] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      });

      const result = await adminApiRequest<{ ok: boolean; data: number[] }>('/api/test');
      expect(result.ok).toBe(true);
      expect(capturedHeaders?.get('Authorization')).toBe('Bearer test-admin-jwt-token');
    });

    it('triggers unauthorizedHandler on 401 response and throws AdminApiError', async () => {
      const onUnauthorized = jest.fn();
      setAdminUnauthorizedHandler(onUnauthorized);

      global.fetch = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Session expired' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await expect(adminApiRequest('/api/protected')).rejects.toThrow('Session expired');
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });

    it('triggers forbiddenHandler on 403 response and throws AdminApiError', async () => {
      const onForbidden = jest.fn();
      setAdminForbiddenHandler(onForbidden);

      global.fetch = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Admin access required' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await expect(adminApiRequest('/api/admin-only')).rejects.toThrow('Admin access required');
      expect(onForbidden).toHaveBeenCalledWith('Admin access required');
    });
  });
});
