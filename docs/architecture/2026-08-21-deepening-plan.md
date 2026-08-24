# Architecture Deepening Plan — Sprint 3 Hot-Spot Refactor

> **Status:** Ready for implementation · **Source review:** [`2026-08-21-deepening-review.html`](./2026-08-21-deepening-review.html) · **Branch:** `Sprint3`
> **Audience:** implementation workers and the lead orchestrator. Workers consume their candidate section + the shared protocol; the orchestrator owns waves, gates, and commits.

---

## 0. Mission

Implement all 11 deepening candidates from the architecture review. Every candidate turns a shallow module into a deep one: small interface, large implementation, one seam, tests through the interface. The aim is **locality** (bugs concentrate in one module), **leverage** (one interface, N call sites), and **testability** (the interface is the test surface).

### Non-negotiable invariants (from AGENT_GUIDE.md / CONTEXT.md)

1. `credit_txns` is an **append-only ledger** — never mutate amounts or user balances directly. Status flips (`PENDING→VERIFIED`, `→REJECTED`) are the only permitted updates, and after this refactor they flow through exactly one module (C1).
2. Verified Balance = `SUM(amount) WHERE status='VERIFIED'`; Pending Balance = `SUM(amount) WHERE status='PENDING'`. The row-classifier implementing this must exist exactly once (C3).
3. Drop Zone QR tokens: HMAC-SHA256, `timingSafeEqual`. Untouched.
4. Piece categories require `pieceCount`, weight categories require `declaredWeight` (shared superRefine). Untouched except where C7 reuses the schema client-side.
5. Existing PGlite test suites must stay green. Behaviour-changing tests are allowed only where the review documents a bug (C1 ref mismatch, C1 trust-bypass, C2 evidence loss, C4 dead-letter, C8 release auth) — fix the test to assert the *correct* behaviour and note it in the commit body.

### Glossary discipline (codebase-design)

Use exactly: **module, interface, implementation, depth, seam, adapter, leverage, locality**. Never: component, service (for module), API/signature (for interface), boundary (for seam).

### Tooling protocol (every worker, every candidate)

1. **Discovery first via codebase-memory MCP** — `search_graph` / `trace_path` / `get_code_snippet` / `query_graph` to enumerate every caller and test touching the files you own. Grep only for string literals and config. If the graph is stale, run `index_repository` (mode `moderate`, persistence `true`) before starting.
2. Read `AGENTS.md`, `AGENT_GUIDE.md`, `CONTEXT.md`, and your candidate section before editing.
3. Tests alongside the change; run `pnpm --filter @chokro/api test -- <your suites>` and `pnpm typecheck` before reporting done.
4. Workers **never commit**. Report a diff summary + gate results to the orchestrator.
5. Surgical diffs: every changed line traces to the candidate. No drive-by refactors.

---

## 1. The candidates

### C1 · CreditVerification module — one owner for the pending→verified flip `Strong`

**Owns the problem:** the most safety-critical transition in the system has no owning module.

**Evidence**
- Flip sites: `lib/domain/TrustGateDomain.ts:498-511` (auto-clear), `HandoverDomain.ts:272-293` (admin VERIFY, fallback ref built at :285-288), `HandoverDomain.ts:374-392` (REJECT via raw SQL), `SettlementDomain.ts:260-263, 407-410` (REDEEM verify via `REDEMPTION-{id}`; 7 more ref constructions at :285, :342, :379, :408, :426, :449, :471).
- Ref-format bug: `DepositDomain.ts:163-170` mints `custodyRef = deposit.id` (raw UUID) but `HandoverDomain.ts:288` searches `CUSTODY-DEP-{subject_id}` — nothing in production writes that prefix; it only works because tests hand-seed rows with it (`tests/spec12-custody-handover.test.ts:455, 505`, `spec12-trust-gate-core.test.ts:301, 391`, `spec13-wallet-redemption.test.ts:63`). Escalated deposits silently match nothing.
- Trust bypass: `app/api/v1/trust-gate/evaluate/route.ts` + `packages/shared/src/dto/trustGate.ts:97-136` accept ~25 optional fields including caller-supplied `signals` and `activeFraudFlagCount`, which `TrustGateDomain.evaluate` (:139-341, merge precedence :465-468) trusts verbatim. Any authenticated Individual can verify their own credits.
- Duplicated: dispute-pause check (`TrustGateDomain.ts:473-480` ≈ `HandoverDomain.ts:273-276`); verified→impact+streak tail (`TrustGateDomain.ts:508-541` ≈ `HandoverDomain.ts:296-344`, the latter re-deriving piece/kg quantities at :326-329).

