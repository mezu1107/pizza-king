import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RiderRewardSettings } from "@/lib/riderRewards";
export function useRiderRewards() {
  const [settings, setSettings] = useState<RiderRewardSettings | null>(null);
  useEffect(() => {
    const load = () => supabase.from("rider_settings").select("commission_percent,per_km_rate,points_per_order").limit(1).maybeSingle().then(({ data }) => setSettings(data));
    load();
    const timer = window.setInterval(load, 15000);
    return () => window.clearInterval(timer);
  }, []);
  return settings;
}