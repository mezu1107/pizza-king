import RiderLayout from "@/components/rider/RiderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Wallet, ArrowDownToLine, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { deliveryEarnings } from "@/lib/riderRewards";

const RiderWallet = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [p, o, s] = await Promise.all([
        supabase.from("rider_payouts" as any).select("*").eq("rider_id", user.id).order("created_at", { ascending: false }),
        supabase.from("orders").select("total, distance_km, status").eq("rider_id", user.id).eq("status", "delivered"),
        supabase.from("rider_settings" as any).select("*").limit(1).single(),
      ]);
      setPayouts(((p as any).data || []) as any[]);
      setOrders(((o as any).data || []) as any[]);
      setSettings((s as any).data);
    })();
  }, [user]);

  const totalEarned = orders.reduce((s, o) => s + deliveryEarnings(o, settings), 0);
  const totalPaid = payouts.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const balance = totalEarned - totalPaid;
  const minPayout = Number(settings?.min_payout ?? 0);

  const requestPayout = async () => {
    if (!user || !settings || payouts.some(p => p.status === "pending")) return;
    if (balance < minPayout) {
      toast({ title: `Minimum payout is Rs. ${minPayout.toLocaleString()}`, variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("rider_payouts" as any).insert({
      rider_id: user.id, amount: balance, status: "pending",
      period_end: new Date().toISOString().slice(0, 10),
    });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Payout requested! 💰" }); window.location.reload(); }
  };

  return (
    <RiderLayout title="Wallet">
      <div className="max-w-3xl space-y-6">
        <h1 className="text-2xl font-heading font-bold">My Wallet</h1>

        <Card className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm opacity-90"><Wallet className="w-4 h-4" /> Available Balance</div>
            <p className="text-4xl font-bold mt-2">Rs. {Math.round(balance).toLocaleString()}</p>
            <p className="text-xs opacity-80 mt-1">Min payout: Rs. {minPayout.toLocaleString()}</p>
            <Button onClick={requestPayout} disabled={!settings || balance <= 0 || payouts.some(p => p.status === "pending")} variant="secondary" className="mt-4 gap-2">
              <ArrowDownToLine className="w-4 h-4" /> Request Payout
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Earned</p><p className="text-xl font-bold">Rs. {Math.round(totalEarned).toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Paid Out</p><p className="text-xl font-bold">Rs. {Math.round(totalPaid).toLocaleString()}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-5 h-5" /> Payout History</CardTitle></CardHeader>
          <CardContent>
            {payouts.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">No payouts yet.</p>
            ) : (
              <div className="space-y-2">
                {payouts.map((p) => (
                  <div key={p.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/30 text-sm">
                    <div>
                      <p className="font-semibold">Rs. {Number(p.amount).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs capitalize ${p.status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>{p.status}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RiderLayout>
  );
};
export default RiderWallet;
