import { db, users, dropSessions, depositRecords, trustThresholdConfigs, trustDecisions, fraudFlags, evidenceHashes, decisionContests } from '../index';
import { and, eq } from 'drizzle-orm';
// Seed scenario section 13 — moved verbatim from the original seed().
import type { SeedContext } from './context';

export async function run(ctx: SeedContext): Promise<void> {
  const { adminOrgUser, student1User, student2User, normalUser, collector2User } = ctx.users;
  const { bracuZone, buetZone } = ctx.zones;
  const { pickupOrder3 } = ctx.pickupOrders;
  const seededRateMap = ctx.seededRateMap;

  // =========================================================================
  // 13. TRUST GATE, THRESHOLDS, SCENARIO 3 & ESCALATION WORKLIST
  // =========================================================================
  // Dynamic Trust Threshold Config
  const [existingConfig] = await db.select().from(trustThresholdConfigs).limit(1);
  if (!existingConfig) {
    await db.insert(trustThresholdConfigs).values({
      config_json: {
        phash_hamming_distance_threshold: 5,
        geofence_radius_meters: 500,
        quantity_divergence_tolerance_ratio: 0.20,
        user_daily_deposit_velocity_cap: 10,
        user_daily_credit_velocity_bdt: 5000,
        partner_daily_confirmation_velocity_cap: 50,
        max_consecutive_identical_pairings: 5,
        young_account_days_threshold: 7,
        young_account_max_claim_bdt: 1000,
        flag_threshold_for_suspension: 3,
        audit_sample_rate_percentage: 10,
      },
      effective_from: new Date(Date.now() - 30 * 86400_000),
      updated_by: adminOrgUser.id,
    });
  }

  // Active Drop Sessions
  // Session 1: Active Open session (expires in 12 minutes)
  const [existingSession1] = await db
    .select()
    .from(dropSessions)
    .where(eq(dropSessions.session_secret, 'sec-bracu-open-01'))
    .limit(1);
  if (existingSession1) {
    await db
      .update(dropSessions)
      .set({ status: 'OPEN', expires_at: new Date(Date.now() + 12 * 60_000) })
      .where(eq(dropSessions.id, existingSession1.id));
  } else {
    await db.insert(dropSessions).values({
      zone_id: bracuZone.id,
      user_id: student1User.id,
      session_secret: 'sec-bracu-open-01',
      short_code: '7392',
      status: 'OPEN',
      expires_at: new Date(Date.now() + 12 * 60_000),
    });
  }

  // Session 2: Consumed session for SCENARIO 2 (Pending Deposit)
  const [existingSession2] = await db
    .select()
    .from(dropSessions)
    .where(eq(dropSessions.session_secret, 'sec-bracu-pending-02'))
    .limit(1);
  let session2: typeof dropSessions.$inferSelect;
  if (existingSession2) {
    session2 = existingSession2;
  } else {
    const [inserted] = await db
      .insert(dropSessions)
      .values({
        zone_id: bracuZone.id,
        user_id: student1User.id,
        session_secret: 'sec-bracu-pending-02',
        short_code: '4815',
        status: 'CONSUMED',
        expires_at: new Date(Date.now() - 30 * 60_000),
      })
      .returning();
    session2 = inserted;
  }

  // Session 3: Consumed session for SCENARIO 3 Item E-891 (Broken UPS Battery)
  const [existingSession3] = await db
    .select()
    .from(dropSessions)
    .where(eq(dropSessions.session_secret, 'sec-buet-ewaste-03'))
    .limit(1);
  let session3: typeof dropSessions.$inferSelect;
  if (existingSession3) {
    session3 = existingSession3;
  } else {
    const [inserted] = await db
      .insert(dropSessions)
      .values({
        zone_id: buetZone.id,
        user_id: student2User.id,
        session_secret: 'sec-buet-ewaste-03',
        short_code: '8910',
        status: 'CONSUMED',
        expires_at: new Date(Date.now() - 60 * 60_000),
      })
      .returning();
    session3 = inserted;
  }

  // Session 4: Consumed session for SCENARIO 3 Item D-402 (pHash Duplicate)
  const [existingSession4] = await db
    .select()
    .from(dropSessions)
    .where(eq(dropSessions.session_secret, 'sec-bracu-phash-04'))
    .limit(1);
  let session4: typeof dropSessions.$inferSelect;
  if (existingSession4) {
    session4 = existingSession4;
  } else {
    const [inserted] = await db
      .insert(dropSessions)
      .values({
        zone_id: bracuZone.id,
        user_id: normalUser.id,
        session_secret: 'sec-bracu-phash-04',
        short_code: '4021',
        status: 'CONSUMED',
        expires_at: new Date(Date.now() - 90 * 60_000),
      })
      .returning();
    session4 = inserted;
  }

  // Session 5: Consumed session for Verified Deposit (Student 1)
  const [existingSession5] = await db
    .select()
    .from(dropSessions)
    .where(eq(dropSessions.session_secret, 'sec-bracu-verified-05'))
    .limit(1);
  let session5: typeof dropSessions.$inferSelect;
  if (existingSession5) {
    session5 = existingSession5;
  } else {
    const [inserted] = await db
      .insert(dropSessions)
      .values({
        zone_id: bracuZone.id,
        user_id: student1User.id,
        session_secret: 'sec-bracu-verified-05',
        short_code: '1001',
        status: 'CONSUMED',
        expires_at: new Date(Date.now() - 120 * 60_000),
      })
      .returning();
    session5 = inserted;
  }

  // Deposit Records
  // Deposit 1 (SCENARIO 2: 4.2kg PET bottles at BRACU zone with ৳189.00 pending credit)
  const ratePlasticsGood = seededRateMap.get('PLASTICS:GOOD');
  const [existingDeposit1] = await db.select().from(depositRecords).where(eq(depositRecords.session_id, session2.id)).limit(1);
  let deposit1: typeof depositRecords.$inferSelect;
  if (existingDeposit1) {
    deposit1 = existingDeposit1;
  } else {
    const [inserted] = await db
      .insert(depositRecords)
      .values({
        session_id: session2.id,
        zone_id: bracuZone.id,
        user_id: student1User.id,
        category: 'PLASTICS',
        unit: 'kg',
        declared_quantity: '4.20',
        verified_quantity: null,
        evidence_url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
        rate_card_entry_id: ratePlasticsGood?.id,
        estimated_bdt: '189.00',
        verified_bdt: null,
        status: 'RECORDED',
      })
      .returning();
    deposit1 = inserted;
  }

  // Deposit 2 (SCENARIO 3: Item E-891 Broken UPS Battery - E-Waste Mandatory Review)
  const rateEwasteGood = seededRateMap.get('E_WASTE:GOOD');
  const [existingDeposit2] = await db.select().from(depositRecords).where(eq(depositRecords.session_id, session3.id)).limit(1);
  let deposit2: typeof depositRecords.$inferSelect;
  if (existingDeposit2) {
    deposit2 = existingDeposit2;
  } else {
    const [inserted] = await db
      .insert(depositRecords)
      .values({
        session_id: session3.id,
        zone_id: buetZone.id,
        user_id: student2User.id,
        category: 'E_WASTE',
        unit: 'piece',
        declared_quantity: '1.00',
        verified_quantity: null,
        evidence_url: 'https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=600&q=80',
        rate_card_entry_id: rateEwasteGood?.id,
        estimated_bdt: '250.00',
        status: 'ESCALATED',
      })
      .returning();
    deposit2 = inserted;
  }

  // Deposit 3 (SCENARIO 3: Item D-402 Paper pHash Duplicate Image Detection)
  const ratePaperGood = seededRateMap.get('PAPER:GOOD');
  const [existingDeposit3] = await db.select().from(depositRecords).where(eq(depositRecords.session_id, session4.id)).limit(1);
  let deposit3: typeof depositRecords.$inferSelect;
  if (existingDeposit3) {
    deposit3 = existingDeposit3;
  } else {
    const [inserted] = await db
      .insert(depositRecords)
      .values({
        session_id: session4.id,
        zone_id: bracuZone.id,
        user_id: normalUser.id,
        category: 'PAPER',
        unit: 'kg',
        declared_quantity: '15.00',
        verified_quantity: null,
        evidence_url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=600&q=80',
        rate_card_entry_id: ratePaperGood?.id,
        estimated_bdt: '375.00',
        status: 'ESCALATED',
      })
      .returning();
    deposit3 = inserted;
  }

  // Deposit 4 (Completed Verified Deposit)
  const [existingDeposit4] = await db.select().from(depositRecords).where(eq(depositRecords.session_id, session5.id)).limit(1);
  let deposit4: typeof depositRecords.$inferSelect;
  if (existingDeposit4) {
    deposit4 = existingDeposit4;
  } else {
    const [inserted] = await db
      .insert(depositRecords)
      .values({
        session_id: session5.id,
        zone_id: bracuZone.id,
        user_id: student1User.id,
        category: 'PLASTICS',
        unit: 'kg',
        declared_quantity: '10.00',
        verified_quantity: '10.00',
        evidence_url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
        rate_card_entry_id: ratePlasticsGood?.id,
        estimated_bdt: '450.00',
        verified_bdt: '450.00',
        status: 'VERIFIED',
        divergence_ratio: '0.000',
      })
      .returning();
    deposit4 = inserted;
  }

  // Trust Decisions (Decisions for auto-clear, escalation, and dispute)
  // Decision 1: Auto-clear for Deposit 4
  const [existingDecision1] = await db
    .select()
    .from(trustDecisions)
    .where(and(eq(trustDecisions.subject_type, 'DEPOSIT'), eq(trustDecisions.subject_id, deposit4.id)))
    .limit(1);
  let decision1: typeof trustDecisions.$inferSelect;
  if (existingDecision1) {
    decision1 = existingDecision1;
  } else {
    const [inserted] = await db
      .insert(trustDecisions)
      .values({
        subject_type: 'DEPOSIT',
        subject_id: deposit4.id,
        decision: 'AUTO_CLEAR',
        failing_signals: [],
        evaluated_signals: { in_app_capture: true, hash_unique: true, location_verified: true, category_match: true, quantity_within_band: true },
        decided_by: 'SYSTEM',
        notes: 'Auto-cleared clean deposit',
      })
      .returning();
    decision1 = inserted;
  }

  // Decision 2: Auto-clear for Pickup Order 3
  const [existingDecision2] = await db
    .select()
    .from(trustDecisions)
    .where(and(eq(trustDecisions.subject_type, 'PICKUP'), eq(trustDecisions.subject_id, pickupOrder3.id)))
    .limit(1);
  let decision2: typeof trustDecisions.$inferSelect;
  if (existingDecision2) {
    decision2 = existingDecision2;
  } else {
    const [inserted] = await db
      .insert(trustDecisions)
      .values({
        subject_type: 'PICKUP',
        subject_id: pickupOrder3.id,
        decision: 'AUTO_CLEAR',
        failing_signals: [],
        evaluated_signals: { handover_confirmed: true, in_app_capture: true, quantity_within_band: true },
        decided_by: 'SYSTEM',
      })
      .returning();
    decision2 = inserted;
  }

  // Decision 3: ESCALATE for Item E-891 (Broken UPS Battery)
  const [existingDecision3] = await db
    .select()
    .from(trustDecisions)
    .where(and(eq(trustDecisions.subject_type, 'DEPOSIT'), eq(trustDecisions.subject_id, deposit2.id)))
    .limit(1);
  if (!existingDecision3) {
    await db.insert(trustDecisions).values({
      subject_type: 'DEPOSIT',
      subject_id: deposit2.id,
      decision: 'ESCALATE',
      failing_signals: ['e_waste_mandatory_review'],
      evaluated_signals: { is_ewaste: true, in_app_capture: true, location_verified: true, category_match: true },
      decided_by: 'SYSTEM',
      notes: 'Item E-891: Broken UPS Battery - E-Waste mandatory human review',
    });
  }

  // Decision 4: ESCALATE for Item D-402 (pHash Duplicate Detection)
  const [existingDecision4] = await db
    .select()
    .from(trustDecisions)
    .where(and(eq(trustDecisions.subject_type, 'DEPOSIT'), eq(trustDecisions.subject_id, deposit3.id)))
    .limit(1);
  let decision4: typeof trustDecisions.$inferSelect;
  if (existingDecision4) {
    decision4 = existingDecision4;
  } else {
    const [inserted] = await db
      .insert(trustDecisions)
      .values({
        subject_type: 'DEPOSIT',
        subject_id: deposit3.id,
        decision: 'ESCALATE',
        failing_signals: ['phash_duplicate_image'],
        evaluated_signals: { phash_match: true, hamming_distance: 0, prior_deposit_ref: 'DEP-PREV-091' },
        decided_by: 'SYSTEM',
        notes: 'Item D-402: Paper deposit flagged: [PHASH_DUPLICATE_IMAGE_DETECTED]',
      })
      .returning();
    decision4 = inserted;
  }

  // Fraud Flags
  const [existingFlag1] = await db
    .select()
    .from(fraudFlags)
    .where(and(eq(fraudFlags.entity_id, normalUser.id), eq(fraudFlags.flag_type, 'PHASH_DUPLICATE_IMAGE')))
    .limit(1);
  if (!existingFlag1) {
    await db.insert(fraudFlags).values({
      entity_type: 'USER',
      entity_id: normalUser.id,
      flag_type: 'PHASH_DUPLICATE_IMAGE',
      severity: 'HIGH',
      reason: 'Duplicate photo detected across multiple deposit submissions (pHash distance 0)',
    });
  }

  const [existingFlag2] = await db
    .select()
    .from(fraudFlags)
    .where(and(eq(fraudFlags.entity_id, collector2User.id), eq(fraudFlags.flag_type, 'SUSPICIOUS_VELOCITY')))
    .limit(1);
  if (!existingFlag2) {
    await db.insert(fraudFlags).values({
      entity_type: 'PARTNER',
      entity_id: collector2User.id,
      flag_type: 'SUSPICIOUS_VELOCITY',
      severity: 'LOW',
      reason: 'Unusual pickup confirmation frequency during off-hours',
    });
  }

  // Evidence Hashes
  const [existingHash] = await db.select().from(evidenceHashes).limit(1);
  if (!existingHash) {
    await db.insert(evidenceHashes).values([
      { evidence_url: deposit3.evidence_url, phash_hex: '0f0f0f0f0f0f0f0f', uploader_id: normalUser.id },
      { evidence_url: deposit1.evidence_url, phash_hex: 'ffff0000ffff0000', uploader_id: student1User.id },
    ]);
  }

  // Decision Contest
  const [existingContest] = await db.select().from(decisionContests).where(eq(decisionContests.decision_id, decision4.id)).limit(1);
  if (!existingContest) {
    await db.insert(decisionContests).values({
      decision_id: decision4.id,
      user_id: normalUser.id,
      reason: 'The paper was sorted white office paper; photograph was taken at the bin location.',
      status: 'PENDING',
    });
  }

  ctx.deposits.deposit1 = deposit1;
  ctx.deposits.deposit2 = deposit2;
  ctx.deposits.deposit3 = deposit3;
  ctx.deposits.deposit4 = deposit4;
  ctx.decisions.decision1 = decision1;
  ctx.decisions.decision2 = decision2;
  ctx.decisions.decision4 = decision4;
}
