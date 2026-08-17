import { db, listings, savedListings, users } from '@chokro/db';
import { and, eq, gte } from 'drizzle-orm';
import { getTransporter } from './mailer';

const WINDOW_HOURS = Number(process.env.NOTIFY_WINDOW_HOURS || 24);
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const APP_SCHEME = process.env.APP_SCHEME || 'chokro';
const EMAIL_FROM = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@chokro.dev';

export interface NewListing {
  id: string;
  ownerId: string;
  category: string;
  unit: string;
  declaredWeight: string | null;
  pieceCount: number | null;
  declaredCondition: string;
  priceBdt: string;
}

export interface Recipient {
  email: string;
  matched: NewListing[];
}

export async function collectRecipients(): Promise<{ newListings: NewListing[]; recipients: Recipient[] }> {
  const since = new Date(Date.now() - WINDOW_HOURS * 3_600_000);

  const newRows = await db
    .select({
      id: listings.id,
      ownerId: listings.owner_id,
      category: listings.category,
      unit: listings.unit,
      declaredWeight: listings.declared_weight,
      pieceCount: listings.piece_count,
      declaredCondition: listings.declared_condition,
      priceBdt: listings.price_bdt,
    })
    .from(listings)
    .where(and(eq(listings.status, 'ACTIVE'), gte(listings.created_at, since)));

  if (newRows.length === 0) return { newListings: [], recipients: [] };

  const newListings = newRows;
  const recentCategories = new Set(newListings.map((l) => l.category));

  // Distinct (user, category) pairs from every listing a user has saved.
  const savedRows = await db
    .selectDistinctOn([savedListings.user_id, listings.category], {
      userId: savedListings.user_id,
      email: users.email,
      category: listings.category,
    })
    .from(savedListings)
    .innerJoin(listings, eq(savedListings.listing_id, listings.id))
    .innerJoin(users, eq(users.id, savedListings.user_id));

  const byUser = new Map<string, { email: string; categories: Set<string> }>();
  for (const row of savedRows) {
    if (!recentCategories.has(row.category)) continue;
    const entry = byUser.get(row.userId) ?? { email: row.email, categories: new Set<string>() };
    entry.categories.add(row.category);
    byUser.set(row.userId, entry);
  }

  const recipients: Recipient[] = [];
  for (const [userId, entry] of byUser) {
    const matched = newListings.filter((l) => l.ownerId !== userId && entry.categories.has(l.category));
    if (matched.length > 0) recipients.push({ email: entry.email, matched });
  }

  return { newListings, recipients };
}

function renderEmail(matched: NewListing[]): { subject: string; html: string; text: string } {
  const byCategory = new Map<string, NewListing[]>();
  for (const listing of matched) {
    const bucket = byCategory.get(listing.category) ?? [];
    bucket.push(listing);
    byCategory.set(listing.category, bucket);
  }

  const categories = [...byCategory.keys()];
  const subject = `New listings in ${categories.join(', ')} — Chokro`;

  const sectionHtml = [...byCategory.entries()]
    .map(([category, items]) => {
      const rows = items
        .map((l) => {
          const quantity = l.unit === 'kg' ? `${l.declaredWeight} kg` : `${l.pieceCount} pieces`;
          return `<li><strong>${quantity}</strong> &middot; condition: ${l.declaredCondition} &middot; <strong>${l.priceBdt} BDT</strong></li>`;
        })
        .join('\n');
      const link = `${APP_URL}/browse?category=${encodeURIComponent(category)}`;
      const deepLink = `${APP_SCHEME}://browse?category=${encodeURIComponent(category)}`;
      return `
      <h3>${category}</h3>
      <ul>${rows}</ul>
      <p><a href="${deepLink}">Open new ${category} listings in the Chokro app &rarr;</a><br/>
      <a href="${link}" style="color:#777;font-size:13px">or view in browser</a></p>`;
    })
    .join('\n');

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#222;line-height:1.5">
      <h2 style="margin-top:0">New e-waste listings worth a look</h2>
      <p>${matched.length} new listing(s) match categories you saved:</p>
      ${sectionHtml}
      <p style="margin-top:24px;color:#777;font-size:12px">You are receiving this because you saved listings in these categories. &mdash; Chokro</p>
    </div>`;

  const lines = matched.map((l) => {
    const quantity = l.unit === 'kg' ? `${l.declaredWeight} kg` : `${l.pieceCount} pieces`;
    const deepLink = `${APP_SCHEME}://browse?category=${encodeURIComponent(l.category)}`;
    const webLink = `${APP_URL}/browse?category=${encodeURIComponent(l.category)}`;
    return `- [${l.category}] ${quantity}, ${l.declaredCondition} condition, ${l.priceBdt} BDT (app: ${deepLink} | browser: ${webLink})`;
  });

  const text = [
    'New e-waste listings worth a look',
    '',
    `${matched.length} new listing(s) match categories you saved:`,
    ...lines,
    '',
    '-- Chokro',
  ].join('\n');

  return { subject, html, text };
}

export async function runNotificationJob(): Promise<{ newListings: number; sent: number; recipients: number }> {
  const mailer = await getTransporter();
  console.log(`[notify] transport=${mailer.mode} window=${WINDOW_HOURS}h`);

  const { newListings, recipients } = await collectRecipients();
  console.log(`[notify] new listings in window: ${newListings.length}`);

  if (recipients.length === 0) {
    console.log('[notify] no saved-category matches; nothing sent');
    return { newListings: newListings.length, sent: 0, recipients: 0 };
  }

  let sent = 0;
  for (const recipient of recipients) {
    const { subject, html, text } = renderEmail(recipient.matched);
    const info = await mailer.transporter.sendMail({
      from: EMAIL_FROM,
      to: recipient.email,
      subject,
      html,
      text,
    });
    sent += 1;

    if (mailer.mode === 'json') {
      console.log(`[notify] [json] to=${recipient.email} subject="${subject}"\n${String(info.message)}`);
    } else {
      console.log(`[notify] queued to=${recipient.email} subject="${subject}" matches=${recipient.matched.length}`);
    }

    const previewUrl = mailer.previewUrl(info);
    if (previewUrl) console.log(`[notify] preview: ${previewUrl}`);
  }

  console.log(`[notify] done: ${sent}/${recipients.length} recipient(s) emailed`);
  return { newListings: newListings.length, sent, recipients: recipients.length };
}