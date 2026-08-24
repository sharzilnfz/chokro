// Covers the shared response DTOs: feed page, wallet balance, credit transaction,
// and admin rate-card row schemas parse the exact shapes the API routes return.
import {
  FeedPageSchema,
  BalanceSummarySchema,
  CreditTransactionDtoSchema,
  RateCardRowSchema,
  CampusListResponseSchema,
} from '@chokro/shared';

describe('response DTOs', () => {
  // A feed page as produced by GET /api/feed (findPublished select + saved flag).
  it('parses a real feed-page payload', () => {
    const page = FeedPageSchema.parse({
      items: [
        {
          id: '00000000-0000-0000-0000-000000000001',
          owner_id: '00000000-0000-0000-0000-000000000002',
          category: 'BOOKS',
          unit: 'kg',
          declared_weight: '1.00',
          piece_count: null,
          declared_condition: 'GOOD',
          price_bdt: '50.00',
          photos: [],
          status: 'ACTIVE',
          lat: 23.7461,
          lng: 90.3742,
          thana: 'Dhanmondi',
          zilla: 'Dhaka',
          distance_km: null,
          created_at: new Date('2026-08-06T12:00:00Z').toISOString(),
          seller_email: 'seller@test.chokro.org',
          saved: false,
        },
      ],
      nextCursor: null,
    });
    expect(page.items).toHaveLength(1);
    expect(page.items[0].saved).toBe(false);
    expect(page.nextCursor).toBeNull();
  });

  // Balance summary from GET /api/wallet/balance.
  it('parses a balance summary', () => {
    const balance = BalanceSummarySchema.parse({ verified: 150, pending: 25.5 });
    expect(balance.verified).toBe(150);
    expect(balance.pending).toBe(25.5);
  });

  // One credit-ledger row from GET /api/wallet/transactions.
  it('parses a credit transaction', () => {
    const txn = CreditTransactionDtoSchema.parse({
      id: '00000000-0000-0000-0000-000000000003',
      amount: '150.00',
      kind: 'ADJUST',
      status: 'VERIFIED',
      source_id: null,
      reason: 'Pilot campaign adjustment',
      created_at: new Date('2026-08-06T12:00:00Z').toISOString(),
    });
    expect(txn.amount).toBe('150.00');
    expect(txn.kind).toBe('ADJUST');
  });

  // Admin rate-card row from GET /api/admin/rate-card, plus the campus list envelope.
  it('parses an admin rate-card row and campus envelope', () => {
    const entry = RateCardRowSchema.parse({
      id: '00000000-0000-0000-0000-000000000004',
      category: 'PLASTICS',
      condition_band: 'GOOD',
      unit: 'kg',
      price_bdt: '50.00',
      effective_from: new Date('2026-08-06T12:00:00Z').toISOString(),
      updated_by: null,
    });
    expect(entry.unit).toBe('kg');
    expect(CampusListResponseSchema.parse({ campuses: [] }).campuses).toEqual([]);
  });
});
