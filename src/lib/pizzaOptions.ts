import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Admin-managed options live in public.pizza_options; the server re-prices every option at checkout.
export interface PizzaOption { key: string; label: string; price: number; sort?: number; active?: boolean }
export interface PizzaOptionGroups { crusts: PizzaOption[]; toppings: PizzaOption[]; dips: PizzaOption[]; all: PizzaOption[] }

export const groupOptions = (rows: PizzaOption[]): PizzaOptionGroups => {
  const sorted = [...rows].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  return {
    crusts: sorted.filter((o) => o.key.startsWith("crust:")),
    toppings: sorted.filter((o) => o.key.startsWith("top:")),
    dips: sorted.filter((o) => o.key.startsWith("dip:")),
    all: sorted,
  };
};

export const optionsTotal = (keys: string[], all: PizzaOption[]) =>
  keys.reduce((s, k) => s + Number(all.find((o) => o.key === k)?.price || 0), 0);

export const isPizza = (title: string, category?: string | null) => /pizza/i.test(`${title} ${category || ""}`);

export function usePizzaOptions() {
  const [groups, setGroups] = useState<PizzaOptionGroups>(groupOptions([]));
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    supabase.from("pizza_options").select("key,label,price,sort").eq("active", true).then(({ data }) => {
      if (!alive) return;
      setGroups(groupOptions(((data as PizzaOption[]) || []).map((o) => ({ ...o, price: Number(o.price) }))));
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);
  return { ...groups, loading };
}
