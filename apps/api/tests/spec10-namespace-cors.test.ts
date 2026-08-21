// SPEC 10 — API Namespace Consolidation, CORS Allowlist & Dispatch Query Optimization (Ticket 01b)
// Tests:
// 1. Canonical /api/v1/ routes and unversioned aliases respond identically across route families.
// 2. CORS allowed origins return correct Access-Control-Allow-Origin header; disallowed origins omit it.
// 3. Dispatch collector candidate query executes batch evaluation without N+1 regression.

import crypto from 'crypto';
import { db, partners, eq, campuses, rateCardEntries, listings } from '@chokro/db';
import { GET as getAuthMeV1, OPTIONS as optionsAuthMeV1 } from '../app/api/v1/auth/me/route';
import { GET as getAuthMeUnversioned, OPTIONS as optionsAuthMeUnversioned } from '../app/api/auth/me/route';
import { GET as getCampusesV1 } from '../app/api/v1/campuses/route';
import { GET as getCampusesUnversioned } from '../app/api/campuses/route';
import { GET as getFeedV1 } from '../app/api/v1/feed/route';
import { GET as getFeedUnversioned } from '../app/api/feed/route';
import { GET as getListingsFeedV1 } from '../app/api/v1/listings/feed/route';
import { GET as getBadgesV1 } from '../app/api/v1/badges/route';
import { GET as getBadgesUnversioned } from '../app/api/badges/route';
import { GET as getStreaksV1 } from '../app/api/v1/streaks/route';
import { GET as getStreaksUnversioned } from '../app/api/streaks/route';
import { GET as getPublishedRatesV1 } from '../app/api/v1/rate-card/published/route';
import { GET as getPublishedRatesUnversioned } from '../app/api/rate-card/published/route';
import { GET as getWalletBalanceV1 } from '../app/api/v1/wallet/balance/route';
import { GET as getWalletBalanceUnversioned } from '../app/api/wallet/balance/route';
import { GET as getDropZoneLocatorV1 } from '../app/api/v1/drop-zones/locator/route';
import { GET as getDropZoneLocatorUnversioned } from '../app/api/drop-zones/locator/route';
import { GET as getAdminCampusesV1 } from '../app/api/v1/admin/campuses/route';
import { GET as getAdminCampusesUnversioned } from '../app/api/admin/campuses/route';
import { PickupDomain } from '../lib/domain/PickupDomain';
import { pickupRepo } from '../lib/repos/pickups';
import { partnerRepo } from '../lib/repos/partners';
import { isOriginAllowed } from '../lib/http';
import { authHeaders, createTestUser, resetTestStore, tokenFor } from './test-utils';

