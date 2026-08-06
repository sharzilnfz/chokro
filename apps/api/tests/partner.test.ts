import { POST as applyPartner } from '../app/api/partners/apply/route';
import { POST as verifyPartner, GET as getAdminPartners } from '../app/api/admin/partners/route';

describe('TA2: Partner Application & DoE License Gate', () => {
  const partnerUserId = '33333333-3333-3333-3333-333333333333';
  let partnerId = '';

  it('should reject e-waste licensing without an uploaded DoE license document', async () => {
    const req = new Request('http://localhost/api/partners/apply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': partnerUserId,
      },
      body: JSON.stringify({
        orgName: 'Illegal Recyclers Corp',
        types: ['RECYCLER'],
        eWasteLicensed: true,
        doeLicenseDoc: null,
      }),
    });

    const res = await applyPartner(req as any);
    expect(res.status).toBe(400);
  });

  it('should successfully submit a partner application with valid DoE document', async () => {
    const req = new Request('http://localhost/api/partners/apply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': partnerUserId,
      },
      body: JSON.stringify({
        orgName: 'Green Tech Recycling BD',
        types: ['RECYCLER', 'COLLECTOR'],
        eWasteLicensed: true,
        doeLicenseDoc: 'DOE-LICENSE-2026-DHAKA.pdf',
      }),
    });

    const res = await applyPartner(req as any);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.partner.status).toBe('APPLIED');
    expect(data.partner.e_waste_licensed).toBe(true);
    partnerId = data.partner.id;
  });

  it('should allow admin to verify partner application', async () => {
    const req = new Request('http://localhost/api/admin/partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partnerId,
        status: 'VERIFIED',
      }),
    });

    const res = await verifyPartner(req as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.partner.status).toBe('VERIFIED');
  });
});
