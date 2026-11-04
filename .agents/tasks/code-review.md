# Subscription & Feature Store Supabase Wire-up

This change wires the Pizza King module subscription system to a Supabase backend. Where previously module unlock state, pricing, and purchase orders all lived in localStorage, they now read from and write to `module_prices` and `module_orders` tables. Two new hooks (`useModulePrices`, `useModuleOrders`) handle all DB I/O; the UI pages (`SubscriptionsPage`, `FeatureStorePage`, `CheckoutPage`, `UnlockPage`, `TrackSubscriptionPage`) consume them. The route `/track-my-order` is new and public. The SQL file provides the table DDL, RLS policies, and seed data.

Watch for: (1) **RLS policies on both tables are fully open to anonymous users** — any unauthenticated request can read all orders and update any order status, including approving its own purchase. (2) **`approveOrder` does not call `unlockModule`** — approval updates Supabase but the module stays locked on the approving admin's device until they manually toggle it. (3) **Admin credentials are hardcoded in source** (`amenterprises1105@gmail.com` / `Ashu@1107`) — anyone who views source can log into the Subscriptions management page.

**Verdict**: NEEDS_CHANGES

---

## High-level view

The two Supabase hooks are structurally solid: `useModulePrices` initialises state from the `MODULE_PRICES` static fallback before the fetch completes, merges fallback keys for any DB gaps, and `updateModulePrice` uses `upsert` with `onConflict: 'module_key'` as required. `useModuleOrders` sets up a 30-second auto-refresh interval correctly. Both hooks handle the Supabase typing gap (`module_prices`/`module_orders` are not in the generated types file) by casting `.from("table" as any)` — consistent with the project's established pattern.

The RLS configuration is the most serious issue. Both tables carry fully open write policies (`USING (true) WITH CHECK (true)` for ALL operations). Because the admin page does not use Supabase Auth, there is no row-level identity to restrict on — but the current policies mean any anonymous actor can update any order's status field to "approved" via the Supabase REST API, bypassing the subscription management UI entirely.

The `handleApprove` function in `SubscriptionsPage` calls `unlockModule` unconditionally after the Supabase update, which is correct for localStorage-backed module state. However, `unlockModule` writes to that single browser's localStorage. When a real remote buyer's order is approved, the module does not unlock on their device — they have no mechanism to receive the unlock signal. This is a known architectural limitation of the localStorage-backed approach, but it means the "approve" action in the admin panel has no functional effect for the buyer.

The buyer-facing pages (`UnlockPage`, `CheckoutPage`) correctly insert to Supabase, display the `order_token` in the success state, and link to `/track-my-order`. `TrackSubscriptionPage` is public (no `AdminLayout`, no auth guard), supports both token and email search, masks the TRX ID to the last 4 characters, and shows status-appropriate messages.

`App.tsx` registers `/track-my-order` with `TrackSubscriptionPage` and wraps it in a `PageTransition`. The SQL file creates both tables with correct constraints and seeds all 20 locked modules.

Build evidence from `FEAT-002.json` confirms `npm run build` passed with exit code 0. The project has `strict: false`, `noImplicitAny: false`, and `noUnusedLocals: false` in `tsconfig.app.json`, so the `as any` table-name casts and unused `mod` variable in `ModuleCard` do not fail the build.

---

<details>
<summary>Issues (5)</summary>

1. **Fully open RLS write policies** — `module_prices` allows any anon user to upsert prices; `module_orders` allows any anon user to update any row's `status` field to "approved". Add a `secret` column or a DB function with a secret check, or use Supabase service-role key only on a server function, to restrict writes. At minimum, change the `module_orders` update policy to restrict `status` changes to known values and add an `hmac` or secret token field that the admin UI sends.

2. **Hardcoded admin credentials in source** — `ADMIN_EMAIL = "amenterprises1105@gmail.com"` and `ADMIN_PASSWORD = "Ashu@1107"` are plaintext constants in `SubscriptionsPage.tsx`. Anyone who can view the deployed bundle can extract them. Move to environment variables (`import.meta.env.VITE_SUB_ADMIN_EMAIL`) or use Supabase Auth for the subscription management login.

3. **`approveOrder` does not propagate unlock to the buyer's device** — `unlockModule` writes to the *admin's* localStorage. The buyer's module stays locked regardless of approval. The `/track-my-order` page shows "Access Granted!" for approved orders but the buyer's LockedRoute still blocks them. This needs either a Supabase-backed unlock check (query `module_orders` for approved orders on page load) or an email notification with an unlock code.

4. **`useMyOrders` query chain uses excessive `as unknown as ReturnType<typeof supabase.from>` casting** — the query is built by reassigning `query` with chained `.eq()` calls cast through `unknown` twice. This compiles but will silently break if the Supabase client's return type changes. Use a conditional filter approach (`if (orderToken) { ... } else { ... }`) that avoids the intermediate reassignment entirely.

5. **Screenshot data URLs stored in Supabase** — `screenshot_data_url` accepts base64 image data. A typical payment screenshot at even moderate resolution will be 200–500 KB as a data URL; Supabase Postgres rows have a 1 GB limit but replication and backup cost scales with row size. This should use Supabase Storage (upload the file, store the public URL) rather than inlining the base64 in the row. This is currently in `UnlockPage`, `CheckoutPage`, and the order insert path.

</details>

<details>
<summary>Details</summary>

### Fully open RLS on both tables

