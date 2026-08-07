# NativeWind Migration Plan — `@chokro/mobile`

> **Branch:** `sprint-1` → create `feat/nativewind-migration` from HEAD  
> **Committers:** All members (m1–m4), distributed by phase  
> **Execution model:** Herdr workers · Gemini 3.6 Flash · high  
> **Do NOT run as single agent — dispatch as parallel Herdr workers per phase**

### Member → Worker Assignment

| Member | Name | Git Identity | Assigned Work |
|:---|:---|:---|:---|
| **m3** | Sharzil Nafis | `"Sharzil Nafis" <sharzilrs@gmail.com>` | Phase 0+1 (setup), Worker 2A (App.tsx), Phase 3+4 (cleanup/verify) |
| **m1** | Sadat SKD | `"Sadat SKD" <sadatskd003@gmail.com>` | Worker 2B (LoginScreen + SignupScreen) |
| **m2** | Ahmad Sameer | `"Ahmad Sameer" <ahmad.sameer.5122@gmail.com>` | Worker 2C (FeedScreen + RateCardScreen) |
| **m4** | Imran Ahmed Upom | `"Imran Ahmed Upom" <imran.ahmed.upom@g.bracu.ac.bd>` | Worker 2D (CreateListingScreen + WalletScreen + QRScannerScreen) |

---

## Inventory

| File | Lines | StyleSheet.create blocks |
|:---|:---|:---|
| [`App.tsx`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/App.tsx) | 310 | 1 (95 lines of styles) |
| [`FeedScreen.tsx`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/screens/FeedScreen.tsx) | 295 | 1 |
| [`CreateListingScreen.tsx`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/screens/CreateListingScreen.tsx) | 349 | 1 |
| [`QRScannerScreen.tsx`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/screens/QRScannerScreen.tsx) | 254 | 1 |
| [`WalletScreen.tsx`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/screens/WalletScreen.tsx) | 195 | 1 |
| [`RateCardScreen.tsx`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/screens/RateCardScreen.tsx) | 183 | 1 |
| [`LoginScreen.tsx`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/screens/LoginScreen.tsx) | 163 | 1 |
| [`SignupScreen.tsx`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/screens/SignupScreen.tsx) | 179 | 1 |
| [`theme.ts`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/theme.ts) | 34 | — (color/radii/shadow tokens) |
| **Total** | **1,962** | **8 blocks to convert** |

---

## Phase 0 — Branch & Prep (Sequential, single worker)

**Herdr worker:** `worker-0-branch`

```
1. git checkout sprint-1 && git pull
2. git checkout -b feat/nativewind-migration
3. git push -u origin feat/nativewind-migration
```

> [!IMPORTANT]
> All subsequent workers operate on branch `feat/nativewind-migration`.  
> Each worker commits using its assigned member's git identity (see table above).

### ✅ Gate: branch exists and is pushed

---

## Phase 1 — Install & Configure NativeWind v4 (Sequential, single worker)

**Herdr worker:** `worker-1-setup`  
**Commit as:** m3

> [!IMPORTANT]
> Using **NativeWind v4 (stable)** with **Tailwind CSS v3** — NOT v5 (preview).
> v5 is still pre-release as of Aug 2026 and not recommended for team projects.

### Step 1.1 — Install dependencies

```bash
cd apps/mobile
npx expo install nativewind react-native-reanimated react-native-worklets react-native-safe-area-context
pnpm add -D tailwindcss@^3.4.19
```

> [!NOTE]
> Use `npx expo install` for native deps so Expo auto-selects SDK 57-compatible versions.
> `react-native-worklets` is a **required peer dependency** of Reanimated 4 (SDK 55+).
> `postcss` is NOT needed — NativeWind v4's Metro wrapper handles it internally.

