# Chokro — Validation Report (Ground-Truth Check)

**Method:** PRD assumptions tested against ground reality: Bangladesh mobile/payments data, Dhaka informal waste sector, e-waste regulation, vision-API feasibility, fraud literature, campus precedent. Sources cited inline; unverifiable items marked [UNVERIFIED], general-knowledge inferences marked (GK).
**Research session conducted:** 2026-08-02.

---

## 1. Assumption ledger

| # | PRD assumption | Verdict | Evidence | Recommended change |
|---|---|---|---|---|
| 1 | Target users have smartphones (Android) | **VALIDATED** (urban/campus) | Android = 91% of BD mobile OS share (StatCounter); 2.0M smartphone shipments Q2 2024, +20% YoY (IDC); 23 Mbps median mobile data | Scope TAM to urban Android users; design for ৳10k phones |
| 2 | bKash ubiquity makes cash-out intuitive | **VALIDATED** | 82M+ verified bKash users; 239M total MFS accounts (Bangladesh Bank) | Keep; mirror real fee structure in mock |
| 3 | Mock bKash disbursement at MVP is sound | **VALIDATED** | Real disbursement API is contract-gated (business agreement + KYC + settlement banking) — weeks of legal/ops, impossible for a student MVP (GK) | Keep mock; define threshold + fee UX honestly (A3) |
| 4 | Users will happily cash out small rewards | **RISKY** | bKash agent cash-out fee = 1.85% (BDT 18.50/1000, bkash.com) | Minimum cash-out ৳300; show fee note in mock UI |
| 5 | Admin-set rate card is viable | **VALIDATED** | BanglaBin (Dhaka) publishes a **weekly** rate card: newspaper ৳13/kg, PET ৳20/kg, iron ৳35/kg, copper ৳600/kg; **e-waste priced per piece** (mobile ৳50–580/pc, fridge ৳1,000–3,900/pc) | Adopt weekly cadence; per-piece for e-waste/appliances (A2) |
| 6 | Informal collectors will adopt an app | **RISKY** | E-Vangariwala (est. 2024, 2,400+ pickups, ৳18L paid) runs on **WhatsApp + web form**; ~120K Dhaka waste pickers, ~90% under 30, many low-literacy | No collector app at MVP; partner orgs + admin dispatch (A5) |
| 7 | "Verified e-waste partner" is legally definable | **VALIDATED w/ caveat** | Hazardous Waste (e-waste) Management Rules 2021 (DoE, under ECA 1995); EPR targets 10%→50% over 5 years; licensed recyclers exist (e.g., Azizu Recycling, Narayanganj) but **no public registry** — manual due diligence required | Partner onboarding must capture DoE license certificate |
| 8 | Off-the-shelf vision can classify category | **VALIDATED w/ caveats** | Google Vision label detection $1.50/1,000 images; multimodal LLMs ~$0.001–0.01/image; TrashNet-class benchmarks strong on clean single items (GK on exact %) | Keep; expect clutter/multi-item/low-light errors |
| 9 | Off-the-shelf vision can grade condition | **RISKY / lean INVALIDATED** | No off-the-shelf API grades condition; lighting-dependent, subjective, sets payout → dispute magnet | AI *suggests* condition; human confirms at pickup (A1) |
| 10 | Trust Gate can auto-verify pickups | **RISKY** | Reverse-vending machines have documented exploits (SBA Research 2022); GPS spoofing is commodity on Android | Layered signal stack + random audits (A4) |
| 11 | Campus QR drop zones have local precedent | **UNVERIFIABLE** | No sustained QR-reward campus program in BD found; SWM Rules 2021 (source segregation) are a policy hook; Dhaka startups sell institutional collection | Frame as pilot; secure university ops contract first (A8) |

---

## 2. Key facts that shape the product

**Payments:** bKash cash-out fees — 1.85% at agents, 1.49% ATM, 1.395% "Priyo" agents (bkash.com). Users are fee-sensitive; micro-payouts are bad UX.

**Informal sector:** Dhaka generates ~7,500 t/day waste; ~37% formally collected; informal sector does most recycling (TBS, Nov 2025). Doorstep vhangari/kabadiwala buying with haggling and opaque scales is the norm — **Chokro's price transparency is a genuine wedge.**

