import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  CheckCircle,
  Upload,
  ShoppingCart,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// ─── Types ───────────────────────────────────────────────────────────────────

type CartItem = {
  moduleKey: string;
  moduleName: string;
  planType: "one-time" | "monthly";
  price: number;
};

const ORDERS_KEY = "pizza_king_orders";
const CART_SESSION_KEY = "feature_store_cart";

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const stored = sessionStorage.getItem(CART_SESSION_KEY);
      return stored ? (JSON.parse(stored) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [form, setForm] = useState({
    buyerName: "",
    buyerEmail: "",
    buyerPhone: "",
    txnId: "",
  });
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [formError, setFormError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Redirect if cart is empty
  useEffect(() => {
    if (cart.length === 0) {
      navigate("/feature-store", { replace: true });
    }
  }, [cart.length, navigate]);

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  const handleFieldChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.buyerName.trim()) { setFormError("Full name is required."); return; }
    if (!form.buyerEmail.trim()) { setFormError("Email is required."); return; }
    if (!form.buyerPhone.trim()) { setFormError("Phone is required."); return; }
    if (!form.txnId.trim()) { setFormError("Transaction ID is required."); return; }

    let screenshotDataUrl: string | null = null;
    if (screenshotFile) {
      try {
        screenshotDataUrl = await new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve((ev.target?.result as string) ?? null);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(screenshotFile);
        });
      } catch {
        screenshotDataUrl = null;
      }
    }

    // Save one order per cart item
    const now = Date.now();
    const newOrders = cart.map((item, index) => ({
      id: `order_${now}_${index}`,
      moduleKey: item.moduleKey,
      moduleName: item.moduleName,
      planType: item.planType,
      amount: item.price,
      buyerName: form.buyerName.trim(),
      buyerEmail: form.buyerEmail.trim(),
      buyerPhone: form.buyerPhone.trim(),
      txnId: form.txnId.trim(),
      screenshotDataUrl,
      status: "pending" as const,
      submittedAt: new Date().toISOString(),
    }));

    try {
      const existing = JSON.parse(localStorage.getItem(ORDERS_KEY) ?? "[]") as unknown[];
      localStorage.setItem(ORDERS_KEY, JSON.stringify([...existing, ...newOrders]));
    } catch {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(newOrders));
    }

    sessionStorage.removeItem(CART_SESSION_KEY);
    setCart([]);
    setSubmitted(true);

    const moduleList = newOrders.map((o) => o.moduleName).join(", ");
    const waMessage = encodeURIComponent(
      `🍕 *New Purchase Request - ${newOrders.length} Module(s)*\nBuyer: ${form.buyerName.trim()}\nEmail: ${form.buyerEmail.trim()}\nPhone: ${form.buyerPhone.trim()}\nTRX ID: ${form.txnId.trim()}\nTotal: PKR ${total.toLocaleString()}\nModules: ${moduleList}`
    );

    setTimeout(() => {
      window.open(`https://wa.me/923173712950?text=${waMessage}`, "_blank");
    }, 2500);
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
              Total Paid: PKR {total.toLocaleString()}
            </div>
            <Button variant="outline" onClick={() => navigate("/feature-store")} className="w-full gap-2">
              <ShoppingBag className="w-4 h-4" />
              Back to Feature Store
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (cart.length === 0) {
    return null; // useEffect will redirect
  }

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
            <p className="text-sm text-muted-foreground">{cart.length} module(s) in your order</p>
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
              <CardContent className="space-y-3">
                {cart.map((item) => (
                  <div key={`${item.moduleKey}-${item.planType}`} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">{item.moduleName}</p>
                      <Badge variant="outline" className="text-xs capitalize mt-1">
                        {item.planType}
                      </Badge>
                    </div>
                    <span className="text-sm font-semibold shrink-0">
                      PKR {item.price.toLocaleString()}
                      {item.planType === "monthly" && <span className="text-xs font-normal text-muted-foreground">/mo</span>}
                    </span>
                  </div>
                ))}

                <Separator />

                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-orange-600">PKR {total.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* What happens next */}
            <Card className="bg-muted/40">
              <CardContent className="pt-4 space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">What happens next?</p>
                <ol className="space-y-1 list-decimal list-inside">
                  <li>Transfer PKR {total.toLocaleString()} to the account below</li>
                  <li>Submit this form with your transaction ID</li>
                  <li>Our team verifies within 24 hours</li>
                  <li>Modules are unlocked automatically</li>
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

                {formError && (
                  <p className="text-sm text-red-500 font-medium">{formError}</p>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white hover:opacity-90 gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Confirm &amp; Request Access 🚀
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Our team will verify your payment within 24 hours and unlock your modules.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
