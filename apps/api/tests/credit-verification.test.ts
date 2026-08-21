// C1: CreditVerificationDomain codec + dispute-pause unit tests
import crypto from 'crypto';
import { db, creditTxns, trustDecisions, disputes, eq } from '@chokro/db';
import { CreditVerificationDomain } from '../lib/domain/CreditVerificationDomain';
import { createTestUser, resetTestStore } from './test-utils';

describe('CreditVerificationDomain — custody-ref codec', () => {
  it('round-trips DEPOSIT, PICKUP, REDEMPTION', () => {
    const id = crypto.randomUUID();
    for (const kind of ['DEPOSIT', 'PICKUP', 'REDEMPTION'] as const) {
      const ref = CreditVerificationDomain.encodeCustodyRef(kind, id);
      const decoded = CreditVerificationDomain.decodeCustodyRef(ref);
      expect(decoded).toEqual({ kind, id });
    }
  });

  it('accepts legacy raw-UUID for DEPOSIT as decode and matches', () => {
    const id = crypto.randomUUID();
    const decoded = CreditVerificationDomain.decodeCustodyRef(id);
    expect(decoded).toEqual({ kind: 'DEPOSIT', id });
    expect(CreditVerificationDomain.matchesCustodyRef(id, 'DEPOSIT', id)).toBe(true);
    expect(CreditVerificationDomain.matchesCustodyRef(`CUSTODY-DEP-${id}`, 'DEPOSIT', id)).toBe(true);
  });

  it('rejects malformed refs', () => {
    expect(CreditVerificationDomain.decodeCustodyRef('CUSTODY-DEP-not-a-uuid')).toBeNull();
    expect(CreditVerificationDomain.decodeCustodyRef('CUSTODY-PICKUP-123')).toBeNull();
    expect(CreditVerificationDomain.decodeCustodyRef('RANDOM-STRING')).toBeNull();
    expect(() => CreditVerificationDomain.encodeCustodyRef('DEPOSIT', 'not-a-uuid')).toThrow();
  });

  it('matchesCustodyRef distinguishes kinds', () => {
    const id = crypto.randomUUID();
    const depRef = CreditVerificationDomain.encodeCustodyRef('DEPOSIT', id);
    expect(CreditVerificationDomain.matchesCustodyRef(depRef, 'PICKUP', id)).toBe(false);
    expect(CreditVerificationDomain.matchesCustodyRef(depRef, 'DEPOSIT', crypto.randomUUID())).toBe(false);
  });
});

describe('CreditVerificationDomain — dispute-pause rule', () => {
  beforeEach(async () => {
    await resetTestStore();
  });

  it('verify throws DomainRuleError when open dispute exists and leaves credit PENDING', async () => {
    const user = await createTestUser('INDIVIDUAL', `u-${crypto.randomUUID()}@test.com`);
    const subjectId = crypto.randomUUID();
    const credit = await CreditVerificationDomain.mintPending({
      userId: user.id,
      amount: 100,
      kind: 'DEPOSIT',
      subjectId,
    });
    const [decision] = await db
      .insert(trustDecisions)
      .values({
        subject_type: 'DEPOSIT',
        subject_id: subjectId,
        decision: 'ESCALATE',
        failing_signals: [],
        evaluated_signals: { user_id: user.id },
      })
      .returning();
    // Open dispute on same deposit
    await db.insert(disputes).values({
      source_type: 'DEPOSIT',
      source_id: subjectId,
      opened_by: user.id,
      against_user_id: user.id,
      reason: 'test dispute',
      status: 'OPEN',
    });

    await expect(CreditVerificationDomain.verify(decision.id)).rejects.toThrow(/open dispute/i);

    const [stillPending] = await db.select().from(creditTxns).where(eq(creditTxns.id, credit.id));
    expect(stillPending.status).toBe('PENDING');
  });

  it('mintPending creates PENDING EARN with canonical ref and verify flips to VERIFIED', async () => {
    const user = await createTestUser('INDIVIDUAL', `u2-${crypto.randomUUID()}@test.com`);
    const subjectId = crypto.randomUUID();
    const credit = await CreditVerificationDomain.mintPending({
      userId: user.id,
      amount: 250,
      kind: 'DEPOSIT',
      subjectId,
    });
    expect(credit.custody_ref).toBe(CreditVerificationDomain.encodeCustodyRef('DEPOSIT', subjectId));
    expect(credit.status).toBe('PENDING');

    const [decision] = await db
      .insert(trustDecisions)
      .values({
        subject_type: 'DEPOSIT',
        subject_id: subjectId,
        decision: 'AUTO_CLEAR',
        failing_signals: [],
        evaluated_signals: { user_id: user.id },
      })
      .returning();

    const verified = await CreditVerificationDomain.verify(decision.id);
    expect(verified?.status).toBe('VERIFIED');
    expect(verified?.trust_decision_id).toBe(decision.id);
  });
});

