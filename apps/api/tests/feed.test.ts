import { memoryStore } from '@chokro/db';
import { GET as getFeed } from '../app/api/feed/route';
import { resetTestStore } from './test-utils';

function listing(id: string, category: string, condition: string, createdAt: string, status = 'ACTIVE') {
  return { id, owner_id: 'owner', category, unit: 'kg', declared_weight: '1', piece_count: null, declared_condition: condition, photos: [], status, created_at: new Date(createdAt) };
}

describe('feed API', () => {
  beforeEach(() => {
    resetTestStore();
    memoryStore.listings.push(
      listing('00000000-0000-0000-0000-000000000003', 'BOOKS', 'GOOD', '2026-08-06T12:00:00Z'),
      listing('00000000-0000-0000-0000-000000000002', 'BOOKS', 'FAIR', '2026-08-06T12:00:00Z'),
      listing('00000000-0000-0000-0000-000000000001', 'PLASTICS', 'GOOD', '2026-08-05T12:00:00Z'),
      listing('00000000-0000-0000-0000-000000000004', 'BOOKS', 'GOOD', '2026-08-07T12:00:00Z', 'DRAFT'),
    );
  });

  it('returns active listings filtered by category and condition', async () => {
    const response = await getFeed(new Request('http://localhost/api/feed?category=BOOKS&condition=GOOD'));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.items).toHaveLength(1);
    expect(data.items[0].id).toBe('00000000-0000-0000-0000-000000000003');
  });

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
