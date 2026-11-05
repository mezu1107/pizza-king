// Delivery zone helpers — geo math + zone resolution

export interface DeliverySettings {
  id: string;
  center_name: string;
  center_lat: number;
  center_lng: number;
  free_radius_km: number;
  base_delivery_charges: number;
}

export interface DeliveryArea {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius_km: number;
  delivery_charges: number;
  active: boolean;
}

export interface ZoneCheckResult {
  allowed: boolean;
  type?: "main" | "area";
  charges?: number;
  label?: string;
  area?: DeliveryArea;
  reason?: string;
  distanceKm?: number;
}

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  id: "default-pizza-king",
  center_name: "Pizza King Mankiala",
  center_lat: 33.5651,
  center_lng: 73.1486,
  free_radius_km: 5,
  base_delivery_charges: 0,
};

export const DELIVERY_STORAGE_KEY = "pizza_king_delivery_settings";
export const DELIVERY_AREAS_STORAGE_KEY = "pizza_king_delivery_areas";

export function getCachedDeliverySettings(): DeliverySettings {
  try {
    const raw = localStorage.getItem(DELIVERY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed.center_lat === "number" &&
        typeof parsed.center_lng === "number" &&
        !isNaN(parsed.center_lat) &&
        !isNaN(parsed.center_lng)
      ) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_DELIVERY_SETTINGS;
}

export function saveCachedDeliverySettings(settings: DeliverySettings): void {
  try {
    localStorage.setItem(DELIVERY_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function getCachedDeliveryAreas(): DeliveryArea[] {
  try {
    const raw = localStorage.getItem(DELIVERY_AREAS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback
  }
  return [];
}

export function saveCachedDeliveryAreas(areas: DeliveryArea[]): void {
  try {
    localStorage.setItem(DELIVERY_AREAS_STORAGE_KEY, JSON.stringify(areas));
  } catch {
    // ignore
  }
}

// Haversine distance in km
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function checkZone(
  lat: number,
  lng: number,
  settings: DeliverySettings | null,
  areas: DeliveryArea[] = []
): ZoneCheckResult {
  if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) {
    return {
      allowed: false,
      reason: "Please select a valid location on the map.",
    };
  }

  const activeSettings = settings || DEFAULT_DELIVERY_SETTINGS;

  // Inside main free-delivery radius?
  const dMain = distanceKm(
    lat,
    lng,
    Number(activeSettings.center_lat),
    Number(activeSettings.center_lng)
  );

  if (dMain <= Number(activeSettings.free_radius_km)) {
    return {
      allowed: true,
      type: "main",
      charges: Number(activeSettings.base_delivery_charges) || 0,
      label: `${activeSettings.center_name} (${dMain.toFixed(1)} km away)`,
      distanceKm: dMain,
    };
  }

  // Otherwise check named extra areas
  for (const area of areas) {
    if (!area.active) continue;
    const d = distanceKm(lat, lng, Number(area.lat), Number(area.lng));
    if (d <= Number(area.radius_km)) {
      return {
        allowed: true,
        type: "area",
        charges: Number(area.delivery_charges) || 0,
        label: `${area.name} (${d.toFixed(1)} km away)`,
        area,
        distanceKm: d,
      };
    }
  }

  return {
    allowed: false,
    distanceKm: dMain,
    reason: `Out of delivery zone (${dMain.toFixed(1)} km away). Sorry, we don't deliver to your location yet.`,
  };
}
