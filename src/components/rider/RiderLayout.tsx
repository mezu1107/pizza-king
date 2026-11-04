import { ReactNode } from "react";
import { Navigate, Link, useLocation } from "react-router-dom";
import { useRiderCheck } from "@/hooks/useRiderCheck";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Skeleton } from "@/components/ui/skeleton";
import { usePushRegistration } from "@/hooks/usePushRegistration";
import { usePWAManifest } from "@/hooks/usePWAInstall";
import {
  Bike, LayoutDashboard, Package, User, LogOut, Map, Wallet, History,
  Calendar, Bell, MessageSquare, Star, HelpCircle, Settings, TrendingUp,
  FileText, DollarSign, Lock,
} from "lucide-react";
import logo from "@/assets/logo.png";
import RiderTracking from "@/components/rider/RiderTracking";

interface RiderLayoutProps {
  children: ReactNode;
  title?: string;
}

export const riderNav = [
  { title: "Dashboard", url: "/rider", icon: LayoutDashboard },
  { title: "Active Orders", url: "/rider/orders", icon: Package },
  { title: "Live Map", url: "/rider/map", icon: Map },
  { title: "Earnings", url: "/rider/earnings", icon: DollarSign },
  { title: "Wallet", url: "/rider/wallet", icon: Wallet },
  { title: "History", url: "/rider/history", icon: History },
  { title: "Schedule", url: "/rider/schedule", icon: Calendar },
  { title: "Notifications", url: "/rider/notifications", icon: Bell },
  { title: "Chat Support", url: "/rider/chat", icon: MessageSquare },
  { title: "Reviews", url: "/rider/reviews", icon: Star },
  { title: "Performance", url: "/rider/performance", icon: TrendingUp },
  { title: "Documents", url: "/rider/documents", icon: FileText },
  { title: "Help Center", url: "/rider/help", icon: HelpCircle },
  { title: "Settings", url: "/rider/settings", icon: Settings },
  { title: "Profile", url: "/rider/profile", icon: User },
];

export default function RiderLayout({ children, title }: RiderLayoutProps) {
  const { isRider, loading, user } = useRiderCheck();
  const { signOut } = useAuth();
  const { isModuleLocked } = useSubscription();
  const location = useLocation();
  usePushRegistration("rider");
  usePWAManifest("/manifest-rider.json");

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

  if (!user) return <Navigate to="/rider/login" replace />;
  if (!isRider) return <Navigate to="/" replace />;

  const isActive = (path: string) =>
    path === "/rider" ? location.pathname === "/rider" : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top nav */}
      <header className="h-14 flex items-center border-b border-border px-4 gap-3 bg-card shrink-0 sticky top-0 z-40">
        <img src={logo} alt="Logo" className="w-8 h-8 rounded-full ring-2 ring-primary/30" />
        <div className="leading-tight">
          <p className="font-heading font-bold text-sm text-foreground">Pizza King Rider</p>
          <p className="text-[10px] italic text-muted-foreground -mt-0.5">Fast Food • Big Taste • Young Vibes</p>
        </div>
        <div className="flex-1" />
        {title && <span className="text-sm font-medium text-muted-foreground hidden sm:block">{title}</span>}
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Side nav */}
        <nav className="w-16 lg:w-60 border-r border-border bg-card flex flex-col py-3 shrink-0 overflow-y-auto">
          {riderNav.map((item) => (
            <Link
              key={item.url}
              to={item.url}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive(item.url)
                  ? "bg-primary/10 text-primary font-semibold border-r-2 border-primary"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="hidden lg:inline">{item.title}</span>
              {isModuleLocked(item.url) && <Lock className="hidden lg:inline w-3 h-3 ml-auto shrink-0 text-muted-foreground" />}
            </Link>
          ))}
          <div className="flex-1" />
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground hover:text-destructive transition-colors border-t border-border mt-2"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="hidden lg:inline">Sign Out</span>
          </button>
        </nav>

        {/* Content */}
        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8 overflow-auto pb-20 lg:pb-8">
          <RiderTracking riderId={user.id} />
          {children}
        </main>
      </div>

      {/* Mobile bottom nav (top 5 items) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around py-2 z-50">
        {riderNav.slice(0, 5).map((item) => (
          <Link
            key={item.url}
            to={item.url}
            className={`flex flex-col items-center gap-0.5 text-[10px] ${
              isActive(item.url) ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <div className="relative">
              <item.icon className="w-5 h-5" />
              {isModuleLocked(item.url) && <Lock className="absolute -top-1 -right-1 w-2.5 h-2.5 text-yellow-500" />}
            </div>
            {item.title.split(" ")[0]}
          </Link>
        ))}
      </nav>
    </div>
  );
}
