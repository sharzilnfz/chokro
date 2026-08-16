// Covers wallet reads, admin adjustments, and how balances are derived from the
// append-only credit ledger.
import { db, creditTxns } from '@chokro/db';
import crypto from 'crypto';
import { GET as getBalance } from '../app/api/wallet/balance/route';
import { GET as getTransactions } from '../app/api/wallet/transactions/route';
import { POST as adjustWallet } from '../app/api/admin/wallet/adjust/route';
import { authHeaders, createTestUser, resetTestStore, tokenFor } from './test-utils';

// Wallet API: reads require auth; adjustments are admin-only ledger writes.
describe('wallet API', () => {
  // Reset the store before each case.
  beforeEach(async () => {
    await resetTestStore();
  });

  // Balance and transaction reads reject anonymous callers.
  it('requires bearer auth for wallet reads', async () => {
    expect((await getBalance(new Request('http://localhost/api/wallet/balance'))).status).toBe(401);
    expect((await getTransactions(new Request('http://localhost/api/wallet/transactions'))).status).toBe(401);
  });

  // Adjustments need an admin role and a mandatory reason string.
  it('prevents non-admin adjustment and requires a reason', async () => {
    const user = await createTestUser();
    const admin = await createTestUser('ADMIN');
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

  // Balance is computed from the ledger (verified vs pending) on the fly.
  it('derives balances from append-only ledger entries', async () => {
    const user = await createTestUser();
    const admin = await createTestUser('ADMIN');
    const adjustment = await adjustWallet(new Request('http://localhost/api/admin/wallet/adjust', {
      method: 'POST', headers: authHeaders(tokenFor(admin)),
      body: JSON.stringify({ userId: user.id, amount: 150, reason: 'Pilot campaign adjustment' }),
    }));
    await db.insert(creditTxns).values({
      id: crypto.randomUUID(),
      user_id: user.id,
      amount: '25.00',
      kind: 'EARN',
      status: 'PENDING',
      reason: null,
      created_at: new Date(),
    });
    const balance = await getBalance(new Request('http://localhost/api/wallet/balance', { headers: authHeaders(tokenFor(user)) }));
    const data = await balance.json();

    expect(adjustment.status).toBe(201);
    const txns = await db.select().from(creditTxns);
    expect(txns).toHaveLength(2);
    expect(data.balance).toEqual({ verified: 150, pending: 25 });
  });
});
