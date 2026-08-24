// Unit and integration tests for the domain modules that hold core business rules.
import { AuthDomain } from '../lib/domain/AuthDomain';
import { KeysetPagination } from '../lib/domain/KeysetPagination';
import { ListingDomain } from '../lib/domain/ListingDomain';
import { PartnerDomain } from '../lib/domain/PartnerDomain';
import { WalletDomain } from '../lib/domain/WalletDomain';
import { LedgerMath } from '../lib/LedgerMath';
import { settlementRepo } from '../lib/repos/settlement';
import { walletRepo } from '../lib/repos/wallet';
import { resetTestStore } from './test-utils';

// All domain modules: pure rules exercised directly, plus DB-backed flows.
describe('Domain Modules Unit & Integration Tests', () => {
  // Reset tables and remove mocked modules before each case.
  beforeEach(async () => {
    await resetTestStore();
    jest.restoreAllMocks();
  });

  // Registration and login policies.
  describe('AuthDomain', () => {
    // Privileged roles submitted on register are normalized down to INDIVIDUAL.
    it('forces INDIVIDUAL role on public register and returns normalized user object', async () => {
      const session = await AuthDomain.register({
        email: 'domain-user@test.chokro.org',
        password: 'password123',
        role: 'ADMIN' as any,
        institutionId: 'inst-123',
      });

      expect(session.token).toBeDefined();
      expect(session.user.role).toBe('INDIVIDUAL');
      expect(session.user.institutionId).toBe('inst-123');
    });

    // Duplicate-email registration is rejected with a generic account error.
    it('rejects registration if email already exists', async () => {
      await AuthDomain.register({ email: 'dup@test.chokro.org', password: 'password123' });
      await expect(
        AuthDomain.register({ email: 'dup@test.chokro.org', password: 'password123' })
      ).rejects.toThrow('Unable to create account');
    });

    // Valid credentials authenticate; a wrong password is rejected.
    it('authenticates valid credentials and rejects bad passwords', async () => {
      await AuthDomain.register({ email: 'auth@test.chokro.org', password: 'password123' });

      const session = await AuthDomain.authenticate({
        email: 'auth@test.chokro.org',
        password: 'password123',
      });
      expect(session.user.email).toBe('auth@test.chokro.org');

      await expect(
        AuthDomain.authenticate({ email: 'auth@test.chokro.org', password: 'wrongpassword' })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  // Cursor encoding rules for the feed.
  describe('KeysetPagination', () => {
    // Composite cursors round-trip through encode/parse without data loss.
    it('encodes and parses composite cursor cleanly', () => {
      const now = new Date();
      const cursorStr = KeysetPagination.encodeCursor({ created_at: now, id: 'item-100' });
      expect(typeof cursorStr).toBe('string');

      const parsed = KeysetPagination.parseCursor(cursorStr);
      expect(parsed).toEqual({
        createdAt: now.toISOString(),
        id: 'item-100',
      });
    });

    // Empty cursors yield null; malformed input is flagged as undefined.
    it('returns null for empty cursor and undefined for invalid cursor', () => {
      expect(KeysetPagination.parseCursor(null)).toBeNull();
      expect(KeysetPagination.parseCursor('')).toBeNull();
      expect(KeysetPagination.parseCursor('invalid-base64-json')).toBeUndefined();
    });
  });

  // Listing state machine and authorization helper.
  describe('ListingDomain', () => {
    // The transition table only permits canonical lifecycle moves.
    it('validates state transitions accurately', () => {
      expect(ListingDomain.isValidTransition('DRAFT', 'ACTIVE')).toBe(true);
      expect(ListingDomain.isValidTransition('ACTIVE', 'CANCELLED')).toBe(true);
      expect(ListingDomain.isValidTransition('CANCELLED', 'ACTIVE')).toBe(false);
    });

    // Owner or admin may act; a third-party individual is denied.
    it('identifies owner or admin authorization correctly', () => {
      const listing = { owner_id: 'user-1' };
      expect(ListingDomain.isOwnerOrAdmin(listing, 'user-1', 'INDIVIDUAL')).toBe(true);
      expect(ListingDomain.isOwnerOrAdmin(listing, 'user-2', 'ADMIN')).toBe(true);
      expect(ListingDomain.isOwnerOrAdmin(listing, 'user-2', 'INDIVIDUAL')).toBe(false);
    });
  });

  // Partner application rules and the verification state machine.
  describe('PartnerDomain', () => {
    // A DoE license document is mandatory for any e-waste application.
    it('rejects e-waste application missing DoE license doc', async () => {
      await expect(
        PartnerDomain.apply({
          userId: 'user-p1',
          orgName: 'Recycle Corp',
          types: ['E_WASTE'],
          eWasteLicensed: true,
          doeLicenseDoc: null,
        })
      ).rejects.toThrow('DoE License document is mandatory for e-waste licensing.');
    });

    // Verification status permits only forward transitions.
    it('enforces partner verification state transitions', () => {
      expect(PartnerDomain.isValidStatusTransition('APPLIED', 'VERIFIED')).toBe(true);
      expect(PartnerDomain.isValidStatusTransition('APPLIED', 'REJECTED')).toBe(true);
      expect(PartnerDomain.isValidStatusTransition('VERIFIED', 'APPLIED')).toBe(false);
    });
  });

  // Wallet balance math and adjustment creation.
  describe('WalletDomain', () => {
    // Truth table for the single ledger row-classifier (LedgerMath): every
    // kind × status combination and its effect on verified/pending balance.
    it('classifies every ledger row kind × status into the balance truth table', () => {
      const txns = [
        // EARN: VERIFIED adds to verified, PENDING adds to pending, others ignored.
        { amount: '100.50', status: 'VERIFIED', kind: 'EARN' },
        { amount: '50.25', status: 'PENDING', kind: 'EARN' },
        { amount: '999', status: 'REJECTED', kind: 'EARN' },
        // ADJUST: same treatment as EARN.
        { amount: '20', status: 'VERIFIED', kind: 'ADJUST' },
        { amount: '10', status: 'PENDING', kind: 'ADJUST' },
        { amount: '999', status: 'REJECTED', kind: 'ADJUST' },
        // REDEEM: PENDING (held) and VERIFIED (paid) both subtract from verified.
        { amount: '30', status: 'VERIFIED', kind: 'REDEEM' },
        { amount: '-15', status: 'PENDING', kind: 'REDEEM' },
        { amount: '999', status: 'REJECTED', kind: 'REDEEM' },
        // Unknown kinds default to EARN; unparseable amounts are ignored.
        { amount: '5', status: 'VERIFIED' },
        { amount: 'invalid', status: 'VERIFIED', kind: 'EARN' },
      ];
      const summary = WalletDomain.calculateBalance(txns);
      // verified = 100.50 + 20 - 30 - 15 + 5 = 80.50; pending = 50.25 + 10 = 60.25
      expect(summary).toEqual({ verified: 80.5, pending: 60.25 });
    });

    // Negative balances clamp to zero at both entry points.
    it('clamps negative verified and pending balances to zero', () => {
      const clampedUser = WalletDomain.calculateBalance([
        { amount: '10', status: 'VERIFIED', kind: 'EARN' },
        { amount: '40', status: 'PENDING', kind: 'REDEEM' },
      ]);
      expect(clampedUser).toEqual({ verified: 0, pending: 0 });
    });

    // Adjustments accept numeric or string amounts and map onto ledger fields.
    it('creates adjustment with string or number amount and maps fields properly', async () => {
      const userSession = await AuthDomain.register({
        email: 'wallet-user@test.chokro.org',
        password: 'password123',
      });

      const txn = await WalletDomain.createAdjustment({
        userId: userSession.user.id,
        amount: '250.00',
        reason: 'Bonus credits',
      });

      expect(txn).toBeDefined();
      expect(txn.user_id).toBe(userSession.user.id);
      expect(Number(txn.amount)).toBe(250.0);
    });
  });

  // Platform liability math over the append-only ledger (single LedgerMath classifier).
  describe('LedgerMath platform sums', () => {
    // Platform liability: EARN/ADJUST VERIFIED rows earn, REDEEM rows (any live status) subtract.
    it('sums platform liability from grouped ledger aggregates', () => {
      const liability = LedgerMath.sumPlatform([
        { kind: 'EARN', status: 'VERIFIED', amount: '500.00' },
        { kind: 'ADJUST', status: 'VERIFIED', amount: '100.00' },
        { kind: 'EARN', status: 'PENDING', amount: '999.00' }, // pending earnings are not liability
        { kind: 'REDEEM', status: 'PENDING', amount: '200.00' },
        { kind: 'REDEEM', status: 'VERIFIED', amount: '-50.00' }, // abs() applied
        { kind: 'REDEEM', status: 'REJECTED', amount: '999.00' },
      ]);
      // earned = 500 + 100; redeemed = 200 + 50; outstanding = 600 - 250
      expect(liability).toEqual({
        totalEarnedVerifiedCredits: 600,
        totalRedeemedCredits: 250,
        outstandingLiabilityBdt: 350,
      });
    });

    // Liability read goes through the repo's GROUP BY kind/status — no full-ledger load.
    it('derives platform liability metrics from SQL grouping', async () => {
      const userSession = await AuthDomain.register({
        email: 'liability-user@test.chokro.org',
        password: 'password123',
      });

      await walletRepo.createAdjustmentTransaction({ userId: userSession.user.id, amount: 500 });
      await walletRepo.createEarnTransaction({ userId: userSession.user.id, amount: 75, custodyRef: 'LIAB-1' });
      await walletRepo.createRedeemTransaction({
        userId: userSession.user.id,
        amount: 200,
        status: 'PENDING',
      });
      // Paid redeems (VERIFIED) subtract from liability exactly like held ones (PENDING).
      await walletRepo.createRedeemTransaction({
        userId: userSession.user.id,
        amount: 50,
        status: 'VERIFIED',
      });

      const metrics = await settlementRepo.getPlatformLiabilityMetrics();
      // The pending EARN (75) is not yet liability; redeems = 200 + 50.
      expect(metrics).toEqual({
        totalEarnedVerifiedCredits: 500,
        totalRedeemedCredits: 250,
        outstandingLiabilityBdt: 250,
      });
    });

    // The twin monthly sums are one parameterized function: user-scoped ⊆ platform-scoped.
    it('scopes monthly redeemed sums by user and platform', async () => {
      const userA = await AuthDomain.register({
        email: 'monthly-a@test.chokro.org',
        password: 'password123',
      });
      const userB = await AuthDomain.register({
        email: 'monthly-b@test.chokro.org',
        password: 'password123',
      });

      await settlementRepo.createRedemptionRequest({
        userId: userA.user.id,
        amountCredits: 100,
        payoutChannel: 'BKASH',
        accountNumber: '01711223344',
        grossAmountBdt: 100,
        feeBdt: 0,
        netAmountBdt: 100,
        status: 'PAID',
      });
      await settlementRepo.createRedemptionRequest({
        userId: userB.user.id,
        amountCredits: 50,
        payoutChannel: 'BKASH',
        accountNumber: '01711223344',
        grossAmountBdt: 50,
        feeBdt: 0,
        netAmountBdt: 50,
        status: 'REQUESTED',
      });
      // REJECTED rows never count toward the monthly caps.
      await settlementRepo.createRedemptionRequest({
        userId: userA.user.id,
        amountCredits: 999,
        payoutChannel: 'BKASH',
        accountNumber: '01711223344',
        grossAmountBdt: 999,
        feeBdt: 0,
        netAmountBdt: 999,
        status: 'REJECTED',
      });

      const userATotal = await settlementRepo.getUserMonthlyRedeemedBdt(userA.user.id);
      const platformTotal = await settlementRepo.getPlatformMonthlyRedeemedBdt();
      expect(userATotal).toBe(100);
      expect(platformTotal).toBe(150); // userA 100 + userB 50, REJECTED excluded
    });
  });
});
