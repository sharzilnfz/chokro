// kycExtractions repository: persistence for OCR extraction results, entity parsing, and verification flags.
import { db, kycExtractions, partners, eq, desc } from '@chokro/db';
import { withDb } from './seam';

export type KycExtraction = typeof kycExtractions.$inferSelect;

export interface CreateKycExtractionInput {
  partner_id: string;
  document_url: string;
  document_type: string;
  ocr_provider?: string;
  raw_extracted_text?: string | null;
  extracted_org_name?: string | null;
  extracted_license_number?: string | null;
  extracted_expiry_date?: Date | null;
  confidence_score: number | string;
  match_status?: string;
  mismatched_fields?: string[];
  is_expired?: boolean;
  adjudicated_by?: string | null;
  adjudicated_at?: Date | null;
  adjudication_notes?: string | null;
}

export const kycExtractionsRepo = {
  async create(input: CreateKycExtractionInput): Promise<KycExtraction> {
    return withDb(async () => {
      const [record] = await db
        .insert(kycExtractions)
        .values({
          partner_id: input.partner_id,
          document_url: input.document_url,
          document_type: input.document_type,
          ocr_provider: input.ocr_provider || 'GOOGLE_VISION',
          raw_extracted_text: input.raw_extracted_text || null,
          extracted_org_name: input.extracted_org_name || null,
          extracted_license_number: input.extracted_license_number || null,
          extracted_expiry_date: input.extracted_expiry_date || null,
          confidence_score: String(input.confidence_score),
          match_status: input.match_status || 'PENDING_MATCH',
          mismatched_fields: input.mismatched_fields || [],
          is_expired: Boolean(input.is_expired),
          adjudicated_by: input.adjudicated_by || null,
          adjudicated_at: input.adjudicated_at || null,
          adjudication_notes: input.adjudication_notes || null,
        })
        .returning();
      return record;
    });
  },

  async findById(id: string): Promise<KycExtraction | null> {
    return withDb(async () => {
      const [record] = await db
        .select()
        .from(kycExtractions)
        .where(eq(kycExtractions.id, id))
        .limit(1);
      return record || null;
    });
  },

  async findByPartnerId(partnerId: string): Promise<KycExtraction[]> {
    return withDb(async () => {
      return db
        .select()
        .from(kycExtractions)
        .where(eq(kycExtractions.partner_id, partnerId))
        .orderBy(desc(kycExtractions.created_at));
    });
  },

  async findLatestByPartnerId(partnerId: string): Promise<KycExtraction | null> {
    return withDb(async () => {
      const [record] = await db
        .select()
        .from(kycExtractions)
        .where(eq(kycExtractions.partner_id, partnerId))
        .orderBy(desc(kycExtractions.created_at))
        .limit(1);
      return record || null;
    });
  },

  async findQueue(status?: string): Promise<{ extraction: KycExtraction; partner: typeof partners.$inferSelect }[]> {
    return withDb(async () => {
      const rows = await db
        .select({
          extraction: kycExtractions,
          partner: partners,
        })
        .from(kycExtractions)
        .innerJoin(partners, eq(kycExtractions.partner_id, partners.id))
        .orderBy(desc(kycExtractions.created_at));

      if (!status || status === 'ALL') {
        return rows;
      }
      return rows.filter((r) => r.extraction.match_status === status);
    });
  },

  async updateAdjudication(
    id: string,
    data: {
      adjudicated_by: string;
      adjudicated_at: Date;
      adjudication_notes?: string | null;
      match_status?: string;
    }
  ): Promise<KycExtraction | null> {
    return withDb(async () => {
      const updatePayload: Record<string, unknown> = {
        adjudicated_by: data.adjudicated_by,
        adjudicated_at: data.adjudicated_at,
        adjudication_notes: data.adjudication_notes ?? null,
      };
      if (data.match_status) {
        updatePayload.match_status = data.match_status;
      }
      const [updated] = await db
        .update(kycExtractions)
        .set(updatePayload)
        .where(eq(kycExtractions.id, id))
        .returning();
      return updated || null;
    });
  },
};
