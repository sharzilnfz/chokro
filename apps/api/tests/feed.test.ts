// Covers the public feed: filtering, composite-cursor pagination, and status
// visibility for seeded listings.
import { db, listings } from '@chokro/db';
import { GET as getFeed } from '../app/api/feed/route';
import { createTestUser, resetTestStore } from './test-utils';

// Row factory for seeding the listings table with known ids and timestamps.
function listing(id: string, ownerId: string, category: string, condition: string, createdAt: string, status = 'ACTIVE') {
  return { id, owner_id: ownerId, category, unit: 'kg', declared_weight: '1', piece_count: null, declared_condition: condition, price_bdt: '50.00', photos: [], status, created_at: new Date(createdAt) };
}

// Feed API: deterministic seeded rows drive filter and cursor checks.
describe('feed API', () => {
  let user: Awaited<ReturnType<typeof createTestUser>>;
  beforeEach(async () => {
    await resetTestStore();
    user = await createTestUser();
    await db.insert(listings).values([
      listing('00000000-0000-0000-0000-000000000003', user.id, 'BOOKS', 'GOOD', '2026-08-06T12:00:00Z'),
      listing('00000000-0000-0000-0000-000000000002', user.id, 'BOOKS', 'FAIR', '2026-08-06T12:00:00Z'),
      listing('00000000-0000-0000-0000-000000000001', user.id, 'PLASTICS', 'GOOD', '2026-08-05T12:00:00Z'),
      listing('00000000-0000-0000-0000-000000000004', user.id, 'BOOKS', 'GOOD', '2026-08-07T12:00:00Z', 'DRAFT'),
    ]);
  });

  // Category + condition filters narrow the feed to the matching ACTIVE listing.
  it('returns active listings filtered by category and condition', async () => {
    const response = await getFeed(new Request('http://localhost/api/feed?category=BOOKS&condition=GOOD'));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.items).toHaveLength(1);
    expect(data.items[0].id).toBe('00000000-0000-0000-0000-000000000003');
    expect(data.items[0].seller_email).toBe(user.email);
    expect(data.items[0].price_bdt).toBe('50.00');
  });

  // The (created_at, id) cursor pages without gaps, duplicates, or a trailing cursor.
  it('uses a stable composite cursor without duplicates', async () => {
    const firstResponse = await getFeed(new Request('http://localhost/api/feed?limit=2'));
    const first = await firstResponse.json();
    const secondResponse = await getFeed(new Request(`http://localhost/api/feed?limit=2&cursor=${encodeURIComponent(first.nextCursor)}`));
    const second = await secondResponse.json();

    expect(first.items.map((item: { id: string }) => item.id)).toEqual([
      '00000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000002',
    ]);
    expect(second.items.map((item: { id: string }) => item.id)).toEqual(['00000000-0000-0000-0000-000000000001']);
    expect(second.nextCursor).toBeNull();
  });
});
