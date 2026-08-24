import { db, partners, zoneCapacityLogs, zoneEmptyingRecords } from '../index';
import { and, eq } from 'drizzle-orm';
// Seed scenario section 07 — moved verbatim from the original seed().
import { upsertDropZoneRecord } from './helpers';
import type { SeedContext } from './context';

export async function run(ctx: SeedContext): Promise<void> {
  const { partnerBengalCollector, partnerDhakaRecycler, partnerCollector1 } = ctx.partners;

  // =========================================================================
  // 7. DROP ZONES & TELEMETRY LOGS
  // =========================================================================
  
  const bracuZone = await upsertDropZoneRecord({
    institutionId: 'BRACU',
    name: 'BRACU Building 1 Cafeteria Bin',
    qrToken: 'ZONE-BRACU-01',
    acceptedCategories: ['PLASTICS', 'PAPER', 'METAL'],
    geoLocation: { lat: 23.7740, lng: 90.4250, address: 'Kha-224, Bir Uttam Rafiqul Islam Ave, Merul Badda, Dhaka' },
    maxCapacityKg: '100.00',
    currentFillKg: '45.00',
    status: 'ACTIVE',
    contractedPartnerId: partnerBengalCollector.id,
  });

  const buetZone = await upsertDropZoneRecord({
    institutionId: 'BUET',
    name: 'BUET Civil Dept Green Hub',
    qrToken: 'ZONE-BUET-02',
    acceptedCategories: ['PLASTICS', 'E_WASTE', 'PAPER'],
    geoLocation: { lat: 23.7260, lng: 90.3920, address: 'Civil Dept Ground Floor, BUET Campus, Palashi, Dhaka' },
    maxCapacityKg: '150.00',
    currentFillKg: '68.00',
    status: 'ACTIVE',
    contractedPartnerId: partnerDhakaRecycler.id,
  });

  const nsuZone = await upsertDropZoneRecord({
    institutionId: 'NSU',
    name: 'NSU Student Lounge Drop Point',
    qrToken: 'ZONE-NSU-03',
    acceptedCategories: ['PLASTICS', 'BOOKS', 'CLOTHES'],
    geoLocation: { lat: 23.8150, lng: 90.4270, address: 'Level 3 Student Lounge, NSU Campus, Bashundhara, Dhaka' },
    maxCapacityKg: '80.00',
    currentFillKg: '70.40',
    status: 'ACTIVE',
    contractedPartnerId: partnerCollector1.id,
  });

  // Telemetry logs
  const zoneLogs = [
    { zoneId: bracuZone.id, recordedFillKg: '45.00', capacityPercentage: 45, status: 'NORMAL', triggerReason: 'DEPOSIT_ACCUMULATION' },
    { zoneId: bracuZone.id, recordedFillKg: '25.00', capacityPercentage: 25, status: 'NORMAL', triggerReason: 'COLLECTOR_EMPTYING' },
    { zoneId: buetZone.id, recordedFillKg: '68.00', capacityPercentage: 45, status: 'NORMAL', triggerReason: 'DEPOSIT_ACCUMULATION' },
    { zoneId: buetZone.id, recordedFillKg: '102.00', capacityPercentage: 68, status: 'NORMAL', triggerReason: 'SENSOR_TELEMETRY' },
    { zoneId: nsuZone.id, recordedFillKg: '50.00', capacityPercentage: 62, status: 'NORMAL', triggerReason: 'DEPOSIT_ACCUMULATION' },
    { zoneId: nsuZone.id, recordedFillKg: '70.40', capacityPercentage: 88, status: 'OVERFLOW_ALARM', triggerReason: 'SENSOR_TELEMETRY' },
  ];

  for (const log of zoneLogs) {
    const [existing] = await db
      .select()
      .from(zoneCapacityLogs)
      .where(and(eq(zoneCapacityLogs.zone_id, log.zoneId), eq(zoneCapacityLogs.capacity_percentage, log.capacityPercentage)))
      .limit(1);
    if (!existing) {
      await db.insert(zoneCapacityLogs).values({
        zone_id: log.zoneId,
        recorded_fill_kg: log.recordedFillKg,
        capacity_percentage: log.capacityPercentage,
        status: log.status,
        trigger_reason: log.triggerReason,
        logged_at: new Date(Date.now() - 3600_000),
      });
    }
  }

  // Zone emptying record
  const [existingEmptying] = await db.select().from(zoneEmptyingRecords).where(eq(zoneEmptyingRecords.zone_id, bracuZone.id)).limit(1);
  if (!existingEmptying) {
    await db.insert(zoneEmptyingRecords).values({
      zone_id: bracuZone.id,
      collector_partner_id: partnerBengalCollector.id,
      scale_readings_json: { PLASTICS: 45.0, PAPER: 20.0 },
      evidence_url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
      total_mass_kg: '65.00',
      emptied_at: new Date(Date.now() - 3 * 86400_000),
    });
  }

  ctx.zones.bracuZone = bracuZone;
  ctx.zones.buetZone = buetZone;
  ctx.zones.nsuZone = nsuZone;
}
