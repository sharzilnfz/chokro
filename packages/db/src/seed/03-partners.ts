import { db, partners } from '../index';
// Seed scenario section 03 — moved verbatim from the original seed().
import { upsertPartnerRecord } from './helpers';
import type { SeedContext } from './context';

export async function run(ctx: SeedContext): Promise<void> {
  const { partnerUser, collectorKorimUser, recyclerRahimUser, collector1User, collector2User, recycler1User, recycler2User, electrofixUser, applicantPartnerUser } = ctx.users;
  // =========================================================================
  // 3. PARTNERS & FLEETS
  // =========================================================================
  
  await upsertPartnerRecord({
    userId: partnerUser.id,
    orgName: 'BanglaBin Recycling Ltd',
    types: ['RECYCLER', 'COLLECTOR'],
    eWasteLicensed: true,
    doeLicenseDoc: 'DOE-LICENSE-2026-9912.pdf',
    status: 'VERIFIED',
    vehicleLabel: 'Collection Van',
    vehicleCapacityKg: '800.00',
    baseLat: 23.7700,
    baseLng: 90.4100,
    serviceRadiusKm: 15,
    capabilityFlags: { collects: true, repairs: false, buys: true, accepts_donations: true },
  });

  const partnerBengalCollector = await upsertPartnerRecord({
    userId: collectorKorimUser.id,
    orgName: 'Bengal Circular Logistics',
    types: ['COLLECTOR'],
    eWasteLicensed: true,
    doeLicenseDoc: 'DOE-LICENSE-2026-9912.pdf',
    status: 'VERIFIED',
    vehicleLabel: '800kg Van',
    vehicleCapacityKg: '800.00',
    baseLat: 23.7806,
    baseLng: 90.4192,
    serviceRadiusKm: 12,
    capabilityFlags: { collects: true, repairs: false, buys: true, accepts_donations: true },
  });

  const partnerDhakaRecycler = await upsertPartnerRecord({
    userId: recyclerRahimUser.id,
    orgName: 'Dhaka Green Recyclers',
    types: ['RECYCLER', 'COLLECTOR'],
    eWasteLicensed: true,
    doeLicenseDoc: 'DOE/E-WASTE/2024/091.pdf',
    status: 'VERIFIED',
    vehicleLabel: 'Heavy E-Waste Carrier',
    vehicleCapacityKg: '2500.00',
    baseLat: 23.7600,
    baseLng: 90.3900,
    serviceRadiusKm: 25,
    capabilityFlags: { collects: true, repairs: false, buys: true, accepts_donations: false },
  });

  const partnerCollector1 = await upsertPartnerRecord({
    userId: collector1User.id,
    orgName: 'Dhanmondi Eco Vans',
    types: ['COLLECTOR'],
    eWasteLicensed: true,
    doeLicenseDoc: 'DOE-LICENSE-2026-4417.pdf',
    status: 'VERIFIED',
    vehicleLabel: 'Pickup van',
    vehicleCapacityKg: '500.00',
    baseLat: 23.7806,
    baseLng: 90.4192,
    serviceRadiusKm: 12,
    capabilityFlags: { collects: true, repairs: false, buys: false, accepts_donations: true },
  });

  const partnerCollector2 = await upsertPartnerRecord({
    userId: collector2User.id,
    orgName: 'Savar Cargo Trikes',
    types: ['COLLECTOR'],
    eWasteLicensed: false,
    doeLicenseDoc: null,
    status: 'VERIFIED',
    vehicleLabel: 'Cargo trike',
    vehicleCapacityKg: '150.00',
    baseLat: 23.7481,
    baseLng: 90.3765,
    serviceRadiusKm: 10,
    capabilityFlags: { collects: true, repairs: false, buys: false, accepts_donations: false },
  });

  await upsertPartnerRecord({
    userId: recycler1User.id,
    orgName: 'Dhaka Steel Recyclers',
    types: ['RECYCLER'],
    eWasteLicensed: false,
    status: 'VERIFIED',
    capabilityFlags: { collects: false, repairs: false, buys: true, accepts_donations: false },
  });

  await upsertPartnerRecord({
    userId: recycler2User.id,
    orgName: 'Narayanganj Metal Works',
    types: ['RECYCLER'],
    eWasteLicensed: false,
    status: 'VERIFIED',
    capabilityFlags: { collects: false, repairs: false, buys: true, accepts_donations: false },
  });

  await upsertPartnerRecord({
    userId: electrofixUser.id,
    orgName: 'ElectroFix Workshop',
    types: ['REPAIR_SHOP'],
    eWasteLicensed: false,
    status: 'VERIFIED',
    capabilityFlags: { collects: false, repairs: true, buys: true, accepts_donations: true },
  });

  const partnerApplicant = await upsertPartnerRecord({
    userId: applicantPartnerUser.id,
    orgName: 'Bengal Recyclers Ltd',
    types: ['RECYCLER'],
    eWasteLicensed: false,
    doeLicenseDoc: 'DOE-CERT-BENGAL-2026.pdf',
    status: 'APPLIED',
    capabilityFlags: {},
  });

  ctx.partners.partnerBengalCollector = partnerBengalCollector;
  ctx.partners.partnerDhakaRecycler = partnerDhakaRecycler;
  ctx.partners.partnerCollector1 = partnerCollector1;
  ctx.partners.partnerCollector2 = partnerCollector2;
  ctx.partners.partnerApplicant = partnerApplicant;
}
