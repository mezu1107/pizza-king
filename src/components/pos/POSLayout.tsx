import { ReactNode, useEffect, useRef } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { usePWAManifest } from "@/hooks/usePWAInstall";
import { usePushRegistration } from "@/hooks/usePushRegistration";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ScanLine,
  ReceiptText,
  Package,
  BarChart3,
  Download,
  LogOut,
  ArrowLeft,
  LayoutGrid,
  ChefHat,
  Users,
  Wallet,
  Banknote,
  UserCog,
} from "lucide-react";

export const posNavItems = [
  { title: "Terminal", url: "/pos", icon: ScanLine, end: true },
  { title: "Tables", url: "/pos/tables", icon: LayoutGrid },
  { title: "Orders", url: "/pos/orders", icon: ReceiptText },
  { title: "Kitchen", url: "/pos/kitchen", icon: ChefHat },
  { title: "Products", url: "/pos/products", icon: Package },
  { title: "Customers", url: "/pos/customers", icon: Users },
  { title: "Expenses", url: "/pos/expenses", icon: Wallet },
  { title: "Cash Shift", url: "/pos/shift", icon: Banknote },
  { title: "Reports", url: "/pos/reports", icon: BarChart3 },
  { title: "Staff", url: "/pos/staff", icon: UserCog },
];

const money = (n: number) => `Rs. ${Number(n || 0).toLocaleString()}`;

export default function POSLayout({ children, title }: { children: ReactNode; title?: string }) {
  const { isAdmin, loading, user } = useAdminCheck();
  const { signOut } = useAuth();
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const seen = useRef<Set<string>>(new Set());
  usePWAManifest("/manifest-pos.json");
  usePushRegistration("admin");

  // Global live alert: every website / WhatsApp / POS order lands here instantly.
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("pos-live-orders")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const row = payload.new as { id: string; customer_name?: string | null; total: number; source?: string | null };
        if (seen.current.has(row.id)) return;
        seen.current.add(row.id);
        toast({
          title: `🔔 New ${(row.source || "web").toUpperCase()} order`,
          description: `${row.customer_name || "Customer"} • ${money(row.total)}`,
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/pos/login" replace state={{ from: location.pathname }} />;
  if (!isAdmin) return <Navigate to="/pos/login" replace state={{ from: location.pathname }} />;

  const handleSignOut = async () => {
    await signOut();
    navigate("/pos/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-14 shrink-0 flex items-center gap-3 px-3 md:px-5 border-b border-border bg-card sticky top-0 z-30">
        <NavLink to="/admin" className="text-muted-foreground hover:text-foreground" aria-label="Back to admin">
          <ArrowLeft className="w-5 h-5" />
        </NavLink>
        <h1 className="font-heading font-bold text-base md:text-lg truncate">{title || "POS"}</h1>
        <div className="ml-auto flex items-center gap-2">
          {canInstall && !installed && (
            <Button size="sm" variant="outline" onClick={promptInstall} className="gap-1.5">
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">Install</span>
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={handleSignOut} className="gap-1.5">
            <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      {/* Desktop nav */}
      <nav className="hidden md:flex gap-1 px-5 py-2 border-b border-border bg-card/50 overflow-x-auto">
        {posNavItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.end}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted whitespace-nowrap"
            activeClassName="bg-primary/10 text-primary font-semibold"
          >
            <item.icon className="w-4 h-4" />
            {item.title}
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 p-3 md:p-6 pb-24 md:pb-6 overflow-x-hidden">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex overflow-x-auto bg-card border-t border-border">
        {posNavItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.end}
            className="flex flex-col items-center gap-0.5 py-2.5 px-4 text-[11px] text-muted-foreground shrink-0"
            activeClassName="text-primary font-semibold"
          >
            <item.icon className="w-5 h-5" />
            {item.title}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
