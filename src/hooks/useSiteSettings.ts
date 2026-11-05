import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings {
  id: string;
  restaurant_name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  opening_hours_weekday: string;
  opening_hours_weekend: string;
  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  delivery_charges: number;
  free_delivery_above: number;
  maintenance_mode: boolean;
  maintenance_message: string;
  logo_url: string | null;
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await (supabase as any).rpc("get_public_website_settings");
      if (!active) return;
      setSettings((data as unknown as SiteSettings) ?? null);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("website-settings-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "website_settings" },
        () => {
          (supabase as any).rpc("get_public_website_settings").then(({ data }: { data: SiteSettings | null }) => {
            if (active) setSettings(data);
          });
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { settings, loading };
}
