// Covers admin web UI formatters, the API client's auth/error plumbing, and a render
// smoke pass over every admin console page.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import { AdminAuthProvider } from '../app/admin/context/AdminAuthContext';

import AdminDashboardPage from '../app/admin/page';
import AdminCampusesPage from '../app/admin/campuses/page';
import AdminCertificatesPage from '../app/admin/certificates/page';
import AdminDisputesPage from '../app/admin/disputes/page';
import AdminDropZonesPage from '../app/admin/drop-zones/page';
import AdminKycQueuePage from '../app/admin/kyc-queue/page';
import AdminLeaderboardPage from '../app/admin/leaderboard/page';
import AdminLiabilityPage from '../app/admin/liability/page';
import AdminPartnersPage from '../app/admin/partners/page';
import AdminRateCardPage from '../app/admin/rate-card/page';
import AdminRedemptionsPage from '../app/admin/redemptions/page';
import AdminThresholdsPage from '../app/admin/thresholds/page';
import AdminTrustGatePage from '../app/admin/trust-gate/page';
import AdminZoneCapacityPage from '../app/admin/zone-capacity/page';

// Pure-presentation helpers with no I/O involved.
describe('Admin UI Architecture & Formatters', () => {
  // Label pretty-printing rules.
  describe('formatLabel', () => {
    // Enum-like keys are transformed into readable capitalized text.
    it('converts screaming snake case to capitalized label', () => {
      expect(formatLabel('PLASTICS')).toBe('Plastics');
      expect(formatLabel('E_WASTE')).toBe('E waste');
      expect(formatLabel('APPLIANCES')).toBe('Appliances');
    });
  });

  // Currency output rules.
  describe('formatPrice', () => {
    // Numeric and numeric-string inputs render with the BDT symbol and two decimals.
    it('formats numeric prices with BDT currency symbol and two decimals', () => {
      expect(formatPrice(45)).toBe('৳45.00');
      expect(formatPrice('120.5')).toBe('৳120.50');
      expect(formatPrice(0)).toBe('৳0.00');
    });

    // Non-finite input passes through unchanged instead of erroring.
    it('returns raw string for non-finite numeric input', () => {
      expect(formatPrice('invalid')).toBe('invalid');
    });
  });

  // Date output rules.
  describe('formatDate', () => {
    // Valid ISO timestamps render as a real date string.
    it('formats valid ISO dates', () => {
      const formatted = formatDate('2026-08-12T12:00:00Z');
      expect(formatted).not.toBe('Date unavailable');
      expect(formatted.length).toBeGreaterThan(0);
    });

    // Garbage input falls back to a stable placeholder.
    it('returns fallback for invalid dates', () => {
      expect(formatDate('not-a-date')).toBe('Date unavailable');
    });
  });

  // Category-to-unit mapping rules.
  describe('unitForCategory', () => {
    // Materials measure in kg; electronics/appliances count by piece.
    it('resolves kg for materials and piece for electronics/appliances', () => {
      expect(unitForCategory('PLASTICS')).toBe('kg');
      expect(unitForCategory('METAL')).toBe('kg');
      expect(unitForCategory('PAPER')).toBe('kg');
      expect(unitForCategory('E_WASTE')).toBe('piece');
      expect(unitForCategory('APPLIANCES')).toBe('piece');
    });
  });
});

// The admin fetch wrapper: token injection, error parsing, and 401/403 hooks.
describe('Admin API Client & Error Handling', () => {
  const originalFetch = global.fetch;

  // Restore global fetch and clear injected hooks so tests don't leak state.
  afterEach(() => {
    global.fetch = originalFetch;
    setAdminTokenProvider(null);
    setAdminUnauthorizedHandler(null);
    setAdminForbiddenHandler(null);
  });

  // Error type contract for the client.
  describe('AdminApiError', () => {
    // The constructor captures status and payload alongside the message.
    it('instantiates with status and message', () => {
      const error = new AdminApiError('Forbidden resource', 403, { reason: 'insufficient_role' });
      expect(error.name).toBe('AdminApiError');
      expect(error.message).toBe('Forbidden resource');
      expect(error.status).toBe(403);
      expect(error.data).toEqual({ reason: 'insufficient_role' });
    });
  });

  // Response-to-message mapping for the client.
  describe('parseApiError', () => {
    // Prefers the JSON error field when present.
    it('extracts error field from JSON response', async () => {
      const response = new Response(JSON.stringify({ error: 'Specific failure' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
      const message = await parseApiError(response, 'Fallback');
      expect(message).toBe('Specific failure');
    });

    // Falls back to the message field when error is absent.
    it('extracts message field if error field is absent', async () => {
      const response = new Response(JSON.stringify({ message: 'Alternative error' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
      const message = await parseApiError(response, 'Fallback');
      expect(message).toBe('Alternative error');
    });

    // Non-JSON bodies drop to the caller-provided fallback.
    it('returns fallback if response is not valid JSON', async () => {
      const response = new Response('<html>500 Internal Server Error</html>', {
        status: 500,
      });
      const message = await parseApiError(response, 'Fallback error');
      expect(message).toBe('Fallback error');
    });
  });

  // Fetch wrapper behavior: auth injection and status hooks.
  describe('adminApiRequest', () => {
    // The Authorization header is filled from the configured token provider.
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

    // A 401 triggers the unauthorized hook and throws a typed error.
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

    // A 403 triggers the forbidden hook and throws a typed error.
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

// Render smoke pass: every admin page must produce its initial (loading-state) markup
// inside the standard provider tree, with no network access required.
describe('Admin Console Page Renders', () => {
  const originalFetch = global.fetch;

  beforeAll(() => {
    // Queries are disabled while the session is loading; a hanging fetch guards against surprises.
    global.fetch = jest.fn(() => new Promise<Response>(() => {}));
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  function renderAdminPage(Page: React.ComponentType): string {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return renderToStaticMarkup(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(AdminAuthProvider, null, React.createElement(Page)),
      ),
    );
  }

  const pages: Array<[string, React.ComponentType]> = [
    ['dashboard', AdminDashboardPage],
    ['campuses', AdminCampusesPage],
    ['certificates', AdminCertificatesPage],
    ['disputes', AdminDisputesPage],
    ['drop-zones', AdminDropZonesPage],
    ['kyc-queue', AdminKycQueuePage],
    ['leaderboard', AdminLeaderboardPage],
    ['liability', AdminLiabilityPage],
    ['partners', AdminPartnersPage],
    ['rate-card', AdminRateCardPage],
    ['redemptions', AdminRedemptionsPage],
    ['thresholds', AdminThresholdsPage],
    ['trust-gate', AdminTrustGatePage],
    ['zone-capacity', AdminZoneCapacityPage],
  ];

  test.each(pages)('renders the %s page markup', (name, Page) => {
    const html = renderAdminPage(Page);

    expect(html.length).toBeGreaterThan(0);
    // Every admin page emits the shared console styling hooks.
    expect(html).toContain('admin-');
  });
});
