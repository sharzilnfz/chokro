# Chokro In-Depth Architectural Walkthrough
## Connecting Every Dot Through a Single End-to-End Flow

> **Why this document exists**: When you learn individual pieces in isolation, it is easy to get lost. In this walkthrough, we trace **one complete slice** of the system — from a user tapping "Publish" on their phone to PostgreSQL storing the record and the feed re-rendering — explaining every single boundary, type check, transformation, and database query.

---

## 🎯 The Journey: Creating a Scrap Listing

We will trace the exact execution path when a user submits a recyclable scrap listing (e.g. 2.5 kg of Plastics in "GOOD" condition with a compressed photo).

```mermaid
flowchart TD
    subgraph UI["1. Mobile Screen Layer"]
        A1["User selects photo"] --> A2["Downscale & Base64 Compress (<500KB)<br/>(lib/photo.ts)"]
        A2 --> A3["Live Rate Estimation<br/>(useEstimate hook -> GET /api/rate-card/estimate)"]
        A3 --> A4["User taps 'Publish Listing'<br/>(CreateListingScreen.tsx)"]
    end

    subgraph ClientNet["2. Mobile Networking Layer"]
        A4 --> B1["useCreateListing mutation<br/>(hooks/useCreateListing.ts)"]
        B1 --> B2["Inject JWT Bearer Token<br/>(services/api.ts)"]
        B2 --> B3["HTTP POST /api/listings<br/>(JSON payload)"]
    end

    subgraph APITransport["3. API Transport & Security Layer"]
        B3 --> C1["Next.js Middleware<br/>(middleware.ts -> CORS validation)"]
        C1 --> C2["safeRoute wrapper<br/>(lib/http.ts)"]
        C2 --> C3["Authentication Guard<br/>(lib/auth.ts -> requireAuth)"]
    end

    subgraph Validation["4. Shared Domain Validation Layer"]
        C3 --> D1["Zod Schema Validation<br/>(packages/shared/src/dto/listings.ts)"]
        D1 -->|"superRefine: verify unit & weight invariants"| D2["Typed Validated Payload"]
    end

    subgraph Persistence["5. Domain & Database Layer"]
        D2 --> E1["listingService.createListing()<br/>(lib/services/listingService.ts)"]
        E1 --> E2["listingRepo.create()<br/>(packages/db repository adapter)"]
        E2 --> E3["Drizzle ORM SQL INSERT<br/>(INSERT INTO listings ... RETURNING *)"]
        E3 --> E4["PostgreSQL Database<br/>(packages/db/src/schema.ts)"]
    end

    subgraph ClientReactivity["6. Return Trip & UI Reactivity"]
        E4 --> F1["HTTP 201 Created Response<br/>({ message, listing })"]
        F1 --> F2["React Query Cache Invalidation<br/>(queryClient.invalidateQueries(['feed']))"]
        F2 --> F3["AppShell Tab Switch<br/>(Switch to 'browse' feed tab)"]
        F3 --> F4["FeedScreen Auto-Rerender<br/>(New listing displayed at top of feed)"]
    end
```

---

## 🔍 Stage-by-Stage Breakdown with Real Code

### Stage 1: The Mobile Screen & Pre-flight UX
**Files**: [`apps/mobile/src/screens/CreateListingScreen.tsx`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/screens/CreateListingScreen.tsx), [`apps/mobile/src/lib/photo.ts`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/lib/photo.ts)

