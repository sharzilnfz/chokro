# Chokro Architecture Guide: Beginner-Friendly Breakdown

This guide explains the architectural concepts, the exact problems found in the Chokro codebase, and why the proposed optimizations make the system significantly easier to maintain, test, and expand.

---

## 1. Core Vocabulary Made Simple

Before looking at code, here are the four key architecture concepts you need to know:

```
┌────────────────────────────────────────────────────────┐
│ DEEP MODULE vs. SHALLOW MODULE                        │
│                                                        │
│  [Deep Module] (Good)         [Shallow Module] (Bad)   │
│  ┌───────────────────┐        ┌──────────────────────┐ │
│  │ Simple Interface  │        │ Complex Interface    │ │
│  ├───────────────────┤        ├──────────────────────┤ │
│  │ Complex logic is  │        │ Thin logic inside    │ │
│  │ hidden inside     │        │ (Pass-through only)  │ │
│  └───────────────────┘        └──────────────────────┘ │
│  Example: A TV remote         Example: A door that     │
│  (One button turns on         just leads to another    │
│  a complex system)            identical door           │
└────────────────────────────────────────────────────────┘
```

1. **Module & Interface**:
   - **Interface**: The *surface* you interact with (like buttons on a microwave or function names).
   - **Implementation**: The hidden machinery inside (the wires and magnetron).
2. **Deep vs. Shallow Module**:
   - **Deep Module (Good)**: A tiny, simple interface that hides a lot of complex work behind the scenes.
   - **Shallow Module (Bad)**: A wide interface that does almost nothing except pass your call to something else.
3. **Seam & Adapter**:
   - **Seam**: A clean plug-and-socket connection where you can swap parts without modifying existing code.
   - **Adapter**: The specific plug you insert (e.g., a Real Database adapter vs. an In-Memory Mock adapter for testing).
4. **Locality & Leverage**:
   - **Locality ("Fix once, fixed everywhere")**: Related logic lives in *one place*. When you need to change a rule, you touch one file instead of five.
   - **Leverage ("High payoff for little effort")**: Callers do powerful things with minimal, clean code.

---

## 2. The 5 Problems in Our Past Architecture & Their Fixes

---

### Problem 1: Dual-Implementation Repositories (`databaseOrTestStore`)

#### 🔴 The Problem:
Inside our database repository files (like `apps/api/lib/repos/listings.ts`), every function literally contained **two complete versions of the same code**:
1. One written in SQL (for real PostgreSQL).
2. One written in JavaScript array methods (for running unit tests without a database).

```typescript
// What the code looked like in apps/api/lib/repos/listings.ts
async create(values) {
  return databaseOrTestStore(
    // 1. Real Database Path (SQL query)
    async () => (await db.insert(listings).values(values).returning())[0],
    
    // 2. Test Path (In-memory array manipulation)
    () => {
      const listing = { id: crypto.randomUUID(), ...values, created_at: new Date() };
      memoryStore.listings.push(listing);
      return listing;
    }
  );
}
```

#### 🚗 Real-World Analogy:
Imagine buying a car that has **two complete engines** under the hood: a gas engine for normal driving and an electric motor for test driving. Every time you turn the steering wheel, you have to manually adjust levers on *both* engines so they don't fight each other.

#### ⚠️ Why it hurts:
- **Double Work**: If you add a new filter (e.g., filter listings by weight), you must write the SQL logic **and** remember to write the JavaScript `.filter()` logic in the exact same method.
- **Hidden Bugs**: If your JavaScript memory code behaves slightly differently than your SQL query (e.g., sorting date formats), your tests will pass, but the real app in production will fail.

