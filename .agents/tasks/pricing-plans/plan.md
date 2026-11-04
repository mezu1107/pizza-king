# Implementation Plan — Pricing & Plans Revamp (Pizza King)

Replace ~20 individual module purchases with a clean 6-plan package subscription system. A redesigned "Pricing and Plans" store (route stays `/feature-store`) and an owner admin panel (`/subscriptions`) with full CRUD over plans, prices, features, and modules. All purchases flow as `package_orders` with status history; the owner approves/rejects; approved plans unlock their included modules via the existing `LockedRoute`/`isModuleLocked` mechanism.

## Codebase findings that shape this plan

- **The build is currently RED (pre-existing, not caused by us).** `npm run build` (Vite/Rollup) fails because `src/pages/admin/SubscriptionsPage.tsx` imports `updateModulePrice` and `src/pages/admin/FeatureStorePage.tsx` imports `ModulePrice` from `src/hooks/useModulePrices.ts`, but that file was already refactored to a `subscription_plans`-based model and no longer exports those symbols. Both files are rewritten below (Stages 4 and 5), which clears the failure. Rollup fails on missing-export binding errors; SWC strips types so there is no separate type-check gate. **`npm run build` exiting 0 is the verification gate.**
- **Consumer map (verified by grep):** Only `SubscriptionsPage` and `FeatureStorePage` consume the broken `useModulePrices` old API. `LockedRoute`, `components/rider/RiderLayout.tsx`, and `AdminSidebar` only consume the stable context API (`isModuleLocked`, `modules`, `unlockModule`, `lockModule`) — preserved unchanged. `useModuleOrders`, `MODULE_PRICES`, `ADMIN_PLANS`/`RIDER_PLANS`, `activatePlan`/`deactivatePlan`/`getPlan`/`hasPlan`/`getAvailablePlans`/`activeAdminPlan`/`activeRiderPlan` have **no external consumers** beyond the pages being rewritten, so leaving them as harmless legacy code is safe (we are additive only).
- **Supabase patterns:** tables queried via `.from("table" as any)` (the generated `src/integrations/supabase/types.ts` does not list `module_prices`/`module_orders`/`subscription_plans`/`subscription_packages`, so all new tables use the same `as any` cast); RPCs called via `(supabase as any).rpc("name", {...})`; admin write RPCs are `SECURITY DEFINER` and validate `p_secret` against `current_setting('app.admin_rpc_secret', true)` (existing `upsert_module_price`/`update_order_status` pattern in `src/lib/supabase-setup.sql`).
- **Admin env-var auth (KEEP):** `SubscriptionsPage` currently hardcodes credentials; the spec wants env-var reads with fallbacks. Use `import.meta.env.VITE_SUB_ADMIN_EMAIL` (fallback `amenterprises1105@gmail.com`) and `import.meta.env.VITE_SUB_ADMIN_PASSWORD` (fallback `Ashu@1107`). Page is wrapped in `AdminLayout` (Firebase admin gate via `useAdminCheck`) PLUS its own env-var `LoginForm` — keep both.
- **RPC secret (frontend):** `import.meta.env.VITE_ADMIN_RPC_SECRET` (fallback `Ashu@1107`), sent as `p_secret` to the new RPCs.
- **Realtime pattern** (from `TrackOrderPage.tsx`/`useSiteSettings.ts`): `supabase.channel(name).on("postgres_changes", {event, schema:"public", table, filter}, cb).subscribe()` + cleanup `supabase.removeChannel(channel)`.
- **Existing localStorage keys:** `pizza_king_modules` (unlockedModules, used by `isModuleLocked`), `pizza_king_active_plans` (legacy `{admin,rider}` shape). New package active-plans use a **new** key `pizza_king_active_packages` (avoids corrupting the legacy `{admin,rider}` shape the existing `getPlan`/`activatePlan` path still reads — `isModuleLocked`'s secondary check depends on it). This is a deliberate, safe assumption noted where it's used.
- **Cart** uses `sessionStorage["feature_store_cart"]`; new shape is a single plan `{planKey, packageName, category, billingType, amount}`.
- **Bank details** (from existing `CheckoutPage.tsx`): Meezan Bank, AM Enterprises, 03173712950, IBAN `PK36MEZN0001080113741289`. WhatsApp `923173712950`.
- **Toast:** `import { useToast } from "@/hooks/use-toast"`. **shadcn UI components available:** Card/Badge/Button/Switch/Tabs/Input/Label/Textarea/Skeleton/Separator/Sheet/Dialog/Checkbox/Select/Table/ScrollArea/Accordion/AlertDialog/Popover all exist under `src/components/ui/`. **lucide-react** is a dependency.
- **Build/test commands:** `npm run build` (gate), `npm run dev`, `npm run lint`. No project test exercises these flows; verification is `npm run build` exit 0 plus manual route sanity.

## The 6 plans (authoritative)

| plan_key | category | tier | modules | monthly | one_time | popular |
|---|---|---|---|---|---|---|
| admin_starter | admin | 1 | /admin/deals, /admin/categories, /admin/coupons | 1999 | 5000 | no |
| admin_growth | admin | 2 | starter + /admin/customers, /admin/reviews, /admin/delivery-zones | 3499 | 9000 | yes |
| admin_enterprise | admin | 3 | growth + /admin/riders, /admin/settings | 4999 | 13000 | no |
| rider_essential | rider | 1 | /rider/map, /rider/earnings, /rider/history | 999 | 2500 | no |
| rider_professional | rider | 2 | essential + /rider/wallet, /rider/schedule, /rider/notifications, /rider/performance | 1799 | 4500 | yes |
| rider_elite | rider | 3 | professional + /rider/chat, /rider/reviews, /rider/documents, /rider/help, /rider/settings | 2499 | 6500 | no |

A higher tier includes all modules from lower tiers in its category (expanded lists stored in `package_modules`, not computed).

---

# Stage 1 — DB schema, RPCs, seed (src/lib/supabase-setup.sql)

- [ ] 1. **Append the new package schema to `src/lib/supabase-setup.sql`** (KEEP existing `module_prices`/`module_orders`/`upsert_module_price`/`update_order_status` — old orders reference them). Add:
  - `subscription_packages`: `id uuid pk default gen_random_uuid()`, `plan_key text unique not null`, `name text not null`, `category text not null check category in ('admin','rider')`, `tier int not null`, `description text`, `monthly_price int not null default 0`, `one_time_price int not null default 0`, `is_popular boolean default false`, `is_enabled boolean default true`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`.
  - `package_modules`: `id uuid pk default gen_random_uuid()`, `package_id uuid references subscription_packages(id) on delete cascade`, `module_key text not null`, `created_at timestamptz default now()`, `unique(package_id, module_key)`.
  - `package_features`: `id uuid pk default gen_random_uuid()`, `package_id uuid references subscription_packages(id) on delete cascade`, `feature_text text not null`, `sort_order int default 0`, `created_at timestamptz default now()`.
  - `package_orders`: `id uuid pk default gen_random_uuid()`, `package_id uuid references subscription_packages(id)`, `package_name text not null`, `plan_key text not null`, `category text not null`, `billing_type text not null check billing_type in ('monthly','one_time')`, `amount integer not null`, `buyer_name text not null`, `buyer_email text not null`, `buyer_phone text not null`, `txn_id text not null`, `screenshot_data_url text`, `status text not null default 'pending' check status in ('pending','approved','rejected','active','expired','cancelled')`, `admin_remarks text`, `subscription_start date`, `subscription_end date` (null for one_time), `order_token text unique not null default gen_random_uuid()::text`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`.
  - `package_order_status_history`: `id uuid pk default gen_random_uuid()`, `order_id uuid references package_orders(id) on delete cascade`, `status text not null`, `note text`, `created_by text`, `created_at timestamptz default now()`.
  - **RLS:** `subscription_packages`, `package_features`, `package_modules` → public SELECT only (writes via RPCs). `package_orders` → public INSERT (buyers submit), public SELECT (anyone can read by `order_token` or `buyer_email` — required for the public track page; match the existing `module_orders` public-read approach), UPDATE only via the `update_package_order_status` SECURITY DEFINER RPC. `package_order_status_history` → public SELECT, INSERT via RPC. Enable RLS on all five.
  - **RPC `upsert_package(p_secret text, p_plan_key text, p_name text, p_category text, p_tier int, p_description text, p_monthly_price int, p_one_time_price int, p_is_popular boolean, p_is_enabled boolean) RETURNS uuid`:** `SECURITY DEFINER`; validate `p_secret` against `current_setting('app.admin_rpc_secret', true)` (raise 'Unauthorized' on mismatch — same pattern as `upsert_module_price`); `INSERT ... ON CONFLICT (plan_key) DO UPDATE` returning `id`. `GRANT EXECUTE TO anon, authenticated`.
  - **RPC `update_package_order_status(p_secret text, p_order_id uuid, p_status text, p_admin_remarks text) RETURNS void`:** `SECURITY DEFINER`; validate secret; validate `p_status in ('approved','rejected','active','expired','cancelled')`; `UPDATE package_orders SET status=p_status, admin_remarks=p_admin_remarks, updated_at=now(), subscription_start = CASE WHEN p_status='approved' THEN current_date ELSE subscription_start END, subscription_end = CASE WHEN p_status='approved' AND billing_type='monthly' THEN current_date + interval '30 days' WHEN p_status='approved' AND billing_type='one_time' THEN NULL ELSE subscription_end END WHERE id=p_order_id`; then `INSERT INTO package_order_status_history (order_id, status, note, created_by) VALUES (p_order_id, p_status, p_admin_remarks, 'admin')`. `GRANT EXECUTE TO anon, authenticated`.
  - **Seed** 6 rows into `subscription_packages` with the table above (monthly/one_time/is_popular), then seed `package_modules` and `package_features` for each plan_key. Feature bullets (example, edit later via admin):
    - admin_starter: "Create flash deals & promotions", "Custom menu categories", "Discount coupon management"
    - admin_growth: "Everything in Starter", "Customer management & analytics", "Reviews & reputation", "Delivery zone configuration"
    - admin_enterprise: "Everything in Growth", "Rider management & assignments", "Full app settings & branding"
    - rider_essential: "Live GPS tracking map", "Detailed earnings", "Complete delivery history"
    - rider_professional: "Everything in Essential", "Digital rider wallet", "Shift scheduling", "Push notifications", "Performance analytics"
    - rider_elite: "Everything in Professional", "In-app chat support", "Document upload & verification", "Help center", "Rider settings"
  - File: `src/lib/supabase-setup.sql`
  - Verify: this is a SQL doc, not compiled. Confirm no syntax regressions by `npx tsc --noEmit` showing **no new** errors vs baseline (SQL is inert to the TS build). The gate is the final `npm run build`.

# Stage 2 — Hooks (new: usePackages, usePackageOrders)

- [ ] 2. **Create `src/hooks/usePackages.ts`** exporting `Package` interface `{ id, planKey, name, category: 'admin'|'rider', tier: number, description, monthlyPrice: number, oneTimePrice: number, isPopular: boolean, isEnabled: boolean, moduleKeys: string[], features: string[] }`. `usePackages()` fetches all enabled packages via `supabase.from("subscription_packages" as any).select("*, package_modules(module_key), package_features(feature_text, sort_order)")` joined/grouped into `Package[]` (group module_keys and feature_texts; sort features by sort_order); returns `{ packages, loading, refetch }`; on Supabase error/empty, falls back to hardcoded `DEFAULT_PACKAGES` matching the 6-plan table above. Also export standalone async helpers: `upsertPackage(pkg)` → `(supabase as any).rpc("upsert_package", {p_secret, p_plan_key, p_name, p_category, p_tier, p_description, p_monthly_price, p_one_time_price, p_is_popular, p_is_enabled})`; `deletePackage(id)` → set `is_enabled=false` (soft disable) via direct update `.from("subscription_packages" as any).update({is_enabled:false})` (and optionally hard delete for fully new plans); `setPackageModules(packageId, moduleKeys[])` → delete existing `package_modules` for that package_id and re-insert the new set; `setPackageFeatures(packageId, features[])` → delete existing `package_features` and re-insert with sort_order = index. `ADMIN_RPC_SECRET` from `import.meta.env.VITE_ADMIN_RPC_SECRET` fallback `"Ashu@1107"`.
  - File: `src/hooks/usePackages.ts`
  - Verify: `npm run build` — file compiles into the graph (no missing exports). Confirm `Package` import resolves from the new admin/store pages in later stages.

- [ ] 3. **Create `src/hooks/usePackageOrders.ts`** exporting `PackageOrder` interface `{ id, orderToken, packageId, packageName, planKey, category, billingType: 'monthly'|'one_time', amount, buyerName, buyerEmail, buyerPhone, txnId, screenshotDataUrl, status, adminRemarks, subscriptionStart: string|null, subscriptionEnd: string|null, createdAt, updatedAt, history: {status, note, createdBy, createdAt}[] }`. Hooks:
  - `usePackageOrders()` (admin): fetch ALL `package_orders` + `package_order_status_history(order_id, status, note, created_by, created_at)`, grouped; return `{ orders, loading, refresh }`; auto-refresh every 30s (interval + `refresh()` tick, mirroring `useModuleOrders`).
  - `useMyPackageOrders(email)` (buyer): query `package_orders` by `buyer_email` (and/or order_token) with history; attach a Supabase Realtime channel `postgres_changes` on `package_orders` filtered by `buyer_email=eq.<email>` (and a second handler for history inserts) that re-runs the load on change; cleanup via `supabase.removeChannel`. Return `{ orders, loading, refresh }`.
  - Standalone `approvePackageOrder(orderId, remarks, planKey)`: call `(supabase as any).rpc("update_package_order_status", {p_secret, p_order_id, p_status:"approved", p_admin_remarks: remarks})`. Standalone `rejectPackageOrder(orderId, remarks)`: same RPC with `p_status:"rejected"`. Standalone `insertPackageOrder(input)` → insert into `package_orders` (status `'pending'`, amount = server/fetched package price) and insert an initial `package_order_status_history` row status `'pending'` note `'Order placed'`; `.select("order_token")` to return the token.
  - `ADMIN_RPC_SECRET` as above.
  - File: `src/hooks/usePackageOrders.ts`
  - Verify: `npm run build` compiles. Realtime correctness is verified manually at Stage 7 (Track page).

# Stage 3 — SubscriptionContext additions (src/contexts/SubscriptionContext.tsx)

- [ ] 4. **Extend `src/contexts/SubscriptionContext.tsx`** — KEEP everything existing (`MODULES`, `isModuleLocked`, `unlockModule`, `lockModule`, `MODULE_PRICES`, `ADMIN_PLANS`, `RIDER_PLANS`, `activatePlan`/`deactivatePlan`/`getPlan`/`hasPlan`/`getAvailablePlans`/`activeAdminPlan`/`activeRiderPlan`, `useSubscription`). ADD:
  - `PLAN_MODULES: Record<string, string[]>` constant mapping the 6 plan_keys to their full expanded module-key lists (per the 6-plan table).
  - `ActivePlan` interface `{ planKey, category: 'admin'|'rider', billingType: 'monthly'|'one_time', packageName, orderId?, subscriptionStart?, subscriptionEnd? }`.
  - `unlockPackageModules(planKey: string)`: look up `PLAN_MODULES[planKey]` and call `unlockModule` for each.
  - `activePlans: ActivePlan[]` (new state, loaded from `localStorage["pizza_king_active_packages"]`).
  - `addActivePlan(order: ActivePlan)`: append to `activePlans`, persist to `pizza_king_active_packages`, and call `unlockPackageModules(order.planKey)`.
  - `hasActivePlan(category: 'admin'|'rider'): boolean` reading `activePlans`.
  - Extend `SubscriptionContextType` and the provider `value`/`useMemo` deps accordingly. Do not change `isModuleLocked` logic (it already checks `unlockedModules` first, then the legacy `getPlan` path).
  - Files: `src/contexts/SubscriptionContext.tsx`
  - Verify: `npm run build` — `LockedRoute`/`AdminSidebar`/`RiderLayout` still compile and behavior is unchanged for them (they only read preserved fields).

# Stage 4 — Owner admin panel (src/pages/admin/SubscriptionsPage.tsx)

- [ ] 5. **Rewrite `src/pages/admin/SubscriptionsPage.tsx`** (this clears the first build-breakage). Keep `LoginForm` env-var gate (read `import.meta.env.VITE_SUB_ADMIN_EMAIL`/`VITE_SUB_ADMIN_PASSWORD` with the fallbacks above; `sessionStorage["sub_auth"]`). Keep the `AdminLayout` wrapper and the `useToast` usage. Replace the dashboard with **3 tabs**:
  - **Tab 1 — Manage Plans:** `usePackages()`. Two sections ("Admin Plans", "Rider Plans") each showing up to 3 cards (and an "Add Plan" button per section). Each card: name, tier badge, description (textarea/edit), monthly price input, one-time price input, Popular toggle, Enabled toggle, "Edit features" (Dialog: ordered list add/remove/edit bullets → `setPackageFeatures`), "Edit modules" (Dialog: checkbox list of all module keys for that category → `setPackageModules`), Save → `upsertPackage` + `setPackageModules` + `setPackageFeatures` then `refetch`. Loading skeletons, empty states.
  - **Tab 2 — Purchase Requests:** `usePackageOrders()`. Table/cards of all `package_orders`: package name, category badge, buyer name/email/phone, billing type, amount, TRX ID, screenshot thumbnail (click opens data URL), status badge, submitted date. Search (name/email/order token), filter by status + category. Auto-refresh 30s (built into the hook). For pending rows: Approve (green) + Reject (red) + remarks input. Approve → `approvePackageOrder` then `addActivePlan`/`unlockPackageModules` (from context) → refresh. Reject → `rejectPackageOrder`. Inline status-history timeline under each order.
  - **Tab 3 — Purchase History:** full table of ALL `package_orders` sortable by date: order token, package name, buyer, billing type, amount, status, subscription_start, subscription_end, created_at, updated_at. Active → "Running" badge with expiry (or "Lifetime" for one_time); expired → "Expired" badge. Filter + search. Optional CSV export (build a CSV string and download via Blob).
  - Files: `src/pages/admin/SubscriptionsPage.tsx`
  - Verify: `npm run build` — `SubscriptionsPage` no longer imports `updateModulePrice`/`ModulePrice`; this half of the build-breakage is cleared. (Build stays red until Stage 5 also lands, because `FeatureStorePage` still imports the missing `ModulePrice`.)

# Stage 5 — Pricing & Plans store + sidebar (FeatureStorePage, AdminSidebar)

- [ ] 6. **Rewrite `src/pages/admin/FeatureStorePage.tsx`** (clears the second build-breakage). Title "Pricing and Plans" (route stays `/feature-store`). `usePackages()` for the 6 plans. Two sections "Restaurant Admin" and "Delivery Rider", each 3 plan cards. Global sticky billing toggle (Monthly / One-time) controlling all cards (`Switch` or `Tabs`). Each card: name + tier badge ("Most Popular" if `isPopular`), description, price section reflecting the toggle (`monthlyPrice`/mo or `oneTimePrice`), feature bullets from `package_features` with green checkmark icons, "Includes N modules" count. Use context `hasActivePlan(category)` + `activePlans`: if the user already has an active plan in this category, show "Current Plan" badge and "Upgrade" (if a higher tier exists) instead of "Buy". "Buy Now" writes a single-plan cart to `sessionStorage["feature_store_cart"] = {planKey, packageName, category, billingType, amount}` (amount taken from the fetched package price, never client-fabricated) then `navigate("/checkout")`. Disable Buy if the plan is already in cart or active. Responsive 3-up desktop / stacked mobile; rounded cards, gradient accents, hover scale. Loading skeletons, empty state.
  - File: `src/pages/admin/FeatureStorePage.tsx`
  - Verify: `npm run build` exits **0** (both build-breaking files now rewritten; the only missing-export importers are gone). This is the stage where the build flips GREEN.

- [ ] 7. **Rename the sidebar label** in `src/components/admin/AdminSidebar.tsx`: change `managementItems` entry `{ title: "Feature Store", url: "/feature-store", icon: ShoppingBag }` to `title: "Pricing & Plans"` (URL unchanged). Keep the `isModuleLocked` lock indicator logic.
  - File: `src/components/admin/AdminSidebar.tsx`
  - Verify: `npm run build` still exits 0; nav shows "Pricing & Plans".

# Stage 6 — Checkout (src/pages/admin/CheckoutPage.tsx)

- [ ] 8. **Rewrite `src/pages/admin/CheckoutPage.tsx`** to be package-based. Read cart from `sessionStorage["feature_store_cart"]` = single `{planKey, packageName, category, billingType, amount}`; if empty → `navigate("/feature-store", {replace:true})`. Layout: order summary (left) + payment form (right). Summary: package name, category, billing type, price, and the included module list (resolve via `usePackages()` → match `planKey` → `moduleKeys`, map to readable names via `MODULES`). Form: name, email, phone, TRX ID, screenshot upload (FileReader → data URL), plus the existing bank-details box. On submit: validate all required fields; **never trust client prices** — re-fetch the package via `usePackages()` and use its `monthlyPrice`/`oneTimePrice` for the `amount` (ignore the cart's amount field for the DB insert); `insertPackageOrder({...})` (status pending + initial history row) from Stage 2 → get `order_token`; save a `localStorage` backup; show success with the `order_token` + "Track at /track-my-order"; after 2.5s open WhatsApp to `923173712950` with package name, billing type, amount, buyer, TRX ID. **Warn** (inline, do not hard-block) if a `package_orders` row for the same `plan_key` + `buyer_email` already has status pending/active (best-effort query via `usePackageOrders`/`useMyPackageOrders`). Remove `insertModuleOrder` import (no longer used).
  - File: `src/pages/admin/CheckoutPage.tsx`
  - Verify: `npm run build` exits 0.

# Stage 7 — Track (src/pages/TrackSubscriptionPage.tsx)

- [ ] 9. **Rewrite `src/pages/TrackSubscriptionPage.tsx`** (public, no auth). Search by **order_token OR email** (tabs). Query `package_orders` (+ `package_order_status_history`). Results card: order token, package name, category badge, billing type, amount, TRX ID, submitted date, status badge (pending yellow, approved/active green, rejected red, expired gray), admin remarks in a highlighted box, subscription start/end (or "Lifetime access" for one_time), last updated. Visual vertical **timeline** with stages: 1 Order Placed, 2 Payment Submitted, 3 Payment Under Verification, 4 Payment Approved, 5 Package Activation in Progress, 6 Package Activated; plus Rejected/Cancelled/Activation Failed as terminal states; each stage icon = check (done) / spinner (current) / gray (upcoming) + label + timestamp; derive stage from the status-history rows. **Supabase Realtime** subscribe to `package_orders` updates for the matching order/email so the timeline updates live when admin approves; also a Refresh button fallback. WhatsApp support link `https://wa.me/923173712950` for rejected/expired. Empty state if no orders. Use `useMyPackageOrders` from Stage 2 (or a local query); keep `supabase.removeChannel` cleanup.
  - File: `src/pages/TrackSubscriptionPage.tsx`
  - Verify: `npm run build` exits 0.

# Stage 8 — Unlock (src/pages/UnlockPage.tsx)

- [ ] 10. **Rewrite `src/pages/UnlockPage.tsx`** to redirect buyers to the plan store (no per-module checkout). Show "This feature is part of our premium plans. Choose a plan to unlock it." plus a "View Plans & Pricing" button → `navigate("/feature-store")`. Remove `MODULE_PRICES`/`insertModuleOrder` imports and the old per-module form. Keep reading `?module=`/`?name=` from search params to display the feature name.
  - File: `src/pages/UnlockPage.tsx`
  - Verify: `npm run build` exits 0.

# Stage 9 — Routes & imports (src/App.tsx)

- [ ] 11. **Verify routes resolve** in `src/App.tsx`: `/feature-store`, `/checkout`, `/track-my-order`, `/subscriptions`, `/unlock` already exist and import `FeatureStorePage`/`CheckoutPage`/`TrackSubscriptionPage`/`SubscriptionsPage`/`UnlockPage` by their default exports. After the rewrites these imports still resolve (same default-exported components). No route changes needed; the sidebar label rename (Stage 5) changes the label only, not the URL. If any import path changed, fix it.
  - File: `src/App.tsx`
  - Verify: `npm run build` exits 0; the dev server (`npm run dev`) serves `/feature-store`, `/checkout`, `/track-my-order`, `/subscriptions`, `/unlock` without console errors.

# Stage 10 — Final build & verify

- [ ] 12. **Run `npm run build`** end to end and confirm exit 0 with zero build errors. Then `npm run lint` and fix any new lint errors introduced by the new files. Manually sanity-check: locked module route redirects to `/unlock` → "View Plans & Pricing" → `/feature-store` → Buy → `/checkout` → success → `/track-my-order`. Admin `/subscriptions` env-var login → 3 tabs (Manage Plans / Purchase Requests / Purchase History). Verify free routes (Dashboard, Orders, Menu, Dine-in, Rider Dashboard/Orders/Profile) remain free and unwrapped by `LockedRoute`.
  - Verify: `npm run build` exits 0; `npm run lint` clean for changed files.

## Constraints honored
- Free module routes (Dashboard, Orders, Menu, Dine-in, Rider Dashboard/Orders/Profile) stay free and unwrapped by `LockedRoute` — unchanged in `App.tsx`.
- `SubscriptionsPage` env-var login kept (now reads env vars with fallbacks).
- `LockedRoute` keeps working: on approval, `unlockPackageModules(planKey)` → `unlockModule` per included module → `isModuleLocked` sees them unlocked.
- TypeScript interfaces for all data shapes; `as any` casts on table names/RPCs matching existing style; `strictNullChecks` is off in tsconfig.
- shadcn/ui + lucide-react only; functional components; Tailwind; orange primary; loading/error/empty states; responsive mobile-first; form validation on checkout; duplicate-order warning (not hard-block); never trust client prices.
- `useModuleOrders.ts` and `module_prices`/`module_orders` tables kept for old orders; `useModulePackages.ts`/`useModulePrices.ts` left as harmless legacy (no external consumers after rewrites).

## Gaps closed by assumption (noted, not stalled)
- Used a **new** localStorage key `pizza_king_active_packages` for package active-plans instead of reusing `pizza_king_active_plans` (the legacy key stores an incompatible `{admin,rider}` shape still read by the existing `getPlan`/`isModuleLocked` secondary path; reusing it would corrupt that state).
- `package_orders` public SELECT is permissive (anyone can read by token/email) to support the public track page — matches the existing `module_orders` public-read policy; the secret-gated RPC is the only write path.
