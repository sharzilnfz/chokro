import Link from 'next/link';
import { db, listings, and, eq, desc } from '@chokro/db';

export const dynamic = 'force-dynamic';

const CATEGORY_LABELS: Record<string, string> = {
  CLOTHES: 'Clothes',
  BOOKS: 'Books',
  PLASTICS: 'Plastics',
  PAPER: 'Paper',
  E_WASTE: 'E-waste',
  FURNITURE: 'Furniture',
  ELECTRONICS: 'Electronics',
  METAL: 'Metal',
};

export default async function BrowsePage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const cat = category && CATEGORY_LABELS[category] ? category : undefined;

  const rows = await db
    .select({
      id: listings.id,
      category: listings.category,
      unit: listings.unit,
      declaredWeight: listings.declared_weight,
      pieceCount: listings.piece_count,
      declaredCondition: listings.declared_condition,
      priceBdt: listings.price_bdt,
    })
    .from(listings)
    .where(and(eq(listings.status, 'ACTIVE'), cat ? eq(listings.category, cat) : undefined))
    .orderBy(desc(listings.created_at))
    .limit(50);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 720, margin: '0 auto', padding: 32, color: '#222' }}>
      <p style={{ marginBottom: 4, color: '#777', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
        Chokro
      </p>
      <h1 style={{ margin: '0 0 4px' }}>Browse listings{cat ? ` — ${CATEGORY_LABELS[cat]}` : ''}</h1>
      <p style={{ margin: '0 0 24px', color: '#555' }}>
        {rows.length} active listing(s). <Link href="/browse">Show all categories</Link>
      </p>

      {rows.length === 0 ? (
        <p>No active listings here yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {rows.map((row) => (
            <li
              key={row.id}
              style={{
                border: '1px solid #e5e5e5',
                borderRadius: 8,
                padding: '14px 16px',
                marginBottom: 12,
              }}
            >
              <div style={{ fontWeight: 600 }}>
                {CATEGORY_LABELS[row.category] ?? row.category}
              </div>
              <div style={{ color: '#444', marginTop: 4 }}>
                {row.unit === 'kg' ? `${row.declaredWeight} kg` : `${row.pieceCount} pieces`} &middot;{' '}
                {row.declaredCondition} condition &middot; {row.priceBdt} BDT
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
