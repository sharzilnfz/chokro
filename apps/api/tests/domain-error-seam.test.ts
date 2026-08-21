// Seam test: routeError maps DomainRuleError to its HTTP response, and
// non-DomainRuleError failures still fall through to the legacy mappings.
import { ConflictError, DomainRuleError, routeError } from '../lib/database';

// DomainRuleError carries its own status and details through to the response.
describe('DomainRuleError seam mapping', () => {
  it('maps a DomainRuleError to a NextResponse with its status, message, and details', async () => {
    const res = routeError(new DomainRuleError('bid too low', 409, { x: 1 }));
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({ error: 'bid too low', details: { x: 1 } });
  });

  it('omits the details field when the error carries none', async () => {
    const res = routeError(new DomainRuleError('lot not found', 404));
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: 'lot not found' });
  });

  it('still maps non-DomainRuleError failures via the existing fallbacks', () => {
    expect(routeError(new ConflictError('version conflict')).status).toBe(409);
    expect(routeError(new Error('boom')).status).toBe(500);
  });
});
