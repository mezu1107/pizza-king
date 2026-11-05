import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MODULE_PRICES } from "@/contexts/SubscriptionContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ModulePrice {
  id: string;
  moduleKey: string;
  name: string;
  description: string;
  oneTime: number;
  monthly: number;
  updatedAt: string;
}

// Raw DB row shape
interface ModulePriceRow {
  id: string;
  module_key: string;
  module_name: string;
  description: string | null;
  one_time_price: number;
  monthly_price: number;
  updated_at: string | null;
}

function mapRow(row: ModulePriceRow): ModulePrice {
  return {
    id: row.id,
    moduleKey: row.module_key,
    name: row.module_name,
    description: row.description ?? "",
    oneTime: row.one_time_price,
    monthly: row.monthly_price,
    updatedAt: row.updated_at ?? "",
  };
}

/** Fallback: build a ModulePrice record from the static MODULE_PRICES constant. */
function buildFallback(): Record<string, ModulePrice> {
  const result: Record<string, ModulePrice> = {};
  for (const [key, val] of Object.entries(MODULE_PRICES)) {
    result[key] = {
      id: key,
      moduleKey: key,
      name: val.name,
      description: val.description,
      oneTime: val.oneTime,
      monthly: val.monthly,
      updatedAt: "",
    };
  }
  return result;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useModulePrices(): {
  prices: Record<string, ModulePrice>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [prices, setPrices] = useState<Record<string, ModulePrice>>(buildFallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const load = async () => {
      const { data, error: fetchError } = await (supabase as any).rpc("get_public_module_prices");

      if (!active) return;

      if (fetchError || !data || (data as unknown as ModulePriceRow[]).length === 0) {
        setError(fetchError?.message ?? null);
        setPrices(buildFallback());
      } else {
        const rows = data as unknown as ModulePriceRow[];
        const mapped: Record<string, ModulePrice> = {};
        for (const row of rows) {
          mapped[row.module_key] = mapRow(row);
        }
        // Merge fallback for any keys not yet in DB
        const fallback = buildFallback();
        for (const key of Object.keys(fallback)) {
          if (!mapped[key]) mapped[key] = fallback[key];
        }
        setPrices(mapped);
        setError(null);
      }
      setLoading(false);
    };

    load();
    return () => { active = false; };
  }, [tick]);

  return { prices, loading, error, refetch };
}

// ─── Standalone upsert function ───────────────────────────────────────────────

export async function updateModulePrice(
  moduleKey: string,
  oneTime: number,
  monthly: number,
  description: string
): Promise<void> {
  const fallbackName = MODULE_PRICES[moduleKey]?.name ?? moduleKey;
  const { error } = await (supabase as any).rpc("upsert_module_price", {
    p_secret: "",
    p_module_key: moduleKey,
    p_module_name: fallbackName,
    p_description: description,
    p_one_time_price: oneTime,
    p_monthly_price: monthly,
  });

  if (error) {
    throw new Error(error.message);
  }
}
