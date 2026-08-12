# Design Spec: Documentation Reorganization & Indexing

**Date:** 2026-08-12  
**Status:** Approved  
**Author:** Pair Programming Assistant  

---

## 1. Objective

Transform the cluttered and sprawled root and `docs/` directory into a structured, categorized documentation system with a comprehensive master index (`docs/README.md`), organized domain directories, clean repository root, and validated cross-document links.

---

## 2. Directory Architecture

The documentation tree is organized into 8 functional domain folders:

```
docs/
├── README.md                                 # Master documentation hub & navigation index
├── product/                                  # Product definitions, research & validation
│   ├── PRD.md                                # Product Requirements Document (PRD v2.0)
│   ├── SRS_Functional_Requirements.md        # Academic SRS / CSE471 Functional Requirements
│   ├── competitive-analysis.md               # Market analysis & competitive matrix
│   ├── validation-report.md                  # Ground truths, validation data & localization facts
│   └── prd-review.md                         # Historical review, gap analysis (G1–G12), amendments (A1–A10)
├── specs/                                    # Modular technical specifications by domain/member
│   ├── 00-product-capability.md              # System capability invariants & architecture contracts
│   ├── 01-identity-and-trust.md              # Member 1 (Sadat): Auth, profile, partner onboarding
│   ├── 02-marketplace.md                     # Member 2 (Ahmad): Listings, dual-unit pricing, item catalog
│   ├── 03-intelligence-and-engagement.md     # Member 3 (Sharzil): Next-Life Agent, rate cards, gamification
│   └── 04-collections-and-wallet.md          # Member 4 (Imran): Drop zones, Trust Gate, Green Credit wallet
├── architecture/                             # System design, architectural reviews & visual flows
│   ├── README.md                             # Architecture index & guide
│   ├── architecture-review.md                # System design analysis & candidate refactoring options
│   ├── architecture-explained.md             # Beginner-friendly concept explanations
│   ├── architecture-visual-flows.md          # Step-by-step transaction & data flow diagrams
│   └── architecture-review.html              # Interactive visual dashboard
├── planning/                                 # Roadmap, sprint tracking & team ownership
│   ├── sprint-plan.md                        # 4-sprint delivery roadmap & ticket matrix (T0–TD8)
│   ├── progress.md                           # Live ticket checklist & completion tracker
│   └── team-git-users.md                     # Team member mapping (m1–m4), GitHub accounts & assignees
├── guides/                                   # Technical migration plans, QA & interactive guides
│   ├── manual-testing.md                     # Manual QA procedures & test cases
│   ├── nativewind-migration-plan.md          # Mobile NativeWind styling migration guide
│   ├── rate-card-estimator.md                # Rate card estimator implementation summary
│   └── chokro-masterclass.html               # Interactive visual masterclass
├── agents/                                   # Coding agent guidelines & governance
│   ├── domain.md                             # Domain modeling rules & ubiquitous language
│   ├── issue-tracker.md                      # GitHub issues triage & gh integration workflow
│   └── triage-labels.md                      # 5-role triage label taxonomy
├── superpowers/                              # Agent plans & specs
│   ├── plans/
│   │   └── 2026-08-06-sprint-1-demo-plan.md
│   └── specs/
│       ├── 2026-08-06-sprint-1-demo-design.md
│       └── 2026-08-12-documentation-reorganization-design.md
└── archive/                                  # Legacy brainstorms and scratch migration scripts
    ├── chokro-IDEAS.txt                      # v1.0 initial brainstorm
    └── scratch/                              # Temporary migration scripts
        ├── convert.py
        └── fix.py
```

---

## 3. Migration Operations

### 3.1 File Relocations
| Source Path | Target Path | Rationale |
| :--- | :--- | :--- |
| `docs/PRD.md` | `docs/product/PRD.md` | Core product definition |
| `docs/SRS_Functional_Requirements.md` | `docs/product/SRS_Functional_Requirements.md` | Academic/coursework SRS |
| `docs/competitive-analysis.md` | `docs/product/competitive-analysis.md` | Market analysis |
| `docs/validation-report.md` | `docs/product/validation-report.md` | Validation data |
| `docs/prd-review.md` | `docs/product/prd-review.md` | PRD review history |
| `docs/sprint-plan.md` | `docs/planning/sprint-plan.md` | Sprint roadmap & tickets |
| `docs/progress.md` | `docs/planning/progress.md` | Ticket status tracking |
| `git-users.md` | `docs/planning/team-git-users.md` | Team member / git mapping (cleans root) |
| `docs/manual-testing.md` | `docs/guides/manual-testing.md` | QA testing procedures |
| `docs/nativewind-migration-plan.md` | `docs/guides/nativewind-migration-plan.md` | Technical guide |
| `docs/rate-card-estimator.md` | `docs/guides/rate-card-estimator.md` | Feature implementation guide |
| `docs/chokro-masterclass.html` | `docs/guides/chokro-masterclass.html` | Interactive learning guide |
| `chokro-IDEAS.txt` | `docs/archive/chokro-IDEAS.txt` | Legacy ideas doc (cleans root) |
| `convert.py` | `docs/archive/scratch/convert.py` | One-off migration script (cleans root) |
| `fix.py` | `docs/archive/scratch/fix.py` | One-off migration script (cleans root) |

### 3.2 Master Documentation Hub (`docs/README.md`)
Create a high-signal, searchable, linked table of contents containing:
1. **Quick Navigation**: Direct links to all domains (Product, Specs, Architecture, Planning, Guides, Agents).
2. **Team Member Responsibilities**: Matrix mapping Member ID (m1–m4), Name, GitHub handle, Spec document, and Sprint ticket range.
3. **Reading Paths**: Tailored reading lists for:
   - *Developers*: Architecture + Specs + Planning
   - *Product / Evaluators*: PRD + Competitive Analysis + Validation Report + SRS
   - *QA / Testers*: Manual Testing Guide + Progress Tracker
4. **Project Directory Overview**: Visual diagram of doc tree layout.

---

## 4. Link & Reference Updates

All internal references across the repository must be updated:
- Update references in `docs/product/PRD.md` (e.g. `docs/specs/00-product-capability.md`, `docs/planning/sprint-plan.md`, etc.).
- Update references in `docs/specs/*.md`.
- Update references in `docs/planning/*.md`.
- Update references in `docs/architecture/*.md`.
- Update references in `docs/guides/*.md`.
- Update references in `AGENTS.md` and `CLAUDE.md`.

---

## 5. Verification Criteria

- [ ] All 15 moved files exist at their target paths with full content preserved.
- [ ] No unwanted temporary files remain at the repository root.
- [ ] `docs/README.md` is created, complete, and contains working relative links.
- [ ] Internal relative markdown links across all moved documents are valid.
- [ ] Git commit created with clean message.
