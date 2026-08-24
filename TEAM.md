# Team Members, Sprint 3 Tickets & GitHub Profiles

**Repository:** [sharzilnfz/chokro](https://github.com/sharzilnfz/chokro)  
**Active Branch:** [`Sprint3`](https://github.com/sharzilnfz/chokro/tree/Sprint3)

This document maps team member IDs (`m1`–`m4`) to their GitHub accounts, Gmail addresses, assigned feature areas, and specific **Sprint 3 tickets & specifications** for the Chokro project.

---

## 👥 Team Member & Sprint 3 Ticket Mapping

| Member ID | Name | GitHub User | Email / Gmail | Assigned Feature Area | Sprint 3 Tickets | Primary Specs |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **m1** | Sadat SKD | [@SadatSKD](https://github.com/SadatSKD) | `sadatskd003@gmail.com` | Trust Gate, Identity & Settlement | **Ticket 02**, **Ticket 08a**, **Ticket 08b**, **Ticket 09b** (co-owned) | [`SPEC 12`](./docs/specs/build/12-trust-gate.md), [`SPEC 15`](./docs/specs/build/15-partner-doc-intelligence-ocr.md) |
| **m2** | Ahmad Sameer | [@Antizer17](https://github.com/Antizer17) | `ahmad.sameer.5122@gmail.com` | Circular Marketplace & Discovery | **Ticket 03**, **Ticket 05**, **Ticket 06** | [`SPEC 16`](./docs/specs/build/16-listing-media-privacy-pipeline.md), [`SPEC 17`](./docs/specs/build/17-hyperlocal-feed-and-demand-board.md), [`SPEC 18`](./docs/specs/build/18-counter-offer-negotiation.md) |
| **m3** | Sharzil Nafis | [@sharzilnfz](https://github.com/sharzilnfz) | `sharzilrs@gmail.com` | Valuation, Intelligence & Core Spine | **Ticket 01a**, **Ticket 01b**, **Ticket 09b** (co-owned), **Ticket 11** (lead) | [`SPEC 10`](./docs/specs/build/10-loop-closure-manifest.md), [`SPEC 03`](./docs/specs/03-intelligence-and-engagement.md) |
| **m4** | Imran Ahmed Upom | [@Imran-1815](https://github.com/Imran-1815) | `imran.ahmed.upom@g.bracu.ac.bd` | Drop Zones, Green Wallet & ESG Impact | **Ticket 04**, **Ticket 07**, **Ticket 09a**, **Ticket 10** | [`SPEC 11`](./docs/specs/build/11-verified-deposit-path.md), [`SPEC 13`](./docs/specs/build/13-wallet-settlement.md), [`SPEC 14`](./docs/specs/build/14-impact-and-institutional-value.md), [`SPEC 19`](./docs/specs/build/19-zone-telemetry-and-posters.md) |

---

## 🔒 Absolute Git Ownership Protocol (Author + Committer)

> [!IMPORTANT]
> To ensure **100% absolute ownership** on GitHub with no secondary "Committed by..." attribution badge, both the **Author** and **Committer** must match the target member.

### Option A: One-Line Inline Execution (Recommended)
Set all 4 environment variables on the commit command:
```bash
GIT_AUTHOR_NAME="<Name>" GIT_AUTHOR_EMAIL="<Email>" GIT_COMMITTER_NAME="<Name>" GIT_COMMITTER_EMAIL="<Email>" git commit -m "<Message>"
```

### Option B: Local Repository / Worktree Config
Configure the local git repository or worktree before committing:
```bash
git config user.name "<Name>"
git config user.email "<Email>"
git commit -m "<Message>"
```

---

## 📋 Member Breakdown & Sprint 3 Responsibilities

### Member 1 (`m1`) — Sadat SKD
- **GitHub:** [@SadatSKD](https://github.com/SadatSKD)
- **Email:** `sadatskd003@gmail.com`
- **Domain:** `partners`, `verification_decisions`, `custody_handovers`, `escrow_holds`
- **Sprint 3 Tickets:**
  - **Ticket 02:** Partner KYC Document Intelligence & OCR Gate ([`SPEC 15`](./docs/specs/build/15-partner-doc-intelligence-ocr.md)) — Google Cloud Vision OCR, `kyc_extractions`, `e_waste_licensed` flag gate, Admin KYC Queue (`A06`).
  - **Ticket 08a:** Trust Gate Pure Decision Engine, pHash/dHash Duplicate Image Detection & Dynamic Thresholds ([`SPEC 12`](./docs/specs/build/12-trust-gate.md)) — `verification_decisions`, `fraud_flags`, Admin Config (`A08`).
  - **Ticket 08b:** Custody Handover 2-Sided OTP Handshake & Admin Escalation Worklist ([`SPEC 12`](./docs/specs/build/12-trust-gate.md)) — `custody_handovers`, `otp_challenges`, Screens `A07`, `M08`.
  - **Ticket 09b:** Auction Escrow Hold & Unified Disputes ([`SPEC 13`](./docs/specs/build/13-wallet-settlement.md)) — `escrow_holds`, `dispute_tickets`, dispute arbitration panel (`A09`, `M15`).

**Full-Ownership Commit Commands:**
```bash
# Ticket 02 (Partner KYC OCR)
GIT_AUTHOR_NAME="Sadat SKD" GIT_AUTHOR_EMAIL="sadatskd003@gmail.com" \
GIT_COMMITTER_NAME="Sadat SKD" GIT_COMMITTER_EMAIL="sadatskd003@gmail.com" \
git commit -m "feat(kyc): implement partner kyc document intelligence and ocr gate (ticket 02)"

# Ticket 08a (Trust Gate Core & pHash)
GIT_AUTHOR_NAME="Sadat SKD" GIT_AUTHOR_EMAIL="sadatskd003@gmail.com" \
GIT_COMMITTER_NAME="Sadat SKD" GIT_COMMITTER_EMAIL="sadatskd003@gmail.com" \
git commit -m "feat(trust-gate): implement pure decision engine, phash duplicate detection and thresholds (ticket 08a)"

# Ticket 08b (Custody Handover OTP & Admin Worklist)
GIT_AUTHOR_NAME="Sadat SKD" GIT_AUTHOR_EMAIL="sadatskd003@gmail.com" \
GIT_COMMITTER_NAME="Sadat SKD" GIT_COMMITTER_EMAIL="sadatskd003@gmail.com" \
git commit -m "feat(handover): implement custody handover otp and admin escalation worklist (ticket 08b)"

# Ticket 09b (Escrow Hold & Disputes)
GIT_AUTHOR_NAME="Sadat SKD" GIT_AUTHOR_EMAIL="sadatskd003@gmail.com" \
GIT_COMMITTER_NAME="Sadat SKD" GIT_COMMITTER_EMAIL="sadatskd003@gmail.com" \
git commit -m "feat(escrow): implement b2b auction escrow hold and dispute arbitration (ticket 09b)"
```

---

### Member 2 (`m2`) — Ahmad Sameer
- **GitHub:** [@Antizer17](https://github.com/Antizer17)
- **Email:** `ahmad.sameer.5122@gmail.com`
- **Domain:** `listings`, `listing_media`, `buyer_demands`, `negotiation_threads`
- **Sprint 3 Tickets:**
  - **Ticket 03:** Listing Media Pipeline & Privacy-Safe Ingest ([`SPEC 16`](./docs/specs/build/16-listing-media-privacy-pipeline.md)) — `listing_media`, EXIF/GPS coordinate stripping, WebP derivative sizing (`thumb`, `card`, `full`), Cloudinary / Sharp pipeline, Screen `M02`.
  - **Ticket 05:** Hyperlocal Geo-Discovery Feed & Recycler Demand Board ([`SPEC 17`](./docs/specs/build/17-hyperlocal-feed-and-demand-board.md)) — Pure SQL Haversine radius ranking (1km–10km), Thana facets, `buyer_demands`, synchronous `demand_matches`, Screens `M01`, `M11`.
  - **Ticket 06:** Binding Counter-Offer Negotiation Engine ([`SPEC 18`](./docs/specs/build/18-counter-offer-negotiation.md)) — Bilateral bargaining state machine (`negotiation_threads`, `negotiation_offers`), single active offer invariant, 24h TTL, atomic binding acceptance, Screen `M12`.

**Full-Ownership Commit Commands:**
```bash
# Ticket 03 (Media Pipeline & EXIF Strip)
GIT_AUTHOR_NAME="Ahmad Sameer" GIT_AUTHOR_EMAIL="ahmad.sameer.5122@gmail.com" \
GIT_COMMITTER_NAME="Ahmad Sameer" GIT_COMMITTER_EMAIL="ahmad.sameer.5122@gmail.com" \
git commit -m "feat(media): implement listing media pipeline and exif privacy strip (ticket 03)"

# Ticket 05 (Hyperlocal Feed & Demand Board)
GIT_AUTHOR_NAME="Ahmad Sameer" GIT_AUTHOR_EMAIL="ahmad.sameer.5122@gmail.com" \
GIT_COMMITTER_NAME="Ahmad Sameer" GIT_COMMITTER_EMAIL="ahmad.sameer.5122@gmail.com" \
git commit -m "feat(discovery): implement hyperlocal radius feed and reverse demand board (ticket 05)"

# Ticket 06 (Counter-Offer Engine)
GIT_AUTHOR_NAME="Ahmad Sameer" GIT_AUTHOR_EMAIL="ahmad.sameer.5122@gmail.com" \
GIT_COMMITTER_NAME="Ahmad Sameer" GIT_COMMITTER_EMAIL="ahmad.sameer.5122@gmail.com" \
git commit -m "feat(negotiation): implement binding counter-offer negotiation engine (ticket 06)"
```

---

### Member 3 (`m3`) — Sharzil Nafis
- **GitHub:** [@sharzilnfz](https://github.com/sharzilnfz)
- **Email:** `sharzilrs@gmail.com`
- **Domain:** `rate_card_entries`, `valuation_scans`, `pickup_orders`, `auction_lots`, Core Architecture
- **Sprint 3 Tickets:**
  - **Ticket 01a:** Core Spine, Storage Seam, Error Taxonomy & Invariants ([`SPEC 10`](./docs/specs/build/10-loop-closure-manifest.md)) — PGlite in-memory test runner, Rate Card fallback deletion, auction bid monotonic sequence, bounded Haversine resolution.
  - **Ticket 01b:** API Namespace Consolidation & CORS Allowlist ([`SPEC 10`](./docs/specs/build/10-loop-closure-manifest.md)) — `/api/v1` namespace consolidation, CORS allowlist, dispatch query optimization.
  - **Ticket 11:** Dynamic Seed Engine & 7-Scenario Demo Matrix ([`SPEC 21`](./docs/specs/build/21-seed-data-and-scenarios.md)) — Multi-table dynamic relative timestamps (`Date.now() + offset`), priming 27 Mobile + 13 Admin screens with zero empty states.

**Full-Ownership Commit Commands:**
```bash
# Ticket 01a (Core Spine & Seam)
GIT_AUTHOR_NAME="Sharzil Nafis" GIT_AUTHOR_EMAIL="sharzilrs@gmail.com" \
GIT_COMMITTER_NAME="Sharzil Nafis" GIT_COMMITTER_EMAIL="sharzilrs@gmail.com" \
git commit -m "feat(core): implement core spine, storage seam, and error taxonomy (ticket 01a)"

# Ticket 01b (API Namespace & CORS)
GIT_AUTHOR_NAME="Sharzil Nafis" GIT_AUTHOR_EMAIL="sharzilrs@gmail.com" \
GIT_COMMITTER_NAME="Sharzil Nafis" GIT_COMMITTER_EMAIL="sharzilrs@gmail.com" \
git commit -m "feat(api): consolidate api namespace to /api/v1 and configure cors allowlist (ticket 01b)"

# Ticket 11 (Dynamic Seed & Scenarios)
GIT_AUTHOR_NAME="Sharzil Nafis" GIT_AUTHOR_EMAIL="sharzilrs@gmail.com" \
GIT_COMMITTER_NAME="Sharzil Nafis" GIT_COMMITTER_EMAIL="sharzilrs@gmail.com" \
git commit -m "feat(seed): implement dynamic seed engine and 7-scenario demo matrix (ticket 11)"
```

---

### Member 4 (`m4`) — Imran Ahmed Upom
- **GitHub:** [@Imran-1815](https://github.com/Imran-1815)
- **Email:** `imran.ahmed.upom@g.bracu.ac.bd`
- **Domain:** `drop_zones`, `drop_sessions`, `redemption_requests`, `impact_records`
- **Sprint 3 Tickets:**
  - **Ticket 04:** Drop-Zone Telemetry & Dynamic Poster Infra ([`SPEC 19`](./docs/specs/build/19-zone-telemetry-and-posters.md)) — `zone_capacity_logs`, fill ratio modeling, $\ge 85\%$ auto-empty trigger, signed HMAC-SHA256 SVG printable poster generation (`A03`).
  - **Ticket 07:** Verified Deposit Path: Drop Session & Emptying ([`SPEC 11`](./docs/specs/build/11-verified-deposit-path.md)) — Single-use 15m `drop_sessions`, camera evidence linking, pending green credit minting, `zone_emptying_records`, divergence calculations, Screens `M05`, `M06`.
  - **Ticket 09a:** Green Wallet Redemption & MFS Cash-Out Engine ([`SPEC 13`](./docs/specs/build/13-wallet-settlement.md)) — `redemption_requests`, `payout_records`, monthly liability caps (`A11`), overdraw protection, mock SSLCommerz MFS payout, Screens `M14`, `A10`.
  - **Ticket 10:** Impact Ledger, ESG Certificates & Sponsorship Pools ([`SPEC 14`](./docs/specs/build/14-impact-and-institutional-value.md)) — `impact_records`, Climatiq emission factors, campus sponsorship pools, cryptographic sustainability certificates (`sustainability_certificates`, Screens `M16`, `M17`, `A12`).

**Full-Ownership Commit Commands:**
```bash
# Ticket 04 (Zone Telemetry & Posters)
GIT_AUTHOR_NAME="Imran Ahmed Upom" GIT_AUTHOR_EMAIL="imran.ahmed.upom@g.bracu.ac.bd" \
GIT_COMMITTER_NAME="Imran Ahmed Upom" GIT_COMMITTER_EMAIL="imran.ahmed.upom@g.bracu.ac.bd" \
git commit -m "feat(zones): implement drop-zone telemetry and dynamic poster generator (ticket 04)"

# Ticket 07 (Verified Deposit Path)
GIT_AUTHOR_NAME="Imran Ahmed Upom" GIT_AUTHOR_EMAIL="imran.ahmed.upom@g.bracu.ac.bd" \
GIT_COMMITTER_NAME="Imran Ahmed Upom" GIT_COMMITTER_EMAIL="imran.ahmed.upom@g.bracu.ac.bd" \
git commit -m "feat(deposit): implement verified deposit path and drop session state machine (ticket 07)"

# Ticket 09a (Wallet Redemption & Payout)
GIT_AUTHOR_NAME="Imran Ahmed Upom" GIT_AUTHOR_EMAIL="imran.ahmed.upom@g.bracu.ac.bd" \
GIT_COMMITTER_NAME="Imran Ahmed Upom" GIT_COMMITTER_EMAIL="imran.ahmed.upom@g.bracu.ac.bd" \
git commit -m "feat(wallet): implement green wallet redemption and mfs cash-out engine (ticket 09a)"

# Ticket 10 (Impact Ledger & ESG)
GIT_AUTHOR_NAME="Imran Ahmed Upom" GIT_AUTHOR_EMAIL="imran.ahmed.upom@g.bracu.ac.bd" \
GIT_COMMITTER_NAME="Imran Ahmed Upom" GIT_COMMITTER_EMAIL="imran.ahmed.upom@g.bracu.ac.bd" \
git commit -m "feat(impact): implement impact ledger, esg certificates and sponsorship pools (ticket 10)"
```

---

## ⚡ Master Ticket-to-Author/Committer Quick Reference

| Ticket | Description | Owner | Full Ownership Commit Command Snippet |
| :--- | :--- | :--- | :--- |
| **01a** | Core Spine & Storage Seam | `m3` Sharzil | `GIT_AUTHOR_NAME="Sharzil Nafis" GIT_AUTHOR_EMAIL="sharzilrs@gmail.com" GIT_COMMITTER_NAME="Sharzil Nafis" GIT_COMMITTER_EMAIL="sharzilrs@gmail.com" git commit -m "feat(core): ..."` |
| **01b** | API Namespace & CORS | `m3` Sharzil | `GIT_AUTHOR_NAME="Sharzil Nafis" GIT_AUTHOR_EMAIL="sharzilrs@gmail.com" GIT_COMMITTER_NAME="Sharzil Nafis" GIT_COMMITTER_EMAIL="sharzilrs@gmail.com" git commit -m "feat(api): ..."` |
| **02** | Partner KYC OCR Gate | `m1` Sadat | `GIT_AUTHOR_NAME="Sadat SKD" GIT_AUTHOR_EMAIL="sadatskd003@gmail.com" GIT_COMMITTER_NAME="Sadat SKD" GIT_COMMITTER_EMAIL="sadatskd003@gmail.com" git commit -m "feat(kyc): ..."` |
| **03** | Media Pipeline & Privacy EXIF | `m2` Sameer | `GIT_AUTHOR_NAME="Ahmad Sameer" GIT_AUTHOR_EMAIL="ahmad.sameer.5122@gmail.com" GIT_COMMITTER_NAME="Ahmad Sameer" GIT_COMMITTER_EMAIL="ahmad.sameer.5122@gmail.com" git commit -m "feat(media): ..."` |
| **04** | Zone Telemetry & Posters | `m4` Imran | `GIT_AUTHOR_NAME="Imran Ahmed Upom" GIT_AUTHOR_EMAIL="imran.ahmed.upom@g.bracu.ac.bd" GIT_COMMITTER_NAME="Imran Ahmed Upom" GIT_COMMITTER_EMAIL="imran.ahmed.upom@g.bracu.ac.bd" git commit -m "feat(zones): ..."` |
| **05** | Hyperlocal Feed & Demands | `m2` Sameer | `GIT_AUTHOR_NAME="Ahmad Sameer" GIT_AUTHOR_EMAIL="ahmad.sameer.5122@gmail.com" GIT_COMMITTER_NAME="Ahmad Sameer" GIT_COMMITTER_EMAIL="ahmad.sameer.5122@gmail.com" git commit -m "feat(discovery): ..."` |
| **06** | Counter-Offer Negotiation | `m2` Sameer | `GIT_AUTHOR_NAME="Ahmad Sameer" GIT_AUTHOR_EMAIL="ahmad.sameer.5122@gmail.com" GIT_COMMITTER_NAME="Ahmad Sameer" GIT_COMMITTER_EMAIL="ahmad.sameer.5122@gmail.com" git commit -m "feat(negotiation): ..."` |
| **07** | Verified Deposit Session | `m4` Imran | `GIT_AUTHOR_NAME="Imran Ahmed Upom" GIT_AUTHOR_EMAIL="imran.ahmed.upom@g.bracu.ac.bd" GIT_COMMITTER_NAME="Imran Ahmed Upom" GIT_COMMITTER_EMAIL="imran.ahmed.upom@g.bracu.ac.bd" git commit -m "feat(deposit): ..."` |
| **08a** | Trust Gate Core & pHash | `m1` Sadat | `GIT_AUTHOR_NAME="Sadat SKD" GIT_AUTHOR_EMAIL="sadatskd003@gmail.com" GIT_COMMITTER_NAME="Sadat SKD" GIT_COMMITTER_EMAIL="sadatskd003@gmail.com" git commit -m "feat(trust-gate): ..."` |
| **08b** | Custody OTP & Worklist | `m1` Sadat | `GIT_AUTHOR_NAME="Sadat SKD" GIT_AUTHOR_EMAIL="sadatskd003@gmail.com" GIT_COMMITTER_NAME="Sadat SKD" GIT_COMMITTER_EMAIL="sadatskd003@gmail.com" git commit -m "feat(handover): ..."` |
| **09a** | Wallet Redemption & MFS | `m4` Imran | `GIT_AUTHOR_NAME="Imran Ahmed Upom" GIT_AUTHOR_EMAIL="imran.ahmed.upom@g.bracu.ac.bd" GIT_COMMITTER_NAME="Imran Ahmed Upom" GIT_COMMITTER_EMAIL="imran.ahmed.upom@g.bracu.ac.bd" git commit -m "feat(wallet): ..."` |
| **09b** | Auction Escrow & Disputes | `m1` Sadat / `m3` Sharzil | `GIT_AUTHOR_NAME="Sadat SKD" GIT_AUTHOR_EMAIL="sadatskd003@gmail.com" GIT_COMMITTER_NAME="Sadat SKD" GIT_COMMITTER_EMAIL="sadatskd003@gmail.com" git commit -m "feat(escrow): ..."` |
| **10** | Impact Ledger & ESG Certs | `m4` Imran | `GIT_AUTHOR_NAME="Imran Ahmed Upom" GIT_AUTHOR_EMAIL="imran.ahmed.upom@g.bracu.ac.bd" GIT_COMMITTER_NAME="Imran Ahmed Upom" GIT_COMMITTER_EMAIL="imran.ahmed.upom@g.bracu.ac.bd" git commit -m "feat(impact): ..."` |
| **11** | Dynamic Seed Engine | All / `m3` Sharzil | `GIT_AUTHOR_NAME="Sharzil Nafis" GIT_AUTHOR_EMAIL="sharzilrs@gmail.com" GIT_COMMITTER_NAME="Sharzil Nafis" GIT_COMMITTER_EMAIL="sharzilrs@gmail.com" git commit -m "feat(seed): ..."` |
