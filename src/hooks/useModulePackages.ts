
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PackageGroup = "admin" | "rider";
export type PackageTier = "basic" | "medium" | "advanced";

export interface SubscriptionPackage {
  id: string;
  packageKey: string;
  name: string;
  description: string;
  groupType: PackageGroup;
  tier: PackageTier;
  oneTime: number;
  monthly: number;
  features: string[];
  moduleKeys: string[];
  isActive: boolean;
  updatedAt: string;
}

interface PackageRow {
  id: string;
  package_key: string;
  name: string;
  description: string | null;
  group_type: PackageGroup;
  tier: PackageTier;
  one_time_price: number;
  monthly_price: number;
  features: string[] | null;
  module_keys: string[] | null;
  is_active: boolean;
  updated_at: string | null;
}

// Default packages are used if Supabase is unavailable.
const DEFAULT_PACKAGES: SubscriptionPackage[] = [
  {
    id: "admin-launch",
    packageKey: "admin-launch",
    name: "Admin Launch",
    description: "Start smart. Run smooth.",
    groupType: "admin",
    tier: "basic",
    oneTime: 0,
    monthly: 0,
    features: [
      "Deals Management",
      "Categories Management",
    ],
    moduleKeys: [
      "/admin/deals",
      "/admin/categories",
    ],
    isActive: true,
    updatedAt: "",
  },
  {
    id: "admin-growth-pro",
    packageKey: "admin-growth-pro",
    name: "Admin Growth Pro",
    description: "Grow faster. Manage better.",
    groupType: "admin",
    tier: "medium",
    oneTime: 0,
    monthly: 0,
    features: [
      "Everything in Launch",
      "Coupons Management",
      "Customer Management",
      "Rider Management",
    ],
    moduleKeys: [
      "/admin/deals",
      "/admin/categories",
      "/admin/coupons",
      "/admin/customers",
      "/admin/riders",
    ],
    isActive: true,
    updatedAt: "",
  },
  {
    id: "admin-ultimate-360",
    packageKey: "admin-ultimate-360",
    name: "Admin Ultimate 360",
    description: "Your complete business command center.",
    groupType: "admin",
    tier: "advanced",
    oneTime: 0,
    monthly: 0,
    features: [
      "All Admin Modules",
      "Delivery Zone Management",
      "Reviews Management",
      "Advanced Settings",
    ],
    moduleKeys: [
      "/admin/deals",
      "/admin/categories",
      "/admin/coupons",
      "/admin/customers",
      "/admin/riders",
      "/admin/delivery-zones",
      "/admin/reviews",
      "/admin/settings",
    ],
    isActive: true,
    updatedAt: "",
  },
  {
    id: "rider-starter",
    packageKey: "rider-starter",
    name: "Rider Starter",
    description: "Get moving. Start earning.",
    groupType: "rider",
    tier: "basic",
    oneTime: 0,
    monthly: 0,
    features: [
      "Live GPS Map",
      "Delivery History",
      "Notifications",
    ],
    moduleKeys: [
      "/rider/map",
      "/rider/history",
      "/rider/notifications",
    ],
    isActive: true,
    updatedAt: "",
  },
  {
    id: "rider-performance-pro",
    packageKey: "rider-performance-pro",
    name: "Rider Performance Pro",
    description: "Deliver more. Earn smarter.",
    groupType: "rider",
    tier: "medium",
    oneTime: 0,
    monthly: 0,
    features: [
      "Everything in Starter",
      "Earnings Dashboard",
      "Wallet Management",
      "Shift Scheduling",
    ],
    moduleKeys: [
      "/rider/map",
      "/rider/history",
      "/rider/notifications",
      "/rider/earnings",
      "/rider/wallet",
      "/rider/schedule",
    ],
    isActive: true,
    updatedAt: "",
  },
  {
    id: "rider-elite-360",
    packageKey: "rider-elite-360",
    name: "Rider Elite 360",
    description: "Your complete rider command center.",
    groupType: "rider",
    tier: "advanced",
    oneTime: 0,
    monthly: 0,
    features: [
      "All Rider Modules",
      "Chat Support",
      "Performance Analytics",
      "Documents Management",
      "Help Center",
      "Advanced Settings",
    ],
    moduleKeys: [
      "/rider/map",
      "/rider/earnings",
      "/rider/wallet",
      "/rider/history",
      "/rider/schedule",
      "/rider/notifications",
      "/rider/chat",
      "/rider/reviews",
      "/rider/performance",
      "/rider/documents",
      "/rider/help",
      "/rider/settings",
    ],
    isActive: true,
    updatedAt: "",
  },
];

function mapPackage(row: PackageRow): SubscriptionPackage {
  return {
    id: row.id,
    packageKey: row.package_key,
    name: row.name,
    description: row.description ?? "",
    groupType: row.group_type,
    tier: row.tier,
    oneTime: Number(row.one_time_price ?? 0),
    monthly: Number(row.monthly_price ?? 0),
    features: Array.isArray(row.features) ? row.features : [],
    moduleKeys: Array.isArray(row.module_keys) ? row.module_keys : [],
    isActive: row.is_active,
    updatedAt: row.updated_at ?? "",
  };
}

export function useModulePackages() {
  const [packages, setPackages] =
    useState<SubscriptionPackage[]>(DEFAULT_PACKAGES);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => {
    setTick((current) => current + 1);
  }, []);

  useEffect(() => {
    let active = true;

    const loadPackages = async () => {
      setLoading(true);

      const { data, error: fetchError } = await supabase
        .from("subscription_packages" as any)
        .select("*")
        .eq("is_active", true)
        .order("group_type")
        .order("tier");

      if (!active) return;

      if (fetchError) {
        setError(fetchError.message);
        setPackages(DEFAULT_PACKAGES);
      } else if (data) {
        const rows = data as unknown as PackageRow[];
        const mapped = rows.map(mapPackage);

        setPackages(
          mapped.length > 0 ? mapped : DEFAULT_PACKAGES
        );

        setError(null);
      }

      setLoading(false);
    };

    loadPackages();

    return () => {
      active = false;
    };
  }, [tick]);

  const adminPackages = packages.filter(
    (item) => item.groupType === "admin" && item.isActive
  );

  const riderPackages = packages.filter(
    (item) => item.groupType === "rider" && item.isActive
  );

  return {
    packages,
    adminPackages,
    riderPackages,
    loading,
    error,
    refetch,
  };
}
