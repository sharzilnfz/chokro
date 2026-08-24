import crypto from 'crypto';
import { db, partners, eq, dispatchAssignments } from '@chokro/db';
import { POST as createListingRoute } from '../app/api/listings/route';
import { POST as bookPickup, GET as listPickups } from '../app/api/pickups/route';
import { GET as getPickup } from '../app/api/pickups/[id]/route';
import { PATCH as updatePickupStatus } from '../app/api/pickups/[id]/status/route';
import { GET as collectorRoute } from '../app/api/pickups/collector-route/route';
import { authHeaders, createTestUser, resetTestStore, routeParams, tokenFor } from './test-utils';
import { partnerRepo } from '../lib/repos/partners';

const DHAKA = { lat: 23.7806, lng: 90.4192 };

async function createListing(token: string, body: Record<string, unknown>) {
  const response = await createListingRoute(new Request('http://localhost/api/listings', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  }));
  return (await response.json()).listing;
}

async function bookPickupRequest(token: string, listingId: string, coords = DHAKA) {
  return bookPickup(new Request('http://localhost/api/pickups', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      listingId,
      address: 'House 12, Road 5, Dhanmondi, Dhaka',
      lat: coords.lat,
      lng: coords.lng,
      scheduledFor: new Date(Date.now() + 3600_000).toISOString(),
      notes: 'Ring the bell twice',
    }),
  }));
}

async function createCollectorPartner(opts: {
  org: string;
  baseLat: number;
  baseLng: number;
  radiusKm?: number;
  capacityKg?: number | null;
  licensed?: boolean;
}) {
  const user = await createTestUser('PARTNER', `${crypto.randomUUID()}@collector.test.chokro.org`);
  const partner = await partnerRepo.apply({
    user_id: user.id,
    org_name: opts.org,
    types: ['COLLECTOR'],
    e_waste_licensed: opts.licensed ?? false,
    doe_license_doc: opts.licensed ? 'DOE-TEST-LICENCE.pdf' : null,
    status: 'VERIFIED',
  });
  await db
    .update(partners)
    .set({
      vehicle_label: 'Pickup van',
      vehicle_capacity_kg: opts.capacityKg != null ? String(opts.capacityKg) : null,
      base_lat: opts.baseLat,
      base_lng: opts.baseLng,
      service_radius_km: opts.radiusKm ?? 10,
    })
    .where(eq(partners.id, partner.id));
  return { user, partner };
}

