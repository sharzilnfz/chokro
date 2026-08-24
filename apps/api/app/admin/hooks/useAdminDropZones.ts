// Data hooks for drop zones: list registered collection points, telemetry overview, and mutations.
'use client';

// Shared category type and the admin resource factory.
import type { Category } from '@chokro/shared';
import { useAdminList, useAdminResource, useAdminAction } from './useAdminResource';

// A registered drop zone as returned by the API, including its signed QR token and capacity fields.
export type DropZone = {
  id: string;
  institution_id: string;
  name: string;
  accepted_categories: string[];
  qr_token: string;
  status: string;
  max_capacity_kg?: number | string;
  current_fill_kg?: number | string;
  last_emptied_at?: string | null;
  contracted_partner_id?: string | null;
  capacity_percentage?: number;
  capacity_status?: string;
  created_at: string;
};

// Capacity snapshot log
export type ZoneCapacityLog = {
  id: string;
  zoneId: string;
  zoneName?: string;
  institutionId?: string;
  recordedFillKg: number | string;
  capacityPercentage: number;
  status: string;
  triggerReason: string;
  loggedAt: string;
};

// Telemetry overview response shape
export type AdminTelemetryOverview = {
  metrics: {
    totalZones: number;
    criticalZonesCount: number;
    averageFillPercentage: number;
    totalFillKg: number;
    totalCapacityKg: number;
  };
  zones: DropZone[];
  recentLogs: ZoneCapacityLog[];
};

// Payload used to register a new drop zone.
export type CreateDropZoneInput = {
  institutionId: string;
  name: string;
  acceptedCategories: Category[];
  maxCapacityKg?: number;
  contractedPartnerId?: string | null;
  geoLocation?: { lat: number; lng: number } | null;
};

export type RecordTelemetryInput = {
  zoneId: string;
  currentFillKg: number;
  triggerReason?: string;
};

// Cache keys
export const ADMIN_DROP_ZONES_QUERY_KEY = ['admin', 'drop-zones'] as const;
export const ADMIN_ZONE_TELEMETRY_QUERY_KEY = ['admin', 'zone-telemetry'] as const;

// Loads the registered drop zones once the admin session is active.
export function useAdminDropZones() {
  return useAdminList<{ zones?: DropZone[] }, DropZone>(
    ADMIN_DROP_ZONES_QUERY_KEY,
    '/api/drop-zones',
    (data) => data.zones,
  );
}

// Loads drop zone capacity telemetry overview (A03)
export function useAdminZoneTelemetry() {
  return useAdminResource<AdminTelemetryOverview>(
    ADMIN_ZONE_TELEMETRY_QUERY_KEY,
    '/api/admin/drop-zones/telemetry',
    { refetchInterval: 15000 },
  );
}

// Submits a telemetry update for a drop zone
export function useRecordZoneTelemetry() {
  return useAdminAction<{ dispatchTriggered: boolean } & Record<string, unknown>, RecordTelemetryInput>({
    path: ({ zoneId }) => `/api/drop-zones/${zoneId}/telemetry`,
    payload: ({ currentFillKg, triggerReason }) => ({ currentFillKg, triggerReason }),
    invalidate: [ADMIN_DROP_ZONES_QUERY_KEY, ADMIN_ZONE_TELEMETRY_QUERY_KEY],
  });
}

// Creates a new drop zone and refreshes the list on success.
export function useCreateDropZone() {
  return useAdminAction<DropZone | undefined, CreateDropZoneInput>({
    path: '/api/drop-zones',
    payload: (payload) => payload,
    select: (data) => data.zone,
    invalidate: [ADMIN_DROP_ZONES_QUERY_KEY, ADMIN_ZONE_TELEMETRY_QUERY_KEY],
  });
}
