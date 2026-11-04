import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

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

export type ModuleOrderInsert = {
  moduleKey: string;
  moduleName: string;
  planType: "one-time" | "monthly";
  amount: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  txnId: string;
  screenshotDataUrl: string | null;
};

// Raw DB row shape
interface ModuleOrderRow {
  id: string;
  order_token: string;
  module_key: string;
  module_name: string;
  plan_type: string;
  amount: number;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  txn_id: string;
  screenshot_data_url: string | null;
  screenshot_url: string | null;
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  notes: string | null;
}

function mapOrder(row: ModuleOrderRow): ModuleOrder {
  return {
    id: row.id,
    orderToken: row.order_token,
    moduleKey: row.module_key,
    moduleName: row.module_name,
    planType: row.plan_type as "one-time" | "monthly",
    amount: row.amount,
    buyerName: row.buyer_name,
    buyerEmail: row.buyer_email,
    buyerPhone: row.buyer_phone,
    txnId: row.txn_id,
    screenshotDataUrl: row.screenshot_data_url ?? row.screenshot_url ?? null,
    status: row.status as "pending" | "approved" | "rejected",
    submittedAt: row.submitted_at ?? "",
    approvedAt: row.approved_at ?? null,
    notes: row.notes ?? null,
  };
}

// ─── Admin hook: all orders ───────────────────────────────────────────────────

export function useModuleOrders(): {
  orders: ModuleOrder[];
  loading: boolean;
  refresh: () => void;
} {
  const [orders, setOrders] = useState<ModuleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

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
        .from("module_orders" as any)
        .select("*")
        .order("submitted_at", { ascending: false });

      if (!active) return;
      const rows = (data as unknown as ModuleOrderRow[]) ?? [];
      setOrders(rows.map(mapOrder));
      setLoading(false);
    };

    load();
    return () => { active = false; };
  }, [tick]);

  return { orders, loading, refresh };
}

// ─── Buyer hook: orders by email or token ─────────────────────────────────────

export function useMyOrders(
  email: string,
  orderToken?: string
): { orders: ModuleOrder[]; loading: boolean } {
  const [orders, setOrders] = useState<ModuleOrder[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email && !orderToken) {
      setOrders([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    const load = async () => {
      // Build query conditionally — avoids fragile intermediate reassignment casts
      const base = supabase.from("module_orders" as any).select("*");
      const filtered = orderToken
        ? (base as any).eq("order_token", orderToken)
        : (base as any).eq("buyer_email", email);
      const { data } = await (filtered as any).order("submitted_at", { ascending: false });

      if (!active) return;
      const rows = (data as unknown as ModuleOrderRow[]) ?? [];
      setOrders(rows.map(mapOrder));
      setLoading(false);
    };

    load();
    return () => { active = false; };
  }, [email, orderToken]);

  return { orders, loading };
}

// ─── Standalone DB functions ──────────────────────────────────────────────────

// Admin RPC secret — read from env var (set on Vercel), fallback for local dev
const ADMIN_RPC_SECRET =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_ADMIN_RPC_SECRET) ||
  "Ashu@1107";

export async function approveOrder(id: string): Promise<void> {
  const { error } = await (supabase as any).rpc("update_order_status", {
    p_secret: ADMIN_RPC_SECRET,
    p_order_id: id,
    p_status: "approved",
  });
  if (error) throw new Error(error.message);
}

export async function rejectOrder(id: string): Promise<void> {
  const { error } = await (supabase as any).rpc("update_order_status", {
    p_secret: ADMIN_RPC_SECRET,
    p_order_id: id,
    p_status: "rejected",
  });
  if (error) throw new Error(error.message);
}

export async function insertModuleOrder(
  data: ModuleOrderInsert
): Promise<{ orderToken: string } | null> {
  const { data: inserted, error } = await supabase
    .from("module_orders" as any)
    .insert({
      module_key: data.moduleKey,
      module_name: data.moduleName,
      plan_type: data.planType,
      amount: data.amount,
      buyer_name: data.buyerName,
      buyer_email: data.buyerEmail,
      buyer_phone: data.buyerPhone,
      txn_id: data.txnId,
      screenshot_data_url: data.screenshotDataUrl,
      status: "pending",
    })
    .select("order_token");

  if (error || !inserted) return null;

  const rows = inserted as unknown as { order_token: string }[];
  const token = rows[0]?.order_token;
  return token ? { orderToken: token } : null;
}
