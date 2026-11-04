import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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
