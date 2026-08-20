// FeedDomain: Hyperlocal Geo-Discovery, Haversine spatial math, and reverse geocoding (SPEC 17)
import { listingRepo, ListingFilter } from '../repos/listings';

export interface ReverseGeoResult {
  thana: string;
  zilla: string;
  division?: string;
  source: 'NOMINATIM' | 'OFFLINE_FALLBACK';
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