1. **Photo Compression**:
   - The user selects an image from their camera roll.
   - Raw photos from modern smartphones can be 5–15 MB. Uploading large images wastes mobile bandwidth and slows the server.
   - In [`apps/mobile/src/lib/photo.ts:18-82`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/lib/photo.ts#L18-L82), `pickAndCompressPhoto()` ([L64-82](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/lib/photo.ts#L64-L82)) downscales the image so its longest dimension is ≤1600px and compresses it to a standard JPEG Base64 Data URI (`data:image/jpeg;base64,...`) under 500KB.
2. **Instant Live Valuation**:
   - When the user selects category `PLASTICS` and condition `GOOD`, the screen calls `useEstimate('PLASTICS', 'GOOD')` ([`apps/mobile/src/hooks/useEstimate.ts:14-29`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/hooks/useEstimate.ts#L14-L29)).
   - This queries the backend rate card endpoint (`GET /api/rate-card/estimate`), calculating an instant payout estimate:
     $$\text{Estimated Value} = \text{Price per Unit (৳45.00/kg)} \times \text{Weight (2.5 kg)} = ৳112.50$$
3. **Triggering Form Submit**:
   - The user taps "Publish listing" ([L275](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/screens/CreateListingScreen.tsx#L275)).
   - `handleSubmit()` packages the state into a payload:
     ```typescript
     await createListing.mutateAsync({
       category: 'PLASTICS',
       unit: 'kg',
       declaredWeight: 2.5,
       declaredCondition: 'GOOD',
       photos: [photo.dataUri],
     });
     ```

---

### Stage 2: Crossing the Network Boundary
**Files**: [`apps/mobile/src/hooks/useCreateListing.ts`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/hooks/useCreateListing.ts), [`apps/mobile/src/services/api.ts`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/services/api.ts)

1. **Hook Dispatch**:
   - `useCreateListing` ([L17-21](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/hooks/useCreateListing.ts#L17-L21)) triggers `apiRequest('/api/listings', { method: 'POST', body: JSON.stringify(payload) })`.
2. **Token Injection & Request Serialization**:
   - `apiRequest` ([`apps/mobile/src/services/api.ts:61-104`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/services/api.ts#L61-L104)) fetches the current JWT from [`AuthContext`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/context/AuthContext.tsx) / secure storage.
   - It constructs the HTTP Request:
     ```http
     POST /api/listings HTTP/1.1
     Host: localhost:3000
     Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     Content-Type: application/json

     {
       "category": "PLASTICS",
       "unit": "kg",
       "declaredWeight": 2.5,
       "declaredCondition": "GOOD",
       "photos": ["data:image/jpeg;base64,..."]
     }
     ```

---

### Stage 3: The API Transport & Gatekeeper Layer
**Files**: [`apps/api/middleware.ts`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/api/middleware.ts), [`apps/api/lib/http.ts`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/api/lib/http.ts), [`apps/api/app/api/listings/route.ts`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/api/app/api/listings/route.ts)

1. **CORS Middleware**:
   - [`apps/api/middleware.ts`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/api/middleware.ts#L4-L25) matches `/api/:path*`.
   - It validates headers and ensures cross-origin requests from web or mobile simulators are authorized.
2. **Route Safety Wrapper (`safeRoute`)**:
   - The route handler is wrapped in `safeRoute` ([`apps/api/lib/http.ts:17-35`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/api/lib/http.ts#L17-L35)).
   - If anything throws an unexpected exception (e.g. database down, parsing crash), `safeRoute` catches it and formats a clean JSON error response (`500` or `503`) rather than crashing the Node process.
3. **Authentication Verification**:
   - Route calls `requireAuth(req)` ([`apps/api/lib/auth.ts:51-57`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/api/lib/auth.ts#L51-L57)).
   - `verifyAuthHeader(req)` extracts the token from `Authorization: Bearer <token>`.
   - `verifyToken(token)` validates the cryptographic signature using the server secret (`JWT_SECRET`) and extracts the payload:
     ```typescript
     {
       userId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
       email: "user@example.com",
       role: "INDIVIDUAL"
     }
     ```
   - If the token is missing, expired, or tampered with, the request immediately terminates with `401 Unauthorized`.

---

### Stage 4: Shared Domain Schema Validation
**Files**: [`packages/shared/src/dto/listings.ts`](file:///Users/sharzilnafis/Desktop/Project/chokro/packages/shared/src/dto/listings.ts)

1. **Zod Validation Execution**:
   - `CreateListingSchema.safeParse(body)` parses and validates the incoming JSON.
2. **Domain Invariant Enforcement**:
   - In [`packages/shared/src/dto/listings.ts:4-20`](file:///Users/sharzilnafis/Desktop/Project/chokro/packages/shared/src/dto/listings.ts#L4-L20), `.superRefine()` checks domain-specific business invariants:
     ```typescript
     // If category is an appliance or e-waste:
     if (isPieceCategory(data.category)) {
       // Must have pieceCount, cannot have declaredWeight
       if (data.unit !== 'piece' || !data.pieceCount || data.declaredWeight) {
         ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Piece categories require unit='piece' and pieceCount" });
       }
     } else {
       // Bulk recyclables (Plastics, Paper, etc.):
       // Must have declaredWeight, cannot have pieceCount
       if (data.unit !== 'kg' || !data.declaredWeight || data.pieceCount) {
         ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Weight categories require unit='kg' and declaredWeight" });
       }
     }
     ```
   - If any validation fails, the API immediately returns `400 Bad Request` with an exact breakdown of which field failed.

---

### Stage 5: Domain Service & Database Persistence
**Files**: [`apps/api/lib/services/listingService.ts`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/api/lib/services/listingService.ts), [`apps/api/lib/repos/listings.ts`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/api/lib/repos/listings.ts), [`packages/db/src/schema.ts`](file:///Users/sharzilnafis/Desktop/Project/chokro/packages/db/src/schema.ts)

1. **Service Layer**:
   - `listingService.createListing()` ([`apps/api/lib/services/listingService.ts:23-42`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/api/lib/services/listingService.ts#L23-L42)) formats the validated input into the database model format:
     ```typescript
     const newListing = await listingRepo.create({
       ownerId: user.userId,
       category: parsed.data.category,
       unit: parsed.data.unit,
       declaredWeight: parsed.data.declaredWeight ? String(parsed.data.declaredWeight) : null,
       pieceCount: parsed.data.pieceCount ?? null,
       declaredCondition: parsed.data.declaredCondition,
       photos: parsed.data.photos ?? [],
       status: 'ACTIVE',
     });
     ```
2. **Repository & Drizzle ORM Adapter**:
   - `listingRepo.create()` ([`apps/api/lib/repos/listings.ts:25-38`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/api/lib/repos/listings.ts#L25-L38)) invokes Drizzle ORM:
     ```typescript
     const [row] = await db.insert(listings).values(values).returning();
     return row;
     ```
3. **PostgreSQL Execution**:
   - Drizzle sends the compiled SQL to PostgreSQL:
     ```sql
     INSERT INTO "listings" ("id", "owner_id", "category", "unit", "declared_weight", "declared_condition", "photos", "status", "created_at")
     VALUES (gen_random_uuid(), 'a1b2c3d4...', 'PLASTICS', 'kg', '2.50', 'GOOD', '["data:image/jpeg..."]', 'ACTIVE', NOW())
     RETURNING *;
     ```
   - PostgreSQL saves the row on disk and returns the newly generated record with its UUID.

---

### Stage 6: The Return Trip & UI Reactivity
**Files**: [`apps/api/app/api/listings/route.ts`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/api/app/api/listings/route.ts), [`apps/mobile/src/hooks/useCreateListing.ts`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/hooks/useCreateListing.ts), [`apps/mobile/src/navigation/AppShell.tsx`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/navigation/AppShell.tsx), [`apps/mobile/src/screens/FeedScreen.tsx`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/screens/FeedScreen.tsx)

1. **HTTP 201 Response Envelope**:
   - The route handler returns:
     ```typescript
     return apiSuccess('Listing created', { listing: newListing }, 201);
     ```
   - HTTP Response received by phone:
     ```http
     HTTP/1.1 201 Created
     Content-Type: application/json

     {
       "message": "Listing created",
       "listing": {
         "id": "7f8e9d0a-1b2c-3d4e-5f6a-7b8c9d0e1f2a",
         "owner_id": "a1b2c3d4...",
         "category": "PLASTICS",
         "unit": "kg",
         "declared_weight": "2.50",
         "declared_condition": "GOOD",
         "status": "ACTIVE",
         "created_at": "2026-08-12T07:50:00.000Z"
       }
     }
     ```
2. **React Query Cache Invalidation**:
   - The `useCreateListing` mutation `onSuccess` callback executes:
     ```typescript
     queryClient.invalidateQueries({ queryKey: ['feed'] });
     ```
   - This tells TanStack Query: *"The feed cache is now stale. Refetch `GET /api/feed` in the background immediately."*
3. **Screen Navigation & Feed Update**:
   - `CreateListingScreen` calls `onCreated()` ([`apps/mobile/src/screens/CreateListingScreen.tsx:98`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/screens/CreateListingScreen.tsx#L98)).
   - `AppShell` ([`apps/mobile/src/navigation/AppShell.tsx:117`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/navigation/AppShell.tsx#L117)) switches active tab from `list` to `browse`.
   - `FeedScreen` renders the latest items, with the newly published plastic scrap listing appearing right at the top!

---

## 📊 Summary: Flow Execution Matrix

| Step | Layer | File | Input Data | Output / Transformation |
| :--- | :--- | :--- | :--- | :--- |
| **1. Compress** | Mobile Lib | [`photo.ts`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/lib/photo.ts#L64) | Raw camera roll photo (10MB) | Base64 JPEG data URI (<500KB) |
| **2. Estimate** | Mobile Hook | [`useEstimate.ts`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/hooks/useEstimate.ts#L14) | Category + Condition | Live unit rate (৳45/kg) |
| **3. Dispatch** | Mobile API | [`api.ts`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/services/api.ts#L61) | Form state + Auth token | HTTP POST with Bearer JWT |
| **4. Guard** | API Auth | [`auth.ts`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/api/lib/auth.ts#L51) | Bearer JWT token | Decoded user profile (`userId`, `role`) |
| **5. Validate** | Shared DTO | [`listings.ts`](file:///Users/sharzilnafis/Desktop/Project/chokro/packages/shared/src/dto/listings.ts#L4) | Raw HTTP JSON body | Typed & Invariant-checked DTO |
| **6. Store** | DB Repo | [`listings.ts`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/api/lib/repos/listings.ts#L25) | DTO fields + `ownerId` | PostgreSQL row inserted via Drizzle |
| **7. React** | Mobile Query | [`useCreateListing.ts`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/hooks/useCreateListing.ts#L23) | HTTP 201 Response | Invalidate `['feed']`, switch tab |

---

*You have now mastered the end-to-end flow! Every other feature in Chokro (Wallet, Rate Cards, Drop Zones, Partners) follows this exact same pattern.*
