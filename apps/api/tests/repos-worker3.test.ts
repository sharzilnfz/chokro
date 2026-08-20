// Repository-layer tests for worker 3 modules: drop zones and the wallet ledger.
import { dropZoneRepo } from '../lib/repos/dropZones';
import { walletRepo } from '../lib/repos/wallet';
import { createTestUser, resetTestStore } from './test-utils';

// Both repos cover their create/query contracts end to end.
describe('Worker 3 Repositories (dropZoneRepo & walletRepo)', () => {
  // Reset store before each case.
  beforeEach(async () => {
    await resetTestStore();
  });

  // Drop-zone repo: create, lookup, list-all, and resolution all round-trip a zone.
  describe('dropZoneRepo', () => {
    // Full CRUD-ish round trip for a drop zone in one flow.
    it('creates, finds by id, lists all, and resolves by location', async () => {
      const created = await dropZoneRepo.create({
        institutionId: 'INST-1',
        name: 'Library Zone',
        acceptedCategories: ['PLASTICS', 'PAPER'],
        geoLocation: { lat: 23.8103, lng: 90.4125 },
      });

      expect(created.id).toBeDefined();
      expect(created.name).toBe('Library Zone');

      const found = await dropZoneRepo.findById(created.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);

      const all = await dropZoneRepo.findAll();
      expect(all).toHaveLength(1);

      const resolved = await dropZoneRepo.resolveByLocation();
      expect(resolved).toBeDefined();
      expect(resolved?.id).toBe(created.id);
    });
  });

  // Wallet repo: adjustment inserts and owner-scoped queries return consistent rows.
  describe('walletRepo', () => {
    // An adjustment lands in the ledger and is visible to its owner.
    it('creates adjustment transaction and finds transactions by owner', async () => {
      const user = await createTestUser();
      const adjustment = await walletRepo.createAdjustmentTransaction({
        userId: user.id,
        amount: 250,
        reason: 'Bonus credits',
      });

      expect(adjustment.id).toBeDefined();
      expect(adjustment.user_id).toBe(user.id);
      expect(adjustment.amount).toBe('250.00');
      expect(adjustment.kind).toBe('ADJUST');

      const ownerTxns = await walletRepo.findTransactionsByOwner(user.id);
      expect(ownerTxns).toHaveLength(1);
      expect(ownerTxns[0].id).toBe(adjustment.id);
    });
  });
});
