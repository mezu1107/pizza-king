import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RiderLayout from "@/components/rider/RiderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, CheckCircle, Clock, TrendingUp, MapPin, Phone } from "lucide-react";
import { useRiderRewards } from "@/hooks/useRiderRewards";
import { deliveryEarnings } from "@/lib/riderRewards";

interface OrderRow {
  id: string;
  total: number;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  created_at: string;
  distance_km?: number | null;
}

const RiderDashboard = () => {
  const { user } = useAuth();
  const settings = useRiderRewards();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("rider_id", user.id)
        .order("created_at", { ascending: false });
      setOrders((data || []) as OrderRow[]);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const currentOrders = orders.filter(o => !["delivered", "cancelled"].includes(o.status));
  const deliveredToday = orders.filter(o => o.status === "delivered" && new Date(o.created_at).toDateString() === now.toDateString());
  const weeklyOrders = orders.filter(o => new Date(o.created_at) >= weekAgo);
  const weeklyEarnings = weeklyOrders.filter(o => o.status === "delivered").reduce((s, o) => s + deliveryEarnings(o, settings), 0);

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      confirmed: "bg-blue-100 text-blue-800",
      preparing: "bg-purple-100 text-purple-800",
      "out for delivery": "bg-orange-100 text-orange-800",
      delivered: "bg-green-100 text-green-800",
    };
    return map[status] || "bg-muted text-muted-foreground";
  };

  return (
    <RiderLayout title="Dashboard">
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold text-foreground">Welcome back! 🏍️</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Active Orders", value: currentOrders.length, icon: Package, color: "text-orange-500" },
            { label: "Delivered Today", value: deliveredToday.length, icon: CheckCircle, color: "text-green-500" },
            { label: "This Week", value: weeklyOrders.length, icon: Clock, color: "text-blue-500" },
            { label: "Weekly Earnings", value: `Rs. ${Math.round(weeklyEarnings).toLocaleString()}`, icon: TrendingUp, color: "text-primary" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <s.icon className={`w-6 h-6 ${s.color}`} />
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{loading ? "..." : s.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Current Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" /> Current Active Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : currentOrders.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No active orders right now. Relax! 😎</p>
            ) : (
              <div className="space-y-3">
                {currentOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-muted/30 rounded-xl p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8)}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColor(order.status)}`}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold">{order.customer_name || "Customer"}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="font-bold text-primary">Rs. {Number(order.total).toLocaleString()}</span>
                    </div>
                    {order.customer_phone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" /> {order.customer_phone}
                      </div>
                    )}
                    {order.customer_address && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" /> {order.customer_address}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" /> Last 7 Days Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground">{weeklyOrders.length}</p>
                <p className="text-xs text-muted-foreground">Total Orders</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{weeklyOrders.filter(o => o.status === "delivered").length}</p>
                <p className="text-xs text-muted-foreground">Delivered</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">Rs. {Math.round(weeklyEarnings).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Est. Earnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </RiderLayout>
  );
};

export default RiderDashboard;
