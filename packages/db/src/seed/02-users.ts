import { db, users } from '../index';
// Seed scenario section 02 — moved verbatim from the original seed().
import { upsertUser } from './context';
import { hash } from 'bcryptjs';
import type { SeedContext } from './context';

// Local demo accounts only. Never reuse this password outside local development.
const DEMO_PASSWORD = 'password123';

export async function run(ctx: SeedContext): Promise<void> {
  // =========================================================================
  // 2. USERS (Roles: ADMIN, INDIVIDUAL, PARTNER)
  // =========================================================================
  const passwordHash = await hash(DEMO_PASSWORD, 10);
  const adminOrgUser = await upsertUser('admin@chokro.org', 'ADMIN', passwordHash, 'NSU', {
    fullName: 'Platform Administrator',
    phone: '+8801700000001',
  });
  await upsertUser('admin@chokro.com', 'ADMIN', passwordHash, 'NSU', {
    fullName: 'Super Admin',
    phone: '+8801700000000',
  });
  const student1User = await upsertUser('student1@bracu.ac.bd', 'INDIVIDUAL', passwordHash, 'BRACU', {
    fullName: 'Tanvir Hossain',
    phone: '+8801711111112',
    studentIdDoc: 'BRACU-2023-ST-8812.pdf',
  });
  const student2User = await upsertUser('student2@du.ac.bd', 'INDIVIDUAL', passwordHash, 'DU', {
    fullName: 'Sadia Rahman',
    phone: '+8801722222222',
    studentIdDoc: 'DU-2024-ST-4419.pdf',
  });
  const normalUser = await upsertUser('user@chokro.org', 'INDIVIDUAL', passwordHash, 'BRACU', {
    fullName: 'Demo Student',
    phone: '+8801711111111',
  });
  const partnerUser = await upsertUser('partner@chokro.org', 'PARTNER', passwordHash, 'DU', {
    fullName: 'BanglaBin Recycling',
    phone: '+8801733333333',
  });
  const collectorKorimUser = await upsertUser('collector_korim@bengalrecycle.com', 'PARTNER', passwordHash, 'BRACU', {
    fullName: 'Korim Ahmed',
    phone: '+8801733333334',
  });
  const collector1User = await upsertUser('collector1@chokro.org', 'PARTNER', passwordHash, null, {
    fullName: 'Dhanmondi Eco Fleet',
    phone: '+8801766666666',
  });
  const collector2User = await upsertUser('collector2@chokro.org', 'PARTNER', passwordHash, null, {
    fullName: 'Savar Trike Fleet',
    phone: '+8801777777777',
  });
  const recyclerRahimUser = await upsertUser('recycler_rahim@dhakascrap.com', 'PARTNER', passwordHash, null, {
    fullName: 'Rahim Khan',
    phone: '+8801744444444',
  });
  const recycler1User = await upsertUser('recycler1@chokro.org', 'PARTNER', passwordHash, null, {
    fullName: 'Dhaka Steel Recyclers',
    phone: '+8801755555551',
  });
  const recycler2User = await upsertUser('recycler2@chokro.org', 'PARTNER', passwordHash, null, {
    fullName: 'Narayanganj Metal Works',
    phone: '+8801788888888',
  });
  const buyerFarukUser = await upsertUser('buyer_faruk@metals.com', 'INDIVIDUAL', passwordHash, null, {
    fullName: 'Faruk Metals',
    phone: '+8801755555555',
  });
  const electrofixUser = await upsertUser('electrofix@chokro.org', 'PARTNER', passwordHash, null, {
    fullName: 'ElectroFix Workshop',
    phone: '+8801799999999',
  });
  const applicantPartnerUser = await upsertUser('applicant_partner@bengalrecycle.com', 'PARTNER', passwordHash, null, {
    fullName: 'Bengal Recyclers Applicant',
    phone: '+8801811111111',
  });

  ctx.users.adminOrgUser = adminOrgUser;
  ctx.users.student1User = student1User;
  ctx.users.student2User = student2User;
  ctx.users.normalUser = normalUser;
  ctx.users.partnerUser = partnerUser;
  ctx.users.collectorKorimUser = collectorKorimUser;
  ctx.users.collector1User = collector1User;
  ctx.users.collector2User = collector2User;
  ctx.users.recyclerRahimUser = recyclerRahimUser;
  ctx.users.recycler1User = recycler1User;
  ctx.users.recycler2User = recycler2User;
  ctx.users.buyerFarukUser = buyerFarukUser;
  ctx.users.electrofixUser = electrofixUser;
  ctx.users.applicantPartnerUser = applicantPartnerUser;
}