**Solution**
- New module `lib/domain/CreditVerificationDomain.ts` owning the whole transition: `mintPending(custodyEvent)`, `verify(trustDecisionId)`, `reject(trustDecisionId, reason)`, `compensate(...)`. Keep `TrustGateDomain.evaluate` (the pure decision core, truth-tabled in `spec12-trust-gate-core.test.ts:58-232`) — it becomes an internal seam of the new module.
- Typed custody-ref codec inside the module (one format, parsed — never string-concatenated at call sites). Migrate the stored rows' format via a backfill-compatible matcher that accepts legacy raw-UUID refs for deposits.
- Dispute-pause check, impact recording, streak/badge tail: implemented once, fired by the module.
- Server-side flows (deposit, pickup handover, redemption) assemble gate signals **only from server-side facts**. The HTTP route shrinks to accepting a subject reference (`subjectType` + `subjectId`); caller-supplied signal verdicts and fraud counts are rejected/ignored. Keep the route admin-only if it must remain for manual evaluation.
- Migrate call sites: `DepositDomain`, `HandoverDomain`, `SettlementDomain`, `walletService` consumers.

**Done when:** exactly one module flips ledger status; `CUSTODY-DEP-` fallback deleted; evaluate route no longer accepts signal verdicts; `spec12-*`/`spec13-wallet-redemption`/`spec11-*` green with hand-seeded creditTxn rows replaced by `mintPending` calls; new unit tests for the ref codec and the dispute-pause rule.

### C2 · Close the repo seam — no raw Drizzle writes from domains `Strong`

**Evidence:** `HandoverDomain.ts:3` imports `db, creditTxns, trustDecisions` (plus unused `depositRecords, pickupOrders`); raw writes at :356-363, :374-392, :418-425 bypass `withDb` error mapping (`repos/seam.ts:10-42`). `DisputeDomain.addEvidence` (:101-122) computes merged evidence then calls the no-op `disputeRepo.updateStatus(dispute.id, dispute.status)` and returns an in-memory merge that is **never persisted** — `repos/disputes.ts` has no evidence update. `repos/wallet.ts:148-192` (`createRedeemTransaction`, `createCompensatingTransaction`) are the only repo methods skipping `withDb`.

**Solution:** add the missing verbs (`trustGateRepo.updateDecisionNotes`, `walletRepo.rejectCreditTransaction`, `disputeRepo.addEvidence`) — or fold them into C1's module if it lands first, so the repo grows one rich operation instead of four shallow ones. Wrap wallet.ts methods in `withDb`. Forbid direct `@chokro/db` table imports in `lib/domain/*` (eslint `no-restricted-imports`).

**Done when:** zero `db.` / table imports in domain modules; evidence addition persists (new test); REJECT path maps driver errors through the seam (409/400, not 503).

### C3 · LedgerMath — the balance invariant lives once `Strong`

**Evidence:** `WalletDomain.ts:12-38` `calculateBalance` vs `repos/settlement.ts:350-379` `getPlatformLiabilityMetrics` (inline re-implementation, full-table scan at :352, no clamp). Twins `:297-321` / `:324-347` differ by one WHERE clause. Layering inversion: `repos/settlement.ts:20` imports `WalletDomain`, used at :417.

**Solution:** pure `LedgerMath` (or keep in WalletDomain as the single home) with one row-classifier and two entry points `sumUser(txns)` / `sumPlatform(txns)`; platform aggregation pushed into SQL (`GROUP BY kind, status`); merge the twin monthly sums into one parameterized function; settlement repo calls the module (no import inversion).

**Done when:** one classifier; `domain.test.ts:130` truth-table extended as the single test surface; liability read no longer loads the whole ledger.

### C4 · Notification seam resolves the recipient `Strong`

**Evidence:** `lib/notify.ts:141-166` dispatches only when `telegramChatId`/`recipientPhone`/`recipientEmail` are present; all 14 domain call sites (EscrowDomain ×7, DisputeDomain ×4, HandoverDomain ×3) pass only `recipientUserId` → console fallback (:163-166). Parallel second stack: `lib/notifications/notificationService.ts` + `mailer.ts` + `scripts/notifications.ts` (own SMTP config).

