# Chokro Architecture Visual Flows (Mermaid Diagrams)

Visual before-and-after architecture flows comparing the past system with the optimized design.

---

## 🗺️ 1. End-to-End System Flow

### 🔴 Past Architecture Flow (Tangled & Leaky)

```mermaid
flowchart TD
    User([Mobile User / Screen]) --> Hook[Mobile Hook: useFeed]
    
    subgraph MobileApp["apps/mobile"]
        Hook -->|1. Manually calls| AuthCtx[AuthContext: useAuth]
        AuthCtx -->|2. Extracts token| Hook
        Hook -->|3. Manually passes token| ApiReq[services/api.ts: apiRequest]
        Hook -.->|Uses local copy| UnitMobile[Local unitForCategory]
    end

    ApiReq -->|HTTP Request with token| Route

    subgraph BackendAPI["apps/api"]
        Route[Fat Route Handler: listings/route.ts]
        
        Route -->|1. Parses with Zod| Zod[Zod Schema]
        Route -->|2. Direct Auth & Permission checks| Perms[Inline Role & Owner Check]
        Route -->|3. Status transition checks| StateCheck[Inline Status Transitions]
        
        Route -->|Calls 1-line relay| Service[listingService.ts: Shallow Pass-through]
        Service --> Repo[listingRepo.ts: Dual Implementation]
        Route -.->|Or calls directly| Repo
        
        Repo -->|if NODE_ENV === test| MemArray[(In-Memory Array)]
        Repo -->|else| DrizzleORM[Drizzle ORM]
    end

    DrizzleORM --> Postgres[(PostgreSQL Database)]

    classDef redStyle fill:#fef2f2,stroke:#ef4444,stroke-width:2px,color:#991b1b;
    classDef yellowStyle fill:#fefce8,stroke:#facc15,stroke-width:1px,color:#854d0e;
    class Route,Repo,Service,UnitMobile redStyle;
    class Hook,ApiReq yellowStyle;
```

---

### 🟢 Optimized Architecture Flow (Clean & Pluggable)

```mermaid
flowchart TD
    User([Mobile User / Screen]) --> Hook[Mobile Hook: useFeed]
    
    subgraph SharedPkg["@chokro/shared"]
        CategoryRules[Category & Unit Domain Rules]
    end

    subgraph MobileApp["apps/mobile"]
        Hook -->|1. Clean data query| ApiReq[services/api.ts: apiRequest]
        TokenStore[(Secure Storage)] -->|Auto-attached token| ApiReq
        Hook -.->|Imports rules| CategoryRules
    end

    ApiReq -->|HTTP Request| Route

    subgraph BackendAPI["apps/api"]
        Route[Thin Route Handler: listings/route.ts]
        Domain[ListingDomain: Deep Domain Module]
        
        Route -->|1. Forwards input| Domain
        Domain -->|Validates rules, state & perms| Domain
        Domain -->|Calls repository interface| RepoInterface{{ListingRepo Interface}}
    end

    subgraph DatabaseLayer["packages/db"]
        RepoInterface -->|Production Adapter| DrizzleAdapter[DrizzleListingAdapter]
        RepoInterface -->|Unit Test Adapter| MemoryAdapter[MemoryListingAdapter]
        DrizzleAdapter --> Postgres[(PostgreSQL Database)]
        MemoryAdapter --> FastTestRunner[(Unit Tests Runner)]
    end

    classDef greenStyle fill:#f0fdf4,stroke:#22c55e,stroke-width:2px,color:#166534;
    classDef blueStyle fill:#eff6ff,stroke:#3b82f6,stroke-width:2px,color:#1e40af;
    class Domain,RepoInterface,DrizzleAdapter,MemoryAdapter greenStyle;
    class Route,ApiReq,Hook blueStyle;
```

---

## 🔍 2. Problem-by-Problem Detailed Flows

---

### 1. Database & Testing Seam (Problem #1)

#### 🔴 Before: Dual SQL + Memory code inside every single repo function
```mermaid
flowchart LR
    Caller[API Handler or Service] --> RepoMethod[listingRepo.create]
    
    subgraph SingleFile["Inside apps/api/lib/repos/listings.ts"]
        RepoMethod --> Check{if NODE_ENV === 'test'}
        Check -->|true| ArrayLogic["memoryStore.listings.push(item)<br/>(Manual JavaScript Array Logic)"]
        Check -->|false| SqlLogic["db.insert(listings).values(...)<br/>(SQL Query via Drizzle)"]
    end
    
    ArrayLogic --> TestResult[(Test Result)]
    SqlLogic --> LiveDB[(PostgreSQL DB)]

    classDef bad fill:#fee2e2,stroke:#ef4444,stroke-width:2px;
    class RepoMethod,Check bad;
```

