// SPEC 11: Verified Deposit Path — Drop Zone Session -> Deposit -> Pending Green Credit (m4 Imran F2)
import { db, dropZones, partners, rateCardEntries, creditTxns, depositRecords, dropSessions } from '@chokro/db';
import { POST as openDropSession } from '../app/api/drop-sessions/route';
import { POST as recordDeposit } from '../app/api/deposits/route';
import { POST as emptyDropZone } from '../app/api/drop-zones/[id]/empty/route';
import { GET as getWalletBalance } from '../app/api/wallet/balance/route';
import { createTestUser, resetTestStore, authHeaders, tokenFor, routeParams } from './test-utils';

describe('SPEC 11: Verified Deposit Path', () => {
  let user: Awaited<ReturnType<typeof createTestUser>>;
  let partnerUser: Awaited<ReturnType<typeof createTestUser>>;
  let userToken: string;
  let partnerToken: string;
  let partnerId: string;
  let zoneId: string;
  let zoneQrToken: string;

  beforeEach(async () => {
    await resetTestStore();
    user = await createTestUser('INDIVIDUAL', 'student@campus.ac.bd');
    partnerUser = await createTestUser('PARTNER', 'partner@recycler.com');
    userToken = tokenFor(user);
    partnerToken = tokenFor(partnerUser);

    // Seed verified recycling partner with e-waste licence
    const [p] = await db.insert(partners).values({
      user_id: partnerUser.id,
      org_name: 'Green Dhaka Recyclers',
      types: ['COLLECTOR', 'RECYCLER'],
      e_waste_licensed: true,
      status: 'VERIFIED',
    }).returning();
    partnerId = p.id;

    // Seed drop zone
    zoneQrToken = 'ZONE-CAMPUS-01-SECURE-TOKEN';
    const [z] = await db.insert(dropZones).values({
      institution_id: 'campus-du',
      name: 'Curzon Hall Eco-Hub',
      qr_token: zoneQrToken,
      accepted_categories: ['PLASTICS', 'PAPER', 'E_WASTE'],
      status: 'ACTIVE',
      max_capacity_kg: '100.00',
      current_fill_kg: '0.00',
      contracted_partner_id: partnerId,
    }).returning();
    zoneId = z.id;

    // Seed published rate card entries (provenance reference)
    await db.insert(rateCardEntries).values([
      {
        category: 'PLASTICS',
        condition_band: 'GOOD',
        unit: 'kg',
        price_bdt: '50.00',
      },
      {
        category: 'E_WASTE',
        condition_band: 'GOOD',
        unit: 'piece',
        price_bdt: '200.00',
      },
    ]);
  });

  describe('Happy Path: End-to-End Deposit Corridor & Scale Emptying', () => {
    it('opens session, records deposit, mints pending credit, and updates on scale emptying', async () => {
      // 1. User scans QR code and opens single-use session
      const sessionReq = new Request('http://localhost/api/v1/drop-sessions', {
        method: 'POST',
        headers: authHeaders(userToken),
        body: JSON.stringify({ qrToken: zoneQrToken, zoneId }),
      });
      const sessionRes = await openDropSession(sessionReq);
      expect(sessionRes.status).toBe(201);
      const sessionData = await sessionRes.json();
      const sessionId = sessionData.sessionId;
      expect(sessionId).toBeDefined();
      expect(sessionData.shortCode).toHaveLength(6);
      expect(sessionData.zone.name).toBe('Curzon Hall Eco-Hub');

      // 2. User records deposit with camera evidence (10 kg Plastics)
      const depositReq = new Request('http://localhost/api/v1/deposits', {
        method: 'POST',
        headers: authHeaders(userToken),
        body: JSON.stringify({
          sessionId,
          category: 'PLASTICS',
          declaredQuantity: 10,
          unit: 'kg',
          evidenceUrl: 'https://evidence.chokro.org/dep-photo-1.jpg',
        }),
      });
      const depositRes = await recordDeposit(depositReq);
      expect(depositRes.status).toBe(201);
      const depositData = await depositRes.json();
      const depositId = depositData.deposit.id;
      expect(depositId).toBeDefined();
      expect(Number(depositData.estimatedBdt)).toBe(500); // 10kg * 50 BDT/kg

      // 3. Verify exactly one PENDING EARN credit is created with custody reference
      const balanceReq = new Request('http://localhost/api/v1/wallet/balance', {
        headers: authHeaders(userToken),
      });
      const balanceRes = await getWalletBalance(balanceReq);
      const balanceData = await balanceRes.json();
      expect(balanceData.balance.verified).toBe(0);
      expect(balanceData.balance.pending).toBe(500);

      // 4. Partner empties zone and submits scale reading (measured 8 kg Plastics)
      const emptyReq = new Request(`http://localhost/api/v1/drop-zones/${zoneId}/empty`, {
        method: 'POST',
        headers: authHeaders(partnerToken),
        body: JSON.stringify({
          scaleReadings: { PLASTICS: 8 },
          evidenceUrl: 'https://evidence.chokro.org/scale-photo-1.jpg',
        }),
      });
      const emptyRes = await emptyDropZone(emptyReq, routeParams(zoneId));
      expect(emptyRes.status).toBe(200);

      // 5. Verify deposit record is updated with verified quantity, BDT, and divergence ratio
      const [updatedDeposit] = await db
        .select()
        .from(depositRecords)
        .where(require('@chokro/db').eq(depositRecords.id, depositId));
      expect(Number(updatedDeposit.verified_quantity)).toBe(8);
      expect(Number(updatedDeposit.verified_bdt)).toBe(400); // 8kg * 50 BDT/kg
      expect(Number(updatedDeposit.divergence_ratio)).toBe(0.2); // |10 - 8| / 10 = 0.200

      // 6. Verify pending credit amount was updated to 400 BDT
      const updatedBalanceRes = await getWalletBalance(balanceReq);
      const updatedBalanceData = await updatedBalanceRes.json();
      expect(updatedBalanceData.balance.verified).toBe(0);
      expect(updatedBalanceData.balance.pending).toBe(400);

      // 7. Verify drop zone fill level is reset
      const [updatedZone] = await db
        .select()
        .from(dropZones)
        .where(require('@chokro/db').eq(dropZones.id, zoneId));
      expect(Number(updatedZone.current_fill_kg)).toBe(0);
    });
  });

  describe('Session Integrity & Concurrency Controls', () => {
    it('prevents reusing a consumed deposit session', async () => {
      // Open session
      const sessionReq = new Request('http://localhost/api/v1/drop-sessions', {
        method: 'POST',
        headers: authHeaders(userToken),
        body: JSON.stringify({ qrToken: zoneQrToken }),
      });
      const sessionRes = await openDropSession(sessionReq);
      const sessionData = await sessionRes.json();
      const sessionId = sessionData.sessionId;

      // First deposit consumes session
      const depositReq1 = new Request('http://localhost/api/v1/deposits', {
        method: 'POST',
        headers: authHeaders(userToken),
        body: JSON.stringify({
          sessionId,
          category: 'PLASTICS',
          declaredQuantity: 5,
          unit: 'kg',
          evidenceUrl: 'https://evidence.chokro.org/dep-photo-1.jpg',
        }),
      });
      const res1 = await recordDeposit(depositReq1);
      expect(res1.status).toBe(201);

      // Second deposit with same session fails
      const depositReq2 = new Request('http://localhost/api/v1/deposits', {
        method: 'POST',
        headers: authHeaders(userToken),
        body: JSON.stringify({
          sessionId,
          category: 'PLASTICS',
          declaredQuantity: 5,
          unit: 'kg',
          evidenceUrl: 'https://evidence.chokro.org/dep-photo-2.jpg',
        }),
      });
      const res2 = await recordDeposit(depositReq2);
      expect(res2.status).toBe(400);
    });

    it('returns existing open session on duplicate scan (session stacking guard)', async () => {
      const req1 = new Request('http://localhost/api/v1/drop-sessions', {
        method: 'POST',
        headers: authHeaders(userToken),
        body: JSON.stringify({ qrToken: zoneQrToken }),
      });
      const res1 = await openDropSession(req1);
      const data1 = await res1.json();

      const req2 = new Request('http://localhost/api/v1/drop-sessions', {
        method: 'POST',
        headers: authHeaders(userToken),
        body: JSON.stringify({ qrToken: zoneQrToken }),
      });
      const res2 = await openDropSession(req2);
      const data2 = await res2.json();

      expect(data1.sessionId).toBe(data2.sessionId);
    });
  });

  describe('Category & Licensing Invariants', () => {
    it('rejects unaccepted category at the zone', async () => {
      const sessionReq = new Request('http://localhost/api/v1/drop-sessions', {
        method: 'POST',
        headers: authHeaders(userToken),
        body: JSON.stringify({ qrToken: zoneQrToken }),
      });
      const sessionRes = await openDropSession(sessionReq);
      const { sessionId } = await sessionRes.json();

      // Attempt to deposit GLASS (zone accepts PLASTICS, PAPER, E_WASTE)
      const depositReq = new Request('http://localhost/api/v1/deposits', {
        method: 'POST',
        headers: authHeaders(userToken),
        body: JSON.stringify({
          sessionId,
          category: 'GLASS',
          declaredQuantity: 5,
          unit: 'kg',
          evidenceUrl: 'https://evidence.chokro.org/glass.jpg',
        }),
      });
      const depositRes = await recordDeposit(depositReq);
      expect(depositRes.status).toBe(400);
    });

    it('enforces dual-unit rule (e-waste requires piece unit)', async () => {
      const sessionReq = new Request('http://localhost/api/v1/drop-sessions', {
        method: 'POST',
        headers: authHeaders(userToken),
        body: JSON.stringify({ qrToken: zoneQrToken }),
      });
      const sessionRes = await openDropSession(sessionReq);
      const { sessionId } = await sessionRes.json();

      // Attempt e-waste with kg unit
      const depositReq = new Request('http://localhost/api/v1/deposits', {
        method: 'POST',
        headers: authHeaders(userToken),
        body: JSON.stringify({
          sessionId,
          category: 'E_WASTE',
          declaredQuantity: 2,
          unit: 'kg', // invalid, must be piece
          evidenceUrl: 'https://evidence.chokro.org/ewaste.jpg',
        }),
      });
      const depositRes = await recordDeposit(depositReq);
      expect(depositRes.status).toBe(400);
    });
  });

  describe('Proportional Bin Mass Apportionment Across Multiple Users', () => {
    it('distributes measured bin mass proportionally across window deposits', async () => {
      const user2 = await createTestUser('INDIVIDUAL', 'user2@campus.ac.bd');
      const user2Token = tokenFor(user2);

      // User 1 deposits 10 kg Plastics
      const s1Res = await openDropSession(new Request('http://localhost/api/v1/drop-sessions', {
        method: 'POST',
        headers: authHeaders(userToken),
        body: JSON.stringify({ qrToken: zoneQrToken }),
      }));
      const { sessionId: s1 } = await s1Res.json();
      const dep1Res = await recordDeposit(new Request('http://localhost/api/v1/deposits', {
        method: 'POST',
        headers: authHeaders(userToken),
        body: JSON.stringify({
          sessionId: s1,
          category: 'PLASTICS',
          declaredQuantity: 10,
          unit: 'kg',
          evidenceUrl: 'https://evidence.chokro.org/u1.jpg',
        }),
      }));
      const { deposit: d1 } = await dep1Res.json();

      // User 2 deposits 30 kg Plastics (Ratio 1 : 3)
      const s2Res = await openDropSession(new Request('http://localhost/api/v1/drop-sessions', {
        method: 'POST',
        headers: authHeaders(user2Token),
        body: JSON.stringify({ qrToken: zoneQrToken }),
      }));
      const { sessionId: s2 } = await s2Res.json();
      const dep2Res = await recordDeposit(new Request('http://localhost/api/v1/deposits', {
        method: 'POST',
        headers: authHeaders(user2Token),
        body: JSON.stringify({
          sessionId: s2,
          category: 'PLASTICS',
          declaredQuantity: 30,
          unit: 'kg',
          evidenceUrl: 'https://evidence.chokro.org/u2.jpg',
        }),
      }));
      const { deposit: d2 } = await dep2Res.json();

      // Collector empties bin with 32 kg Plastics scale reading
      const emptyRes = await emptyDropZone(new Request(`http://localhost/api/v1/drop-zones/${zoneId}/empty`, {
        method: 'POST',
        headers: authHeaders(partnerToken),
        body: JSON.stringify({
          scaleReadings: { PLASTICS: 32 },
        }),
      }), routeParams(zoneId));
      expect(emptyRes.status).toBe(200);

      // Verify User 1 gets 8 kg (10/40 * 32) and User 2 gets 24 kg (30/40 * 32)
      const [u1Dep] = await db.select().from(depositRecords).where(require('@chokro/db').eq(depositRecords.id, d1.id));
      const [u2Dep] = await db.select().from(depositRecords).where(require('@chokro/db').eq(depositRecords.id, d2.id));

      expect(Number(u1Dep.verified_quantity)).toBe(8);
      expect(Number(u2Dep.verified_quantity)).toBe(24);
      expect(Number(u1Dep.verified_quantity) + Number(u2Dep.verified_quantity)).toBe(32); // Exact mass conservation
    });
  });
});