describe('pickup dispatch API', () => {
  beforeEach(async () => {
    await resetTestStore();
    delete process.env.MAPBOX_TOKEN; // force the keyless haversine path
  });

  it('books a pickup, assigns the NEAREST eligible collector and writes a dispatch assignment', async () => {
    const customer = await createTestUser();
    const token = tokenFor(customer);
    const near = await createCollectorPartner({ org: 'Dhanmondi Vans', baseLat: 23.7810, baseLng: 90.4180, capacityKg: 500 });
    const far = await createCollectorPartner({ org: 'Savar Scrap Co', baseLat: 23.7481, baseLng: 90.3765, capacityKg: 500 });
    const listing = await createListing(token, { category: 'PLASTICS', unit: 'kg', declaredWeight: 12.5, declaredCondition: 'GOOD' });

    const response = await bookPickupRequest(token, listing.id);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.assignment_status).toBe('ASSIGNED');
    expect(data.pickup.status).toBe('ASSIGNED');
    expect(data.pickup.collector_partner_id).toBe(near.partner.id);
    expect(data.collector.partner.org_name).toBe('Dhanmondi Vans');
    expect(data.collector.distance_km).toBeLessThan(1);

    const nearEval = data.eligibility.find((e: { org_name: string }) => e.org_name === 'Dhanmondi Vans');
    const farEval = data.eligibility.find((e: { org_name: string }) => e.org_name === 'Savar Scrap Co');
    expect(nearEval.eligible).toBe(true);
    expect(farEval.eligible).toBe(true);
    expect(nearEval.distance_km).toBeLessThan(farEval.distance_km);

    const [assignment] = await db
      .select()
      .from(dispatchAssignments)
      .where(eq(dispatchAssignments.order_id, data.pickup.id));
    expect(assignment).toBeDefined();
    expect(assignment.collector_partner_id).toBe(near.partner.id);
    expect(assignment.stop_sequence).toBe(1);
  });

  it('skips collectors whose remaining vehicle capacity is below the requested weight', async () => {
    const customer = await createTestUser();
    const token = tokenFor(customer);
    const near = await createCollectorPartner({ org: 'Tiny Van', baseLat: 23.7810, baseLng: 90.4180, capacityKg: 150 });
    const far = await createCollectorPartner({ org: 'Big Van', baseLat: 23.7481, baseLng: 90.3765, capacityKg: 500 });

    // Commit 140 kg of the small van's 150 kg capacity with an earlier pickup.
    const heavyListing = await createListing(token, { category: 'PAPER', unit: 'kg', declaredWeight: 140, declaredCondition: 'GOOD' });
    const heavyBooking = await bookPickupRequest(token, heavyListing.id);
    expect((await heavyBooking.json()).pickup.collector_partner_id).toBe(near.partner.id);

    const listing = await createListing(token, { category: 'PLASTICS', unit: 'kg', declaredWeight: 12.5, declaredCondition: 'GOOD' });
    const response = await bookPickupRequest(token, listing.id);
    const data = await response.json();

    expect(response.status).toBe(201);
    // Only 10 kg remain on the near van — the 12.5 kg booking falls through to the far van.
    expect(data.pickup.collector_partner_id).toBe(far.partner.id);
    const nearEval = data.eligibility.find((e: { org_name: string }) => e.org_name === 'Tiny Van');
    expect(nearEval.eligible).toBe(false);
    expect(nearEval.skip_reason).toBe('INSUFFICIENT_CAPACITY');
    expect(nearEval.remaining_capacity_kg).toBe(10);
  });

  it('never assigns e-waste to an unlicensed collector', async () => {
    const customer = await createTestUser();
    const token = tokenFor(customer);
    const unlicensed = await createCollectorPartner({ org: 'No Licence Vans', baseLat: 23.7810, baseLng: 90.4180, capacityKg: 500 });
    const licensed = await createCollectorPartner({ org: 'Licensed E-Haulers', baseLat: 23.7481, baseLng: 90.3765, capacityKg: 500, licensed: true });
    const listing = await createListing(token, { category: 'E_WASTE', unit: 'piece', pieceCount: 2, declaredCondition: 'FAIR' });

    const response = await bookPickupRequest(token, listing.id);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.pickup.collector_partner_id).toBe(licensed.partner.id);
    const nearEval = data.eligibility.find((e: { org_name: string }) => e.org_name === 'No Licence Vans');
    expect(nearEval.eligible).toBe(false);
    expect(nearEval.skip_reason).toBe('E_WASTE_LICENSE_REQUIRED');
  });

  it('rejects invalid status transitions with 409 and enforces role permissions', async () => {
    const customer = await createTestUser();
    const token = tokenFor(customer);
    const listing = await createListing(token, { category: 'PLASTICS', unit: 'kg', declaredWeight: 12.5, declaredCondition: 'GOOD' });
    // No eligible collectors at all -> order stays REQUESTED / PENDING_COLLECTOR.
    const booking = await bookPickupRequest(token, listing.id);
    const booked = (await booking.json());
    expect(booking.status).toBe(201);
    expect(booked.assignment_status).toBe('PENDING_COLLECTOR');
    expect(booked.collector).toBeNull();
    expect(booked.pickup.collector_partner_id).toBeNull();

    const invalid = await updatePickupStatus(new Request(`http://localhost/api/pickups/${booked.pickup.id}/status`, {
      method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ status: 'COLLECTED' }),
    }), routeParams(booked.pickup.id));
    expect(invalid.status).toBe(409);

    // Customer may cancel a REQUESTED pickup; then it is terminal.
    const cancel = await updatePickupStatus(new Request(`http://localhost/api/pickups/${booked.pickup.id}/status`, {
      method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ status: 'CANCELLED' }),
    }), routeParams(booked.pickup.id));
    expect(cancel.status).toBe(200);
    expect((await cancel.json()).pickup.status).toBe('CANCELLED');
    const resurrect = await updatePickupStatus(new Request(`http://localhost/api/pickups/${booked.pickup.id}/status`, {
      method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ status: 'ASSIGNED' }),
    }), routeParams(booked.pickup.id));
    expect(resurrect.status).toBe(409);
  });

  it('lets the assigned collector advance ASSIGNED -> EN_ROUTE -> COLLECTED but not skip states', async () => {
    const customer = await createTestUser();
    const token = tokenFor(customer);
    const collector = await createCollectorPartner({ org: 'Dhanmondi Vans', baseLat: 23.7810, baseLng: 90.4180, capacityKg: 500 });
    const listing = await createListing(token, { category: 'PLASTICS', unit: 'kg', declaredWeight: 12.5, declaredCondition: 'GOOD' });
    const booking = await bookPickupRequest(token, listing.id);
    const orderId = (await booking.json()).pickup.id;

    // The customer cannot drive fulfilment states.
    const customerSkip = await updatePickupStatus(new Request(`http://localhost/api/pickups/${orderId}/status`, {
      method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ status: 'COLLECTED' }),
    }), routeParams(orderId));
    expect(customerSkip.status).toBe(403);

    const collectorToken = tokenFor(collector.user);
    const skip = await updatePickupStatus(new Request(`http://localhost/api/pickups/${orderId}/status`, {
      method: 'PATCH', headers: authHeaders(collectorToken), body: JSON.stringify({ status: 'COLLECTED' }),
    }), routeParams(orderId));
    expect(skip.status).toBe(409);

    const enRoute = await updatePickupStatus(new Request(`http://localhost/api/pickups/${orderId}/status`, {
      method: 'PATCH', headers: authHeaders(collectorToken), body: JSON.stringify({ status: 'EN_ROUTE' }),
    }), routeParams(orderId));
    expect(enRoute.status).toBe(200);

    const collected = await updatePickupStatus(new Request(`http://localhost/api/pickups/${orderId}/status`, {
      method: 'PATCH', headers: authHeaders(collectorToken), body: JSON.stringify({ status: 'COLLECTED' }),
    }), routeParams(orderId));
    expect(collected.status).toBe(200);
    expect((await collected.json()).pickup.status).toBe('COLLECTED');
  });

  it('optimizes the collector route via the deterministic haversine fallback (no MAPBOX_TOKEN)', async () => {
    const customer = await createTestUser();
    const token = tokenFor(customer);
    const collector = await createCollectorPartner({ org: 'Dhanmondi Vans', baseLat: DHAKA.lat, baseLng: DHAKA.lng, capacityKg: 500 });
    const collectorToken = tokenFor(collector.user);

    // Book stops in scrambled distance order; nearest-neighbour must still order them by proximity to base.
    const stops = [
      { coords: { lat: 23.7600, lng: 90.4100 }, weight: 8, category: 'PAPER' },
      { coords: { lat: 23.7815, lng: 90.4200 }, weight: 6, category: 'PLASTICS' },
      { coords: { lat: 23.7900, lng: 90.4250 }, weight: 4, category: 'CLOTHES' },
    ];
    for (const stop of stops) {
      const listing = await createListing(token, { category: stop.category, unit: 'kg', declaredWeight: stop.weight, declaredCondition: 'GOOD' });
      const response = await bookPickupRequest(token, listing.id, stop.coords);
      expect(response.status).toBe(201);
    }

    const response = await collectorRoute(new Request('http://localhost/api/pickups/collector-route', {
      headers: authHeaders(collectorToken),
    }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.routing_source).toBe('haversine_fallback');
    expect(data.stops).toHaveLength(3);
    // Expected nearest-neighbour order from base: PLASTICS (nearest), CLOTHES, PAPER (farthest).
    expect(data.stops.map((s: { listing: { category: string } }) => s.listing.category)).toEqual(['PLASTICS', 'CLOTHES', 'PAPER']);
    data.stops.forEach((stop: { stop_sequence: number; distance_from_previous_km: number; cumulative_eta_minutes: number }, index: number) => {
      expect(stop.stop_sequence).toBe(index + 1);
      expect(stop.distance_from_previous_km).toBeGreaterThan(0);
      if (index > 0) {
        expect(stop.cumulative_eta_minutes).toBeGreaterThan(data.stops[index - 1].cumulative_eta_minutes);
      }
    });

    const mine = await listPickups(new Request('http://localhost/api/pickups', { headers: authHeaders(collectorToken) }));
    const mineData = await mine.json();
    expect(mineData.collectorPickups).toHaveLength(3);
  });

  it('optimizes the collector route via OSRM OpenStreetMap matrix when available', async () => {
    const originalFetch = global.fetch;
    process.env.TEST_ENABLE_OSRM = 'true';

    const customer = await createTestUser();
    const token = tokenFor(customer);
    const collector = await createCollectorPartner({ org: 'OSM Express', baseLat: DHAKA.lat, baseLng: DHAKA.lng, capacityKg: 500 });
    const collectorToken = tokenFor(collector.user);

    const listing1 = await createListing(token, { category: 'PLASTICS', unit: 'kg', declaredWeight: 5, declaredCondition: 'GOOD' });
    await bookPickupRequest(token, listing1.id, { lat: 23.7815, lng: 90.4200 });

    const osrmResponse = {
      code: 'Ok',
      distances: [
        [0, 1500],
        [1500, 0],
      ],
      durations: [
        [0, 360],
        [360, 0],
      ],
    };

    const fetchSpy = jest.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify(osrmResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    global.fetch = fetchSpy as unknown as typeof fetch;

    try {
      const response = await collectorRoute(new Request('http://localhost/api/pickups/collector-route', {
        headers: authHeaders(collectorToken),
      }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.routing_source).toBe('osrm');
      expect(data.stops).toHaveLength(1);
      expect(data.stops[0].distance_from_previous_km).toBe(1.5);
      expect(data.stops[0].cumulative_eta_minutes).toBe(6);
      expect(fetchSpy).toHaveBeenCalled();
      const [calledUrl] = fetchSpy.mock.calls[0];
      expect(String(calledUrl)).toContain('router.project-osrm.org/table/v1/driving');
    } finally {
      global.fetch = originalFetch;
      delete process.env.TEST_ENABLE_OSRM;
    }
  });

  it('books only the caller&apos;s own ACTIVE listings and scopes pickup reads', async () => {
    const customer = await createTestUser();
    const other = await createTestUser();
    const othersListing = await createListing(tokenFor(other), { category: 'PLASTICS', unit: 'kg', declaredWeight: 12.5, declaredCondition: 'GOOD' });

    const forbidden = await bookPickupRequest(tokenFor(customer), othersListing.id);
    expect(forbidden.status).toBe(403);

    const own = await createListing(tokenFor(customer), { category: 'PLASTICS', unit: 'kg', declaredWeight: 12.5, declaredCondition: 'GOOD', status: 'DRAFT' });
    const inactive = await bookPickupRequest(tokenFor(customer), own.id);
    expect(inactive.status).toBe(400);

    // Scoped detail read: owner yes, stranger no.
    const collector = await createCollectorPartner({ org: 'Dhanmondi Vans', baseLat: 23.7810, baseLng: 90.4180, capacityKg: 500 });
    const activeListing = await createListing(tokenFor(customer), { category: 'PLASTICS', unit: 'kg', declaredWeight: 12.5, declaredCondition: 'GOOD' });
    const booking = await bookPickupRequest(tokenFor(customer), activeListing.id);
    const orderId = (await booking.json()).pickup.id;

    const asOwner = await getPickup(new Request(`http://localhost/api/pickups/${orderId}`, { headers: authHeaders(tokenFor(customer)) }), routeParams(orderId));
    const asStranger = await getPickup(new Request(`http://localhost/api/pickups/${orderId}`, { headers: authHeaders(tokenFor(other)) }), routeParams(orderId));
    const asCollector = await getPickup(new Request(`http://localhost/api/pickups/${orderId}`, { headers: authHeaders(tokenFor(collector.user)) }), routeParams(orderId));
    expect(asOwner.status).toBe(200);
    expect(asStranger.status).toBe(403);
    expect(asCollector.status).toBe(200);
  });
});
