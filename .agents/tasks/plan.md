# Implementation Plan — Pizza King Subscription & Module Store (Supabase Wire-up)

## Key Facts Discovered During Exploration

**Supabase client:** `src/integrations/supabase/client.ts` — import as `import { supabase } from "@/integrations/supabase/client"`.

**Database typing gotcha:** `module_prices` and `module_orders` are NEW tables not yet in `src/integrations/supabase/types.ts`. The existing codebase handles this by casting the table name: `.from("table_name" as unknown as string)` and then asserting the result type — see the exact pattern in `useSiteSettings.ts` which uses `(data as unknown as SiteSettings)`. Use the same cast pattern for all new-table queries. Do NOT try to extend `Database` in types.ts — that would cause a merge conflict if types are ever regenerated.

**MODULE_PRICES and MODULES** are exported named constants from `src/contexts/SubscriptionContext.tsx`. Both are already imported in FeatureStorePage, CheckoutPage, UnlockPage, SubscriptionsPage.

**Build command:** `npm run build` (Vite + TypeScript, must exit 0).
**Test command:** `npm run test` (Vitest).

**No `any` types** — use `unknown` and explicit type assertions only.

---

## Step 1 — Create `src/lib/supabase-setup.sql`

Create the SQL file with DDL for both new tables, RLS policies, and seed data. This is reference-only (run manually in Supabase SQL editor); it does not affect the build.

**`module_prices` table** stores admin-editable prices for each module key. Columns: `id uuid PK`, `module_key text UNIQUE NOT NULL`, `name text NOT NULL`, `description text NOT NULL`, `one_time_price integer NOT NULL`, `monthly_price integer NOT NULL`, `updated_at timestamptz`.

**`module_orders` table** stores purchase orders from buyers. Columns: `id uuid PK`, `order_token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text`, `module_key text NOT NULL`, `module_name text NOT NULL`, `plan_type text NOT NULL CHECK (plan_type IN ('one-time','monthly'))`, `amount integer NOT NULL`, `buyer_name text NOT NULL`, `buyer_email text NOT NULL`, `buyer_phone text NOT NULL`, `txn_id text NOT NULL`, `screenshot_data_url text`, `status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected'))`, `submitted_at timestamptz DEFAULT now()`, `approved_at timestamptz`, `notes text`.

RLS: Both tables enable RLS. `module_prices`: public SELECT allowed; INSERT/UPDATE restricted to service role only (admin bypasses via service key if needed; for this app, updates go through the hook which runs client-side, so also allow authenticated users to UPDATE — see note in SQL). `module_orders`: public INSERT allowed (buyers submit without login); SELECT/UPDATE restricted to service role (admin page uses the session-authenticated subscription-page login, not Supabase auth, so the select must also allow anon read filtered by `order_token` or `buyer_email`).

Seed data: Insert one row per module key using the values from `MODULE_PRICES` constant (20 rows, all 20 locked module keys).

**Files:** `src/lib/supabase-setup.sql`
**Verify:** File exists. The SQL is valid PostgreSQL — confirm by pasting into Supabase SQL editor and running (no TypeScript check needed for this file).

---

## Step 2 — Create `src/hooks/useModulePrices.ts`

Define local TypeScript types. Export a `ModulePrice` interface:

```ts
export interface ModulePrice {
  id: string;
  moduleKey: string;      // maps to DB column module_key
  name: string;
  description: string;
  oneTime: number;        // maps to one_time_price
  monthly: number;        // maps to monthly_price
  updatedAt: string;
}
```

The hook `useModulePrices()`:
- Returns `{ prices: Record<string, ModulePrice>, loading: boolean, error: string | null }`.
- On mount, fetches all rows from `module_prices` with `supabase.from("module_prices" as unknown as "website_settings").select("*")` (the `as unknown as "website_settings"` cast is how the project bypasses the typed schema for unmapped tables — use whichever existing table name keeps TS happy, or just `as any`).
- Maps snake_case DB columns to camelCase interface fields.
- On fetch failure or empty result, falls back to `MODULE_PRICES` constant imported from `@/contexts/SubscriptionContext` — convert each `MODULE_PRICES[key]` entry into a `ModulePrice` object with `id: key, moduleKey: key, updatedAt: ''`.
- Returns the result as `Record<string, ModulePrice>` keyed by `moduleKey`.

