# Inter-Campus Circularity & Campus Leaderboard Feature Specification

## 1. Overview & Vision

**Inter-Campus Circularity** is Chokro's institutional gamification engine. It transforms individual campus recycling and item re-circulation into a competitive, collective metric where universities compete for sustainability rankings and circular impact.

### Core Objectives
1. **Gamified Environmental Action**: Encourage daily sustainable habits among students and staff through verified Green Credit rewards and streak multipliers.
2. **Institutional Recognition**: Aggregate individual verified contributions by university/campus (`institution_id`) to highlight top circular campuses in Bangladesh.
3. **Trust & Verification**: Prevent fraud by ensuring leaderboard points are strictly derived from **VERIFIED** transactions recorded by certified partners or authorized drop zone drop-offs.
4. **Privacy-First Design**: Empower individual users with a dedicated privacy toggle to opt out of public leaderboard aggregation without forfeiting personal credits.

---

## 2. End-to-End System Architecture

```mermaid
flowchart TD
    subgraph UserAction ["1. User Activity & Verification"]
        U["Student / User (Campus Affiliated)"] -->|Lists Waste or Scans Drop Zone| D["Drop Zone / Collection Point"]
        D -->|Partner Weighs & Verifies| P["Verified Partner / Operator"]
        P -->|Submits Deposit Record| API_V["POST /api/wallet/transactions or adjust"]
    end

    subgraph Ledger ["2. Credit & Engagement Engine"]
        API_V -->|Creates VERIFIED Transaction| CT[("credit_txns (status = 'VERIFIED')")]
        CT -->|Triggers Verification Hook| WD["WalletDomain.onCreditsVerified(userId)"]
        WD -->|Updates Streak & Multiplier| SD["StreakDomain.recordActivity()"]
        WD -->|Evaluates Milestone Badges| BD["BadgeDomain.maybeAwardBadges()"]
        SD --> US[("user_streaks")]
        BD --> BA[("badge_awards")]
    end

    subgraph Aggregation ["3. Snapshot Materialization"]
        US & CT -->|Daily Cron / Admin Refresh| LD["LeaderboardDomain.materializeAll()"]
        LD -->|Materialized Period Snapshots| CLB[("campus_leaderboards\n(WEEKLY, MONTHLY, ALL_TIME)")]
    end

    subgraph Interfaces ["4. Client Consumption"]
        CLB -->|GET /api/leaderboard?period=...| MOB_LB["Mobile App: LeaderboardScreen"]
        CLB -->|Admin Console| ADM_LB["Web Admin: /admin/leaderboard"]
        US -->|GET /api/streaks| MOB_W["Mobile App: WalletScreen & Badges"]
        BA -->|GET /api/badges| MOB_B["Mobile App: MyBadgesScreen"]
        BA -->|Public URL & OG Image| SHARE["Social Share / OpenGraph"]
    end
```

---

## 3. Mathematical Models & Reward Logic

### 3.1 Green Credits Lifecycle
Green credits represent verified circular currency earned through physical item deposits and e-waste diversion:

| Transaction Status | Description | Contributes to Leaderboard? |
|---|---|---|
| `PENDING` | Listing submitted or deposit waiting for partner inspection | ❌ No |
| `VERIFIED` | Partner/admin confirmed weight, category, and condition | ✅ **Yes** |
| `REJECTED` | Mismatched item, contaminated batch, or unverified claim | ❌ No |

### 3.2 Daily Engagement Streak & Multiplier
Consistent recycling actions trigger streak bonuses, boosting the user's score contribution to their campus.

```mermaid
stateDiagram-v2
    [*] --> Inactive: No verified activity
    Inactive --> ActiveDay1: First verified deposit (Multiplier = 1.00x)
    ActiveDay1 --> ActiveDay2: Deposit on Next Calendar Day (Gap = 1 day)
    ActiveDay2 --> ActiveDayN: Consecutive Daily Activity (+0.10x / day)
    ActiveDayN --> ActiveDayN: Multiple Deposits Same Day (Gap = 0, No Multiplier change)
    ActiveDayN --> Inactive: Activity missed (Gap > 1 day, Streak resets to 1)
```

- **Formula for Multiplier**:
  $$\text{Multiplier} = \min\left(2.00,\, 1.00 + (\text{current\_streak\_days} - 1) \times 0.10\right)$$
- **Range**: `1.00x` (Base) to `2.00x` (11+ Consecutive Days).
- **Streak Calculation**:
  - `gapDays = 1`: `current_streak_days = current_streak_days + 1` (Streak continues).
  - `gapDays = 0`: Same-day deposit; streak preserved, no increment.
  - `gapDays > 1`: Streak broken; resets `current_streak_days = 1`.