describe('SPEC 10 — API Namespace Consolidation & CORS Allowlist (Ticket 01b)', () => {
  beforeEach(async () => {
    await resetTestStore();
    delete process.env.CORS_ALLOWED_ORIGINS;
    delete process.env.MAPBOX_TOKEN;
  });

  afterAll(() => {
    delete process.env.CORS_ALLOWED_ORIGINS;
  });

  describe('1. API Routes Canonical Namespace & Backward-Compatible Aliases', () => {
    it('returns identical 401 Unauthorized for /api/v1/auth/me and /api/auth/me when unauthenticated', async () => {
      const v1Req = new Request('http://localhost/api/v1/auth/me');
      const unversionedReq = new Request('http://localhost/api/auth/me');

      const v1Res = await getAuthMeV1(v1Req);
      const unversionedRes = await getAuthMeUnversioned(unversionedReq);

      expect(v1Res.status).toBe(401);
      expect(unversionedRes.status).toBe(401);
      expect(await v1Res.json()).toEqual(await unversionedRes.json());
    });

    it('returns identical user profile for /api/v1/auth/me and /api/auth/me when authenticated', async () => {
      const user = await createTestUser('INDIVIDUAL', 'alice@test.chokro.org');
      const token = tokenFor(user);

      const v1Res = await getAuthMeV1(
        new Request('http://localhost/api/v1/auth/me', { headers: authHeaders(token) }),
      );
      const unversionedRes = await getAuthMeUnversioned(
        new Request('http://localhost/api/auth/me', { headers: authHeaders(token) }),
      );

      expect(v1Res.status).toBe(200);
      expect(unversionedRes.status).toBe(200);
      const v1Data = await v1Res.json();
      const unversionedData = await unversionedRes.json();
      expect(v1Data).toEqual(unversionedData);
      expect(v1Data.user.id).toBe(user.id);
    });

    it('returns identical responses for campuses (/api/v1/campuses vs /api/campuses)', async () => {
      const admin = await createTestUser('ADMIN');
      await db.insert(campuses).values({
        id: crypto.randomUUID(),
        slug: 'du-main',
        name: 'Dhaka University',
        division: 'DHAKA',
        zilla: 'DHAKA',
        status: 'VERIFIED',
        created_by: admin.id,
      });

      const user = await createTestUser();
      const token = tokenFor(user);

      const v1Res = await getCampusesV1(
        new Request('http://localhost/api/v1/campuses', { headers: authHeaders(token) }),
      );
      const unversionedRes = await getCampusesUnversioned(
        new Request('http://localhost/api/campuses', { headers: authHeaders(token) }),
      );

      expect(v1Res.status).toBe(200);
      expect(unversionedRes.status).toBe(200);
      expect(await v1Res.json()).toEqual(await unversionedRes.json());
    });

    it('returns identical responses for feed (/api/v1/feed, /api/feed, and /api/v1/listings/feed)', async () => {
      const v1Res = await getFeedV1(new Request('http://localhost/api/v1/feed'));
      const unversionedRes = await getFeedUnversioned(new Request('http://localhost/api/feed'));
      const aliasRes = await getListingsFeedV1(new Request('http://localhost/api/v1/listings/feed'));

      expect(v1Res.status).toBe(200);
      expect(unversionedRes.status).toBe(200);
      expect(aliasRes.status).toBe(200);

      const v1Data = await v1Res.json();
      const unversionedData = await unversionedRes.json();
      const aliasData = await aliasRes.json();

      expect(v1Data).toEqual(unversionedData);
      expect(v1Data).toEqual(aliasData);
    });

    it('returns identical responses for badges and streaks', async () => {
      const user = await createTestUser();
      const token = tokenFor(user);

      const v1Badges = await getBadgesV1(
        new Request('http://localhost/api/v1/badges', { headers: authHeaders(token) }),
      );
      const unversionedBadges = await getBadgesUnversioned(
        new Request('http://localhost/api/badges', { headers: authHeaders(token) }),
      );
      expect(v1Badges.status).toBe(200);
      expect(unversionedBadges.status).toBe(200);
      expect(await v1Badges.json()).toEqual(await unversionedBadges.json());

      const v1Streaks = await getStreaksV1(
        new Request('http://localhost/api/v1/streaks', { headers: authHeaders(token) }),
      );
      const unversionedStreaks = await getStreaksUnversioned(
        new Request('http://localhost/api/streaks', { headers: authHeaders(token) }),
      );
      expect(v1Streaks.status).toBe(200);
      expect(unversionedStreaks.status).toBe(200);
      expect(await v1Streaks.json()).toEqual(await unversionedStreaks.json());
    });

    it('returns identical responses for published rate card and wallet balance', async () => {
      const admin = await createTestUser('ADMIN');
      await db.insert(rateCardEntries).values({
        id: crypto.randomUUID(),
        category: 'METAL',
        condition_band: 'GOOD',
        unit: 'kg',
        price_bdt: '120.00',
        updated_by: admin.id,
      });

      const user = await createTestUser();
      const token = tokenFor(user);

      const v1Rates = await getPublishedRatesV1();
      const unversionedRates = await getPublishedRatesUnversioned();
      expect(v1Rates.status).toBe(200);
      expect(unversionedRates.status).toBe(200);
      expect(await v1Rates.json()).toEqual(await unversionedRates.json());

      const v1Wallet = await getWalletBalanceV1(
        new Request('http://localhost/api/v1/wallet/balance', { headers: authHeaders(token) }),
      );
      const unversionedWallet = await getWalletBalanceUnversioned(
        new Request('http://localhost/api/wallet/balance', { headers: authHeaders(token) }),
      );
      expect(v1Wallet.status).toBe(200);
      expect(unversionedWallet.status).toBe(200);
      expect(await v1Wallet.json()).toEqual(await unversionedWallet.json());
    });

    it('returns identical responses for drop-zones locator and admin campuses', async () => {
      const admin = await createTestUser('ADMIN');
      const adminToken = tokenFor(admin);

      const v1Locator = await getDropZoneLocatorV1(new Request('http://localhost/api/v1/drop-zones/locator'));
      const unversionedLocator = await getDropZoneLocatorUnversioned(new Request('http://localhost/api/drop-zones/locator'));
      expect(v1Locator.status).toBe(200);
      expect(unversionedLocator.status).toBe(200);
      expect(await v1Locator.json()).toEqual(await unversionedLocator.json());

      const v1AdminCampuses = await getAdminCampusesV1(
        new Request('http://localhost/api/v1/admin/campuses', { headers: authHeaders(adminToken) }),
      );
      const unversionedAdminCampuses = await getAdminCampusesUnversioned(
        new Request('http://localhost/api/admin/campuses', { headers: authHeaders(adminToken) }),
      );
      expect(v1AdminCampuses.status).toBe(200);
      expect(unversionedAdminCampuses.status).toBe(200);
      expect(await v1AdminCampuses.json()).toEqual(await unversionedAdminCampuses.json());
    });
  });

  describe('2. CORS Allowlist & Disallowed Origin Gating', () => {
    it('permits default local development origins and sets correct CORS headers', async () => {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:8081',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:8081',
        'http://localhost:19006',
      ];

      for (const origin of allowedOrigins) {
        expect(isOriginAllowed(origin)).toBe(true);

        const req = new Request('http://localhost/api/v1/auth/me', {
          headers: { origin },
        });
        const res = await getAuthMeV1(req);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe(origin);
        expect(res.headers.get('Vary')).toContain('Origin');
        expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
        expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
      }
    });

    it('rejects/omits Access-Control-Allow-Origin for disallowed cross-origin requests', async () => {
      const disallowedOrigins = [
        'https://malicious-site.com',
        'http://evil-hacker.org',
        'http://localhost:9999',
        'https://unauthorized-domain.io',
      ];

      for (const origin of disallowedOrigins) {
        expect(isOriginAllowed(origin)).toBe(false);

        const req = new Request('http://localhost/api/v1/auth/me', {
          headers: { origin },
        });
        const res = await getAuthMeV1(req);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
      }
    });

    it('handles OPTIONS preflight correctly for allowed vs disallowed origins', async () => {
      const allowedReq = new Request('http://localhost/api/v1/auth/me', {
        method: 'OPTIONS',
        headers: { origin: 'http://localhost:3000' },
      });
      const allowedPreflight = optionsAuthMeV1(allowedReq);
      expect(allowedPreflight.status).toBe(204);
      expect(allowedPreflight.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');

      const disallowedReq = new Request('http://localhost/api/v1/auth/me', {
        method: 'OPTIONS',
        headers: { origin: 'https://evil.com' },
      });
      const disallowedPreflight = optionsAuthMeV1(disallowedReq);
      expect(disallowedPreflight.status).toBe(204);
      expect(disallowedPreflight.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('respects CORS_ALLOWED_ORIGINS environment variable override', async () => {
      process.env.CORS_ALLOWED_ORIGINS = 'https://chokro.org, https://admin.chokro.org';

      expect(isOriginAllowed('https://chokro.org')).toBe(true);
      expect(isOriginAllowed('https://admin.chokro.org')).toBe(true);
      expect(isOriginAllowed('https://evil.com')).toBe(false);
      expect(isOriginAllowed('http://localhost:3000')).toBe(false); // Overridden by env var

      const req = new Request('http://localhost/api/v1/auth/me', {
        headers: { origin: 'https://chokro.org' },
      });
      const res = await getAuthMeV1(req);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://chokro.org');

      const evilReq = new Request('http://localhost/api/v1/auth/me', {
        headers: { origin: 'https://evil.com' },
      });
      const evilRes = await getAuthMeV1(evilReq);
      expect(evilRes.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('omits Access-Control-Allow-Origin when no origin header is provided (server/mobile direct call)', async () => {
      const req = new Request('http://localhost/api/v1/auth/me');
      const res = await getAuthMeV1(req);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });
  });

  describe('3. Dispatch Collector Candidate Query Optimization (Batch vs N+1)', () => {
    async function createCollector(org: string, lat: number, lng: number, capacityKg: number, licensed = false) {
      const user = await createTestUser('PARTNER', `${crypto.randomUUID()}@collector.org`);
      const partner = await partnerRepo.apply({
        user_id: user.id,
        org_name: org,
        types: ['COLLECTOR'],
        e_waste_licensed: licensed,
        status: 'VERIFIED',
      });
      await db
        .update(partners)
        .set({
          vehicle_label: 'Collector Truck',
          vehicle_capacity_kg: String(capacityKg),
          base_lat: lat,
          base_lng: lng,
          service_radius_km: 15,
        })
        .where(eq(partners.id, partner.id));
      return partner;
    }

    it('batch-fetches active orders in a single aggregate query and preserves eligibility ranking', async () => {
      // Create 4 collectors at varying locations and capacities
      const c1 = await createCollector('Dhanmondi Collector', 23.7465, 90.3760, 300);
      const c2 = await createCollector('Gulshan Collector', 23.7925, 90.4078, 500);
      const c3 = await createCollector('Uttara Collector', 23.8759, 90.3795, 100);
      const c4 = await createCollector('E-Waste Specialist', 23.7500, 90.3800, 400, true);

      // Create an active pickup task for c1 that commits 250kg of its 300kg capacity
      const customer = await createTestUser();
      const listingId = crypto.randomUUID();
      await db.insert(listings).values({
        id: listingId,
        owner_id: customer.id,
        category: 'PLASTICS',
        unit: 'kg',
        declared_weight: '250.00',
        piece_count: null,
        declared_condition: 'GOOD',
        price_bdt: '500.00',
        status: 'ACTIVE',
      });

      const activeOrder = await pickupRepo.create({
        listing_id: listingId,
        customer_id: customer.id,
        collector_partner_id: c1.id,
        status: 'ASSIGNED',
        address: 'Dhanmondi 27',
        lat: 23.7460,
        lng: 90.3750,
        scheduled_for: new Date(Date.now() + 3600000),
      });
      expect(activeOrder).toBeDefined();

      // Spy on pickupRepo methods to verify batching vs N+1
      const batchSpy = jest.spyOn(pickupRepo, 'findActiveByCollectors');
      const sequentialSpy = jest.spyOn(pickupRepo, 'findActiveByCollector');

      // Execute dispatch candidate evaluation for 100kg of PLASTICS near Dhanmondi (23.7465, 90.3760)
      const result = await PickupDomain.findBestCollector({
        lat: 23.7465,
        lng: 90.3760,
        weightKg: 100,
        category: 'PLASTICS',
      });

      // Verification: Batch query executed exactly ONCE, sequential query executed ZERO times
      expect(batchSpy).toHaveBeenCalledTimes(1);
      expect(sequentialSpy).toHaveBeenCalledTimes(0);

      const queriedIds = batchSpy.mock.calls[0][0];
      expect(queriedIds).toEqual(expect.arrayContaining([c1.id, c2.id, c3.id, c4.id]));

      // Eligibility checks:
      // c1: only 50kg remaining -> INSUFFICIENT_CAPACITY (requested 100kg)
      const evalC1 = result.runnersUp.find((e) => e.partner_id === c1.id);
      expect(evalC1?.eligible).toBe(false);
      expect(evalC1?.skip_reason).toBe('INSUFFICIENT_CAPACITY');
      expect(evalC1?.remaining_capacity_kg).toBe(50);

      // c4: eligible (400kg capacity, 0 committed)
      const evalC4 = result.runnersUp.find((e) => e.partner_id === c4.id);
      expect(evalC4?.eligible).toBe(true);
      expect(evalC4?.remaining_capacity_kg).toBe(400);

      // c2: eligible (500kg capacity, 0 committed)
      const evalC2 = result.runnersUp.find((e) => e.partner_id === c2.id);
      expect(evalC2?.eligible).toBe(true);

      // Best collector chosen must be nearest eligible (c4 is closer to Dhanmondi than c2)
      expect(result.best).not.toBeNull();
      expect(result.best?.partner.id).toBe(c4.id);

      batchSpy.mockRestore();
      sequentialSpy.mockRestore();
    });
  });
});