**Solution:** `notify()` resolves `recipientUserId` through an injected `ContactResolver` adapter (users repo in prod, fake in tests); route the digest mailer through the same transport selection. Test: a `recipientUserId`-only call with contacts present produces a non-console dispatch.

**Done when:** escrow/dispute/handover notifications actually dispatch; one transport config surface; domains unchanged at call sites except where a subject line needed fixing.

### C5 · One DomainRuleError `Strong`

**Evidence:** four identical-shaped classes — `NegotiationDomain.ts:15-24`, `DisputeDomain.ts:8`, `AuctionDomain.ts:19`, `EscrowDomain.ts:17` — and 22 route files with manual `try/catch instanceof → apiError` (e.g. `app/api/v1/negotiations/[id]/accept/route.ts:12-20`; `admin/disputes/[id]/resolve` catches two). `routeError` (`lib/database.ts:39-53`) already maps typed errors inside `safeRoute`.

**Solution:** single `DomainRuleError(message, status, details)` next to `routeError`; teach `routeError` to map it; delete the four classes and all 22 catch blocks. Keep class names as type aliases during migration if it reduces diff size, then delete.

**Done when:** `grep -r "RuleError" apps/api/app` returns nothing; routes back to parse→auth→domain→respond shape; new domain error mapping test at the seam.

### C6 · Generate the DDL — delete the hand-synced copies `Strong`

**Evidence:** `packages/db/src/schema.ts` (674 lines, 47 tables) is shadowed by `packages/db/src/seed.ts:60-607` `TABLE_DDLS` (~547 lines SQL) and `apps/api/tests/test-utils.ts:8-556` (second copy, ~548 lines) + hand-ordered 47-table TRUNCATE (:569-574). `seed()` spans :749-2972 (~2,220 lines).

**Solution:** emit PGlite DDL from the Drizzle schema (drizzle-kit export or migration replay in PGlite); delete both TABLE_DDLS arrays; derive TRUNCATE order from dependency-sorted schema metadata. Split `seed()` into per-scenario modules under `packages/db/src/seed/` with a tiny registry; keep the 7-scenario demo matrix output byte-compatible (same rows, same relative timestamps).

**Done when:** adding a column touches only `schema.ts`; seed + tests build from the generated path; demo matrix scenario outputs unchanged (snapshot test).

### C7 · Response DTOs in @chokro/shared `Strong`

**Evidence:** `packages/shared/src/dto/*` (23 files) are request-only. Mobile hand-mirrors: `useFeed.ts:11-30`, `useWallet.ts:7-23`, `useCreateListing.ts:7-15` (re-declares a payload the Zod schema already validates server-side). Admin: `useAdminRateCards.ts:11-18, 38-39`, `useAdminCampuses.ts:32-33`; `services/adminApi.ts:90` casts `as T`.

**Solution:** response Zod schemas in `packages/shared/src/dto/response/` (ListingDto, FeedPage, BalanceSummary, CreditTransactionDto, admin envelopes + row types); routes parse responses through them at least in tests; mobile/admin hooks import inferred types; `adminApiRequest` parses with the schema instead of casting. Reuse `CreateListingSchema` client-side in `useCreateListing`. Note: `trustGate.ts` dto file is owned by C1 in wave 2 — do response schemas for it in wave 3 or coordinate.

**Done when:** `grep -r "interface.*Response" apps/mobile/src/hooks apps/admin/hooks` (hand-declared envelopes) returns nothing; typecheck fails loudly if the API response shape drifts.

### C8 · Escrow — explicit sweep, real authorization `Worth exploring` (auth fix = Strong)

**Evidence:** `EscrowDomain.ts:117-128` — getters run `evaluateAndReleaseExpiredHolds()` (:46-70) which mutates status and sends notifications. `:153-156` — empty if-block where the actor check should live ("In route handlers, admin permissions are checked" — the route doesn't: `app/api/v1/escrow/[id]/release/route.ts:7-8` is `requireAuth` only → any authenticated user can release anyone's hold by ID). Transition table `:9-15` bypassed by early returns (:143-145).

**Solution:** `sweepExpiredHolds()` as an explicit entry point (called from lot-close reads and a cron/scheduled hook), returning a result; `releaseToSeller`/`returnToBuyer` take the actor (id + role) and enforce buyer/seller/admin inside the module; delete the empty block; all mutations through `assertTransition`.

