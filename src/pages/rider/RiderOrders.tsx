import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RiderLayout from "@/components/rider/RiderLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Package, Phone, MapPin, User, CheckCircle, Navigation } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface OrderRow {
  id: string;
  total: number;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  customer_address: string | null;
  created_at: string;
}

interface OrderItemRow {
  id: string;
  title: string;
  quantity: number;
  price: number;
}

const RiderOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "completed">("active");
  const [detailOrder, setDetailOrder] = useState<OrderRow | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const { toast } = useToast();

  const fetchOrders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("rider_id", user.id)
      .order("created_at", { ascending: false });
    setOrders((data || []) as OrderRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, [user]);

  const viewDetails = async (order: OrderRow) => {
    setDetailOrder(order);
    setItemsLoading(true);
    const { data } = await supabase.from("order_items").select("*").eq("order_id", order.id);
    setOrderItems((data || []) as OrderItemRow[]);
    setItemsLoading(false);
  };

  const markDelivered = async (orderId: string) => {
    const { error } = await supabase.from("orders").update({ status: "delivered", delivered_at: new Date().toISOString() }).eq("id", orderId);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Order marked as delivered! ✅" });
      fetchOrders();
      if (detailOrder?.id === orderId) setDetailOrder(null);
    }
  };

  const markPickedUp = async (orderId: string) => {
    const { error } = await supabase.from("orders").update({ status: "out_for_delivery", assigned_at: new Date().toISOString() }).eq("id", orderId);
    if (error) {
      toast({ title: "Update failed", variant: "destructive" });
    } else {
      toast({ title: "Order picked up! 🏍️" });
      fetchOrders();
    }
  };

  const activeOrders = orders.filter(o => !["delivered", "cancelled"].includes(o.status));
  const completedOrders = orders.filter(o => ["delivered", "cancelled"].includes(o.status));
  const displayOrders = tab === "active" ? activeOrders : completedOrders;

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      confirmed: "bg-blue-100 text-blue-800",
      preparing: "bg-purple-100 text-purple-800",
      "out_for_delivery": "bg-muted text-foreground",
      "out for delivery": "bg-muted text-foreground",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return map[status] || "bg-muted text-muted-foreground";
  };

  return (
    <RiderLayout title="My Orders">
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold text-foreground">My Deliveries</h1>

        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            variant={tab === "active" ? "default" : "outline"}
            onClick={() => setTab("active")}
            className="gap-2"
          >
            <Package className="w-4 h-4" /> Active ({activeOrders.length})
          </Button>
          <Button
            variant={tab === "completed" ? "default" : "outline"}
            onClick={() => setTab("completed")}
            className="gap-2"
          >
            <CheckCircle className="w-4 h-4" /> Completed ({completedOrders.length})
          </Button>
        </div>

        {loading ? (
          <p className="text-center py-12 text-muted-foreground">Loading...</p>
        ) : displayOrders.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">
            {tab === "active" ? "No active deliveries." : "No completed deliveries yet."}
          </p>
        ) : (
          <div className="space-y-3">
            {displayOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColor(order.status)}`}>
                          {order.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <span className="font-bold text-primary">Rs. {Number(order.total).toLocaleString()}</span>
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-medium">{order.customer_name || "Customer"}</span>
                      </div>
                      {order.customer_phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                          <a href={`tel:${order.customer_phone}`} className="text-primary hover:underline">{order.customer_phone}</a>
                        </div>
                      )}
                      {order.customer_address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">{order.customer_address}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm" onClick={() => viewDetails(order)} className="gap-1">
                        View Items
                      </Button>
                      {order.status === "confirmed" || order.status === "preparing" ? (
                        <Button size="sm" onClick={() => markPickedUp(order.id)} className="gap-1">
                          <Navigation className="w-3.5 h-3.5" /> Pick Up
                        </Button>
                      ) : null}
                      {["out_for_delivery", "out for delivery"].includes(order.status) && (
                        <Button size="sm" onClick={() => markDelivered(order.id)} className="gap-1 bg-green-600 hover:bg-green-700">
                          <CheckCircle className="w-3.5 h-3.5" /> Delivered
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Order items dialog */}
        <Dialog open={!!detailOrder} onOpenChange={() => setDetailOrder(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Order Items</DialogTitle></DialogHeader>
            {itemsLoading ? (
              <p className="text-muted-foreground text-sm py-4">Loading...</p>
            ) : orderItems.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">No items.</p>
            ) : (
              <div className="space-y-2">
                {orderItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm bg-muted/20 rounded-lg p-3">
                    <span>{item.title} × {item.quantity}</span>
                    <span className="font-semibold">Rs. {(Number(item.price) * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RiderLayout>
  );
};

export default RiderOrders;
