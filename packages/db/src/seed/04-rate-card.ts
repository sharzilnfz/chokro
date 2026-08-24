import { db, users, rateCardEntries } from '../index';
import { and, eq } from 'drizzle-orm';
// Seed scenario section 04 — moved verbatim from the original seed().
import type { SeedContext } from './context';

export async function run(ctx: SeedContext): Promise<void> {
  const { adminOrgUser } = ctx.users;

  // =========================================================================
  // 4. RATE CARD (All 36 entries: 9 categories × 4 condition bands)
  // =========================================================================
  const allCategories = [
    'PLASTICS',
    'METAL',
    'PAPER',
    'GLASS',
    'E_WASTE',
    'CLOTHES',
    'BOOKS',
    'FURNITURE',
    'APPLIANCES',
  ] as const;

  const conditionMatrix: Record<
    (typeof allCategories)[number],
    { unit: 'kg' | 'piece'; rates: Record<'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR', string> }
  > = {
    PLASTICS: { unit: 'kg', rates: { EXCELLENT: '55.00', GOOD: '45.00', FAIR: '35.00', POOR: '20.00' } },
    METAL: { unit: 'kg', rates: { EXCELLENT: '140.00', GOOD: '110.00', FAIR: '80.00', POOR: '50.00' } },
    PAPER: { unit: 'kg', rates: { EXCELLENT: '32.00', GOOD: '25.00', FAIR: '18.00', POOR: '10.00' } },
    GLASS: { unit: 'kg', rates: { EXCELLENT: '24.00', GOOD: '18.00', FAIR: '12.00', POOR: '6.00' } },
    E_WASTE: { unit: 'piece', rates: { EXCELLENT: '350.00', GOOD: '250.00', FAIR: '150.00', POOR: '75.00' } },
    CLOTHES: { unit: 'kg', rates: { EXCELLENT: '45.00', GOOD: '30.00', FAIR: '20.00', POOR: '10.00' } },
    BOOKS: { unit: 'kg', rates: { EXCELLENT: '50.00', GOOD: '35.00', FAIR: '22.00', POOR: '12.00' } },
    FURNITURE: { unit: 'kg', rates: { EXCELLENT: '130.00', GOOD: '95.00', FAIR: '60.00', POOR: '30.00' } },
    APPLIANCES: { unit: 'piece', rates: { EXCELLENT: '750.00', GOOD: '500.00', FAIR: '300.00', POOR: '150.00' } },
  };

  const seededRateMap = new Map<string, typeof rateCardEntries.$inferSelect>();
  for (const cat of allCategories) {
    const config = conditionMatrix[cat];
    for (const [cond, price] of Object.entries(config.rates)) {
      const [existingRate] = await db
        .select()
        .from(rateCardEntries)
        .where(
          and(
            eq(rateCardEntries.category, cat),
            eq(rateCardEntries.condition_band, cond),
            eq(rateCardEntries.unit, config.unit)
          )
        )
        .limit(1);

      if (existingRate) {
        const [updated] = await db
          .update(rateCardEntries)
          .set({ price_bdt: price, effective_from: new Date(Date.now() - 3600000) })
          .where(eq(rateCardEntries.id, existingRate.id))
          .returning();
        seededRateMap.set(`${cat}:${cond}`, updated);
      } else {
        const [inserted] = await db
          .insert(rateCardEntries)
          .values({
            category: cat,
            condition_band: cond,
            unit: config.unit,
            price_bdt: price,
            effective_from: new Date(Date.now() - 3600000),
            updated_by: adminOrgUser.id,
          })
          .returning();
        seededRateMap.set(`${cat}:${cond}`, inserted);
      }
    }
  }

  ctx.seededRateMap = seededRateMap;
}
