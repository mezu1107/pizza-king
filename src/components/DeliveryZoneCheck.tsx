import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  checkZone,
  DeliveryArea,
  DeliverySettings,
  ZoneCheckResult,
} from "@/lib/delivery";
import MapPicker from "./MapPicker";
import { Button } from "./ui/button";
import { Crosshair, MapPin, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onResult: (result: ZoneCheckResult, coords: { lat: number; lng: number } | null) => void;
}

const DeliveryZoneCheck = ({ onResult }: Props) => {
  const [settings, setSettings] = useState<DeliverySettings | null>(null);
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [result, setResult] = useState<ZoneCheckResult | null>(null);
  const [locating, setLocating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: a }] = await Promise.all([
        supabase.from("delivery_settings").select("*").maybeSingle(),
        supabase.from("delivery_areas").select("*").eq("active", true),
      ]);
      if (s) setSettings(s as any);
      setAreas((a as any) || []);
      setLoading(false);
    })();
  }, []);

  // Re-evaluate whenever coords or data change
  useEffect(() => {
    if (!coords || !settings) return;
    const r = checkZone(coords.lat, coords.lng, settings, areas);
    setResult(r);
    onResult(r, coords);
  }, [coords, settings, areas]);

  const detect = () => {
    if (!navigator.geolocation) {
      toast({ title: "Location not supported", variant: "destructive" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        toast({
          title: "Location permission denied",
          description: "Please pick your location on the map instead.",
          variant: "destructive",
        });
        setLocating(false);
        // Default to main center so user can drag
        if (settings) setCoords({ lat: Number(settings.center_lat), lng: Number(settings.center_lng) });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (loading || !settings) {
    return <p className="text-sm text-muted-foreground">Loading delivery info...</p>;
  }

  const mapLat = coords?.lat ?? Number(settings.center_lat);
  const mapLng = coords?.lng ?? Number(settings.center_lng);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="font-bold flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" /> Confirm Delivery Location
        </h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={detect}
          disabled={locating}
        >
          <Crosshair className="w-4 h-4" /> {locating ? "Locating..." : "Use my location"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Click anywhere on the map or drag the pin to set your exact location.
      </p>

      <MapPicker
        lat={mapLat}
        lng={mapLng}
        radiusKm={Number(settings.free_radius_km)}
        showRadius
        onChange={(lat, lng) => setCoords({ lat, lng })}
        extras={areas.map((a) => ({
          lat: Number(a.lat),
          lng: Number(a.lng),
          radiusKm: Number(a.radius_km),
        }))}
        height="260px"
      />

      {result && result.allowed && (
        <div className="rounded-xl p-3 text-sm flex items-start gap-2 bg-green-50 text-green-900 border border-green-200 dark:bg-green-950/40 dark:text-green-200 dark:border-green-900">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">✅ We deliver to {result.label}</p>
            <p className="text-xs mt-0.5 opacity-90">
              Delivery charges:{" "}
              <strong>Rs. {(result.charges ?? 0).toLocaleString()}</strong>
            </p>
          </div>
        </div>
      )}
      {result && !result.allowed && (
        <div className="rounded-xl p-3 text-sm flex items-start gap-2 bg-red-50 text-red-900 border border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{result.reason}</p>
          </div>
        </div>
      )}

      {!coords && (
        <p className="text-xs text-muted-foreground italic">
          Please set your location to continue.
        </p>
      )}
    </div>
  );
};

export default DeliveryZoneCheck;
