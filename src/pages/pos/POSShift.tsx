import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import POSLayout from "@/components/pos/POSLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Banknote } from "lucide-react";

interface Shift {
  id: string;
  cashier_id: string;
  cashier_name: string | null;
  opening_cash: number;
  closing_cash: number | null;
  expected_cash: number | null;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
}

const money = (n: number) => `Rs. ${Number(n || 0).toLocaleString()}`;

export default function POSShift() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [current, setCurrent] = useState<Shift | null>(null);
  const [history, setHistory] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState("");
  const [closing, setClosing] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [cashSales, setCashSales] = useState(0);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("pos_shifts" as any)
      .select("*")
      .order("opened_at", { ascending: false })
      .limit(30);
    const rows = (data as unknown as Shift[]) || [];
    const open = rows.find((r) => !r.closed_at) || null;
    setCurrent(open);
    setHistory(rows.filter((r) => r.closed_at));
    setLoading(false);

    if (open) {
      const { data: orders } = await supabase
        .from("orders")
        .select("amount_paid,payment_method,created_at")
        .eq("source", "pos")
        .gte("created_at", open.opened_at);
      const total = ((orders as any[]) || [])
        .filter((o) => (o.payment_method || "cash") === "cash")
        .reduce((s, o) => s + Number(o.amount_paid || 0), 0);
      setCashSales(total);
    } else {
      setCashSales(0);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openShift = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("pos_shifts" as any).insert({
      cashier_id: user.id,
      cashier_name: user.email ?? null,
      opening_cash: Number(opening) || 0,
    } as never);
    setBusy(false);
    if (error) {
      toast({ title: "Could not open shift", description: error.message, variant: "destructive" });
      return;
    }
    setOpening("");
    toast({ title: "Shift opened" });
    load();
  };

  const closeShift = async () => {
    if (!current) return;
    setBusy(true);
    const expected = Number(current.opening_cash) + cashSales;
    const { error } = await supabase
      .from("pos_shifts" as any)
      .update({
        closing_cash: Number(closing) || 0,
        expected_cash: expected,
        closed_at: new Date().toISOString(),
        notes: notes.trim() || null,
      } as never)
      .eq("id", current.id);
    setBusy(false);
    if (error) {
      toast({ title: "Could not close shift", description: error.message, variant: "destructive" });
      return;
    }
    setClosing("");
    setNotes("");
    toast({ title: "Shift closed" });
    load();
  };

  if (loading) {
    return (
      <POSLayout title="Cash shift">
        <Skeleton className="h-48 rounded-xl" />
      </POSLayout>
    );
  }

  const expected = current ? Number(current.opening_cash) + cashSales : 0;

  return (
    <POSLayout title="Cash shift">
      <div className="space-y-4 max-w-3xl">
        {current ? (
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Shift running</p>
                <p className="text-xs text-muted-foreground">
                  Opened {new Date(current.opened_at).toLocaleString()} by {current.cashier_name || "cashier"}
                </p>
              </div>
              <Badge>Open</Badge>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">Opening cash</p>
                <p className="font-bold">{money(Number(current.opening_cash))}</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">Cash sales</p>
                <p className="font-bold">{money(cashSales)}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3">
                <p className="text-xs text-muted-foreground">Expected in drawer</p>
                <p className="font-bold text-primary">{money(expected)}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Counted cash</Label>
                <Input inputMode="decimal" value={closing} onChange={(e) => setClosing(e.target.value)} />
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            {closing !== "" && (
              <p className="text-sm">
                Difference:{" "}
                <span className={Number(closing) - expected < 0 ? "text-destructive font-bold" : "font-bold"}>
                  {money(Number(closing) - expected)}
                </span>
              </p>
            )}
            <Button className="w-full" disabled={busy} onClick={closeShift}>
              Close shift
            </Button>
          </Card>
        ) : (
          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-primary" />
              <p className="font-semibold">Start a new shift</p>
            </div>
            <div>
              <Label>Opening cash in drawer</Label>
              <Input inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} />
            </div>
            <Button className="w-full" disabled={busy} onClick={openShift}>
              Open shift
            </Button>
          </Card>
        )}

        <div className="space-y-2">
          <p className="text-sm font-semibold">Past shifts</p>
          {history.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">No closed shifts yet.</Card>
          ) : (
            history.map((s) => {
              const diff = Number(s.closing_cash || 0) - Number(s.expected_cash || 0);
              return (
                <Card key={s.id} className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.cashier_name || "Cashier"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.opened_at).toLocaleString()} to{" "}
                      {s.closed_at ? new Date(s.closed_at).toLocaleTimeString() : ""}
                    </p>
                  </div>
                  <p className="text-sm">{money(Number(s.closing_cash || 0))}</p>
                  <Badge variant={diff < 0 ? "destructive" : "secondary"}>{money(diff)}</Badge>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </POSLayout>
  );
}
