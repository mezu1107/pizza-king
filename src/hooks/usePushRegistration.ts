import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { requestPushToken, onForegroundMessage } from "@/lib/firebase";
import { toast } from "sonner";

/**
 * Registers the device's FCM token with the user's account.
 * Pass scope='admin' on admin pages, 'rider' on rider pages, default 'customer'.
 */
export function usePushRegistration(scope: "customer" | "admin" | "rider" = "customer") {
  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) return;

      const token = await requestPushToken();
      if (!token) return;

      // upsert token
      await (supabase as any)
        .from("push_tokens")
        .upsert(
          {
            user_id: user.id,
            token,
            scope,
            platform: "web",
            user_agent: navigator.userAgent,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "token" }
        );

      const off = await onForegroundMessage((payload) => {
        const title = payload?.notification?.title || payload?.data?.title || "Notification";
        const body = payload?.notification?.body || payload?.data?.body || "";
        toast(title, { description: body });
      });
      if (typeof off === "function") unsub = off;
    })();
    return () => {
      if (unsub) unsub();
    };
  }, [scope]);
}
