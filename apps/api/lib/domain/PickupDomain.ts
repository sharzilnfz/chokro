import { partnerRepo } from '@/lib/repos/partners';
import { pickupRepo, type PickupWithRefs } from '@/lib/repos/pickups';

const EARTH_RADIUS_KM = 6371;
const FALLBACK_AVG_SPEED_KMH = 25; // Dhaka city average for vans/rickshaws-loaded pickups
const MAPBOX_MATRIX_URL = 'https://api.mapbox.com/directions-matrix/v1/mapbox/driving';
const MAPBOX_TIMEOUT_MS = 4000;
const OSRM_TABLE_URL = 'https://router.project-osrm.org/table/v1/driving';
const OSRM_TIMEOUT_MS = 4000;

const TRANSITIONS: Record<string, string[]> = {
  REQUESTED: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['EN_ROUTE', 'CANCELLED'],
  EN_ROUTE: ['COLLECTED'],
  COLLECTED: [],
  CANCELLED: [],
};

/** Great-circle distance between two coordinates, in kilometres. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export type SkipReason = 'OUT_OF_RADIUS' | 'INSUFFICIENT_CAPACITY' | 'E_WASTE_LICENSE_REQUIRED';

export interface CollectorEvaluation {
  partner_id: string;
  org_name: string;
  distance_km: number;
  remaining_capacity_kg: number | null;
  eligible: boolean;
  skip_reason: SkipReason | null;
}

export interface FindBestCollectorInput {
  lat: number;
  lng: number;
  weightKg: number | null;
  category: string;
}

export interface FindBestCollectorResult {
  best: {
    partner: {
      id: string;
      org_name: string;
      vehicle_label: string | null;
      vehicle_capacity_kg: number | null;
      base_lat: number | null;
      base_lng: number | null;
      service_radius_km: number | null;
    };
    distance_km: number;
    remaining_capacity_kg: number | null;
  } | null;
  runnersUp: CollectorEvaluation[];
}

export interface RouteStop {
  stop_sequence: number;
  order_id: string;
  status: string;
  address: string;
  scheduled_for: string;
  notes: string | null;
  lat: number;
  lng: number;
  listing: {
    id: string;
    category: string;
    unit: string;
    declared_weight: string | null;
    piece_count: number | null;
    condition: string;
  };
  customer_id: string;
  distance_from_previous_km: number;
  cumulative_eta_minutes: number;
}

export interface OptimizeRouteResult {
  routing_source: 'mapbox' | 'osrm' | 'haversine_fallback';
  base: { lat: number; lng: number };
  stops: RouteStop[];
}

function roundKm(km: number): number {
  return Math.round(km * 100) / 100;
}

function legMinutes(distanceKm: number, speedKmh = FALLBACK_AVG_SPEED_KMH): number {
  return Math.max(1, Math.round((distanceKm / speedKmh) * 60));
}

function listingWeightKg(listing: PickupWithRefs['listing']): number | null {
  if (listing.unit !== 'kg' || listing.declared_weight == null) return null;
  const weight = Number(listing.declared_weight);
  return Number.isFinite(weight) ? weight : null;
}

function nearestNeighbourOrder(cost: number[][]): number[] {
  const n = cost.length;
  const visited = new Array<boolean>(n).fill(false);
  visited[0] = true;
  const order = [0];
  let current = 0;
  for (let step = 1; step < n; step++) {
    let bestIdx = -1;
    let bestCost = Infinity;
    for (let idx = 1; idx < n; idx++) {
      if (visited[idx]) continue;
      const c = cost[current][idx];
      if (c < bestCost) {
        bestCost = c;
        bestIdx = idx;
      }
    }
    if (bestIdx === -1) break;
    visited[bestIdx] = true;
    order.push(bestIdx);
    current = bestIdx;
  }
  return order;
}

interface MatrixResponse {
  code?: string;
  distances?: number[][];
  durations?: number[][];
}

async function fetchMapboxMatrix(coords: Array<{ lat: number; lng: number }>): Promise<MatrixResponse | null> {
  const token = process.env.MAPBOX_TOKEN;
  if (!token || coords.length < 2) return null;
  try {
    const path = coords.map((c) => `${c.lng},${c.lat}`).join(';');
    const response = await fetch(
      `${MAPBOX_MATRIX_URL}/${path}?annotations=distance,duration&access_token=${token}`,
      { signal: AbortSignal.timeout(MAPBOX_TIMEOUT_MS) },
    );
    if (!response.ok) return null;
    const json = (await response.json()) as MatrixResponse;
    if (json.code !== 'Ok' || !Array.isArray(json.distances) || !Array.isArray(json.durations)) return null;
    return json;
  } catch {
    return null;
  }
}

async function fetchOsrmMatrix(coords: Array<{ lat: number; lng: number }>): Promise<MatrixResponse | null> {
  if (coords.length < 2) return null;
  try {
    const path = coords.map((c) => `${c.lng},${c.lat}`).join(';');
    const response = await fetch(
      `${OSRM_TABLE_URL}/${path}?annotations=distance,duration`,
      { signal: AbortSignal.timeout(OSRM_TIMEOUT_MS) },
    );
    if (!response.ok) return null;
    const json = (await response.json()) as MatrixResponse;
    if (json.code !== 'Ok' || !Array.isArray(json.distances) || !Array.isArray(json.durations)) return null;
    return json;
  } catch {
    return null;
  }
}

/**
 * PickupDomain — Deep Module for Smart Geo-Dispatch & Pickup Logistics (M3 F3)
 *
 * Encapsulates:
 * 1. State machine invariants & transitions (REQUESTED -> ASSIGNED -> EN_ROUTE -> COLLECTED)
 * 2. Fleet capacity-constrained nearest neighbor evaluation with e-waste licensing safety
 * 3. Mapbox Directions Matrix API TSP routing with deterministic Haversine fallback
 * 4. Atomic booking, stop sequencing, and ETA calculation
 */
