import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyPackageOrders } from "@/hooks/usePackageOrders";
import type { PackageOrder } from "@/hooks/usePackageOrders";
import {
  Search,
  Package,
  RefreshCw,
  CheckCircle,
  Loader2,
  Circle,
  XCircle,
  MessageCircle,
} from "lucide-react";

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PackageOrder["status"] }) {
  switch (status) {
    case "approved":
      return (
        <Badge className="bg-green-100 text-green-700 border-green-300">Approved ✅</Badge>
      );
    case "active":
      return (
        <Badge className="bg-green-100 text-green-700 border-green-300">Active ✅</Badge>
      );
    case "rejected":
      return <Badge variant="destructive">Rejected ❌</Badge>;
    case "expired":
      return (
        <Badge className="bg-gray-100 text-gray-600 border-gray-300">Expired</Badge>
      );
    case "cancelled":
      return (
        <Badge className="bg-gray-100 text-gray-600 border-gray-300">Cancelled</Badge>
      );
    case "pending":
    default:
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-400">
          Pending ⏳
        </Badge>
      );
  }
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

interface StageInfo {
  label: string;
  state: "done" | "current" | "upcoming";
  timestamp: string | null;
}

interface TerminalInfo {
  label: string;
  timestamp: string | null;
}

// Derive the 6-stage progress + optional terminal state from the order's
// status and status-history rows.
function deriveTimeline(order: PackageOrder): {
  stages: StageInfo[];
  terminal: TerminalInfo | null;
} {
  const status = order.status;

  // First-history timestamp per status.
  const hist: Record<string, string> = {};
  for (const h of order.history) {
    if (h.createdAt && !hist[h.status]) hist[h.status] = h.createdAt;
  }
  const H = (s: string) => hist[s] ?? null;

  const labels = [
    "Order Placed",
    "Payment Submitted",
    "Payment Under Verification",
    "Payment Approved",
    "Package Activation in Progress",
    "Package Activated",
  ];

  // completed = number of fully-done stages; currentIndex = in-progress stage (0-based).
  let completed = 0;
  let currentIndex: number | null = null;
  switch (status) {
    case "pending":
      completed = 2; // Order Placed + Payment Submitted
      currentIndex = 2; // Under Verification
      break;
    case "approved":
      completed = 4; // through Payment Approved
      currentIndex = 4; // Activation in Progress
      break;
    case "active":
      completed = 6; // all done
      currentIndex = null;
      break;
    case "rejected":
    case "cancelled":
      completed = 2;
      currentIndex = null;
      break;
    case "expired":
      completed = 6;
      currentIndex = null;
      break;
    default:
      completed = 0;
      currentIndex = 0;
  }

  const createdTs = order.createdAt || null;

  const timestamps: (string | null)[] = [
    (H("pending") ?? order.createdAt) || null,
    createdTs,
    (H("pending") ?? order.createdAt) || null,
    H("approved") ?? (status === "approved" || status === "active" ? order.updatedAt : null),
    H("approved") ?? (status === "active" ? order.updatedAt : null),
    H("active") ?? (status === "active" ? order.updatedAt : null),
  ];

  const stages: StageInfo[] = labels.map((label, i) => {
    let state: StageInfo["state"];
    if (i < completed) state = "done";
    else if (i === currentIndex) state = "current";
    else state = "upcoming";
    return { label, state, timestamp: state === "upcoming" ? null : timestamps[i] };
  });

  let terminal: TerminalInfo | null = null;
  if (status === "rejected")
    terminal = { label: "Payment Rejected", timestamp: H("rejected") ?? order.updatedAt };
  else if (status === "cancelled")
    terminal = { label: "Order Cancelled", timestamp: H("cancelled") ?? order.updatedAt };
  else if (status === "expired")
    terminal = { label: "Subscription Expired", timestamp: H("expired") ?? order.updatedAt };

  return { stages, terminal };
}

function fmt(ts: string | null): string | null {
  if (!ts) return null;
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d.toLocaleString();
}

