import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export const MODULE_PRICES: Record<string, { name: string; description: string; oneTime: number; monthly: number }> = {
  "/admin/deals": { name: "Deals Management", description: "Create and manage flash deals and promotions", oneTime: 2500, monthly: 999 },
  "/admin/categories": { name: "Categories", description: "Organize menu with custom categories", oneTime: 1500, monthly: 599 },
  "/admin/coupons": { name: "Coupons", description: "Generate and manage discount coupons", oneTime: 2000, monthly: 799 },
  "/admin/customers": { name: "Customers", description: "Full customer management and analytics", oneTime: 3000, monthly: 1199 },
  "/admin/riders": { name: "Riders Management", description: "Manage delivery riders and assignments", oneTime: 3500, monthly: 1399 },
  "/admin/delivery-zones": { name: "Delivery Zones", description: "Configure delivery areas and pricing", oneTime: 2000, monthly: 799 },
  "/admin/reviews": { name: "Reviews", description: "Monitor and respond to customer reviews", oneTime: 1500, monthly: 599 },
  "/admin/settings": { name: "Settings", description: "Full app configuration and customization", oneTime: 2500, monthly: 999 },
  "/rider/map": { name: "Live Map", description: "Real-time GPS tracking map for riders", oneTime: 2000, monthly: 799 },
  "/rider/earnings": { name: "Earnings", description: "Detailed earnings and payout tracking", oneTime: 1500, monthly: 599 },
  "/rider/wallet": { name: "Wallet", description: "Rider wallet and withdrawal management", oneTime: 1500, monthly: 599 },
  "/rider/history": { name: "History", description: "Full delivery history and records", oneTime: 1000, monthly: 399 },
  "/rider/schedule": { name: "Schedule", description: "Shift scheduling and availability", oneTime: 1500, monthly: 599 },
  "/rider/notifications": { name: "Notifications", description: "Push notifications for riders", oneTime: 1000, monthly: 399 },
  "/rider/chat": { name: "Chat Support", description: "In-app chat with support team", oneTime: 2000, monthly: 799 },
  "/rider/reviews": { name: "Reviews", description: "Customer ratings and feedback", oneTime: 1000, monthly: 399 },
  "/rider/performance": { name: "Performance", description: "Detailed performance analytics", oneTime: 1500, monthly: 599 },
  "/rider/documents": { name: "Documents", description: "Document upload and verification", oneTime: 1000, monthly: 399 },
  "/rider/help": { name: "Help Center", description: "Access to help docs and support", oneTime: 800, monthly: 299 },
  "/rider/settings": { name: "Settings", description: "Rider app settings and preferences", oneTime: 800, monthly: 299 },
};

export interface ModuleDefinition {
  key: string;
  name: string;
  group: "admin" | "rider";
  free: boolean;
}

export const MODULES: ModuleDefinition[] = [
  // Free admin modules
  { key: "/admin", name: "Dashboard", group: "admin", free: true },
  { key: "/admin/orders", name: "Orders", group: "admin", free: true },
  { key: "/admin/menu", name: "Menu Items", group: "admin", free: true },
  { key: "/admin/dine-in", name: "Dine In & QR", group: "admin", free: true },
  // Locked admin modules
  { key: "/admin/deals", name: "Deals", group: "admin", free: false },
  { key: "/admin/categories", name: "Categories", group: "admin", free: false },
  { key: "/admin/coupons", name: "Coupons", group: "admin", free: false },
  { key: "/admin/customers", name: "Customers", group: "admin", free: false },
  { key: "/admin/riders", name: "Riders", group: "admin", free: false },
  { key: "/admin/delivery-zones", name: "Delivery Zones", group: "admin", free: false },
  { key: "/admin/reviews", name: "Reviews", group: "admin", free: false },
  { key: "/admin/settings", name: "Settings", group: "admin", free: false },
  // Free rider modules
  { key: "/rider", name: "Dashboard", group: "rider", free: true },
  { key: "/rider/orders", name: "Active Orders", group: "rider", free: true },
  { key: "/rider/profile", name: "Profile", group: "rider", free: true },
  // Locked rider modules
  { key: "/rider/map", name: "Live Map", group: "rider", free: false },
  { key: "/rider/earnings", name: "Earnings", group: "rider", free: false },
  { key: "/rider/wallet", name: "Wallet", group: "rider", free: false },
  { key: "/rider/history", name: "History", group: "rider", free: false },
  { key: "/rider/schedule", name: "Schedule", group: "rider", free: false },
  { key: "/rider/notifications", name: "Notifications", group: "rider", free: false },
  { key: "/rider/chat", name: "Chat Support", group: "rider", free: false },
  { key: "/rider/reviews", name: "Reviews", group: "rider", free: false },
  { key: "/rider/performance", name: "Performance", group: "rider", free: false },
  { key: "/rider/documents", name: "Documents", group: "rider", free: false },
  { key: "/rider/help", name: "Help Center", group: "rider", free: false },
  { key: "/rider/settings", name: "Settings", group: "rider", free: false },
];

const STORAGE_KEY = "pizza_king_modules";

interface SubscriptionContextType {
  modules: ModuleDefinition[];
  unlockedModules: string[];
  isModuleLocked: (key: string) => boolean;
  unlockModule: (key: string) => void;
  lockModule: (key: string) => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const [unlockedModules, setUnlockedModules] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unlockedModules));
  }, [unlockedModules]);

  const isModuleLocked = (key: string): boolean => {
    const mod = MODULES.find((m) => m.key === key);
    if (!mod) return false;
    if (mod.free) return false;
    return !unlockedModules.includes(key);
  };

  const unlockModule = (key: string) => {
    setUnlockedModules((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  const lockModule = (key: string) => {
    setUnlockedModules((prev) => prev.filter((k) => k !== key));
  };

  return (
    <SubscriptionContext.Provider
      value={{ modules: MODULES, unlockedModules, isModuleLocked, unlockModule, lockModule }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error("useSubscription must be used within SubscriptionProvider");
  return context;
};
