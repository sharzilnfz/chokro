import { db, valuationScans, eq, desc } from '@chokro/db';
import { withDb } from './seam';

export type ValuationScan = typeof valuationScans.$inferSelect;

export interface CreateValuationScanInput {
  user_id?: string | null;
  image_url?: string | null;
  detected_category: string;
  detected_condition: string;
  estimated_quantity: number | string;
  unit: string;
  next_life_path: string;
  is_ewaste_hazard?: boolean;
  confidence: number | string;
  estimated_value_bdt: number | string;
  reasoning_rationale: string;
  suggested_action?: string | null;
}

export const valuationScansRepo = {
  async createScan(input: CreateValuationScanInput): Promise<ValuationScan> {
    return withDb(async () => {
      const [scan] = await db
        .insert(valuationScans)
        .values({
          user_id: input.user_id || null,
          image_url: input.image_url || null,
          detected_category: input.detected_category,
          detected_condition: input.detected_condition,
          estimated_quantity: String(input.estimated_quantity),
          unit: input.unit,
          next_life_path: input.next_life_path,
          is_ewaste_hazard: Boolean(input.is_ewaste_hazard),
          confidence: String(input.confidence),
          estimated_value_bdt: String(input.estimated_value_bdt),
          reasoning_rationale: input.reasoning_rationale,
          suggested_action: input.suggested_action || null,
        })
        .returning();
      return scan;
    });
  },

  async findById(id: string): Promise<ValuationScan | null> {
    return withDb(async () => {
      const [scan] = await db
        .select()
        .from(valuationScans)
        .where(eq(valuationScans.id, id))
        .limit(1);
      return scan || null;
    });
  },

  async findRecent(limit = 20): Promise<ValuationScan[]> {
    return withDb(async () => {
      return db
        .select()
        .from(valuationScans)
        .orderBy(desc(valuationScans.created_at))
        .limit(limit);
    });
  },

  async findByUserId(userId: string, limit = 20): Promise<ValuationScan[]> {
    return withDb(async () => {
      return db
        .select()
        .from(valuationScans)
        .where(eq(valuationScans.user_id, userId))
        .orderBy(desc(valuationScans.created_at))
        .limit(limit);
    });
  },
};
