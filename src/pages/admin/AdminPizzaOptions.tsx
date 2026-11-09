import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Save, Trash2 } from "lucide-react";

interface Row { key: string; label: string; price: number; sort: number; active: boolean }
const GROUPS = [
  { prefix: "crust", title: "Crusts", hint: "Customer picks one" },
  { prefix: "top", title: "Extra toppings", hint: "Customer can pick many" },
  { prefix: "dip", title: "Dips & sauces", hint: "Customer can pick many" },
];
const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

export default function AdminPizzaOptions() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { label: string; price: string }>>({});

  const load = useCallback(async () => {
    const { data } = await supabase.from("pizza_options").select("key,label,price,sort,active").order("sort");
    setRows(((data as Row[]) || []).map((r) => ({ ...r, price: Number(r.price) })));
  }, []);
  useEffect(() => { load(); }, [load]);

  const patch = (key: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));

  const save = async (r: Row) => {
    if (!r.label.trim() || r.price < 0) return toast({ title: "Enter a name and a valid price", variant: "destructive" });
    const { error } = await supabase.from("pizza_options").update({ label: r.label.trim(), price: r.price, active: r.active, sort: r.sort }).eq("key", r.key);
    if (error) return toast({ title: "Could not save", description: error.message, variant: "destructive" });
    toast({ title: `${r.label} saved` });
  };

  const toggle = async (r: Row, active: boolean) => {
    patch(r.key, { active });
    const { error } = await supabase.from("pizza_options").update({ active }).eq("key", r.key);
    if (error) { toast({ title: "Could not update", description: error.message, variant: "destructive" }); load(); }
  };

  const remove = async (r: Row) => {
    if (!confirm(`Delete ${r.label}?`)) return;
    const { error } = await supabase.from("pizza_options").delete().eq("key", r.key);
    if (error) return toast({ title: "Could not delete", description: error.message, variant: "destructive" });
    load();
  };

  const add = async (prefix: string) => {
    const d = drafts[prefix] || { label: "", price: "" };
    const price = Number(d.price);
    const s = slug(d.label);
    if (!s || !Number.isFinite(price) || price < 0) return toast({ title: "Enter a name and a valid price", variant: "destructive" });
    const sort = Math.max(0, ...rows.filter((r) => r.key.startsWith(`${prefix}:`)).map((r) => r.sort)) + 1;
    const { error } = await supabase.from("pizza_options").insert({ key: `${prefix}:${s}`, label: d.label.trim(), price, sort });
    if (error) return toast({ title: "Could not add", description: error.message.includes("duplicate") ? "This option already exists" : error.message, variant: "destructive" });
    setDrafts((x) => ({ ...x, [prefix]: { label: "", price: "" } }));
    load();
  };

  return (
    <AdminLayout title="Pizza crusts & toppings">
      <p className="text-sm text-muted-foreground mb-4">Prices you set here show on the menu and are charged at checkout. Turn an option off to hide it.</p>
      <div className="grid gap-4 lg:grid-cols-3">
        {GROUPS.map((g) => (
          <Card key={g.prefix} className="p-4 space-y-3">
            <div><h2 className="font-bold text-lg">{g.title}</h2><p className="text-xs text-muted-foreground">{g.hint}</p></div>
            {rows.filter((r) => r.key.startsWith(`${g.prefix}:`)).map((r) => (
              <div key={r.key} className="flex items-center gap-2">
                <Switch checked={r.active} onCheckedChange={(v) => toggle(r, v)} aria-label="Show on menu" />
                <Input value={r.label} onChange={(e) => patch(r.key, { label: e.target.value })} className="flex-1" maxLength={80} />
                <Input type="number" min={0} value={r.price} onChange={(e) => patch(r.key, { price: Number(e.target.value) })} className="w-24" aria-label="Price" />
                <Button size="icon" variant="outline" onClick={() => save(r)} title="Save"><Save className="w-4 h-4" /></Button>
                <Button size="icon" variant="outline" onClick={() => remove(r)} title="Delete"><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
            <div className="flex items-center gap-2 border-t pt-3">
              <Input placeholder="New option name" value={drafts[g.prefix]?.label || ""} maxLength={80}
                onChange={(e) => setDrafts((x) => ({ ...x, [g.prefix]: { ...(x[g.prefix] || { price: "" }), label: e.target.value } }))} className="flex-1" />
              <Input placeholder="Rs" type="number" min={0} value={drafts[g.prefix]?.price || ""}
                onChange={(e) => setDrafts((x) => ({ ...x, [g.prefix]: { ...(x[g.prefix] || { label: "" }), price: e.target.value } }))} className="w-24" />
              <Button size="icon" onClick={() => add(g.prefix)} title="Add"><Plus className="w-4 h-4" /></Button>
            </div>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}