`module_prices_public_write` is `FOR ALL` with `USING (true) WITH CHECK (true)`. Any anonymous Supabase client can call `supabase.from('module_prices').upsert(...)` with any `module_key` and overwrite all prices. There is no signing secret, no Supabase Auth check, nothing.

`module_orders_public_update` is equally open. The review criteria asks whether this is a concern — it is confirmed: the Supabase REST API exposes these tables at `https://<project>.supabase.co/rest/v1/module_orders` with the anon key visible in the client bundle. Any request with `?id=eq.<uuid>` and `{"status":"approved"}` in the body succeeds. A buyer can approve their own order.

The intent (described in the plan) was to use the service role key for writes, but no service role usage was implemented. The plan notes "admin page uses custom session auth, not Supabase Auth" as justification for open policies, but that reasoning applies to reads, not writes.

### Credential exposure in source

```ts
const ADMIN_EMAIL = "amenterprises1105@gmail.com";
const ADMIN_PASSWORD = "Ashu@1107";
```

These are module-level constants in a TSX file that ships in the browser bundle. Vite does not strip them. The session check (`sessionStorage.getItem(AUTH_KEY) === "true"`) is also trivially bypassable — opening DevTools and running `sessionStorage.setItem("sub_auth", "true")` skips the login form entirely.

### Approve does not unlock for the buyer

```ts
const handleApprove = async (order: ModuleOrder) => {
  try {
    if (order.orderToken) {
      await approveOrder(order.id);          // updates Supabase
    }
    unlockModule(order.moduleKey);            // writes to THIS browser's localStorage
    refreshOrders();
  }
```

`unlockModule` is a `SubscriptionContext` action that calls `setUnlockedModules` and persists to `localStorage`. It affects only the device running this code — the admin's browser. The buyer's `LockedRoute` still reads from their own localStorage, which is empty. The TrackSubscriptionPage shows "Module Unlocked ✅ — Access is now active on your device" for approved orders regardless of the device's actual state, which is misleading.

### Data URL size in Supabase rows

`insertModuleOrder` stores the full base64 data URL in `screenshot_data_url`. The Supabase `screenshot_data_url text` column has no size limit. A 1 MB JPEG screenshot becomes ~1.37 MB of base64 text in the row. The `module_orders_public_read` policy returns this column on every `SELECT *` call in both `useModuleOrders` (admin) and `useMyOrders` (buyer). The admin page renders at most a 80px-tall thumbnail from this data, so the full multi-MB payload is fetched and decoded on every 30-second auto-refresh.

### `useMyOrders` query chain

```ts
query = (query as unknown as ReturnType<typeof supabase.from>).eq("order_token", orderToken) as typeof query;
// ...
const { data } = await (query as unknown as ReturnType<typeof supabase.from>).order("submitted_at", { ascending: false });
```

This works at runtime but the double `unknown` cast discards all type information. A refactor to:

```ts
const { data } = await supabase
  .from("module_orders" as any)
  .select("*")
  .eq(orderToken ? "order_token" : "buyer_email", orderToken || email)
  .order("submitted_at", { ascending: false });
```

would be cleaner and avoid the fragile reassignment. Severity is LOW — it compiles and runs correctly.

### SQL seed data count

The seed INSERT has exactly 20 rows covering all 20 locked module keys, matching `MODULE_PRICES` in `SubscriptionContext.tsx`. The `ON CONFLICT (module_key) DO NOTHING` clause makes the script idempotent. Confirmed.

### `/track-my-order` route registration

`App.tsx` line: `<Route path="/track-my-order" element={<PageTransition><TrackSubscriptionPage /></PageTransition>} />`. No `AdminLayout`, no `LockedRoute`, no auth guard. Confirmed public. Confirmed.

### Build status

`FEAT-002.json` findings field: "build passes (exit 0). Pre-existing build warnings (chunk size, push.ts dynamic import) are unchanged." TypeScript strict mode is off (`strict: false`, `noImplicitAny: false`), so the `as any` table-name casts are not build errors. The build is confirmed passing.

</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|---|---|
| `src/hooks/useModulePrices.ts` | New hook — fetches module prices from Supabase with static fallback; exports `updateModulePrice` upsert function |
| `src/hooks/useModuleOrders.ts` | New hook — fetches all orders (admin) and buyer orders by token/email; exports `approveOrder`, `rejectOrder`, `insertModuleOrder` |
| `src/pages/admin/SubscriptionsPage.tsx` | New page — subscription management with login gate, module catalog with inline price editing, pending orders tab with approve/reject |
| `src/pages/admin/FeatureStorePage.tsx` | New page — public-facing feature store with cart, plan toggle, Skeleton loading, checkout handoff |
| `src/pages/admin/CheckoutPage.tsx` | New page — multi-module checkout form with bank details, Supabase insert, order token display |
| `src/pages/UnlockPage.tsx` | Updated page — single-module purchase form with Supabase insert and order token display |
| `src/pages/TrackSubscriptionPage.tsx` | New page — public order tracking by token or email with masked TRX ID |
| `src/App.tsx` | Added imports and routes for `FeatureStorePage`, `CheckoutPage`, `TrackSubscriptionPage`; `/track-my-order` route added |
| `src/lib/supabase-setup.sql` | New SQL file — DDL for `module_prices` and `module_orders`, RLS policies, seed data for 20 modules |

Full diff: `git diff main` from repo root.

</details>