### 3.3 Campus Score Aggregation
The leaderboard rankings are materialized from verified transactions multiplied by the contributor's streak multiplier:

$$\text{User Contribution} = \sum_{\text{txn} \in \text{VERIFIED}} \left( \text{amount}_{\text{txn}} \times \text{multiplier}_{\text{user}} \right)$$

$$\text{Campus Total Points} = \sum_{\substack{u \in \text{Campus} \\ \text{opt\_out} = \text{false}}} \text{User Contribution}_u$$

$$\text{Active Members} = \operatorname{COUNT}(\{ u \in \text{Campus} \mid u \text{ has } \ge 1 \text{ verified transaction in period and opt\_out} = \text{false} \})$$

---

## 4. Milestone Badges Directory

Badges are awarded automatically upon reaching circularity milestones:

```mermaid
graph LR
    subgraph Badges ["Available Circular Badges"]
        B1["🌱 First Step (FIRST_VERIFIED_DEPOSIT)\n1st verified credit deposit"]
        B2["⚖️ Eco Warrior (WASTE_10KG)\nCumulative 10 kg / 10 pts verified"]
        B3["🛡️ Centurion of Clean (WASTE_100KG)\nCumulative 100 kg / 100 pts verified"]
        B4["⚡ E-Waste Champion (E_WASTE_STEWARD)\nLicensed e-waste partner champion"]
        B5["🔥 7-Day Streak (STREAK_7)\n7 consecutive active recycling days"]
        B6["⚡ Monthly Habit (STREAK_30)\n30 consecutive active recycling days"]
        B7["🏆 Campus Podium (CAMPUS_TOP_3)\nTop 3 contributor on campus leaderboard"]
    end
```

---

## 5. Database Schema & Data Models

### 5.1 `users`
- `id` (`uuid`, PK): Unique user identifier.
- `institution_id` (`varchar(255)`): Campus identifier (e.g., `"NSU"`, `"BUET"`, `"DU"`, `"BRACU"`). Only users with a non-null institution are eligible for campus rankings.
- `role` (`varchar(50)`): `'INDIVIDUAL'`, `'PARTNER'`, or `'ADMIN'`.

### 5.2 `credit_txns`
- `id` (`uuid`, PK): Transaction identifier.
- `user_id` (`uuid`, FK -> `users.id`): Recipient of credits.
- `amount` (`decimal(10, 2)`): Credit quantity.
- `kind` (`varchar(50)`): `'EARN'`, `'REDEEM'`, or `'ADJUST'`.
- `status` (`varchar(50)`): `'PENDING'`, `'VERIFIED'`, `'REJECTED'`.

### 5.3 `user_streaks`
- `id` (`uuid`, PK): Streak record.
- `user_id` (`uuid`, FK -> `users.id`, UNIQUE): 1:1 relationship with user.
- `current_streak_days` (`integer`): Current consecutive active days.
- `longest_streak_days` (`integer`): Peak streak record.
- `streak_multiplier` (`decimal(4, 2)`): Multiplier between `1.00` and `2.00`.
- `leaderboard_opt_out` (`boolean`): Privacy switch (default `false`).

### 5.4 `campus_leaderboards` (Materialized Snapshots)
- `id` (`uuid`, PK): Snapshot row.
- `period` (`varchar(20)`): `'WEEKLY'`, `'MONTHLY'`, `'ALL_TIME'`.
- `campus_id` (`varchar(255)`): University name / code.
- `total_points` (`decimal(12, 2)`): Total aggregated points.
- `member_count` (`integer`): Number of contributing students/members.
- `top_scorer_user_id` (`uuid`, FK -> `users.id`): Top contributor for that campus.
- `snapshot_date` (`date`): Materialization date (`YYYY-MM-DD`).

### 5.5 `badge_awards`
- `id` (`uuid`, PK): Award instance.
- `user_id` (`uuid`, FK -> `users.id`): Badge recipient.
- `badge_type` (`varchar(50)`): Enum from badge catalog.
- `award_points` (`decimal(10, 2)`): User's points at award time.
- `meta` (`jsonb`): Proof payload (e.g., `{ streakDays: 7, rank: 1 }`).
- `awarded_at` (`timestamp`): Timestamp of grant.

---

## 6. How a User Uses the Leaderboard (Step-by-Step Walkthrough)

