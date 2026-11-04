import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import POSLayout from "@/components/pos/POSLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, LayoutGrid } from "lucide-react";

interface PosTable {
  id: string;
  table_no: number;
  name: string;
  seats: number;
  area: string;
  reserved: boolean;
  active: boolean;
}

const empty = { table_no: "", name: "", seats: "4", area: "Main hall" };

export default function POSTables() {
  const { toast } = useToast();
  const [rows, setRows] = useState<PosTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PosTable | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("pos_tables" as any).select("*").order("table_no");
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    setRows((data as unknown as PosTable[]) || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const startAdd = () => {
    setEditing(null);
    setForm({ ...empty, table_no: String((rows.at(-1)?.table_no || 0) + 1) });
    setOpen(true);
  };

  const startEdit = (t: PosTable) => {
    setEditing(t);
    setForm({ table_no: String(t.table_no), name: t.name, seats: String(t.seats), area: t.area });
    setOpen(true);
  };

  const save = async () => {
    if (!form.table_no.trim() || !form.name.trim()) {
      toast({ title: "Table number and name are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      table_no: Number(form.table_no),
      name: form.name.trim(),
      seats: Number(form.seats) || 2,
      area: form.area.trim() || "Main hall",
    };
    const { error } = editing
      ? await supabase.from("pos_tables" as any).update(payload as never).eq("id", editing.id)
      : await supabase.from("pos_tables" as any).insert(payload as never);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    setOpen(false);
    toast({ title: editing ? "Table updated" : "Table added" });
    load();
  };

  const toggle = async (t: PosTable, field: "reserved" | "active") => {
    const { error } = await supabase
      .from("pos_tables" as any)
      .update({ [field]: !t[field] } as never)
      .eq("id", t.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    setRows((prev) => prev.map((x) => (x.id === t.id ? { ...x, [field]: !t[field] } : x)));
  };

  const remove = async (t: PosTable) => {
    const { error } = await supabase.from("pos_tables" as any).delete().eq("id", t.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setRows((prev) => prev.filter((x) => x.id !== t.id));
    toast({ title: "Table removed" });
  };

  return (
    <POSLayout title="Dine in tables">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{rows.length} tables</p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={startAdd}>
                <Plus className="w-4 h-4" /> Add table
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit table" : "New table"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Table number</Label>
                  <Input
                    inputMode="numeric"
                    value={form.table_no}
                    onChange={(e) => setForm({ ...form, table_no: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Seats</Label>
                    <Input
                      inputMode="numeric"
                      value={form.seats}
                      onChange={(e) => setForm({ ...form, seats: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Area</Label>
                    <Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
                  </div>
                </div>
                <Button className="w-full" disabled={saving} onClick={save}>
                  {saving ? "Saving" : "Save table"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            <LayoutGrid className="w-8 h-8 mx-auto mb-2" />
            No tables yet. Add your first table.
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {rows.map((t) => (
              <Card key={t.id} className={`p-4 space-y-2 ${t.reserved ? "border-primary" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Table {t.table_no} · {t.seats} seats · {t.area}
                    </p>
                  </div>
                  <Badge variant={t.reserved ? "default" : "secondary"} className="shrink-0">
                    {t.reserved ? "Reserved" : "Free"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Reserved</span>
                  <Switch checked={t.reserved} onCheckedChange={() => toggle(t, "reserved")} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Active</span>
                  <Switch checked={t.active} onCheckedChange={() => toggle(t, "active")} />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => startEdit(t)}>
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(t)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </POSLayout>
  );
}
