# Chokro — Documentation Hub

Welcome to the documentation for **Chokro (চক্র)**, an AI-powered circular economy, scrap valuation, and reverse logistics platform in Bangladesh connecting households, recycling partners, and campus institutions.

---

## 🧭 Master Documentation Map

| Category | Directory | Purpose | Key Documents |
| :--- | :--- | :--- | :--- |
| **Technical Specs** | [`docs/specs/`](./specs/) | System invariants, architecture contracts & modular feature specs | [00 System Capability](./specs/00-product-capability.md) · [01 Identity & Trust](./specs/01-identity-and-trust.md) · [02 Marketplace](./specs/02-marketplace.md) · [03 Intelligence & AI](./specs/03-intelligence-and-engagement.md) · [04 Collections & Wallet](./specs/04-collections-and-wallet.md) |
| **Product & Academic SRS** | [`docs/product/`](./product/) | Product requirements, market validation, competitive analysis & course rubrics | [Course Guideline & Rubrics](./product/course-guideline.md) · [PRD v2.0](./product/PRD.md) · [SRS Requirements](./product/SRS_Functional_Requirements.md) · [Competitive Analysis](./product/competitive-analysis.md) · [Validation Report](./product/validation-report.md) |
| **Planning & Delivery** | [`docs/planning/`](./planning/) | 16-feature allocation roadmap, product pivot alignment & team mapping | [Feature Slate (16 Features)](./planning/feature-slate.md) · [Product Pivot & Handover](./planning/chokro-product-handover.md) · [Team & Git Map](./planning/team-git-users.md) |
| **Agent Governance** | [`docs/agents/`](./agents/) | AI agent guidelines, triage labeling & GitHub issue tracker workflows | [Domain Rules](./agents/domain.md) · [Issue Tracker Workflow](./agents/issue-tracker.md) · [Triage Labels](./agents/triage-labels.md) |
| **Local Demos & Architecture** | `docs/demos/` *(untracked)* | Local demonstration scripts, architecture deep-dives, sequence diagrams & viva guides | `DEMO_GUIDE_FEATURE_1_AND_2.md` · `M3_ARCHITECTURE_AND_EXPLANATION.md` · `ASSIGNMENT_03_SUBMISSION.md` |

---

## 👥 Team Responsibilities & Feature Ownership

| Member | Name | GitHub | Assigned Feature Area | Primary Specification | Sprint Features |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **m1** | Sadat SKD | [@SadatSKD](https://github.com/SadatSKD) | Identity, Trust & Settlement | [`docs/specs/01-identity-and-trust.md`](./specs/01-identity-and-trust.md) | F1: Partner KYC · F2: Trust Gate · F3: Escrow · F4: Custody Handover |
| **m2** | Ahmad Sameer | [@Antizer17](https://github.com/Antizer17) | Circular Marketplace & Listings | [`docs/specs/02-marketplace.md`](./specs/02-marketplace.md) | F1: Media Pipeline · F2: Geo-Feed · F3: Demand Board · F4: Counter-Offer |
| **m3** | Sharzil Nafis | [@sharzilnfz](https://github.com/sharzilnfz) | Valuation & Reverse Logistics | [`docs/specs/03-intelligence-and-engagement.md`](./specs/03-intelligence-and-engagement.md) | F1: Valuation Engine · F2: Vision Agent · F3: Geo-Dispatch · F4: B2B Auctions |
| **m4** | Imran Ahmed Upom | [@Imran-1815](https://github.com/Imran-1815) | Collections, Drop Zones & Wallet | [`docs/specs/04-collections-and-wallet.md`](./specs/04-collections-and-wallet.md) | F1: Zone Poster · F2: QR Deposit · F3: MFS Payout · F4: ESG Carbon Ledger |

---

## 📖 Recommended Reading Paths

### 1. For Developers & AI Coding Agents
1. [`AGENT_GUIDE.md`](../AGENT_GUIDE.md) — Fast-context architectural guide, DB schemas, and API catalog.
2. [`CONTEXT.md`](../CONTEXT.md) — Ubiquitous domain dictionary and terminology rules.
3. [`AGENTS.md`](../AGENTS.md) — Surgical diff guidelines and execution rules.
4. [`docs/planning/feature-slate.md`](./planning/feature-slate.md) — 16-feature architecture spine.

### 2. For Academic SRS & Product Reviewers
1. [`docs/product/course-guideline.md`](./product/course-guideline.md) — Coursework constraints and feature rubrics.
2. [`docs/product/PRD.md`](./product/PRD.md) — Product vision, problem statement, and core metrics.
3. [`docs/product/SRS_Functional_Requirements.md`](./product/SRS_Functional_Requirements.md) — Functional and non-functional requirements.
4. [`docs/product/competitive-analysis.md`](./product/competitive-analysis.md) — Local Bangladesh recycling market analysis.
5. [`docs/product/validation-report.md`](./product/validation-report.md) — Ground-truth field survey and validation findings.

