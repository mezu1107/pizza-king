# Implementation Plan — Module Lock/Unlock Subscription System

## Project Context

- **Stack:** React 18 + TypeScript + Vite + react-router-dom v6 + shadcn/ui + lucide-react
- **Build command:** `npm run build`
- **Test command:** `npm run test` (vitest)
- **Context pattern:** `createContext` + `useContext` hook, Provider wrapping in `App.tsx`. See `src/contexts/CartContext.tsx` for the exact pattern to follow.
- **Admin layout:** `AdminLayout` (wraps with `SidebarProvider` + `AdminSidebar`). All locked admin pages already use `AdminLayout`.
- **Rider layout:** `RiderLayout` (component in `src/components/rider/RiderLayout.tsx`). All locked rider pages already use it.
- **localStorage key:** `pizza_king_modules`
- **No existing `.agents/tasks/` directory** — created as part of this plan.

---

## Implementation Plan

- [ ] 1. Create `src/contexts/SubscriptionContext.tsx`

  Define the full module registry (free + locked), read/write localStorage key `pizza_king_modules`, and expose `isModuleLocked`, `unlockModule`, `lockModule`, and `unlockedModules`.

  **Design decisions:**
  - The context stores a `Set<string>` of module keys that are explicitly **unlocked**. Free modules are never in locked state regardless of what is stored.
  - On first load, if localStorage is empty, defaults initialise every locked module as locked (i.e. the unlocked set is empty).
  - Module keys match the route paths (e.g. `/admin/deals`, `/rider/map`) so `LockedRoute` can look them up by `useLocation().pathname`.

  ```ts
  // Shape
  export interface ModuleDefinition {
    key: string;         // route path, e.g. "/admin/deals"
    name: string;        // display name, e.g. "Deals"
    group: "admin" | "rider";
    free: boolean;
  }

  interface SubscriptionContextType {
    modules: ModuleDefinition[];
    isModuleLocked: (key: string) => boolean;
    unlockModule: (key: string) => void;
    lockModule: (key: string) => void;
    unlockedModules: string[];
  }
  ```

  **Free admin modules:** `/admin`, `/admin/orders`, `/admin/menu`, `/admin/dine-in`
  **Free rider modules:** `/rider`, `/rider/orders`, `/rider/profile`
  **Free POS:** `/pos`

  **Locked admin modules:** `/admin/deals`, `/admin/categories`, `/admin/coupons`, `/admin/customers`, `/admin/riders`, `/admin/delivery-zones`, `/admin/reviews`, `/admin/settings`

  **Locked rider modules:** `/rider/map`, `/rider/earnings`, `/rider/wallet`, `/rider/history`, `/rider/schedule`, `/rider/notifications`, `/rider/chat`, `/rider/reviews`, `/rider/performance`, `/rider/documents`, `/rider/help`, `/rider/settings`

  **Files:** `src/contexts/SubscriptionContext.tsx`

  **Verify:** `npm run build` — no TypeScript errors.

---

- [ ] 2. Create `src/components/LockedRoute.tsx`

  A wrapper component that reads the current `location.pathname`, calls `isModuleLocked(pathname)` from `SubscriptionContext`, and if locked redirects to `/unlock?module=<pathname>&name=<display-name>`. If not locked, renders `children`.

  **Design decision:** Use `Navigate` from react-router-dom (consistent with how `AdminLayout` and `RiderLayout` already guard routes). Look up the module name from `modules` array in context so the URL carries a human-readable label.

  ```tsx
  // Usage in App.tsx will look like:
  <Route path="/admin/deals" element={
    <LockedRoute moduleKey="/admin/deals">
      <AdminDeals />
    </LockedRoute>
  } />
  ```

  **Files:** `src/components/LockedRoute.tsx`

  **Verify:** `npm run build` — no TypeScript errors.

---

- [ ] 3. Create `src/pages/UnlockPage.tsx`

  Route: `/unlock`. Reads `?module=` and `?name=` from `useSearchParams`. Displays:
  - Large `Lock` icon (lucide-react, `w-16 h-16 text-yellow-500`)
  - Heading: "Premium Feature — `{name}`"
  - Short description text
  - Two buttons: "← Go Back" (`useNavigate(-1)`) and "Manage Subscriptions" (links to `/admin/subscriptions`)
  - A "Buy All Modules" CTA button (can link to `#` for now, styled with `bg-gradient-to-r from-orange-500 to-red-600`)

  **Design decision:** This is a standalone full-page (no AdminLayout or RiderLayout wrapper) so it shows correctly when navigated from either admin or rider context. Uses shadcn `Card`, `Button` components already in the project.

  **Files:** `src/pages/UnlockPage.tsx`

  **Verify:** `npm run build` — no TypeScript errors.

