# Documentation Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the Chokro project documentation into a clean, categorized structure with a master `docs/README.md` hub, clean repository root, and validated cross-document markdown links.

**Architecture:** Relocate 15 documentation and scratch files into semantic domain subdirectories (`docs/product/`, `docs/planning/`, `docs/guides/`, `docs/archive/`), author an exhaustive master `docs/README.md` index, and update all internal relative links across the repository.

**Tech Stack:** Markdown, Git, Node/Shell.

## Global Constraints

- Preserve all original content and markdown formatting in relocated files.
- Ensure all relative links across `docs/` and root `.md` files resolve accurately.
- Keep repository root clean of loose scratch files, one-off scripts, and unindexed text documents.

---

### Task 1: Create Directories and Relocate Files via Git MV

**Files:**
- Relocate:
  - `docs/PRD.md` → `docs/product/PRD.md`
  - `docs/SRS_Functional_Requirements.md` → `docs/product/SRS_Functional_Requirements.md`
  - `docs/competitive-analysis.md` → `docs/product/competitive-analysis.md`
  - `docs/validation-report.md` → `docs/product/validation-report.md`
  - `docs/prd-review.md` → `docs/product/prd-review.md`
  - `docs/sprint-plan.md` → `docs/planning/sprint-plan.md`
  - `docs/progress.md` → `docs/planning/progress.md`
  - `git-users.md` → `docs/planning/team-git-users.md`
  - `docs/manual-testing.md` → `docs/guides/manual-testing.md`
  - `docs/nativewind-migration-plan.md` → `docs/guides/nativewind-migration-plan.md`
  - `docs/rate-card-estimator.md` → `docs/guides/rate-card-estimator.md`
  - `docs/chokro-masterclass.html` → `docs/guides/chokro-masterclass.html`
  - `chokro-IDEAS.txt` → `docs/archive/chokro-IDEAS.txt`
  - `convert.py` → `docs/archive/scratch/convert.py`
  - `fix.py` → `docs/archive/scratch/fix.py`

- [ ] **Step 1: Create target directory folders**

Run:
```bash
mkdir -p docs/product docs/planning docs/guides docs/archive/scratch
```

- [ ] **Step 2: Execute git mv commands for all files**

Run:
```bash
git mv docs/PRD.md docs/product/PRD.md
git mv docs/SRS_Functional_Requirements.md docs/product/SRS_Functional_Requirements.md
git mv docs/competitive-analysis.md docs/product/competitive-analysis.md
git mv docs/validation-report.md docs/product/validation-report.md
git mv docs/prd-review.md docs/product/prd-review.md
git mv docs/sprint-plan.md docs/planning/sprint-plan.md
git mv docs/progress.md docs/planning/progress.md
git mv git-users.md docs/planning/team-git-users.md
git mv docs/manual-testing.md docs/guides/manual-testing.md
git mv docs/nativewind-migration-plan.md docs/guides/nativewind-migration-plan.md
git mv docs/rate-card-estimator.md docs/guides/rate-card-estimator.md
git mv docs/chokro-masterclass.html docs/guides/chokro-masterclass.html
git mv chokro-IDEAS.txt docs/archive/chokro-IDEAS.txt
git mv convert.py docs/archive/scratch/convert.py
git mv fix.py docs/archive/scratch/fix.py
```

- [ ] **Step 3: Verify git status reflects cleanly renamed files**

Run:
```bash
git status --short
```
Expected: 15 `R` status lines indicating renames without deleted or untracked duplicates.

---

### Task 2: Create Master Documentation Hub (`docs/README.md`)

**Files:**
- Create: `docs/README.md`

- [ ] **Step 1: Write `docs/README.md` with complete documentation table, role guides, team matrix, and reading paths**

Write the complete markdown file at `docs/README.md`:
```markdown
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
1. [`docs/architecture/architecture-explained.md`](./architecture/architecture-explained.md) — Understand core system design.
2. [`docs/specs/00-product-capability.md`](./specs/00-product-capability.md) — Invariants, database schemas, and shared contracts.
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
```

- [ ] **Step 2: Verify `docs/README.md` exists and preview contents**

---

### Task 3: Update Cross-Document Markdown Links

**Files:**
- Modify: `docs/product/PRD.md`
- Modify: `docs/product/SRS_Functional_Requirements.md`
- Modify: `docs/product/prd-review.md`
- Modify: `docs/specs/00-product-capability.md`
- Modify: `docs/specs/01-identity-and-trust.md`
- Modify: `docs/specs/02-marketplace.md`
- Modify: `docs/specs/03-intelligence-and-engagement.md`
- Modify: `docs/specs/04-collections-and-wallet.md`
- Modify: `docs/planning/sprint-plan.md`
- Modify: `docs/planning/progress.md`
- Modify: `docs/planning/team-git-users.md`
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update links in `docs/product/PRD.md`**
Update references from `chokro-IDEAS.txt` to `docs/archive/chokro-IDEAS.txt`, `docs/prd-review.md` to `docs/product/prd-review.md`, `docs/competitive-analysis.md` to `docs/product/competitive-analysis.md`, `docs/validation-report.md` to `docs/product/validation-report.md`, `docs/sprint-plan.md` to `docs/planning/sprint-plan.md`.

- [ ] **Step 2: Update links in `docs/planning/sprint-plan.md` and `docs/planning/progress.md`**
Update references to point to `docs/product/PRD.md`, `docs/product/SRS_Functional_Requirements.md`, `docs/specs/*`.

- [ ] **Step 3: Update links in `docs/planning/team-git-users.md`**
Update relative paths to `../specs/01-identity-and-trust.md`, etc.

- [ ] **Step 4: Update links in `docs/specs/*.md`**
Update any references to `docs/PRD.md` → `docs/product/PRD.md`, `docs/sprint-plan.md` → `docs/planning/sprint-plan.md`.

- [ ] **Step 5: Update links in `AGENTS.md` and `CLAUDE.md`**
Ensure paths like `docs/agents/` and other documented conventions match the new structure.

---

### Task 4: Link Validation & Git Commit

**Files:**
- Verification across entire `docs/` tree

- [ ] **Step 1: Run link checker script to ensure zero broken relative markdown links**

Run a node check script to verify all markdown links in `docs/`:
```bash
node -e "
const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(full));
    } else if (file.endsWith('.md')) {
      results.push(full);
    }
  });
  return results;
}

const files = getFiles('docs');
let errors = 0;
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const dir = path.dirname(f);
  const regex = /\[.*?\]\(((\.{1,2}\/|docs\/)[^)#\s]+)(?:#[^)]*)?\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    let link = match[1];
    let resolved;
    if (link.startsWith('docs/')) {
      resolved = path.resolve(process.cwd(), link);
    } else {
      resolved = path.resolve(dir, link);
    }
    if (!fs.existsSync(resolved)) {
      console.error('BROKEN LINK in ' + f + ' -> ' + link + ' (resolved: ' + resolved + ')');
      errors++;
    }
  }
});
if (errors === 0) console.log('All internal markdown links are VALID!');
else process.exit(1);
"
```
Expected: `All internal markdown links are VALID!`

- [ ] **Step 2: Git commit**

Run:
```bash
git add docs/ AGENTS.md CLAUDE.md
git commit -m "docs: reorganize documentation into categorized functional folders and add master README"
```
