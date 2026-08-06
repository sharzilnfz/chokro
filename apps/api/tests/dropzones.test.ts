import { POST as createDropZone, GET as getDropZones } from '../app/api/drop-zones/route';
import { GET as getPoster } from '../app/api/drop-zones/[id]/poster/route';

describe('TD2: Drop-Zone Registry & Signed QR Tokens', () => {
  let createdZoneId = '';

  it('should register a new Drop-Zone with a signed opaque QR token', async () => {
    const req = new Request('http://localhost/api/drop-zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        institutionId: 'BUET-CAMPUS-01',
        name: 'Curzon Hall Recycling Hub',
        acceptedCategories: ['PLASTICS', 'PAPER', 'E_WASTE'],
      }),
    });

    const res = await createDropZone(req as any);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.zone.name).toBe('Curzon Hall Recycling Hub');
    expect(data.zone.qr_token).toBeDefined();
    expect(data.zone.qr_token.length).toBeGreaterThan(16);
    createdZoneId = data.zone.id;
  });

  it('should render a print-ready poster HTML with zone details and QR token', async () => {
    const req = new Request(`http://localhost/api/drop-zones/${createdZoneId}/poster`, {
      method: 'GET',
    });

    const res = await getPoster(req as any, { params: { id: createdZoneId } });
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('Curzon Hall Recycling Hub');
    expect(html).toContain('BUET-CAMPUS-01');
  });
});
