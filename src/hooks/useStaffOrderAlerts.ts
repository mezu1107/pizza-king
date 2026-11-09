import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { playNotificationSound } from "@/lib/sound";
import { toast } from "sonner";

export const SERVICE_LABELS: Record<string, string> = {
  call_waiter: "Waiter called",
  request_bill: "Bill requested",
  water_napkins: "Water / napkins requested",
};

/** Plays a sound + shows a system notification whenever a new order arrives (admin/POS screens). */
export function useStaffOrderAlerts(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const notify = (title: string, body: string, url: string) => {
      playNotificationSound();
      if ("vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
      toast(title, { description: body });
      if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
        navigator.serviceWorker?.getRegistration().then((reg) => {
          const opts: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
            body, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png",
            tag: `order-${Date.now()}`, requireInteraction: true, vibrate: [200, 100, 200], data: { url },
          };
          if (reg) reg.showNotification(title, opts);
          else new Notification(title, opts);
        });
      }
    };
    const channel = supabase
      .channel(`staff-alerts-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (p: any) => {
        const o = p.new || {};
        notify("🛒 New Order", `${o.customer_name || "Customer"} • Rs. ${Number(o.total || 0).toLocaleString()}`, "/admin/orders");
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dine_in_orders" }, (p: any) => {
        notify("🍽️ New Table Order", `Table ${p.new?.table_no ?? ""}`, "/admin/dine-in");
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "table_service_requests" }, (p: any) => {
        const r = p.new || {};
        const label = SERVICE_LABELS[r.request_type] || "Service request";
        notify(`🙋 ${label}`, `${r.table_name || `Table ${r.table_no ?? ""}`} needs attention`, "/admin/dine-in");
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [enabled]);
}
