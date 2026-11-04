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
  status: "pending" | "approved" | "rejected" | "active" | "expired" | "cancelled";
  adminRemarks: string | null;
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
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
