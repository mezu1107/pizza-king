import { supabase } from "@/integrations/supabase/client";

export interface PushPayload {
  user_ids?: string[];
  scope?: "customer" | "admin" | "rider" | "all";
  title: string;
  body: string;
  url?: string;
  data?: Record<string, string>;
}

export async function sendPush(payload: PushPayload) {
  try {
    const { data, error } = await supabase.functions.invoke("send-push", { body: payload });
    if (error) console.warn("[push] send error", error);
    return data;
  } catch (e) {
    console.warn("[push] invoke failed", e);
    return null;
  }
}