---

- [ ] 4. Create `src/pages/admin/SubscriptionsPage.tsx`

  Route: `/admin/subscriptions`. Wrapped in `AdminLayout` (title="Subscriptions").

  UI layout:
  - Page heading with `Crown` icon (lucide-react)
  - Two sections: "Admin Modules" and "Rider Modules", each rendered as a grid of cards.
  - Each card shows: module name, route path (small text), lock/unlock `Switch` (shadcn `Switch` — already in the project at `src/components/ui/switch.tsx`), and an "Always Free" `Badge` (shadcn `Badge`) for free modules (switch disabled for free modules).
  - Footer "Buy All Modules" CTA button.

  **Design decision:** Reads `modules` list from `SubscriptionContext`, groups by `group` field, calls `lockModule`/`unlockModule` on toggle. Free modules render with the `Badge` and the `Switch` is disabled and checked.

  **Files:** `src/pages/admin/SubscriptionsPage.tsx`

  **Verify:** `npm run build` — no TypeScript errors.

---

- [ ] 5. Update `src/components/admin/AdminSidebar.tsx`

  Two changes:
  1. Import `useSubscription` from `SubscriptionContext`. Add `Lock` and `Crown` icons from lucide-react.
  2. For each item in `mainItems` and `managementItems` that is locked (call `isModuleLocked(item.url)`), render a small `<Lock className="ml-auto h-3 w-3 text-muted-foreground" />` at the end of the nav item (only when sidebar is not collapsed). The `NavLink` itself still navigates normally — `LockedRoute` will intercept at the route level.
  3. Add a new item at the bottom of the Management group:
     ```ts
     { title: "Subscriptions", url: "/admin/subscriptions", icon: Crown }
     ```
     This item is always unlocked (never locked).

  **Design decision:** Keep the nav item as a real link. Do not intercept clicks in the sidebar — the `LockedRoute` wrapper in App.tsx handles the redirect cleanly and avoids duplicating the lock logic.

  **Files:** `src/components/admin/AdminSidebar.tsx`

  **Verify:** `npm run build` — no TypeScript errors.

---

- [ ] 6. Update `src/components/rider/RiderLayout.tsx`

  Three changes:
  1. Import `useSubscription` from `SubscriptionContext`. Add `Lock` icon from lucide-react.
  2. In the **side nav** `riderNav.map(...)`, for locked items render a `<Lock className="w-3 h-3 ml-auto shrink-0" />` icon (visible only on `lg:` breakpoint alongside the label). The `Link` still navigates — `LockedRoute` intercepts.
  3. In the **mobile bottom nav** `riderNav.slice(0, 5).map(...)`, for locked items overlay a small lock icon badge on top of the nav icon.

  **Design decision:** Same pattern as AdminSidebar — visual indicator only in the nav, actual lock enforcement at the route level via `LockedRoute`.

  **Files:** `src/components/rider/RiderLayout.tsx`

  **Verify:** `npm run build` — no TypeScript errors.

---

