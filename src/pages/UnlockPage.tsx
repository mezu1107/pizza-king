import { useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Lock, CheckCircle, CreditCard, Upload, ShoppingCart, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MODULE_PRICES } from "@/contexts/SubscriptionContext";

const ORDERS_KEY = "pizza_king_orders";

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function UnlockPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const moduleKey = searchParams.get("module") ?? "";
  const moduleName = searchParams.get("name") ?? "Premium Feature";
  const priceInfo = MODULE_PRICES[moduleKey];

  // ─── State ────────────────────────────────────────────────────────────────
  const [selectedPlan, setSelectedPlan] = useState<"one-time" | "monthly" | null>(null);
  const [form, setForm] = useState({
    buyerName: "",
    buyerEmail: "",
    buyerPhone: "",
    txnId: "",
  });
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [formError, setFormError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const oneTimePrice = priceInfo?.oneTime ?? 2500;
  const monthlyPrice = priceInfo?.monthly ?? 999;
  const description =
    priceInfo?.description ?? "Unlock this premium module to access advanced features.";
  const displayName = priceInfo?.name ?? moduleName;
  const amount = selectedPlan === "one-time" ? oneTimePrice : monthlyPrice;

  const handleFieldChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) {
      setFormError("Please select a plan first.");
      return;
    }
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

    const order = {
      id: generateId(),
      moduleKey,
      moduleName: displayName,
      planType: selectedPlan,
      amount,
      buyerName: form.buyerName.trim(),
      buyerEmail: form.buyerEmail.trim(),
      buyerPhone: form.buyerPhone.trim(),
      txnId: form.txnId.trim(),
      screenshotDataUrl,
      status: "pending" as const,
      submittedAt: new Date().toISOString(),
    };

    try {
      const existing = JSON.parse(localStorage.getItem(ORDERS_KEY) ?? "[]") as unknown[];
      localStorage.setItem(ORDERS_KEY, JSON.stringify([...existing, order]));
    } catch {
      localStorage.setItem(ORDERS_KEY, JSON.stringify([order]));
    }

    setSubmitted(true);

    const waText = encodeURIComponent(
      `New Module Purchase Request\nModule: ${displayName}\nPlan: ${selectedPlan}\nAmount: PKR ${amount}\nTrx ID: ${form.txnId.trim()}\nEmail: ${form.buyerEmail.trim()}`
    );
    const waUrl = `https://wa.me/923173712950?text=${waText}`;
    setTimeout(() => {
      window.open(waUrl, "_blank");
    }, 2000);
  };

  // ─── Success state ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">Order Submitted!</h2>
            <p className="text-muted-foreground">
              You'll be redirected to WhatsApp to confirm your order.
            </p>
            <p className="text-sm text-muted-foreground bg-muted rounded-lg p-3">
              Our team will verify your payment within 24 hours and unlock your module.
            </p>
            <Button variant="outline" onClick={() => navigate(-1)} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        {/* Header */}
        <Card>
          <CardContent className="pt-8 pb-6 text-center space-y-3">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center">
                <Lock className="w-10 h-10 text-orange-500" />
              </div>
            </div>
            <h1 className="text-3xl font-bold">{displayName}</h1>
            <p className="text-muted-foreground">This is a premium feature. Purchase to unlock.</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">{description}</p>
          </CardContent>
        </Card>

        {/* Plan selection */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Choose a Plan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* One-time */}
            <button
              type="button"
              onClick={() => setSelectedPlan("one-time")}
              className={`text-left rounded-xl border-2 p-4 transition-all space-y-3 ${
                selectedPlan === "one-time"
                  ? "border-orange-500 bg-orange-50"
                  : "border-border hover:border-orange-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">One-time</span>
                {selectedPlan === "one-time" && (
                  <CheckCircle className="w-5 h-5 text-orange-500" />
                )}
              </div>
              <p className="text-2xl font-bold">PKR {oneTimePrice.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Lifetime Access</p>
              <ul className="text-sm space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  Pay once, use forever
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  All future updates included
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  No recurring charges
                </li>
              </ul>
              <Button
                size="sm"
                className="w-full gap-2"
                variant={selectedPlan === "one-time" ? "default" : "outline"}
                style={
                  selectedPlan === "one-time"
                    ? { background: "#f97316", color: "#fff" }
                    : {}
                }
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPlan("one-time");
                }}
              >
                <ShoppingCart className="w-4 h-4" />
                {selectedPlan === "one-time" ? "Selected" : "Add to Cart"}
              </Button>
            </button>

            {/* Monthly */}
            <button
              type="button"
              onClick={() => setSelectedPlan("monthly")}
              className={`text-left rounded-xl border-2 p-4 transition-all space-y-3 ${
                selectedPlan === "monthly"
                  ? "border-orange-500 bg-orange-50"
                  : "border-border hover:border-orange-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">Monthly</span>
                {selectedPlan === "monthly" && (
                  <CheckCircle className="w-5 h-5 text-orange-500" />
                )}
              </div>
              <p className="text-2xl font-bold">
                PKR {monthlyPrice.toLocaleString()}
                <span className="text-sm font-normal text-muted-foreground">/month</span>
              </p>
              <p className="text-sm text-muted-foreground">Monthly Access</p>
              <ul className="text-sm space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  Lower upfront cost
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  Cancel anytime
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  All updates included
                </li>
              </ul>
              <Button
                size="sm"
                className="w-full gap-2"
                variant={selectedPlan === "monthly" ? "default" : "outline"}
                style={
                  selectedPlan === "monthly"
                    ? { background: "#f97316", color: "#fff" }
                    : {}
                }
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPlan("monthly");
                }}
              >
                <ShoppingCart className="w-4 h-4" />
                {selectedPlan === "monthly" ? "Selected" : "Add to Cart"}
              </Button>
            </button>
          </div>
        </div>

        {/* Checkout form — shows after plan selection */}
        {selectedPlan && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-orange-500" />
                Complete Your Purchase
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Bank details */}
              <div className="rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white p-4 space-y-2">
                <p className="font-semibold text-sm uppercase tracking-wide opacity-80">
                  Payment Details
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
                    <Label htmlFor="buyer-name">Full Name *</Label>
                    <Input
                      id="buyer-name"
                      placeholder="Your full name"
                      value={form.buyerName}
                      onChange={(e) => handleFieldChange("buyerName", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="buyer-email">Email *</Label>
                    <Input
                      id="buyer-email"
                      type="email"
                      placeholder="your@email.com"
                      value={form.buyerEmail}
                      onChange={(e) => handleFieldChange("buyerEmail", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="buyer-phone">Phone *</Label>
                    <Input
                      id="buyer-phone"
                      placeholder="03XXXXXXXXX"
                      value={form.buyerPhone}
                      onChange={(e) => handleFieldChange("buyerPhone", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="trx-id">Transaction ID *</Label>
                    <Input
                      id="trx-id"
                      placeholder="Bank transfer TRX ID"
                      value={form.txnId}
                      onChange={(e) => handleFieldChange("txnId", e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Screenshot upload */}
                <div className="space-y-1">
                  <Label htmlFor="screenshot">Payment Screenshot (optional)</Label>
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-orange-400 transition-colors"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {screenshotFile
                        ? screenshotFile.name
                        : "Click to upload payment screenshot"}
                    </p>
                  </div>
                  <input
                    id="screenshot"
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setScreenshotFile(e.target.files?.[0] ?? null)}
                  />
                </div>

                {/* Summary */}
                <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Module</span>
                    <span className="font-medium">{displayName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan</span>
                    <Badge variant="outline" className="capitalize">
                      {selectedPlan}
                    </Badge>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Amount to Pay</span>
                    <span className="text-orange-600">PKR {amount.toLocaleString()}</span>
                  </div>
                </div>

                {formError && (
                  <p className="text-sm text-red-500 font-medium">{formError}</p>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white hover:opacity-90 gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Submit Payment &amp; Request Access
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Our team will verify your payment within 24 hours and unlock your module.
                </p>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Back button */}
        <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </Button>
      </div>
    </div>
  );
}
