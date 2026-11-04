import RiderLayout from "@/components/rider/RiderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp, Award, Target, Zap } from "lucide-react";
import { useRiderRewards } from "@/hooks/useRiderRewards";

const RiderPerformance = () => {
  const { user } = useAuth();
  const settings = useRiderRewards();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("status, created_at").eq("rider_id", user.id).then(({ data }) => setOrders(data || []));
  }, [user]);

  const total = orders.length;
  const delivered = orders.filter(o => o.status === "delivered").length;
  const cancelled = orders.filter(o => o.status === "cancelled").length;
  const successRate = total ? Math.round((delivered / total) * 100) : 0;

  const stats = [
    { label: "Success Rate", value: `${successRate}%`, icon: Target, color: "text-green-500" },
    { label: "Total Orders", value: total, icon: TrendingUp, color: "text-blue-500" },
    { label: "Delivered", value: delivered, icon: Award, color: "text-primary" },
    { label: "Reward points", value: delivered * Number(settings?.points_per_order || 0), icon: Award, color: "text-primary" },
    { label: "Cancelled", value: cancelled, icon: Zap, color: "text-red-500" },
  ];

  const badges = [
    { label: "First Delivery", earned: delivered >= 1 },
    { label: "10 Deliveries", earned: delivered >= 10 },
    { label: "50 Deliveries", earned: delivered >= 50 },
    { label: "100 Deliveries", earned: delivered >= 100 },
    { label: "95%+ Success", earned: successRate >= 95 && total >= 10 },
  ];

  return (
    <RiderLayout title="Performance">
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold">Performance Stats</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <s.icon className={`w-6 h-6 ${s.color} mb-2`} />
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Award className="w-5 h-5" /> Achievement Badges</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {badges.map((b) => (
                <div key={b.label} className={`p-4 rounded-xl text-center text-sm ${b.earned ? "bg-primary/10 text-primary border-2 border-primary/30" : "bg-muted/30 text-muted-foreground border-2 border-dashed border-border"}`}>
                  <Award className={`w-8 h-8 mx-auto mb-1 ${b.earned ? "text-primary" : "opacity-40"}`} />
                  <p className="font-semibold">{b.label}</p>
                  {b.earned && <p className="text-[10px] mt-1">✓ Earned</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </RiderLayout>
  );
};
export default RiderPerformance;
