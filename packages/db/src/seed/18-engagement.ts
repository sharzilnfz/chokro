import { db, users, listings, conversations, messages, savedListings, valuationScans, evidenceRecords } from '../index';
import { and, eq } from 'drizzle-orm';
// Seed scenario section 18 — moved verbatim from the original seed().
import type { SeedContext } from './context';

export async function run(ctx: SeedContext): Promise<void> {
  const { student1User, student2User, normalUser, buyerFarukUser } = ctx.users;
  const { listingCopper40kg } = ctx.listings;

  // =========================================================================
  // 18. VALUATION SCANS, CONVERSATIONS, SAVED LISTINGS & EVIDENCE
  // =========================================================================
  const seedScans = [
    {
      userId: student1User.id,
      imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
      detectedCategory: 'METAL',
      detectedCondition: 'GOOD',
      estimatedQuantity: '40.00',
      unit: 'kg',
      nextLifePath: 'RECYCLE',
      isEwasteHazard: false,
      confidence: '0.96',
      estimatedValueBdt: '28800.00',
      reasoningRationale: 'Pure sorted copper cables stripped from telecommunications wiring.',
      suggestedAction: 'List on Chokro Marketplace or arrange bulk B2B auction.',
    },
    {
      userId: student1User.id,
      imageUrl: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&w=600&q=80',
      detectedCategory: 'APPLIANCES',
      detectedCondition: 'FAIR',
      estimatedQuantity: '1.00',
      unit: 'piece',
      nextLifePath: 'REPAIR',
      isEwasteHazard: false,
      confidence: '0.94',
      estimatedValueBdt: '1400.00',
      reasoningRationale: 'Microwave oven with functional casing and repairable magnetron.',
      suggestedAction: 'List in repair section or drop off at ElectroFix partner hub.',
    },
    {
      userId: normalUser.id,
      imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
      detectedCategory: 'PLASTICS',
      detectedCondition: 'GOOD',
      estimatedQuantity: '12.50',
      unit: 'kg',
      nextLifePath: 'RECYCLE',
      isEwasteHazard: false,
      confidence: '0.95',
      estimatedValueBdt: '562.50',
      reasoningRationale: 'Clean sorted PET bottles suitable for bottle-to-bottle pelletizing.',
      suggestedAction: 'Drop off at BRACU Building 1 Cafeteria Smart Bin.',
    },
    {
      userId: student2User.id,
      imageUrl: 'https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=600&q=80',
      detectedCategory: 'E_WASTE',
      detectedCondition: 'GOOD',
      estimatedQuantity: '8.00',
      unit: 'piece',
      nextLifePath: 'RECYCLE',
      isEwasteHazard: true,
      confidence: '0.98',
      estimatedValueBdt: '3200.00',
      reasoningRationale: 'Precious metal circuit boards requiring authorized DoE recycling.',
      suggestedAction: 'Schedule licensed hazardous scrap pickup with Dhaka Green Recyclers.',
    },
  ];

  for (const scan of seedScans) {
    const [existingScan] = await db
      .select()
      .from(valuationScans)
      .where(and(eq(valuationScans.user_id, scan.userId), eq(valuationScans.detected_category, scan.detectedCategory)))
      .limit(1);

    if (!existingScan) {
      await db.insert(valuationScans).values({
        user_id: scan.userId,
        image_url: scan.imageUrl,
        detected_category: scan.detectedCategory,
        detected_condition: scan.detectedCondition,
        estimated_quantity: scan.estimatedQuantity,
        unit: scan.unit,
        next_life_path: scan.nextLifePath,
        is_ewaste_hazard: scan.isEwasteHazard,
        confidence: scan.confidence,
        estimated_value_bdt: scan.estimatedValueBdt,
        reasoning_rationale: scan.reasoningRationale,
        suggested_action: scan.suggestedAction,
      });
    }
  }

  // Conversation & Messages
  const [existingConv] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.listing_id, listingCopper40kg.id),
        eq(conversations.buyer_id, buyerFarukUser.id),
        eq(conversations.seller_id, student1User.id)
      )
    )
    .limit(1);

  let conv: typeof conversations.$inferSelect;
  if (existingConv) {
    conv = existingConv;
  } else {
    const [inserted] = await db
      .insert(conversations)
      .values({
        listing_id: listingCopper40kg.id,
        buyer_id: buyerFarukUser.id,
        seller_id: student1User.id,
        last_message_body: 'I have countered with ৳740/kg. Let me know if that works.',
        last_message_at: new Date(Date.now() - 30 * 60_000),
      })
      .returning();
    conv = inserted;

    await db.insert(messages).values([
      { conversation_id: conv.id, sender_id: buyerFarukUser.id, body: 'Salam, is the copper wire sorted and stripped?' },
      { conversation_id: conv.id, sender_id: student1User.id, body: 'Yes, 100% stripped electrolytic grade.' },
      { conversation_id: conv.id, sender_id: student1User.id, body: 'I have countered with ৳740/kg. Let me know if that works.' },
    ]);
  }

  // Saved Listings
  const [existingSaved] = await db
    .select()
    .from(savedListings)
    .where(and(eq(savedListings.user_id, buyerFarukUser.id), eq(savedListings.listing_id, listingCopper40kg.id)))
    .limit(1);
  if (!existingSaved) {
    await db.insert(savedListings).values({
      user_id: buyerFarukUser.id,
      listing_id: listingCopper40kg.id,
    });
  }

  // Evidence Records
  const [existingEv] = await db.select().from(evidenceRecords).limit(1);
  if (!existingEv) {
    await db.insert(evidenceRecords).values([
      {
        uploader_id: student1User.id,
        storage_path: '/uploads/evidence/bracu-deposit-4-2kg.jpg',
        url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
        mime_type: 'image/jpeg',
        byte_size: 245000,
      },
    ]);
  }

}
