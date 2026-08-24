// DemandBoardDomain: Reverse Recycler Demand Board & Synchronous Match Dispatcher (SPEC 17)
import { demandRepo, CreateDemandInput } from '../repos/demands';
import { FeedDomain } from './FeedDomain';
import type { ListingRow } from '../repos/listings';

export interface CreateDemandPayload {
  category: string;
  minQuantity: number;
  maxQuantity?: number | null;
  unit: string;
  maxPricePerUnitBdt: number;
  targetThana?: string | null;
  targetLat?: number | null;
  targetLng?: number | null;
  maxRadiusKm?: number;
  durationDays?: number;
}

export const DemandBoardDomain = {
  // Create a standing demand
  async createDemand(buyerId: string, payload: CreateDemandPayload) {
    let lat = payload.targetLat;
    let lng = payload.targetLng;
    let thana = payload.targetThana;

    // If coordinates are provided but no thana, reverse geocode
    if (lat != null && lng != null && !thana) {
      const geo = await FeedDomain.reverseGeocode(lat, lng);
      thana = geo.thana;
    }

    return demandRepo.createDemand({
      buyer_id: buyerId,
      category: payload.category,
      min_quantity: payload.minQuantity,
      max_quantity: payload.maxQuantity,
      unit: payload.unit,
      max_price_per_unit_bdt: payload.maxPricePerUnitBdt,
      target_thana: thana,
      target_lat: lat,
      target_lng: lng,
      max_radius_km: payload.maxRadiusKm ?? 10,
      duration_days: payload.durationDays ?? 30,
    });
  },

  // List demands for buyer
  async getDemandsByBuyer(buyerId: string, status?: string) {
    return demandRepo.findDemandsByBuyer(buyerId, status);
  },

  // List matches for buyer
  async getMatchesForBuyer(buyerId: string, demandId?: string, status?: string) {
    return demandRepo.findMatchesForBuyer(buyerId, demandId, status);
  },

  // Update match status (e.g. VIEWED, OFFERED, DECLINED)
  async updateMatchStatus(matchId: string, status: string) {
    return demandRepo.updateMatchStatus(matchId, status);
  },

  // Synchronous Match Evaluation upon listing creation
  async evaluateDemandMatchesForListing(listing: ListingRow) {
    const activeDemands = await demandRepo.findActiveDemandsByCategory(
      listing.category,
      listing.unit
    );

    const matchesCreated = [];
    const listingQty = Number(listing.declared_weight ?? listing.piece_count ?? 1);
    const listingPrice = Number(listing.price_bdt);
    const listingUnitPrice = listingQty > 0 ? listingPrice / listingQty : listingPrice;

    for (const demand of activeDemands) {
      // 1. Check quantity compatibility
      const minQty = Number(demand.min_quantity);
      const maxQty = demand.max_quantity ? Number(demand.max_quantity) : Infinity;
      if (listingQty < minQty || listingQty > maxQty) {
        continue;
      }

      // 2. Check price compatibility (listing unit price <= demand max price per unit)
      const maxPrice = Number(demand.max_price_per_unit_bdt);
      if (listingUnitPrice > maxPrice) {
        continue;
      }

      // 3. Check geographic distance if coordinates exist
      let distanceKm: number | null = null;
      if (
        demand.target_lat != null &&
        demand.target_lng != null &&
        listing.lat != null &&
        listing.lng != null
      ) {
        distanceKm = FeedDomain.calculateDistance(
          demand.target_lat,
          demand.target_lng,
          listing.lat,
          listing.lng
        );
        if (distanceKm > demand.max_radius_km) {
          continue;
        }
      } else if (
        demand.target_thana &&
        listing.thana &&
        demand.target_thana.toLowerCase() !== listing.thana.toLowerCase()
      ) {
        // If no coordinates but thanas differ
        continue;
      }

      // 4. Calculate Match Score (0.00 to 1.00)
      // Price score: 1.0 if listing price is cheaper than max price
      const priceRatio = maxPrice > 0 ? listingUnitPrice / maxPrice : 1;
      const priceScore = Math.max(0.5, 1.0 - priceRatio * 0.3);

      // Distance score: 1.0 if right next to target, degrades towards max radius
      let distanceScore = 0.9;
      if (distanceKm != null && demand.max_radius_km > 0) {
        distanceScore = Math.max(0.4, 1.0 - (distanceKm / demand.max_radius_km) * 0.5);
      }

      const matchScore = Math.min(1.0, Math.max(0.1, Number((0.6 * priceScore + 0.4 * distanceScore).toFixed(2))));

      // 5. Send push alert (OneSignal with graceful fallback)
      let notificationSent = false;
      try {
        if (process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_API_KEY) {
          const res = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
            },
            body: JSON.stringify({
              app_id: process.env.ONESIGNAL_APP_ID,
              include_external_user_ids: [demand.buyer_id],
              headings: { en: 'New Scrap Match!' },
              contents: {
                en: `A new ${listing.category} listing (${listingQty} ${listing.unit}) matches your demand!`,
              },
              data: { listingId: listing.id, demandId: demand.id },
            }),
          });
          if (res.ok) {
            notificationSent = true;
          }
        }
      } catch {
        // Degraded mode / fallback: notification_sent remains false
      }

      // 6. Persist match record
      const match = await demandRepo.createMatch({
        demand_id: demand.id,
        listing_id: listing.id,
        match_score: matchScore,
        distance_km: distanceKm,
        notification_sent: notificationSent,
        status: 'UNNOTICED',
      });

      matchesCreated.push(match);
    }

    return matchesCreated;
  },
};
