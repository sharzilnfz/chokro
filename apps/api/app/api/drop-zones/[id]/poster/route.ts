import { NextResponse } from 'next/server';
import { db, dropZones, memoryStore } from '@chokro/db';
import { eq } from 'drizzle-orm';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  let zone: any;

  try {
    [zone] = await db.select().from(dropZones).where(eq(dropZones.id, id));
  } catch (dbErr) {
    zone = memoryStore.dropZones.find((z) => z.id === id);
  }

  if (!zone) {
    return NextResponse.json({ error: 'Drop zone not found' }, { status: 404 });
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Chokro Drop-Zone Poster — ${zone.name}</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 40px; background: #FFF; color: #0F172A; }
          .poster { border: 8px solid #10B981; border-radius: 16px; padding: 40px; max-width: 600px; margin: 0 auto; }
          h1 { color: #10B981; font-size: 36px; margin-bottom: 8px; }
          .institution { font-size: 18px; color: #64748B; margin-bottom: 24px; }
          .qr-box { background: #F1F5F9; border: 2px dashed #94A3B8; padding: 24px; margin: 24px 0; border-radius: 12px; }
          .qr-token { font-family: monospace; font-size: 18px; font-weight: bold; word-break: break-all; color: #0F172A; }
          .categories { margin-top: 24px; font-size: 14px; color: #475569; }
          .badge { display: inline-block; background: #E2E8F0; padding: 6px 12px; border-radius: 12px; margin: 4px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="poster">
          <h1>CHOKRO DROP ZONE</h1>
          <h2>${zone.name}</h2>
          <div class="institution">Institution: ${zone.institution_id}</div>

          <div class="qr-box">
            <p>Scan with Chokro App to Deposit</p>
            <div class="qr-token">${zone.qr_token}</div>
          </div>

          <div class="categories">
            <p>Accepted Materials:</p>
            ${(zone.accepted_categories || []).map((cat: string) => `<span class="badge">${cat}</span>`).join('')}
          </div>
        </div>
      </body>
    </html>
  `;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
