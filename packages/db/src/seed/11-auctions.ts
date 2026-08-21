import { db, users } from '../index';
// Seed scenario section 11 — moved verbatim from the original seed().
import { ensureAuctionLot } from './context';
import type { SeedContext } from './context';

export async function run(ctx: SeedContext): Promise<void> {
  const { partnerUser, recycler1User, recycler2User, buyerFarukUser } = ctx.users;

  // =========================================================================
  // 11. SCENARIO 1: LIVE AUCTIONS (Lot #101 & Anti-Snipe Lot #102)
  // =========================================================================
  // Lot #101: 500kg Mixed Copper Cables (৳280k starting, ৳320k reserve met, 4 competing bids, ~15m remaining)
  await ensureAuctionLot({
    lot: {
      title: 'Lot #101: 500kg Mixed Copper Cables',
      description: 'Industrial grade mixed copper cables stripped and sorted from telecommunications upgrade. High purity electrolytic copper content.',
      category: 'METAL',
      quantity_kg: '500.00',
      starting_price_bdt: '280000.00',
      reserve_price_bdt: '320000.00',
      origin_label: 'Tejgaon Industrial Area, Dhaka',
      status: 'LIVE',
      opens_at: new Date(Date.now() - 30 * 60_000),
      closes_at: new Date(Date.now() + 15 * 60_000),
      created_by: partnerUser.id,
    },
    bids: [
      { bidderUserId: recycler1User.id, amount: '285000.00', minutesAgo: 25 },
      { bidderUserId: recycler2User.id, amount: '295000.00', minutesAgo: 20 },
      { bidderUserId: buyerFarukUser.id, amount: '310000.00', minutesAgo: 10 },
      { bidderUserId: recycler1User.id, amount: '325000.00', minutesAgo: 3 }, // Reserve met! (৳325k >= ৳320k)
    ],
    refreshWindow: { opensMinutesAgo: 30, closesMinutesFromNow: 15 },
  });

  // Lot #102: Anti-Snipe Target (5 mins remaining, 0 bids)
  await ensureAuctionLot({
    lot: {
      title: 'Lot #102: 800kg Mixed Ferrous Scrap & Steel Offcuts',
      description: 'Compressed MSAL offcuts, gates and shelving from a full floor clear-out. Sorted, dry, under cover.',
      category: 'METAL',
      quantity_kg: '800.00',
      starting_price_bdt: '40000.00',
      reserve_price_bdt: '52345.00',
      origin_label: 'Narayanganj EPZ',
      status: 'LIVE',
      opens_at: new Date(Date.now() - 25 * 60_000),
      closes_at: new Date(Date.now() + 5 * 60_000),
      created_by: partnerUser.id,
    },
    bids: [],
    refreshWindow: { opensMinutesAgo: 25, closesMinutesFromNow: 5 },
  });

  // Lot #098: Ended Lot (Sold above reserve)
  const lotEndedSold = await ensureAuctionLot({
    lot: {
      title: 'Lot #098: 1200kg Cullet Glass - Bottling Plant Line Purge',
      description: 'Crushed flint and amber cullet from a beverage line changeover, contamination screened.',
      category: 'GLASS',
      quantity_kg: '1200.00',
      starting_price_bdt: '12000.00',
      reserve_price_bdt: '15000.00',
      origin_label: 'Gazipur beverage plant',
      status: 'ENDED',
      opens_at: new Date(Date.now() - 26 * 3600_000),
      closes_at: new Date(Date.now() - 2 * 3600_000),
      created_by: partnerUser.id,
    },
    bids: [
      { bidderUserId: recycler1User.id, amount: '12050.00', minutesAgo: 25 * 60 },
      { bidderUserId: recycler2User.id, amount: '13000.00', minutesAgo: 24 * 60 },
      { bidderUserId: recycler1User.id, amount: '15100.00', minutesAgo: 2 * 60 + 10 },
    ],
    winningBid: true,
  });

  // Lot #095: Ended Lot (No sale - below reserve)
  await ensureAuctionLot({
    lot: {
      title: 'Lot #095: 950kg Cardboard Bales - Retail Chain Backrooms',
      description: 'OCC bales collected across six retail backrooms. Some tape residue.',
      category: 'PAPER',
      quantity_kg: '950.00',
      starting_price_bdt: '8000.00',
      reserve_price_bdt: '10500.00',
      origin_label: 'Banani retail strip',
      status: 'ENDED',
      opens_at: new Date(Date.now() - 50 * 3600_000),
      closes_at: new Date(Date.now() - 26 * 3600_000),
      created_by: partnerUser.id,
    },
    bids: [
      { bidderUserId: recycler2User.id, amount: '8050.00', minutesAgo: 27 * 60 },
    ],
  });

  ctx.lotEndedSold = lotEndedSold;
}