**Local incumbents to study (primary research to-do):**
- **BanglaBin** — weekly rate card, corporate collection, "Green Certificate" (banglabin.com/prices)
- **E-Vangariwala** — doorstep sell/donate/declutter, "we weigh in front of you," digital receipts, WhatsApp-first (evangariwala.com)
- Also: WasteXBD, getscraprate.com/bd

**E-waste:** 2021 Rules assign duties to producers/collectors/transporters/repairers/recyclers. "Approved partner" = DoE-licensed. Do not stockpile e-waste on campus; keep handover receipts.

**Vision APIs:** Category classification from a phone photo is feasible and cheap (~$0.0015–0.01/image). Error modes: cluttered backgrounds, multiple items in frame, dark indoor photos on low-end phones, lookalike categories ("toy phone" vs "broken phone").

**Fraud → Trust Gate countermeasure mapping** (RVM exploits, deposit-return fraud literature, GPS-spoof platform docs):

| Attack | Countermeasure |
|---|---|
| Duplicate/fake photos | Perceptual-hash dedupe + timestamp check; camera-only capture (no gallery upload) |
| GPS spoofing at drop zone | Mock-location flag + **physical QR scanned at the zone** (beats raw GPS) |
| User–collector self-dealing | Two-sided confirmation + random photo audits + per-pair velocity limits |
| Weight inflation | Scale at zone/collector + photo of scale reading; per-piece pricing sidesteps weight for e-waste |
| Referral/reward farming | Device signals, one reward per verified action, delayed credit release |

**Campus angle:** Episodic bin pilots die without a funded operator emptying them (GK). The QR drop zone succeeds only if pickup logistics and a small incentive budget are contracted up front with the university.

---

## 3. Top 5 MVP risks

1. **Condition-assessment disputes** — AI mis-grades → payout arguments → trust collapse. *Mitigate: AI = category + routing only; human confirms condition & price at pickup (A1).*
2. **Reward fraud draining the credit pool** — dup photos, GPS spoof, self-dealing. *Mitigate: A4 signal stack + delayed credit + 5% random audits.*
3. **Collector adoption failure** — informal sector won't use a native app. *Mitigate: partner-org dispatch model; Bangla-first labels (A5, OD-3).*
4. **Rate-card drift** — scrap prices are volatile (copper ৳600/kg vs mixed plastic ৳6/kg); stale rates overpay (bleed margin) or underpay (users return to kabadiwala). *Mitigate: weekly review; launch with 8–10 SKUs (A2).*
5. **E-waste compliance liability** — 2021 Rules put duties on collectors/transporters. *Mitigate: written agreement with a DoE-licensed recycler; handover receipts; no campus stockpiling.*

---

## 4. MVP scope recommendations (adopted into specs)

1. **Cut automated condition grading** → "collector confirms at pickup" (one screen). Removes the biggest accuracy risk; matches proven Dhaka operator behavior.
2. **Honest mock cash-out** → visible balance, ৳300 minimum, "~1.85% real-world fee" disclosure. Demos the loop credibly without payment integration.
3. **Study BanglaBin & E-Vangariwala ops** (primary research, week 1) — they already run Chokro's core loop minus campus/AI/Trust Gate. Chokro's differentiators are the campus zones, multi-path routing, and verification — invest there, not in rebuilding pickup logistics.

---

## 5. Key sources

- StatCounter mobile OS share BD; IDC via TelecomLead smartphone shipments; DataReportal Digital 2024 Bangladesh
- bkash.com cash-out fee pages; bKash 82M users (company release); Bangladesh Bank MFS stats via bdnews24
- The Business Standard: "Inside Dhaka's waste management crisis" (Nov 2025); waste-picker livelihoods study (academia.edu)
- banglabin.com/prices; evangariwala.com
- Hazardous Waste (e-waste) Management Rules 2021 (chemlinked.com; enviliance.com); TI-Bangladesh e-waste policy brief (EPR targets); Dhaka Tribune/TBS on Azizu Recycling; wasteconcern.org (SWM Rules 2021)
- Google Cloud Vision pricing; SBA Research (RVM vulnerability, 2022); Reloop deposit-fraud factsheet; Radar/Incognia/Appdome on GPS-spoof countermeasures