#### 🟢 The Optimization (Candidate #1):
Split the database layer into clean **Adapters** behind an **Interface**:
- `ListingRepo` (The Interface: describes what methods exist: `create`, `findById`, `findFeed`).
- `DrizzleListingRepo` (Adapter #1: contains purely SQL code for production).
- `MemoryListingRepo` (Adapter #2: contains purely in-memory code for testing).

**Result**: Production code runs the real database; unit tests plug in the memory adapter. Neither knows the other exists.

---

### Problem 2: Fat Route Handlers & Shallow Pass-Through Services

#### 🔴 The Problem:
- **Route handlers** (the files that receive web requests) were doing *everything*: validating JSON, checking user authentication, hashing passwords, signing JWT tokens, and writing database queries.
- Meanwhile, our **services** (`listingService.ts`, `walletService.ts`) were doing almost *nothing*—just taking arguments and forwarding them directly to repos.

```typescript
// What listingService.ts looked like:
export const listingService = {
  // Just a 1-line pass-through!
  async getListingById(id: string) {
    return listingRepo.findById(id);
  },
  async getListingsByOwner(ownerId: string) {
    return listingRepo.findByOwnerId(ownerId);
  }
};
```

#### 🍽️ Real-World Analogy:
Imagine a restaurant where the **Waiter** (Route Handler) takes the customer's order, runs into the kitchen, cooks the steak, plates the food, handles the cash register, and cleans the dishes... while the **Head Chef** (Service) just stands there and hands plates between the waiter and dishwasher.

#### ⚠️ Why it hurts:
- Route handlers become hundreds of lines long and impossible to test without sending fake HTTP network requests.
- Business rules (like "can a listing change from DRAFT to ACTIVE?") get scattered and repeated across multiple API endpoints.

#### 🟢 The Optimization (Candidate #2):
Make the **Domain Layer Deep**:
- Move all business logic (validation, permission checks, status transitions, token signing) into dedicated domain modules (e.g., `listingDomain`, `authDomain`).
- The Route Handler becomes a simple 3-step coordinator:
  1. Receive HTTP request.
  2. Call `listingDomain.createListing(...)`.
  3. Return HTTP response.

---

### Problem 3: Leaky Network Seam in the Mobile App (Manual Token Passing)

#### 🔴 The Problem:
In `apps/mobile`, the network helper (`apiRequest`) didn't know how to attach authentication tokens automatically. As a result, **every single React Hook** had to fetch the user's login token and manually pass it along:

```typescript
// Every single hook in apps/mobile/src/hooks/ had this boilerplate:
export function useFeed(category, condition) {
  const { token } = useAuth(); // 1. Manually pull token

  return useInfiniteQuery({
    queryFn: async ({ pageParam }) => {
      // 2. Manually pass token in every request
      return apiRequest(`/api/feed?...`, { token });
    },
    enabled: !!token, // 3. Manually guard against missing token
  });
}
```

#### 🏢 Real-World Analogy:
Imagine working in a secure office building where, every time you want to drink water, use the printer, or open a door, you have to dig your passport out of your pocket and hand it to a guard, instead of simply wearing an automated badge around your neck.

#### ⚠️ Why it hurts:
- **Poor Locality**: If we change how authentication works (e.g., using HTTP-only cookies, refreshing expired tokens), we would have to rewrite every single data hook in the app.
- **Boilerplate**: 5–10 extra lines of repetitive code in every single screen and hook.

#### 🟢 The Optimization (Candidate #3):
Make `apiRequest` smart. It can automatically read the saved token from secure storage or an auth provider. Hooks simply call `apiRequest('/api/feed')` without worrying about headers.

---

### Problem 4: Duplicated Domain Rules Across 3 Different Folders

#### 🔴 The Problem:
In Chokro, recycling rules state that:
- **Appliances & E-Waste** are measured by **Pieces** (`piece`).
- **Plastic, Paper, Glass, Metal, etc.** are measured by **Weight** (`kg`).

This single business rule was manually copy-pasted in 3 separate places:
1. `packages/shared/src/dto/listings.ts` (API validation rules)
2. `apps/mobile/src/types.ts` (`unitForCategory()` helper for mobile UI)
3. `apps/api/app/admin/lib/formatters.ts` (`unitForCategory()` helper for Admin Dashboard)

```typescript
// Copied in 3 separate files:
export function unitForCategory(cat) {
  return (cat === 'APPLIANCES' || cat === 'E_WASTE') ? 'piece' : 'kg';
}
```

#### 📋 Real-World Analogy:
Writing your home Wi-Fi password on 3 different sticky notes in 3 different rooms. When you change the password, you update 2 notes and forget the 3rd one.

#### ⚠️ Why it hurts:
If Chokro introduces a new category (e.g., `FURNITURE`), an engineer might update the mobile app but forget the backend or admin panel, causing validation crashes in production.

#### 🟢 The Optimization (Candidate #4):
Place the rule once inside `@chokro/shared`. Both the Mobile App, the Admin Dashboard, and the Backend API import from this single source of truth.

---

### Problem 5: Dead Re-Export Files in Mobile

#### 🔴 The Problem:
The mobile project had files whose entire content was just redirecting imports:
- `apps/mobile/src/api.ts` $\rightarrow$ literally just `export * from './services/api'`
- `apps/mobile/src/storage.ts` $\rightarrow$ literally just `export * from './services/storage'`

#### 🚪 Real-World Analogy:
Walking down a hallway, opening a door labeled "Storage", and finding yourself immediately facing another door that actually leads to the storage room. The first door serves no purpose.

#### 🟢 The Optimization (Candidate #5):
Delete `src/api.ts` and `src/storage.ts`, and update import statements to point directly to `src/services/api` and `src/services/storage`.

---

## 3. Summary: Before vs. After Architecture

| Aspect | Past (Current) Architecture | Optimized Architecture |
| :--- | :--- | :--- |
| **Database & Tests** | Single repo methods with two simultaneous SQL + JS implementations (`databaseOrTestStore`). | Pure repository interfaces with swappable `Drizzle` and `Memory` adapters. |
| **Backend Logic** | Fat route handlers handling HTTP + Business Rules + DB; services are empty pass-throughs. | Deep domain modules owning validation, state rules, and logic; route handlers are thin HTTP adapters. |
| **Mobile Auth** | Every hook manually reads and injects `{ token }` into network requests. | Network client automatically manages auth tokens; hooks only care about data. |
| **Domain Rules** | Unit and category rules (`unitForCategory`) copy-pasted in 3 different repos/folders. | Single canonical module in `@chokro/shared` used across Mobile, Web, and API. |
| **File Structure** | Redundant 1-line re-export files (`src/api.ts`). | Clean, canonical directory structure. |

---

## 4. Where to Find More Details
- 📊 **Visual Report (HTML & Diagrams)**: [`architecture-review.html`](./architecture-review.html)
- 📝 **Technical Action Plan (Markdown)**: [`architecture-review.md`](./architecture-review.md)