**Done when:** release by an unrelated user → 403 (new test); no state mutation on pure reads; one transition table governs every path.

### C9 · Redemption saga — real transaction or no fake seam `Worth exploring`

**Evidence:** `repos/settlement.ts` — 13 methods take `dbOrTx: any = db`, no caller ever passes a transaction. Saga `SettlementDomain.ts:205-314` runs six autocommit steps; crash window between `executePayout` and `updateRedemptionStatus('PAID')` + `verifyCreditTransaction`. Compensating entries copy-pasted ×5 (:281-287, :338-344, :375-381, :422-428, :467-473) with hand-built `REVERSAL-*` refs. Retry path (:439-452) re-deducts via a new VERIFIED row with `Date.now()` ref. The good template: `atomicCreateRedemption` (:382-461) — real `db.transaction`, in-tx re-checks, concurrency-tested (`spec13-wallet-redemption.test.ts:373-413`).

**Solution:** delete the decorative `dbOrTx` params; wrap payout settlement (status flip + ledger verify + payout record) in one transaction with the MFS call outside it; single `reverseRedemption(redemption, reason, refKind)` owning the REVERSAL ref vocabulary; wrap the two wallet.ts methods in `withDb` (or C2 does it).

**Done when:** no `dbOrTx` in any signature; crash-window test (payout throws → no PAID status, compensating entry via the one helper); compensating-entry rules asserted in one place.

### C10 · Admin console — one page module `Worth exploring`

**Evidence:** 13 pages each re-declare `type Notice`, try/catch mutate ceremony, loading/error/empty triad, `admin-table` markup (e.g. `campuses/page.tsx:62-141, 269-285`; `kyc-queue/page.tsx` 515 lines; ~40-50% choreography each). 12 hooks are one template (`hooks/useAdmin*.ts`, 37-139 lines) differing in URL/unwrap/type.

**Solution:** `useAdminResource(key, url, unwrap)` factory (query + mutations + invalidation) and an `AdminResourcePage`/composition module owning notice lifecycle + triad + table scaffold; pages keep columns, form fields, row actions. Keep the existing UI kit (`components/ui/*`) and `services/adminApi.ts` as-is.

**Done when:** one Notice implementation; a new resource page ≈100 lines; all 13 pages render identically (smoke test via `admin-ui.test.ts` extended).

### C11 · Quick wins — delete facades, thin transport parsing `Strong`

**Evidence:** `lib/services/walletService.ts` (26 lines, 3 one-line delegations; `v1/wallet/balance` uses it, `v1/wallet/transactions` imports WalletDomain directly) and `lib/services/listingService.ts:9-44` — both fail the deletion test. `v1/media/upload/route.ts:12-59` — 47 of 72 lines parse multipart/JSON data-URIs/binary inline. `v1/feed/route.ts:13-43` — ~30 lines query coercion. `v1/admin/rate-card/route.ts:20-26` — inline camel→snake mapping.

**Solution:** delete both facades, re-point imports (route→domain is the corridor convention). `MediaDomain.parseUploadRequest(req)` (or accept `Request`) and `FeedDomain.parseFeedQuery(searchParams)` returning typed filters; repo-level camelCase inputs to kill case-mapping in routes.

**Done when:** services deleted; media/feed routes ≤25 lines; upload parsing unit-tested without constructing full HTTP round-trips.

---

## 2. Orchestration — waves, ownership, gates

### File-ownership matrix (hard rule: one wave-one owner per file)

