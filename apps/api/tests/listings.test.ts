import { POST as createListing, GET as getListings } from '../app/api/listings/route';
import { GET as getListingById, PATCH as updateListing } from '../app/api/listings/[id]/route';

describe('TB1: Listing CRUD & Dual-Unit Fields', () => {
  const dummyUserId = '11111111-1111-1111-1111-111111111111';
  let createdListingId = '';

  it('should create a new listing for recyclable plastics with unit kg', async () => {
    const req = new Request('http://localhost/api/listings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': dummyUserId,
      },
      body: JSON.stringify({
        category: 'PLASTICS',
        unit: 'kg',
        declaredWeight: 12.5,
        declaredCondition: 'GOOD',
        photos: ['https://example.com/photo1.jpg'],
      }),
    });

    const res = await createListing(req as any);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.listing.category).toBe('PLASTICS');
    expect(data.listing.unit).toBe('kg');
    expect(data.listing.status).toBe('ACTIVE');
    createdListingId = data.listing.id;
  });

  it('should retrieve the created listing by ID', async () => {
    const req = new Request(`http://localhost/api/listings/${createdListingId}`, {
      method: 'GET',
    });

    const res = await getListingById(req as any, { params: { id: createdListingId } });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.listing.id).toBe(createdListingId);
    expect(data.listing.category).toBe('PLASTICS');
  });

  it('should cancel a listing', async () => {
    const req = new Request(`http://localhost/api/listings/${createdListingId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': dummyUserId,
      },
      body: JSON.stringify({
        status: 'CANCELLED',
      }),
    });

    const res = await updateListing(req as any, { params: { id: createdListingId } });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.listing.status).toBe('CANCELLED');
  });
});
