import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
export interface GPSPoint { lat: number; lng: number }
export default function RiderRouteMap({ points, destination }: { points: GPSPoint[]; destination?: GPSPoint }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current || (!points.length && !destination)) return;
    const coordinates = points.map(p => [Number(p.lat), Number(p.lng)] as L.LatLngTuple);
    const map = L.map(container.current);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(map);
    if (coordinates.length) {
      L.polyline(coordinates).addTo(map);
      L.circleMarker(coordinates[coordinates.length - 1]).addTo(map).bindPopup("Latest recorded location");
    }
    if (destination) {
      const end: L.LatLngTuple = [Number(destination.lat), Number(destination.lng)];
      coordinates.push(end);
      L.circleMarker(end).addTo(map).bindPopup("Delivery destination");
    }
    if (coordinates.length === 1) map.setView(coordinates[0], 16);
    else map.fitBounds(L.latLngBounds(coordinates), { padding: [30, 30], maxZoom: 17 });
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(container.current);
    return () => { resize.disconnect(); map.remove(); };
  }, [points, destination?.lat, destination?.lng]);
  return <div className="relative isolate z-0 h-80 rounded-md overflow-hidden border border-border" ref={container}>{!points.length && !destination && <p className="p-6 text-sm text-muted-foreground">No GPS locations recorded yet.</p>}</div>;
}