# 03 — Sharpen F4 B2B Bulk Scrap Auction & Live Bidding Engine

**What to build:** Sharpen the Auction domain module by ensuring sealed reserve price masking, dynamic 2-minute anti-snipe extensions, monotonic server-authoritative bid numbers, and lazy-close mechanics are strictly encapsulated, keeping Pusher WebSocket realtime updates behind a decoupled event adapter seam.

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] Ensure sealed reserve prices are stripped at the serialization seam (`toPublicLot`)
- [x] Enforce anti-snipe clock extensions, minimum ৳50 bid increments, and lazy-close state transitions inside `AuctionDomain`
- [x] Maintain decoupled Pusher realtime broadcast adapter seam with polling fallback
- [x] Verify with automated test suite (`auction.test.ts`)
