import { useState, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useSubscription, MODULES } from "@/contexts/SubscriptionContext";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Crown,
  LogOut,
  CheckCircle,
  Clock,
  XCircle,
  Pencil,
  Plus,
  Trash2,
  Search,
  Download,
  X,
} from "lucide-react";
import {
  usePackages,
  upsertPackage,
  deletePackage,
  setPackageModules,
  setPackageFeatures,
  type Package,
} from "@/hooks/usePackages";
import {
  usePackageOrders,
  approvePackageOrder,
  rejectPackageOrder,
  type PackageOrder,
} from "@/hooks/usePackageOrders";

const AUTH_KEY = "sub_auth";

// Env-var admin credentials (with safe local-dev fallbacks).
const ADMIN_EMAIL =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUB_ADMIN_EMAIL) ||
  "amenterprises1105@gmail.com";
const ADMIN_PASSWORD =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUB_ADMIN_PASSWORD) ||
  "Ashu@1107";

// ─── Login form (env-var gate) ────────────────────────────────────────────────

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
          <CardTitle className="text-xl">Pricing & Plans Management</CardTitle>
          <p className="text-sm text-muted-foreground">Sign in to manage plan subscriptions</p>
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

// ─── Shared helpers ──────────────────────────────────────────────────────────

function categoryBadge(category: string) {
  return category === "admin" ? (
    <Badge className="bg-blue-100 text-blue-700 border-blue-200">Admin</Badge>
  ) : (
    <Badge className="bg-purple-100 text-purple-700 border-purple-200">Rider</Badge>
  );
}