### Step 1.2 — Create `apps/mobile/tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#F3F5EF',
        surface: '#FFFFFF',
        'surface-muted': '#E8ECE4',
        ink: '#17231D',
        muted: '#5E6D64',
        border: '#D4DBD2',
        leaf: '#2F6B4F',
        'leaf-dark': '#1D4D37',
        'leaf-soft': '#DCEADF',
        amber: '#9A5B10',
        'amber-soft': '#F6E8CF',
        danger: '#A33737',
        'danger-soft': '#F5DEDE',
      },
      borderRadius: {
        sm: '10px',
        md: '16px',
        lg: '24px',
        pill: '999px',
      },
      boxShadow: {
        card: '0px 2px 8px rgba(23, 35, 29, 0.06)',
      },
    },
  },
  plugins: [],
};
```

### Step 1.3 — Create (or merge into existing) `apps/mobile/metro.config.js`

```javascript
const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativewind(config, {
  input: "./global.css",
});
```

### Step 1.4 — Create `apps/mobile/global.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Step 1.5 — Create/update `apps/mobile/babel.config.js`

NativeWind v4 **requires** the Babel plugin:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

### Step 1.6 — Import `global.css` in entry

Add to top of `apps/mobile/App.tsx`:
```tsx
import "./global.css";
```

### Step 1.7 — Add TypeScript env declaration

Create `apps/mobile/nativewind-env.d.ts`:
```typescript
/// <reference types="nativewind/types" />
```

And add it to `tsconfig.json` includes if needed.

### Step 1.8 — Smoke test

```bash
cd apps/mobile
npx expo start --clear
```

Verify: app boots without errors. No visual changes expected yet (all styles still in StyleSheet).

### Commit

```bash
git add -A
git -c user.name="Sharzil Nafis" -c user.email="sharzilrs@gmail.com" \
  commit -m "feat(mobile): install and configure NativeWind v4 with Chokro theme"
```

### ✅ Gate: `npx expo start --clear` boots cleanly, no red screens

---

## Phase 2 — Convert Screens to NativeWind (Parallel, 4 workers)

