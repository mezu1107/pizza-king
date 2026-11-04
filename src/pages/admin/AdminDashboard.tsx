import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, DollarSign, Users, UtensilsCrossed, Tag, Clock, Bike, TrendingUp, Star } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  totalUsers: number;
  totalMenuItems: number;
  activeDeals: number;
  totalRiders: number;
  totalReviews: number;
  pendingOrders: number;
}

interface RecentOrder {
  id: string;
  total: number;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
}

const statCards = [
  { key: "totalOrders", label: "Total Orders", icon: ShoppingBag, color: "text-blue-500" },
  { key: "totalRevenue", label: "Revenue", icon: DollarSign, color: "text-green-500" },
  { key: "totalUsers", label: "Users", icon: Users, color: "text-purple-500" },
  { key: "totalMenuItems", label: "Menu Items", icon: UtensilsCrossed, color: "text-primary" },
  { key: "activeDeals", label: "Active Deals", icon: Tag, color: "text-orange-500" },
  { key: "totalRiders", label: "Riders", icon: Bike, color: "text-cyan-500" },
  { key: "pendingOrders", label: "Pending", icon: Clock, color: "text-yellow-500" },
  { key: "totalReviews", label: "Reviews", icon: Star, color: "text-pink-500" },
];

const COLORS = ["hsl(var(--primary))", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0, totalRevenue: 0, totalUsers: 0, totalMenuItems: 0,
    activeDeals: 0, totalRiders: 0, totalReviews: 0, pendingOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyRevenue, setDailyRevenue] = useState<{ day: string; revenue: number }[]>([]);
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const [ordersRes, foodsRes, dealsRes, profilesRes, recentRes, ridersRes, reviewsRes] = await Promise.all([
        supabase.from("orders").select("total, status, created_at"),
        supabase.from("foods").select("id"),
        supabase.from("deals").select("id").eq("active", true),
        supabase.from("profiles").select("id"),
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("user_roles" as any).select("id").eq("role", "rider"),
        supabase.from("reviews").select("id"),
      ]);

      const orders = ordersRes.data || [];
      setStats({
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum: number, o: any) => sum + Number(o.total), 0),
        totalUsers: (profilesRes.data || []).length,
        totalMenuItems: (foodsRes.data || []).length,
        activeDeals: (dealsRes.data || []).length,
        totalRiders: (ridersRes.data || []).length,
        totalReviews: (reviewsRes.data || []).length,
        pendingOrders: orders.filter((o: any) => o.status === "pending").length,
      });
      setRecentOrders((recentRes.data || []) as RecentOrder[]);

      // Daily revenue (last 7 days)
      const days: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString("en-US", { weekday: "short" });
        days[key] = 0;
      }
      orders.forEach((o: any) => {
        const d = new Date(o.created_at);
        const key = d.toLocaleDateString("en-US", { weekday: "short" });
        if (key in days) days[key] += Number(o.total);
      });
      setDailyRevenue(Object.entries(days).map(([day, revenue]) => ({ day, revenue })));

      // Status distribution
      const statusMap: Record<string, number> = {};
      orders.forEach((o: any) => {
        statusMap[o.status] = (statusMap[o.status] || 0) + 1;
      });
      setStatusData(Object.entries(statusMap).map(([name, value]) => ({ name, value })));

      setLoading(false);
    };
    fetchStats();
  }, []);

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      preparing: "bg-purple-100 text-purple-800",
      "out for delivery": "bg-orange-100 text-orange-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return map[status] || "bg-muted text-muted-foreground";
  };

  const formatValue = (key: string, value: number) => {
    if (key === "totalRevenue") return `Rs. ${value.toLocaleString()}`;
    return value.toLocaleString();
  };

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-8">
        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {statCards.map((s, i) => (
            <motion.div key={s.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <s.icon className={`w-7 h-7 ${s.color}`} />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {loading ? "..." : formatValue(s.key, stats[s.key as keyof Stats])}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Revenue (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyRevenue}>
                  <XAxis dataKey="day" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(v: number) => [`Rs. ${v.toLocaleString()}`, "Revenue"]} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><ShoppingBag className="w-5 h-5" /> Order Status Distribution</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              {statusData.length === 0 ? (
                <p className="text-muted-foreground py-8">No orders yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Clock className="w-5 h-5 text-muted-foreground" /> Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground py-8 text-center">Loading...</p>
            ) : recentOrders.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">No orders yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="py-3 px-2 font-medium text-muted-foreground">Order ID</th>
                      <th className="py-3 px-2 font-medium text-muted-foreground hidden sm:table-cell">Customer</th>
                      <th className="py-3 px-2 font-medium text-muted-foreground">Total</th>
                      <th className="py-3 px-2 font-medium text-muted-foreground">Status</th>
                      <th className="py-3 px-2 font-medium text-muted-foreground hidden md:table-cell">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-2 font-mono text-xs">#{order.id.slice(0, 8)}</td>
                        <td className="py-3 px-2 hidden sm:table-cell">{order.customer_name || "—"}</td>
                        <td className="py-3 px-2 font-semibold">Rs. {Number(order.total).toLocaleString()}</td>
                        <td className="py-3 px-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground hidden md:table-cell">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
