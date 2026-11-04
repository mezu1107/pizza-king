import { useRiderGPS } from "@/hooks/useRiderGPS";
export default function RiderTracking({ riderId }: { riderId: string }) {
  const message = useRiderGPS(riderId);
  return <p role="status" className="text-xs text-muted-foreground mb-4">{message}</p>;
}