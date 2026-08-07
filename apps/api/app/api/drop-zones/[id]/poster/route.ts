import QRCode from 'qrcode';
import { requireAdmin } from '../../../../../lib/auth';
import { apiError, safeRoute } from '../../../../../lib/http';
import { dropZoneRepo } from '../../../../../lib/repos/dropZones';

function escapeHtml(value: unknown) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export const GET = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;
  const { id } = await params;
  const zone = await dropZoneRepo.findById(id);

  if (!zone) {
    return apiError('Drop zone not found', 404);
  }

  const qrSvg = await QRCode.toString(zone.qr_token, { type: 'svg', errorCorrectionLevel: 'M', margin: 2 });
  const zoneName = escapeHtml(zone.name);
  const institutionId = escapeHtml(zone.institution_id);
  const categories: unknown[] = Array.isArray(zone.accepted_categories) ? zone.accepted_categories : [];

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Chokro Drop-Zone Poster - ${zoneName}</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 40px; background: #FFF; color: #0F172A; }
          .poster { border: 8px solid #10B981; border-radius: 16px; padding: 40px; max-width: 600px; margin: 0 auto; }
          h1 { color: #10B981; font-size: 36px; margin-bottom: 8px; }
          .institution { font-size: 18px; color: #64748B; margin-bottom: 24px; }
          .qr-box { background: #F1F5F9; border: 2px dashed #94A3B8; padding: 24px; margin: 24px 0; border-radius: 12px; }
          .qr-box svg { display: block; width: min(100%, 320px); height: auto; margin: 0 auto; }
          .categories { margin-top: 24px; font-size: 14px; color: #475569; }
          .badge { display: inline-block; background: #E2E8F0; padding: 6px 12px; border-radius: 12px; margin: 4px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="poster">
          <h1>CHOKRO DROP ZONE</h1>
          <h2>${zoneName}</h2>
          <div class="institution">Institution: ${institutionId}</div>

          <div class="qr-box">
            <p>Scan with the Chokro app to recognize this Drop Zone</p>
            ${qrSvg}
          </div>

          <div class="categories">
            <p>Accepted Materials:</p>
            ${categories.map((category) => `<span class="badge">${escapeHtml(category)}</span>`).join('')}
          </div>
        </div>
      </body>
    </html>
  `;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});

