import { POST as createRate, GET as getAdminRates } from '../app/api/admin/rate-card/route';
import { GET as getPublishedRates } from '../app/api/rate-card/published/route';

describe('TC1: Admin Rate Card Console & Versioning', () => {
  const dummyAdminId = '99999999-9999-9999-9999-999999999999';

  it('should create a new rate card entry for plastics with effective_from timestamp', async () => {
    const req = new Request('http://localhost/api/admin/rate-card', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': dummyAdminId,
      },
      body: JSON.stringify({
        category: 'PLASTICS',
        conditionBand: 'GOOD',
        unit: 'kg',
        priceBdt: 50.0,
      }),
    });

    const res = await createRate(req as any);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.entry.category).toBe('PLASTICS');
    expect(data.entry.price_bdt).toBe('50');
    expect(data.entry.effective_from).toBeDefined();
  });

  it('should return published rate card entries for the mobile app', async () => {
    const req = new Request('http://localhost/api/rate-card/published', {
      method: 'GET',
    });

    const res = await getPublishedRates();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data.rates)).toBe(true);
    expect(data.rates.length).toBeGreaterThan(0);
  });
});
