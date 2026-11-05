import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const MODULE_PRICES: Record<string, { name: string; description: string; oneTime: number; monthly: number }> = {
  "/admin/deals": { name: "Deals Management", description: "Create and manage flash deals and promotions", oneTime: 2500, monthly: 999 },
  "/admin/categories": { name: "Categories", description: "Organize menu with custom categories", oneTime: 1500, monthly: 599 },
  "/admin/coupons": { name: "Coupons", description: "Generate and manage discount coupons", oneTime: 2000, monthly: 799 },
  "/admin/customers": { name: "Customers", description: "Full customer management and analytics", oneTime: 3000, monthly: 1199 },
  "/admin/riders": { name: "Riders Management", description: "Manage delivery riders and assignments", oneTime: 3500, monthly: 1399 },
  "/admin/delivery-zones": { name: "Delivery Zones", description: "Configure delivery areas and pricing", oneTime: 2000, monthly: 799 },
  "/admin/reviews": { name: "Reviews", description: "Monitor and respond to customer reviews", oneTime: 1500, monthly: 599 },
  "/admin/settings": { name: "Settings", description: "Full app configuration and customization", oneTime: 2500, monthly: 999 },
  "/rider/map": { name: "Live Map", description: "Real-time GPS tracking map for riders", oneTime: 2000, monthly: 799 },
  "/rider/earnings": { name: "Earnings", description: "Detailed earnings and payout tracking", oneTime: 1500, monthly: 599 },
  "/rider/wallet": { name: "Wallet", description: "Rider wallet and withdrawal management", oneTime: 1500, monthly: 599 },
  "/rider/history": { name: "History", description: "Full delivery history and records", oneTime: 1000, monthly: 399 },
  "/rider/schedule": { name: "Schedule", description: "Shift scheduling and availability", oneTime: 1500, monthly: 599 },
  "/rider/notifications": { name: "Notifications", description: "Push notifications for riders", oneTime: 1000, monthly: 399 },
  "/rider/chat": { name: "Chat Support", description: "In-app chat with support team", oneTime: 2000, monthly: 799 },
  "/rider/reviews": { name: "Reviews", description: "Customer ratings and feedback", oneTime: 1000, monthly: 399 },
  "/rider/performance": { name: "Performance", description: "Detailed performance analytics", oneTime: 1500, monthly: 599 },
  "/rider/documents": { name: "Documents", description: "Document upload and verification", oneTime: 1000, monthly: 399 },
  "/rider/help": { name: "Help Center", description: "Access to help docs and support", oneTime: 800, monthly: 299 },
  "/rider/settings": { name: "Settings", description: "Rider app settings and preferences", oneTime: 800, monthly: 299 },
};

export interface ModuleDefinition {
  key: string;
  name: string;
  group: "admin" | "rider";
  free: boolean;
}

export const MODULES: ModuleDefinition[] = [
  // Free admin modules
  { key: "/admin", name: "Dashboard", group: "admin", free: true },
  { key: "/admin/orders", name: "Orders", group: "admin", free: true },
  { key: "/admin/menu", name: "Menu Items", group: "admin", free: true },
  { key: "/admin/dine-in", name: "Dine In & QR", group: "admin", free: true },
  // Locked admin modules
  { key: "/admin/deals", name: "Deals", group: "admin", free: false },
  { key: "/admin/categories", name: "Categories", group: "admin", free: false },
  { key: "/admin/coupons", name: "Coupons", group: "admin", free: false },
  { key: "/admin/customers", name: "Customers", group: "admin", free: false },
  { key: "/admin/riders", name: "Riders", group: "admin", free: false },
  { key: "/admin/delivery-zones", name: "Delivery Zones", group: "admin", free: false },
  { key: "/admin/reviews", name: "Reviews", group: "admin", free: false },
  { key: "/admin/settings", name: "Settings", group: "admin", free: false },
  // Free rider modules
  { key: "/rider", name: "Dashboard", group: "rider", free: true },
  { key: "/rider/orders", name: "Active Orders", group: "rider", free: true },
  { key: "/rider/profile", name: "Profile", group: "rider", free: true },
  // Locked rider modules
  { key: "/rider/map", name: "Live Map", group: "rider", free: false },
  { key: "/rider/earnings", name: "Earnings", group: "rider", free: false },
  { key: "/rider/wallet", name: "Wallet", group: "rider", free: false },
  { key: "/rider/history", name: "History", group: "rider", free: false },
  { key: "/rider/schedule", name: "Schedule", group: "rider", free: false },
  { key: "/rider/notifications", name: "Notifications", group: "rider", free: false },
  { key: "/rider/chat", name: "Chat Support", group: "rider", free: false },
  { key: "/rider/reviews", name: "Reviews", group: "rider", free: false },
  { key: "/rider/performance", name: "Performance", group: "rider", free: false },
  { key: "/rider/documents", name: "Documents", group: "rider", free: false },
  { key: "/rider/help", name: "Help Center", group: "rider", free: false },
  { key: "/rider/settings", name: "Settings", group: "rider", free: false },
];

