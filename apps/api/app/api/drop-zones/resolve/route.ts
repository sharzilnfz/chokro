import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import { apiError, safeRoute } from '../../../../lib/http';
import { isValidQrToken } from '../../../../lib/qr';
import { dropZoneRepo } from '../../../../lib/repos/dropZones';

export const GET = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const lat = url.searchParams.get('lat');
  const lng = url.searchParams.get('lng');

  let zone = null;
  if (lat && lng) {
    zone = await dropZoneRepo.resolveByLocation(Number(lat), Number(lng));
  } else {
    if (!token || !isValidQrToken(token)) {
      return apiError('Invalid drop zone token', 400);
    }
    zone = await dropZoneRepo.findByQrToken(token);
  }

  if (!zone) {
    return apiError('Drop zone not found', 404);
  }

  return NextResponse.json({
    zone: {
      name: zone.name,
      status: zone.status,
      acceptedCategories: zone.accepted_categories,
    },
  });
});