```mermaid
sequenceDiagram
    autonumber
    actor User as Student / User
    participant App as Mobile App (Expo)
    participant API as Chokro Next.js API
    participant DB as Postgres Database

    User->>App: 1. Opens "Wallet" Tab
    App->>API: GET /api/wallet/balance & /api/streaks
    API-->>App: Balance: 140 pts, Streak: 4 Days (1.30x)
    App-->>User: Displays Green Credits balance + Multiplier card

    User->>App: 2. Taps "Inter-Campus Leaderboard" Banner
    App->>API: GET /api/leaderboard?period=WEEKLY (Bearer token)
    API->>DB: Fetch published snapshot + find user's campus row
    DB-->>API: Campuses array + my_row
    API-->>App: JSON { period: "WEEKLY", campuses: [...], my_row: {...} }

    App-->>User: 3. Displays ranked leaderboard with Gold/Silver/Bronze medals
    Note over App,User: User's campus (e.g. NSU) highlighted with "You" pill and card

    User->>App: 4. Switches tab to "Monthly" or "All Time"
    App->>API: GET /api/leaderboard?period=MONTHLY
    API-->>App: Updated rankings for selected period

    User->>App: 5. Toggles "Public Campus Leaderboard" switch
    App->>API: POST /api/streaks/opt-out { leaderboard_opt_out: true }
    API->>DB: UPDATE user_streaks SET leaderboard_opt_out = true
    API-->>App: 200 OK (Opt-out preference saved)

    User->>App: 6. Taps "My Badges"
    App->>API: GET /api/badges
    API-->>App: Returns earned badges (e.g., "7-Day Streak", "Eco Warrior")
    User->>App: 7. Taps "Share Badge" -> Native Share Sheet (Social / Messaging)
```

### Step 1: Navigating to the Leaderboard
1. The user logs into the **Chokro Mobile App**.
2. Selects the **Wallet** tab from the bottom navigation bar (`WalletScreen.tsx`).
3. In the wallet header, the user sees their **Verified Green Credits**, **Pending Balance**, and **Active Multiplier** (e.g., `1.30x (4 Days Active)`).
4. Taps the **"Inter-Campus Leaderboard"** quick-access tile.

### Step 2: Exploring Campus Standings
1. The user enters `LeaderboardScreen.tsx`.
2. **Top Banner**: If the user belongs to an affiliated campus (e.g. `"North South University"`), their campus standing card is pinned to the top with total verified points and active students.
3. **Period Selection**: The user toggles between **Weekly**, **Monthly**, and **All Time** tabs to view live rankings across different timeframes.
4. **Campus List**:
   - `#1` Campus: Gold Trophy card with total points and member count.
   - `#2` Campus: Silver Medal card.
   - `#3` Campus: Bronze Medal card.
   - `#4+` Campuses: Ranked list items.
   - The user's own campus row is highlighted in soft green with a `"You"` badge.

### Step 3: Managing Leaderboard Privacy
1. At the top of `LeaderboardScreen.tsx`, the user has a **"Public Campus Leaderboard"** switch.
2. If toggled **OFF** (`leaderboard_opt_out = true`), the user's verified points will no longer be aggregated into their campus score on the next snapshot materialization, giving complete privacy control.

### Step 4: Viewing & Sharing Milestone Badges
1. From the Leaderboard, the user taps the **"My Badges"** button in the upper right.
2. Navigates to `MyBadgesScreen.tsx` which displays:
   - Daily engagement streak meter with multiplier progression (`+0.10x per active day up to 2.00x`).
   - Earned badges with unlock dates.
   - Milestone Directory showing locked vs unlocked achievements.
3. Tapping **"Share Badge"** triggers the native OS Share Sheet with a shareable URL and dynamic OpenGraph card (`/api/badges/[awardId]/og`).

---

## 7. Admin Console Operations

Admins can inspect rankings and trigger materialization from the web console at `/admin/leaderboard`:

1. **View Live Snapshots**: Inspect current rankings across Weekly, Monthly, and All-Time tables.
2. **On-Demand Materialization**: Click **"Materialize snapshot"** (`POST /api/admin/leaderboard/refresh`) to compute aggregate scores from the latest `credit_txns` and award podium badges (`CAMPUS_TOP_3`) to top performers.

---

## 8. Summary Table: API Endpoints

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/leaderboard` | `GET` | Optional | Returns campus rankings for `period` (`WEEKLY`, `MONTHLY`, `ALL_TIME`) + caller's campus row |
| `/api/streaks` | `GET` | Required | Returns caller's streak days, multiplier, and privacy opt-out status |
| `/api/streaks/opt-out` | `POST` | Required | Toggles user's `leaderboard_opt_out` privacy preference |
| `/api/badges` | `GET` | Required | Lists all badges earned by the caller with metadata definitions |
| `/api/badges/[awardId]` | `GET` | Public | Returns specific badge award details for public verification & sharing |
| `/api/admin/leaderboard/refresh` | `POST` | Admin | Rebuilds and stores materialized leaderboard snapshots across all periods |
