// SPEC 19 — Drop-Zone Network Telemetry & Print-Ready Poster Infrastructure
// Comprehensive test suite verifying fill ratio modeling, auto-empty dispatch at >=85%,
// HMAC-SHA256 constant-time signed QR codes, SVG poster fallback, and locator endpoints.

import crypto from 'crypto';
import {
  db,
  dropZones,
  zoneCapacityLogs,
  pickupOrders,
  partners,
  users,
  eq,
} from '@chokro/db';
import { POST as recordTelemetryRoute } from '../app/api/drop-zones/[id]/telemetry/route';
import { GET as getPosterRoute } from '../app/api/drop-zones/[id]/poster/route';
import { GET as getLocatorRoute } from '../app/api/drop-zones/locator/route';
import { GET as getAdminTelemetryRoute } from '../app/api/admin/drop-zones/telemetry/route';
import { DropZoneTelemetryDomain } from '../lib/domain/DropZoneTelemetryDomain';
import { createQrToken, isValidQrToken } from '../lib/qr';
import {
  authHeaders,
  createTestUser,
  resetTestStore,
  routeParams,
  tokenFor,
} from './test-utils';

describe('SPEC 19 — Drop-Zone Telemetry & Dynamic Poster Infrastructure (Ticket 04)', () => {
  beforeEach(async () => {
    await resetTestStore();
  });

  describe('1. Fill-Rate Modeling & Threshold Classification', () => {
    it('calculates fill ratio accurately across normal, approaching capacity, and overflow bands', () => {
      const normalLow = DropZoneTelemetryDomain.calculateFillStatus(0, 50);
      expect(normalLow.percentage).toBe(0);
      expect(normalLow.status).toBe('NORMAL');
      expect(normalLow.indicatorText).toContain('Plenty of space');

      const normalMid = DropZoneTelemetryDomain.calculateFillStatus(35, 50);
      expect(normalMid.percentage).toBe(70);
      expect(normalMid.status).toBe('NORMAL');
      expect(normalMid.indicatorText).toContain('Moderately full');

      const approaching = DropZoneTelemetryDomain.calculateFillStatus(42.5, 50);
      expect(approaching.percentage).toBe(85);
      expect(approaching.status).toBe('APPROACHING_CAPACITY');
      expect(approaching.indicatorText).toContain('Nearly full');

      const fullAlarm = DropZoneTelemetryDomain.calculateFillStatus(50, 50);
      expect(fullAlarm.percentage).toBe(100);
      expect(fullAlarm.status).toBe('OVERFLOW_ALARM');
      expect(fullAlarm.indicatorText).toContain('Full / Overflow Alarm');

      const overflow = DropZoneTelemetryDomain.calculateFillStatus(60, 50);
      expect(overflow.percentage).toBe(120);
      expect(overflow.status).toBe('OVERFLOW_ALARM');
    });
  });

  describe('2. Telemetry Ingestion & Snapshot Logging (zone_capacity_logs)', () => {
    it('updates zone current_fill_kg and writes snapshot log entry to zone_capacity_logs', async () => {
      const admin = await createTestUser('ADMIN');
      const zoneId = crypto.randomUUID();
      const qrToken = createQrToken();

      await db.insert(dropZones).values({
        id: zoneId,
        institution_id: 'BUET',
        name: 'BUET ECE Building Bin',
        geo_location: { lat: 23.726, lng: 90.392 },
        qr_token: qrToken,
        accepted_categories: ['PLASTICS', 'PAPER'],
        max_capacity_kg: '50.00',
        current_fill_kg: '0.00',
        status: 'ACTIVE',
      });

      const req = new Request(`http://localhost/api/drop-zones/${zoneId}/telemetry`, {
        method: 'POST',
        headers: authHeaders(tokenFor(admin)),
        body: JSON.stringify({
          currentFillKg: 25.5,
          triggerReason: 'DEPOSIT_ACCUMULATION',
        }),
      });

      const res = await recordTelemetryRoute(req, routeParams(zoneId));
      expect(res.status).toBe(201);
      const data = await res.json();

      expect(data.dropZone.current_fill_kg).toBe('25.50');
      expect(data.telemetry.capacity_percentage).toBe(51);
      expect(data.telemetry.status).toBe('NORMAL');
      expect(data.dispatchTriggered).toBe(false);

      // Verify persisted row in zone_capacity_logs
      const logs = await db
        .select()
        .from(zoneCapacityLogs)
        .where(eq(zoneCapacityLogs.zone_id, zoneId));
      expect(logs).toHaveLength(1);
      expect(logs[0].recorded_fill_kg).toBe('25.50');
      expect(logs[0].capacity_percentage).toBe(51);
      expect(logs[0].status).toBe('NORMAL');
      expect(logs[0].trigger_reason).toBe('DEPOSIT_ACCUMULATION');
    });

    it('requires admin authorization and rejects unauthenticated or invalid payloads', async () => {
      const user = await createTestUser('INDIVIDUAL');
      const zoneId = crypto.randomUUID();

      const unauthReq = new Request(`http://localhost/api/drop-zones/${zoneId}/telemetry`, {
        method: 'POST',
        body: JSON.stringify({ currentFillKg: 20 }),
      });
      const unauthRes = await recordTelemetryRoute(unauthReq, routeParams(zoneId));
      expect(unauthRes.status).toBe(401);

      const forbiddenReq = new Request(`http://localhost/api/drop-zones/${zoneId}/telemetry`, {
        method: 'POST',
        headers: authHeaders(tokenFor(user)),
        body: JSON.stringify({ currentFillKg: 20 }),
      });
      const forbiddenRes = await recordTelemetryRoute(forbiddenReq, routeParams(zoneId));
      expect(forbiddenRes.status).toBe(403);
    });
  });

  describe('3. Automated High-Capacity Dispatch Trigger at >= 85%', () => {
    it('spawns high-priority pickup_orders task assigned to contracted partner when fill >= 85%', async () => {
      const admin = await createTestUser('ADMIN');
      const partnerUser = await createTestUser('PARTNER');
      const partnerId = crypto.randomUUID();

      // Seed a verified collector partner
      await db.insert(partners).values({
        id: partnerId,
        user_id: partnerUser.id,
        org_name: 'Dhaka Green Collectors Ltd',
        types: ['COLLECTOR', 'RECYCLER'],
        e_waste_licensed: true,
        status: 'VERIFIED',
      });

      const zoneId = crypto.randomUUID();
      await db.insert(dropZones).values({
        id: zoneId,
        institution_id: 'BRACU',
        name: 'BRACU Cafeteria Smart Bin',
        geo_location: { lat: 23.774, lng: 90.425 },
        qr_token: createQrToken(),
        accepted_categories: ['PLASTICS', 'METAL', 'PAPER'],
        max_capacity_kg: '60.00',
        current_fill_kg: '10.00',
        contracted_partner_id: partnerId,
        status: 'ACTIVE',
      });

      // Submit telemetry with 54kg fill -> (54 / 60) * 100 = 90% (>= 85%)
      const req = new Request(`http://localhost/api/drop-zones/${zoneId}/telemetry`, {
        method: 'POST',
        headers: authHeaders(tokenFor(admin)),
        body: JSON.stringify({
          currentFillKg: 54.0,
          triggerReason: 'DEPOSIT_ACCUMULATION',
        }),
      });

      const res = await recordTelemetryRoute(req, routeParams(zoneId));
      expect(res.status).toBe(201);
      const data = await res.json();

      expect(data.dispatchTriggered).toBe(true);
      expect(data.pickupOrder).toBeDefined();
      expect(data.pickupOrder.collector_partner_id).toBe(partnerId);
      expect(data.pickupOrder.status).toBe('REQUESTED');
      expect(data.pickupOrder.notes).toContain('CAPACITY_ALERT');
      expect(data.pickupOrder.notes).toContain('90% capacity');

      // Assert zoneCapacityLogs row has APPROACHING_CAPACITY
      const logs = await db
        .select()
        .from(zoneCapacityLogs)
        .where(eq(zoneCapacityLogs.zone_id, zoneId));
      expect(logs).toHaveLength(1);
      expect(logs[0].capacity_percentage).toBe(90);
      expect(logs[0].status).toBe('APPROACHING_CAPACITY');

      // Assert pickup_orders row in DB
      const orders = await db
        .select()
        .from(pickupOrders)
        .where(eq(pickupOrders.collector_partner_id, partnerId));
      expect(orders).toHaveLength(1);
      expect(orders[0].address).toContain('BRACU Cafeteria Smart Bin');
    });

    it('handles collector emptying and resets zone current_fill_kg and updates last_emptied_at', async () => {
      const admin = await createTestUser('ADMIN');
      const zoneId = crypto.randomUUID();

      await db.insert(dropZones).values({
        id: zoneId,
        institution_id: 'NSU',
        name: 'NSU Plaza Bin',
        geo_location: { lat: 23.815, lng: 90.426 },
        qr_token: createQrToken(),
        accepted_categories: ['PLASTICS'],
        max_capacity_kg: '50.00',
        current_fill_kg: '48.00',
        status: 'ACTIVE',
      });

      // Submit emptying telemetry
      const req = new Request(`http://localhost/api/drop-zones/${zoneId}/telemetry`, {
        method: 'POST',
        headers: authHeaders(tokenFor(admin)),
        body: JSON.stringify({
          currentFillKg: 0,
          triggerReason: 'COLLECTOR_EMPTYING',
        }),
      });

      const res = await recordTelemetryRoute(req, routeParams(zoneId));
      expect(res.status).toBe(201);
      const data = await res.json();

      expect(data.dropZone.current_fill_kg).toBe('0.00');
      expect(data.dropZone.last_emptied_at).not.toBeNull();
      expect(data.telemetry.capacity_percentage).toBe(0);
      expect(data.telemetry.status).toBe('NORMAL');
      expect(data.telemetry.trigger_reason).toBe('COLLECTOR_EMPTYING');
    });
  });

  describe('4. Cryptographic HMAC Poster Generation with Vector SVG Fallback', () => {
    it('generates print-ready HTML poster with HMAC-SHA256 QR code and vector SVG fallback in degraded mode', async () => {
      const admin = await createTestUser('ADMIN');
      const zoneId = crypto.randomUUID();
      const qrToken = createQrToken();

      await db.insert(dropZones).values({
        id: zoneId,
        institution_id: 'BUET',
        name: 'Civil Dept Waste Station',
        geo_location: { lat: 23.726, lng: 90.392 },
        qr_token: qrToken,
        accepted_categories: ['PAPER', 'METAL', 'E_WASTE'],
        max_capacity_kg: '75.00',
        status: 'ACTIVE',
      });

      // Ensure GOOGLE_STATIC_MAPS_KEY is unset for degraded mode testing
      const prevKey = process.env.GOOGLE_STATIC_MAPS_KEY;
      delete process.env.GOOGLE_STATIC_MAPS_KEY;

      const req = new Request(`http://localhost/api/drop-zones/${zoneId}/poster`, {
        method: 'GET',
        headers: authHeaders(tokenFor(admin)),
      });

      const res = await getPosterRoute(req, routeParams(zoneId));
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('text/html');
      expect(res.headers.get('X-Poster-Degraded')).toBe('true');

      const html = await res.text();
      expect(html).toContain('Civil Dept Waste Station');
      expect(html).toContain('BUET');
      expect(html).toContain('HMAC-SHA256 Cryptographically Signed');
      expect(html).toContain('vector-grid-svg');
      expect(html).toContain('<svg');

      // Verify QR token constant-time validity
      expect(isValidQrToken(qrToken)).toBe(true);

      // Test format=svg parameter
      const svgReq = new Request(`http://localhost/api/drop-zones/${zoneId}/poster?format=svg`, {
        method: 'GET',
        headers: authHeaders(tokenFor(admin)),
      });
      const svgRes = await getPosterRoute(svgReq, routeParams(zoneId));
      expect(svgRes.status).toBe(200);
      expect(svgRes.headers.get('Content-Type')).toContain('image/svg+xml');

      if (prevKey) process.env.GOOGLE_STATIC_MAPS_KEY = prevKey;
    });
  });

  describe('5. In-App Zone Locator API with Dynamic Fill Levels', () => {
    it('returns active zones with fill percentages, capacity statuses, and distances sorted by proximity', async () => {
      // Seed BRACU Zone in Badda (23.774, 90.425) - 45kg/50kg = 90% fill
      await db.insert(dropZones).values({
        id: crypto.randomUUID(),
        institution_id: 'BRACU',
        name: 'BRACU North Bin',
        geo_location: { lat: 23.774, lng: 90.425 },
        qr_token: createQrToken(),
        accepted_categories: ['PLASTICS'],
        max_capacity_kg: '50.00',
        current_fill_kg: '45.00',
        status: 'ACTIVE',
      });

      // Seed BUET Zone in Palashi (23.726, 90.392) - 10kg/50kg = 20% fill
      await db.insert(dropZones).values({
        id: crypto.randomUUID(),
        institution_id: 'BUET',
        name: 'BUET South Bin',
        geo_location: { lat: 23.726, lng: 90.392 },
        qr_token: createQrToken(),
        accepted_categories: ['PAPER'],
        max_capacity_kg: '50.00',
        current_fill_kg: '10.00',
        status: 'ACTIVE',
      });

      // Query near BRACU (23.775, 90.426) with 5km radius
      const req = new Request('http://localhost/api/drop-zones/locator?lat=23.775&lng=90.426&radiusKm=5', {
        method: 'GET',
      });

      const res = await getLocatorRoute(req);
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.zones).toHaveLength(1);
      const nearest = body.zones[0];
      expect(nearest.name).toBe('BRACU North Bin');
      expect(nearest.fill_percentage).toBe(90);
      expect(nearest.fill_status).toBe('APPROACHING_CAPACITY');
      expect(nearest.distance_km).toBeLessThan(1);
    });
  });

  describe('6. Admin Telemetry Overview Dashboard (A03)', () => {
    it('summarizes network-wide capacity metrics, critical zones, and snapshot history', async () => {
      const admin = await createTestUser('ADMIN');

      const zone1Id = crypto.randomUUID();
      const zone2Id = crypto.randomUUID();

      await db.insert(dropZones).values([
        {
          id: zone1Id,
          institution_id: 'IUT',
          name: 'IUT Gazipur Bin',
          geo_location: { lat: 23.948, lng: 90.379 },
          qr_token: createQrToken(),
          accepted_categories: ['METAL'],
          max_capacity_kg: '100.00',
          current_fill_kg: '90.00', // 90% (Critical)
          status: 'ACTIVE',
        },
        {
          id: zone2Id,
          institution_id: 'DU',
          name: 'DU Curzon Hall Bin',
          geo_location: { lat: 23.727, lng: 90.401 },
          qr_token: createQrToken(),
          accepted_categories: ['CLOTHES'],
          max_capacity_kg: '50.00',
          current_fill_kg: '10.00', // 20%
          status: 'ACTIVE',
        },
      ]);

      // Record a telemetry log for zone1
      await db.insert(zoneCapacityLogs).values({
        id: crypto.randomUUID(),
        zone_id: zone1Id,
        recorded_fill_kg: '90.00',
        capacity_percentage: 90,
        status: 'APPROACHING_CAPACITY',
        trigger_reason: 'DEPOSIT_ACCUMULATION',
        logged_at: new Date(),
      });

      const req = new Request('http://localhost/api/admin/drop-zones/telemetry', {
        method: 'GET',
        headers: authHeaders(tokenFor(admin)),
      });

      const res = await getAdminTelemetryRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.metrics.totalZones).toBe(2);
      expect(data.metrics.criticalZonesCount).toBe(1);
      expect(data.metrics.totalFillKg).toBe(100);
      expect(data.metrics.totalCapacityKg).toBe(150);
      expect(data.zones).toHaveLength(2);
      expect(data.recentLogs).toHaveLength(1);
      expect(data.recentLogs[0].zoneName).toBe('IUT Gazipur Bin');
    });
  });
});
