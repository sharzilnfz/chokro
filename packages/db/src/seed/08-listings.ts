import { db, users, listings, listingMedia } from '../index';
import { eq } from 'drizzle-orm';
// Seed scenario section 08 — moved verbatim from the original seed().
import { upsertListingRecord } from './helpers';
import type { SeedContext } from './context';

export async function run(ctx: SeedContext): Promise<void> {
  const { student1User, student2User, normalUser } = ctx.users;

  // =========================================================================
  // 8. MARKETPLACE LISTINGS & PRIVACY-STRIPPED MEDIA
  // =========================================================================
  
  // Listing 1: 40kg Sorted Copper Wire (Tejgaon) - Used in Scenarios 4 & 5
  const listingCopper40kg = await upsertListingRecord({
    ownerId: student1User.id,
    category: 'METAL',
    unit: 'kg',
    declaredWeight: '40.00',
    declaredCondition: 'GOOD',
    priceBdt: '28800.00', // ৳720/kg
    status: 'ACTIVE',
    lat: 23.7610,
    lng: 90.3910,
    thana: 'Tejgaon',
    zilla: 'Dhaka',
    photos: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80'],
  });

  // Listing 2: 500kg Industrial Copper Cable Scrap (Tejgaon) - Used in Scenario 5
  const listingCopper500kg = await upsertListingRecord({
    ownerId: student2User.id,
    category: 'METAL',
    unit: 'kg',
    declaredWeight: '500.00',
    declaredCondition: 'EXCELLENT',
    priceBdt: '370000.00', // ৳740/kg
    status: 'ACTIVE',
    lat: 23.7620,
    lng: 90.3920,
    thana: 'Tejgaon',
    zilla: 'Dhaka',
    photos: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=600&q=80'],
  });

  // Listing 3: 12.5kg Mixed PET Bottles & HDPE Plastic (Dhanmondi)
  const listingPlastics = await upsertListingRecord({
    ownerId: normalUser.id,
    category: 'PLASTICS',
    unit: 'kg',
    declaredWeight: '12.50',
    declaredCondition: 'GOOD',
    priceBdt: '562.50',
    status: 'ACTIVE',
    lat: 23.7820,
    lng: 90.4205,
    thana: 'Dhanmondi',
    zilla: 'Dhaka',
    photos: ['https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80'],
  });

  // Listing 4: 120kg Industrial Cardboard Boxes (Mirpur)
  const listingPaper = await upsertListingRecord({
    ownerId: normalUser.id,
    category: 'PAPER',
    unit: 'kg',
    declaredWeight: '120.00',
    declaredCondition: 'FAIR',
    priceBdt: '2160.00',
    status: 'ACTIVE',
    lat: 23.8050,
    lng: 90.3680,
    thana: 'Mirpur',
    zilla: 'Dhaka',
    photos: ['https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=600&q=80'],
  });

  // Listing 5: Defective Microwave Oven (Dhanmondi)
  const listingAppliance = await upsertListingRecord({
    ownerId: student1User.id,
    category: 'APPLIANCES',
    unit: 'piece',
    pieceCount: 1,
    declaredCondition: 'FAIR',
    priceBdt: '1400.00',
    status: 'ACTIVE',
    lat: 23.7465,
    lng: 90.3760,
    thana: 'Dhanmondi',
    zilla: 'Dhaka',
    photos: ['https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&w=600&q=80'],
  });

  // Listing 6: Mixed Circuit Boards & Motherboards (Gulshan)
  const listingEwaste = await upsertListingRecord({
    ownerId: student2User.id,
    category: 'E_WASTE',
    unit: 'piece',
    pieceCount: 8,
    declaredCondition: 'GOOD',
    priceBdt: '3200.00',
    status: 'ACTIVE',
    lat: 23.7925,
    lng: 90.4078,
    thana: 'Gulshan',
    zilla: 'Dhaka',
    photos: ['https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=600&q=80'],
  });

  // Listing 7: 15kg University Textbooks (Badda)
  const listingBooks = await upsertListingRecord({
    ownerId: student1User.id,
    category: 'BOOKS',
    unit: 'kg',
    declaredWeight: '15.00',
    declaredCondition: 'EXCELLENT',
    priceBdt: '750.00',
    status: 'ACTIVE',
    lat: 23.7740,
    lng: 90.4250,
    thana: 'Badda',
    zilla: 'Dhaka',
    photos: ['https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=600&q=80'],
  });

  // Listing 8: 20kg Sorted Cotton Garments (Shahbag)
  const listingClothes = await upsertListingRecord({
    ownerId: normalUser.id,
    category: 'CLOTHES',
    unit: 'kg',
    declaredWeight: '20.00',
    declaredCondition: 'GOOD',
    priceBdt: '600.00',
    status: 'ACTIVE',
    lat: 23.7340,
    lng: 90.3928,
    thana: 'Shahbag',
    zilla: 'Dhaka',
    photos: ['https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=600&q=80'],
  });

  // Seed listing media rows with privacy-stripped guarantee
  const allListings = [
    listingCopper40kg,
    listingCopper500kg,
    listingPlastics,
    listingPaper,
    listingAppliance,
    listingEwaste,
    listingBooks,
    listingClothes,
  ];

  for (const l of allListings) {
    const [existingMedia] = await db.select().from(listingMedia).where(eq(listingMedia.listing_id, l.id)).limit(1);
    if (!existingMedia && l.photos && (l.photos as string[]).length > 0) {
      await db.insert(listingMedia).values({
        listing_id: l.id,
        uploader_id: l.owner_id,
        storage_provider: 'CLOUDINARY',
        public_url: (l.photos as string[])[0],
        thumbnail_url: (l.photos as string[])[0],
        original_filename: `scrap-${l.category.toLowerCase()}.webp`,
        mime_type: 'image/webp',
        byte_size: 142000,
        is_privacy_stripped: true,
      });
    }
  }

  ctx.listings.listingCopper40kg = listingCopper40kg;
  ctx.listings.listingCopper500kg = listingCopper500kg;
  ctx.listings.listingPlastics = listingPlastics;
  ctx.listings.listingPaper = listingPaper;
  ctx.listings.listingAppliance = listingAppliance;
  ctx.listings.listingEwaste = listingEwaste;
  ctx.listings.listingBooks = listingBooks;
  ctx.listings.listingClothes = listingClothes;
}
