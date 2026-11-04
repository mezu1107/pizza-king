import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";

const isValidCoord = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n);

const pinIcon = L.divIcon({
  className: "map-picker-pin",
  html: '<span class="map-picker-pin-dot"></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export interface ExtraCircle {
  lat: number;
  lng: number;
  radiusKm: number;
  color?: string;
  label?: string;
}

interface MapPickerProps {
  lat: number;
  lng: number;
  radiusKm?: number;
  height?: string;
  draggable?: boolean;
  showRadius?: boolean;
  onChange?: (lat: number, lng: number) => void;
  extras?: ExtraCircle[];
  zoom?: number;
}

const MapPicker = ({
  lat,
  lng,
  radiusKm = 0,
  height = "320px",
  draggable = true,
  showRadius = true,
  onChange,
  extras = [],
  zoom = 13,
}: MapPickerProps) => {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const radiusRef = useRef<L.Circle | null>(null);
  const extrasRef = useRef<L.LayerGroup | null>(null);
  const onChangeRef = useRef(onChange);
  const draggableRef = useRef(draggable);

  const safeLat = isValidCoord(lat) ? lat : 33.5651;
  const safeLng = isValidCoord(lng) ? lng : 73.1486;
  const center = useMemo<[number, number]>(() => [safeLat, safeLng], [safeLat, safeLng]);
  const initialCenterRef = useRef(center);
  const initialZoomRef = useRef(zoom);

  useEffect(() => {
    onChangeRef.current = onChange;
    draggableRef.current = draggable;
  }, [draggable, onChange]);

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;

    const map = L.map(mapEl.current, { scrollWheelZoom: true }).setView(
      initialCenterRef.current,
      initialZoomRef.current
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const marker = L.marker(initialCenterRef.current, { draggable: draggableRef.current, icon: pinIcon }).addTo(map);
    marker.on("dragend", () => {
      const p = marker.getLatLng();
      onChangeRef.current?.(p.lat, p.lng);
    });
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (!draggableRef.current) return;
      onChangeRef.current?.(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;
    extrasRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      radiusRef.current = null;
      extrasRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    marker.setLatLng(center);
    map.setView(center, map.getZoom(), { animate: true });
  }, [center]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    if (draggable && onChange) marker.dragging?.enable();
    else marker.dragging?.disable();
  }, [draggable, onChange]);

  useEffect(() => {
    const map = mapRef.current;
    const extrasLayer = extrasRef.current;
    if (!map || !extrasLayer) return;

    if (radiusRef.current) {
      radiusRef.current.remove();
      radiusRef.current = null;
    }
    if (showRadius && radiusKm > 0) {
      radiusRef.current = L.circle(center, {
        radius: radiusKm * 1000,
        color: "hsl(var(--primary))",
        fillOpacity: 0.1,
      }).addTo(map);
    }

    extrasLayer.clearLayers();
    extras
      .filter((c) => isValidCoord(c.lat) && isValidCoord(c.lng) && isValidCoord(c.radiusKm))
      .forEach((c) => {
        L.circle([c.lat, c.lng], {
          radius: c.radiusKm * 1000,
          color: c.color || "hsl(var(--accent))",
          fillOpacity: 0.08,
        }).addTo(extrasLayer);
      });
  }, [center, extras, radiusKm, showRadius]);

  return (
    <div
      className="rounded-xl overflow-hidden border border-border"
      style={{ height }}
    >
      <div ref={mapEl} className="h-full w-full" />
    </div>
  );
};

export default MapPicker;
