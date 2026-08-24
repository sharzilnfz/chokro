import {
  PickupDomain,
  haversineKm,
  CollectorEvaluation,
  FindBestCollectorInput,
  FindBestCollectorResult,
  RouteStop,
  OptimizeRouteResult,
  SkipReason,
} from '../domain/PickupDomain';
import { type PickupWithRefs } from '../repos/pickups';

export { haversineKm };
export type {
  CollectorEvaluation,
  FindBestCollectorInput,
  FindBestCollectorResult,
  RouteStop,
  OptimizeRouteResult,
  SkipReason,
};

/**
 * DispatchService — Adapter / Facade over deep PickupDomain (M3 F3)
 */
export class DispatchService {
  static async findBestCollector(input: FindBestCollectorInput): Promise<FindBestCollectorResult> {
    return PickupDomain.findBestCollector(input);
  }

  static async optimizeRoute(collectorPartnerId: string): Promise<OptimizeRouteResult> {
    return PickupDomain.optimizeRoute(collectorPartnerId);
  }

  static async assignBestCollector(params: {
    listing: PickupWithRefs['listing'];
    customerId: string;
    address: string;
    lat: number;
    lng: number;
    scheduledFor: Date;
    notes?: string | null;
  }) {
    return PickupDomain.assignBestCollector(params);
  }
}