export const PickupDomain = {
  canTransition(currentStatus: string, targetStatus: string): boolean {
    return TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
  },

  assertTransition(currentStatus: string, targetStatus: string): void {
    if (!this.canTransition(currentStatus, targetStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${targetStatus}`);
    }
  },

  isCustomer(order: { customer_id: string }, userId: string): boolean {
    return order.customer_id === userId;
  },

  async isAssignedCollector(order: { collector_partner_id: string | null }, userId: string): Promise<boolean> {
    if (!order.collector_partner_id) return false;
    const partner = await partnerRepo.findById(order.collector_partner_id);
    return partner?.user_id === userId;
  },

  async getPickupById(id: string) {
    return pickupRepo.findById(id);
  },

  async getPickupWithRefs(id: string) {
    return pickupRepo.findByIdWithRefs(id);
  },

  async listPickupsForCustomer(customerId: string) {
    return pickupRepo.findByCustomer(customerId);
  },

  async listPickupsForCollector(collectorPartnerId: string) {
    return pickupRepo.findByCollector(collectorPartnerId);
  },

  async updateStatus(id: string, targetStatus: string, actorUserId: string) {
    const existing = await pickupRepo.findById(id);
    if (!existing) {
      throw new Error('Pickup order not found');
    }

    this.assertTransition(existing.status, targetStatus);

    const isCust = this.isCustomer(existing, actorUserId);
    const isColl = await this.isAssignedCollector(existing, actorUserId);

    if (targetStatus === 'CANCELLED' && !isCust && !isColl) {
      throw new Error('Only customer or assigned collector can cancel a pickup');
    }

    if ((targetStatus === 'EN_ROUTE' || targetStatus === 'COLLECTED') && !isColl) {
      throw new Error('Only the assigned collector can advance pickup status');
    }

    return pickupRepo.updateStatus(id, targetStatus);
  },

  async findBestCollector(input: FindBestCollectorInput): Promise<FindBestCollectorResult> {
    const collectors = await partnerRepo.findVerifiedCollectors();
    const evaluations: CollectorEvaluation[] = [];
    const eligible: Array<CollectorEvaluation & { partnerId: string }> = [];

    for (const partner of collectors) {
      if (partner.base_lat == null || partner.base_lng == null) continue;
      const distanceKm = haversineKm(partner.base_lat, partner.base_lng, input.lat, input.lng);

      const capacityKg = partner.vehicle_capacity_kg != null ? Number(partner.vehicle_capacity_kg) : null;
      let remainingCapacityKg: number | null = null;
      if (capacityKg != null) {
        const activeOrders = await pickupRepo.findActiveByCollector(partner.id);
        const committedKg = activeOrders.reduce(
          (sum, row) => sum + (listingWeightKg(row.listing) ?? 0),
          0,
        );
        remainingCapacityKg = Math.round((capacityKg - committedKg) * 100) / 100;
      }

      let skipReason: SkipReason | null = null;
      if (input.category === 'E_WASTE' && !partner.e_waste_licensed) {
        skipReason = 'E_WASTE_LICENSE_REQUIRED';
      } else if (distanceKm > (partner.service_radius_km ?? 10)) {
        skipReason = 'OUT_OF_RADIUS';
      } else if (
        input.weightKg != null &&
        remainingCapacityKg != null &&
        remainingCapacityKg < input.weightKg
      ) {
        skipReason = 'INSUFFICIENT_CAPACITY';
      }

      const evaluation: CollectorEvaluation = {
        partner_id: partner.id,
        org_name: partner.org_name,
        distance_km: roundKm(distanceKm),
        remaining_capacity_kg: remainingCapacityKg,
        eligible: skipReason === null,
        skip_reason: skipReason,
      };
      evaluations.push(evaluation);
      if (skipReason === null) {
        eligible.push({ ...evaluation, partnerId: partner.id });
      }
    }

    eligible.sort((a, b) => a.distance_km - b.distance_km);
    const winner = eligible[0] ?? null;

    let best: FindBestCollectorResult['best'] = null;
    if (winner) {
      const partner = await partnerRepo.findById(winner.partnerId);
      if (partner) {
        best = {
          partner: {
            id: partner.id,
            org_name: partner.org_name,
            vehicle_label: partner.vehicle_label,
            vehicle_capacity_kg: partner.vehicle_capacity_kg != null ? Number(partner.vehicle_capacity_kg) : null,
            base_lat: partner.base_lat,
            base_lng: partner.base_lng,
            service_radius_km: partner.service_radius_km,
          },
          distance_km: winner.distance_km,
          remaining_capacity_kg: winner.remaining_capacity_kg,
        };
      }
    }

    return { best, runnersUp: evaluations };
  },

  async optimizeRoute(collectorPartnerId: string): Promise<OptimizeRouteResult> {
    const partner = await partnerRepo.findById(collectorPartnerId);
    const activeOrders = await pickupRepo.findActiveByCollector(collectorPartnerId);

    if (!partner || partner.base_lat == null || partner.base_lng == null || activeOrders.length === 0) {
      return { routing_source: 'haversine_fallback', base: { lat: 0, lng: 0 }, stops: [] };
    }

    const base = { lat: partner.base_lat, lng: partner.base_lng };
    const points = [base, ...activeOrders.map((row) => ({ lat: row.order.lat, lng: row.order.lng }))];

    let routingSource: 'mapbox' | 'osrm' | 'haversine_fallback' = 'haversine_fallback';
    let matrix: MatrixResponse | null = null;

    if (process.env.MAPBOX_TOKEN) {
      matrix = await fetchMapboxMatrix(points);
      if (matrix) routingSource = 'mapbox';
    }

    if (!matrix && process.env.NODE_ENV !== 'test' && process.env.DISABLE_OSRM !== 'true') {
      matrix = await fetchOsrmMatrix(points);
      if (matrix) routingSource = 'osrm';
    } else if (!matrix && process.env.TEST_ENABLE_OSRM === 'true') {
      matrix = await fetchOsrmMatrix(points);
      if (matrix) routingSource = 'osrm';
    }

    const hasLiveMatrix = matrix != null;
    const haversineCost = points.map((a) => points.map((b) => haversineKm(a.lat, a.lng, b.lat, b.lng)));
    const distanceMatrix: number[][] = hasLiveMatrix && matrix!.distances
      ? matrix!.distances.map((row) => row.map((m) => m / 1000))
      : haversineCost;
    const durationMatrix: number[][] | null = hasLiveMatrix && matrix!.durations
      ? matrix!.durations.map((row) => row.map((s) => s / 60))
      : null;

    const order = nearestNeighbourOrder(durationMatrix ?? distanceMatrix);

    const stops: RouteStop[] = [];
    let cumulativeMinutes = 0;
    let previousIdx = 0;
    for (let seq = 1; seq < order.length; seq++) {
      const idx = order[seq];
      const row = activeOrders[idx - 1];
      const distanceKm = roundKm(distanceMatrix[previousIdx][idx]);
      const legMin = durationMatrix
        ? Math.max(1, Math.round(durationMatrix[previousIdx][idx]))
        : legMinutes(distanceKm);
      cumulativeMinutes += legMin;

      stops.push({
        stop_sequence: seq,
        order_id: row.order.id,
        status: row.order.status,
        address: row.order.address,
        scheduled_for: row.order.scheduled_for.toISOString(),
        notes: row.order.notes,
        lat: row.order.lat,
        lng: row.order.lng,
        listing: {
          id: row.listing.id,
          category: row.listing.category,
          unit: row.listing.unit,
          declared_weight: row.listing.declared_weight,
          piece_count: row.listing.piece_count,
          condition: row.listing.declared_condition,
        },
        customer_id: row.order.customer_id,
        distance_from_previous_km: distanceKm,
        cumulative_eta_minutes: cumulativeMinutes,
      });
      previousIdx = idx;
    }

    return {
      routing_source: routingSource,
      base,
      stops,
    };
  },

  async assignBestCollector(params: {
    listing: PickupWithRefs['listing'];
    customerId: string;
    address: string;
    lat: number;
    lng: number;
    scheduledFor: Date;
    notes?: string | null;
  }) {
    const { best, runnersUp } = await this.findBestCollector({
      lat: params.lat,
      lng: params.lng,
      weightKg: listingWeightKg(params.listing),
      category: params.listing.category,
    });

    const order = await pickupRepo.create({
      listing_id: params.listing.id,
      customer_id: params.customerId,
      collector_partner_id: null,
      status: 'REQUESTED',
      address: params.address,
      lat: params.lat,
      lng: params.lng,
      scheduled_for: params.scheduledFor,
      notes: params.notes ?? null,
    });

    if (!best) {
      return { order, assignmentStatus: 'PENDING_COLLECTOR' as const, collector: null, runnersUp };
    }

    const assigned = await pickupRepo.assignCollector(order.id, best.partner.id);
    const activeOrders = await pickupRepo.findActiveByCollector(best.partner.id);
    const assignment = await pickupRepo.createAssignment({
      order_id: order.id,
      collector_partner_id: best.partner.id,
      stop_sequence: activeOrders.length,
      distance_km: best.distance_km,
      eta_minutes: legMinutes(best.distance_km),
    });

    return {
      order: assigned ?? order,
      assignmentStatus: 'ASSIGNED' as const,
      collector: best,
      runnersUp,
      assignment,
    };
  },
};