Export `updateModulePrice(moduleKey: string, oneTime: number, monthly: number, description: string): Promise<void>`:
- Upserts into `module_prices` using `supabase.from(...).upsert({ module_key: moduleKey, one_time_price: oneTime, monthly_price: monthly, description, name: ..., updated_at: new Date().toISOString() }, { onConflict: 'module_key' })`.
- To get the `name` for an upsert, look up `MODULE_PRICES[moduleKey].name` as the fallback.

**Cast pattern for all `from()` calls on new tables:** `supabase.from("module_prices" as unknown as keyof Database["public"]["Tables"])` — or more simply just `(supabase as unknown as ReturnType<typeof createClient>).from("module_prices")`. The cleanest approach used elsewhere in this codebase (see `useSiteSettings.ts`) is: `supabase.from("website_settings" as any)` — use `as any` on the string argument only, not on the whole object. This is the established pattern; follow it.

**Files:** `src/hooks/useModulePrices.ts`
**Verify:** `npm run build` exits 0 (no TS errors in the new file).

---

## Step 3 — Create `src/hooks/useModuleOrders.ts`

Define and export the `ModuleOrder` interface:

```ts
export interface ModuleOrder {
  id: string;
  orderToken: string;
  moduleKey: string;
  moduleName: string;
  planType: "one-time" | "monthly";
  amount: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  txnId: string;
  screenshotDataUrl: string | null;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  approvedAt: string | null;
  notes: string | null;
}
```

Also export `ModuleOrderInsert` — same shape minus `id`, `orderToken`, `status`, `submittedAt`, `approvedAt`, `notes` (those are DB defaults).

Export hook `useModuleOrders()` (admin view — all orders):
- Returns `{ orders: ModuleOrder[], loading: boolean, refresh: () => void }`.
- Fetches all rows from `module_orders` ordered by `submitted_at desc`.
- Sets up a 30-second auto-refresh interval using `setInterval` (clear on unmount).
- Maps snake_case columns to camelCase using a helper mapper function `mapOrder(row: Record<string, unknown>): ModuleOrder`.

Export standalone async function `approveOrder(id: string, moduleKey: string): Promise<void>`:
- Updates `module_orders` row: `{ status: 'approved', approved_at: now }`.
- Does NOT touch localStorage or SubscriptionContext — unlocking is a separate local concern handled by the page component that calls `unlockModule()` after this resolves.

Export standalone async function `rejectOrder(id: string): Promise<void>`:
- Updates `module_orders` row: `{ status: 'rejected' }`.

Export hook `useMyOrders(email: string)`:
- Returns `{ orders: ModuleOrder[], loading: boolean }`.
- Fetches from `module_orders` where `buyer_email = email` OR optionally filters by `order_token`.
- Also accept an optional `orderToken` parameter: `useMyOrders(email: string, orderToken?: string)`.
- If `orderToken` is provided, filter by `order_token = orderToken`; else filter by `buyer_email = email`.

Export standalone async function `insertModuleOrder(data: ModuleOrderInsert): Promise<{ orderToken: string } | null>`:
- Inserts one row into `module_orders`.
- Returns `{ orderToken: row.order_token }` from the inserted row's `select()`.
- On error returns `null`.

**Files:** `src/hooks/useModuleOrders.ts`
**Verify:** `npm run build` exits 0.

---

## Step 4 — Update `src/pages/admin/SubscriptionsPage.tsx`

This is the most complex update. Keep the auth gate (LoginForm / session storage) and overall structure. Changes inside `SubscriptionDashboard`:

