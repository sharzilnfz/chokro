import { GET as getFeed } from '../app/api/feed/route';
import { POST as createListing } from '../app/api/listings/route';

describe('TB2: Browse Feed & Filter APIs', () => {
  beforeAll(async () => {
    // Seed a dummy listing
    const req = new Request('http://localhost/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'user-feed-1' },
      body: JSON.stringify({
        category: 'BOOKS',
        unit: 'kg',
        declaredWeight: 5,
        declaredCondition: 'EXCELLENT',
        photos: ['https://example.com/books.jpg'],
      }),
    });
    await createListing(req as any);
  });

  it('should return a paginated feed of active listings', async () => {
    const req = new Request('http://localhost/api/feed?limit=10', {
      method: 'GET',
    });

    const res = await getFeed(req as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items.length).toBeGreaterThan(0);
  });

  it('should filter feed by category', async () => {
    const req = new Request('http://localhost/api/feed?category=BOOKS', {
      method: 'GET',
    });

    const res = await getFeed(req as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.items.every((item: any) => item.category === 'BOOKS')).toBe(true);
  });
});
