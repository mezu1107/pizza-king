import RiderLayout from "@/components/rider/RiderLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { History, MapPin } from "lucide-react";

const RiderHistory = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("*").eq("rider_id", user.id).in("status", ["delivered", "cancelled"])
      .order("created_at", { ascending: false })
      .then(({ data }) => { setOrders(data || []); setLoading(false); });
  }, [user]);

  return (
    <RiderLayout title="History">
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2"><History className="w-6 h-6" /> Delivery History</h1>
        {loading ? <p className="text-center text-muted-foreground py-12">Loading...</p> :
          orders.length === 0 ? <p className="text-center text-muted-foreground py-12">No completed deliveries yet.</p> :
          <div className="space-y-3">
            {orders.map((o) => (
              <Card key={o.id}>
                <CardContent className="p-4 flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-xs font-mono text-muted-foreground">#{o.id.slice(0, 8)}</p>
                    <p className="font-semibold text-sm">{o.customer_name || "Customer"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{o.customer_address || "—"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${o.status === "delivered" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{o.status}</span>
                    <p className="text-sm font-bold text-primary mt-2">Rs. {Number(o.total).toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        }
      </div>
    </RiderLayout>
  );
};
export default RiderHistory;
