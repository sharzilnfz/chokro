import { POST as createDropZone, GET as listDropZones } from '../app/api/drop-zones/route';
import { GET as resolveDropZone } from '../app/api/drop-zones/resolve/route';
import { GET as getPoster } from '../app/api/drop-zones/[id]/poster/route';
import { createQrToken } from '../lib/qr';
import { authHeaders, createTestUser, resetTestStore, routeParams, tokenFor } from './test-utils';

describe('drop-zone API', () => {
  beforeEach(resetTestStore);

  it('requires admin for create and list', async () => {
    const body = JSON.stringify({ institutionId: 'BUET', name: 'Main Zone', acceptedCategories: ['PAPER'] });
    const missing = await createDropZone(new Request('http://localhost/api/drop-zones', { method: 'POST', body }));
    const user = createTestUser();
    const forbidden = await listDropZones(new Request('http://localhost/api/drop-zones', { headers: authHeaders(tokenFor(user)) }));
    expect(missing.status).toBe(401);
    expect(forbidden.status).toBe(403);
  });

  it('creates and resolves an opaque signed token, rejecting tampering', async () => {
    const admin = createTestUser('ADMIN');
    const user = createTestUser();
    const created = await createDropZone(new Request('http://localhost/api/drop-zones', {
      method: 'POST', headers: authHeaders(tokenFor(admin)),
      body: JSON.stringify({ institutionId: 'BUET', name: 'Main Zone', acceptedCategories: ['PAPER', 'E_WASTE'] }),
    }));
    const zone = (await created.json()).zone;
    const resolved = await resolveDropZone(new Request(`http://localhost/api/drop-zones/resolve?token=${encodeURIComponent(zone.qr_token)}`, {
      headers: authHeaders(tokenFor(user)),
    }));
    const resolvedData = await resolved.json();
    const unknown = await resolveDropZone(new Request(`http://localhost/api/drop-zones/resolve?token=${encodeURIComponent(createQrToken())}`, {
      headers: authHeaders(tokenFor(user)),
    }));
    const tampered = await resolveDropZone(new Request(`http://localhost/api/drop-zones/resolve?token=${encodeURIComponent(`${zone.qr_token}x`)}`, {
      headers: authHeaders(tokenFor(user)),
    }));

    expect(zone.qr_token).not.toContain(zone.id);
    expect(resolved.status).toBe(200);
    expect(resolvedData.zone).toEqual({ name: 'Main Zone', status: 'ACTIVE', acceptedCategories: ['PAPER', 'E_WASTE'] });
    expect(unknown.status).toBe(404);
    expect(tampered.status).toBe(400);
  });

  it('renders an admin-only scannable QR poster and escapes user data', async () => {
    const admin = createTestUser('ADMIN');
    const token = tokenFor(admin);
    const created = await createDropZone(new Request('http://localhost/api/drop-zones', {
      method: 'POST', headers: authHeaders(token),
      body: JSON.stringify({ institutionId: '<script>alert(1)</script>', name: '<b>Main</b>', acceptedCategories: ['PAPER'] }),
    }));
    const zone = (await created.json()).zone;
    const unauthorized = await getPoster(new Request(`http://localhost/api/drop-zones/${zone.id}/poster`), routeParams(zone.id));
    const poster = await getPoster(new Request(`http://localhost/api/drop-zones/${zone.id}/poster`, { headers: authHeaders(token) }), routeParams(zone.id));
    const html = await poster.text();

    expect(unauthorized.status).toBe(401);
    expect(poster.status).toBe(200);
    expect(html).toContain('<svg');
    expect(html).toContain('&lt;b&gt;Main&lt;/b&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});