// Pricing & Plans — full expanded module list per plan_key.
export const PLAN_MODULES: Record<string, string[]> = {
  admin_starter: ["/admin/deals", "/admin/categories", "/admin/coupons"],
  admin_growth: [
    "/admin/deals",
    "/admin/categories",
    "/admin/coupons",
    "/admin/customers",
    "/admin/reviews",
    "/admin/delivery-zones",
  ],
  admin_enterprise: [
    "/admin/deals",
    "/admin/categories",
    "/admin/coupons",
    "/admin/customers",
    "/admin/reviews",
    "/admin/delivery-zones",
    "/admin/riders",
    "/admin/settings",
  ],
  rider_essential: ["/rider/map", "/rider/earnings", "/rider/history"],
  rider_professional: [
    "/rider/map",
    "/rider/earnings",
    "/rider/history",
    "/rider/wallet",
    "/rider/schedule",
    "/rider/notifications",
    "/rider/performance",
  ],
  rider_elite: [
    "/rider/map",
    "/rider/earnings",
    "/rider/history",
    "/rider/wallet",
    "/rider/schedule",
    "/rider/notifications",
    "/rider/performance",
    "/rider/chat",
    "/rider/reviews",
    "/rider/documents",
    "/rider/help",
    "/rider/settings",
  ],
};

export interface ActivePlan {
  planKey: string;
  category: "admin" | "rider";
  billingType: "monthly" | "one_time";
  packageName: string;
  orderId?: string;
  subscriptionStart?: string | null;
  subscriptionEnd?: string | null;
  customModules?: string[] | null;
}

const STORAGE_KEY = "pizza_king_modules";
const ACTIVE_PACKAGES_KEY = "pizza_king_active_packages";

