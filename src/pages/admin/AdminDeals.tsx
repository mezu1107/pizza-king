import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface DealRow {
  id: string;
  title: string;
  description: string | null;
  price: number;
  old_price: number | null;
  discount_text: string;
  image_url: string;
  badge: string;
  active: boolean;
  featured: boolean;
  created_at: string;
}

const emptyForm = {
  title: "",
  description: "",
  price: "",
  old_price: "",
  discount_text: "",
  image_url: "",
  badge: "discount",
  active: true,
  featured: true,
};

const AdminDeals = () => {
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchDeals = async () => {
    const { data } = await supabase.from("deals").select("*").order("created_at", { ascending: false });
    setDeals((data || []) as DealRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchDeals(); }, []);

  const openCreate = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };

  const openEdit = (deal: DealRow) => {
    setEditId(deal.id);
    setForm({
      title: deal.title,
      description: deal.description || "",
      price: String(deal.price),
      old_price: deal.old_price ? String(deal.old_price) : "",
      discount_text: deal.discount_text,
      image_url: deal.image_url,
      badge: deal.badge,
      active: deal.active,
      featured: deal.featured,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.price || !form.image_url.trim()) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: any = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      price: parseFloat(form.price),
      old_price: form.old_price ? parseFloat(form.old_price) : null,
      discount_text: form.discount_text.trim() || "Hot Deal",
      image_url: form.image_url.trim(),
      badge: form.badge || "discount",
      active: form.active,
      featured: form.featured,
    };

    const { error } = editId
      ? await supabase.from("deals").update(payload).eq("id", editId)
      : await supabase.from("deals").insert(payload);

    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editId ? "Deal updated! ✅" : "Deal created! 🎉" });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchDeals();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this deal?")) return;
    const { error } = await supabase.from("deals").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deal deleted" }); fetchDeals(); }
  };

  const filtered = deals.filter((d) => d.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout title="Deals Management">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search deals..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Add Deal</Button>
        </div>

        {loading ? (
          <p className="text-center py-12 text-muted-foreground">Loading...</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground">Image</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground">Title</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground hidden md:table-cell">Price</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground hidden md:table-cell">Discount</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground hidden sm:table-cell">Status</th>
                      <th className="py-3 px-4 text-right font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filtered.map((deal) => (
                        <motion.tr key={deal.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="py-3 px-4"><img src={deal.image_url} alt={deal.title} className="w-12 h-12 rounded-lg object-cover" /></td>
                          <td className="py-3 px-4 font-semibold">{deal.title}</td>
                          <td className="py-3 px-4 hidden md:table-cell">
                            <span className="font-semibold">Rs. {Number(deal.price).toLocaleString()}</span>
                            {deal.old_price && <span className="text-muted-foreground line-through ml-2 text-xs">Rs. {Number(deal.old_price).toLocaleString()}</span>}
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell"><span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-semibold">{deal.discount_text}</span></td>
                          <td className="py-3 px-4 hidden sm:table-cell">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${deal.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{deal.active ? "Active" : "Inactive"}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(deal)}><Pencil className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(deal.id)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
                {filtered.length === 0 && <p className="text-center py-12 text-muted-foreground">No deals found.</p>}
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "Edit Deal" : "Add Deal"}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Price *</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                <div><Label>Old Price</Label><Input type="number" value={form.old_price} onChange={(e) => setForm({ ...form, old_price: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Discount Text</Label><Input value={form.discount_text} onChange={(e) => setForm({ ...form, discount_text: e.target.value })} placeholder="e.g. 40% OFF" /></div>
                <div><Label>Badge</Label><Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="discount or combo" /></div>
              </div>
              <div><Label>Image URL *</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
              {form.image_url && <img src={form.image_url} alt="Preview" className="w-full h-40 object-cover rounded-lg" />}
              <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /></div>
              <div className="flex items-center justify-between"><Label>Featured</Label><Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} /></div>
              <div className="flex gap-3 pt-2">
                <Button className="flex-1" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editId ? "Update" : "Create"}</Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminDeals;
