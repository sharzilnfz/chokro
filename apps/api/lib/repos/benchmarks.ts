import { db, rateBenchmarks, eq, desc } from '@chokro/db';
import { withDb } from './seam';

export type RateBenchmark = typeof rateBenchmarks.$inferSelect;

export interface UpsertBenchmarkInput {
  category: string;
  commodity_symbol: string;
  global_price_usd: number | string;
  fx_rate_usd_bdt?: number | string;
  benchmark_bdt: number | string;
  source?: string;
}

export const benchmarksRepo = {
  async findAll(): Promise<RateBenchmark[]> {
    return withDb(async () => {
      return db
        .select()
        .from(rateBenchmarks)
        .orderBy(desc(rateBenchmarks.updated_at));
    });
  },

  async findByCategory(category: string): Promise<RateBenchmark | null> {
    return withDb(async () => {
      const [entry] = await db
        .select()
        .from(rateBenchmarks)
        .where(eq(rateBenchmarks.category, category))
        .limit(1);
      return entry || null;
    });
  },

  async upsert(input: UpsertBenchmarkInput): Promise<RateBenchmark> {
    return withDb(async () => {
      const existing = await benchmarksRepo.findByCategory(input.category);
      if (existing) {
        const [updated] = await db
          .update(rateBenchmarks)
          .set({
            commodity_symbol: input.commodity_symbol,
            global_price_usd: String(input.global_price_usd),
            fx_rate_usd_bdt: String(input.fx_rate_usd_bdt ?? '122.50'),
            benchmark_bdt: String(input.benchmark_bdt),
            source: input.source || 'Metals-API / Commodity Index Feed',
            updated_at: new Date(),
          })
          .where(eq(rateBenchmarks.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await db
        .insert(rateBenchmarks)
        .values({
          category: input.category,
          commodity_symbol: input.commodity_symbol,
          global_price_usd: String(input.global_price_usd),
          fx_rate_usd_bdt: String(input.fx_rate_usd_bdt ?? '122.50'),
          benchmark_bdt: String(input.benchmark_bdt),
          source: input.source || 'Metals-API / Commodity Index Feed',
          updated_at: new Date(),
        })
        .returning();
      return created;
    });
  },
};
