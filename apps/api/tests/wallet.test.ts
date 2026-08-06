import { memoryStore } from '@chokro/db';
import { GET as getBalance } from '../app/api/wallet/balance/route';
import { GET as getTransactions } from '../app/api/wallet/transactions/route';
import { POST as adjustWallet } from '../app/api/admin/wallet/adjust/route';
import { authHeaders, createTestUser, resetTestStore, tokenFor } from './test-utils';

describe('wallet API', () => {
  beforeEach(resetTestStore);

  it('requires bearer auth for wallet reads', async () => {
    expect((await getBalance(new Request('http://localhost/api/wallet/balance'))).status).toBe(401);
    expect((await getTransactions(new Request('http://localhost/api/wallet/transactions'))).status).toBe(401);
  });

  it('prevents non-admin adjustment and requires a reason', async () => {
    const user = createTestUser();
    const admin = createTestUser('ADMIN');
    const body = { userId: user.id, amount: 100 };
    const forbidden = await adjustWallet(new Request('http://localhost/api/admin/wallet/adjust', {
      method: 'POST', headers: authHeaders(tokenFor(user)), body: JSON.stringify({ ...body, reason: 'Pilot correction' }),
    }));
    const invalid = await adjustWallet(new Request('http://localhost/api/admin/wallet/adjust', {
      method: 'POST', headers: authHeaders(tokenFor(admin)), body: JSON.stringify(body),
    }));
    expect(forbidden.status).toBe(403);
    expect(invalid.status).toBe(400);
  });

  it('derives balances from append-only ledger entries', async () => {
    const user = createTestUser();
    const admin = createTestUser('ADMIN');
    const adjustment = await adjustWallet(new Request('http://localhost/api/admin/wallet/adjust', {
      method: 'POST', headers: authHeaders(tokenFor(admin)),
      body: JSON.stringify({ userId: user.id, amount: 150, reason: 'Pilot campaign adjustment' }),
    }));
    memoryStore.creditTxns.push({
      id: crypto.randomUUID(), user_id: user.id, amount: '25', kind: 'EARN', status: 'PENDING', reason: null, created_at: new Date(),
    });
    const balance = await getBalance(new Request('http://localhost/api/wallet/balance', { headers: authHeaders(tokenFor(user)) }));
    const data = await balance.json();

    expect(adjustment.status).toBe(201);
    expect(memoryStore.creditTxns).toHaveLength(2);
    expect(data.balance).toEqual({ verified: 150, pending: 25 });
  });
});
