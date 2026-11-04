import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Phone, MapPin, Mail, ShoppingBag, Save, Package, Clock,
  CheckCircle2, XCircle, Truck, ChefHat, Sparkles, Bell, Gift, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SavedAddresses from "@/components/SavedAddresses";
import { getBalance } from "@/lib/loyalty";

interface Profile {
  full_name: string | null;
  phone: string | null;
  address: string | null;
  referral_code: string | null;
  notification_prefs: { order_updates: boolean; promotions: boolean; new_items: boolean };
  loyalty_points: number;
}

interface Order {
  id: string;
  total: number;
  status: string;
  created_at: string;
}

interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  price: number;
}

interface LoyaltyTx {
  id: string;
  points: number;
  reason: string;
  created_at: string;
}

const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
  pending: { icon: Clock, color: "text-warning", bg: "bg-warning/10" },
  confirmed: { icon: CheckCircle2, color: "text-info", bg: "bg-info/10" },
  preparing: { icon: ChefHat, color: "text-primary", bg: "bg-primary/10" },
  "out for delivery": { icon: Truck, color: "text-accent", bg: "bg-accent/10" },
  delivered: { icon: Package, color: "text-success", bg: "bg-success/10" },
  cancelled: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
};

const TAB_DEFS = [
  { key: "profile", label: "Profile", icon: User },
  { key: "orders", label: "Orders", icon: ShoppingBag },
  { key: "addresses", label: "Addresses", icon: MapPin },
  { key: "loyalty", label: "Loyalty", icon: Sparkles },
  { key: "notifications", label: "Alerts", icon: Bell },
  { key: "referral", label: "Refer", icon: Gift },
] as const;

type TabKey = (typeof TAB_DEFS)[number]["key"];

const genReferral = (id: string) =>
  ("AMF" + id.replace(/-/g, "").slice(0, 6)).toUpperCase();

