import { db, users, partners, partnerComplianceAudits, kycExtractions } from '../index';
import { and, eq } from 'drizzle-orm';
// Seed scenario section 16 — moved verbatim from the original seed().
import type { SeedContext } from './context';

export async function run(ctx: SeedContext): Promise<void> {
  const { adminOrgUser } = ctx.users;
  const { partnerApplicant, partnerCollector2, partnerDhakaRecycler } = ctx.partners;

  // =========================================================================
  // 16. SCENARIO 6: PARTNER KYC OCR ADJUDICATION WORKLIST
  // =========================================================================
  // Extraction 1 (SCENARIO 6: DoE certificate extraction ready for admin approval)
  const [existingKyc1] = await db
    .select()
    .from(kycExtractions)
    .where(and(eq(kycExtractions.partner_id, partnerApplicant.id), eq(kycExtractions.document_type, 'DOE_EWASTE_PERMIT')))
    .limit(1);
  if (existingKyc1) {
    await db
      .update(kycExtractions)
      .set({
        extracted_expiry_date: new Date(Date.now() + 500 * 86400_000),
        match_status: 'EXACT_MATCH',
        adjudicated_by: null,
      })
      .where(eq(kycExtractions.id, existingKyc1.id));
  } else {
    await db.insert(kycExtractions).values({
      partner_id: partnerApplicant.id,
      document_url: 'https://documents.chokro.org/kyc/bengal-doe-permit-2026.pdf',
      document_type: 'DOE_EWASTE_PERMIT',
      ocr_provider: 'GOOGLE_VISION',
      raw_extracted_text: `GOVERNMENT OF THE PEOPLE'S REPUBLIC OF BANGLADESH
DEPARTMENT OF ENVIRONMENT
E-WASTE MANAGEMENT PERMIT
Certificate No: DOE/E-WASTE/2026/0418
Holder: Bengal Recyclers Ltd
Issue Date: 15-JAN-2026
Expiry Date: 14-JAN-2028
Authorized Facility: Plot 44, Tejgaon I/A, Dhaka`,
      extracted_org_name: 'Bengal Recyclers Ltd',
      extracted_license_number: 'DOE/E-WASTE/2026/0418',
      extracted_expiry_date: new Date(Date.now() + 500 * 86400_000),
      confidence_score: '0.98',
      match_status: 'EXACT_MATCH',
      mismatched_fields: [],
      is_expired: false,
      adjudicated_by: null,
    });
  }

  // Extraction 2 (Flagged extraction with mismatched trade license number)
  const [existingKyc2] = await db
    .select()
    .from(kycExtractions)
    .where(and(eq(kycExtractions.partner_id, partnerCollector2.id), eq(kycExtractions.document_type, 'TRADE_LICENSE')))
    .limit(1);
  if (!existingKyc2) {
    await db.insert(kycExtractions).values({
      partner_id: partnerCollector2.id,
      document_url: 'https://documents.chokro.org/kyc/savar-trade-license.pdf',
      document_type: 'TRADE_LICENSE',
      ocr_provider: 'GOOGLE_VISION',
      raw_extracted_text: `DHAKA NORTH CITY CORPORATION
TRADE LICENSE
License No: TRAD/DNCC/092144/2024
Business: Savar Cargo Logistics`,
      extracted_org_name: 'Savar Cargo Logistics',
      extracted_license_number: 'TRAD/DNCC/092144/2024',
      extracted_expiry_date: new Date(Date.now() + 180 * 86400_000),
      confidence_score: '0.74',
      match_status: 'MISMATCH',
      mismatched_fields: ['extracted_license_number'],
      is_expired: false,
    });
  }

  // Extraction 3 (Verified DoE permit for Dhaka Green Recyclers)
  const [existingKyc3] = await db
    .select()
    .from(kycExtractions)
    .where(and(eq(kycExtractions.partner_id, partnerDhakaRecycler.id), eq(kycExtractions.document_type, 'DOE_EWASTE_PERMIT')))
    .limit(1);
  let kyc3: typeof kycExtractions.$inferSelect;
  if (existingKyc3) {
    kyc3 = existingKyc3;
  } else {
    const [inserted] = await db
      .insert(kycExtractions)
      .values({
        partner_id: partnerDhakaRecycler.id,
        document_url: 'https://documents.chokro.org/kyc/dhaka-green-doe.pdf',
        document_type: 'DOE_EWASTE_PERMIT',
        ocr_provider: 'GOOGLE_VISION',
        extracted_org_name: 'Dhaka Green Recyclers',
        extracted_license_number: 'DOE/E-WASTE/2024/091',
        extracted_expiry_date: new Date(Date.now() + 300 * 86400_000),
        confidence_score: '0.99',
        match_status: 'EXACT_MATCH',
        mismatched_fields: [],
        is_expired: false,
        adjudicated_by: adminOrgUser.id,
        adjudicated_at: new Date(Date.now() - 7 * 86400_000),
        adjudication_notes: 'Verified valid DoE hazardous scrap processing permit #DOE/E-WASTE/2024/091',
      })
      .returning();
    kyc3 = inserted;

    await db.insert(partnerComplianceAudits).values({
      partner_id: partnerDhakaRecycler.id,
      extraction_id: kyc3.id,
      previous_status: 'APPLIED',
      new_status: 'VERIFIED',
      granted_capabilities: { collects: true, buys: true, e_waste_licensed: true },
      actor_id: adminOrgUser.id,
      reason: 'Verified valid DoE hazardous scrap processing permit #DOE/E-WASTE/2024/091',
    });
  }

}
