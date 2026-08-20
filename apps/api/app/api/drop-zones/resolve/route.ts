// GET /api/drop-zones/resolve — auth required. Resolves a drop zone from a QR token
// or, when lat/lng are present instead, by location.
import { requireAuth } from '../../../../lib/auth';
import { apiData, apiError, safeRoute } from '../../../../lib/http';
import { isValidQrToken } from '../../../../lib/qr';
import { dropZoneRepo } from '../../../../lib/repos/dropZones';

// Returns the drop zone the caller scanned, resolved either by QR token or
// by coordinates; only non-sensitive fields are exposed.
export const GET = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const lat = url.searchParams.get('lat');
  const lng = url.searchParams.get('lng');

  let zone = null;
  // Prefer geolocation when supplied, otherwise fall back to validating the QR token.
  if (lat && lng) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) {
      return apiError('Invalid coordinates', 400);
    }
    zone = await dropZoneRepo.resolveByLocation(latNum, lngNum);
  } else {
    if (!token || !isValidQrToken(token)) {
      return apiError('Invalid drop zone token', 400);
    }
    zone = await dropZoneRepo.findByQrToken(token);
  }

  if (!zone) {
    return apiError('Drop zone not found', 404);
  }

  // Return a whitelisted subset so callers never receive internal fields.
  return apiData({
    zone: {
      name: zone.name,
      status: zone.status,
      acceptedCategories: zone.accepted_categories,
    },
  });
});


