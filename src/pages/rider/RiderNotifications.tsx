import RiderLayout from "@/components/rider/RiderLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const RiderNotifications = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("rider_notifications" as any).select("*").eq("rider_id", user.id).order("created_at", { ascending: false });
    setItems((data as any[]) || []);
  };

  useEffect(() => { load(); }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("rider_notifications" as any).update({ read: true }).eq("rider_id", user.id).eq("read", false);
    load();
  };

  return (
    <RiderLayout title="Notifications">
      <div className="max-w-2xl space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2"><Bell className="w-6 h-6" /> Notifications</h1>
          <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1"><CheckCheck className="w-3.5 h-3.5" /> Mark all read</Button>
        </div>
        {items.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No notifications yet.</p>
        ) : (
          <div className="space-y-2">
            {items.map((n) => (
              <Card key={n.id} className={n.read ? "opacity-70" : "border-primary/40"}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="font-semibold text-sm">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{n.body}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(n.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RiderLayout>
  );
};
export default RiderNotifications;
