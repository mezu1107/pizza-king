import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  checkZone,
  DeliveryArea,
  DeliverySettings,
  ZoneCheckResult,
  getCachedDeliverySettings,
  saveCachedDeliverySettings,
  getCachedDeliveryAreas,
  saveCachedDeliveryAreas,
  DEFAULT_DELIVERY_SETTINGS,
} from "@/lib/delivery";
import MapPicker from "./MapPicker";
import { Button } from "./ui/button";
import { Crosshair, MapPin, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onResult: (result: ZoneCheckResult, coords: { lat: number; lng: number } | null) => void;
}

const DeliveryZoneCheck = ({ onResult }: Props) => {
  // Always initialize from cache or defaults so the map and UI NEVER freeze
  const [settings, setSettings] = useState<DeliverySettings>(getCachedDeliverySettings);
  const [areas, setAreas] = useState<DeliveryArea[]>(getCachedDeliveryAreas);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>(() => ({
    lat: Number(getCachedDeliverySettings().center_lat) || DEFAULT_DELIVERY_SETTINGS.center_lat,
    lng: Number(getCachedDeliverySettings().center_lng) || DEFAULT_DELIVERY_SETTINGS.center_lng,
  }));
  const [result, setResult] = useState<ZoneCheckResult | null>(null);
  const [locating, setLocating] = useState(false);
  const [hasUserSelected, setHasUserSelected] = useState(false);
  const { toast } = useToast();
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // Fetch live delivery config from Supabase (with RPC & direct select fallbacks)
  useEffect(() => {
    let isMounted = true;

    const loadConfig = async () => {
      try {
        // Attempt 1: Call RPC get_public_delivery_config (bypasses restrictive RLS)
        const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
          "get_public_delivery_config"
        );

        if (!rpcError && rpcData && typeof rpcData === "object") {
          if (rpcData.settings && isMounted) {
            setSettings(rpcData.settings);
            saveCachedDeliverySettings(rpcData.settings);
          }
          if (Array.isArray(rpcData.areas) && isMounted) {
            setAreas(rpcData.areas);
            saveCachedDeliveryAreas(rpcData.areas);
          }
          return;
        }
      } catch {
        // RPC might not exist yet, fallback to direct query
      }

      try {
        // Attempt 2: Direct table select
        const [{ data: s }, { data: a }] = await Promise.all([
          supabase.from("delivery_settings").select("*").maybeSingle(),
          supabase.from("delivery_areas").select("*").eq("active", true),
        ]);

        if (isMounted) {
          if (s) {
            setSettings(s as any);
            saveCachedDeliverySettings(s as any);
          }
          if (a && Array.isArray(a)) {
            setAreas(a as any);
            saveCachedDeliveryAreas(a as any);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch delivery settings from server, using cached:", err);
      }
    };

    loadConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  // Geolocation detection handler
  const detect = useCallback(
    (silent = false) => {
      if (!navigator.geolocation) {
        if (!silent) {
          toast({ title: "Location not supported on this device", variant: "destructive" });
        }
        return;
      }

      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoords({ lat, lng });
          setHasUserSelected(true);
          setLocating(false);
          if (!silent) {
            toast({ title: "Location detected! 📍" });
          }
        },
        () => {
          setLocating(false);
          if (!silent) {
            toast({
              title: "Location permission denied",
              description: "Please tap on the map or drag the pin to set your delivery address.",
              variant: "destructive",
            });
          }
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    },
    [toast]
  );

  // Auto-detect user's location immediately on mount
  useEffect(() => {
    detect(true);
  }, [detect]);

  // Re-evaluate whenever coords, settings, or areas change
  useEffect(() => {
    if (!coords) return;
    const r = checkZone(coords.lat, coords.lng, settings, areas);
    setResult(r);
    onResultRef.current(r, coords);
  }, [coords, settings, areas]);

  const mapLat = coords?.lat ?? Number(settings.center_lat) ?? DEFAULT_DELIVERY_SETTINGS.center_lat;
  const mapLng = coords?.lng ?? Number(settings.center_lng) ?? DEFAULT_DELIVERY_SETTINGS.center_lng;

  const handleManualMapSelect = (lat: number, lng: number) => {
    setCoords({ lat, lng });
    setHasUserSelected(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="font-bold flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" /> Delivery Location
        </h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => detect(false)}
          disabled={locating}
        >
          {locating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Locating...
            </>
          ) : (
            <>
              <Crosshair className="w-4 h-4 text-primary" /> Use my location
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Click or drag the pin on the map to set your exact delivery address.
      </p>

      <div className="rounded-xl overflow-hidden border border-border shadow-sm">
        <MapPicker
          lat={mapLat}
          lng={mapLng}
          radiusKm={Number(settings.free_radius_km) || DEFAULT_DELIVERY_SETTINGS.free_radius_km}
          showRadius
          onChange={handleManualMapSelect}
          extras={areas.map((a) => ({
            lat: Number(a.lat),
            lng: Number(a.lng),
            radiusKm: Number(a.radius_km),
            label: a.name,
          }))}
          height="230px"
        />
      </div>

      {/* Result feedback */}
      {result && result.allowed && (
        <div className="rounded-xl p-3 text-sm flex items-start gap-2 bg-green-50 text-green-900 border border-green-200 dark:bg-green-950/40 dark:text-green-200 dark:border-green-900">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
          <div className="flex-1">
            <p className="font-semibold text-green-800 dark:text-green-200">
              ✅ We deliver to {result.label}
            </p>
            <p className="text-xs mt-0.5 opacity-90">
              Delivery charges:{" "}
              <strong>
                {result.charges === 0
                  ? "Free Delivery 🎉"
                  : `Rs. ${(result.charges ?? 0).toLocaleString()}`}
              </strong>
            </p>
          </div>
        </div>
      )}

      {result && !result.allowed && (
        <div className="rounded-xl p-3 text-sm flex items-start gap-2 bg-red-50 text-red-900 border border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <p className="font-semibold text-red-800 dark:text-red-200">
              🚫 Out of Delivery Area
            </p>
            <p className="text-xs mt-0.5 text-red-700 dark:text-red-300">
              {result.reason || "Sorry, we do not deliver to this location yet."}
            </p>
          </div>
        </div>
      )}

      {!coords && !locating && (
        <div className="rounded-xl p-2.5 text-xs flex items-center gap-2 bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            Please tap <strong>"Use my location"</strong> or click on the map to confirm your delivery address.
          </span>
        </div>
      )}
    </div>
  );
};

export default DeliveryZoneCheck;
