import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Clock, ChefHat, Truck, CheckCircle2, XCircle, Search, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";

const statusSteps = [
  { key: "pending", label: "Order Placed", icon: Package, color: "text-accent-foreground" },
  { key: "confirmed", label: "Confirmed", icon: Clock, color: "text-primary" },
  { key: "preparing", label: "Preparing", icon: ChefHat, color: "text-primary" },
  { key: "out_for_delivery", label: "Out for Delivery", icon: Truck, color: "text-primary" },
  { key: "delivered", label: "Delivered", icon: CheckCircle2, color: "text-green-600" },
];

const TrackOrderPage = () => {
  const { user } = useAuth();
  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const trackOrder = async () => {
    if (!orderId.trim()) return;
    setLoading(true);
    setError("");

    const { data, error: err } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId.trim())
      .maybeSingle();

    if (err || !data) {
      setError("Order not found. Please check the ID and try again.");
      setOrder(null);
      setItems([]);
    } else {
      setOrder(data);
      const { data: orderItems } = await supabase.from("order_items").select("*").eq("order_id", (data as any).id);
      setItems(orderItems || []);
    }
    setLoading(false);
  };

  // Auto-load latest order if logged in
  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).single()
      .then(({ data }) => {
        if (data) {
          setOrder(data);
          setOrderId((data as any).id);
          supabase.from("order_items").select("*").eq("order_id", (data as any).id)
            .then(({ data: oi }) => setItems(oi || []));
        }
      });
  }, [user]);

  // Realtime subscription for live status updates
  useEffect(() => {
    if (!order?.id) return;
    const channel = supabase
      .channel(`order-${order.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${order.id}` },
        (payload) => {
          setOrder(payload.new);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id]);

  const currentStepIdx = order ? statusSteps.findIndex(s => s.key === (order as any).status) : -1;
  const isCancelled = order && (order as any).status === "cancelled";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-5 lg:px-12 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Truck className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-foreground mb-4">
              Track Your <span className="text-primary">Order</span>
            </h1>
            <p className="text-muted-foreground text-lg">Enter your order ID to see real-time status</p>
          </motion.div>

          {/* Search */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="flex gap-3 mb-12">
            <Input value={orderId} onChange={e => setOrderId(e.target.value)} placeholder="Enter Order ID..."
              className="h-14 rounded-full text-lg" onKeyDown={e => e.key === "Enter" && trackOrder()} />
            <Button onClick={trackOrder} className="h-14 px-8 rounded-full" disabled={loading}>
              <Search className="w-5 h-5 mr-2" /> Track
            </Button>
          </motion.div>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-12 text-destructive">
              <XCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">{error}</p>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {order && (
              <motion.div key="order" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="space-y-8">

                {/* Status Timeline */}
                {isCancelled ? (
                  <div className="bg-destructive/10 rounded-2xl p-8 text-center">
                    <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                    <h3 className="text-2xl font-heading font-bold text-destructive">Order Cancelled</h3>
                    <p className="text-muted-foreground mt-2">This order has been cancelled.</p>
                  </div>
                ) : (
                  <div className="bg-card rounded-2xl shadow-lg p-6 md:p-10">
                    <h3 className="font-heading font-bold text-lg text-foreground mb-8">Order Progress</h3>
                    <div className="relative">
                      {/* Progress line */}
                      <div className="absolute top-6 left-6 right-6 h-1 bg-border rounded-full hidden md:block">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(0, (currentStepIdx / (statusSteps.length - 1)) * 100)}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="h-full bg-primary rounded-full"
                        />
                      </div>

                      <div className="flex flex-col md:flex-row md:justify-between gap-6 md:gap-0 relative">
                        {statusSteps.map((step, i) => {
                          const isActive = i <= currentStepIdx;
                          const isCurrent = i === currentStepIdx;
                          return (
                            <motion.div key={step.key}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.15, duration: 0.4 }}
                              className="flex md:flex-col items-center gap-3 md:gap-2 text-center"
                            >
                              <motion.div
                                animate={isCurrent ? { scale: [1, 1.2, 1] } : {}}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isActive
                                  ? "bg-primary text-primary-foreground shadow-lg"
                                  : "bg-muted/30 text-muted-foreground"}`}
                              >
                                <step.icon className="w-5 h-5" />
                              </motion.div>
                              <span className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                                {step.label}
                              </span>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Order Details */}
                <div className="bg-card rounded-2xl shadow-lg p-6 md:p-8">
                  <h3 className="font-heading font-bold text-lg text-foreground mb-4">Order Details</h3>
                  <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                    <div><span className="text-muted-foreground">Order ID:</span><p className="font-mono font-semibold text-foreground truncate">{(order as any).id}</p></div>
                    <div><span className="text-muted-foreground">Date:</span><p className="font-semibold text-foreground">{new Date((order as any).created_at).toLocaleDateString()}</p></div>
                    <div><span className="text-muted-foreground">Status:</span><p className="font-semibold text-primary capitalize">{(order as any).status?.replace(/_/g, " ")}</p></div>
                    <div><span className="text-muted-foreground">Total:</span><p className="font-semibold text-foreground">Rs. {Number((order as any).total).toLocaleString()}</p></div>
                  </div>

                  {items.length > 0 && (
                    <div className="border-t border-border pt-4">
                      <h4 className="font-semibold text-foreground mb-3">Items Ordered</h4>
                      <div className="space-y-2">
                        {items.map((item: any) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{item.title} × {item.quantity}</span>
                            <span className="font-semibold text-foreground">Rs. {(item.price * item.quantity).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <Link to="/orders"><Button variant="outline" className="rounded-full gap-2">View All Orders <ArrowRight className="w-4 h-4" /></Button></Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!order && !error && !user && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
              <p className="text-muted-foreground mb-4">Sign in to automatically see your latest order</p>
              <Link to="/auth"><Button className="rounded-full">Sign In</Button></Link>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TrackOrderPage;
