import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import POSLayout from "@/components/pos/POSLayout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Phone, MapPin, ShoppingBag } from "lucide-react";

interface CustomerRow {
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  order_count: number;
  total_spent: number;
  last_order: string;
}

const money = (n: number) => `Rs. ${Number(n || 0).toLocaleString()}`;

export default function POSCustomers() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("customer_name,customer_phone,customer_address,total,created_at")
      .not("customer_phone", "is", null)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Load failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const map = new Map<string, CustomerRow>();
    for (const row of (data || []) as any[]) {
      const key = row.customer_phone as string;
      if (!map.has(key)) {
        map.set(key, {
          customer_name: row.customer_name,
          customer_phone: row.customer_phone,
          customer_address: row.customer_address,
          order_count: 0,
          total_spent: 0,
          last_order: row.created_at,
        });
      }
      const c = map.get(key)!;
      c.order_count += 1;
      c.total_spent += Number(row.total || 0);
      if (row.created_at > c.last_order) c.last_order = row.created_at;
    }
    setCustomers(Array.from(map.values()).sort((a, b) => b.order_count - a.order_count));
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <POSLayout title="Customers">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{customers.length} unique customers</p>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2" />
            No customer orders yet.
          </Card>
        ) : (
          <div className="space-y-2">
            {customers.map((c) => (
              <Card key={c.customer_phone} className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{c.customer_name || "Customer"}</p>
                  {c.customer_phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {c.customer_phone}
                    </p>
                  )}
                  {c.customer_address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3" /> {c.customer_address}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-primary">{money(c.total_spent)}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                    <ShoppingBag className="w-3 h-3" /> {c.order_count} orders
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Last: {new Date(c.last_order).toLocaleDateString()}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </POSLayout>
  );
}
