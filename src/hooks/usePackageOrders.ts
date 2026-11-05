import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PackageOrderHistoryEntry {
  status: string;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface PackageOrder {
  id: string;
  orderToken: string;
  packageId: string | null;
  packageName: string;
  planKey: string;
  category: string;
  billingType: "monthly" | "one_time";
  amount: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  txnId: string;
  screenshotDataUrl: string | null;
  status: "pending" | "approved" | "rejected" | "active" | "expired" | "cancelled" | "blocked";
  adminRemarks: string | null;
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
  customModules?: string[] | null;
  createdAt: string;
  updatedAt: string;
  history: PackageOrderHistoryEntry[];
}

export type PackageOrderInsert = {
  packageId: string | null;
  packageName: string;
  planKey: string;
  category: string;
  billingType: "monthly" | "one_time";
  amount: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  txnId: string;
  screenshotDataUrl: string | null;
};

// Raw DB row shapes
interface PackageOrderHistoryRow {
  status: string;
  note: string | null;
  created_by: string | null;
  created_at: string | null;
}

interface PackageOrderRow {
  id: string;
  order_token: string;
  package_id: string | null;
  package_name: string;
  plan_key: string;
  category: string;
  billing_type: string;
  amount: number;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  txn_id: string;
  screenshot_data_url: string | null;
  status: string;
  admin_remarks: string | null;
  subscription_start: string | null;
  subscription_end: string | null;
  custom_modules?: string[] | null;
  created_at: string | null;
  updated_at: string | null;
  package_order_status_history: PackageOrderHistoryRow[] | null;
}

function mapHistory(rows: PackageOrderHistoryRow[] | null): PackageOrderHistoryEntry[] {
  return (rows ?? [])
    .slice()
    .sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return ta - tb;
    })
    .map((h) => ({
      status: h.status,
      note: h.note,
      createdBy: h.created_by,
      createdAt: h.created_at ?? "",
    }));
}

function mapOrder(row: PackageOrderRow): PackageOrder {
  return {
    id: row.id,
    orderToken: row.order_token,
    packageId: row.package_id,
    packageName: row.package_name,
    planKey: row.plan_key,
    category: row.category,
    billingType: row.billing_type as "monthly" | "one_time",
    amount: row.amount,
    buyerName: row.buyer_name,
    buyerEmail: row.buyer_email,
    buyerPhone: row.buyer_phone,
    txnId: row.txn_id,
    screenshotDataUrl: row.screenshot_data_url,
    status: row.status as PackageOrder["status"],
    adminRemarks: row.admin_remarks,
    subscriptionStart: row.subscription_start,
    subscriptionEnd: row.subscription_end,
    customModules: row.custom_modules ?? null,
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
    history: mapHistory(row.package_order_status_history),
  };
}

// ─── Admin hook: all orders ───────────────────────────────────────────────────