### Module Catalog tab changes:
- Import and call `useModulePrices()`. Show `<Skeleton className="h-6 w-32" />` while loading (import `Skeleton` from `@/components/ui/skeleton`).
- Replace every reference to `MODULE_PRICES[mod.key]` with `prices[mod.key] ?? MODULE_PRICES[mod.key]` (fallback ensures no undefined crash).
- Add an **inline Edit Price form** per module card (collapsed by default). A small "Edit Price" button (pencil icon) toggles a local `editingKey` state. When open, show two `Input` fields (one-time price, monthly price) and a textarea/Input for description pre-filled with current values, plus Save / Cancel buttons. On Save, call `updateModulePrice(...)` from `useModulePrices`, then close the form. Show a toast on success/error using `import { useToast } from "@/hooks/use-toast"`.
- The edit form is inline inside each `Card` — no modal needed.

### Pending Orders tab changes:
- Import `useModuleOrders`, `approveOrder`, `rejectOrder`.
- Replace `useState<PendingOrder[]>` initialized from localStorage with `const { orders, loading, refresh } = useModuleOrders()`.
- Remove `saveOrders()` and the `localStorage.setItem` calls.
- The `approveOrder` handler must: (1) call `approveOrder(order.id, order.moduleKey)` from the hook, (2) call `unlockModule(order.moduleKey)` from `useSubscription()`, (3) call `refresh()`.
- The `rejectOrder` handler: call `rejectOrder(orderId)`, then `refresh()`.
- Screenshot: if `order.screenshotDataUrl` is a data-url or a URL, show a thumbnail `<img>` (max 80px tall) + a link. If it starts with `data:` it's an embedded data URL — render an `<img src={order.screenshotDataUrl}>` thumbnail. Otherwise render a plain link.
- Pending count badge uses `orders.filter(o => o.status === 'pending').length`.
- Keep localStorage **as read-only fallback**: on mount, if the Supabase fetch returns 0 results, merge in any localStorage orders (read ORDERS_KEY, don't write back). This ensures continuity for orders submitted before the Supabase migration.

**Important:** Remove the `ORDERS_KEY` write path entirely from this page. Reads from localStorage are fine as migration fallback; writes go to Supabase only.

**Existing type `PendingOrder`** in this file can be replaced with an import of `ModuleOrder` from the new hook — they are the same shape. Remove the local interface definition.

**Files:** `src/pages/admin/SubscriptionsPage.tsx`
**Verify:** `npm run build` exits 0. Navigate to `/admin/subscriptions` in the browser and confirm the module catalog loads with prices, edit form opens/closes, and the Pending Orders tab renders (empty is fine without DB data).

---

## Step 5 — Update `src/pages/admin/FeatureStorePage.tsx`

- Import `useModulePrices` from `@/hooks/useModulePrices`.
- Import `Skeleton` from `@/components/ui/skeleton`.
- In `FeatureStorePage` (top-level component), call `const { prices, loading } = useModulePrices()`.
- Pass `prices` down to `ModuleCard` as a prop alongside `moduleKey`, `cart`, `onAddToCart`.
- In `ModuleCard`, change `const price = MODULE_PRICES[moduleKey]` to `const price = prices[moduleKey] ?? MODULE_PRICES[moduleKey]`. Update `ModuleCardProps` interface to include `prices: Record<string, ModulePrice>`.
- While `loading` is true and `prices` is empty, render Skeleton cards in place of `ModuleCard` grid: a `<div className="grid ...">` with 6 `<Skeleton className="h-64 rounded-xl" />` placeholders.
- Keep `MODULE_PRICES` imported as fallback (it's already imported).

**Files:** `src/pages/admin/FeatureStorePage.tsx`
**Verify:** `npm run build` exits 0.

---

## Step 6 — Update `src/pages/admin/CheckoutPage.tsx`

- Import `insertModuleOrder` from `@/hooks/useModuleOrders`.
- After building `newOrders` array in `handleSubmit`, for each order call `insertModuleOrder(...)` in parallel with `Promise.allSettled`. Collect the returned `orderToken`s.
- Keep the localStorage write as backup (existing code is fine to keep — it runs first, then Supabase runs).
- Add state `const [orderTokens, setOrderTokens] = useState<string[]>([])`.
- After Supabase inserts resolve, set `orderTokens` from successful results.
- In the **success state render**, show the order tokens if available:
  ```
  {orderTokens.length > 0 && (
    <div className="text-sm bg-muted rounded p-3 space-y-1">
      <p className="font-medium">Your Order Token(s):</p>
      {orderTokens.map(t => (
        <p key={t} className="font-mono text-xs">{t}</p>
      ))}
      <p className="text-xs text-muted-foreground">Save these to track your order status.</p>
    </div>
  )}
  ```
- Add a link to track order page:
  ```tsx
  <Button variant="link" className="text-orange-600" onClick={() => navigate("/track-my-order")}>
    Track My Order →
  </Button>
  ```

**Files:** `src/pages/admin/CheckoutPage.tsx`
**Verify:** `npm run build` exits 0.

---

## Step 7 — Update `src/pages/UnlockPage.tsx`

Same pattern as CheckoutPage but for single-module orders.

- Import `insertModuleOrder` from `@/hooks/useModuleOrders`.
- Add state `const [orderToken, setOrderToken] = useState<string | null>(null)`.
- In `handleSubmit`, after the localStorage write, call `await insertModuleOrder({ moduleKey, moduleName: displayName, planType: selectedPlan, amount, buyerName: ..., buyerEmail: ..., buyerPhone: ..., txnId: ..., screenshotDataUrl })`. On success, call `setOrderToken(result.orderToken)`.
- In the submitted success render, show `orderToken` if present:
  ```tsx
  {orderToken && (
    <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
      <p className="font-medium">Your Order Token:</p>
      <p className="font-mono text-xs break-all">{orderToken}</p>
      <p className="text-xs text-muted-foreground">Use this to track your order status.</p>
    </div>
  )}
  ```
- Add a "Track My Order" link button navigating to `/track-my-order`.

**Files:** `src/pages/UnlockPage.tsx`
**Verify:** `npm run build` exits 0.

---

## Step 8 — Create `src/pages/TrackSubscriptionPage.tsx`

New public page, no auth required. Route will be `/track-my-order`.

```tsx
// Imports: useState, useModuleOrders (useMyOrders), Card, CardContent, CardHeader, CardTitle,
//          Badge, Button, Input, Label, Skeleton from shadcn
```

State:
- `searchValue: string` — text field for order token or email.
- `searchType: "token" | "email"` — toggle.
- `searched: boolean` — true after first search attempt.

On "Search" button click, call `useMyOrders` — but since hooks can't be called conditionally, use this pattern: always call `useMyOrders(email, token)` with current search values, and only show results when `searched === true`.

Actually, to avoid calling the hook with empty strings on every keystroke, use a committed search: keep `submittedEmail` and `submittedToken` in state. User types, presses Search, then `submittedEmail/Token` update and the hook re-fetches.

```tsx
const [submittedEmail, setSubmittedEmail] = useState("");
const [submittedToken, setSubmittedToken] = useState("");
const { orders, loading } = useMyOrders(submittedEmail, submittedToken || undefined);
```

UI structure:
1. Page header: "Track My Order" with a search icon.
2. Search card: radio/toggle between "By Email" and "By Order Token", an Input, and a Search button.
3. Results area (only when `searched && !loading`):
   - If 0 orders: "No orders found." message.
   - If orders found: list of `Card` components, one per order, showing:
     - Module name + `moduleKey` as subtitle.
     - Plan type badge (outline).
     - Status badge: pending=yellow, approved=green, rejected=destructive (red).
     - Amount: `PKR {order.amount.toLocaleString()}`.
     - Submitted at: formatted date.
     - If approved: a green "Module Unlocked ✅" note.
     - WhatsApp link: `https://wa.me/923173712950` with pre-filled message including order token.
4. Loading state: show 2 `<Skeleton className="h-32 rounded-xl" />` cards.

Status badge helper:
```ts
function statusBadge(status: ModuleOrder["status"]) {
  if (status === "approved") return <Badge className="bg-green-100 text-green-700">Approved ✅</Badge>;
  if (status === "rejected") return <Badge variant="destructive">Rejected ❌</Badge>;
  return <Badge variant="outline" className="text-yellow-600 border-yellow-400">Pending ⏳</Badge>;
}
```

**Files:** `src/pages/TrackSubscriptionPage.tsx`
**Verify:** `npm run build` exits 0.

---

## Step 9 — Update `src/App.tsx`

Add import and route for `TrackSubscriptionPage`:

```tsx
import TrackSubscriptionPage from "./pages/TrackSubscriptionPage";
```

Add route inside `<Routes>` in `AnimatedRoutes`, after the existing `/unlock` route:

```tsx
<Route path="/track-my-order" element={<PageTransition><TrackSubscriptionPage /></PageTransition>} />
```

**Files:** `src/App.tsx`
**Verify:** `npm run build` exits 0 with no TS errors.

---

## Final Build Check

Run `npm run build` — must exit 0 with no TypeScript errors. This is the authoritative pass/fail check for the entire implementation.

If the build fails due to TypeScript strict-mode errors in the new Supabase query code, use the established project cast pattern: `.from("module_prices" as any)` and `data as unknown as ModuleOrder[]` rather than trying to extend the Database type.

---

## Gotchas & Notes

1. **Table name casting:** The project's `Database` type in `types.ts` only knows about existing tables. For `module_prices` and `module_orders`, cast the table name string with `as any` on the argument to `.from()`, then cast the result with `as unknown as YourType[]`. This is the exact pattern in `useSiteSettings.ts` — do not deviate.

2. **`module_orders.order_token`:** The SQL creates this as `DEFAULT gen_random_uuid()::text` on the DB side. After `insert(...).select('order_token').single()` you get the token back. The `insertModuleOrder` function must use `.select("order_token")` in the chain so the response includes it.

3. **30-second refresh in `useModuleOrders`:** Use `useRef` to store the interval id and clear it in the cleanup function of `useEffect`. Do not put `setInterval` inside a `useState` setter.

4. **SubscriptionsPage localStorage fallback:** Read `ORDERS_KEY` from localStorage on mount, filter to items not already in the Supabase list (compare by `txnId`), and merge them into the displayed list. Do not write to localStorage from this page anymore.

5. **`useMyOrders` with empty strings:** When both `email` and `orderToken` are empty strings, the hook should return `{ orders: [], loading: false }` immediately without hitting Supabase. Add a guard: `if (!email && !orderToken) { setOrders([]); setLoading(false); return; }`.

6. **Screenshot data URLs in SubscriptionsPage:** Data URLs can be very long (base64 images). Do not render them inline as `<img>` in the order list unless wrapped in a collapsed section — they can bloat the DOM. Show a thumbnail with `className="h-20 w-auto rounded object-cover cursor-pointer"` and wrap in an `<a>` that opens the full image in a new tab. If `screenshotDataUrl` starts with `http`, it's a storage URL — render a normal link.

7. **TypeScript: `planType` column:** The DB stores `plan_type` as `text`. When mapping back to the TypeScript interface, assert `row.plan_type as "one-time" | "monthly"` rather than leaving it as `string` — this avoids a strict-mode error.

8. **Import path for `Skeleton`:** `import { Skeleton } from "@/components/ui/skeleton"` — confirm the component exists at `src/components/ui/skeleton.tsx` before using it. If it does not exist, install it via shadcn CLI or create a minimal version: `export function Skeleton({ className }: { className?: string }) { return <div className={cn("animate-pulse rounded-md bg-muted", className)} /> }`.

9. **Route `/track-my-order` vs `/track-order`:** The existing app has `/track-order` (food order tracking, `TrackOrderPage`). The new route is `/track-my-order` (module purchase tracking). These are different pages — do not confuse them or overwrite the existing route.

10. **No push to Supabase auth for this flow:** The subscription management page uses its own session-storage-based login (`amenterprises1105@gmail.com / Ashu@1107`), NOT Supabase auth. The Supabase queries for `module_orders` admin actions (approve/reject) will run as the anon key. To make this work without requiring auth, the RLS policy on `module_orders` must allow anon UPDATE when `status` column changes — OR (simpler) the SQL can make `module_orders` fully public for now since it contains no sensitive data beyond buyer contact info. Document this in the SQL file.
