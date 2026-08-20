import { POST as createListing } from '../app/api/listings/route';
import { POST as save, DELETE as unsave } from '../app/api/listings/[id]/save/route';
import { GET as getFeed } from '../app/api/feed/route';
import { authHeaders, createTestUser, resetTestStore, tokenFor, routeParams } from './test-utils';

type FeedItem = { id: string; saved?: boolean };
type FeedData = { items: FeedItem[]; nextCursor?: string | null };

describe('saved listings API', () => {
  beforeEach(async () => {
    await resetTestStore();
  });

  async function createActiveListing(ownerId: string, ownerToken: string) {
    const response = await createListing(new Request('http://localhost/api/listings', {
      method: 'POST',
      headers: authHeaders(ownerToken),
      body: JSON.stringify({ category: 'PAPER', unit: 'kg', declaredWeight: 10, declaredCondition: 'GOOD', price: 40 }),
    }));
    expect(response.status).toBe(201);
    return (await response.json()).listing;
  }

  it('saves and unsaves a listing per user', async () => {
    const owner = await createTestUser();
    const saver = await createTestUser();
    const other = await createTestUser();
    const listing = await createActiveListing(owner.id, tokenFor(owner));

    const saved = await save(
      new Request(`http://localhost/api/listings/${listing.id}/save`, { method: 'POST', headers: authHeaders(tokenFor(saver)) }),
      routeParams(listing.id),
    );
    expect(saved.status).toBe(200);
    expect(await saved.json()).toEqual({ listingId: listing.id, saved: true });

    const feed = await getFeed(new Request('http://localhost/api/feed', { headers: authHeaders(tokenFor(saver)) }));
    const feedData = (await feed.json()) as FeedData;
    expect(feedData.items.find((i) => i.id === listing.id)?.saved).toBe(true);

    const otherFeed = await getFeed(new Request('http://localhost/api/feed', { headers: authHeaders(tokenFor(other)) }));
    const otherFeedData = (await otherFeed.json()) as FeedData;
    expect(otherFeedData.items.find((i) => i.id === listing.id)?.saved).toBe(false);

    const savedAgain = await save(
      new Request(`http://localhost/api/listings/${listing.id}/save`, { method: 'POST', headers: authHeaders(tokenFor(saver)) }),
      routeParams(listing.id),
    );
    expect(savedAgain.status).toBe(200);

    const unsaved = await unsave(
      new Request(`http://localhost/api/listings/${listing.id}/save`, { method: 'DELETE', headers: authHeaders(tokenFor(saver)) }),
      routeParams(listing.id),
    );
    expect(unsaved.status).toBe(200);
    expect(await unsaved.json()).toEqual({ listingId: listing.id, saved: false });

    const afterFeed = await getFeed(new Request('http://localhost/api/feed', { headers: authHeaders(tokenFor(saver)) }));
    const afterData = (await afterFeed.json()) as FeedData;
    expect(afterData.items.find((i) => i.id === listing.id)?.saved).toBe(false);
  });

  it('returns a saved flag of false for unauthenticated feed access', async () => {
    const owner = await createTestUser();
    await createActiveListing(owner.id, tokenFor(owner));

    const feed = await getFeed(new Request('http://localhost/api/feed'));
    const feedData = (await feed.json()) as FeedData;
    expect(feedData.items.every((i) => i.saved === false)).toBe(true);
  });

  it('filters the feed to only saved listings when saved=true for an authenticated user', async () => {
    const owner = await createTestUser();
    const saver = await createTestUser();
    const savedListing = await createActiveListing(owner.id, tokenFor(owner));
    const unsavedListing = await createActiveListing(owner.id, tokenFor(owner));

    await save(
      new Request(`http://localhost/api/listings/${savedListing.id}/save`, { method: 'POST', headers: authHeaders(tokenFor(saver)) }),
      routeParams(savedListing.id),
    );

    const feed = await getFeed(new Request('http://localhost/api/feed?saved=true', { headers: authHeaders(tokenFor(saver)) }));
    const feedData = (await feed.json()) as FeedData;
    const ids = feedData.items.map((i) => i.id);
    expect(ids).toContain(savedListing.id);
    expect(ids).not.toContain(unsavedListing.id);
  });

  it('returns no items when saved=true without authentication', async () => {
    const feed = await getFeed(new Request('http://localhost/api/feed?saved=true'));
    const feedData = (await feed.json()) as FeedData;
    expect(feedData.items).toHaveLength(0);
  });
});