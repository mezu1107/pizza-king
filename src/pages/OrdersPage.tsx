import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useNavigate, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, ChevronDown, ChevronUp, Package, User, Phone, MapPin, RotateCcw, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { downloadInvoice } from "@/lib/invoice";
import type { DbOrder, DbOrderItem } from "@/types/database";

const OrdersPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [orderItemsMap, setOrderItemsMap] = useState<Record<string, DbOrderItem[]>>({});
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
      supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          if (data) setOrders(data as unknown as DbOrder[]);
          setLoading(false);
        });
    }
  }, [user, authLoading, navigate]);

  const toggleExpand = async (orderId: string) => {
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(orderId);
    if (!orderItemsMap[orderId]) {
      const { data } = await supabase.from("order_items").select("*").eq("order_id", orderId);
      setOrderItemsMap(prev => ({ ...prev, [orderId]: (data || []) as unknown as DbOrderItem[] }));
    }
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-5 lg:px-12 max-w-3xl">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-heading font-extrabold text-foreground mb-8 flex items-center gap-3"
          >
            <ShoppingBag className="w-9 h-9 text-primary" /> My Orders
          </motion.h1>

          {loading ? (
            <p className="text-center py-20 text-muted-foreground">Loading orders...</p>
          ) : orders.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <ShoppingBag className="w-20 h-20 text-muted-foreground/30 mx-auto mb-6" />
              <p className="text-xl text-muted-foreground mb-6">No orders yet. Start ordering!</p>
              <Link to="/menu">
                <Button className="rounded-full px-8">Browse Menu</Button>
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {orders.map((order, i) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-card rounded-2xl shadow-md overflow-hidden"
                >
                  <button
                    onClick={() => toggleExpand(order.id)}
                    className="w-full p-5 flex items-center justify-between text-left hover:bg-muted/20 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8)}</p>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="font-bold text-foreground text-lg">Rs. {Number(order.total).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                    </div>
                    {expandedId === order.id ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                  </button>

                  <AnimatePresence>
                    {expandedId === order.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 space-y-4 border-t border-border">
                          {/* Delivery Details */}
                          <div className="pt-3 space-y-1.5 text-sm">
                            <div className="flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>{order.customer_name || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>{order.customer_phone || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>{order.customer_address || "N/A"}</span>
                            </div>
                          </div>

                          {/* Items */}
                          <div>
                            <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                              <Package className="w-4 h-4" /> Items
                            </h4>
                            {!orderItemsMap[order.id] ? (
                              <p className="text-sm text-muted-foreground">Loading...</p>
                            ) : orderItemsMap[order.id].length === 0 ? (
                              <p className="text-sm text-muted-foreground">No items.</p>
                            ) : (
                              <div className="space-y-1.5">
                                {orderItemsMap[order.id].map((item) => (
                                  <div key={item.id} className="flex justify-between text-sm bg-muted/20 rounded-lg p-2.5">
                                    <span>{item.title} × {item.quantity}</span>
                                    <span className="font-semibold">Rs. {(Number(item.price) * item.quantity).toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 pt-1">
                            {orderItemsMap[order.id] && orderItemsMap[order.id].length > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full gap-1.5"
                                onClick={() => {
                                  orderItemsMap[order.id].forEach((it) => {
                                    if (it.food_id) {
                                      addItem({
                                        id: it.food_id,
                                        title: it.title,
                                        price: Number(it.price),
                                        imageUrl: "",
                                      });
                                    }
                                  });
                                  toast({ title: "Items added to cart! 🛒" });
                                  navigate("/cart");
                                }}
                              >
                                <RotateCcw className="w-4 h-4" /> Reorder
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full gap-1.5"
                              onClick={() =>
                                downloadInvoice(
                                  order as any,
                                  (orderItemsMap[order.id] || []).map((it) => ({
                                    title: it.title,
                                    quantity: it.quantity,
                                    price: Number(it.price),
                                  }))
                                )
                              }
                            >
                              <FileDown className="w-4 h-4" /> Invoice PDF
                            </Button>
                            {order.status !== "delivered" && order.status !== "cancelled" && (
                              <Link to="/track-order">
                                <Button variant="outline" size="sm" className="rounded-full">Track Order</Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OrdersPage;
