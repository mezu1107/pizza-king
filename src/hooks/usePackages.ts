import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Package {
  id: string;
  planKey: string;
  name: string;
  category: "admin" | "rider";
  tier: number;
  description: string;
  monthlyPrice: number;
  oneTimePrice: number;
  isPopular: boolean;
  isEnabled: boolean;
  moduleKeys: string[];
  features: string[];
}

// Raw DB row shapes (PostgREST nests the relation joins)
interface PackageModuleRow {
  module_key: string;
}
interface PackageFeatureRow {
  feature_text: string;
  sort_order: number;
}
interface PackageRow {
  id: string;
  plan_key: string;
  name: string;
  category: string;
  tier: number;
  description: string | null;
  monthly_price: number;
  one_time_price: number;
  is_popular: boolean | null;
  is_enabled: boolean | null;
  package_modules: PackageModuleRow[] | null;
  package_features: PackageFeatureRow[] | null;
}

function mapPackage(row: PackageRow): Package {
  const features = (row.package_features ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((f) => f.feature_text);

  return {
    id: row.id,
    planKey: row.plan_key,
    name: row.name,
    category: row.category as "admin" | "rider",
    tier: row.tier,
    description: row.description ?? "",
    monthlyPrice: row.monthly_price,
    oneTimePrice: row.one_time_price,
    isPopular: !!row.is_popular,
    isEnabled: row.is_enabled !== false,
    moduleKeys: (row.package_modules ?? []).map((m) => m.module_key),
    features,
  };
}

// ─── Default packages (offline / empty-DB fallback) ───────────────────────────
// Mirrors the 6-plan seed in supabase-setup.sql. id reuses plan_key for the
// fallback so consumers can treat it as a stable identifier.

export const DEFAULT_PACKAGES: Package[] = [
  {
    id: "admin_starter",
    planKey: "admin_starter",
    name: "Admin Starter",
    category: "admin",
    tier: 1,
    description: "Essential tools to launch deals, categories and coupons.",
    monthlyPrice: 1999,
    oneTimePrice: 5000,
    isPopular: false,
    isEnabled: true,
    moduleKeys: ["/admin/deals", "/admin/categories", "/admin/coupons"],
    features: [
      "Create flash deals & promotions",
      "Custom menu categories",
      "Discount coupon management",
    ],
  },
  {
    id: "admin_growth",
    planKey: "admin_growth",
    name: "Admin Growth",
    category: "admin",
    tier: 2,
    description: "Grow faster with customers, reviews and delivery zones.",
    monthlyPrice: 3499,
    oneTimePrice: 9000,
    isPopular: true,
    isEnabled: true,
    moduleKeys: [
      "/admin/deals",
      "/admin/categories",
      "/admin/coupons",
      "/admin/customers",
      "/admin/reviews",
      "/admin/delivery-zones",
    ],
    features: [
      "Everything in Starter",
      "Customer management & analytics",
      "Reviews & reputation",
      "Delivery zone configuration",
    ],
  },
  {
    id: "admin_enterprise",
    planKey: "admin_enterprise",
    name: "Admin Enterprise",
    category: "admin",
    tier: 3,
    description: "Everything you need to run the full restaurant operation.",
    monthlyPrice: 4999,
    oneTimePrice: 13000,
    isPopular: false,
    isEnabled: true,
    moduleKeys: [
      "/admin/deals",
      "/admin/categories",
      "/admin/coupons",
      "/admin/customers",
      "/admin/reviews",
      "/admin/delivery-zones",
      "/admin/riders",
      "/admin/settings",
    ],
    features: [
      "Everything in Growth",
      "Rider management & assignments",
      "Full app settings & branding",
    ],
  },
  {
    id: "rider_essential",
    planKey: "rider_essential",
    name: "Rider Essential",
    category: "rider",
    tier: 1,
    description: "Core delivery tools: live map, earnings and history.",
    monthlyPrice: 999,
    oneTimePrice: 2500,
    isPopular: false,
    isEnabled: true,
    moduleKeys: ["/rider/map", "/rider/earnings", "/rider/history"],
    features: [
      "Live GPS tracking map",
      "Detailed earnings",
      "Complete delivery history",
    ],
  },
  {
    id: "rider_professional",
    planKey: "rider_professional",
    name: "Rider Professional",
    category: "rider",
    tier: 2,
    description: "Pro rider suite with wallet, schedule and analytics.",
    monthlyPrice: 1799,
    oneTimePrice: 4500,
    isPopular: true,
    isEnabled: true,
    moduleKeys: [
      "/rider/map",
      "/rider/earnings",
      "/rider/history",
      "/rider/wallet",
      "/rider/schedule",
      "/rider/notifications",
      "/rider/performance",
    ],
    features: [
      "Everything in Essential",
      "Digital rider wallet",
      "Shift scheduling",
      "Push notifications",
      "Performance analytics",
    ],
  },
  {
    id: "rider_elite",
    planKey: "rider_elite",
    name: "Rider Elite",
    category: "rider",
    tier: 3,
    description: "The complete rider experience with chat, docs and support.",
    monthlyPrice: 2499,
    oneTimePrice: 6500,
    isPopular: false,
    isEnabled: true,
    moduleKeys: [
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
    features: [
      "Everything in Professional",
      "In-app chat support",
      "Document upload & verification",
      "Help center",
      "Rider settings",
    ],
  },
];

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePackages(): {
  packages: Package[];
  loading: boolean;
  refetch: () => void;
} {
  const [packages, setPackages] = useState<Package[]>(DEFAULT_PACKAGES);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const load = async () => {
      const { data } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("subscription_packages" as any)
        .select("*, package_modules(module_key), package_features(feature_text, sort_order)")
        .eq("is_enabled", true)
        .order("category")
        .order("tier");

      if (!active) return;

      if (!data || (data as unknown as PackageRow[]).length === 0) {
        setPackages(DEFAULT_PACKAGES);
        setLoading(false);
        return;
      }

      const rows = data as unknown as PackageRow[];
      setPackages(rows.map(mapPackage));
      setLoading(false);
    };

    load();
    return () => {
      active = false;
    };
  }, [tick]);

  return { packages, loading, refetch };
}

