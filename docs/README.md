# Chokro — Documentation Hub

Welcome to the documentation for **Chokro**, a circular-economy mobile and web platform for Bangladesh that connects households, verified partners, and institutions for smart reuse, repair, donation, and e-waste recycling.

---

## 🧭 Documentation Map

| Category | Directory | Purpose | Key Documents |
| :--- | :--- | :--- | :--- |
| **Product & Research** | [`docs/product/`](./product/) | Product requirements, market validation, competitive analysis & academic SRS | [PRD v2.0](./product/PRD.md) · [SRS Requirements](./product/SRS_Functional_Requirements.md) · [Competitive Analysis](./product/competitive-analysis.md) · [Validation Report](./product/validation-report.md) · [PRD Review](./product/prd-review.md) |
| **Technical Specs** | [`docs/specs/`](./specs/) | Modular feature specs, interface contracts & system invariants | [00 System Capability](./specs/00-product-capability.md) · [01 Identity & Trust](./specs/01-identity-and-trust.md) · [02 Marketplace](./specs/02-marketplace.md) · [03 Intelligence & AI](./specs/03-intelligence-and-engagement.md) · [04 Collections & Wallet](./specs/04-collections-and-wallet.md) |
| **Architecture** | [`docs/architecture/`](./architecture/) | System design, deep module analysis, refactoring candidates & visual flows | [Architecture Index](./architecture/README.md) · [Architecture Explained](./architecture/architecture-explained.md) · [Visual Flows](./architecture/architecture-visual-flows.md) · [Architecture Review](./architecture/architecture-review.md) · [Interactive Review](./architecture/architecture-review.html) |
| **Planning & Delivery** | [`docs/planning/`](./planning/) | Sprint roadmaps, ticket breakdowns, live progress tracking & team ownership | [Sprint Roadmap](./planning/sprint-plan.md) · [Progress Tracker](./planning/progress.md) · [Team & Git Map](./planning/team-git-users.md) |
| **Technical Guides** | [`docs/guides/`](./guides/) | Manual testing procedures, styling migration plans & feature implementation notes | [Manual Testing Guide](./guides/manual-testing.md) · [NativeWind Migration](./guides/nativewind-migration-plan.md) · [Rate Card Estimator](./guides/rate-card-estimator.md) · [Interactive Masterclass](./guides/chokro-masterclass.html) |
| **Agent Governance** | [`docs/agents/`](./agents/) | AI agent guidelines, triage labeling & GitHub issue tracker workflows | [Domain Rules](./agents/domain.md) · [Issue Tracker Workflow](./agents/issue-tracker.md) · [Triage Labels](./agents/triage-labels.md) |
| **Superpowers** | [`docs/superpowers/`](./superpowers/) | Structured brainstorming designs and step-by-step implementation plans | [Plans](./superpowers/plans/) · [Specs](./superpowers/specs/) |
| **Archive** | [`docs/archive/`](./archive/) | Historical brainstorms and temporary migration scripts | [v1 Ideas Brainstorm](./archive/chokro-IDEAS.txt) · [Scratch Scripts](./archive/scratch/) |

---

## 👥 Team Responsibilities & Feature Ownership

| Member | Name | GitHub | Assigned Feature Area | Primary Specification | Sprint Tickets |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **m1** | Sadat SKD | [@SadatSKD](https://github.com/SadatSKD) | Identity, Trust & Partners | [`docs/specs/01-identity-and-trust.md`](./specs/01-identity-and-trust.md) | `TA1`–`TA4` |
| **m2** | Ahmad Sameer | [@Antizer17](https://github.com/Antizer17) | Circular Marketplace & Listings | [`docs/specs/02-marketplace.md`](./specs/02-marketplace.md) | `TB1`–`TB6` |
| **m3** | Sharzil Nafis | [@sharzilnfz](https://github.com/sharzilnfz) | Intelligence, Valuation & Gamification | [`docs/specs/03-intelligence-and-engagement.md`](./specs/03-intelligence-and-engagement.md) | `TC1`–`TC4` |
| **m4** | Imran Ahmed Upom | [@Imran-1815](https://github.com/Imran-1815) | Collections, Trust Gate & Green Wallet | [`docs/specs/04-collections-and-wallet.md`](./specs/04-collections-and-wallet.md) | `TD1`–`TD8` |

---

## 📖 Recommended Reading Paths

### 1. For Developers & Contributors
1. [`docs/architecture/architecture-explained.md`](./architecture/architecture-explained.md) — Understand core system design and patterns.
2. [`docs/specs/00-product-capability.md`](./specs/00-product-capability.md) — System invariants, database schemas, and shared contracts.
3. Your assigned feature spec in [`docs/specs/`](./specs/).
4. [`docs/planning/progress.md`](./planning/progress.md) — Check current ticket status and what to build next.

### 2. For Product Managers & Academic Reviewers
1. [`docs/product/PRD.md`](./product/PRD.md) — High-level product vision, user personas, and core metrics.
2. [`docs/product/SRS_Functional_Requirements.md`](./product/SRS_Functional_Requirements.md) — Academic functional requirements breakdown.
3. [`docs/product/competitive-analysis.md`](./product/competitive-analysis.md) — Market landscape and differentiator analysis.
4. [`docs/product/validation-report.md`](./product/validation-report.md) — Ground-truth validation in Bangladesh.

### 3. For QA & Testers
1. [`docs/guides/manual-testing.md`](./guides/manual-testing.md) — Step-by-step test matrix for mobile and API flows.
2. [`docs/planning/progress.md`](./planning/progress.md) — Verification criteria per sprint ticket.
