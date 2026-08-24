import { db, emissionFactors } from '../index';
import { and, eq } from 'drizzle-orm';
// Seed scenario section 06 — moved verbatim from the original seed().
import type { SeedContext } from './context';

export async function run(ctx: SeedContext): Promise<void> {
  // =========================================================================
  // 6. EMISSION FACTORS (Baseline Carbon Avoidance Factors)
  // =========================================================================
  const baselineEmissionFactors = [
    { category: 'PLASTICS', next_life_path: 'RECYCLE', factor_co2e_per_kg: '1.4500', range_low: '1.2000', range_high: '1.7000', source: 'ISO 14044 / DEFRA 2024', version: 'v2026.1' },
    { category: 'PAPER', next_life_path: 'RECYCLE', factor_co2e_per_kg: '0.9500', range_low: '0.8000', range_high: '1.1000', source: 'ISO 14044 / EPA WARM v15', version: 'v2026.1' },
    { category: 'METAL', next_life_path: 'RECYCLE', factor_co2e_per_kg: '2.8500', range_low: '2.4000', range_high: '3.3000', source: 'Birkenhead Life-Cycle / WorldSteel', version: 'v2026.1' },
    { category: 'GLASS', next_life_path: 'RECYCLE', factor_co2e_per_kg: '0.3150', range_low: '0.2500', range_high: '0.3800', source: 'FEVE European Container Glass', version: 'v2026.1' },
    { category: 'E_WASTE', next_life_path: 'RECYCLE', factor_co2e_per_kg: '8.2000', range_low: '6.5000', range_high: '10.0000', source: 'UNEP Global E-Waste Monitor', version: 'v2026.1' },
    { category: 'CLOTHES', next_life_path: 'REUSE', factor_co2e_per_kg: '3.2000', range_low: '2.8000', range_high: '3.6000', source: 'WRAP UK Textile Reuse Index', version: 'v2026.1' },
    { category: 'BOOKS', next_life_path: 'REUSE', factor_co2e_per_kg: '1.1000', range_low: '0.9000', range_high: '1.3000', source: 'EPA Paper & Pulp Reuse Model', version: 'v2026.1' },
    { category: 'FURNITURE', next_life_path: 'REPAIR', factor_co2e_per_kg: '2.1000', range_low: '1.8000', range_high: '2.5000', source: 'Circular Economy Timber Model', version: 'v2026.1' },
    { category: 'APPLIANCES', next_life_path: 'RESELL', factor_co2e_per_kg: '15.5000', range_low: '12.0000', range_high: '19.0000', source: 'IEA Domestic Appliance Lifecycle', version: 'v2026.1' },
  ];

  for (const factor of baselineEmissionFactors) {
    const [existing] = await db
      .select()
      .from(emissionFactors)
      .where(and(eq(emissionFactors.category, factor.category), eq(emissionFactors.next_life_path, factor.next_life_path)))
      .limit(1);

    if (existing) {
      await db.update(emissionFactors).set(factor).where(eq(emissionFactors.id, existing.id));
    } else {
      await db.insert(emissionFactors).values({
        ...factor,
        effective_from: new Date(Date.now() - 30 * 86400_000),
      });
    }
  }

}