function Timeline({ order }: { order: PackageOrder }) {
  const { stages, terminal } = deriveTimeline(order);
  const items = stages.length + (terminal ? 1 : 0);

  return (
    <div>
      {stages.map((s, i) => {
        const isLast = i === stages.length - 1;
        const showConnector = !isLast || !!terminal;
        const ts = fmt(s.timestamp);
        return (
          <div key={i} className="flex gap-3">
            {/* Left rail: dot + connector */}
            <div className="flex flex-col items-center self-stretch">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  s.state === "done"
                    ? "bg-green-500"
                    : s.state === "current"
                    ? "bg-orange-500"
                    : "bg-muted border border-border"
                }`}
              >
                {s.state === "done" ? (
                  <CheckCircle className="w-3 h-3 text-white" />
                ) : s.state === "current" ? (
                  <Loader2 className="w-3 h-3 text-white animate-spin" />
                ) : (
                  <Circle className="w-2 h-2 text-muted-foreground" />
                )}
              </div>
              {showConnector && <div className="w-px grow bg-border" />}
            </div>
            {/* Right: content */}
            <div className={showConnector || i < items - 1 ? "pb-4" : ""}>
              <p
                className={`text-sm font-medium ${
                  s.state === "upcoming" ? "text-muted-foreground" : "text-foreground"
                }`}
              >
                {s.label}
              </p>
              {ts && <p className="text-xs text-muted-foreground">{ts}</p>}
            </div>
          </div>
        );
      })}
      {terminal && (
        <div className="flex gap-3">
          <div className="flex flex-col items-center self-stretch">
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-red-500">
              <XCircle className="w-3 h-3 text-white" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-red-600">{terminal.label}</p>
            {fmt(terminal.timestamp) && (
              <p className="text-xs text-muted-foreground">{fmt(terminal.timestamp)}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Order card ───────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: PackageOrder }) {
  const submittedDate = order.createdAt ? new Date(order.createdAt).toLocaleString() : "—";
  const updatedDate = order.updatedAt ? new Date(order.updatedAt).toLocaleString() : "—";
  const isOneTime = order.billingType === "one_time";

  const subPeriod = isOneTime
    ? "Lifetime access"
    : order.subscriptionStart
    ? `${order.subscriptionStart}${order.subscriptionEnd ? " → " + order.subscriptionEnd : ""}`
    : "Not started yet";

  const showWhatsApp =
    order.status === "rejected" ||
    order.status === "expired" ||
    order.status === "cancelled";

  const waText = encodeURIComponent(
    `Hi, I need help with my plan order.\nOrder Token: ${order.orderToken}\nPackage: ${order.packageName}\nStatus: ${order.status}`
  );

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold truncate">{order.packageName}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-xs capitalize">
                {order.category}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {order.billingType === "monthly" ? "Monthly" : "One-time"}
              </Badge>
              <StatusBadge status={order.status} />
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Amount: </span>
            <span className="font-semibold">PKR {order.amount.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">TRX ID: </span>
            <span className="font-mono text-xs">{order.txnId}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Submitted: </span>
            <span className="text-xs">{submittedDate}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Last updated: </span>
            <span className="text-xs">{updatedDate}</span>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Subscription: </span>
            <span className="text-xs">{subPeriod}</span>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Token: </span>
            <span className="font-mono text-xs break-all">{order.orderToken}</span>
          </div>
        </div>

        {/* Admin remarks */}
        {order.adminRemarks && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            <p className="font-medium mb-0.5">Admin remarks</p>
            <p>{order.adminRemarks}</p>
          </div>
        )}

        {/* Timeline */}
        <div>
          <p className="text-sm font-medium mb-3">Status Timeline</p>
          <Timeline order={order} />
        </div>

        {/* WhatsApp support for rejected/expired/cancelled */}
        {showWhatsApp && (
          <a
            href={`https://wa.me/923173712950?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-green-600 hover:underline"
          >
            <MessageCircle className="w-4 h-4" />
            Contact Support on WhatsApp
          </a>
        )}
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

  // useMyPackageOrders provides the query + Supabase Realtime (live updates on
  // admin approval) + cleanup via supabase.removeChannel.
  const email = searchType === "email" ? submittedEmail : "";
  const orderToken = searchType === "token" ? submittedToken : undefined;
  const { orders, loading, refresh } = useMyPackageOrders(email, orderToken);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const v = inputValue.trim();
    if (!v) return;
    if (searchType === "token") {
      setSubmittedToken(v);
      setSubmittedEmail("");
    } else {
      setSubmittedEmail(v);
      setSubmittedToken("");
    }
    setSearched(true);
  };

  const switchTab = (t: "token" | "email") => {
    setSearchType(t);
    setInputValue("");
    setSubmittedToken("");
    setSubmittedEmail("");
    setSearched(false);
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
          <h1 className="text-2xl font-bold">Track Your Plan Order</h1>
          <p className="text-sm text-muted-foreground">
            Enter your order token or email to check your subscription status
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
                onClick={() => switchTab("token")}
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
                onClick={() => switchTab("email")}
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
            <Skeleton className="h-40 rounded-xl" />
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
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Found {orders.length} order{orders.length > 1 ? "s" : ""} · updates live
              </p>
              <Button variant="outline" size="sm" className="gap-1" onClick={refresh}>
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </Button>
            </div>
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
