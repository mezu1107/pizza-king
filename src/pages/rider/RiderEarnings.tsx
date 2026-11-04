import RiderLayout from "@/components/rider/RiderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DollarSign, TrendingUp, Calendar } from "lucide-react";
import { useRiderRewards } from "@/hooks/useRiderRewards";
import { deliveryEarnings } from "@/lib/riderRewards";

const RiderEarnings = () => {
  const { user } = useAuth();
  const settings = useRiderRewards();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("total, distance_km, status, created_at, delivered_at").eq("rider_id", user.id).eq("status", "delivered")
      .then(({ data }) => setOrders(data || []));
  }, [user]);

  const calc = (days: number) => {
    const since = new Date(Date.now() - days * 86400000);
    return orders.filter(o => new Date(o.created_at) >= since)
      .reduce((s, o) => s + deliveryEarnings(o, settings), 0);
  };

  const today = calc(1);
  const week = calc(7);
  const month = calc(30);
  const all = orders.reduce((s, o) => s + deliveryEarnings(o, settings), 0);

  return (
    <RiderLayout title="Earnings">
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold">My Earnings</h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Today", value: today, icon: DollarSign, color: "text-green-500" },
            { label: "This Week", value: week, icon: Calendar, color: "text-blue-500" },
            { label: "This Month", value: month, icon: TrendingUp, color: "text-primary" },
            { label: "All Time", value: all, icon: DollarSign, color: "text-amber-500" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <s.icon className={`w-6 h-6 ${s.color} mb-2`} />
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold">Rs. {Math.round(s.value).toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Deliveries</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {orders.slice(0, 10).map((o, i) => (
                <div key={i} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
                  <span className="text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</span>
                  <span className="font-semibold text-primary">+ Rs. {Math.round(deliveryEarnings(o, settings)).toLocaleString()}</span>
                </div>
              ))}
              {orders.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No earnings yet.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </RiderLayout>
  );
};

export default RiderEarnings;
