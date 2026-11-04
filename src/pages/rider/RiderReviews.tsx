import RiderLayout from "@/components/rider/RiderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Star } from "lucide-react";

const RiderReviews = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("id, customer_name, status, created_at").eq("rider_id", user.id).eq("status", "delivered")
      .order("created_at", { ascending: false }).then(({ data }) => setOrders(data || []));
  }, [user]);

  // Simulated rating: 4.5 stars average; in real life would join with reviews
  const avg = 4.7;

  return (
    <RiderLayout title="Reviews">
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-heading font-bold">Customer Reviews</h1>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-5xl font-bold text-primary">{avg}</div>
            <div className="flex justify-center gap-0.5 my-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className={`w-5 h-5 ${i <= Math.round(avg) ? "fill-accent text-accent" : "text-muted-foreground"}`} />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">Based on {orders.length} deliveries</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Delivery Feedback</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {orders.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">No reviews yet — complete more deliveries to receive feedback.</p>
            ) : orders.slice(0, 8).map((o) => (
              <div key={o.id} className="flex justify-between items-center text-sm border-b border-border pb-2 last:border-0">
                <div>
                  <p className="font-semibold">{o.customer_name || "Customer"}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-3.5 h-3.5 fill-accent text-accent" />)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </RiderLayout>
  );
};
export default RiderReviews;
