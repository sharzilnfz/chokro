# Git User & Team Member Mapping (Sprint 3)

**GitHub Repository:** [sharzilnfz/chokro](https://github.com/sharzilnfz/chokro)  
**Sprint 3 Branch:** [`Sprint3`](https://github.com/sharzilnfz/chokro/tree/Sprint3)

This document maps team member IDs (`m1`–`m4`) to their GitHub accounts, Gmail addresses, assigned feature areas, and specific **Sprint 3 tickets & specifications** for the Chokro project.

---

## 👥 Team Member & Sprint 3 Ticket Mapping

| Member ID | Name | GitHub User | Email / Gmail | Assigned Feature Area | Sprint 3 Tickets | Primary Specs |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **m1** | Sadat SKD | [@SadatSKD](https://github.com/SadatSKD) | `sadatskd003@gmail.com` | Trust Gate, Identity & Settlement | **Ticket 02**, **Ticket 08a**, **Ticket 08b**, **Ticket 09b** (co-owned) | [`SPEC 12`](../specs/build/12-trust-gate.md), [`SPEC 15`](../specs/build/15-partner-doc-intelligence-ocr.md) |
| **m2** | Ahmad Sameer | [@Antizer17](https://github.com/Antizer17) | `ahmad.sameer.5122@gmail.com` | Circular Marketplace & Discovery | **Ticket 03**, **Ticket 05**, **Ticket 06** | [`SPEC 16`](../specs/build/16-listing-media-privacy-pipeline.md), [`SPEC 17`](../specs/build/17-hyperlocal-feed-and-demand-board.md), [`SPEC 18`](../specs/build/18-counter-offer-negotiation.md) |
| **m3** | Sharzil Nafis | [@sharzilnfz](https://github.com/sharzilnfz) | `sharzilrs@gmail.com` | Valuation, Intelligence & Core Spine | **Ticket 01a**, **Ticket 01b**, **Ticket 09b** (co-owned), **Ticket 11** (lead) | [`SPEC 10`](../specs/build/10-loop-closure-manifest.md), [`SPEC 03`](../specs/03-intelligence-and-engagement.md) |
| **m4** | Imran Ahmed Upom | [@Imran-1815](https://github.com/Imran-1815) | `imran.ahmed.upom@g.bracu.ac.bd` | Drop Zones, Green Wallet & ESG Impact | **Ticket 04**, **Ticket 07**, **Ticket 09a**, **Ticket 10** | [`SPEC 11`](../specs/build/11-verified-deposit-path.md), [`SPEC 13`](../specs/build/13-wallet-settlement.md), [`SPEC 14`](../specs/build/14-impact-and-institutional-value.md), [`SPEC 19`](../specs/build/19-zone-telemetry-and-posters.md) |

---

## 🛠️ Sprint 3 Full-Ownership Git Commit Commands (Author + Committer)

Setting both `GIT_AUTHOR_*` and `GIT_COMMITTER_*` ensures GitHub attributes 100% full ownership to each member with no secondary attribution badges:

### Member 1 (`m1`) — Sadat SKD
```bash
# Ticket 02: Partner KYC OCR
GIT_AUTHOR_NAME="Sadat SKD" GIT_AUTHOR_EMAIL="sadatskd003@gmail.com" \
GIT_COMMITTER_NAME="Sadat SKD" GIT_COMMITTER_EMAIL="sadatskd003@gmail.com" \
git commit -m "feat(kyc): implement partner kyc document intelligence and ocr gate (ticket 02)"

# Ticket 08a: Trust Gate Decision & pHash
GIT_AUTHOR_NAME="Sadat SKD" GIT_AUTHOR_EMAIL="sadatskd003@gmail.com" \
GIT_COMMITTER_NAME="Sadat SKD" GIT_COMMITTER_EMAIL="sadatskd003@gmail.com" \
git commit -m "feat(trust-gate): implement pure decision engine, phash duplicate detection and thresholds (ticket 08a)"

# Ticket 08b: Custody Handover OTP & Admin Worklist
GIT_AUTHOR_NAME="Sadat SKD" GIT_AUTHOR_EMAIL="sadatskd003@gmail.com" \
GIT_COMMITTER_NAME="Sadat SKD" GIT_COMMITTER_EMAIL="sadatskd003@gmail.com" \
git commit -m "feat(handover): implement custody handover otp and admin escalation worklist (ticket 08b)"

# Ticket 09b: Auction Escrow & Disputes
GIT_AUTHOR_NAME="Sadat SKD" GIT_AUTHOR_EMAIL="sadatskd003@gmail.com" \
GIT_COMMITTER_NAME="Sadat SKD" GIT_COMMITTER_EMAIL="sadatskd003@gmail.com" \
git commit -m "feat(escrow): implement b2b auction escrow hold and dispute arbitration (ticket 09b)"
```

### Member 2 (`m2`) — Ahmad Sameer
```bash
# Ticket 03: Listing Media Pipeline & EXIF Strip
GIT_AUTHOR_NAME="Ahmad Sameer" GIT_AUTHOR_EMAIL="ahmad.sameer.5122@gmail.com" \
GIT_COMMITTER_NAME="Ahmad Sameer" GIT_COMMITTER_EMAIL="ahmad.sameer.5122@gmail.com" \
git commit -m "feat(media): implement listing media pipeline and exif privacy strip (ticket 03)"

# Ticket 05: Hyperlocal Radius Feed & Demand Board
GIT_AUTHOR_NAME="Ahmad Sameer" GIT_AUTHOR_EMAIL="ahmad.sameer.5122@gmail.com" \
GIT_COMMITTER_NAME="Ahmad Sameer" GIT_COMMITTER_EMAIL="ahmad.sameer.5122@gmail.com" \
git commit -m "feat(discovery): implement hyperlocal radius feed and reverse demand board (ticket 05)"

# Ticket 06: Binding Counter-Offer Negotiation Engine
GIT_AUTHOR_NAME="Ahmad Sameer" GIT_AUTHOR_EMAIL="ahmad.sameer.5122@gmail.com" \
GIT_COMMITTER_NAME="Ahmad Sameer" GIT_COMMITTER_EMAIL="ahmad.sameer.5122@gmail.com" \
git commit -m "feat(negotiation): implement binding counter-offer negotiation engine (ticket 06)"
```

### Member 3 (`m3`) — Sharzil Nafis
```bash
# Ticket 01a: Core Spine & Seam
GIT_AUTHOR_NAME="Sharzil Nafis" GIT_AUTHOR_EMAIL="sharzilrs@gmail.com" \
GIT_COMMITTER_NAME="Sharzil Nafis" GIT_COMMITTER_EMAIL="sharzilrs@gmail.com" \
git commit -m "feat(core): implement core spine, storage seam, and error taxonomy (ticket 01a)"

# Ticket 01b: API Namespace & CORS
GIT_AUTHOR_NAME="Sharzil Nafis" GIT_AUTHOR_EMAIL="sharzilrs@gmail.com" \
GIT_COMMITTER_NAME="Sharzil Nafis" GIT_COMMITTER_EMAIL="sharzilrs@gmail.com" \
git commit -m "feat(api): consolidate api namespace to /api/v1 and configure cors allowlist (ticket 01b)"

# Ticket 11: Dynamic Seed Engine
GIT_AUTHOR_NAME="Sharzil Nafis" GIT_AUTHOR_EMAIL="sharzilrs@gmail.com" \
GIT_COMMITTER_NAME="Sharzil Nafis" GIT_COMMITTER_EMAIL="sharzilrs@gmail.com" \
git commit -m "feat(seed): implement dynamic seed engine and 7-scenario demo matrix (ticket 11)"
```

### Member 4 (`m4`) — Imran Ahmed Upom
```bash
# Ticket 04: Drop-Zone Telemetry & Dynamic Posters
GIT_AUTHOR_NAME="Imran Ahmed Upom" GIT_AUTHOR_EMAIL="imran.ahmed.upom@g.bracu.ac.bd" \
GIT_COMMITTER_NAME="Imran Ahmed Upom" GIT_COMMITTER_EMAIL="imran.ahmed.upom@g.bracu.ac.bd" \
git commit -m "feat(zones): implement drop-zone telemetry and dynamic poster generator (ticket 04)"

# Ticket 07: Verified Deposit Path
GIT_AUTHOR_NAME="Imran Ahmed Upom" GIT_AUTHOR_EMAIL="imran.ahmed.upom@g.bracu.ac.bd" \
GIT_COMMITTER_NAME="Imran Ahmed Upom" GIT_COMMITTER_EMAIL="imran.ahmed.upom@g.bracu.ac.bd" \
git commit -m "feat(deposit): implement verified deposit path and drop session state machine (ticket 07)"

# Ticket 09a: Green Wallet Redemption & Payout
GIT_AUTHOR_NAME="Imran Ahmed Upom" GIT_AUTHOR_EMAIL="imran.ahmed.upom@g.bracu.ac.bd" \
GIT_COMMITTER_NAME="Imran Ahmed Upom" GIT_COMMITTER_EMAIL="imran.ahmed.upom@g.bracu.ac.bd" \
git commit -m "feat(wallet): implement green wallet redemption and mfs cash-out engine (ticket 09a)"

# Ticket 10: Impact Ledger & ESG Certificates
GIT_AUTHOR_NAME="Imran Ahmed Upom" GIT_AUTHOR_EMAIL="imran.ahmed.upom@g.bracu.ac.bd" \
GIT_COMMITTER_NAME="Imran Ahmed Upom" GIT_COMMITTER_EMAIL="imran.ahmed.upom@g.bracu.ac.bd" \
git commit -m "feat(impact): implement impact ledger, esg certificates and sponsorship pools (ticket 10)"
```