export function usePackageOrders(): {
  orders: PackageOrder[];
  loading: boolean;
  refresh: () => void;
} {
  const [orders, setOrders] = useState<PackageOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  // Auto-refresh every 30s so admins see new purchase requests without polling.
  useEffect(() => {
    intervalRef.current = setInterval(refresh, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const load = async () => {
      const { data } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("package_orders" as any)
        .select("*, package_order_status_history(*)")
        .order("created_at", { ascending: false });

      if (!active) return;
      const rows = (data as unknown as PackageOrderRow[]) ?? [];
      setOrders(rows.map(mapOrder));
      setLoading(false);
    };

    load();
    return () => {
      active = false;
    };
  }, [tick]);

  return { orders, loading, refresh };
}

// ─── Buyer hook: orders by email or token (with Realtime) ────────────────────

export function useMyPackageOrders(
  email: string,
  orderToken?: string
): { orders: PackageOrder[]; loading: boolean; refresh: () => void } {
  const [orders, setOrders] = useState<PackageOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!email && !orderToken) {
      setOrders([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    const load = async () => {
      let rows: PackageOrderRow[] = [];
      if (orderToken) {
        const { data } = await (supabase as any).rpc("get_package_order_by_token", { p_order_token: orderToken });
        const row = Array.isArray(data) ? data[0] : data;
        if (row) rows = [row as PackageOrderRow];
      } else {
        const { data } = await (supabase as any)
          .from("package_orders")
          .select("*, package_order_status_history(*)")
          .eq("buyer_email", email.trim().toLowerCase())
          .order("created_at", { ascending: false });
        rows = (data as PackageOrderRow[] | null) ?? [];
      }

      if (!active) return;
      setOrders(rows.map(mapOrder));
      setLoading(false);
    };

    load();
    return () => {
      active = false;
    };
  }, [email, orderToken, tick]);

  // Private token-based lookups poll rather than subscribing to all order changes.

  return { orders, loading, refresh };
}

// ─── Standalone DB functions ──────────────────────────────────────────────────

export async function approvePackageOrder(
  orderId: string,
  remarks: string | null
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("update_package_order_status", {
    p_secret: "",
    p_order_id: orderId,
    p_status: "approved",
    p_admin_remarks: remarks,
  });
  if (error) throw new Error(error.message);
}

export async function rejectPackageOrder(
  orderId: string,
  remarks: string | null
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("update_package_order_status", {
    p_secret: "",
    p_order_id: orderId,
    p_status: "rejected",
    p_admin_remarks: remarks,
  });
  if (error) throw new Error(error.message);
}

// ─── Full CRUD: edit and delete orders ────────────────────────────────────────

export async function updatePackageOrder(
  orderId: string,
  fields: {
    status?: string;
    planKey?: string;
    packageName?: string;
    category?: string;
    customModules?: string[] | null;
    billingType?: "monthly" | "one_time";
    amount?: number;
    buyerName?: string;
    buyerEmail?: string;
    buyerPhone?: string;
    txnId?: string;
    subscriptionStart?: string | null;
    subscriptionEnd?: string | null;
    adminRemarks?: string | null;
  }
): Promise<void> {
  const { error } = await (supabase as any).rpc("update_package_order", {
      p_secret: "",
      p_order_id: orderId,
      p_status: fields.status ?? null,
      p_billing_type: fields.billingType ?? null,
      p_amount: fields.amount ?? null,
      p_buyer_name: fields.buyerName ?? null,
      p_buyer_email: fields.buyerEmail ? fields.buyerEmail.toLowerCase() : null,
      p_buyer_phone: fields.buyerPhone ?? null,
      p_txn_id: fields.txnId ?? null,
      p_subscription_start: fields.subscriptionStart ?? null,
      p_subscription_end: fields.subscriptionEnd ?? null,
      p_admin_remarks: fields.adminRemarks ?? null,
      p_plan_key: fields.planKey ?? null,
      p_package_name: fields.packageName ?? null,
      p_custom_modules: fields.customModules ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function grantSubscription(data: {
  planKey: string;
  packageName: string;
  category: "admin" | "rider";
  billingType: "monthly" | "one_time";
  amount: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  status?: string;
  customModules?: string[];
  subscriptionStart?: string | null;
  subscriptionEnd?: string | null;
  adminRemarks?: string | null;
}): Promise<string> {
  const { data: inserted, error } = await (supabase as any).rpc("grant_package_order", {
    p_plan_key: data.planKey,
    p_package_name: data.packageName,
    p_category: data.category,
    p_billing_type: data.billingType,
    p_amount: data.amount,
    p_buyer_name: data.buyerName,
    p_buyer_email: data.buyerEmail.trim().toLowerCase(),
    p_buyer_phone: data.buyerPhone,
    p_status: data.status || "active",
    p_custom_modules: data.customModules || null,
    p_subscription_start: data.subscriptionStart || new Date().toISOString().split("T")[0],
    p_subscription_end: data.billingType === "one_time"
      ? null
      : data.subscriptionEnd || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    p_admin_remarks: data.adminRemarks || "Granted directly by admin",
  });
  if (error) throw new Error(error.message);
  return inserted as string;
}

export async function deletePackageOrder(orderId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("delete_package_order", {
    p_secret: "",
    p_order_id: orderId,
  });
  if (error) throw new Error(error.message);
}

export async function insertPackageOrder(
  input: PackageOrderInsert
): Promise<{ orderToken: string } | null> {
  const { data, error } = await (supabase as any).rpc("submit_package_order", {
    p_package_id: input.packageId,
    p_billing_type: input.billingType,
    p_buyer_name: input.buyerName,
    p_buyer_email: input.buyerEmail,
    p_buyer_phone: input.buyerPhone,
    p_txn_id: input.txnId,
    p_screenshot_data_url: input.screenshotDataUrl,
  });
  if (error || !data) return null;
  return { orderToken: data as string };
}
