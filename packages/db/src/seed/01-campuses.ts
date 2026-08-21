import { db, campuses } from '../index';
// Seed scenario section 01 — moved verbatim from the original seed().
import { upsertCampus } from './context';
import type { SeedContext } from './context';

export async function run(ctx: SeedContext): Promise<void> {
  // =========================================================================
  // 1. CAMPUSES & INSTITUTION ACCOUNTS
  // =========================================================================
  const bracuCampus = await upsertCampus({
    slug: 'BRACU',
    name: 'BRAC University',
    division: 'DHAKA',
    zilla: 'Dhaka',
    upazilla: 'Merul Badda',
    status: 'VERIFIED',
  });
  const duCampus = await upsertCampus({
    slug: 'DU',
    name: 'University of Dhaka',
    division: 'DHAKA',
    zilla: 'Dhaka',
    upazilla: 'Shahbag',
    status: 'VERIFIED',
  });
  const buetCampus = await upsertCampus({
    slug: 'BUET',
    name: 'Bangladesh University of Engineering and Technology',
    division: 'DHAKA',
    zilla: 'Dhaka',
    upazilla: 'Palashi',
    status: 'VERIFIED',
  });
  const nsuCampus = await upsertCampus({
    slug: 'NSU',
    name: 'North South University',
    division: 'DHAKA',
    zilla: 'Dhaka',
    upazilla: 'Bashundhara R/A',
    status: 'VERIFIED',
  });

  ctx.campuses.bracuCampus = bracuCampus;
}
