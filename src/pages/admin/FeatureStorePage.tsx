import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, CheckCircle, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePackages, type Package } from "@/hooks/usePackages";
import { useSubscription } from "@/contexts/SubscriptionContext";

type BillingType = "monthly" | "one_time";

// ─── Plan card ──────────────────────────────────────────────────────────────

interface PlanCardProps {
  pkg: Package;
  billing: BillingType;
  activePlanKey: string | null;
  activeTier: number | null;
  inCart: boolean;
  onBuy: (pkg: Package) => void;
}

function PlanCard({
  pkg,
  billing,
  activePlanKey,
  activeTier,
  inCart,
  onBuy,
}: PlanCardProps) {
  const hasActive = activePlanKey != null;
  const isCurrent = hasActive && pkg.planKey === activePlanKey;
  const isUpgrade = hasActive && activeTier != null && pkg.tier > activeTier;
  const isLower = hasActive && activeTier != null && pkg.tier < activeTier;

  const price = billing === "monthly" ? pkg.monthlyPrice : pkg.oneTimePrice;

  let button: React.ReactNode;
  if (isCurrent) {
    button = (
      <Button disabled variant="outline" className="w-full text-green-600">
        Current Plan
      </Button>
    );
  } else if (isUpgrade) {
    button = (
      <Button
        className="w-full bg-orange-500 hover:bg-orange-600 text-white"
        disabled={inCart}
        onClick={() => onBuy(pkg)}
      >
        {inCart ? "In Cart ✓" : "Upgrade"}
      </Button>
    );
  } else if (isLower) {
    button = (
      <Button disabled variant="outline" className="w-full">
        Included in current
      </Button>
    );
  } else {
    button = (
      <Button
        className="w-full bg-orange-500 hover:bg-orange-600 text-white"
        disabled={inCart}
        onClick={() => onBuy(pkg)}
      >
        {inCart ? "In Cart ✓" : "Buy Now"}
      </Button>
    );
  }

  return (
    <Card
      className={`flex flex-col h-full transition-transform hover:scale-[1.02] ${
        pkg.isPopular
          ? "border-orange-300 shadow-md ring-1 ring-orange-200"
          : "border"
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base">{pkg.name}</CardTitle>
            <Badge variant="outline" className="mt-1 text-xs">
              Tier {pkg.tier}
            </Badge>
          </div>
          {pkg.isPopular && (
            <Badge className="bg-orange-100 text-orange-700 border-orange-200 gap-1">
              <Crown className="w-3 h-3" />
              Most Popular
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-2">{pkg.description}</p>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-4">
        {/* Price */}
        <div className="text-center">
          <span className="text-3xl font-bold text-foreground">
            PKR {price.toLocaleString()}
          </span>
          {billing === "monthly" && (
            <span className="text-sm text-muted-foreground">/mo</span>
          )}
          {billing === "one_time" && (
            <span className="text-sm text-muted-foreground"> one-time</span>
          )}
        </div>

        {/* Module count */}
        <p className="text-xs text-center text-muted-foreground">
          Includes {pkg.moduleKeys.length} module
          {pkg.moduleKeys.length === 1 ? "" : "s"}
        </p>

        {/* Features */}
        <ul className="space-y-1.5 flex-1">
          {pkg.features.map((f, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
          {pkg.features.length === 0 && (
            <li className="text-sm text-muted-foreground">No features listed.</li>
          )}
        </ul>

        {button}
      </CardContent>
    </Card>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  subtitle: string;
  category: "admin" | "rider";
  packages: Package[];
  billing: BillingType;
  loading: boolean;
  activePlanKey: string | null;
  activeTier: number | null;
  inCartKey: string | null;
  onBuy: (pkg: Package) => void;
}

function PlanSection({
  title,
  subtitle,
  category,
  packages,
  billing,
  loading,
  activePlanKey,
  activeTier,
  inCartKey,
  onBuy,
}: SectionProps) {
  const list = packages.filter((p) => p.category === category);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="text-center text-muted-foreground py-10 border rounded-lg border-dashed">
          No plans available for this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((p) => (
            <PlanCard
              key={p.planKey}
              pkg={p}
              billing={billing}
              activePlanKey={activePlanKey}
              activeTier={activeTier}
              inCart={inCartKey === p.planKey}
              onBuy={onBuy}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

// Resolve the tier of a plan_key from the fetched package list (defensive).
function findTier(packages: Package[], planKey: string): number | null {
  const p = packages.find((x) => x.planKey === planKey);
  return p ? p.tier : null;
}

export default function FeatureStorePage() {
  const navigate = useNavigate();
  const { packages, loading } = usePackages();
  const { hasActivePlan, activePlans } = useSubscription();

  const [billing, setBilling] = useState<BillingType>("monthly");
  const [cartKey, setCartKey] = useState<string | null>(() => {
    try {
      const raw = sessionStorage.getItem("feature_store_cart");
      return raw ? (JSON.parse(raw).planKey as string) ?? null : null;
    } catch {
      return null;
    }
  });

  // Active plan per category (first match wins). hasActivePlan short-circuits
  // the lookup when nothing is active in the category.
  const activeFor = (category: "admin" | "rider") =>
    hasActivePlan(category) ? activePlans.find((p) => p.category === category) ?? null : null;

  const handleBuy = (pkg: Package) => {
    // Amount is always the fetched package price for the selected billing —
    // never client-fabricated.
    const amount = billing === "monthly" ? pkg.monthlyPrice : pkg.oneTimePrice;
    sessionStorage.setItem(
      "feature_store_cart",
      JSON.stringify({
        planKey: pkg.planKey,
        packageName: pkg.name,
        category: pkg.category,
        billingType: billing,
        amount,
      })
    );
    setCartKey(pkg.planKey);
    navigate("/checkout");
  };

  const renderSection = (category: "admin" | "rider") => {
    const active = activeFor(category);
    return (
      <PlanSection
        title={category === "admin" ? "Restaurant Admin" : "Delivery Rider"}
        subtitle={
          category === "admin"
            ? "Power up your restaurant with admin plans"
            : "Equip your riders with pro delivery tools"
        }
        category={category}
        packages={packages}
        billing={billing}
        loading={loading}
        activePlanKey={active?.planKey ?? null}
        activeTier={active ? findTier(packages, active.planKey) : null}
        inCartKey={cartKey}
        onBuy={handleBuy}
      />
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header with global billing toggle */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-orange-500" />
              Pricing and Plans
            </h1>
            <p className="text-xs text-muted-foreground">
              Choose a plan — monthly subscription or one-time purchase
            </p>
          </div>

          <Tabs value={billing} onValueChange={(v) => setBilling(v as BillingType)}>
            <TabsList>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="one_time">One-time</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {renderSection("admin")}
        {renderSection("rider")}

        {!loading && packages.length === 0 && (
          <div className="text-center text-muted-foreground py-16">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No plans are available right now. Please check back later.</p>
          </div>
        )}
      </div>
    </div>
  );
}