function statusBadge(status: PackageOrder["status"]) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-400">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    case "approved":
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Approved
        </Badge>
      );
    case "active":
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </Badge>
      );
    case "expired":
      return (
        <Badge variant="outline" className="text-gray-500 border-gray-300">
          Expired
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="outline" className="text-gray-500 border-gray-300">
          Cancelled
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// Derived lifecycle state for the history view: a monthly plan that has passed
// its subscription_end is "expired" even if the row status is still "approved".
type DisplayState = "running" | "expired" | "pending" | "rejected" | "cancelled";
function deriveDisplay(order: PackageOrder): DisplayState {
  if (order.status === "rejected") return "rejected";
  if (order.status === "cancelled") return "cancelled";
  if (order.status === "pending") return "pending";
  if (order.billingType === "one_time") return "running";
  const end = order.subscriptionEnd ? new Date(order.subscriptionEnd) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (end && end < today) return "expired";
  return "running";
}

function fmtDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

// ─── Manage Plans: feature editor dialog ─────────────────────────────────────

function FeaturesDialog({
  open,
  onOpenChange,
  features,
  onChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  features: string[];
  onChange: (f: string[]) => void;
}) {
  const update = (i: number, val: string) =>
    onChange(features.map((f, idx) => (idx === i ? val : f)));
  const remove = (i: number) => onChange(features.filter((_, idx) => idx !== i));
  const add = () => onChange([...features, ""]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Features</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {features.map((f, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                value={f}
                onChange={(e) => update(i, e.target.value)}
                placeholder={`Feature ${i + 1}`}
                className="h-9"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => remove(i)}
                aria-label="Remove feature"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {features.length === 0 && (
            <p className="text-sm text-muted-foreground">No features yet.</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={add} className="gap-1 w-full">
          <Plus className="w-4 h-4" /> Add Feature
        </Button>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Manage Plans: module picker dialog ──────────────────────────────────────

function ModulesDialog({
  open,
  onOpenChange,
  category,
  selected,
  onChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category: "admin" | "rider";
  selected: string[];
  onChange: (keys: string[]) => void;
}) {
  // Only premium (non-free) modules in this category are plannable.
  const allModules = MODULES.filter((m) => m.group === category && !m.free);
  const toggle = (key: string) =>
    onChange(
      selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Modules ({category})</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {allModules.map((m) => (
            <div key={m.key} className="flex items-center gap-2">
              <Checkbox
                id={`mod-${m.key}`}
                checked={selected.includes(m.key)}
                onCheckedChange={() => toggle(m.key)}
              />
              <Label htmlFor={`mod-${m.key}`} className="text-sm cursor-pointer">
                {m.name}
              </Label>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Manage Plans: editable plan card ────────────────────────────────────────

interface PlanCardProps {
  pkg: Package;
  category: "admin" | "rider";
  isNew?: boolean;
  onSaved: () => void;
  onRemovedDraft?: () => void;
}

function PlanCard({ pkg, category, isNew, onSaved, onRemovedDraft }: PlanCardProps) {
  const { toast } = useToast();
  const [name, setName] = useState(pkg.name);
  const [description, setDescription] = useState(pkg.description);
  const [monthlyPrice, setMonthlyPrice] = useState(pkg.monthlyPrice);
  const [oneTimePrice, setOneTimePrice] = useState(pkg.oneTimePrice);
  const [isPopular, setIsPopular] = useState(pkg.isPopular);
  const [isEnabled, setIsEnabled] = useState(pkg.isEnabled);
  const [features, setFeatures] = useState<string[]>(pkg.features);
  const [modules, setModules] = useState<string[]>(pkg.moduleKeys);
  const [saving, setSaving] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [modulesOpen, setModulesOpen] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Name required", description: "Please enter a plan name.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const id = await upsertPackage({
        planKey: pkg.planKey,
        name: name.trim(),
        category,
        tier: pkg.tier,
        description,
        monthlyPrice: Number(monthlyPrice) || 0,
        oneTimePrice: Number(oneTimePrice) || 0,
        isPopular,
        isEnabled,
      });
      // upsert returns the row id (new for drafts, same for existing).
      const targetId = id ?? pkg.id;
      if (targetId) {
        await setPackageModules(targetId, modules);
        await setPackageFeatures(targetId, features);
      }
      toast({ title: "Plan saved", description: `${name} updated successfully.` });
      onSaved();
    } catch (err) {
      toast({
        title: "Save failed",
        description: String((err as Error).message),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isNew) {
      onRemovedDraft?.();
      return;
    }
    setSaving(true);
    try {
      await deletePackage(pkg.id);
      toast({ title: "Plan disabled", description: `${name} has been disabled.` });
      onSaved();
    } catch (err) {
      toast({
        title: "Delete failed",
        description: String((err as Error).message),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">
            {isNew ? "New Plan" : name || "New Plan"}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              Tier {pkg.tier}
            </span>
          </CardTitle>
          {isPopular && (
            <Badge className="bg-orange-100 text-orange-700 border-orange-200">
              Popular
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-0 h-16 resize-none text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Monthly (PKR)</Label>
            <Input
              type="number"
              min={0}
              value={monthlyPrice}
              onChange={(e) => setMonthlyPrice(Number(e.target.value))}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">One-time (PKR)</Label>
            <Input
              type="number"
              min={0}
              value={oneTimePrice}
              onChange={(e) => setOneTimePrice(Number(e.target.value))}
              className="h-9"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch checked={isPopular} onCheckedChange={setIsPopular} />
            <span className="text-sm">Popular</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
            <span className="text-sm">Enabled</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFeaturesOpen(true)}
            className="gap-1"
          >
            <Pencil className="w-3 h-3" /> Edit Features ({features.length})
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setModulesOpen(true)}
            className="gap-1"
          >
            <Pencil className="w-3 h-3" /> Edit Modules ({modules.length})
          </Button>
        </div>
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={handleDelete}
            className="gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" /> {isNew ? "Remove" : "Disable"}
          </Button>
        </div>
      </CardContent>

      <FeaturesDialog
        open={featuresOpen}
        onOpenChange={setFeaturesOpen}
        features={features}
        onChange={setFeatures}
      />
      <ModulesDialog
        open={modulesOpen}
        onOpenChange={setModulesOpen}
        category={category}
        selected={modules}
        onChange={setModules}
      />
    </Card>
  );
}

// ─── Tab 1: Manage Plans ──────────────────────────────────────────────────────

function ManagePlansTab() {
  const { packages, loading, refetch } = usePackages();
  const [drafts, setDrafts] = useState<Package[]>([]);

  const adminPackages = packages.filter((p) => p.category === "admin");
  const riderPackages = packages.filter((p) => p.category === "rider");
  const adminDrafts = drafts.filter((p) => p.category === "admin");
  const riderDrafts = drafts.filter((p) => p.category === "rider");

  const addDraft = (category: "admin" | "rider") => {
    const existing = [...packages, ...drafts].filter((p) => p.category === category);
    const maxTier = existing.reduce((m, p) => Math.max(m, p.tier), 0);
    const draft: Package = {
      id: "",
      planKey: `${category}_custom_${Date.now()}`,
      name: "",
      category,
      tier: maxTier + 1,
      description: "",
      monthlyPrice: 0,
      oneTimePrice: 0,
      isPopular: false,
      isEnabled: true,
      moduleKeys: [],
      features: [],
    };
    setDrafts((prev) => [...prev, draft]);
  };

  const removeDraft = (planKey: string) =>
    setDrafts((prev) => prev.filter((p) => p.planKey !== planKey));

  const renderSection = (
    title: string,
    list: Package[],
    draftList: Package[],
    category: "admin" | "rider"
  ) => (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Button size="sm" variant="outline" onClick={() => addDraft(category)} className="gap-1">
          <Plus className="w-4 h-4" /> Add Plan
        </Button>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : list.length === 0 && draftList.length === 0 ? (
        <div className="text-center text-muted-foreground py-10 border rounded-lg border-dashed">
          No plans yet. Click “Add Plan” to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((p) => (
            <PlanCard key={p.id} pkg={p} category={category} onSaved={refetch} />
          ))}
          {draftList.map((p) => (
            <PlanCard
              key={p.planKey}
              pkg={p}
              category={category}
              isNew
              onSaved={() => {
                removeDraft(p.planKey);
                refetch();
              }}
              onRemovedDraft={() => removeDraft(p.planKey)}
            />
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="space-y-8">
      {renderSection("Admin Plans", adminPackages, adminDrafts, "admin")}
      {renderSection("Rider Plans", riderPackages, riderDrafts, "rider")}
    </div>
  );
}

// ─── Tab 2: Purchase Requests ─────────────────────────────────────────────────

function PurchaseRequestsTab({
  orders,
  loading,
  refresh,
}: {
  orders: PackageOrder[];
  loading: boolean;
  refresh: () => void;
}) {
  const { addActivePlan, unlockPackageModules } = useSubscription();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (categoryFilter !== "all" && o.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        o.buyerName.toLowerCase().includes(q) ||
        o.buyerEmail.toLowerCase().includes(q) ||
        o.orderToken.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleApprove = async (order: PackageOrder) => {
    const note = remarks[order.id] ?? "";
    try {
      await approvePackageOrder(order.id, note || null);
      addActivePlan({
        planKey: order.planKey,
        category: order.category as "admin" | "rider",
        billingType: order.billingType,
        packageName: order.packageName,
        orderId: order.id,
      });
      unlockPackageModules(order.planKey);
      toast({ title: "Order approved", description: `${order.packageName} activated.` });
      refresh();
    } catch (err) {
      toast({
        title: "Approve failed",
        description: String((err as Error).message),
        variant: "destructive",
      });
    }
  };

  const handleReject = async (order: PackageOrder) => {
    const note = remarks[order.id] ?? "";
    try {
      await rejectPackageOrder(order.id, note || null);
      toast({ title: "Order rejected", description: `${order.packageName} rejected.` });
      refresh();
    } catch (err) {
      toast({
        title: "Reject failed",
        description: String((err as Error).message),
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email or order token…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-md h-9 px-2 text-sm bg-background"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border rounded-md h-9 px-2 text-sm bg-background"
        >
          <option value="all">All Categories</option>
          <option value="admin">Admin</option>
          <option value="rider">Rider</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No purchase requests found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => (
            <Card key={order.id}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{order.packageName}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      Token: {order.orderToken}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {categoryBadge(order.category)}
                    {statusBadge(order.status)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name: </span>
                    <span>{order.buyerName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email: </span>
                    <span className="break-all">{order.buyerEmail}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone: </span>
                    <span>{order.buyerPhone}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Billing: </span>
                    <span className="capitalize">
                      {order.billingType === "one_time" ? "One-time" : "Monthly"}
                    </span>
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
                    <span>{fmtDate(order.createdAt)}</span>
                  </div>
                </div>

                {order.screenshotDataUrl && (
                  <div>
                    {order.screenshotDataUrl.startsWith("data:") ? (
                      <a
                        href={order.screenshotDataUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={order.screenshotDataUrl}
                          alt="Payment screenshot"
                          className="h-20 w-auto rounded object-cover cursor-pointer border"
                        />
                      </a>
                    ) : (
                      <a
                        href={order.screenshotDataUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        View Screenshot
                      </a>
                    )}
                  </div>
                )}

                {order.status === "pending" && (
                  <div className="space-y-2 border-t pt-3">
                    <Input
                      placeholder="Remarks (optional)…"
                      value={remarks[order.id] ?? ""}
                      onChange={(e) =>
                        setRemarks((r) => ({ ...r, [order.id]: e.target.value }))
                      }
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white gap-1"
                        onClick={() => handleApprove(order)}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1"
                        onClick={() => handleReject(order)}
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                )}

                {/* Inline status-history timeline */}
                {order.history.length > 0 && (
                  <div className="border-t pt-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Status History
                    </p>
                    {order.history.map((h, i) => (
                      <div key={i} className="text-xs flex flex-wrap gap-2">
                        <span className="text-muted-foreground">
                          {h.createdAt ? new Date(h.createdAt).toLocaleString() : "—"}
                        </span>
                        <span className="font-medium capitalize">{h.status}</span>
                        {h.note && (
                          <span className="text-muted-foreground">— {h.note}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Purchase History ──────────────────────────────────────────────────

function PurchaseHistoryTab({
  orders,
  loading,
}: {
  orders: PackageOrder[];
  loading: boolean;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const filtered = useMemo(() => {
    const list = orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (categoryFilter !== "all" && o.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          o.buyerName.toLowerCase().includes(q) ||
          o.buyerEmail.toLowerCase().includes(q) ||
          o.orderToken.toLowerCase().includes(q) ||
          o.packageName.toLowerCase().includes(q)
        );
      }
      return true;
    });
    return [...list].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sortDir === "desc" ? tb - ta : ta - tb;
    });
  }, [orders, statusFilter, categoryFilter, search, sortDir]);

  const exportCsv = () => {
    const headers = [
      "Order Token",
      "Package",
      "Category",
      "Buyer",
      "Email",
      "Phone",
      "Billing",
      "Amount",
      "Status",
      "Start",
      "End",
      "Created",
      "Updated",
    ];
    const rows = filtered.map((o) => [
      o.orderToken,
      o.packageName,
      o.category,
      o.buyerName,
      o.buyerEmail,
      o.buyerPhone,
      o.billingType,
      String(o.amount),
      o.status,
      o.subscriptionStart ?? "",
      o.subscriptionEnd ?? "",
      o.createdAt,
      o.updatedAt,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "purchase-history.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, package or token…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-md h-9 px-2 text-sm bg-background"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border rounded-md h-9 px-2 text-sm bg-background"
        >
          <option value="all">All Categories</option>
          <option value="admin">Admin</option>
          <option value="rider">Rider</option>
        </select>
        <Button size="sm" variant="outline" onClick={exportCsv} className="gap-1">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No purchase history found.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-3 py-2">Order Token</th>
                <th className="text-left font-medium px-3 py-2">Package</th>
                <th className="text-left font-medium px-3 py-2">Buyer</th>
                <th className="text-left font-medium px-3 py-2">Billing</th>
                <th className="text-left font-medium px-3 py-2">Amount</th>
                <th className="text-left font-medium px-3 py-2">Status</th>
                <th className="text-left font-medium px-3 py-2">Start</th>
                <th className="text-left font-medium px-3 py-2">End</th>
                <th className="text-left font-medium px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                    className="hover:text-foreground"
                  >
                    Created {sortDir === "desc" ? "↓" : "↑"}
                  </button>
                </th>
                <th className="text-left font-medium px-3 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const display = deriveDisplay(o);
                return (
                  <tr key={o.id} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{o.orderToken}</td>
                    <td className="px-3 py-2">{o.packageName}</td>
                    <td className="px-3 py-2">
                      <div>{o.buyerName}</div>
                      <div className="text-xs text-muted-foreground">{o.buyerEmail}</div>
                    </td>
                    <td className="px-3 py-2 capitalize">
                      {o.billingType === "one_time" ? "One-time" : "Monthly"}
                    </td>
                    <td className="px-3 py-2">PKR {o.amount.toLocaleString()}</td>
                    <td className="px-3 py-2">
                      {display === "running" ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          Running
                          {o.billingType === "one_time"
                            ? " · Lifetime"
                            : o.subscriptionEnd
                            ? ` · until ${new Date(o.subscriptionEnd).toLocaleDateString()}`
                            : ""}
                        </Badge>
                      ) : display === "expired" ? (
                        <Badge variant="outline" className="text-gray-500 border-gray-300">
                          Expired
                        </Badge>
                      ) : (
                        statusBadge(o.status)
                      )}
                    </td>
                    <td className="px-3 py-2">{o.subscriptionStart ?? "—"}</td>
                    <td className="px-3 py-2">
                      {o.billingType === "one_time"
                        ? "Lifetime"
                        : o.subscriptionEnd ?? "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(o.createdAt)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(o.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function SubscriptionDashboard({ onLogout }: { onLogout: () => void }) {
  // Single shared orders hook so both request + history tabs poll together.
  const { orders, loading: ordersLoading, refresh } = usePackageOrders();
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  return (
    <AdminLayout title="Pricing & Plans">
      <div className="space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-500" />
            <h1 className="text-2xl font-bold">Pricing & Plans</h1>
          </div>
          <Button variant="outline" size="sm" onClick={onLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        <Tabs defaultValue="plans">
          <TabsList>
            <TabsTrigger value="plans">Manage Plans</TabsTrigger>
            <TabsTrigger value="requests" className="gap-2">
              Purchase Requests
              {pendingCount > 0 && (
                <Badge className="bg-orange-500 text-white text-xs px-1.5 py-0 h-5">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">Purchase History</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="pt-4">
            <ManagePlansTab />
          </TabsContent>
          <TabsContent value="requests" className="pt-4">
            <PurchaseRequestsTab
              orders={orders}
              loading={ordersLoading}
              refresh={refresh}
            />
          </TabsContent>
          <TabsContent value="history" className="pt-4">
            <PurchaseHistoryTab orders={orders} loading={ordersLoading} />
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
