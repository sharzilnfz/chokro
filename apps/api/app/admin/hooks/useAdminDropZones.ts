// Data hooks for drop zones: list registered collection points and create new ones.
'use client';

// Shared category type, React Query primitives, auth session, and the admin fetch wrapper.
import type { Category } from '@chokro/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminApiRequest } from '../services/adminApi';

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
  const { status } = useAdminAuth();

  return useQuery<DropZone[]>({
    queryKey: ADMIN_DROP_ZONES_QUERY_KEY,
    queryFn: async () => {
      const data = await adminApiRequest<{ zones?: DropZone[] }>('/api/drop-zones');
      return Array.isArray(data.zones) ? data.zones : [];
    },
    enabled: status === 'signed-in',
  });
}

// Loads drop zone capacity telemetry overview (A03)
export function useAdminZoneTelemetry() {
  const { status } = useAdminAuth();

  return useQuery<AdminTelemetryOverview>({
    queryKey: ADMIN_ZONE_TELEMETRY_QUERY_KEY,
    queryFn: async () => {
      return adminApiRequest<AdminTelemetryOverview>('/api/admin/drop-zones/telemetry');
    },
    enabled: status === 'signed-in',
    refetchInterval: 15000,
  });
}

// Submits a telemetry update for a drop zone
export function useRecordZoneTelemetry() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, RecordTelemetryInput>({
    mutationFn: async ({ zoneId, currentFillKg, triggerReason }) => {
      return adminApiRequest(`/api/drop-zones/${zoneId}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentFillKg, triggerReason }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_DROP_ZONES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ADMIN_ZONE_TELEMETRY_QUERY_KEY });
    },
  });
}

// Creates a new drop zone and refreshes the list on success.
export function useCreateDropZone() {
  const queryClient = useQueryClient();

  return useMutation<DropZone | undefined, Error, CreateDropZoneInput>({
    mutationFn: async (payload) => {
      const data = await adminApiRequest<{ zone?: DropZone }>('/api/drop-zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return data.zone;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_DROP_ZONES_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ADMIN_ZONE_TELEMETRY_QUERY_KEY });
    },
  });
}