> [!IMPORTANT]
> **Each worker converts independent files. No shared file edits. All can run in parallel.**
> 
> **Conversion rules for every worker:**
> 1. Replace `style={styles.xxx}` with `className="..."` using Tailwind utility classes
> 2. Use the custom Chokro colors: `bg-leaf`, `text-ink`, `text-muted`, `border-border`, etc.
> 3. For `pressed && styles.pressed` patterns → use `active:opacity-[0.72]` or keep a minimal inline style (**NOT** `opacity-72` — that class does not exist in Tailwind v3's default scale)
> 4. For `...shadows.card` spreads → replace with `shadow-card` (mapped in `tailwind.config.js`). For Android, also add `elevation-2` if supported, or keep `elevation: 2` as a minimal inline style.
> 5. Delete the entire `StyleSheet.create({...})` block at the bottom of the file
> 6. Remove `import { StyleSheet } from 'react-native'` if no longer used (keep other RN imports)
> 7. Do NOT change any logic, state, props, effects, or API calls
> 8. Keep the `theme.ts` import ONLY if a file still uses `colors.xxx` for non-style purposes (e.g., `Ionicons color={colors.leaf}`) — icon `color` props can't use `className`
> 9. Test: file saves, no TypeScript errors (`pnpm typecheck`)

---

### Worker 2A — `worker-2a-core` (App.tsx + theme.ts)

**Files:** [`App.tsx`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/App.tsx), [`theme.ts`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/theme.ts)

**Conversion map for App.tsx styles → Tailwind classes:**

| StyleSheet key | Tailwind className |
|:---|:---|
| `container` | `flex-1 bg-background` |
| `centeredPage` | `flex-1 bg-background items-center justify-center p-6` |
| `mark` | `w-14 h-14 rounded-[18px] bg-leaf items-center justify-center mb-2.5` |
| `brand` | `text-ink text-[28px] font-extrabold tracking-tight mb-7` |
| `loadingText` | `text-muted mt-3 text-sm` |
| `restoreCard` | `w-full max-w-[430px] p-6 rounded-lg bg-surface border border-border items-center` |
| `header` | `min-h-[66px] flex-row items-center justify-between px-[18px] border-b border-border bg-background` |
| `body` | `flex-1` |
| `navBar` | `min-h-[72px] flex-row px-2 pt-1.5 pb-1 bg-surface border-t border-border` |
| `navItem` | `flex-1 min-h-[56px] items-center justify-center rounded-md gap-0.5` |
| `navItemActive` | `bg-leaf-soft` |
| `pressed` | `opacity-[0.72]` |

> [!NOTE]
> Keep `theme.ts` file alive but add a deprecation comment. Icon `color={}` props still need the JS color values since `className` can't style Ionicons color prop.

**Commit as m3:**
```bash
git -c user.name="Sharzil Nafis" -c user.email="sharzilrs@gmail.com" \
  commit -m "feat(mobile): convert App.tsx to NativeWind classes"
```

---

### Worker 2B — `worker-2b-auth` · m1 Sadat SKD (LoginScreen + SignupScreen)

**Files:**
- [`LoginScreen.tsx`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/screens/LoginScreen.tsx) (163 lines)
- [`SignupScreen.tsx`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/screens/SignupScreen.tsx) (179 lines)

These two screens share a near-identical layout (form card, inputs, primary button, link toggle). Convert both.

**Two commits as m1:**
```bash
git -c user.name="Sadat SKD" -c user.email="sadatskd003@gmail.com" \
  commit -m "feat(mobile): convert LoginScreen to NativeWind classes"

git -c user.name="Sadat SKD" -c user.email="sadatskd003@gmail.com" \
  commit -m "feat(mobile): convert SignupScreen to NativeWind classes"
```

---

### Worker 2C — `worker-2c-browse` · m2 Ahmad Sameer (FeedScreen + RateCardScreen)

**Files:**
- [`FeedScreen.tsx`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/screens/FeedScreen.tsx) (295 lines)
- [`RateCardScreen.tsx`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/screens/RateCardScreen.tsx) (183 lines)

**Two commits as m2:**
```bash
git -c user.name="Ahmad Sameer" -c user.email="ahmad.sameer.5122@gmail.com" \
  commit -m "feat(mobile): convert FeedScreen to NativeWind classes"

git -c user.name="Ahmad Sameer" -c user.email="ahmad.sameer.5122@gmail.com" \
  commit -m "feat(mobile): convert RateCardScreen to NativeWind classes"
```

---

### Worker 2D — `worker-2d-actions` · m4 Imran Ahmed Upom (CreateListingScreen + WalletScreen + QRScannerScreen)

**Files:**
- [`CreateListingScreen.tsx`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/screens/CreateListingScreen.tsx) (349 lines)
- [`WalletScreen.tsx`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/screens/WalletScreen.tsx) (195 lines)
- [`QRScannerScreen.tsx`](file:///Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/screens/QRScannerScreen.tsx) (254 lines)

**Three commits as m4:**
```bash
git -c user.name="Imran Ahmed Upom" -c user.email="imran.ahmed.upom@g.bracu.ac.bd" \
  commit -m "feat(mobile): convert CreateListingScreen to NativeWind classes"

git -c user.name="Imran Ahmed Upom" -c user.email="imran.ahmed.upom@g.bracu.ac.bd" \
  commit -m "feat(mobile): convert WalletScreen to NativeWind classes"

git -c user.name="Imran Ahmed Upom" -c user.email="imran.ahmed.upom@g.bracu.ac.bd" \
  commit -m "feat(mobile): convert QRScannerScreen to NativeWind classes"
```

### ✅ Gate: after all 4 workers finish and are merged together

```bash
cd apps/mobile
pnpm typecheck     # zero TS errors
npx expo start --clear   # app boots
```

Verify: no `StyleSheet.create` blocks remain (justified inline `style=` for dynamic values / Ionicons color / elevation is acceptable):
```bash
grep -rn "StyleSheet.create" apps/mobile/src/ apps/mobile/App.tsx
# Expected: 0 results
```

---

## Phase 3 — Cleanup & Validation (Sequential, single worker)

**Herdr worker:** `worker-3-cleanup`

### Step 3.1 — Remove dead theme imports

```bash
grep -rn "from.*theme" apps/mobile/src/ apps/mobile/App.tsx
```

For each file: if `colors` is only used for `Ionicons color={}` prop, keep the import. If no `colors` usage remains, remove the import.

### Step 3.2 — Deprecate or slim down `theme.ts`

If all JS color references are gone (unlikely — Ionicons still needs them), delete `theme.ts`. Otherwise, add a header comment:

```typescript
/**
 * @deprecated Prefer Tailwind classes via NativeWind.
 * These JS values are kept only for props that don't accept className
 * (e.g., Ionicons `color`, ActivityIndicator `color`).
 */
```

### Step 3.3 — Verify no StyleSheet remnants

```bash
grep -rn "StyleSheet" apps/mobile/
# Expected: only in node_modules or RN type imports
```

### Step 3.4 — Full typecheck

```bash
cd /Users/sharzilnafis/Desktop/Project/chokro
pnpm typecheck
```

### Step 3.5 — Expo boot test

```bash
cd apps/mobile
npx expo start --clear
```

Walk through every tab: Browse → List → Rates → Wallet → Scan → Logout → Login → Signup.

### Commit as m3

```bash
git -c user.name="Sharzil Nafis" -c user.email="sharzilrs@gmail.com" \
  commit -m "refactor(mobile): clean up dead theme imports after NativeWind migration"
```

### ✅ Gate: typecheck passes, app boots, all tabs render

---

## Phase 4 — Verification Checks (Sequential, single worker)

**Herdr worker:** `worker-4-verify`

### Check 1 — Zero StyleSheet.create

```bash
grep -rn "StyleSheet.create" apps/mobile/src/ apps/mobile/App.tsx
# Must return 0 results
```

### Check 2 — TypeScript clean

```bash
cd /Users/sharzilnafis/Desktop/Project/chokro && pnpm typecheck
# Must exit 0
```

### Check 3 — Expo start (no red screen)

```bash
cd apps/mobile && npx expo start --clear
# Must boot without crash
```

### Check 4 — NativeWind `verifyInstallation()`

Add temporarily to `App.tsx`:
```tsx
import { verifyInstallation } from "nativewind";
// Inside App component, before return:
if (__DEV__) verifyInstallation();
```

Run the app. Console should print NativeWind verification success. Then remove the `verifyInstallation` call.

### Check 5 — Visual regression (manual)

Open each screen and visually compare colors/spacing against the current `sprint-1` version. Key things to spot:
- ❌ Missing rounded corners (RN's `borderRadius` vs Tailwind's `rounded-*`)
- ❌ Wrong colors (custom theme names must match)
- ❌ Broken `pressed` opacity feedback
- ❌ Nav bar spacing off

### Check 6 — No duplicate styles

```bash
grep -rn "style=" apps/mobile/src/ apps/mobile/App.tsx | grep -v "node_modules"
# Each remaining `style=` must be justified (dynamic values, Ionicons color, etc.)
```

### Final Commit as m3 (if any fixes from checks)

```bash
git -c user.name="Sharzil Nafis" -c user.email="sharzilrs@gmail.com" \
  commit -m "fix(mobile): address NativeWind migration verification findings"
```

---

## Herdr Dispatch Summary

| Phase | Worker Name | Commit As | Mode | Dependencies | Est. Time |
|:---|:---|:---|:---|:---|:---|
| 0 | `worker-0-branch` | m3 Sharzil | Sequential | None | 1 min |
| 1 | `worker-1-setup` | m3 Sharzil | Sequential | Phase 0 done | 5–10 min |
| 2A | `worker-2a-core` | m3 Sharzil | **Parallel** | Phase 1 done | 5–8 min |
| 2B | `worker-2b-auth` | **m1 Sadat** | **Parallel** | Phase 1 done | 5–8 min |
| 2C | `worker-2c-browse` | **m2 Ahmad** | **Parallel** | Phase 1 done | 5–8 min |
| 2D | `worker-2d-actions` | **m4 Imran** | **Parallel** | Phase 1 done | 8–12 min |
| 3 | `worker-3-cleanup` | m3 Sharzil | Sequential | All Phase 2 merged | 3–5 min |
| 4 | `worker-4-verify` | m3 Sharzil | Sequential | Phase 3 done | 5 min |

### Herdr Launch Commands

```bash
# Phase 0 + 1 (sequential)
herdr run worker-0-branch --model gemini-3.6-flash-high -- "..."
herdr run worker-1-setup  --model gemini-3.6-flash-high --after worker-0-branch -- "..."

# Phase 2 (parallel, all start after worker-1-setup)
herdr run worker-2a-core   --model gemini-3.6-flash-high --after worker-1-setup -- "..."
herdr run worker-2b-auth   --model gemini-3.6-flash-high --after worker-1-setup -- "..."
herdr run worker-2c-browse  --model gemini-3.6-flash-high --after worker-1-setup -- "..."
herdr run worker-2d-actions --model gemini-3.6-flash-high --after worker-1-setup -- "..."

# Phase 3 + 4 (sequential, after all Phase 2)
herdr run worker-3-cleanup --model gemini-3.6-flash-high --after worker-2a-core,worker-2b-auth,worker-2c-browse,worker-2d-actions -- "..."
herdr run worker-4-verify  --model gemini-3.6-flash-high --after worker-3-cleanup -- "..."
```

---

## Commit Log Preview (distributed across team)

```
m3 Sharzil   │ feat(mobile): install and configure NativeWind v4 with Chokro theme
m3 Sharzil   │ feat(mobile): convert App.tsx to NativeWind classes
m1 Sadat     │ feat(mobile): convert LoginScreen to NativeWind classes
m1 Sadat     │ feat(mobile): convert SignupScreen to NativeWind classes
m2 Ahmad     │ feat(mobile): convert FeedScreen to NativeWind classes
m2 Ahmad     │ feat(mobile): convert RateCardScreen to NativeWind classes
m4 Imran     │ feat(mobile): convert CreateListingScreen to NativeWind classes
m4 Imran     │ feat(mobile): convert WalletScreen to NativeWind classes
m4 Imran     │ feat(mobile): convert QRScannerScreen to NativeWind classes
m3 Sharzil   │ refactor(mobile): clean up dead theme imports after NativeWind migration
m3 Sharzil   │ fix(mobile): address NativeWind migration verification findings
```

---

## Risk Mitigations

| Risk | Mitigation |
|:---|:---|
| NativeWind v4 + Expo SDK 57 incompatibility | Phase 1 smoke test is a hard gate — abort if it fails. Using v4 (stable) not v5 (preview). |
| Parallel workers creating merge conflicts | Workers touch completely separate files — no overlap |
| Custom colors not working | `tailwind.config.js` `theme.extend.colors` maps every `theme.ts` color — tested in Phase 1 |
| Shadow styles (`...shadows.card`) | Mapped as `shadow-card` in `tailwind.config.js` `boxShadow` extension. Android `elevation` may need inline style fallback. |
| `Ionicons color=` can't use className | Keep `theme.ts` alive for JS-prop color references |
| `Pressable pressed` state styling | Use `active:opacity-[0.72]` (arbitrary value syntax) — NOT `opacity-72` which doesn't exist in Tailwind v3 |
| Visual regressions | Phase 4 Check 5 — manual walk-through of every screen |
| Node.js version | SDK 57 requires **Node ≥ 22.13** — verify all 4 members' machines and CI before Phase 1 |
| Reanimated Android memory | Importing `react-native-reanimated` can inflate Android memory ~25-30% on RN 0.85+. Monitor in dev builds. |

---

## Forward-Looking Note

> [!WARNING]
> **Tailwind CSS v3 reaches end-of-life on February 28, 2027.**
> This migration uses v3 because NativeWind v5 (which supports Tailwind v4) is still in preview.
> Plan to re-evaluate NativeWind v5 once it hits stable release — it offers CSS-first config, no Babel plugin, and aligns with Tailwind v4's modern architecture.
