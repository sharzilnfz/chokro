import { GET as getBalance } from '../app/api/wallet/balance/route';
import { GET as getTransactions } from '../app/api/wallet/transactions/route';
import { POST as adjustWallet } from '../app/api/admin/wallet/adjust/route';

describe('TD1: Wallet & Append-Only Ledger', () => {
  const testUserId = '22222222-2222-2222-2222-222222222222';
  const adminUserId = '99999999-9999-9999-9999-999999999999';

  it('should adjust wallet credits as admin with mandatory reason', async () => {
    const req = new Request('http://localhost/api/admin/wallet/adjust', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': adminUserId,
      },
      body: JSON.stringify({
        userId: testUserId,
        amount: 150.0,
        kind: 'ADJUST',
        reason: 'Bonus credits for pilot campaign participation',
        status: 'VERIFIED',
      }),
    });

    const res = await adjustWallet(req as any);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.txn.amount).toBe('150');
    expect(data.txn.status).toBe('VERIFIED');
  });

  it('should compute verified and pending balance derived from SUM(credit_txns)', async () => {
    const req = new Request('http://localhost/api/wallet/balance', {
      method: 'GET',
      headers: {
        'x-user-id': testUserId,
      },
    });

    const res = await getBalance(req as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.balance.verified).toBe(150);
    expect(data.balance.pending).toBe(0);
  });

  it('should return immutable ledger transaction history', async () => {
    const req = new Request('http://localhost/api/wallet/transactions', {
      method: 'GET',
      headers: {
        'x-user-id': testUserId,
      },
    });

    const res = await getTransactions(req as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data.transactions)).toBe(true);
    expect(data.transactions.length).toBeGreaterThan(0);
  });
});
