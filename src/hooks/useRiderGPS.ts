import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
export function useRiderGPS(riderId?: string) {
  const [message, setMessage] = useState("GPS idle — no delivery in progress");
  useEffect(() => {
    if (!riderId) return;
    let watch: number | undefined;
    let orderId: string | undefined;
    let stopped = false;
    let busy = false;
    let lastSent = 0;
    const sync = async () => {
      const { data, error } = await supabase.from("orders").select("id").eq("rider_id", riderId).in("status", ["out_for_delivery", "out for delivery"]).order("assigned_at", { ascending: true, nullsFirst: false }).limit(1);
      if (stopped) return;
      if (error) { setMessage(error.message); return; }
      orderId = data?.[0]?.id;
      if (!orderId) {
        if (watch !== undefined) navigator.geolocation.clearWatch(watch);
        watch = undefined;
        setMessage("GPS idle — no delivery in progress");
        return;
      }
      if (!navigator.geolocation) { setMessage("GPS is not available on this device"); return; }
      if (watch !== undefined) return;
      setMessage("Waiting for GPS permission");
      watch = navigator.geolocation.watchPosition(async position => {
        if (!orderId || busy || Date.now() - lastSent < 5000) return;
        if (position.coords.accuracy > 50) { setMessage("Waiting for a more accurate GPS signal"); return; }
        busy = true;
        const { error } = await supabase.rpc("record_rider_gps", { _order_id: orderId, _lat: position.coords.latitude, _lng: position.coords.longitude, _accuracy: position.coords.accuracy });
        busy = false;
        lastSent = Date.now();
        if (!stopped) setMessage(error ? error.message : "GPS tracking active");
      }, error => setMessage(error.code === 1 ? "Allow location access in your browser settings" : "GPS signal unavailable"), { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
    };
    sync();
    const timer = window.setInterval(sync, 10000);
    return () => { stopped = true; window.clearInterval(timer); if (watch !== undefined) navigator.geolocation.clearWatch(watch); };
  }, [riderId]);
  return message;
}