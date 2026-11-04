import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Wallet } from "lucide-react";

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  note: string | null;
  created_at: string;
}

const money = (n: number) => `Rs. ${Number(n || 0).toLocaleString()}`;
const empty = { title: "", amount: "", category: "Kitchen", note: "" };

export default function POSExpenses() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [rows, setRows] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("pos_expenses" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    setRows((data as unknown as Expense[]) || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const todayTotal = useMemo(() => {
    const today = new Date().toDateString();
    return rows
      .filter((r) => new Date(r.created_at).toDateString() === today)
      .reduce((s, r) => s + Number(r.amount), 0);
  }, [rows]);

  const monthTotal = useMemo(() => {
    const now = new Date();
    return rows
      .filter((r) => {
        const d = new Date(r.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, r) => s + Number(r.amount), 0);
  }, [rows]);

  const save = async () => {
    if (!form.title.trim() || !form.amount.trim()) {
      toast({ title: "Title and amount are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("pos_expenses" as any).insert({
      title: form.title.trim(),
      amount: Number(form.amount) || 0,
      category: form.category.trim() || "General",
      note: form.note.trim() || null,
      created_by: user?.id ?? null,
    } as never);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    setForm(empty);
    setOpen(false);
    toast({ title: "Expense recorded" });
    load();
  };

  const remove = async (e: Expense) => {
    const { error } = await supabase.from("pos_expenses" as any).delete().eq("id", e.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setRows((prev) => prev.filter((x) => x.id !== e.id));
  };

  return (
    <POSLayout title="Daily expenses">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Today</p>
            <p className="text-xl font-bold text-primary">{money(todayTotal)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">This month</p>
            <p className="text-xl font-bold">{money(monthTotal)}</p>
          </Card>
        </div>

        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Add expense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>New expense</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Amount</Label>
                    <Input
                      inputMode="decimal"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Note</Label>
                  <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                </div>
                <Button className="w-full" disabled={saving} onClick={save}>
                  {saving ? "Saving" : "Save expense"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            <Wallet className="w-8 h-8 mx-auto mb-2" />
            No expenses recorded yet.
          </Card>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <Card key={r.id} className="p-4 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()} {r.note ? `· ${r.note}` : ""}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {r.category}
                </Badge>
                <p className="font-bold shrink-0">{money(Number(r.amount))}</p>
                <Button size="sm" variant="ghost" onClick={() => remove(r)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </POSLayout>
  );
}