| Candidate | Owns (may edit) | Must not touch |
| :--- | :--- | :--- |
| C3 | `WalletDomain.ts`, `repos/settlement.ts`, `domain.test.ts` | SettlementDomain.ts |
| C5 | `lib/database.ts`, the 4 domain error-class files, the 22 route files with catch blocks | `lib/notify.ts`, `repos/*` |
| C6 | `packages/db/src/**`, `apps/api/tests/test-utils.ts` | api lib/ |
| C11 | `lib/services/walletService.ts`, `lib/services/listingService.ts`, `v1/media/upload/route.ts`, `v1/feed/route.ts`, `v1/admin/rate-card/route.ts`, `MediaDomain.ts`, `FeedDomain.ts` | wallet/transactions route |
| C1 | `CreditVerificationDomain.ts` (new), `TrustGateDomain.ts`, `HandoverDomain.ts`, `SettlementDomain.ts`, `DepositDomain.ts`, `repos/wallet.ts`, `repos/trustGate.ts`, `repos/settlement.ts` (flip verbs only), `v1/trust-gate/evaluate/route.ts`, `dto/trustGate.ts` | escrow/dispute domains |
| C4 | `lib/notify.ts`, `lib/notifications/**`, `scripts/notifications.ts`, `repos/users.ts` | domain call sites (except subject-line fixes) |
| C8 | `EscrowDomain.ts`, `v1/escrow/**` routes | — |
| C7 | `packages/shared/src/dto/response/**` (new), mobile hooks, admin hooks, `adminApi.ts` | `dto/trustGate.ts` (C1 owns it in wave 2) |
| C2 | `repos/disputes.ts`, `repos/trustGate.ts` (if C1 hasn't), eslint config | — |
| C9 | `repos/settlement.ts`, `SettlementDomain.ts` (after C1 lands) | — |
| C10 | `app/admin/pages + hooks + lib` | `adminApi.ts` transport (C7 owns) |

### Waves

```
Wave 0  (orchestrator)  bootstrap: pnpm install · pnpm typecheck · pnpm test (baseline green)
                        MCP: verify/index graph (moderate, persistence on)

Wave 1  (parallel × 4)  C3 LedgerMath · C5 DomainRuleError · C6 DDL generation · C11 quick wins
        gate: typecheck + full suite + targeted new tests per candidate → orchestrator commits each

Wave 2  (parallel × 4)  C1 CreditVerification (uses C3) · C8 Escrow (uses C5)
                        C4 notify resolver · C7 response DTOs (skip dto/trustGate.ts)
        gate: same → commits

Wave 3  (parallel × 3)  C2 repo seam closure (after C1) · C9 redemption saga (after C1+C3)
                        C10 admin console (after C7) + trust-gate response dto (C7 remainder)
        gate: same → commits

Wave 4  (orchestrator)  integration sweep: full pnpm test · pnpm typecheck · dead-code scan
                        (grep for deleted symbols) · AGENT_GUIDE.md refresh · final push
```

### Gate rules

- A candidate is **accepted** only if: `pnpm typecheck` clean, full `pnpm test` green, the candidate's "done when" checklist verified by the orchestrator (workers self-report, orchestrator spot-checks via `git diff`).
- Gate failure → orchestrator spawns a **fix worker** scoped to the failing checklist item with the failure log. The orchestrator never edits code itself — not even conflict markers or one-line fixes.
- Merge order within a wave = the order workers finish; orchestrator rebases later worker diffs over earlier commits (via a worker, if conflicts exceed trivial whitespace).

### Commit protocol (TEAM.md — absolute ownership, Author = Committer)

All commits attributed to the repo owner (m3, Core Architecture):

```bash
GIT_AUTHOR_NAME="Sharzil Nafis" GIT_AUTHOR_EMAIL="sharzilrs@gmail.com" \
GIT_COMMITTER_NAME="Sharzil Nafis" GIT_COMMITTER_EMAIL="sharzilrs@gmail.com" \
git commit -m "refactor(<scope>): <lowercase summary> (deepening C<N>)"
```

Scopes: `wallet` (C1/C3/C9), `api` (C5/C11), `db` (C6), `notify` (C4), `escrow` (C8), `shared` (C7), `admin` (C10), `repos` (C2). Push to `origin Sprint3` at each wave gate.

---

## 3. Risk register

| Risk | Mitigation |
| :--- | :--- |
| C1 is the largest change and everything in the corridor depends on it | C1 lands alone in wave 2 with its own gate; C9/C2 explicitly sequenced after |
| Test suites hand-seed ledger rows in legacy formats | C1 ships a backfill-compatible ref matcher; tests migrate to `mintPending` |
| C6 changes seed/test bootstrap used by every suite | C6 must keep `resetTestStore()` signature and behaviour; run full suite, not just targeted |
| C7 type-drift breaks mobile build | C7 runs `pnpm --filter @chokro/mobile typecheck` (or tsc) in its gate, not just api |
| Two workers need the same file | Ownership matrix is law; violator re-scopes, not the orchestrator |
| MCP graph stale after wave merges | Orchestrator re-runs `index_repository` at each wave gate |
