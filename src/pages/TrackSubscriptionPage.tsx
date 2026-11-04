import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyOrders } from "@/hooks/useModuleOrders";
import type { ModuleOrder } from "@/hooks/useModuleOrders";
import { Search, Package } from "lucide-react";

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ModuleOrder["status"] }) {
  if (status === "approved") {
    return (
      <Badge className="bg-green-100 text-green-700 border-green-300">
        Approved ✅
      </Badge>
    );
  }
  if (status === "rejected") {
    return <Badge variant="destructive">Rejected ❌</Badge>;
  }
  return (
    <Badge variant="outline" className="text-yellow-600 border-yellow-400">
      Pending ⏳
    </Badge>
  );
}

function statusMessage(status: ModuleOrder["status"]): string {
  if (status === "approved")
    return "🟢 Access Granted! Your module has been unlocked.";
  if (status === "rejected")
    return "🔴 Payment could not be verified. Please contact support on WhatsApp.";
  return "🟡 Under Review — Your payment is being verified. Usually within 24 hours.";
}

// ─── Order card ───────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: ModuleOrder }) {
  const last4 = order.txnId.length > 4 ? order.txnId.slice(-4) : order.txnId;
  const maskedTxn = `****${last4}`;
  const submittedDate = order.submittedAt
    ? new Date(order.submittedAt).toLocaleString()
    : "—";

  const waMessage = encodeURIComponent(
    `Hi, I need help with my order.\nOrder Token: ${order.orderToken}\nModule: ${order.moduleName}\nPlan: ${order.planType}`
  );

  return (
    <Card className="border">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold truncate">{order.moduleName}</p>
            <p className="text-xs text-muted-foreground">{order.moduleKey}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <p className="text-sm text-muted-foreground">{statusMessage(order.status)}</p>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div>
            <span className="text-muted-foreground">Plan: </span>
            <Badge variant="outline" className="capitalize text-xs">
              {order.planType}
            </Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Amount: </span>
            <span className="font-semibold">PKR {order.amount.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">TRX ID: </span>
            <span className="font-mono text-xs">{maskedTxn}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Submitted: </span>
            <span className="text-xs">{submittedDate}</span>
          </div>
          {order.orderToken && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Token: </span>
              <span className="font-mono text-xs break-all">{order.orderToken}</span>
            </div>
          )}
        </div>

        {order.status === "approved" && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-2 text-sm text-green-700 font-medium">
            Module Unlocked ✅ — Access is now active on your device.
          </div>
        )}

        <a
          href={`https://wa.me/923173712950?text=${waMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-green-600 hover:underline"
        >
          💬 Contact Support on WhatsApp
        </a>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TrackSubscriptionPage() {
  const [searchType, setSearchType] = useState<"token" | "email">("token");
  const [inputValue, setInputValue] = useState("");
  const [submittedToken, setSubmittedToken] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [searched, setSearched] = useState(false);

  const { orders, loading } = useMyOrders(submittedEmail, submittedToken || undefined);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchType === "token") {
      setSubmittedToken(inputValue.trim());
      setSubmittedEmail("");
    } else {
      setSubmittedEmail(inputValue.trim());
      setSubmittedToken("");
    }
    setSearched(true);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center">
              <Package className="w-7 h-7 text-orange-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Track Your Module Order</h1>
          <p className="text-sm text-muted-foreground">
            Enter your order token or email to check your purchase status
          </p>
        </div>

        {/* Search card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="w-4 h-4 text-orange-500" />
              Search Order
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search type toggle */}
            <div className="flex rounded-lg border overflow-hidden text-sm">
              <button
                type="button"
                onClick={() => { setSearchType("token"); setInputValue(""); }}
                className={`flex-1 py-2 transition-colors ${
                  searchType === "token"
                    ? "bg-orange-500 text-white font-medium"
                    : "bg-background hover:bg-muted text-muted-foreground"
                }`}
              >
                By Order Token
              </button>
              <button
                type="button"
                onClick={() => { setSearchType("email"); setInputValue(""); }}
                className={`flex-1 py-2 transition-colors ${
                  searchType === "email"
                    ? "bg-orange-500 text-white font-medium"
                    : "bg-background hover:bg-muted text-muted-foreground"
                }`}
              >
                By Email
              </button>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder={
                  searchType === "token"
                    ? "Paste your order token..."
                    : "Enter your email address..."
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                type={searchType === "email" ? "email" : "text"}
                className="flex-1"
                required
              />
              <Button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white gap-1 shrink-0"
              >
                <Search className="w-4 h-4" />
                Search
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {searched && loading && (
          <div className="space-y-3">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        )}

        {searched && !loading && orders.length === 0 && (
          <div className="text-center text-muted-foreground py-10 space-y-2">
            <Package className="w-12 h-12 mx-auto opacity-20" />
            <p className="font-medium">No orders found.</p>
            <p className="text-sm">Double check your token or email.</p>
          </div>
        )}

        {searched && !loading && orders.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Found {orders.length} order{orders.length > 1 ? "s" : ""}
            </p>
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