interface SubscriptionContextType {
  modules: ModuleDefinition[];
  unlockedModules: string[];
  isModuleLocked: (key: string) => boolean;
  unlockModule: (key: string) => void;
  lockModule: (key: string) => void;
  // Pricing & Plans (package subscriptions)
  activePlans: ActivePlan[];
  unlockPackageModules: (planKey: string) => void;
  lockPackageModules: (planKey: string) => void;
  addActivePlan: (order: ActivePlan) => void;
  removeActivePlan: (planKey: string) => void;
  hasActivePlan: (category: "admin" | "rider") => boolean;
  refreshSubscription: () => Promise<void>;
  loading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // 1. Unlocked modules from localStorage as initial seed
  const [unlockedModules, setUnlockedModules] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unlockedModules));
  }, [unlockedModules]);

  // 2. Active plans
  const [activePlans, setActivePlans] = useState<ActivePlan[]>(() => {
    try {
      const stored = localStorage.getItem(ACTIVE_PACKAGES_KEY);
      return stored ? (JSON.parse(stored) as ActivePlan[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(ACTIVE_PACKAGES_KEY, JSON.stringify(activePlans));
  }, [activePlans]);

  const unlockModule = (key: string) => {
    setUnlockedModules((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  const lockModule = (key: string) => {
    setUnlockedModules((prev) => prev.filter((k) => k !== key));
  };

  const unlockPackageModules = (planKey: string) => {
    const modules = PLAN_MODULES[planKey];
    if (!modules) return;
    for (const key of modules) unlockModule(key);
  };

  const addActivePlan = (order: ActivePlan) => {
    setActivePlans((prev) =>
      prev.some((p) => p.planKey === order.planKey) ? prev : [...prev, order]
    );
    if (order.customModules && order.customModules.length > 0) {
      for (const m of order.customModules) unlockModule(m);
    } else {
      unlockPackageModules(order.planKey);
    }
  };

  const lockPackageModules = (planKey: string) => {
    const modules = PLAN_MODULES[planKey];
    if (!modules) return;
    for (const key of modules) lockModule(key);
  };

  const removeActivePlan = (planKey: string) => {
    setActivePlans((prev) => prev.filter((p) => p.planKey !== planKey));
    lockPackageModules(planKey);
  };

  // ── Database Sync: Automatically fetch subscriptions for the logged-in user/rider ──
  const syncFromDB = useCallback(async () => {
    const emailCandidate =
      user?.email ||
      localStorage.getItem("pizza_king_buyer_email") ||
      sessionStorage.getItem("buyer_email");

    if (!emailCandidate) {
      setLoading(false);
      return;
    }

    const cleanEmail = emailCandidate.trim().toLowerCase();

    try {
      // Query package_orders for any orders matching this buyer email
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase
        .from("package_orders" as any)
        .select(
          "id, plan_key, package_name, category, billing_type, status, subscription_start, subscription_end, custom_modules"
        )
        .ilike("buyer_email", cleanEmail)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = data as any[];
        const activeRows = rows.filter(
          (o) => o.status === "approved" || o.status === "active"
        );

        if (activeRows.length > 0) {
          const newUnlocked = new Set<string>();
          const newActivePlans: ActivePlan[] = [];

          for (const row of activeRows) {
            // If admin configured custom modules for this subscriber, grant those!
            const grantedMods: string[] =
              Array.isArray(row.custom_modules) && row.custom_modules.length > 0
                ? row.custom_modules
                : PLAN_MODULES[row.plan_key] || [];

            for (const m of grantedMods) {
              newUnlocked.add(m);
            }

            newActivePlans.push({
              planKey: row.plan_key,
              category: row.category,
              billingType: row.billing_type,
              packageName: row.package_name,
              orderId: row.id,
              subscriptionStart: row.subscription_start,
              subscriptionEnd: row.subscription_end,
              customModules: row.custom_modules ?? null,
            });
          }

          setUnlockedModules(Array.from(newUnlocked));
          setActivePlans(newActivePlans);
        } else {
          // If all orders for this user are explicitly blocked, cancelled, or rejected:
          const isExplicitlyRevoked = rows.some(
            (o) =>
              o.status === "cancelled" ||
              o.status === "blocked" ||
              o.status === "rejected" ||
              o.status === "expired"
          );

          if (isExplicitlyRevoked) {
            // Revoke their category modules
            const riderOrders = rows.filter((r) => r.category === "rider");
            if (riderOrders.length > 0) {
              // Lock all rider modules
              setUnlockedModules((prev) => prev.filter((k) => !k.startsWith("/rider")));
              setActivePlans((prev) => prev.filter((p) => p.category !== "rider"));
            }
          }
        }
      }
    } catch (err) {
      console.warn("Subscription DB sync error:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  // Sync on mount or when user changes
  useEffect(() => {
    syncFromDB();

    // Realtime Postgres changes on package_orders
    const channel = supabase
      .channel("package_orders_sub_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "package_orders" },
        () => {
          syncFromDB();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [syncFromDB]);

  const isModuleLocked = (key: string): boolean => {
    const mod = MODULES.find((m) => m.key === key);
    if (!mod) return false;
    if (mod.free) return false;
    return !unlockedModules.includes(key);
  };

  const hasActivePlan = (category: "admin" | "rider"): boolean =>
    activePlans.some((p) => p.category === category);

  return (
    <SubscriptionContext.Provider
      value={{
        modules: MODULES,
        unlockedModules,
        isModuleLocked,
        unlockModule,
        lockModule,
        activePlans,
        unlockPackageModules,
        lockPackageModules,
        addActivePlan,
        removeActivePlan,
        hasActivePlan,
        refreshSubscription: syncFromDB,
        loading,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error("useSubscription must be used within SubscriptionProvider");
  return context;
};
