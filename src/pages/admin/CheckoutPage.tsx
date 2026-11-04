import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  CheckCircle,
  Upload,
  ShoppingCart,
  ArrowLeft,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { usePackages } from "@/hooks/usePackages";
import { insertPackageOrder } from "@/hooks/usePackageOrders";
import { MODULES } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CartItem {
  planKey: string;
  packageName: string;
  category: "admin" | "rider";
  billingType: "monthly" | "one_time";
  amount: number;
}

const ORDERS_KEY = "pizza_king_orders";
const CART_SESSION_KEY = "feature_store_cart";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [cart, setCart] = useState<CartItem | null>(() => {
    try {
      const stored = sessionStorage.getItem(CART_SESSION_KEY);
      return stored ? (JSON.parse(stored) as CartItem) : null;
    } catch {
      return null;
    }
  });

  const { packages, loading: packagesLoading } = usePackages();

  // Resolve the selected plan from the fetched package list. The cart's amount
  // is NEVER trusted for the DB insert — the price is re-derived below.
  const selectedPackage = useMemo(
    () => (cart ? packages.find((p) => p.planKey === cart.planKey) ?? null : null),
    [packages, cart]
  );

  const [form, setForm] = useState({
    buyerName: "",
    buyerEmail: "",
    buyerPhone: "",
    txnId: "",
  });
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderToken, setOrderToken] = useState<string | null>(null);
  const [paidAmount, setPaidAmount] = useState(0);
  const [duplicateWarn, setDuplicateWarn] = useState(false);
  const [duplicateChecking, setDuplicateChecking] = useState(false);

  // Redirect to the store when there is no cart (and not on the success screen).
  useEffect(() => {
    if (!cart && !submitted) {
      navigate("/feature-store", { replace: true });
    }
  }, [cart, submitted, navigate]);

  // Read the chosen screenshot into a data URL.
  useEffect(() => {
    if (!screenshotFile) {
      setScreenshotDataUrl(null);
      return;
    }
    let active = true;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (active) setScreenshotDataUrl((ev.target?.result as string) ?? null);
    };
    reader.onerror = () => {
      if (active) setScreenshotDataUrl(null);
    };
    reader.readAsDataURL(screenshotFile);
    return () => {
      active = false;
    };
  }, [screenshotFile]);

  // Re-derive the trusted amount from the fetched package (never the cart).
  const trustedAmount = useMemo(() => {
    if (!selectedPackage || !cart) return 0;
    return cart.billingType === "monthly"
      ? selectedPackage.monthlyPrice
      : selectedPackage.oneTimePrice;
  }, [selectedPackage, cart]);

  // Readable names for the modules included in this plan.
  const moduleNames = useMemo(() => {
    if (!selectedPackage) return [];
    return selectedPackage.moduleKeys.map(
      (key) => MODULES.find((m) => m.key === key)?.name ?? key
    );
  }, [selectedPackage]);

  // Best-effort duplicate check: an existing package_orders row for the same
  // plan_key + buyer_email with status pending/active. Warn only — never block.
  useEffect(() => {
    const email = form.buyerEmail.trim();
    const planKey = cart?.planKey;
    if (!planKey || !email || !EMAIL_RE.test(email)) {
      setDuplicateWarn(false);
      setDuplicateChecking(false);
      return;
    }
    let active = true;
    setDuplicateChecking(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("package_orders" as any)
        .select("id")
        .eq("plan_key", planKey)
        .eq("buyer_email", email)
        .in("status", ["pending", "active"]);
      if (!active) return;
      setDuplicateWarn(Array.isArray(data) && data.length > 0);
      setDuplicateChecking(false);
    }, 500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [form.buyerEmail, cart?.planKey]);

  const handleFieldChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart || !selectedPackage) {
      setFormError("Your plan could not be loaded. Please go back and choose a plan.");
      return;
    }
    if (!form.buyerName.trim()) { setFormError("Full name is required."); return; }
    if (!form.buyerEmail.trim()) { setFormError("Email is required."); return; }
    if (!form.buyerPhone.trim()) { setFormError("Phone is required."); return; }
    if (!form.txnId.trim()) { setFormError("Transaction ID is required."); return; }

    setSubmitting(true);
    setFormError("");

    // Capture everything we need before clearing the cart.
    const submitCart = cart;
    const submitPkg = selectedPackage;
    const submitAmount = trustedAmount;
    const buyer = {
      name: form.buyerName.trim(),
      email: form.buyerEmail.trim(),
      phone: form.buyerPhone.trim(),
      txnId: form.txnId.trim(),
    };

    try {
      const result = await insertPackageOrder({
        packageId: submitPkg.id,
        packageName: submitCart.packageName,
        planKey: submitCart.planKey,
        category: submitCart.category,
        billingType: submitCart.billingType,
        amount: submitAmount,
        buyerName: buyer.name,
        buyerEmail: buyer.email,
        buyerPhone: buyer.phone,
        txnId: buyer.txnId,
        screenshotDataUrl,
      });

      if (!result) {
        setFormError("Could not submit your order to the server. Please try again.");
        setSubmitting(false);
        return;
      }

      // Local backup (best-effort).
      try {
        const existing = JSON.parse(localStorage.getItem(ORDERS_KEY) ?? "[]") as unknown[];
        localStorage.setItem(
          ORDERS_KEY,
          JSON.stringify([
            ...existing,
            {
              id: `pkg_${Date.now()}`,
              planKey: submitCart.planKey,
              packageName: submitCart.packageName,
              category: submitCart.category,
              billingType: submitCart.billingType,
              amount: submitAmount,
              buyerName: buyer.name,
              buyerEmail: buyer.email,
              buyerPhone: buyer.phone,
              txnId: buyer.txnId,
              status: "pending",
              orderToken: result.orderToken,
              submittedAt: new Date().toISOString(),
            },
          ])
        );
      } catch {
        // non-fatal
      }

      setOrderToken(result.orderToken);
      setPaidAmount(submitAmount);
      sessionStorage.removeItem(CART_SESSION_KEY);
      setCart(null);
      setSubmitted(true);

      const billingLabel = submitCart.billingType === "monthly" ? "Monthly" : "One-time";
      const waMessage = encodeURIComponent(
        `🍕 *New Plan Purchase Request*\nPackage: ${submitCart.packageName}\nBilling: ${billingLabel}\nAmount: PKR ${submitAmount.toLocaleString()}\nBuyer: ${buyer.name}\nEmail: ${buyer.email}\nPhone: ${buyer.phone}\nTRX ID: ${buyer.txnId}`
      );
      setTimeout(() => {
        window.open(`https://wa.me/923173712950?text=${waMessage}`, "_blank");
      }, 2500);
    } catch {
      setFormError("Something went wrong while submitting your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Success state ────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Order Submitted Successfully!</h2>
            <p className="text-muted-foreground">
              Redirecting you to WhatsApp for confirmation...
            </p>
            <p className="text-sm text-muted-foreground bg-muted rounded-lg p-3">
              Our team will verify your payment within 24 hours.
            </p>
            <div className="text-lg font-semibold text-orange-600">
              Amount: PKR {paidAmount.toLocaleString()}
            </div>
            {orderToken && (
              <div className="text-sm bg-muted rounded p-3 space-y-1 text-left">
                <p className="font-medium">Your Order Token:</p>
                <p className="font-mono text-xs break-all">{orderToken}</p>
                <p className="text-xs text-muted-foreground">
                  Save this to track your order status.
                </p>
              </div>
            )}
            <Button
              variant="link"
              className="text-orange-600 w-full"
              onClick={() => navigate("/track-my-order")}
            >
              Track at /track-my-order →
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/feature-store")}
              className="w-full gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              Back to Pricing &amp; Plans
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!cart) {
    return null; // useEffect redirects to /feature-store
  }

  const submitDisabled = submitting || packagesLoading || !selectedPackage;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-5xl mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-orange-500" />
              Checkout
            </h1>
            <p className="text-sm text-muted-foreground">
              {cart.packageName} · {cart.billingType === "monthly" ? "Monthly" : "One-time"}
            </p>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Order summary */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{cart.packageName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs capitalize">
                        {cart.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {cart.billingType === "monthly" ? "Monthly" : "One-time"}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-lg font-semibold shrink-0 text-orange-600">
                    PKR {trustedAmount.toLocaleString()}
                    {cart.billingType === "monthly" && (
                      <span className="text-xs font-normal text-muted-foreground">/mo</span>
                    )}
                  </span>
                </div>

                <Separator />

                {/* Included modules */}
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">
                    Included modules
                    {selectedPackage && (
                      <span className="text-muted-foreground font-normal">
                        {" "}({moduleNames.length})
                      </span>
                    )}
                  </p>
                  {packagesLoading || !selectedPackage ? (
                    <p className="text-sm text-muted-foreground">Loading plan details…</p>
                  ) : (
                    <ul className="space-y-1">
                      {moduleNames.map((name) => (
                        <li
                          key={name}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                          {name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <Separator />

                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-orange-600">PKR {trustedAmount.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* What happens next */}
            <Card className="bg-muted/40">
              <CardContent className="pt-4 space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">What happens next?</p>
                <ol className="space-y-1 list-decimal list-inside">
                  <li>Transfer PKR {trustedAmount.toLocaleString()} to the account below</li>
                  <li>Submit this form with your transaction ID</li>
                  <li>Our team verifies within 24 hours</li>
                  <li>Your plan's modules unlock automatically once approved</li>
                </ol>
              </CardContent>
            </Card>
          </div>

          {/* Right: Payment form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Bank details */}
              <div className="rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white p-4 space-y-2">
                <p className="font-semibold text-sm uppercase tracking-wide opacity-80 flex items-center gap-1">
                  🏦 Bank Transfer Details
                </p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="opacity-80">Bank</span>
                    <span className="font-medium">Meezan Bank</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-80">Account Title</span>
                    <span className="font-medium">AM Enterprises</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-80">Account Number</span>
                    <span className="font-medium font-mono">03173712950</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="opacity-80 shrink-0">IBAN</span>
                    <span className="font-medium font-mono text-right break-all">
                      PK36MEZN0001080113741289
                    </span>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="co-name">Full Name *</Label>
                    <Input
                      id="co-name"
                      placeholder="Your full name"
                      value={form.buyerName}
                      onChange={(e) => handleFieldChange("buyerName", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="co-email">Email *</Label>
                    <Input
                      id="co-email"
                      type="email"
                      placeholder="your@email.com"
                      value={form.buyerEmail}
                      onChange={(e) => handleFieldChange("buyerEmail", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="co-phone">Phone *</Label>
                    <Input
                      id="co-phone"
                      placeholder="03XXXXXXXXX"
                      value={form.buyerPhone}
                      onChange={(e) => handleFieldChange("buyerPhone", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="co-txn">TRX / Reference ID *</Label>
                    <Input
                      id="co-txn"
                      placeholder="Bank transfer TRX ID"
                      value={form.txnId}
                      onChange={(e) => handleFieldChange("txnId", e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Screenshot */}
                <div className="space-y-1">
                  <Label htmlFor="co-screenshot">Payment Screenshot (optional)</Label>
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-orange-400 transition-colors"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {screenshotFile ? screenshotFile.name : "Click to upload payment screenshot"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Speeds up verification — highly recommended
                    </p>
                  </div>
                  <input
                    id="co-screenshot"
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setScreenshotFile(e.target.files?.[0] ?? null)}
                  />
                </div>

                {/* Duplicate-order warning (non-blocking) */}
                {duplicateWarn && (
                  <div className="flex items-start gap-2 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      You may already have a pending or active order for this plan with this
                      email. You can still submit — our team will review and avoid duplicates.
                    </span>
                  </div>
                )}

                {formError && (
                  <p className="text-sm text-red-500 font-medium">{formError}</p>
                )}

                <Button
                  type="submit"
                  disabled={submitDisabled}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white hover:opacity-90 gap-2"
                >
                  {submitting || packagesLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {packagesLoading ? "Loading plan…" : "Submitting…"}
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      Confirm &amp; Request Access 🚀
                    </>
                  )}
                </Button>

                {duplicateChecking && (
                  <p className="text-xs text-muted-foreground text-center">
                    Checking for existing orders…
                  </p>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  Our team will verify your payment within 24 hours and unlock your plan.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
