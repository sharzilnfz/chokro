// GET /api/drop-zones/locator — browses active drop zones with fill levels, accepted categories, and distances.
import { apiData, safeRoute } from '@/lib/http';
import { DropZoneTelemetryDomain } from '@/lib/domain/DropZoneTelemetryDomain';

export const GET = safeRoute(async (req: Request) => {
  const url = new URL(req.url);
  const latStr = url.searchParams.get('lat');
  const lngStr = url.searchParams.get('lng');
  const radiusStr = url.searchParams.get('radiusKm') || url.searchParams.get('radius');

  const lat = latStr ? parseFloat(latStr) : undefined;
  const lng = lngStr ? parseFloat(lngStr) : undefined;
  const radiusKm = radiusStr ? parseFloat(radiusStr) : undefined;

  const zones = await DropZoneTelemetryDomain.getLocatorZones({
    lat: isNaN(lat as number) ? undefined : lat,
    lng: isNaN(lng as number) ? undefined : lng,
    radiusKm: isNaN(radiusKm as number) ? undefined : radiusKm,
  });

  return apiData({ zones });
});