- [ ] 7. Update `src/App.tsx`

  Four changes in order:

  1. **Import `SubscriptionProvider`** from `src/contexts/SubscriptionContext`.
  2. **Import `LockedRoute`** from `src/components/LockedRoute`.
  3. **Import new pages:** `UnlockPage` from `src/pages/UnlockPage` and `SubscriptionsPage` from `src/pages/admin/SubscriptionsPage`.
  4. **Wrap the provider tree**: Add `<SubscriptionProvider>` inside `<AuthProvider>` (after `<AuthProvider>`, before `<CartProvider>`) so that `SubscriptionContext` is available everywhere including inside `BrowserRouter`.

  5. **Wrap locked admin routes** with `<LockedRoute moduleKey="...">`:
     - `/admin/deals` → `<LockedRoute moduleKey="/admin/deals"><AdminDeals /></LockedRoute>`
     - `/admin/categories` → `<LockedRoute moduleKey="/admin/categories"><AdminCategories /></LockedRoute>`
     - `/admin/coupons` → `<LockedRoute moduleKey="/admin/coupons"><AdminCoupons /></LockedRoute>`
     - `/admin/customers` → `<LockedRoute moduleKey="/admin/customers"><AdminCustomers /></LockedRoute>`
     - `/admin/reviews` → `<LockedRoute moduleKey="/admin/reviews"><AdminReviews /></LockedRoute>`
     - `/admin/riders` → `<LockedRoute moduleKey="/admin/riders"><AdminRiders /></LockedRoute>`
     - `/admin/riders/:id` → `<LockedRoute moduleKey="/admin/riders"><AdminRiderManage /></LockedRoute>` (same key as parent)
     - `/admin/delivery-zones` → `<LockedRoute moduleKey="/admin/delivery-zones"><AdminDeliveryZones /></LockedRoute>`
     - `/admin/settings` → `<LockedRoute moduleKey="/admin/settings"><AdminSettings /></LockedRoute>`

  6. **Wrap locked rider routes** with `<LockedRoute moduleKey="...">`:
     - `/rider/map` → `<LockedRoute moduleKey="/rider/map"><RiderMap /></LockedRoute>`
     - `/rider/earnings` → `<LockedRoute moduleKey="/rider/earnings"><RiderEarnings /></LockedRoute>`
     - `/rider/wallet` → `<LockedRoute moduleKey="/rider/wallet"><RiderWallet /></LockedRoute>`
     - `/rider/history` → `<LockedRoute moduleKey="/rider/history"><RiderHistory /></LockedRoute>`
     - `/rider/schedule` → `<LockedRoute moduleKey="/rider/schedule"><RiderSchedule /></LockedRoute>`
     - `/rider/notifications` → `<LockedRoute moduleKey="/rider/notifications"><RiderNotifications /></LockedRoute>`
     - `/rider/chat` → `<LockedRoute moduleKey="/rider/chat"><RiderChat /></LockedRoute>`
     - `/rider/reviews` → `<LockedRoute moduleKey="/rider/reviews"><RiderReviews /></LockedRoute>`
     - `/rider/performance` → `<LockedRoute moduleKey="/rider/performance"><RiderPerformance /></LockedRoute>`
     - `/rider/documents` → `<LockedRoute moduleKey="/rider/documents"><RiderDocuments /></LockedRoute>`
     - `/rider/help` → `<LockedRoute moduleKey="/rider/help"><RiderHelp /></LockedRoute>`
     - `/rider/settings` → `<LockedRoute moduleKey="/rider/settings"><RiderSettings /></LockedRoute>`

  7. **Add new routes** (unprotected by LockedRoute):
     - `<Route path="/unlock" element={<UnlockPage />} />`
     - `<Route path="/admin/subscriptions" element={<SubscriptionsPage />} />`

  **Note on LockedRoute placement:** `LockedRoute` must be placed as the route `element`, wrapping the page component. It uses `useLocation` internally so it must be rendered inside `BrowserRouter` — the existing structure already ensures this since `BrowserRouter` wraps `AnimatedRoutes`.

  **Files:** `src/App.tsx`

  **Verify:** `npm run build` — full production build succeeds with zero TypeScript errors and zero Vite warnings about missing modules.

---

## Dependency Order Summary

```
1 (SubscriptionContext) → 2 (LockedRoute) → 3 (UnlockPage)
                       → 4 (SubscriptionsPage)
                       → 5 (AdminSidebar update)
                       → 6 (RiderLayout update)
                       → 7 (App.tsx — ties everything together, depends on 1-6)
```

Items 2, 3, 4, 5, 6 all depend on item 1 but are independent of each other. Item 7 depends on all prior items.

---

## Edge Cases & Assumptions

- **`/admin/riders/:id` locking:** Uses the same key `/admin/riders` as the list page. If riders are unlocked the detail page is also accessible. This is intentional.
- **SubscriptionProvider placement:** Placed inside `AuthProvider` but outside `BrowserRouter`. The context itself does not need router APIs; only `LockedRoute` does (which is inside `BrowserRouter`). This placement is consistent with the existing `CartProvider`/`WishlistProvider` pattern.
- **No test files:** The existing project has no test files (`npm run test` currently passes vacuously). No new test files are required per the task scope; the verification for each step is a successful `npm run build`.
- **Vercel deployment:** No config changes needed. The project is already a Vite SPA; Vercel detects Vite automatically. For SPA routing on Vercel (so `/unlock`, `/admin/subscriptions` etc. don't 404 on direct load), a `vercel.json` with a rewrite rule should be added if it doesn't exist. Check for this after implementing.
