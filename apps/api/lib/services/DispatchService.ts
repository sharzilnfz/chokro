import { partnerRepo } from '@/lib/repos/partners';
import { pickupRepo, type PickupWithRefs } from '@/lib/repos/pickups';

const EARTH_RADIUS_KM = 6371;
const FALLBACK_AVG_SPEED_KMH = 25; // Dhaka city average for vans/rickshaws-loaded pickups
const MAPBOX_MATRIX_URL = 'https://api.mapbox.com/directions-matrix/v1/mapbox/driving';
const MAPBOX_TIMEOUT_MS = 4000;

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
  weightKg: number | null; // null for piece-unit listings (capacity check skipped)
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
  routing_source: 'mapbox' | 'haversine_fallback';
  base: { lat: number; lng: number };
  stops: RouteStop[];
}

function roundKm(km: number): number {
  return Math.round(km * 100) / 100;
}

function legMinutes(distanceKm: number, speedKmh = FALLBACK_AVG_SPEED_KMH): number {
  return Math.max(1, Math.round((distanceKm / speedKmh) * 60));
}

// Weight (kg) this listing adds to a collector's committed load. Piece listings are unweighed.
function listingWeightKg(listing: PickupWithRefs['listing']): number | null {
  if (listing.unit !== 'kg' || listing.declared_weight == null) return null;
  const weight = Number(listing.declared_weight);
  return Number.isFinite(weight) ? weight : null;
}

/**
 * Ordered stop indices via nearest-neighbour walk over a cost matrix,
 * starting from index 0 (the collector's base). Deterministic: ties keep input order.
 */
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

interface MapboxMatrixResponse {
  code?: string;
  distances?: number[][]; // metres
  durations?: number[][]; // seconds
}

/** Fetches the Mapbox Directions Matrix; returns null on any failure (missing key, HTTP error, bad payload). */
async function fetchMapboxMatrix(coords: Array<{ lat: number; lng: number }>): Promise<MapboxMatrixResponse | null> {
  const token = process.env.MAPBOX_TOKEN;
  if (!token || coords.length < 2) return null;
  try {
    const path = coords.map((c) => `${c.lng},${c.lat}`).join(';');
    const response = await fetch(
      `${MAPBOX_MATRIX_URL}/${path}?annotations=distance,duration&access_token=${token}`,
      { signal: AbortSignal.timeout(MAPBOX_TIMEOUT_MS) },
    );
    if (!response.ok) return null;
    const json = (await response.json()) as MapboxMatrixResponse;
    if (json.code !== 'Ok' || !Array.isArray(json.distances) || !Array.isArray(json.durations)) return null;
    return json;
  } catch {
    return null; // mandatory graceful degradation
  }
}

export class DispatchService {
  /**
   * Finds the nearest eligible collector: VERIFIED, COLLECTOR type, based within
   * their service radius, with remaining vehicle capacity, and e-waste licensed when needed.
   */
  static async findBestCollector(input: FindBestCollectorInput): Promise<FindBestCollectorResult> {
    const collectors = await partnerRepo.findVerifiedCollectors();
    const evaluations: CollectorEvaluation[] = [];
    const eligible: Array<CollectorEvaluation & { partnerId: string }> = [];

    for (const partner of collectors) {
      if (partner.base_lat == null || partner.base_lng == null) continue;
      const distanceKm = haversineKm(partner.base_lat, partner.base_lng, input.lat, input.lng);

      // Remaining capacity = vehicle capacity minus the kg already committed to active orders.
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

    const best = winner
      ? await this.hydrateBest(winner.partnerId, winner.distance_km, winner.remaining_capacity_kg)
      : null;

    return { best, runnersUp: evaluations };
  }

  // Winner only carries ids/numbers from the loop; hydrate full partner summary for the response.
  private static async hydrateBest(
    partnerId: string | null,
    distanceKm: number,
    remainingCapacityKg: number | null,
  ): Promise<FindBestCollectorResult['best']> {
    if (!partnerId) return null;
    const partner = await partnerRepo.findById(partnerId);
    if (!partner) return null;
    return {
      partner: {
        id: partner.id,
        org_name: partner.org_name,
        vehicle_label: partner.vehicle_label,
        vehicle_capacity_kg: partner.vehicle_capacity_kg != null ? Number(partner.vehicle_capacity_kg) : null,
        base_lat: partner.base_lat,
        base_lng: partner.base_lng,
        service_radius_km: partner.service_radius_km,
      },
      distance_km: distanceKm,
      remaining_capacity_kg: remainingCapacityKg,
    };
  }

  /**
   * Builds the collector's ordered stop list. Uses Mapbox Directions Matrix for
   * ordering and leg durations when MAPBOX_TOKEN is set and there are 2+ stops;
   * otherwise (or on ANY failure) deterministically degrades to a haversine
   * nearest-neighbour walk at a fixed 25 km/h average speed. Never throws.
   */
  static async optimizeRoute(collectorPartnerId: string): Promise<OptimizeRouteResult> {
    const partner = await partnerRepo.findById(collectorPartnerId);
    const activeOrders = await pickupRepo.findActiveByCollector(collectorPartnerId);

    if (!partner || partner.base_lat == null || partner.base_lng == null || activeOrders.length === 0) {
      return { routing_source: 'haversine_fallback', base: { lat: 0, lng: 0 }, stops: [] };
    }

    const base = { lat: partner.base_lat, lng: partner.base_lng };
    const points = [base, ...activeOrders.map((row) => ({ lat: row.order.lat, lng: row.order.lng }))];

    // Cost matrix: Mapbox durations/driving distances when available, haversine otherwise.
    const matrix = await fetchMapboxMatrix(points);
    const useMapbox = matrix != null;
    const haversineCost = points.map((a) => points.map((b) => haversineKm(a.lat, a.lng, b.lat, b.lng)));
    const distanceMatrix: number[][] = useMapbox && matrix!.distances
      ? matrix!.distances.map((row) => row.map((m) => m / 1000))
      : haversineCost;
    const durationMatrix: number[][] | null = useMapbox && matrix!.durations
      ? matrix!.durations.map((row) => row.map((s) => s / 60))
      : null;

    const order = nearestNeighbourOrder(durationMatrix ?? distanceMatrix);

    const stops: RouteStop[] = [];
    let cumulativeMinutes = 0;
    let previousIdx = 0; // start at base
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
      routing_source: useMapbox ? 'mapbox' : 'haversine_fallback',
      base,
      stops,
    };
  }

  /**
   * One-shot booking assignment: creates the order, then assigns the best eligible
   * collector (writing a dispatch_assignment row) or leaves it pending when none qualify.
   */
  static async assignBestCollector(params: {
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
      stop_sequence: activeOrders.length, // the order we just assigned is included and goes last
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
  }
}
