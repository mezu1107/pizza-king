import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Minus, Plus, Trash2, ShoppingBag, MapPin, Phone, User, MessageCircle,
  TicketPercent, Sparkles, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DeliveryZoneCheck from "@/components/DeliveryZoneCheck";
import { ZoneCheckResult } from "@/lib/delivery";
import { sendPush } from "@/lib/push";
import { validateCoupon, AppliedCoupon } from "@/lib/coupons";
import { getBalance, MIN_REDEEM_POINTS, POINT_VALUE_RUPEES, calcEarn } from "@/lib/loyalty";

const CartPage = () => {
  const { items, updateQuantity, removeItem, clearCart, totalPrice, totalItems } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [zoneResult, setZoneResult] = useState<ZoneCheckResult | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [validating, setValidating] = useState(false);

  // Loyalty state
  const [balance, setBalance] = useState(0);
  const [redeemPts, setRedeemPts] = useState(0);

  const subtotal = totalPrice;
  const couponDiscount = coupon?.discount ?? 0;
  const loyaltyDiscount = Math.min(redeemPts * POINT_VALUE_RUPEES, subtotal - couponDiscount);
  const deliveryCharges = zoneResult?.allowed ? zoneResult.charges ?? 0 : 0;
  const grandTotal = Math.max(0, subtotal - couponDiscount - loyaltyDiscount + deliveryCharges);
  const willEarn = calcEarn(grandTotal);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
        if (data) {
          setCustomerName((data as any).full_name || "");
          setPhone((data as any).phone || "");
          setAddress((data as any).address || "");
        }
      });
      getBalance(user.id).then(setBalance);
    }
  }, [user]);

  // Re-validate coupon if subtotal drops below min
  useEffect(() => {
    if (coupon && subtotal < coupon.coupon.min_order_amount) {
      setCoupon(null);
      toast({ title: "Coupon removed", description: "Order no longer meets minimum.", variant: "destructive" });
    }
  }, [subtotal, coupon, toast]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    if (!user) {
      toast({ title: "Sign in to use coupons", variant: "destructive" });
      navigate("/auth");
      return;
    }
    setValidating(true);
    const res = await validateCoupon(couponInput, subtotal);
    if (res.ok === true) {
      setCoupon(res.data);
      toast({ title: `Coupon applied! −Rs. ${res.data.discount.toLocaleString()}` });
    } else {
      toast({ title: (res as { ok: false; error: string }).error, variant: "destructive" });
    }
    setValidating(false);
  };

  const handleProceedToCheckout = () => {
    if (!user) {
      toast({ title: "Please sign in to place an order", variant: "destructive" });
      navigate("/auth");
      return;
    }
    setShowCheckout(true);
  };

  const generateWhatsAppMessage = () => {
    const itemsList = items.map((i) => `- ${i.title} x${i.quantity} = Rs.${(i.price * i.quantity).toLocaleString()}`).join("\n");
    const mapLink = coords ? `\n🗺️ *GPS:* https://maps.google.com/?q=${coords.lat},${coords.lng}` : "";
    const zoneLine = zoneResult?.allowed
      ? `\n📍 *Area:* ${zoneResult.label}\n🚚 *Delivery:* Rs.${deliveryCharges.toLocaleString()}${mapLink}`
      : "";
    const couponLine = coupon ? `\n🎟️ *Coupon (${coupon.coupon.code}):* −Rs.${couponDiscount.toLocaleString()}` : "";
    const loyaltyLine = loyaltyDiscount > 0 ? `\n⭐ *Loyalty (${redeemPts} pts):* −Rs.${loyaltyDiscount.toLocaleString()}` : "";
    return encodeURIComponent(
      `🛒 *New Order - Pizza King*\n\n👤 *Name:* ${customerName || "Guest"}\n📞 *Phone:* ${phone || "N/A"}\n📍 *Address:* ${address || "N/A"}${zoneLine}\n\n📋 *Order:*\n${itemsList}\n\n💰 *Subtotal: Rs.${subtotal.toLocaleString()}*${couponLine}${loyaltyLine}\n💰 *Grand Total: Rs.${grandTotal.toLocaleString()}*\n\n💵 Payment: Cash on Delivery`
    );
  };

  const handleWhatsAppOrder = () => {
    if (!customerName.trim() || !phone.trim() || !address.trim()) {
      toast({ title: "Please fill all delivery details first", variant: "destructive" });
      setShowCheckout(true);
      return;
    }
    if (!zoneResult || !zoneResult.allowed) {
      toast({ title: "Out of delivery zone", description: zoneResult?.reason || "Please confirm your location on the map", variant: "destructive" });
      return;
    }
    window.open(`https://wa.me/923173712950?text=${generateWhatsAppMessage()}`, "_blank");
    toast({ title: "Order sent to WhatsApp! 📱" });
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!customerName.trim() || !phone.trim() || !address.trim()) {
      toast({ title: "Please fill all delivery details", variant: "destructive" });
      return;
    }
    if (!zoneResult || !zoneResult.allowed) {
      toast({ title: "Sorry, we don't deliver here", description: zoneResult?.reason || "Please set your location on the map", variant: "destructive" });
      return;
    }
    setPlacing(true);
    try {
      try {
        await supabase.from("profiles").upsert({
          user_id: user.id,
          full_name: customerName,
          phone,
          address,
        } as any);
      } catch (profErr) {
        console.warn("Profile update skipped:", profErr);
      }

      const { data: placedOrderId, error: placeError } = await (supabase as any).rpc("place_customer_order", {
        p_items: items.map((item) => ({ id: item.id, quantity: item.quantity })),
        p_customer_name: customerName.trim(),
        p_customer_phone: phone.trim(),
        p_customer_address: address.trim(),
        p_delivery_lat: coords?.lat ?? null,
        p_delivery_lng: coords?.lng ?? null,
        p_coupon_code: coupon?.coupon.code ?? null,
        p_points_redeemed: redeemPts,
      });
      if (placeError || !placedOrderId) throw placeError || new Error("Order could not be completed.");

      const { data: order, error: orderReadError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", placedOrderId)
        .single();
      if (orderReadError || !order) throw orderReadError || new Error("Order was placed, but its receipt could not be loaded.");

      const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", placedOrderId);
      if (itemsError) throw itemsError;

      // Notify admins
      sendPush({
        scope: "admin",
        title: "🛒 New Order",
        body: `${customerName} • Rs. ${grandTotal.toLocaleString()} • ${totalItems} items`,
        url: "/admin/orders",
      });

      window.open(`https://wa.me/923173712950?text=${generateWhatsAppMessage()}`, "_blank");
      clearCart();
      toast({ title: "Order Placed Successfully! 🎉" });
      navigate("/order-success", { state: { orderId: placedOrderId } });
    } catch (err: any) {
      toast({ title: "Order Failed", description: err.message, variant: "destructive" });
    }
    setPlacing(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-5 lg:px-12 max-w-4xl">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-heading font-extrabold text-foreground mb-8 flex items-center gap-3">
            <ShoppingBag className="w-9 h-9 text-primary" /> Your Cart
          </motion.h1>

          {items.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <ShoppingBag className="w-20 h-20 text-muted-foreground/30 mx-auto mb-6" />
              <p className="text-xl text-muted-foreground mb-6">Your cart is empty</p>
              <Link to="/menu"><Button className="rounded-full px-8">Browse Menu</Button></Link>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <AnimatePresence>
                  {items.map((item) => (
                    <motion.div key={item.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                      className="bg-card rounded-2xl shadow-md p-4 flex items-center gap-4">
                      <img src={item.imageUrl} alt={item.title} className="w-20 h-20 rounded-xl object-cover" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground truncate">{item.title}</h3>
                        <p className="text-primary font-semibold">Rs. {item.price.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center font-bold">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="font-bold text-foreground w-24 text-right hidden sm:block">Rs. {(item.price * item.quantity).toLocaleString()}</p>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeItem(item.id)}>
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Coupon */}
                <div className="bg-card rounded-2xl shadow-md p-5">
                  <h3 className="text-base font-heading font-bold mb-3 flex items-center gap-2">
                    <TicketPercent className="w-5 h-5 text-primary" /> Have a coupon?
                  </h3>
                  {coupon ? (
                    <div className="flex items-center justify-between bg-success/10 border border-success/30 rounded-xl px-4 py-3">
                      <div>
                        <p className="font-bold text-success">{coupon.coupon.code}</p>
                        <p className="text-xs text-muted-foreground">−Rs. {couponDiscount.toLocaleString()} {coupon.coupon.description ? `• ${coupon.coupon.description}` : ""}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setCoupon(null)}><X className="w-4 h-4" /></Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="Enter code"
                        className="rounded-full"
                        maxLength={32}
                      />
                      <Button onClick={handleApplyCoupon} disabled={validating || !couponInput.trim()} className="rounded-full">
                        {validating ? "..." : "Apply"}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Loyalty */}
                {user && balance >= MIN_REDEEM_POINTS && (
                  <div className="bg-card rounded-2xl shadow-md p-5">
                    <h3 className="text-base font-heading font-bold mb-2 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-highlight" /> Redeem Loyalty Points
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      You have <span className="font-bold text-foreground">{balance}</span> pts ({POINT_VALUE_RUPEES} pt = Rs. {POINT_VALUE_RUPEES}). Minimum redeem: {MIN_REDEEM_POINTS} pts.
                    </p>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min={0}
                        max={Math.min(balance, Math.floor((subtotal - couponDiscount) / POINT_VALUE_RUPEES))}
                        value={redeemPts || ""}
                        onChange={(e) => {
                          const n = Math.max(0, parseInt(e.target.value) || 0);
                          const cap = Math.min(balance, Math.floor((subtotal - couponDiscount) / POINT_VALUE_RUPEES));
                          setRedeemPts(Math.min(n, cap));
                        }}
                        placeholder="0"
                        className="rounded-full"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full shrink-0"
                        onClick={() => setRedeemPts(Math.min(balance, Math.floor((subtotal - couponDiscount) / POINT_VALUE_RUPEES)))}
                      >
                        Max
                      </Button>
                    </div>
                    {loyaltyDiscount > 0 && (
                      <p className="text-xs text-success font-semibold mt-2">−Rs. {loyaltyDiscount.toLocaleString()} applied</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="bg-card rounded-2xl shadow-md p-6">
                  <h3 className="text-lg font-heading font-bold text-foreground mb-4">Order Summary</h3>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Items ({totalItems})</span>
                    <span className="font-semibold">Rs. {subtotal.toLocaleString()}</span>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-sm mb-2 text-success">
                      <span>Coupon</span>
                      <span className="font-semibold">−Rs. {couponDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  {loyaltyDiscount > 0 && (
                    <div className="flex justify-between text-sm mb-2 text-success">
                      <span>Loyalty ({redeemPts} pts)</span>
                      <span className="font-semibold">−Rs. {loyaltyDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className={`font-semibold ${deliveryCharges === 0 ? "text-success" : "text-foreground"}`}>
                      {zoneResult?.allowed
                        ? deliveryCharges === 0
                          ? "Free"
                          : `Rs. ${deliveryCharges.toLocaleString()}`
                        : "—"}
                    </span>
                  </div>
                  <div className="border-t border-border my-4" />
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span className="text-primary">Rs. {grandTotal.toLocaleString()}</span>
                  </div>
                  {willEarn > 0 && user && (
                    <p className="text-xs text-highlight font-semibold mt-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> You'll earn {willEarn} pts on this order
                    </p>
                  )}

                  {!showCheckout && (
                    <div className="space-y-3 mt-6">
                      <Button className="w-full h-12 rounded-full font-bold" onClick={handleProceedToCheckout}>
                        Proceed to Checkout
                      </Button>
                      <Button variant="outline" className="w-full h-12 rounded-full font-bold gap-2 border-success text-success hover:bg-success/10" onClick={() => { setShowCheckout(true); }}>
                        <MessageCircle className="w-5 h-5" /> Order via WhatsApp
                      </Button>
                    </div>
                  )}
                </div>

                {showCheckout && (
                  <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    onSubmit={handlePlaceOrder} className="bg-card rounded-2xl shadow-md p-6 space-y-4">
                    <h3 className="text-lg font-heading font-bold text-foreground mb-2">Delivery Details</h3>
                    <div>
                      <Label htmlFor="name" className="flex items-center gap-2 mb-1"><User className="w-4 h-4" /> Full Name</Label>
                      <Input id="name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Your name" required maxLength={100} />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="flex items-center gap-2 mb-1"><Phone className="w-4 h-4" /> Phone Number</Label>
                      <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 343 1497982" required maxLength={20} />
                    </div>
                    <div>
                      <Label htmlFor="address" className="flex items-center gap-2 mb-1"><MapPin className="w-4 h-4" /> Delivery Address</Label>
                      <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Your delivery address" required maxLength={255} />
                    </div>
                    <div className="border-t border-border pt-4">
                      <DeliveryZoneCheck
                        onResult={(r, c) => {
                          setZoneResult(r);
                          setCoords(c);
                        }}
                      />
                    </div>
                    <div className="bg-muted/30 rounded-xl p-3 text-sm text-muted-foreground">
                      💵 Payment: <span className="font-semibold text-foreground">Cash on Delivery</span>
                    </div>
                    <div className="space-y-3">
                      <Button
                        type="submit"
                        className="w-full h-12 rounded-full font-bold"
                        disabled={placing || !zoneResult?.allowed}
                      >
                        {placing
                          ? "Placing Order..."
                          : !zoneResult
                          ? "Set your delivery location"
                          : !zoneResult.allowed
                          ? "Out of Delivery Zone"
                          : "Place Order & Send to WhatsApp"}
                      </Button>
                      <Button type="button" variant="outline" onClick={handleWhatsAppOrder}
                        className="w-full h-12 rounded-full font-bold gap-2 border-success text-success hover:bg-success/10"
                        disabled={!zoneResult?.allowed}>
                        <MessageCircle className="w-5 h-5" /> WhatsApp Only (No Account)
                      </Button>
                    </div>
                  </motion.form>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CartPage;
