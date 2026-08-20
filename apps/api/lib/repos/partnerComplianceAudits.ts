// partnerComplianceAudits repository: immutable compliance and capability audit log.
import { db, partnerComplianceAudits, eq, desc } from '@chokro/db';
import { withDb } from './seam';

export type PartnerComplianceAudit = typeof partnerComplianceAudits.$inferSelect;

export interface CreatePartnerComplianceAuditInput {
  partner_id: string;
  extraction_id?: string | null;
  previous_status: string;
  new_status: string;
  granted_capabilities?: Record<string, unknown>;
  actor_id: string;
  reason: string;
}

export const partnerComplianceAuditsRepo = {
  async create(input: CreatePartnerComplianceAuditInput): Promise<PartnerComplianceAudit> {
    return withDb(async () => {
      const [audit] = await db
        .insert(partnerComplianceAudits)
        .values({
          partner_id: input.partner_id,
          extraction_id: input.extraction_id || null,
          previous_status: input.previous_status,
          new_status: input.new_status,
          granted_capabilities: input.granted_capabilities || {},
          actor_id: input.actor_id,
          reason: input.reason,
        })
        .returning();
      return audit;
    });
  },

  async findByPartnerId(partnerId: string): Promise<PartnerComplianceAudit[]> {
    return withDb(async () => {
      return db
        .select()
        .from(partnerComplianceAudits)
        .where(eq(partnerComplianceAudits.partner_id, partnerId))
        .orderBy(desc(partnerComplianceAudits.created_at));
    });
  },

  async findAll(limit = 50): Promise<PartnerComplianceAudit[]> {
    return withDb(async () => {
      return db
        .select()
        .from(partnerComplianceAudits)
        .orderBy(desc(partnerComplianceAudits.created_at))
        .limit(limit);
    });
  },
};