describe('CreditVerificationDomain — verifyWithin (in-transaction entry point)', () => {
  beforeEach(async () => {
    await resetTestStore();
  });

  it('flips PENDING REDEEM to VERIFIED using the caller executor and stamps the trust decision id', async () => {
    const user = await createTestUser('INDIVIDUAL', `vw-${crypto.randomUUID()}@test.com`);
    const redemptionId = crypto.randomUUID();
    const [decision] = await db
      .insert(trustDecisions)
      .values({
        subject_type: 'REDEMPTION',
        subject_id: redemptionId,
        decision: 'AUTO_CLEAR',
        failing_signals: [],
        evaluated_signals: { user_id: user.id },
      })
      .returning();

    await db.insert(creditTxns).values({
      user_id: user.id,
      amount: '100.00',
      kind: 'REDEEM',
      status: 'PENDING',
      source_id: redemptionId,
      custody_ref: `REDEMPTION-${redemptionId}`,
    });

    let flipped: any = null;
    await db.transaction(async (tx) => {
      flipped = await CreditVerificationDomain.verifyWithin(tx, {
        redemptionId,
        trustDecisionId: decision.id,
      });
    });

    expect(flipped).not.toBeNull();
    expect(flipped.status).toBe('VERIFIED');
    expect(flipped.trust_decision_id).toBe(decision.id);

    const [row] = await db
      .select()
      .from(creditTxns)
      .where(eq(creditTxns.custody_ref, `REDEMPTION-${redemptionId}`));
    expect(row.status).toBe('VERIFIED');
  });

  it('falls back to an empty decision id when none is provided (legacy rows)', async () => {
    const user = await createTestUser('INDIVIDUAL', `vw2-${crypto.randomUUID()}@test.com`);
    const redemptionId = crypto.randomUUID();
    await db.insert(creditTxns).values({
      user_id: user.id,
      amount: '50.00',
      kind: 'REDEEM',
      status: 'PENDING',
      source_id: redemptionId,
      custody_ref: `REDEMPTION-${redemptionId}`,
    });

    await db.transaction(async (tx) => {
      await CreditVerificationDomain.verifyWithin(tx, { redemptionId });
    });

    const [row] = await db
      .select()
      .from(creditTxns)
      .where(eq(creditTxns.custody_ref, `REDEMPTION-${redemptionId}`));
    expect(row.status).toBe('VERIFIED');
    expect(row.trust_decision_id).toBeNull();
  });

  it('is a no-op when no PENDING row matches (hold already released)', async () => {
    const user = await createTestUser('INDIVIDUAL', `vw3-${crypto.randomUUID()}@test.com`);
    const redemptionId = crypto.randomUUID();
    await db.insert(creditTxns).values({
      user_id: user.id,
      amount: '50.00',
      kind: 'REDEEM',
      status: 'VERIFIED',
      source_id: redemptionId,
      custody_ref: `REDEMPTION-${redemptionId}`,
    });

    let flipped: any = null;
    await db.transaction(async (tx) => {
      flipped = await CreditVerificationDomain.verifyWithin(tx, { redemptionId });
    });

    expect(flipped).toBeNull();

    const [row] = await db
      .select()
      .from(creditTxns)
      .where(eq(creditTxns.custody_ref, `REDEMPTION-${redemptionId}`));
    expect(row.status).toBe('VERIFIED');
  });
});
