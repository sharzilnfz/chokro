import { AuthDomain } from '../lib/domain/AuthDomain';
import { KeysetPagination } from '../lib/domain/KeysetPagination';
import { ListingDomain } from '../lib/domain/ListingDomain';
import { PartnerDomain } from '../lib/domain/PartnerDomain';
import { WalletDomain } from '../lib/domain/WalletDomain';
import { resetTestStore } from './test-utils';

describe('Domain Modules Unit & Integration Tests', () => {
  beforeEach(async () => {
    await resetTestStore();
    jest.restoreAllMocks();
  });

  describe('AuthDomain', () => {
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

    it('rejects registration if email already exists', async () => {
      await AuthDomain.register({ email: 'dup@test.chokro.org', password: 'password123' });
      await expect(
        AuthDomain.register({ email: 'dup@test.chokro.org', password: 'password123' })
      ).rejects.toThrow('Unable to create account');
    });

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

  describe('KeysetPagination', () => {
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

    it('returns null for empty cursor and undefined for invalid cursor', () => {
      expect(KeysetPagination.parseCursor(null)).toBeNull();
      expect(KeysetPagination.parseCursor('')).toBeNull();
      expect(KeysetPagination.parseCursor('invalid-base64-json')).toBeUndefined();
    });
  });

  describe('ListingDomain', () => {
    it('validates state transitions accurately', () => {
      expect(ListingDomain.isValidTransition('DRAFT', 'ACTIVE')).toBe(true);
      expect(ListingDomain.isValidTransition('ACTIVE', 'CANCELLED')).toBe(true);
      expect(ListingDomain.isValidTransition('CANCELLED', 'ACTIVE')).toBe(false);
    });

    it('identifies owner or admin authorization correctly', () => {
      const listing = { owner_id: 'user-1' };
      expect(ListingDomain.isOwnerOrAdmin(listing, 'user-1', 'INDIVIDUAL')).toBe(true);
      expect(ListingDomain.isOwnerOrAdmin(listing, 'user-2', 'ADMIN')).toBe(true);
      expect(ListingDomain.isOwnerOrAdmin(listing, 'user-2', 'INDIVIDUAL')).toBe(false);
    });
  });

  describe('PartnerDomain', () => {
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

    it('enforces partner verification state transitions', () => {
      expect(PartnerDomain.isValidStatusTransition('APPLIED', 'VERIFIED')).toBe(true);
      expect(PartnerDomain.isValidStatusTransition('APPLIED', 'REJECTED')).toBe(true);
      expect(PartnerDomain.isValidStatusTransition('VERIFIED', 'APPLIED')).toBe(false);
    });
  });

  describe('WalletDomain', () => {
    it('calculates balance ignoring invalid amounts', () => {
      const txns = [
        { amount: '100.50', status: 'VERIFIED' },
        { amount: '50.25', status: 'PENDING' },
        { amount: 'invalid', status: 'VERIFIED' },
      ];
      const summary = WalletDomain.calculateBalance(txns);
      expect(summary).toEqual({ verified: 100.5, pending: 50.25 });
    });

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
});
