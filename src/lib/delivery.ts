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
  areas: DeliveryArea[]
): ZoneCheckResult {
  if (!settings) {
    return { allowed: false, reason: "Delivery is not configured yet." };
  }

  // Inside main free-delivery radius?
  const dMain = distanceKm(lat, lng, Number(settings.center_lat), Number(settings.center_lng));
  if (dMain <= Number(settings.free_radius_km)) {
    return {
      allowed: true,
      type: "main",
      charges: Number(settings.base_delivery_charges) || 0,
      label: `${settings.center_name} (${dMain.toFixed(1)} km away)`,
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
        label: area.name,
        area,
      };
    }
  }

  return {
    allowed: false,
    reason: "Sorry, we don't deliver to your location yet.",
  };
}
