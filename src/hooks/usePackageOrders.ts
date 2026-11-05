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
      const base = supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("package_orders" as any)
        .select("*, package_order_status_history(*)");
      const filtered = orderToken
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (base as any).eq("order_token", orderToken)
        : // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (base as any).eq("buyer_email", email);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (filtered as any).order("created_at", {
        ascending: false,
      });

      if (!active) return;
      const rows = (data as unknown as PackageOrderRow[]) ?? [];
      setOrders(rows.map(mapOrder));
      setLoading(false);
    };

    load();
    return () => {
      active = false;
    };
  }, [email, orderToken, tick]);

  // Live updates: when the buyer's order changes (e.g. admin approves), re-run load.
  useEffect(() => {
    if (!email && !orderToken) return;
    const filter = orderToken
      ? `order_token=eq.${orderToken}`
      : `buyer_email=eq.${email}`;

    const channel = supabase
      .channel(`package_orders_${filter}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "package_orders", filter },
        () => setTick((t) => t + 1)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [email, orderToken]);

  return { orders, loading, refresh };
}

// ─── Standalone DB functions ──────────────────────────────────────────────────

// Admin RPC secret — read from env var (set on Vercel), fallback for local dev.
const ADMIN_RPC_SECRET =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_ADMIN_RPC_SECRET) ||
  "Ashu@1107";

export async function approvePackageOrder(
  orderId: string,
  remarks: string | null
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("update_package_order_status", {
    p_secret: ADMIN_RPC_SECRET,
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
    p_secret: ADMIN_RPC_SECRET,
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
  const directUpdatePayload: any = {
    updated_at: new Date().toISOString(),
  };
  if (fields.status !== undefined) directUpdatePayload.status = fields.status;
  if (fields.planKey !== undefined) directUpdatePayload.plan_key = fields.planKey;
  if (fields.packageName !== undefined) directUpdatePayload.package_name = fields.packageName;
  if (fields.category !== undefined) directUpdatePayload.category = fields.category;
  if (fields.customModules !== undefined) directUpdatePayload.custom_modules = fields.customModules;
  if (fields.billingType !== undefined) directUpdatePayload.billing_type = fields.billingType;
  if (fields.amount !== undefined) directUpdatePayload.amount = fields.amount;
  if (fields.buyerName !== undefined) directUpdatePayload.buyer_name = fields.buyerName;
  if (fields.buyerEmail !== undefined) directUpdatePayload.buyer_email = fields.buyerEmail.toLowerCase();
  if (fields.buyerPhone !== undefined) directUpdatePayload.buyer_phone = fields.buyerPhone;
  if (fields.txnId !== undefined) directUpdatePayload.txn_id = fields.txnId;
  if (fields.subscriptionStart !== undefined) directUpdatePayload.subscription_start = fields.subscriptionStart;
  if (fields.subscriptionEnd !== undefined) directUpdatePayload.subscription_end = fields.subscriptionEnd;
  if (fields.adminRemarks !== undefined) directUpdatePayload.admin_remarks = fields.adminRemarks;

  // Try RPC first
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).rpc("update_package_order", {
      p_secret: ADMIN_RPC_SECRET,
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
    if (!error) return;
  } catch {
    // Fall back to direct update
  }

  // Direct table update fallback
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: directErr } = await supabase
    .from("package_orders" as any)
    .update(directUpdatePayload)
    .eq("id", orderId);
  if (directErr) throw new Error(directErr.message);
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    plan_key: data.planKey,
    package_name: data.packageName,
    category: data.category,
    billing_type: data.billingType,
    amount: data.amount,
    buyer_name: data.buyerName,
    buyer_email: data.buyerEmail.trim().toLowerCase(),
    buyer_phone: data.buyerPhone,
    txn_id: "GRANT-" + Math.random().toString(36).substring(2, 9).toUpperCase(),
    status: data.status || "active",
    custom_modules: data.customModules || null,
    subscription_start: data.subscriptionStart || new Date().toISOString().split("T")[0],
    subscription_end:
      data.billingType === "one_time"
        ? null
        : data.subscriptionEnd || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    admin_remarks: data.adminRemarks || "Granted directly by admin",
  };

  const { data: inserted, error } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("package_orders" as any)
    .insert(payload)
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return (inserted as any).id;
}

export async function deletePackageOrder(orderId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("delete_package_order", {
    p_secret: ADMIN_RPC_SECRET,
    p_order_id: orderId,
  });
  if (error) throw new Error(error.message);
}

export async function insertPackageOrder(
  input: PackageOrderInsert
): Promise<{ orderToken: string } | null> {
  const { data: inserted, error } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("package_orders" as any)
    .insert({
      package_id: input.packageId,
      package_name: input.packageName,
      plan_key: input.planKey,
      category: input.category,
      billing_type: input.billingType,
      amount: input.amount,
      buyer_name: input.buyerName,
      buyer_email: input.buyerEmail,
      buyer_phone: input.buyerPhone,
      txn_id: input.txnId,
      screenshot_data_url: input.screenshotDataUrl,
      status: "pending",
    })
    .select("id, order_token");

  if (error || !inserted) return null;

  const rows = inserted as unknown as { id: string; order_token: string }[];
  const row = rows[0];
  if (!row) return null;

  // Seed the initial "Order placed" history row from the client. Allowed by the
  // public INSERT policy; subsequent rows come from the admin RPC.
  await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("package_order_status_history" as any)
    .insert({
      order_id: row.id,
      status: "pending",
      note: "Order placed",
      created_by: "buyer",
    });

  return { orderToken: row.order_token };
}