#### 🟢 After: Clean Pluggable Adapters behind an Interface
```mermaid
flowchart TD
    Caller[Domain Module] --> RepoInterface{{ListingRepo Interface<br/>create, findById, updateStatus}}
    
    subgraph Adapters["packages/db/adapters"]
        RepoInterface -->|Production| DrizzleAdapter[DrizzleListingAdapter<br/>Pure SQL logic]
        RepoInterface -->|Testing| MemoryAdapter[MemoryListingAdapter<br/>Pure Test Mock logic]
    end
    
    DrizzleAdapter --> LiveDB[(PostgreSQL Database)]
    MemoryAdapter --> FastTests[(Isolated Unit Tests)]

    classDef good fill:#dcfce7,stroke:#22c55e,stroke-width:2px;
    class RepoInterface,DrizzleAdapter,MemoryAdapter good;
```

---

### 2. Backend Route Handling (Problem #2)

#### 🔴 Before: Fat Route Handler doing everything
```mermaid
sequenceDiagram
    autonumber
    actor Client as Mobile Client
    participant Route as Route Handler (app/api/auth/login)
    participant Bcrypt as Bcrypt Utility
    participant JWT as JWT Signer
    participant DB as User Database

    Client->>Route: POST /api/auth/login
    Note over Route: 1. Validate Zod Schema inline
    Route->>DB: 2. Query user by email
    DB-->>Route: User record
    Route->>Bcrypt: 3. Verify password hash
    Bcrypt-->>Route: Valid boolean
    Route->>JWT: 4. Generate & sign auth token
    JWT-->>Route: Access token string
    Note over Route: 5. Construct JSON response
    Route-->>Client: 200 OK with Token
```

#### 🟢 After: Thin Route + Reusable Deep Domain Module
```mermaid
sequenceDiagram
    autonumber
    actor Client as Mobile Client
    participant Route as Route Handler (Thin HTTP Adapter)
    participant Domain as AuthDomain (Deep Module)
    participant Repo as UserRepo Interface

    Client->>Route: POST /api/auth/login
    Route->>Domain: login(email, password)
    Note over Domain: Encapsulates validation, password check & token signing
    Domain->>Repo: findByEmail(email)
    Repo-->>Domain: User
    Domain-->>Route: { user, token }
    Route-->>Client: 200 OK
```

---

### 3. Mobile Network & Token Management (Problem #3)

#### 🔴 Before: Every Hook manually threads auth tokens
```mermaid
flowchart TD
    subgraph Hooks["apps/mobile/src/hooks"]
        H1[useFeed] -->|useAuth| Token1[Token]
        H2[useWallet] -->|useAuth| Token2[Token]
        H3[useRateCard] -->|useAuth| Token3[Token]
        H4[useCreateListing] -->|useAuth| Token4[Token]
    end
    
    Token1 -->|pass token| API[apiRequest path, token]
    Token2 -->|pass token| API
    Token3 -->|pass token| API
    Token4 -->|pass token| API

    API --> Backend[Backend Server]

    classDef bad fill:#fee2e2,stroke:#ef4444,stroke-width:1px;
    class Token1,Token2,Token3,Token4 bad;
```

#### 🟢 After: Network client automatically injects tokens
```mermaid
flowchart TD
    subgraph Hooks["apps/mobile/src/hooks"]
        H1[useFeed]
        H2[useWallet]
        H3[useRateCard]
        H4[useCreateListing]
    end
    
    H1 -->|clean call: apiRequest('/feed')| API[apiRequest client]
    H2 -->|clean call: apiRequest('/wallet')| API
    H3 -->|clean call: apiRequest('/rate-card')| API
    H4 -->|clean call: apiRequest('/listings')| API

    Storage[(Secure Token Storage)] -.->|Auto-injected| API
    API --> Backend[Backend Server]

    classDef good fill:#dcfce7,stroke:#22c55e,stroke-width:2px;
    class API,Storage good;
```

---

### 4. Category & Unit Rules (Problem #4)

#### 🔴 Before: Duplicate rule in 3 separate repositories/folders
```mermaid
flowchart TD
    Rule[Domain Invariant: Appliances & E-Waste use Piece, others use KG]
    
    Rule -->|Copy 1| P1[packages/shared/src/dto/listings.ts]
    Rule -->|Copy 2| P2[apps/mobile/src/types.ts]
    Rule -->|Copy 3| P3[apps/api/app/admin/lib/formatters.ts]

    classDef red fill:#fee2e2,stroke:#ef4444,stroke-width:2px;
    class P1,P2,P3 red;
```

#### 🟢 After: Single Source of Truth
```mermaid
flowchart TD
    SingleRule[packages/shared: categoryDomain<br/>unitForCategory & formatLabel]
    
    SingleRule -->|Import| Backend[Backend API & DTOs]
    SingleRule -->|Import| Mobile[Mobile Application]
    SingleRule -->|Import| Admin[Admin Dashboard]

    classDef green fill:#dcfce7,stroke:#22c55e,stroke-width:2px;
    class SingleRule green;
```
