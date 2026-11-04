import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useSubscription, MODULE_PRICES, MODULES } from "@/contexts/SubscriptionContext";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Crown,
  Lock,
  LogOut,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PendingOrder {
  id: string;
  moduleKey: string;
  moduleName: string;
  planType: "one-time" | "monthly";
  amount: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  txnId: string;
  screenshotDataUrl: string | null;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
}

const ORDERS_KEY = "pizza_king_orders";
const AUTH_KEY = "sub_auth";
const ADMIN_EMAIL = "amenterprises1105@gmail.com";
const ADMIN_PASSWORD = "Ashu@1107";

// ─── Login form ───────────────────────────────────────────────────────────────

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, "true");
      onLogin();
    } else {
      setError("Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center">
            <Crown className="w-10 h-10 text-yellow-500" />
          </div>
          <CardTitle className="text-xl">Subscription Management</CardTitle>
          <p className="text-sm text-muted-foreground">Sign in to manage module subscriptions</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="sub-email">Email</Label>
              <Input
                id="sub-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sub-password">Password</Label>
              <Input
                id="sub-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-500 font-medium">{error}</p>
            )}
            <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white">
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function SubscriptionDashboard({ onLogout }: { onLogout: () => void }) {
  const { isModuleLocked, unlockModule, lockModule } = useSubscription();
  const [orders, setOrders] = useState<PendingOrder[]>(() => {
    try {
      const stored = localStorage.getItem(ORDERS_KEY);
      return stored ? (JSON.parse(stored) as PendingOrder[]) : [];
    } catch {
      return [];
    }
  });

  const saveOrders = (updated: PendingOrder[]) => {
    setOrders(updated);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
  };

  const handleToggle = (key: string, checked: boolean) => {
    if (checked) {
      unlockModule(key);
    } else {
      lockModule(key);
    }
  };

  const approveOrder = (order: PendingOrder) => {
    unlockModule(order.moduleKey);
    const updated = orders.map((o) =>
      o.id === order.id ? { ...o, status: "approved" as const } : o
    );
    saveOrders(updated);
  };

  const rejectOrder = (orderId: string) => {
    const updated = orders.map((o) =>
      o.id === orderId ? { ...o, status: "rejected" as const } : o
    );
    saveOrders(updated);
  };

  const pendingOrderKeys = orders
    .filter((o) => o.status === "pending")
    .map((o) => o.moduleKey);

  const adminModules = MODULES.filter((m) => m.group === "admin");
  const riderModules = MODULES.filter((m) => m.group === "rider");

  const renderModuleGrid = (mods: typeof MODULES) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {mods.map((mod) => {
        const price = MODULE_PRICES[mod.key];
        const locked = isModuleLocked(mod.key);
        const hasPending = pendingOrderKeys.includes(mod.key);
        return (
          <Card key={mod.key} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-base leading-tight">{mod.name}</CardTitle>
                  {price && (
                    <p className="text-xs text-muted-foreground mt-1">{price.description}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {mod.free ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200">Free</Badge>
                  ) : (
                    <Lock className="w-4 h-4 text-muted-foreground mt-0.5" />
                  )}
                  {hasPending && (
                    <Badge variant="outline" className="text-yellow-600 border-yellow-400 text-xs">
                      Pending
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {price && !mod.free && (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>
                    One-time:{" "}
                    <span className="font-semibold text-foreground">
                      PKR {price.oneTime.toLocaleString()}
                    </span>
                  </p>
                  <p>
                    Monthly:{" "}
                    <span className="font-semibold text-foreground">
                      PKR {price.monthly.toLocaleString()}/mo
                    </span>
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch
                  checked={!locked}
                  onCheckedChange={(checked) => handleToggle(mod.key, checked)}
                  disabled={mod.free}
                />
                <span className="text-sm text-muted-foreground">
                  {mod.free ? "Always Enabled" : locked ? "Locked" : "Unlocked"}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const statusBadge = (status: PendingOrder["status"]) => {
    if (status === "pending")
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-400">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    if (status === "approved")
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Approved
        </Badge>
      );
    return (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        Rejected
      </Badge>
    );
  };

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <AdminLayout title="Subscriptions">
      <div className="space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-500" />
            <h1 className="text-2xl font-bold">Module Subscriptions</h1>
          </div>
          <Button variant="outline" size="sm" onClick={onLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        <Tabs defaultValue="catalog">
          <TabsList>
            <TabsTrigger value="catalog">Module Catalog</TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              Pending Orders
              {pendingCount > 0 && (
                <Badge className="bg-orange-500 text-white text-xs px-1.5 py-0 h-5">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Module Catalog */}
          <TabsContent value="catalog" className="space-y-8 pt-4">
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Admin Modules</h2>
              {renderModuleGrid(adminModules)}
            </section>
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Rider Modules</h2>
              {renderModuleGrid(riderModules)}
            </section>
          </TabsContent>

          {/* Pending Orders */}
          <TabsContent value="orders" className="pt-4">
            {orders.length === 0 ? (
              <div className="text-center text-muted-foreground py-16">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No orders submitted yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{order.moduleName}</p>
                          <p className="text-xs text-muted-foreground">{order.moduleKey}</p>
                        </div>
                        {statusBadge(order.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <div>
                          <span className="text-muted-foreground">Name: </span>
                          <span>{order.buyerName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Email: </span>
                          <span>{order.buyerEmail}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Phone: </span>
                          <span>{order.buyerPhone}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Plan: </span>
                          <span className="capitalize">{order.planType}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Amount: </span>
                          <span>PKR {order.amount.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">TRX ID: </span>
                          <span className="font-mono">{order.txnId}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Submitted: </span>
                          <span>{new Date(order.submittedAt).toLocaleString()}</span>
                        </div>
                      </div>

                      {order.screenshotDataUrl && (
                        <a
                          href={order.screenshotDataUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          View Screenshot <ChevronRight className="w-3 h-3" />
                        </a>
                      )}

                      {order.status === "pending" && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white gap-1"
                            onClick={() => approveOrder(order)}
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1"
                            onClick={() => rejectOrder(order.id)}
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

// ─── Page wrapper with auth gate ──────────────────────────────────────────────

export default function SubscriptionsPage() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem(AUTH_KEY) === "true"
  );

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_KEY);
    setAuthed(false);
  };

  if (!authed) {
    return <LoginForm onLogin={() => setAuthed(true)} />;
  }

  return <SubscriptionDashboard onLogout={handleLogout} />;
}
