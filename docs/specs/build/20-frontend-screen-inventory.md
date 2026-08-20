# SPEC 20 — Frontend Screen Inventory & Surface Ownership Matrix

**Status:** build spec  
**Purpose:** Resolves Gap 1 (Concrete screen inventory across Mobile & Web Admin surfaces)  
**Depends on:** SPECs 10–19 (API endpoints, state machines, and invariants)  
**Blocks:** Final frontend execution and demo script verification  

---

## 1. Mobile Application Surface Inventory (`apps/mobile`)

The mobile client runs on **React Native + Expo (TypeScript)** with role-based tab switching and an unified `AppShell`.

### Summary Screen Directory

| # | Screen Name | File Path | Role | Owning Member & Feature | Primary API Route / Hook |
|---|---|---|---|---|---|
| **M01** | `FeedScreen` | `src/screens/FeedScreen.tsx` | All | m2 Sameer (F2) | `GET /api/v1/listings/feed` |
| **M02** | `CreateListingScreen` | `src/screens/CreateListingScreen.tsx` | Individual | m2 Sameer (F1) / m3 Sharzil (F2) | `POST /api/v1/media/upload`, `POST /api/v1/listings` |
| **M03** | `VisionScanScreen` | `src/screens/VisionScanScreen.tsx` | Individual | m3 Sharzil (F2) | `POST /api/v1/valuation/classify-and-estimate` |
| **M04** | `RateCardScreen` | `src/screens/RateCardScreen.tsx` | All | m3 Sharzil (F1) | `GET /api/v1/rate-card/published`, `POST /estimate` |
| **M05** | `QRScannerScreen` | `src/screens/QRScannerScreen.tsx` | Individual | m4 Imran (F2) | `POST /api/v1/drop-sessions` |
| **M06** | `DepositFlowScreen` | `src/screens/DepositFlowScreen.tsx` | Individual | m4 Imran (F2) | `POST /api/v1/deposits` |
| **M07** | `PickupScreen` | `src/screens/PickupScreen.tsx` | Individual / Collector | m3 Sharzil (F3) / m1 Sadat (F4) | `POST /api/v1/pickups/book`, `GET /api/v1/pickups/tasks` |
| **M08** | `HandoverOtpModal` | `src/components/HandoverOtpModal.tsx` | Individual / Collector | m1 Sadat (F4) | `POST /api/v1/handovers/verify-otp` |
| **M09** | `AuctionsScreen` | `src/screens/AuctionsScreen.tsx` | Partner / Recycler | m3 Sharzil (F4) | `GET /api/v1/auction-lots/live` |
| **M10** | `LotDetailScreen` | `src/screens/LotDetailScreen.tsx` | Partner / Recycler | m3 Sharzil (F4) / m1 Sadat (F3) | `POST /api/v1/auction-lots/[id]/bids` |
| **M11** | `DemandsScreen` | `src/screens/DemandsScreen.tsx` | Partner / Recycler | m2 Sameer (F3) | `POST /api/v1/demands`, `GET /matches` |
| **M12** | `NegotiationThreadScreen`| `src/screens/NegotiationThreadScreen.tsx`| Individual / Partner | m2 Sameer (F4) | `POST /api/v1/negotiations/[id]/offer`, `/accept` |
| **M13** | `WalletScreen` | `src/screens/WalletScreen.tsx` | Individual | m4 Imran (F3) / m1 Sadat (F2) | `GET /api/v1/wallet/balance`, `GET /history` |
| **M14** | `RedemptionRequestScreen`| `src/screens/RedemptionRequestScreen.tsx`| Individual | m4 Imran (F3) | `POST /api/v1/wallet/redemptions` |
| **M15** | `DisputeScreen` | `src/screens/DisputeScreen.tsx` | Individual / Partner | m1 Sadat (F3) | `POST /api/v1/disputes`, `GET /api/v1/disputes/[id]` |
| **M16** | `ImpactDashboardScreen` | `src/screens/ImpactDashboardScreen.tsx` | Individual | m4 Imran (F4) | `GET /api/v1/impact/personal` |
| **M17** | `CertificateViewScreen`| `src/screens/CertificateViewScreen.tsx`| All | m4 Imran (F4) | `GET /api/v1/certificates/[ref]` |
| **M18** | `PartnerConsoleScreen` | `src/screens/PartnerConsoleScreen.tsx` | Partner | m1 Sadat (F1, F4) | `GET /api/v1/partners/profile`, `POST /kyc` |

