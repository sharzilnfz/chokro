// FeedDomain: Hyperlocal Geo-Discovery, Haversine spatial math, and reverse geocoding (SPEC 17)
import { listingRepo, ListingFilter } from '../repos/listings';
import { savedListingRepo } from '../repos/savedListings';
import { verifyAuthHeader } from '../auth';
import { CategoryEnum, ConditionEnum } from '@chokro/shared';
import { z } from 'zod';
import { KeysetPagination } from './KeysetPagination';
import type { KeysetCursor } from './KeysetPagination';
import { BadRequestError } from '../database';

export interface ReverseGeoResult {
  thana: string;
  zilla: string;
  division?: string;
  source: 'NOMINATIM' | 'OFFLINE_FALLBACK';
}

// Typed feed filters parsed from URL search params.
export interface FeedQuery {
  category?: string;
  condition?: string;
  cursor: KeysetCursor | null;
  limit: number;
  saved?: boolean;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  thana?: string;
  sort?: string;
}

export interface FeedPage {
  items: Array<Record<string, unknown> & { id: string; saved: boolean }>;
  nextCursor: string | null;
}

// Known Dhaka Thana coordinate centroids for offline / degraded fallback
const DHAKA_THANAS: Array<{ thana: string; zilla: string; lat: number; lng: number; radiusKm: number }> = [
  { thana: 'Dhanmondi', zilla: 'Dhaka', lat: 23.7461, lng: 90.3742, radiusKm: 3.0 },
  { thana: 'Gulshan', zilla: 'Dhaka', lat: 23.7925, lng: 90.4078, radiusKm: 3.5 },
  { thana: 'Banani', zilla: 'Dhaka', lat: 23.7937, lng: 90.4043, radiusKm: 2.5 },
  { thana: 'Mirpur', zilla: 'Dhaka', lat: 23.8071, lng: 90.3686, radiusKm: 5.0 },
  { thana: 'Uttara', zilla: 'Dhaka', lat: 23.8759, lng: 90.3795, radiusKm: 4.5 },
  { thana: 'Tejgaon', zilla: 'Dhaka', lat: 23.7598, lng: 90.3912, radiusKm: 3.0 },
  { thana: 'Mohakhali', zilla: 'Dhaka', lat: 23.7780, lng: 90.4000, radiusKm: 2.5 },
  { thana: 'Bhatara', zilla: 'Dhaka', lat: 23.8166, lng: 90.4300, radiusKm: 3.5 },
  { thana: 'Badda', zilla: 'Dhaka', lat: 23.7806, lng: 90.4267, radiusKm: 3.0 },
  { thana: 'Motijheel', zilla: 'Dhaka', lat: 23.7330, lng: 90.4172, radiusKm: 2.5 },
  { thana: 'Savar', zilla: 'Dhaka', lat: 23.8583, lng: 90.2667, radiusKm: 8.0 },
  { thana: 'Gazipur Sadar', zilla: 'Gazipur', lat: 23.9999, lng: 90.4203, radiusKm: 8.0 },
];

export const FeedDomain = {
  // Coerce URL search params into typed feed filters; throws BadRequestError
  // when any filter or the cursor fails to parse.
  parseFeedQuery(searchParams: URLSearchParams): FeedQuery {
    const categoryResult = searchParams.get('category') ? CategoryEnum.safeParse(searchParams.get('category')) : null;
    const conditionResult = searchParams.get('condition') ? ConditionEnum.safeParse(searchParams.get('condition')) : null;
    const limitResult = z.coerce.number().int().min(1).max(50).safeParse(searchParams.get('limit') ?? 20);
    const cursor = KeysetPagination.parseCursor(searchParams.get('cursor'));

    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const radiusKmParam = searchParams.get('radiusKm') || searchParams.get('radius');
    const lat = latParam ? Number(latParam) : undefined;
    const lng = lngParam ? Number(lngParam) : undefined;
    const radiusKm = radiusKmParam ? Number(radiusKmParam) : undefined;

    if (
      categoryResult?.success === false ||
      conditionResult?.success === false ||
      !limitResult.success ||
      cursor === undefined ||
      (lat != null && isNaN(lat)) ||
      (lng != null && isNaN(lng)) ||
      (radiusKm != null && isNaN(radiusKm))
    ) {
      throw new BadRequestError('Invalid feed query');
    }

    return {
      category: categoryResult?.data,
      condition: conditionResult?.data,
      cursor,
      limit: limitResult.data,
      saved: searchParams.get('saved') === 'true',
      lat,
      lng,
      radiusKm,
      thana: searchParams.get('thana') || undefined,
      sort: searchParams.get('sort') || undefined,
    };
  },

  // One page of published listings for a viewer: fetches one row beyond the page
  // size to detect more, decorates items with the viewer's saved flags, and
  // encodes the next-page cursor.
  async getFeedPage(query: FeedQuery, req: Request): Promise<FeedPage> {
    const user = verifyAuthHeader(req);
    const savedFilter = query.saved === true;
    if (savedFilter && !user) {
      return { items: [], nextCursor: null };
    }

    // Fetch one row beyond the page size so we can tell whether another page exists.
    const allItems = await listingRepo.findPublished({
      category: query.category,
      condition: query.condition,
      cursor: query.cursor,
      limit: query.limit,
      savedFor: savedFilter && user ? user.userId : null,
      lat: query.lat,
      lng: query.lng,
      radiusKm: query.radiusKm,
      thana: query.thana,
      sort: query.sort,
    });
    const hasMore = allItems.length > query.limit;
    const items = allItems.slice(0, query.limit);

    let savedIds = new Set<string>();
    if (user) {
      savedIds = new Set(await savedListingRepo.findSavedListingIds(user.userId));
    }
    const itemsWithSaved = items.map((item) => ({ ...item, saved: savedIds.has(item.id) }));

    return {
      items: itemsWithSaved,
      nextCursor: hasMore ? KeysetPagination.encodeCursor(items[items.length - 1]) : null,
    };
  },

  // Pure Haversine distance in kilometers
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  },

  // Reverse geocode lat/lng to Thana and Zilla via OSM Nominatim with offline fallback
  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeoResult> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=en`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Chokro-Circular-Platform/1.0 (info@chokro.org)' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = (await response.json()) as {
          address?: {
            suburb?: string;
            city_district?: string;
            county?: string;
            state_district?: string;
            state?: string;
            city?: string;
          };
        };
        const addr = data.address || {};
        const thana = addr.suburb || addr.city_district || addr.county || 'Dhanmondi';
        const zilla = addr.state_district || addr.city || addr.state || 'Dhaka';
        return {
          thana,
          zilla,
          division: addr.state || 'Dhaka Division',
          source: 'NOMINATIM',
        };
      }
    } catch {
      // Degraded mode / offline fallback
    }

    // Offline Nearest Thana Centroid Match
    let nearest = DHAKA_THANAS[0];
    let minDistance = Infinity;

    for (const item of DHAKA_THANAS) {
      const dist = this.calculateDistance(lat, lng, item.lat, item.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = item;
      }
    }

    return {
      thana: nearest.thana,
      zilla: nearest.zilla,
      division: 'Dhaka Division',
      source: 'OFFLINE_FALLBACK',
    };
  },

  // Query published feed with radius, thana, and keyset cursor
  async getFeed(filter?: ListingFilter) {
    return listingRepo.findPublished(filter);
  },
};
