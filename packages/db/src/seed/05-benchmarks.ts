import { db, rateBenchmarks } from '../index';
import { eq } from 'drizzle-orm';
// Seed scenario section 05 — moved verbatim from the original seed().
import type { SeedContext } from './context';

export async function run(ctx: SeedContext): Promise<void> {
  // =========================================================================
  // 5. COMMODITY BENCHMARKS (9 categories)
  // =========================================================================
  const seedBenchmarks = [
    { category: 'METAL', commodity_symbol: 'LME-SCRAP-METAL', global_price_usd: '0.95', fx_rate_usd_bdt: '122.50', benchmark_bdt: '116.38', source: 'LME Scrap Metal Composite' },
    { category: 'PLASTICS', commodity_symbol: 'PET-PLASTIC-IDX', global_price_usd: '0.38', fx_rate_usd_bdt: '122.50', benchmark_bdt: '46.55', source: 'Global Polyethylene/PET Index' },
    { category: 'PAPER', commodity_symbol: 'PULP-PAPER-IDX', global_price_usd: '0.22', fx_rate_usd_bdt: '122.50', benchmark_bdt: '26.95', source: 'Global Recovered Paper Index' },
    { category: 'GLASS', commodity_symbol: 'CULLET-GLASS-IDX', global_price_usd: '0.15', fx_rate_usd_bdt: '122.50', benchmark_bdt: '18.38', source: 'Cullet Glass Composite' },
    { category: 'E_WASTE', commodity_symbol: 'EWASTE-PCB-METALS', global_price_usd: '2.10', fx_rate_usd_bdt: '122.50', benchmark_bdt: '257.25', source: 'Precious E-Waste Scrap Index' },
    { category: 'CLOTHES', commodity_symbol: 'TEXTILE-RECYCLE', global_price_usd: '0.28', fx_rate_usd_bdt: '122.50', benchmark_bdt: '34.30', source: 'Global Recycled Textile Feed' },
    { category: 'BOOKS', commodity_symbol: 'PRINT-PAPER-PULP', global_price_usd: '0.25', fx_rate_usd_bdt: '122.50', benchmark_bdt: '30.63', source: 'Recovered Print Pulp Feed' },
    { category: 'FURNITURE', commodity_symbol: 'WOOD-COMPOSITE', global_price_usd: '0.80', fx_rate_usd_bdt: '122.50', benchmark_bdt: '98.00', source: 'Reclaimed Timber & Furniture Index' },
    { category: 'APPLIANCES', commodity_symbol: 'APPLIANCE-SCRAP', global_price_usd: '4.50', fx_rate_usd_bdt: '122.50', benchmark_bdt: '551.25', source: 'Major Appliance Recovery Feed' },
  ];

  for (const bm of seedBenchmarks) {
    const [existingBm] = await db.select().from(rateBenchmarks).where(eq(rateBenchmarks.category, bm.category)).limit(1);
    if (existingBm) {
      await db.update(rateBenchmarks).set(bm).where(eq(rateBenchmarks.id, existingBm.id));
    } else {
      await db.insert(rateBenchmarks).values(bm);
    }
  }

}
