// Covers listing creation, ownership scoping, canonical status transitions, and
// category-derived quantity validation.
import { POST as createListing, GET as listListings } from '../app/api/listings/route';
import { GET as getListing, PATCH as updateListing } from '../app/api/listings/[id]/route';
import { authHeaders, createTestUser, resetTestStore, routeParams, tokenFor } from './test-utils';

// A valid, reusable material payload shared by most cases.
const materialListing = {
  category: 'PLASTICS', unit: 'kg', declaredWeight: 12.5, declaredCondition: 'GOOD', price: 500, photos: [],
};

// Listings API: auth gate, ownership rules, transition rules, and validation.
describe('listing API', () => {
  // Fresh store for each case.
  beforeEach(async () => {
    await resetTestStore();
  });

  // No token -> 401 before any listing logic runs.
  it('requires authentication to create a listing', async () => {
    const response = await createListing(new Request('http://localhost/api/listings', {
      method: 'POST', body: JSON.stringify(materialListing),
    }));
    expect(response.status).toBe(401);
  });

  // The list endpoint is scoped to the caller, not the whole table.
  it('returns only the authenticated user&apos;s own listings', async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    await createListing(new Request('http://localhost/api/listings', {
      method: 'POST', headers: authHeaders(tokenFor(owner)), body: JSON.stringify(materialListing),
    }));
    await createListing(new Request('http://localhost/api/listings', {
      method: 'POST', headers: authHeaders(tokenFor(other)), body: JSON.stringify({ ...materialListing, category: 'PAPER' }),
    }));

    const myListings = await listListings(new Request('http://localhost/api/listings', { headers: authHeaders(tokenFor(owner)) }));
    const data = await myListings.json();
    expect(myListings.status).toBe(200);
    expect(data.listings).toHaveLength(1);
    expect(data.listings[0].owner_id).toBe(owner.id);
  });

  // Read-by-id enforces owner/admin-only visibility for each caller class.
  it('lets only the owner or an admin read a listing by id', async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    const admin = await createTestUser('ADMIN');
    const created = await createListing(new Request('http://localhost/api/listings', {
      method: 'POST', headers: authHeaders(tokenFor(owner)), body: JSON.stringify(materialListing),
    }));
    const listing = (await created.json()).listing;

    const unauthenticated = await getListing(new Request(`http://localhost/api/listings/${listing.id}`), routeParams(listing.id));
    const forbidden = await getListing(new Request(`http://localhost/api/listings/${listing.id}`, { headers: authHeaders(tokenFor(other)) }), routeParams(listing.id));
    const owned = await getListing(new Request(`http://localhost/api/listings/${listing.id}`, { headers: authHeaders(tokenFor(owner)) }), routeParams(listing.id));
    const byAdmin = await getListing(new Request(`http://localhost/api/listings/${listing.id}`, { headers: authHeaders(tokenFor(admin)) }), routeParams(listing.id));

    expect(unauthenticated.status).toBe(401);
    expect(forbidden.status).toBe(403);
    expect(owned.status).toBe(200);
    expect(byAdmin.status).toBe(200);
  });

  // Category-driven quantity rules reject invalid unit/weight/piece combos.
  it.each([
    { body: { ...materialListing, unit: 'piece', pieceCount: 1 }, description: 'material with piece unit' },
    { body: { category: 'E_WASTE', unit: 'piece', declaredCondition: 'GOOD', photos: [] }, description: 'e-waste without piece count' },
    { body: { category: 'APPLIANCES', unit: 'piece', pieceCount: 1.5, declaredCondition: 'GOOD', photos: [] }, description: 'fractional piece count' },
    { body: { category: 'E_WASTE', unit: 'kg', declaredWeight: 3, declaredCondition: 'GOOD', photos: [] }, description: 'e-waste with kg unit' },
    { body: { ...materialListing, declaredCondition: 'BROKEN' }, description: 'unsupported condition' },
    { body: { ...materialListing, status: 'MATCHED' }, description: 'unsupported Sprint 1 status' },
  ])('rejects invalid category-derived quantity: $body ($description)', async ({ body }) => {
    const user = await createTestUser();
    const token = tokenFor(user);
    const response = await createListing(new Request('http://localhost/api/listings', {
      method: 'POST', headers: authHeaders(token), body: JSON.stringify(body),
    }));
    expect(response.status).toBe(400);
  });

  // A valid piece listing records an integer count with no fabricated photos.
  it('creates piece listings with a positive integer piece count and no mock photos', async () => {
    const user = await createTestUser();
    const response = await createListing(new Request('http://localhost/api/listings', {
      method: 'POST',
      headers: authHeaders(tokenFor(user)),
      body: JSON.stringify({ category: 'E_WASTE', unit: 'piece', pieceCount: 2, declaredCondition: 'FAIR', price: 700 }),
    }));
    const data = await response.json();
    expect(response.status).toBe(201);
    expect(data.listing).toMatchObject({ owner_id: user.id, unit: 'piece', piece_count: 2, declared_weight: null, price_bdt: '700.00', photos: [] });
  });

  // Status changes follow canonical transitions and stay owner/admin-gated.
  it('allows only the owner or an admin to apply canonical transitions', async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    const admin = await createTestUser('ADMIN');
    const created = await createListing(new Request('http://localhost/api/listings', {
      method: 'POST', headers: authHeaders(tokenFor(owner)), body: JSON.stringify({ ...materialListing, status: 'DRAFT' }),
    }));
    const listing = (await created.json()).listing;

    const forbidden = await updateListing(new Request(`http://localhost/api/listings/${listing.id}`, {
      method: 'PATCH', headers: authHeaders(tokenFor(other)), body: JSON.stringify({ status: 'ACTIVE' }),
    }), routeParams(listing.id));
    const activated = await updateListing(new Request(`http://localhost/api/listings/${listing.id}`, {
      method: 'PATCH', headers: authHeaders(tokenFor(owner)), body: JSON.stringify({ status: 'ACTIVE' }),
    }), routeParams(listing.id));
    const invalid = await updateListing(new Request(`http://localhost/api/listings/${listing.id}`, {
      method: 'PATCH', headers: authHeaders(tokenFor(owner)), body: JSON.stringify({ status: 'DRAFT' }),
    }), routeParams(listing.id));
    const cancelled = await updateListing(new Request(`http://localhost/api/listings/${listing.id}`, {
      method: 'PATCH', headers: authHeaders(tokenFor(admin)), body: JSON.stringify({ status: 'CANCELLED' }),
    }), routeParams(listing.id));

    expect(forbidden.status).toBe(403);
    expect(activated.status).toBe(200);
    expect(invalid.status).toBe(400);
    expect(cancelled.status).toBe(200);
  });
});