---

### Detailed Mobile Screen Specifications

#### M01 — `FeedScreen.tsx` (Hyperlocal Discovery)
- **Role:** Public / Individual / Partner
- **Components:** `RadiusSlider` (1-10km), `ThanaPickerModal`, `ListingCard` (with distance badge and privacy-stripped thumbnails), `EmptyFeedState`.
- **Hooks:** `useListingFeed({ lat, lng, radiusKm, thana, category })`.
- **States:** `LOADING`, `POPULATED`, `EMPTY_WITHIN_RADIUS` (prompts expanding radius slider).

#### M05 & M06 — `QRScannerScreen.tsx` & `DepositFlowScreen.tsx` (Verified Deposit Path)
- **Role:** Individual
- **Components:** `CameraViewfinder` (with QR alignment reticle), `SessionCountdownBadge` (15m TTL), `CategorySelector` (filtered by zone's accepted categories), `CameraOnlyUploader` (gallery disabled), `PendingCreditEstimateCard`.
- **Hooks:** `useDepositSession()`, `useSubmitDeposit()`.
- **Transitions:** `SCAN_QR` $\to$ `OPEN_SESSION` $\to$ `SELECT_CATEGORY` $\to$ `CAPTURE_EVIDENCE` $\to$ `MINT_PENDING_CREDIT`.

#### M08 — `HandoverOtpModal.tsx` (Custody Handshake)
- **Role:** Giver (Individual) & Collector (Partner)
- **Components:** `OtpDisplayCard` (large 6-digit code for giver), `OtpInputPad` (for collector), `CustodyConfirmedAnimation`.
- **API Call:** `POST /api/v1/handovers/verify-otp` $\to$ transitions task to `COLLECTED` and mints pending credit.

#### M12 — `NegotiationThreadScreen.tsx` (Counter-Offer Engine)
- **Role:** Buyer & Seller
- **Components:** `OfferHistoryTimeline`, `ActiveOfferCard` (with live countdown TTL), `CounterOfferInputModal`, `AcceptOfferConfirmDialog`.
- **Realtime Hook:** `useNegotiationStream(threadId)` (subscribes to Pusher / SSE).

#### M13 & M14 — `WalletScreen.tsx` & `RedemptionRequestScreen.tsx` (Green Wallet & Payout)
- **Role:** Individual
- **Components:** `DualBalanceCard` (Separates **Verified** and **Pending** balances with clear info tooltips), `TransactionLedgerList`, `RedeemButton` (disabled when verified $< ৳300$), `MfsProviderPicker` (bKash/Nagad), `HonestFeeBreakdownCard` (discloses 1.85% MFS fee).

---

## 2. Admin Web Console Surface Inventory (`apps/api/app/admin`)

The Admin console is a Next.js App Router Single-Page Application using modular `AdminShell`, auth context, and uniform table/card designs.

### Summary Admin Screen Directory

| # | Page Name | Route / File Path | Owning Member | Primary API Route / Hook |
|---|---|---|---|---|
| **A01** | `CampusesAdmin` | `/admin/campuses/page.tsx` | Core Baseline | `useAdminCampuses()`, `/api/admin/campuses` |
| **A02** | `DropZonesAdmin` | `/admin/drop-zones/page.tsx` | m4 Imran (F1) | `useAdminDropZones()`, `/api/admin/drop-zones` |
| **A03** | `ZoneCapacityConsole` | `/admin/zone-capacity/page.tsx` | m4 Imran (F1) | `GET /api/v1/admin/drop-zones/telemetry` |
| **A04** | `RateCardAdmin` | `/admin/rate-card/page.tsx` | m3 Sharzil (F1) | `useAdminRateCards()`, `/api/admin/rate-card` |
| **A05** | `PartnersAdmin` | `/admin/partners/page.tsx` | m1 Sadat (F1) | `useAdminPartners()`, `/api/admin/partners` |
| **A06** | `PartnerKycQueue` | `/admin/kyc-queue/page.tsx` | m1 Sadat (F1) | `GET /api/v1/admin/partners/kyc/queue` |
| **A07** | `TrustGateEscalation`| `/admin/trust-gate/page.tsx` | m1 Sadat (F2) | `GET /api/v1/admin/trust-gate/escalations` |
| **A08** | `ThresholdConfigAdmin`| `/admin/thresholds/page.tsx`| m1 Sadat (F2) | `GET /api/v1/admin/trust-gate/thresholds` |
| **A09** | `DisputesAdmin` | `/admin/disputes/page.tsx` | m1 Sadat (F3) | `GET /api/v1/admin/disputes` |
| **A10** | `RedemptionsAdmin` | `/admin/redemptions/page.tsx` | m4 Imran (F3) | `GET /api/v1/admin/wallet/redemptions` |
| **A11** | `LiabilityDashboard`| `/admin/liability/page.tsx` | m4 Imran (F3) | `GET /api/v1/admin/wallet/liability` |
| **A12** | `CertificatesAdmin` | `/admin/certificates/page.tsx`| m4 Imran (F4) | `GET /api/v1/admin/impact/certificates` |

---

### Detailed Admin Page Specifications

#### A06 — `PartnerKycQueue` (`/admin/kyc-queue/page.tsx`)
- **Components:** `SideBySideDocViewer` (Uploaded Trade License image on left, extracted OCR JSON on right), `DiffHighlightBadge` (red flag on mismatched license/TIN number), `AdjudicateActionToolbar` (`Approve`, `Reject`, `Grant E-Waste Flag`).
- **Hook:** `useAdminKycQueue()`.

#### A07 — `TrustGateEscalation` (`/admin/trust-gate/page.tsx`)
- **Components:** `EscalationWorklistTable`, `SignalFailureChipGroup` (e.g. `[E_WASTE_MANDATORY_REVIEW]`, `[PHASH_DUPLICATE_IMAGE]`, `[WEIGHT_DIVERGENCE_HIGH]`), `EvidenceBundleModal` (displays deposit photo, scale photo, and GPS geofence map), `DecisionToolbar` (`Clear Credit`, `Reject Deposit`, `Add Fraud Flag`).
- **Hook:** `useAdminEscalationQueue()`.

#### A10 & A11 — `RedemptionsAdmin` & `LiabilityDashboard`
- **Components:** `OutstandingLiabilityMetricCard` (Total unredeemed verified credits vs Monthly Budget Pool), `RedemptionQueueTable`, `BatchPayoutButton` (triggers mock SSLCommerz settlement batch).
- **Hook:** `useAdminRedemptions()`, `useAdminLiability()`.

#### A12 — `CertificatesAdmin` (`/admin/certificates/page.tsx`)
- **Components:** `InstitutionalSummaryTable` (Total kg diverted, CO2e avoided per campus), `CertificateGeneratorModal` (Selects date window, locks impact records, freezes emission factors), `PublicVerificationLinkBox`.

---

## 3. Surface & Role Access Control Matrix

```
                      ┌────────────────────────────────────────────────────────┐
                      │                     APP SHELL                          │
                      └───────────────────────────┬────────────────────────────┘
                                                  │
                ┌─────────────────────────────────┼────────────────────────────────┐
                ▼                                 ▼                                ▼
       [ INDIVIDUAL USER ]               [ VERIFIED PARTNER ]             [ ADMIN OPERATOR ]
       • M01 Feed                        • M01 Feed                       • A01-A12 Admin Web Pages
       • M02 Create Listing              • M09 Auctions (Live Bidding)    • Full Read/Write/Override
       • M03 Vision Scanner              • M11 Recycler Demand Board      • Escalation Adjudication
       • M04 Rate Card                   • M07 Collector Task Dispatch
       • M05/M06 QR Deposit Flow         • M08 Custody OTP Verification
       • M12 Negotiation Threads         • M12 Counter-Offer Desk
       • M13/M14 Green Wallet            • M18 Partner KYC & Fleet Hub
       • M16/M17 Impact Dashboard
```
