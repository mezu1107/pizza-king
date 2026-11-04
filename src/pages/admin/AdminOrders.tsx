import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Eye, Truck, User, Phone, MapPin, Mail, Package, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OrderRow {
  id: string;
  user_id: string;
  total: number;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  customer_address: string | null;
  rider_id: string | null;
  created_at: string;
}

interface OrderItemRow {
  id: string;
  title: string;
  quantity: number;
  price: number;
}

interface RiderOption {
  user_id: string;
  full_name: string | null;
}

const statuses = ["pending", "confirmed", "preparing", "out for delivery", "delivered", "cancelled"];

const AdminOrders = () => {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [detailOrder, setDetailOrder] = useState<OrderRow | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [riders, setRiders] = useState<RiderOption[]>([]);
  const { toast } = useToast();

  const fetchOrders = async () => {
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    setOrders((data || []) as OrderRow[]);
    setLoading(false);
  };

  const fetchRiders = async () => {
    const { data } = await supabase.from("user_roles" as any).select("user_id").eq("role", "rider");
    if (data && data.length > 0) {
      const riderIds = (data as any[]).map((r: any) => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", riderIds);
      setRiders((profiles || []) as RiderOption[]);
    }
  };

  useEffect(() => { fetchOrders(); fetchRiders(); }, []);

  const viewDetails = async (order: OrderRow) => {
    setDetailOrder(order);
    setItemsLoading(true);
    const { data } = await supabase.from("order_items").select("*").eq("order_id", order.id);
    setOrderItems((data || []) as OrderItemRow[]);
    setItemsLoading(false);
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase.from("orders").update({ status: newStatus } as any).eq("id", orderId);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Order status → ${newStatus}` });
      fetchOrders();
      if (detailOrder?.id === orderId) setDetailOrder({ ...detailOrder, status: newStatus });
      const order = orders.find((o) => o.id === orderId);
      if (order?.user_id) {
        const { sendPush } = await import("@/lib/push");
        sendPush({
          user_ids: [order.user_id],
          title: "📦 Order Update",
          body: `Your order is now: ${newStatus}`,
          url: "/orders",
        });
      }
    }
  };

  const assignRider = async (orderId: string, riderId: string) => {
    const { error } = await supabase.from("orders").update({ rider_id: riderId } as any).eq("id", orderId);
    if (error) {
      toast({ title: "Assignment failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rider assigned ✅" });
      fetchOrders();
      if (detailOrder?.id === orderId) setDetailOrder({ ...detailOrder, rider_id: riderId });
      if (riderId && riderId !== "unassigned") {
        const { sendPush } = await import("@/lib/push");
        sendPush({
          user_ids: [riderId],
          title: "🛵 New Delivery Assigned",
          body: "You have a new order to deliver. Check your dashboard.",
          url: "/rider/orders",
        });
      }
    }
  };

  const exportOrders = () => {
    const csv = [
      ["Order ID", "Customer", "Phone", "Email", "Address", "Total", "Status", "Date"].join(","),
      ...filtered.map(o => [
        o.id.slice(0, 8),
        o.customer_name || "N/A",
        o.customer_phone || "N/A",
        o.customer_email || "N/A",
        `"${(o.customer_address || "N/A").replace(/"/g, '""')}"`,
        o.total,
        o.status,
        new Date(o.created_at).toLocaleDateString()
      ].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

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

  const filtered = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      (o.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.customer_phone || "").includes(search);
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getRiderName = (riderId: string | null) => {
    if (!riderId) return "Unassigned";
    return riders.find(r => r.user_id === riderId)?.full_name || "Rider";
  };

  return (
    <AdminLayout title="Orders Management">
      <div className="space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: orders.length, color: "text-foreground" },
            { label: "Pending", value: orders.filter(o => o.status === "pending").length, color: "text-yellow-600" },
            { label: "Delivering", value: orders.filter(o => o.status === "out for delivery").length, color: "text-orange-600" },
            { label: "Delivered", value: orders.filter(o => o.status === "delivered").length, color: "text-green-600" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by ID, name, phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={exportOrders}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>

        {loading ? (
          <p className="text-center py-12 text-muted-foreground">Loading...</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground">Order</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground hidden sm:table-cell">Customer</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground hidden md:table-cell">Phone</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground hidden sm:table-cell">Total</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground">Status</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground hidden lg:table-cell">Rider</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground hidden xl:table-cell">Date</th>
                      <th className="py-3 px-4 text-right font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((order) => (
                      <motion.tr key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-3 px-4 font-mono text-xs">#{order.id.slice(0, 8)}</td>
                        <td className="py-3 px-4 hidden sm:table-cell">
                          <p className="font-semibold text-foreground">{order.customer_name || "—"}</p>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">{order.customer_phone || "—"}</td>
                        <td className="py-3 px-4 hidden sm:table-cell font-semibold">Rs. {Number(order.total).toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <Select value={order.status} onValueChange={(v) => updateStatus(order.id, v)}>
                            <SelectTrigger className={`w-[140px] h-8 text-xs font-semibold ${statusColor(order.status)} border-0`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statuses.map((s) => (
                                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell">
                          {riders.length > 0 ? (
                            <Select value={order.rider_id || "unassigned"} onValueChange={(v) => assignRider(order.id, v)}>
                              <SelectTrigger className="w-[130px] h-8 text-xs">
                                <SelectValue placeholder="Assign" />
                              </SelectTrigger>
                              <SelectContent>
                                {riders.map(r => (
                                  <SelectItem key={r.user_id} value={r.user_id}>{r.full_name || "Rider"}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-muted-foreground">No riders</span>
                          )}
                        </td>
                        <td className="py-3 px-4 hidden xl:table-cell text-muted-foreground text-xs">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="ghost" size="sm" className="gap-1" onClick={() => viewDetails(order)}>
                            <Eye className="w-4 h-4" /> View
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && <p className="text-center py-12 text-muted-foreground">No orders found.</p>}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order details dialog */}
        <Dialog open={!!detailOrder} onOpenChange={() => setDetailOrder(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Order Details</DialogTitle></DialogHeader>
            {detailOrder && (
              <div className="space-y-5">
                {/* Customer Info */}
                <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2"><User className="w-4 h-4" /> Customer Information</h4>
                  <div className="grid grid-cols-1 gap-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium">{detailOrder.customer_name || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{detailOrder.customer_phone || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{detailOrder.customer_email || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{detailOrder.customer_address || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* Order Info */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Order ID:</span>
                  <span className="font-mono">#{detailOrder.id.slice(0, 8)}</span>
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-bold text-primary">Rs. {Number(detailOrder.total).toLocaleString()}</span>
                  <span className="text-muted-foreground">Status:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold w-fit capitalize ${statusColor(detailOrder.status)}`}>{detailOrder.status}</span>
                  <span className="text-muted-foreground">Date:</span>
                  <span>{new Date(detailOrder.created_at).toLocaleString()}</span>
                  <span className="text-muted-foreground">Rider:</span>
                  <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> {getRiderName(detailOrder.rider_id)}</span>
                </div>

                {/* Items */}
                <div className="border-t border-border pt-3">
                  <h4 className="font-semibold mb-2 flex items-center gap-2"><Package className="w-4 h-4" /> Order Items</h4>
                  {itemsLoading ? (
                    <p className="text-muted-foreground text-sm">Loading items...</p>
                  ) : orderItems.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No items.</p>
                  ) : (
                    <div className="space-y-2">
                      {orderItems.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm bg-muted/20 rounded-lg p-2">
                          <span>{item.title} × {item.quantity}</span>
                          <span className="font-semibold">Rs. {(Number(item.price) * item.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminOrders;
