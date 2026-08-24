// DropZoneTelemetryDomain: Capacity modeling, automated emptying dispatch triggers,
// and cryptographically verified dynamic poster generation with map fallback.

import crypto from 'crypto';
import QRCode from 'qrcode';
import { createQrToken, isValidQrToken } from '../qr';
import { dropZoneTelemetryRepo } from '../repos/dropZoneTelemetry';

export type CapacityStatus = 'NORMAL' | 'APPROACHING_CAPACITY' | 'FULL' | 'OVERFLOW_ALARM';

export interface TelemetryCalculation {
  percentage: number;
  status: CapacityStatus;
  indicatorText: string;
}

export interface RecordTelemetryInput {
  zoneId: string;
  currentFillKg: number;
  triggerReason?: string;
}

export interface PosterOptions {
  format?: 'html' | 'svg' | 'png' | 'pdf';
  size?: 'A4' | 'A3';
}

// Haversine distance calculator between two WGS-84 coordinates in kilometers
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Escapes untrusted strings for safe interpolation into HTML / SVG markup
function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export const DropZoneTelemetryDomain = {
  /**
   * Models the fill ratio and determines capacity status and user-facing badge copy.
   */
  calculateFillStatus(currentFillKg: number, maxCapacityKg: number): TelemetryCalculation {
    const safeMax = maxCapacityKg > 0 ? maxCapacityKg : 50;
    const rawPercentage = (currentFillKg / safeMax) * 100;
    const percentage = Math.max(0, Math.round(rawPercentage));

    let status: CapacityStatus = 'NORMAL';
    let indicatorText = `Plenty of space (${percentage}%)`;

    if (percentage >= 100) {
      status = 'OVERFLOW_ALARM';
      indicatorText = `Full / Overflow Alarm (${percentage}%)`;
    } else if (percentage >= 85) {
      status = 'APPROACHING_CAPACITY';
      indicatorText = `Nearly full (${percentage}%)`;
    } else if (percentage >= 50) {
      status = 'NORMAL';
      indicatorText = `Moderately full (${percentage}%)`;
    }

    return { percentage, status, indicatorText };
  },

  /**
   * Ingests sensor / admin / deposit telemetry for a drop zone:
   * 1. Updates drop_zones.current_fill_kg
   * 2. Writes a snapshot to zone_capacity_logs
   * 3. Triggers automated high-priority collection dispatch when fill >= 85%
   */
  async recordTelemetry(input: RecordTelemetryInput) {
    const zone = await dropZoneTelemetryRepo.findZoneById(input.zoneId);
    if (!zone) {
      throw new Error(`Drop zone with id ${input.zoneId} not found`);
    }

    const maxCapacity = Number(zone.max_capacity_kg) || 50;
    const currentFill = Number(input.currentFillKg) || 0;
    const { percentage, status } = this.calculateFillStatus(currentFill, maxCapacity);

    const triggerReason = input.triggerReason || 'DEPOSIT_ACCUMULATION';
    const isEmptied = triggerReason === 'COLLECTOR_EMPTYING' || currentFill === 0;

    // Update drop zone current fill and optionally last_emptied_at
    const updatedZone = await dropZoneTelemetryRepo.updateFillState(input.zoneId, {
      currentFillKg: currentFill.toFixed(2),
      emptiedAt: isEmptied ? new Date() : null,
    });

    // Write snapshot telemetry log
    const logEntry = await dropZoneTelemetryRepo.createCapacityLog({
      zone_id: input.zoneId,
      recorded_fill_kg: currentFill.toFixed(2),
      capacity_percentage: percentage,
      status,
      trigger_reason: triggerReason,
      logged_at: new Date(),
    });

    // Automated High-Capacity Dispatch Trigger (SPEC 19: fill >= 85%)
    let dispatchTriggered = false;
    let pickupOrder = null;

    if (percentage >= 85) {
      // Create an automated collection pickup order
      const geo = zone.geo_location as { lat: number; lng: number } | null;
      const lat = geo?.lat ?? 23.774;
      const lng = geo?.lng ?? 90.425;

      pickupOrder = await dropZoneTelemetryRepo.createDispatchOrder({
        collector_partner_id: zone.contracted_partner_id || null,
        address: `${zone.name} — ${zone.institution_id} Campus Drop Point`,
        lat,
        lng,
        scheduled_for: new Date(Date.now() + 2 * 60 * 60 * 1000), // Next 2 hours
        notes: `[AUTO-DISPATCH: CAPACITY_ALERT] Drop-zone '${zone.name}' (${zone.institution_id}) reached ${percentage}% capacity (${currentFill.toFixed(1)}kg / ${maxCapacity}kg). Immediate collection required.`,
      });

      dispatchTriggered = true;
    }

    return {
      telemetry: logEntry,
      dropZone: updatedZone,
      calculation: { percentage, status },
      dispatchTriggered,
      pickupOrder,
    };
  },

  /**
   * Generates a print-ready cryptographic poster for a drop zone.
   * Embeds HMAC-SHA256 QR code, Google Static Maps snippet, or degraded pure SVG vector fallback.
   */
  async generatePoster(zoneId: string, options: PosterOptions = {}) {
    const zone = await dropZoneTelemetryRepo.findZoneById(zoneId);
    if (!zone) {
      throw new Error(`Drop zone with id ${zoneId} not found`);
    }

    // Ensure valid HMAC QR token
    let qrToken = zone.qr_token;
    if (!qrToken || !isValidQrToken(qrToken)) {
      qrToken = createQrToken();
      await dropZoneTelemetryRepo.updateQrToken(zoneId, qrToken);
    }

    // Render QR code SVG
    const qrSvg = await QRCode.toString(qrToken, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 2,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    });

    const zoneNameEscaped = escapeXml(zone.name);
    const institutionEscaped = escapeXml(zone.institution_id);
    const categories: string[] = Array.isArray(zone.accepted_categories)
      ? (zone.accepted_categories as string[])
      : [];

    const geo = zone.geo_location as { lat: number; lng: number } | null;
    const hasCoords = geo && typeof geo.lat === 'number' && typeof geo.lng === 'number';
    const googleMapsKey = process.env.GOOGLE_STATIC_MAPS_KEY;

    let mapSnippetHtml = '';
    let degradedMode = false;

    if (googleMapsKey && hasCoords) {
      const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${geo.lat},${geo.lng}&zoom=16&size=600x300&markers=color:green%7Clabel:D%7C${geo.lat},${geo.lng}&key=${googleMapsKey}`;
      mapSnippetHtml = `
        <div class="map-container">
          <img src="${escapeXml(mapUrl)}" alt="Map showing location of ${zoneNameEscaped}" class="map-image" />
          <div class="map-caption">Designated Pin: ${geo.lat.toFixed(5)}°N, ${geo.lng.toFixed(5)}°E</div>
        </div>
      `;
    } else {
      // Graceful Degraded Mode: Pure SVG vector grid map fallback
      degradedMode = true;
      console.warn(`[POSTER_MAP_DEGRADED_MODE] Generating vector grid fallback poster for zone ${zone.id}`);

      const latLabel = hasCoords ? `${geo.lat.toFixed(4)}°N` : '23.7740°N';
      const lngLabel = hasCoords ? `${geo.lng.toFixed(4)}°E` : '90.4250°E';

      mapSnippetHtml = `
        <div class="vector-map-fallback" role="img" aria-label="Campus coordinates grid">
          <svg viewBox="0 0 400 160" class="vector-grid-svg" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E2E8F0" stroke-width="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="#F8FAFC" rx="8" />
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            <!-- Radar Target Circles -->
            <circle cx="200" cy="80" r="60" fill="none" stroke="#CBD5E1" stroke-width="1.5" stroke-dasharray="4,4" />
            <circle cx="200" cy="80" r="30" fill="#10B981" fill-opacity="0.12" stroke="#10B981" stroke-width="2" />
            <circle cx="200" cy="80" r="6" fill="#059669" />
            
            <!-- Campus Location Badge -->
            <rect x="120" y="118" width="160" height="26" rx="6" fill="#0F172A" />
            <text x="200" y="135" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="11" font-weight="bold" letter-spacing="0.5">
              ${escapeXml(latLabel)}, ${escapeXml(lngLabel)}
            </text>
            <text x="200" y="32" text-anchor="middle" fill="#059669" font-family="sans-serif" font-size="12" font-weight="bold">
              PHYSICAL CAMPUS DROP POINT
            </text>
          </svg>
          <div class="fallback-note">Verified Coordinate Boundary: ${escapeXml(institutionEscaped)} Campus</div>
        </div>
      `;
    }

    const categoryBadgesHtml = categories
      .map((cat) => `<span class="category-badge">${escapeXml(cat)}</span>`)
      .join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Chokro Drop-Zone Poster — ${zoneNameEscaped}</title>
<style>
  @page { size: ${options.size === 'A3' ? 'A3' : 'A4'}; margin: 15mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    margin: 0;
    padding: 24px;
    background: #F1F5F9;
    color: #0F172A;
    display: flex;
    justify-content: center;
  }
  .poster-sheet {
    background: #FFFFFF;
    width: 100%;
    max-width: 680px;
    border: 8px solid #10B981;
    border-radius: 20px;
    padding: 36px 32px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.08);
    text-align: center;
  }
  .header-kicker {
    color: #059669;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .main-title {
    font-size: 34px;
    font-weight: 900;
    color: #0F172A;
    line-height: 1.15;
    margin: 0 0 6px 0;
    letter-spacing: -0.5px;
  }
  .institution-subtitle {
    font-size: 18px;
    font-weight: 600;
    color: #64748B;
    margin-bottom: 24px;
  }
  .qr-container {
    background: #F8FAFC;
    border: 2.5px dashed #94A3B8;
    border-radius: 16px;
    padding: 24px;
    margin: 0 auto 24px auto;
    max-width: 380px;
  }
  .qr-container svg {
    width: 220px;
    height: 220px;
    display: block;
    margin: 0 auto 12px auto;
  }
  .qr-instruction {
    font-size: 13px;
    font-weight: 700;
    color: #334155;
    margin: 0;
  }
  .qr-crypto-seal {
    font-size: 10px;
    color: #94A3B8;
    font-family: monospace;
    margin-top: 6px;
  }
  .section-label {
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #475569;
    margin-bottom: 10px;
  }
  .categories-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin-bottom: 24px;
  }
  .category-badge {
    background: #ECFDF5;
    border: 1.5px solid #10B981;
    color: #065F46;
    font-size: 12px;
    font-weight: 800;
    padding: 6px 14px;
    border-radius: 9999px;
  }
  .map-container, .vector-map-fallback {
    margin-bottom: 24px;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #E2E8F0;
  }
  .map-image {
    width: 100%;
    height: auto;
    display: block;
  }
  .map-caption, .fallback-note {
    background: #F8FAFC;
    padding: 8px;
    font-size: 11px;
    font-weight: 600;
    color: #64748B;
  }
  .vector-grid-svg {
    width: 100%;
    height: 140px;
    display: block;
  }
  .footer-compliance {
    border-top: 1px solid #E2E8F0;
    padding-top: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: #94A3B8;
    font-weight: 600;
  }
</style>
</head>
<body>
<div class="poster-sheet">
  <div class="header-kicker">CHOKRO CIRCULAR RECYCLING</div>
  <h1 class="main-title">${zoneNameEscaped}</h1>
  <div class="institution-subtitle">Host Institution: ${institutionEscaped}</div>

  <div class="qr-container">
    ${qrSvg}
    <p class="qr-instruction">Scan with Chokro App to verify drop zone</p>
    <div class="qr-crypto-seal">HMAC-SHA256 Cryptographically Signed</div>
  </div>

  <div class="section-label">Accepted Materials</div>
  <div class="categories-row">
    ${categoryBadgesHtml}
  </div>

  <div class="section-label">Designated Location</div>
  ${mapSnippetHtml}

  <div class="footer-compliance">
    <span>Chokro Smart Drop Network</span>
    <span>DoE Bangladesh Compliant</span>
  </div>
</div>
</body>
</html>`;

    return {
      zone,
      qrToken,
      qrSvg,
      html,
      degradedMode,
    };
  },

  /**
   * Locator lookup: returns active drop zones with fill levels, accepted categories,
   * and distances relative to query coordinate.
   */
  async getLocatorZones(query: { lat?: number; lng?: number; radiusKm?: number } = {}) {
    const rows = await dropZoneTelemetryRepo.findActiveZones();

    const radius = query.radiusKm && query.radiusKm > 0 ? query.radiusKm : 10;
    const hasCoords =
      query.lat !== undefined &&
      query.lat !== null &&
      query.lng !== undefined &&
      query.lng !== null;

    const enriched = rows.map((zone) => {
      const maxCapacity = Number(zone.max_capacity_kg) || 50;
      const currentFill = Number(zone.current_fill_kg) || 0;
      const { percentage, status, indicatorText } = this.calculateFillStatus(currentFill, maxCapacity);

      let distanceKm: number | null = null;
      const geo = zone.geo_location as { lat: number; lng: number } | null;
      if (hasCoords && geo && typeof geo.lat === 'number' && typeof geo.lng === 'number') {
        distanceKm = Number(haversineDistanceKm(query.lat!, query.lng!, geo.lat, geo.lng).toFixed(2));
      }

      return {
        id: zone.id,
        name: zone.name,
        institutionId: zone.institution_id,
        institution_id: zone.institution_id,
        geoLocation: zone.geo_location,
        geo_location: zone.geo_location,
        acceptedCategories: zone.accepted_categories,
        accepted_categories: zone.accepted_categories,
        status: zone.status,
        maxCapacityKg: maxCapacity,
        max_capacity_kg: maxCapacity,
        currentFillKg: currentFill,
        current_fill_kg: currentFill,
        fillPercentage: percentage,
        fill_percentage: percentage,
        capacityPercentage: percentage,
        capacity_percentage: percentage,
        fillStatus: status,
        fill_status: status,
        indicatorText,
        lastEmptiedAt: zone.last_emptied_at,
        last_emptied_at: zone.last_emptied_at,
        contractedPartnerId: zone.contracted_partner_id,
        contracted_partner_id: zone.contracted_partner_id,
        distanceKm,
        distance_km: distanceKm,
      };
    });

    if (!hasCoords) {
      return enriched;
    }

    return enriched
      .filter((z) => z.distanceKm !== null && z.distanceKm <= radius)
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  },

  /**
   * Admin Telemetry Overview (A03):
   * Summarizes all zones, fill percentages, critical counts, and recent capacity logs.
   */
  async getAdminTelemetryOverview() {
    const allZones = await dropZoneTelemetryRepo.findAllZones();
    const recentLogs = await dropZoneTelemetryRepo.listRecentCapacityLogs(50);

    let criticalZonesCount = 0;
    let totalFillKg = 0;
    let totalCapacityKg = 0;
    let sumPercentage = 0;

    const zonesSummary = allZones.map((zone) => {
      const maxCapacity = Number(zone.max_capacity_kg) || 50;
      const currentFill = Number(zone.current_fill_kg) || 0;
      const { percentage, status, indicatorText } = this.calculateFillStatus(currentFill, maxCapacity);

      if (percentage >= 85) {
        criticalZonesCount++;
      }
      totalFillKg += currentFill;
      totalCapacityKg += maxCapacity;
      sumPercentage += percentage;

      return {
        id: zone.id,
        name: zone.name,
        institutionId: zone.institution_id,
        institution_id: zone.institution_id,
        geoLocation: zone.geo_location,
        geo_location: zone.geo_location,
        acceptedCategories: zone.accepted_categories,
        accepted_categories: zone.accepted_categories,
        status: zone.status,
        maxCapacityKg: maxCapacity,
        max_capacity_kg: maxCapacity,
        currentFillKg: currentFill,
        current_fill_kg: currentFill,
        capacityPercentage: percentage,
        capacity_percentage: percentage,
        capacityStatus: status,
        capacity_status: status,
        indicatorText,
        lastEmptiedAt: zone.last_emptied_at,
        last_emptied_at: zone.last_emptied_at,
        contractedPartnerId: zone.contracted_partner_id,
        contracted_partner_id: zone.contracted_partner_id,
        createdAt: zone.created_at,
        created_at: zone.created_at,
      };
    });

    const averageFillPercentage =
      allZones.length > 0 ? Math.round(sumPercentage / allZones.length) : 0;

    return {
      metrics: {
        totalZones: allZones.length,
        criticalZonesCount,
        averageFillPercentage,
        totalFillKg: Number(totalFillKg.toFixed(2)),
        totalCapacityKg: Number(totalCapacityKg.toFixed(2)),
      },
      zones: zonesSummary,
      recentLogs,
    };
  },
};
