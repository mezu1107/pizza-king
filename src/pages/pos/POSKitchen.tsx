import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import POSLayout from "@/components/pos/POSLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChefHat, Clock } from "lucide-react";

interface KitchenOrder {
  id: string;
  status: string;
  created_at: string;
  customer_name: string | null;
  order_type: string;
  table_no: string | null;
  notes: string | null;
  order_items: { id: string; title: string; quantity: number }[];
}

const FLOW: Record<string, { next: string | null; label: string }> = {
  pending: { next: "preparing", label: "Start cooking" },
  confirmed: { next: "preparing", label: "Start cooking" },
  preparing: { next: "ready", label: "Mark ready" },
  ready: { next: "completed", label: "Hand over" },
};

const since = (iso: string) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h ${mins % 60} min`;
};

export default function POSKitchen() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("id,status,created_at,customer_name,order_type,table_no,notes,order_items(id,title,quantity)")
      .in("status", ["pending", "confirmed", "preparing", "ready"])
      .order("created_at", { ascending: true });
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    setOrders((data as unknown as KitchenOrder[]) || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("kitchen-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const advance = async (o: KitchenOrder) => {
    const next = FLOW[o.status]?.next;
    if (!next) return;
    const { error } = await supabase.from("orders").update({ status: next } as never).eq("id", o.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Order moved to ${next}` });
    load();
  };

  return (
    <POSLayout title="Kitchen display">
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <ChefHat className="w-8 h-8 mx-auto mb-2" />
          No live orders in the kitchen right now.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {orders.map((o) => (
            <Card key={o.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{o.customer_name || "Walk in customer"}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.order_type}
                    {o.table_no ? ` · table ${o.table_no}` : ""} · #{o.id.slice(0, 8)}
                  </p>
                </div>
                <Badge variant={o.status === "ready" ? "default" : "secondary"}>{o.status}</Badge>
              </div>

              <ul className="space-y-1 text-sm">
                {o.order_items?.map((it) => (
                  <li key={it.id} className="flex justify-between gap-2">
                    <span className="truncate">{it.title}</span>
                    <span className="font-semibold shrink-0">x{it.quantity}</span>
                  </li>
                ))}
              </ul>

              {o.notes && <p className="text-xs italic text-muted-foreground">Note: {o.notes}</p>}

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {since(o.created_at)}
                </span>
                {FLOW[o.status]?.next && (
                  <Button size="sm" onClick={() => advance(o)}>
                    {FLOW[o.status].label}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </POSLayout>
  );
}
