import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  ShoppingCart,
  Lock,
  CheckCircle,
  Zap,
  Map,
  DollarSign,
  Users,
  Settings,
  Bell,
  MessageSquare,
  FileText,
  TrendingUp,
  Tag,
  Bike,
  MapPin,
  TicketPercent,
  Package,
  X,
  Star,
  Wallet,
  Clock,
  History,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MODULE_PRICES, MODULES, useSubscription } from "@/contexts/SubscriptionContext";

// ─── Types ───────────────────────────────────────────────────────────────────

type CartItem = {
  moduleKey: string;
  moduleName: string;
  planType: "one-time" | "monthly";
  price: number;
};

type FilterTab = "all" | "admin" | "rider";

// ─── Module icon map ──────────────────────────────────────────────────────────

function getModuleIcon(key: string) {
  const iconMap: Record<string, React.ElementType> = {
    "/admin/deals": Tag,
    "/admin/categories": Package,
    "/admin/coupons": TicketPercent,
    "/admin/customers": Users,
    "/admin/riders": Bike,
    "/admin/delivery-zones": MapPin,
    "/admin/reviews": Star,
    "/admin/settings": Settings,
    "/rider/map": Map,
    "/rider/earnings": DollarSign,
    "/rider/wallet": Wallet,
    "/rider/history": History,
    "/rider/schedule": Clock,
    "/rider/notifications": Bell,
    "/rider/chat": MessageSquare,
    "/rider/reviews": Star,
    "/rider/performance": TrendingUp,
    "/rider/documents": FileText,
    "/rider/help": HelpCircle,
    "/rider/settings": Settings,
  };
  return iconMap[key] ?? Zap;
}

// ─── Module features map ──────────────────────────────────────────────────────

const MODULE_FEATURES: Record<string, string[]> = {
  "/admin/deals": [
    "Create flash deals with time limits",
    "Set percentage or fixed discounts",
    "Schedule deals in advance",
    "Deal performance analytics",
  ],
  "/admin/categories": [
    "Custom category names & icons",
    "Drag-and-drop ordering",
    "Category-level visibility controls",
    "Sub-category support",
  ],
  "/admin/coupons": [
    "Generate unique coupon codes",
    "Set usage limits per coupon",
    "Minimum order value rules",
    "Track redemption history",
  ],
  "/admin/customers": [
    "Full customer profiles",
    "Order history per customer",
    "Customer segmentation",
    "Export customer data",
  ],
  "/admin/riders": [
    "Add & manage rider accounts",
    "Assign orders to riders",
    "Track rider availability",
    "Rider performance overview",
  ],
  "/admin/delivery-zones": [
    "Draw delivery zones on map",
    "Zone-based delivery charges",
    "Multiple zone support",
    "Zone availability schedules",
  ],
  "/admin/reviews": [
    "View all customer reviews",
    "Respond to reviews publicly",
    "Flag inappropriate reviews",
    "Rating trend analytics",
  ],
  "/admin/settings": [
    "Full app configuration",
    "Branding & logo settings",
    "Tax & fee configuration",
    "Notification preferences",
  ],
  "/rider/map": [
    "Real-time GPS location",
    "Turn-by-turn navigation",
    "Customer location pin",
    "Route optimization",
  ],
  "/rider/earnings": [
    "Daily & weekly earnings",
    "Bonus tracking",
    "Payout history",
    "Earnings breakdown by order",
  ],
  "/rider/wallet": [
    "Wallet balance overview",
    "Withdraw to bank",
    "Transaction history",
    "Auto-credit on delivery",
  ],
  "/rider/history": [
    "Complete delivery history",
    "Filter by date range",
    "Order details per delivery",
    "Export history as PDF",
  ],
  "/rider/schedule": [
    "Set weekly availability",
    "Shift management",
    "Swap shift requests",
    "Attendance tracking",
  ],
  "/rider/notifications": [
    "New order alerts",
    "Zone updates",
    "Bonus & promo notifications",
    "System announcements",
  ],
  "/rider/chat": [
    "Chat with support team",
    "Media message support",
    "Issue resolution tracking",
    "Chat history",
  ],
  "/rider/reviews": [
    "View customer ratings",
    "Monthly rating averages",
    "Feedback from customers",
    "Performance badges",
  ],
  "/rider/performance": [
    "Delivery success rate",
    "Average delivery time",
    "Weekly performance graphs",
    "Compare with team averages",
  ],
  "/rider/documents": [
    "Upload CNIC & license",
    "Document status tracking",
    "Renewal reminders",
    "Secure PDF/image storage",
  ],
  "/rider/help": [
    "FAQ & guides",
    "Submit support tickets",
    "Video tutorials",
    "Live chat support access",
  ],
  "/rider/settings": [
    "Profile & contact settings",
    "Notification preferences",
    "Language selection",
    "Account security",
  ],
};