// ─── Standalone admin write helpers ──────────────────────────────────────────

/** Create or update a plan by plan_key via the SECURITY DEFINER RPC. */
export async function upsertPackage(
  pkg: Partial<Package> & { planKey: string; name: string; category: "admin" | "rider"; tier: number }
): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("upsert_package", {
    p_secret: "",
    p_plan_key: pkg.planKey,
    p_name: pkg.name,
    p_category: pkg.category,
    p_tier: pkg.tier,
    p_description: pkg.description ?? null,
    p_monthly_price: pkg.monthlyPrice ?? 0,
    p_one_time_price: pkg.oneTimePrice ?? 0,
    p_is_popular: pkg.isPopular ?? false,
    p_is_enabled: pkg.isEnabled ?? true,
  });

  if (error) throw new Error(error.message);
  return (data as unknown as string | null) ?? null;
}

/** Soft-disable a plan via the SECURITY DEFINER RPC (keeps historical order refs). */
export async function deletePackage(planKey: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("disable_package", {
    p_secret: "",
    p_plan_key: planKey,
  });
  if (error) throw new Error(error.message);
}

/** Replace a plan's module set atomically via SECURITY DEFINER RPC. */
export async function setPackageModules(
  planKey: string,
  moduleKeys: string[]
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("set_package_modules", {
    p_secret: "",
    p_plan_key: planKey,
    p_module_keys: moduleKeys,
  });
  if (error) throw new Error(error.message);
}

/** Replace a plan's feature bullets atomically via SECURITY DEFINER RPC. */
export async function setPackageFeatures(
  planKey: string,
  features: string[]
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("set_package_features", {
    p_secret: "",
    p_plan_key: planKey,
    p_features: features,
  });
  if (error) throw new Error(error.message);
}