const ProfilePage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    phone: "",
    address: "",
    referral_code: null,
    notification_prefs: { order_updates: true, promotions: true, new_items: false },
    loyalty_points: 0,
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [loyaltyTx, setLoyaltyTx] = useState<LoyaltyTx[]>([]);
  const [balance, setBalance] = useState(0);
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const fetchData = async () => {
    if (!user) return;
    const [profileRes, ordersRes, loyaltyRes, refRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("loyalty_transactions" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("referrals" as any).select("id").eq("referrer_id", user.id),
    ]);
    if (profileRes.data) {
      const d = profileRes.data as any;
      const prefs = d.notification_prefs || { order_updates: true, promotions: true, new_items: false };
      let refCode = d.referral_code as string | null;
      if (!refCode) {
        refCode = genReferral(user.id);
        await supabase.from("profiles").update({ referral_code: refCode } as any).eq("user_id", user.id);
      }
      setProfile({
        full_name: d.full_name || "",
        phone: d.phone || "",
        address: d.address || "",
        referral_code: refCode,
        notification_prefs: prefs,
        loyalty_points: d.loyalty_points || 0,
      });
    }
    if (ordersRes.data) setOrders(ordersRes.data as unknown as Order[]);
    if (loyaltyRes.data) setLoyaltyTx(loyaltyRes.data as unknown as LoyaltyTx[]);
    if (refRes.data) setReferralCount((refRes.data as any[]).length);
    setBalance(await getBalance(user.id));
    setLoading(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        phone: profile.phone,
        address: profile.address,
      } as any)
      .eq("user_id", user.id);
    if (error) toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    else toast({ title: "Profile Updated! ✅" });
    setSaving(false);
  };

  const updatePref = async (key: keyof Profile["notification_prefs"], value: boolean) => {
    const next = { ...profile.notification_prefs, [key]: value };
    setProfile({ ...profile, notification_prefs: next });
    if (!user) return;
    await supabase.from("profiles").update({ notification_prefs: next } as any).eq("user_id", user.id);
    toast({ title: "Preferences saved" });
  };

  const copyReferral = async () => {
    if (!profile.referral_code) return;
    try {
      await navigator.clipboard.writeText(profile.referral_code);
      toast({ title: "Code copied! 📋" });
    } catch {
      toast({ title: profile.referral_code });
    }
  };

  const shareReferral = () => {
    if (!profile.referral_code) return;
    const url = `${window.location.origin}/auth?ref=${profile.referral_code}`;
    const msg = encodeURIComponent(`Join me on Pizza King and we both get a discount! Use code ${profile.referral_code} or sign up here: ${url}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const toggleOrderDetails = async (orderId: string) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
      return;
    }
    setExpandedOrder(orderId);
    if (!orderItems[orderId]) {
      const { data } = await supabase.from("order_items").select("*").eq("order_id", orderId);
      if (data) setOrderItems((prev) => ({ ...prev, [orderId]: data as unknown as OrderItem[] }));
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-5 lg:px-12 max-w-4xl space-y-6">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-5 lg:px-12 max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-3xl md:text-4xl font-heading font-extrabold text-foreground mb-2">My Account</h1>
            <p className="text-muted-foreground">{user?.email}</p>
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-1.5 mb-8 bg-card rounded-2xl p-1.5 shadow-sm border border-border/50 overflow-x-auto scrollbar-hide">
            {TAB_DEFS.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-4 py-2.5 rounded-xl font-medium transition-all text-sm whitespace-nowrap flex items-center gap-1.5 ${
                    active ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                  {t.key === "orders" && orders.length > 0 && (
                    <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${active ? "bg-primary-foreground/20" : "bg-muted"}`}>
                      {orders.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "profile" && (
                <>
                  <div className="bg-card rounded-2xl shadow-lg border border-border/50 p-6 md:p-8">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <User className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-xl font-heading font-bold text-foreground">
                          {profile.full_name || "Your Name"}
                        </h2>
                        <p className="text-muted-foreground text-sm flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" /> {user?.email}
                        </p>
                      </div>
                    </div>
                    <form onSubmit={handleSaveProfile} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <Label htmlFor="p-name" className="flex items-center gap-2 mb-1.5"><User className="w-4 h-4" /> Full Name</Label>
                          <Input id="p-name" value={profile.full_name || ""} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} className="h-12 rounded-xl" maxLength={100} />
                        </div>
                        <div>
                          <Label htmlFor="p-phone" className="flex items-center gap-2 mb-1.5"><Phone className="w-4 h-4" /> Phone Number</Label>
                          <Input id="p-phone" type="tel" value={profile.phone || ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="h-12 rounded-xl" maxLength={20} />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="p-address" className="flex items-center gap-2 mb-1.5"><MapPin className="w-4 h-4" /> Delivery Address</Label>
                        <Input id="p-address" value={profile.address || ""} onChange={(e) => setProfile({ ...profile, address: e.target.value })} className="h-12 rounded-xl" maxLength={255} />
                      </div>
                      <Button type="submit" className="h-12 rounded-xl px-8 gap-2 font-bold" disabled={saving}>
                        <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
                      </Button>
                    </form>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <Stat label="Total Orders" value={orders.length} />
                    <Stat label="Total Spent" value={`Rs. ${orders.reduce((s, o) => s + Number(o.total), 0).toLocaleString()}`} highlight />
                    <Stat label="Delivered" value={orders.filter((o) => o.status === "delivered").length} success />
                    <Stat label="Loyalty Points" value={balance} accent />
                  </div>
                </>
              )}

              {activeTab === "orders" && (
                <div className="space-y-4">
                  {orders.length === 0 ? (
                    <Empty
                      icon={ShoppingBag}
                      title="No orders yet"
                      cta="Browse Menu"
                      onCta={() => navigate("/menu")}
                    />
                  ) : (
                    orders.map((order) => {
                      const cfg = statusConfig[order.status] || statusConfig.pending;
                      const StatusIcon = cfg.icon;
                      return (
                        <motion.div key={order.id} layout className="bg-card rounded-2xl shadow-sm border border-border/50 overflow-hidden">
                          <button onClick={() => toggleOrderDetails(order.id)} className="w-full p-5 flex items-center justify-between hover:bg-muted/20 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center`}>
                                <StatusIcon className={`w-5 h-5 ${cfg.color}`} />
                              </div>
                              <div className="text-left">
                                <p className="font-bold text-foreground">Order #{order.id.slice(0, 8)}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-primary text-lg">Rs. {Number(order.total).toLocaleString()}</p>
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${cfg.bg} ${cfg.color}`}>
                                {order.status}
                              </span>
                            </div>
                          </button>
                          <AnimatePresence>
                            {expandedOrder === order.id && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-5 border-t border-border/50">
                                  <p className="text-sm font-semibold text-muted-foreground mb-3 mt-4">Order Items</p>
                                  {!orderItems[order.id] ? (
                                    <Skeleton className="h-8 w-full" />
                                  ) : orderItems[order.id].length === 0 ? (
                                    <p className="text-muted-foreground text-sm">No items found</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {orderItems[order.id].map((item) => (
                                        <div key={item.id} className="flex justify-between text-sm py-2 border-b border-border/30 last:border-0">
                                          <span className="text-foreground">{item.title} <span className="text-muted-foreground">× {item.quantity}</span></span>
                                          <span className="font-semibold text-foreground">Rs. {(Number(item.price) * item.quantity).toLocaleString()}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              )}

              {activeTab === "addresses" && (
                <div className="bg-card rounded-2xl shadow-lg border border-border/50 p-6">
                  <SavedAddresses />
                </div>
              )}

              {activeTab === "loyalty" && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-highlight/20 via-accent/10 to-primary/5 rounded-2xl p-6 md:p-8 border border-highlight/30">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-highlight/20 flex items-center justify-center">
                        <Sparkles className="w-7 h-7 text-highlight" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Available balance</p>
                        <p className="text-4xl font-heading font-extrabold text-foreground">{balance} pts</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Earn 1 point per Rs. 100 spent. Redeem 50+ pts at checkout — each point is worth Rs. 1 off your order.
                    </p>
                  </div>
                  <div className="bg-card rounded-2xl border border-border/50 p-6">
                    <h3 className="font-heading font-bold text-foreground mb-4">Recent activity</h3>
                    {loyaltyTx.length === 0 ? (
                      <p className="text-muted-foreground text-sm text-center py-6">No loyalty activity yet — your first order will earn points 🎉</p>
                    ) : (
                      <div className="divide-y divide-border/50">
                        {loyaltyTx.map((tx) => (
                          <div key={tx.id} className="py-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-foreground capitalize">{tx.reason}</p>
                              <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                            </div>
                            <span className={`font-bold ${tx.points >= 0 ? "text-success" : "text-destructive"}`}>
                              {tx.points >= 0 ? "+" : ""}{tx.points} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "notifications" && (
                <div className="bg-card rounded-2xl shadow-lg border border-border/50 p-6 md:p-8 space-y-4">
                  <h3 className="font-heading font-bold text-foreground text-lg flex items-center gap-2"><Bell className="w-5 h-5 text-primary" /> Notification Preferences</h3>
                  <PrefRow
                    title="Order updates"
                    desc="Get notified when your order status changes."
                    checked={profile.notification_prefs.order_updates}
                    onChange={(v) => updatePref("order_updates", v)}
                  />
                  <PrefRow
                    title="Promotions & deals"
                    desc="Hear about discounts, coupons, and combos."
                    checked={profile.notification_prefs.promotions}
                    onChange={(v) => updatePref("promotions", v)}
                  />
                  <PrefRow
                    title="New menu items"
                    desc="Be first to try new dishes and seasonal specials."
                    checked={profile.notification_prefs.new_items}
                    onChange={(v) => updatePref("new_items", v)}
                  />
                </div>
              )}

              {activeTab === "referral" && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-primary/15 via-accent/10 to-highlight/10 rounded-2xl p-6 md:p-8 border border-primary/20">
                    <div className="flex items-center gap-3 mb-2">
                      <Gift className="w-6 h-6 text-primary" />
                      <h3 className="font-heading font-bold text-foreground text-lg">Refer & Earn</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-5">
                      Share your code — when friends place their first order, you both get bonus loyalty points.
                    </p>
                    <div className="flex items-center gap-3 bg-card rounded-xl p-4 border border-border/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Your code</p>
                        <p className="text-2xl font-heading font-extrabold text-primary truncate">{profile.referral_code}</p>
                      </div>
                      <Button variant="outline" size="icon" onClick={copyReferral}><Copy className="w-4 h-4" /></Button>
                      <Button onClick={shareReferral} className="rounded-full gap-2">
                        Share via WhatsApp
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Stat label="Friends referred" value={referralCount} highlight />
                    <Stat label="Bonus points earned" value={loyaltyTx.filter((t) => t.reason === "referral").reduce((s, t) => s + t.points, 0)} accent />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const Stat = ({ label, value, highlight, accent, success }: { label: string; value: number | string; highlight?: boolean; accent?: boolean; success?: boolean }) => (
  <div className="bg-card rounded-2xl p-5 shadow-sm border border-border/50 text-center">
    <p className={`text-2xl font-bold ${highlight ? "text-primary" : accent ? "text-highlight" : success ? "text-success" : "text-foreground"}`}>{value}</p>
    <p className="text-muted-foreground text-sm">{label}</p>
  </div>
);

const Empty = ({ icon: Icon, title, cta, onCta }: { icon: any; title: string; cta: string; onCta: () => void }) => (
  <div className="text-center py-20 bg-card rounded-2xl shadow-sm border border-border/50">
    <Icon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
    <p className="text-xl text-muted-foreground mb-4">{title}</p>
    <Button onClick={onCta} className="rounded-full px-8">{cta}</Button>
  </div>
);

const PrefRow = ({ title, desc, checked, onChange }: { title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-start justify-between gap-4 py-3 border-t border-border/50 first:border-t-0">
    <div>
      <p className="font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

export default ProfilePage;
