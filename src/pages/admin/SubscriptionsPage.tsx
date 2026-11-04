import AdminLayout from "@/components/admin/AdminLayout";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Lock } from "lucide-react";

export default function SubscriptionsPage() {
  const { modules, isModuleLocked, unlockModule, lockModule } = useSubscription();

  const adminModules = modules.filter((m) => m.group === "admin");
  const riderModules = modules.filter((m) => m.group === "rider");

  const handleToggle = (key: string, checked: boolean) => {
    if (checked) {
      unlockModule(key);
    } else {
      lockModule(key);
    }
  };

  const renderGrid = (mods: typeof modules) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {mods.map((mod) => (
        <Card key={mod.key}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-base leading-tight">{mod.name}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1 truncate">{mod.key}</p>
              </div>
              {mod.free ? (
                <Badge variant="secondary" className="shrink-0">
                  Always Free
                </Badge>
              ) : (
                <Lock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2">
              <Switch
                checked={!isModuleLocked(mod.key)}
                onCheckedChange={(checked) => handleToggle(mod.key, checked)}
                disabled={mod.free}
              />
              <span className="text-sm text-muted-foreground">
                {mod.free ? "Enabled" : isModuleLocked(mod.key) ? "Locked" : "Unlocked"}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <AdminLayout title="Subscriptions">
      <div className="space-y-8">
        {/* Page heading */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-500" />
            <h1 className="text-2xl font-bold">Module Subscriptions</h1>
          </div>
          <p className="text-muted-foreground">
            Toggle which modules are active. Free modules are always available.
          </p>
        </div>

        {/* Admin modules */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Admin Modules</h2>
          {renderGrid(adminModules)}
        </section>

        {/* Rider modules */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Rider Modules</h2>
          {renderGrid(riderModules)}
        </section>

        {/* Footer CTA */}
        <div className="pt-4">
          <Button
            asChild
            className="bg-gradient-to-r from-orange-500 to-red-600 text-white hover:opacity-90"
          >
            <a href="#">Buy All Modules</a>
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
