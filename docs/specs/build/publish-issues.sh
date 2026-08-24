#!/usr/bin/env bash
# Publishes the complete 16-feature build specs suite to GitHub Issues with the ready-for-agent label.
# Requires: gh auth login   (the repo is https://github.com/sharzilnfz/chokro.git)
set -euo pipefail

cd "$(dirname "$0")"

gh label create ready-for-agent \
  --description "Spec is complete and ready to be picked up" \
  --color 0E8A16 2>/dev/null || true

publish() {
  local file="$1" title="$2"
  echo "Creating issue: ${title}"
  gh issue create \
    --title "${title}" \
    --body-file "${file}" \
    --label ready-for-agent
}

# Core Loop Closure
publish 10-loop-closure-manifest.md                 "SPEC 10 — Loop Closure Manifest & Correctness Debt"
publish 11-verified-deposit-path.md                 "SPEC 11 — Verified Deposit Path: Drop Zone Session → Deposit → Pending Green Credit"
publish 12-trust-gate.md                            "SPEC 12 — Trust Gate: Verification Decisions, Custody Handover & Fraud Surface"
publish 13-wallet-settlement.md                     "SPEC 13 — Wallet Settlement: Redemption, Payout, Auction Escrow & Dispute Arbitration"
publish 14-impact-and-institutional-value.md        "SPEC 14 — Impact Ledger, ESG Certificates & the Institutional Payer"

# Teammates' Missing Features
publish 15-partner-doc-intelligence-ocr.md          "SPEC 15 — Partner KYC & Licence Document Intelligence (OCR) [m1 Sadat F1]"
publish 16-listing-media-privacy-pipeline.md        "SPEC 16 — Circular Marketplace Media & Privacy-Safe Ingest Pipeline [m2 Sameer F1]"
publish 17-hyperlocal-feed-and-demand-board.md      "SPEC 17 — Hyperlocal Discovery, Radius Feed & Reverse Recycler Demand Board [m2 Sameer F2, F3]"
publish 18-counter-offer-negotiation.md             "SPEC 18 — Binding Counter-Offer Negotiation Engine [m2 Sameer F4]"
publish 19-zone-telemetry-and-posters.md            "SPEC 19 — Drop-Zone Network Telemetry & Print-Ready Poster Infrastructure [m4 Imran F1]"

# Gap Closures & Demo Readiness
publish 20-frontend-screen-inventory.md             "SPEC 20 — Frontend Screen Inventory & Surface Ownership Matrix"
publish 21-seed-data-and-scenarios.md               "SPEC 21 — Comprehensive Demo Seed Data & Scenario Matrix"
publish 22-rubric-matrix-and-viva-guide.md          "SPEC 22 — Rubric Defense Matrix & CO5 Live Viva Modification Guide"

echo "Done. All 13 build specifications published to GitHub Issues."
