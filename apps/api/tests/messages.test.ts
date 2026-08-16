import { POST as createListing } from '../app/api/listings/route';
import { GET as listConversations, POST as startConversation } from '../app/api/conversations/route';
import { GET as getMessages } from '../app/api/conversations/[id]/route';
import { POST as sendMessage } from '../app/api/messages/route';
import { authHeaders, createTestUser, resetTestStore, tokenFor } from './test-utils';

describe('messaging API', () => {
  beforeEach(async () => {
    await resetTestStore();
  });

  async function createActiveListing(sellerId: string, sellerToken: string) {
    const response = await createListing(new Request('http://localhost/api/listings', {
      method: 'POST',
      headers: authHeaders(sellerToken),
      body: JSON.stringify({ category: 'PLASTICS', unit: 'kg', declaredWeight: 5, declaredCondition: 'GOOD', price: 120 }),
    }));
    expect(response.status).toBe(201);
    return (await response.json()).listing;
  }

  it('starts a conversation from a listing and sends messages between buyer and seller', async () => {
    const seller = await createTestUser();
    const buyer = await createTestUser();
    const sellerToken = tokenFor(seller);
    const buyerToken = tokenFor(buyer);
    const listing = await createActiveListing(seller.id, sellerToken);

    const started = await startConversation(new Request('http://localhost/api/conversations', {
      method: 'POST', headers: authHeaders(buyerToken), body: JSON.stringify({ listingId: listing.id }),
    }));
    expect(started.status).toBe(201);
    const conversation = (await started.json()).conversation;
    expect(conversation.peerEmail).toBe(seller.email);
    expect(conversation.listingCategory).toBe('PLASTICS');

    const sent = await sendMessage(new Request('http://localhost/api/messages', {
      method: 'POST', headers: authHeaders(buyerToken),
      body: JSON.stringify({ conversationId: conversation.id, body: 'Hi, is this still available?' }),
    }));
    expect(sent.status).toBe(201);
    expect((await sent.json()).message.body).toBe('Hi, is this still available?');

    const thread = await getMessages(
      new Request(`http://localhost/api/conversations/${conversation.id}`, { headers: authHeaders(sellerToken) }),
      { params: Promise.resolve({ id: conversation.id }) },
    );
    const threadData = await thread.json();
    expect(thread.status).toBe(200);
    expect(threadData.messages).toHaveLength(1);
    expect(threadData.messages[0].senderId).toBe(buyer.id);

    const inbox = await listConversations(new Request('http://localhost/api/conversations', { headers: authHeaders(sellerToken) }));
    const inboxData = await inbox.json();
    expect(inboxData.conversations).toHaveLength(1);
    expect(inboxData.conversations[0].peerEmail).toBe(buyer.email);
    expect(inboxData.conversations[0].lastMessageBody).toBe('Hi, is this still available?');
  });

  it('reuses an existing conversation for the same buyer and listing', async () => {
    const seller = await createTestUser();
    const buyer = await createTestUser();
    const listing = await createActiveListing(seller.id, tokenFor(seller));

    await startConversation(new Request('http://localhost/api/conversations', {
      method: 'POST', headers: authHeaders(tokenFor(buyer)), body: JSON.stringify({ listingId: listing.id }),
    }));
    const second = await startConversation(new Request('http://localhost/api/conversations', {
      method: 'POST', headers: authHeaders(tokenFor(buyer)), body: JSON.stringify({ listingId: listing.id }),
    }));
    expect(second.status).toBe(201);
    const inbox = await listConversations(new Request('http://localhost/api/conversations', { headers: authHeaders(tokenFor(buyer)) }));
    expect((await inbox.json()).conversations).toHaveLength(1);
  });

  it('rejects self-messaging and non-participant access', async () => {
    const owner = await createTestUser();
    const buyer = await createTestUser();
    const outsider = await createTestUser();
    const listing = await createActiveListing(owner.id, tokenFor(owner));

    const self = await startConversation(new Request('http://localhost/api/conversations', {
      method: 'POST', headers: authHeaders(tokenFor(owner)), body: JSON.stringify({ listingId: listing.id }),
    }));
    expect(self.status).toBe(400);

    const started = await startConversation(new Request('http://localhost/api/conversations', {
      method: 'POST', headers: authHeaders(tokenFor(buyer)), body: JSON.stringify({ listingId: listing.id }),
    }));
    const conversation = (await started.json()).conversation;

    const forbidden = await getMessages(
      new Request(`http://localhost/api/conversations/${conversation.id}`, { headers: authHeaders(tokenFor(outsider)) }),
      { params: Promise.resolve({ id: conversation.id }) },
    );
    expect(forbidden.status).toBe(403);
  });
});
