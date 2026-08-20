// GET /api/drop-zones/{id}/poster — admin only. Serves a printable HTML/SVG poster
// containing the drop zone's cryptographic QR code, accepted materials, and map/vector fallback.
import { requireAdmin } from '../../../../../lib/auth';
import { apiError, safeRoute } from '../../../../../lib/http';
import { DropZoneTelemetryDomain, type PosterOptions } from '../../../../../lib/domain/DropZoneTelemetryDomain';

// Renders a printable drop-zone poster for the given zone id.
export const GET = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;
  const { id } = await params;

  const url = new URL(req.url);
  const format = (url.searchParams.get('format') || 'html') as PosterOptions['format'];
  const size = (url.searchParams.get('size') || 'A4') as PosterOptions['size'];

  try {
    const poster = await DropZoneTelemetryDomain.generatePoster(id, { format, size });

    if (format === 'svg') {
      return new Response(poster.qrSvg, {
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'X-Poster-Degraded': poster.degradedMode ? 'true' : 'false',
        },
      });
    }

    return new Response(poster.html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Poster-Degraded': poster.degradedMode ? 'true' : 'false',
      },
    });
  } catch (err: any) {
    if (err?.message?.includes('not found')) {
      return apiError('Drop zone not found', 404);
    }
    return apiError(err?.message || 'Failed to generate poster', 500);
  }
});