// ─── Module Card ──────────────────────────────────────────────────────────────

interface ModuleCardProps {
  moduleKey: string;
  cart: CartItem[];
  onAddToCart: (item: CartItem) => void;
}

function ModuleCard({ moduleKey, cart, onAddToCart }: ModuleCardProps) {
  const { isModuleLocked } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<"one-time" | "monthly">("one-time");
  const navigate = useNavigate();

  const price = MODULE_PRICES[moduleKey];
  const mod = MODULES.find((m) => m.key === moduleKey);
  const Icon = getModuleIcon(moduleKey);
  const locked = isModuleLocked(moduleKey);
  const features = MODULE_FEATURES[moduleKey] ?? [];

  const inCart = cart.some(
    (c) => c.moduleKey === moduleKey && c.planType === selectedPlan
  );
  const isUnlocked = !locked;

  const currentPrice =
    selectedPlan === "one-time" ? price.oneTime : price.monthly;

  const handleAddToCart = () => {
    if (inCart || isUnlocked) return;
    onAddToCart({
      moduleKey,
      moduleName: price.name,
      planType: selectedPlan,
      price: currentPrice,
    });
  };

  return (
    <Card className="flex flex-col h-full border hover:border-orange-300 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-orange-600" />
          </div>
          {isUnlocked ? (
            <Badge className="bg-green-100 text-green-700 border-green-200 shrink-0">
              Active ✅
            </Badge>
          ) : (
            <Badge variant="outline" className="text-orange-600 border-orange-300 shrink-0">
              Locked 🔒
            </Badge>
          )}
        </div>
        <CardTitle className="text-base mt-2">{price.name}</CardTitle>
        <p className="text-sm text-muted-foreground">{price.description}</p>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-4">
        {/* Features */}
        <ul className="space-y-1.5 flex-1">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
        </ul>

        {/* Plan toggle */}
        <div className="flex rounded-lg border overflow-hidden text-sm">
          <button
            type="button"
            onClick={() => setSelectedPlan("one-time")}
            className={`flex-1 py-1.5 transition-colors ${
              selectedPlan === "one-time"
                ? "bg-orange-500 text-white font-medium"
                : "bg-background hover:bg-muted text-muted-foreground"
            }`}
          >
            One-time
          </button>
          <button
            type="button"
            onClick={() => setSelectedPlan("monthly")}
            className={`flex-1 py-1.5 transition-colors ${
              selectedPlan === "monthly"
                ? "bg-orange-500 text-white font-medium"
                : "bg-background hover:bg-muted text-muted-foreground"
            }`}
          >
            Monthly
          </button>
        </div>

        {/* Price */}
        <div className="text-center">
          <span className="text-2xl font-bold text-foreground">
            PKR {currentPrice.toLocaleString()}
          </span>
          {selectedPlan === "monthly" && (
            <span className="text-sm text-muted-foreground">/mo</span>
          )}
        </div>

        {/* Action button */}
        {isUnlocked ? (
          <Button disabled variant="outline" className="w-full text-green-600">
            Already Owned
          </Button>
        ) : inCart ? (
          <Button disabled className="w-full bg-green-600 text-white">
            In Cart ✓
          </Button>
        ) : (
          <Button
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Add to Cart
          </Button>
        )}

        {/* Quick buy link */}
        {!isUnlocked && (
          <button
            type="button"
            onClick={() =>
              navigate(
                `/unlock?module=${encodeURIComponent(moduleKey)}&name=${encodeURIComponent(price.name)}`
              )
            }
            className="text-xs text-orange-600 hover:underline text-center"
          >
            Buy this module only →
          </button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Free Module Card ─────────────────────────────────────────────────────────

function FreeModuleCard({ moduleKey }: { moduleKey: string }) {
  const mod = MODULES.find((m) => m.key === moduleKey);
  const Icon = getModuleIcon(moduleKey);
  const name = mod?.name ?? moduleKey;

  return (
    <Card className="flex flex-col border-green-200 bg-green-50/40">
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-green-600" />
            </div>
            <span className="font-medium text-sm">{name}</span>
          </div>
          <Badge className="bg-green-100 text-green-700 border-green-200 shrink-0">
            Always Free
          </Badge>
        </div>
        <Button disabled variant="outline" className="w-full text-xs h-8">
          Already Included
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Cart Drawer ──────────────────────────────────────────────────────────────

interface CartDrawerProps {
  cart: CartItem[];
  onRemove: (moduleKey: string, planType: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckout: () => void;
}

function CartDrawer({ cart, onRemove, open, onOpenChange, onCheckout }: CartDrawerProps) {
  const total = cart.reduce((sum, item) => sum + item.price, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-500" />
            Your Cart ({cart.length})
          </SheetTitle>
        </SheetHeader>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <ShoppingCart className="w-12 h-12 opacity-20" />
            <p>Your cart is empty</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-3 py-4">
              {cart.map((item) => (
                <div
                  key={`${item.moduleKey}-${item.planType}`}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{item.moduleName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{item.planType}</p>
                    <p className="text-sm font-semibold text-orange-600 mt-0.5">
                      PKR {item.price.toLocaleString()}
                      {item.planType === "monthly" && "/mo"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(item.moduleKey, item.planType)}
                    className="text-muted-foreground hover:text-red-500 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-orange-600">PKR {total.toLocaleString()}</span>
              </div>
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                onClick={onCheckout}
              >
                Proceed to Checkout →
              </Button>
              <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                Continue Shopping
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FeatureStorePage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [cartOpen, setCartOpen] = useState(false);

  const paidModules = MODULES.filter((m) => !m.free);
  const freeModules = MODULES.filter((m) => m.free);

  const filteredPaid = paidModules.filter((m) => {
    if (filter === "admin") return m.group === "admin";
    if (filter === "rider") return m.group === "rider";
    return true;
  });

  const filteredFree = freeModules.filter((m) => {
    if (filter === "admin") return m.group === "admin";
    if (filter === "rider") return m.group === "rider";
    return true;
  });

  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const exists = prev.some(
        (c) => c.moduleKey === item.moduleKey && c.planType === item.planType
      );
      return exists ? prev : [...prev, item];
    });
  };

  const removeFromCart = (moduleKey: string, planType: string) => {
    setCart((prev) =>
      prev.filter((c) => !(c.moduleKey === moduleKey && c.planType === planType))
    );
  };

  const handleCheckout = () => {
    sessionStorage.setItem("feature_store_cart", JSON.stringify(cart));
    setCartOpen(false);
    navigate("/checkout");
  };

  const filterLabels: { value: FilterTab; label: string }[] = [
    { value: "all", label: "All Modules" },
    { value: "admin", label: "Admin Modules" },
    { value: "rider", label: "Rider Modules" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-orange-500" />
              Feature Store
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Expand your Pizza King capabilities
            </p>
          </div>

          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
                onClick={() => setCartOpen(true)}
              >
                <ShoppingCart className="w-4 h-4" />
                View Cart
                <span className="bg-white text-orange-600 rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">
                  {cart.length}
                </span>
              </Button>
            )}
            {cart.length === 0 && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCartOpen(true)}
                className="relative"
              >
                <ShoppingCart className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {filterLabels.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === tab.value
                  ? "bg-orange-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Premium modules */}
        {filteredPaid.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Premium Modules</h2>
              <p className="text-sm text-muted-foreground">
                Unlock powerful features to grow your business
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPaid.map((mod) => (
                <ModuleCard
                  key={mod.key}
                  moduleKey={mod.key}
                  cart={cart}
                  onAddToCart={addToCart}
                />
              ))}
            </div>
          </section>
        )}

        {/* Free modules */}
        {filteredFree.length > 0 && (
          <>
            <Separator />
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Included Free</h2>
                <p className="text-sm text-muted-foreground">
                  These modules are always available at no cost
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFree.map((mod) => (
                  <FreeModuleCard key={mod.key} moduleKey={mod.key} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      {/* Cart drawer */}
      <CartDrawer
        cart={cart}
        onRemove={removeFromCart}
        open={cartOpen}
        onOpenChange={setCartOpen}
        onCheckout={handleCheckout}
      />
    </div>
  );
}
