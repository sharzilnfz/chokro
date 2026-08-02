# SPEC 01 — Identity, Trust & Partners

**Owner: Member A** · PRD features 1–6 · Depends on: SPEC 00 manifest
**Template:** to-spec (Problem / Solution / User Stories / Implementation / Testing / Scope)

---

## Problem Statement

Anyone can claim to be anyone on a classifieds board — Bangladesh's dominant substitute (Bikroy/Facebook groups) has zero trust layer, and fraud research shows impersonation (fake pickup agents, stolen-goods fencing) is an existential risk for platforms like this. Users need to know that the partner collecting their e-waste is real and licensed; partners need a credible verification path; admins need queues, not chaos; and everyone needs to hear about offers, pickups, and credits without refreshing the app.

## Solution

A role-based identity system with three roles (individual, partner, admin), organization-level partner registration with admin verification (including DoE license capture for e-waste partners), location/pickup-area setup, an in-app + push notification system, and a report/dispute workflow with a moderation queue. Trust is *earned and visible*: verified badges, capability flags, and dispute history — not assumed.

## User Stories

**Identity & profiles**
1. As a new user, I want to sign up with email and password, so that I can start using Chokro without SMS costs.
2. As a user, I want to manage my profile (name, photo, institution affiliation), so that partners and buyers recognize me.
3. As a user, I want to link my account to my campus/organization, so that my actions count toward my institution's leaderboard.
4. As a user, I want to delete my account and have my personal data purged, so that I control my data (NFR: PII purged ≤30 days).
5. As an admin, I want to see all users and their roles, so that I can manage the platform.
6. As an admin, I want to suspend a user for fraud, so that abuse is contained (suspension blocks listing, redeeming, depositing).

**Roles & access**
7. As the system, I want role-based access control (individual / partner / admin), so that each actor sees only what they should.
8. As a user who is also a buyer, I want one account for giving and buying, so that I don't maintain two identities.

**Partner registration & verification**
9. As a partner organization, I want to apply with my org details, type(s) (collector / recycler / repair shop / vendor / NGO), and service areas, so that I can join the network.
10. As an e-waste partner, I want to upload my DoE license, so that I can be flagged `e_waste_licensed` (legal requirement, invariant §2.5 of SPEC 00).
11. As an admin, I want a verification queue of partner applications, so that I can approve/reject with a reason.
12. As an admin, I want to set partner capability flags (collects / repairs / buys / accepts_donations / e_waste_licensed), so that the system routes tasks correctly.
13. As a user, I want to see a partner's verified badge and capabilities, so that I trust who I'm dealing with.
14. As an admin, I want to suspend/reinstate a partner, so that bad actors are removable without deleting audit history.

**Location**
15. As a user, I want to set my pickup location/area, so that listings and partners match my geography.
16. As a partner, I want to define my service areas, so that I only receive relevant tasks.

**Notifications**
17. As a user, I want in-app notifications for offers, pickup updates, credit events, and campaign news, so that I never miss a state change.
18. As a user, I want push notifications for high-priority events (offer received, pickup en route, credits verified), so that I respond quickly.
19. As a user, I want to mark notifications read and see a history, so that I can catch up.
20. As the system, I want every notification to reference its subject (listing/pickup/credit), so that tapping navigates to context.

**Reports & disputes**
21. As a user, I want to report a listing or a counterparty with a reason, so that abuse is surfaced.
22. As a user, I want to open a dispute on a transaction (e.g., item not as described, no-show), so that there is recourse when trust breaks.
23. As an admin, I want a dispute queue with states (opened → under_review → resolved/escalated), so that every dispute has an owner and an end.
24. As an admin, I want to moderate reported listings (hide/restore/remove), so that the marketplace stays clean.
25. As a disputant, I want to see the dispute's status and final resolution, so that the process feels fair.

## Implementation Decisions

- **Auth (OD-1):** email + password, server-side session/JWT. Phone OTP explicitly deferred (SMS cost). Password reset via email link.
- **RBAC:** single `role` field on `User`; route-level guards on both app and API. Admin accounts are created by seeding, never by self-registration.
- **Partner model:** `Partner` is an organization entity linked to one or more user logins; `types[]` + `capability_flags{}` drive routing (SPEC 00 §7). `status` follows the Partner state machine.
- **DoE license:** document upload stored in object storage; admin must eyeball it before setting `e_waste_licensed=true`. Record who verified and when.
- **Service areas:** admin-defined area list (e.g., Dhaka zones) — no free-form geofencing at MVP.
- **Notifications:** in-app notification table + Expo push tokens on user record; `kind` enum (offer, pickup, credit, campaign, dispute, system); payload carries subject IDs for deep-linking.
- **Disputes:** `Dispute` entity per SPEC 00 state machine; admin resolution writes an immutable resolution note; disputes on pickups auto-pause related credit verification (cross-ref SPEC 04).
- **Moderation:** hidden listings are excluded from feeds but preserved for audit; removal requires a reason code.

## Testing Decisions

- **Good test = external behavior at the API seam** (requests in, state + responses out), not implementation details. UI logic covered by a small number of component tests; state machines covered by transition tests.
- Test: signup/login/reset flows; RBAC denies (individual hitting admin routes → 403; partner hitting admin queue → 403); partner application → admin approve → capability flags usable; e-waste flag cannot be set without a license document; suspension blocks earn/redeem/list actions; dispute lifecycle end-to-end; notification created on each event type with correct subject link.
- Prior art: none (greenfield) — the API test harness is established in Sprint 1 ticket T0 (owned by Member C); all members reuse it.

## Out of Scope

- Phone/OTP authentication, social login, KYC/NID verification, individual collector accounts (A5), partner payout/billing, multi-admin permission tiers, in-app chat.

## Further Notes

- Fraud evidence (Cashify imposter agents) motivates: partner identity shown in-app with verified badge; pickup confirmation requires the two-sided handshake spec'd in SPEC 04.
- Campus users may include minors: no public display of user location or phone; institution linkage by invite code, not open join.
