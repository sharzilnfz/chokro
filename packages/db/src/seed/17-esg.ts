import { db, users, campuses, impactRecords, institutionAccounts, sustainabilityCertificates, sponsorshipPools } from '../index';
import { eq } from 'drizzle-orm';
// Seed scenario section 17 — moved verbatim from the original seed().
import type { SeedContext } from './context';

export async function run(ctx: SeedContext): Promise<void> {
  const { bracuCampus } = ctx.campuses;
  const { student1User } = ctx.users;
  const { deposit4 } = ctx.deposits;
  const { decision1 } = ctx.decisions;

  // =========================================================================
  // 17. SCENARIO 7: INSTITUTIONAL ESG CERTIFICATES & SPONSORSHIP POOLS
  // =========================================================================
  // Institution Account for BRACU
  const [existingInstAccount] = await db
    .select()
    .from(institutionAccounts)
    .where(eq(institutionAccounts.campus_id, bracuCampus.id))
    .limit(1);
  if (existingInstAccount) {
    await db
      .update(institutionAccounts)
      .set({ total_diverted_kg: '1420.00' })
      .where(eq(institutionAccounts.id, existingInstAccount.id));
  } else {
    await db.insert(institutionAccounts).values({
      campus_id: bracuCampus.id,
      invite_code: 'BRACU2026',
      contact_email: 'sustainability@bracu.ac.bd',
      total_diverted_kg: '1420.00',
    });
  }

  // Sponsorship Pool for BRACU
  const [existingPool] = await db
    .select()
    .from(sponsorshipPools)
    .where(eq(sponsorshipPools.institution_id, bracuCampus.id))
    .limit(1);
  if (!existingPool) {
    await db.insert(sponsorshipPools).values({
      institution_id: bracuCampus.id,
      total_budget_bdt: '100000.00',
      remaining_budget_bdt: '76500.00',
      monthly_draw_cap_bdt: '25000.00',
    });
  }

  // Impact Records totaling 1,420kg (2.45 Tons CO2e avoided)
  const impactSpecs = [
    { custodyType: 'DEPOSIT', custodyId: deposit4.id, cat: 'PLASTICS', path: 'RECYCLE', mass: '520.00', co2e: '754.000' },
    { custodyType: 'DEPOSIT', custodyId: 'CUST-BRACU-IMP-02', cat: 'PAPER', path: 'RECYCLE', mass: '450.00', co2e: '427.500' },
    { custodyType: 'PICKUP', custodyId: 'CUST-BRACU-IMP-03', cat: 'METAL', path: 'RECYCLE', mass: '300.00', co2e: '855.000' },
    { custodyType: 'DEPOSIT', custodyId: 'CUST-BRACU-IMP-04', cat: 'E_WASTE', path: 'RECYCLE', mass: '150.00', co2e: '413.500' },
  ];

  const coveredRecordIds: string[] = [];
  for (const item of impactSpecs) {
    const [existingImpact] = await db
      .select()
      .from(impactRecords)
      .where(eq(impactRecords.custody_id, item.custodyId))
      .limit(1);

    if (existingImpact) {
      coveredRecordIds.push(existingImpact.id);
    } else {
      const [inserted] = await db
        .insert(impactRecords)
        .values({
          custody_type: item.custodyType,
          custody_id: item.custodyId,
          trust_decision_id: decision1.id,
          user_id: student1User.id,
          institution_id: bracuCampus.id,
          category: item.cat,
          next_life_path: item.path,
          mass_kg: item.mass,
          avoided_co2e_kg: item.co2e,
          factor_version: 'v2026.1',
        })
        .returning();
      coveredRecordIds.push(inserted.id);
    }
  }

  // Official Sustainability Certificate (Ref: CERT-BRACU-2026-Q1)
  const [existingCert] = await db
    .select()
    .from(sustainabilityCertificates)
    .where(eq(sustainabilityCertificates.certificate_ref, 'CERT-BRACU-2026-Q1'))
    .limit(1);

  if (existingCert) {
    await db
      .update(sustainabilityCertificates)
      .set({
        period_start: new Date(Date.now() - 90 * 86400_000),
        period_end: new Date(Date.now()),
        total_mass_kg: '1420.00',
        total_co2e_kg: '2450.000',
        covered_record_ids: coveredRecordIds,
        issued_at: new Date(Date.now() - 2 * 86400_000),
      })
      .where(eq(sustainabilityCertificates.id, existingCert.id));
  } else {
    await db.insert(sustainabilityCertificates).values({
      institution_id: bracuCampus.id,
      certificate_ref: 'CERT-BRACU-2026-Q1',
      period_start: new Date(Date.now() - 90 * 86400_000),
      period_end: new Date(Date.now()),
      total_mass_kg: '1420.00',
      total_co2e_kg: '2450.000',
      covered_record_ids: coveredRecordIds,
      signature_hash: 'a7f93b58c42e19d6e4b901fc88e912ab564c78d910ef2356bc0147823f99a812',
      issued_at: new Date(Date.now() - 2 * 86400_000),
    });
  }

}
