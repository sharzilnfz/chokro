import { dropZoneRepo } from '../lib/repos/dropZones';
import { walletRepo } from '../lib/repos/wallet';
import { resetTestStore } from './test-utils';

describe('Worker 3 Repositories (dropZoneRepo & walletRepo)', () => {
  beforeEach(resetTestStore);

  describe('dropZoneRepo', () => {
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

      const resolved = await dropZoneRepo.resolveByLocation(23.8103, 90.4125);
      expect(resolved).toBeDefined();
      expect(resolved?.id).toBe(created.id);
    });
  });

  describe('walletRepo', () => {
    it('creates adjustment transaction and finds transactions by owner', async () => {
      const userId = '00000000-0000-0000-0000-000000000001';
      const adjustment = await walletRepo.createAdjustmentTransaction({
        userId,
        amount: 250,
        reason: 'Bonus credits',
      });

      expect(adjustment.id).toBeDefined();
      expect(adjustment.user_id).toBe(userId);
      expect(adjustment.amount).toBe('250');
      expect(adjustment.kind).toBe('ADJUST');

      const ownerTxns = await walletRepo.findTransactionsByOwner(userId);
      expect(ownerTxns).toHaveLength(1);
      expect(ownerTxns[0].id).toBe(adjustment.id);
    });
  });
});
