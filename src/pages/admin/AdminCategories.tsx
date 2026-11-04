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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CategoryRow {
  id: string;
  title: string;
  image_url: string;
  active: boolean;
  featured: boolean;
  created_at: string;
}

const emptyForm = { title: "", image_url: "", active: true, featured: true };

const AdminCategories = () => {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("title");
    setCategories((data || []) as CategoryRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const openCreate = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (cat: CategoryRow) => {
    setEditId(cat.id);
    setForm({ title: cat.title, image_url: cat.image_url, active: cat.active, featured: cat.featured });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.image_url.trim()) {
      toast({ title: "Fill required fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: any = {
      title: form.title.trim(),
      image_url: form.image_url.trim(),
      active: form.active,
      featured: form.featured,
    };

    const { error } = editId
      ? await supabase.from("categories").update(payload).eq("id", editId)
      : await supabase.from("categories").insert(payload);

    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else toast({ title: editId ? "Category updated! ✅" : "Category created! 🎉" });

    setSaving(false);
    setDialogOpen(false);
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Category deleted" }); fetchCategories(); }
  };

  return (
    <AdminLayout title="Category Management">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Add Category</Button>
        </div>

        {loading ? (
          <p className="text-center py-12 text-muted-foreground">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {categories.map((cat) => (
                <motion.div key={cat.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                    <img src={cat.image_url} alt={cat.title} className="w-full h-36 object-cover" />
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-foreground">{cat.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cat.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                          {cat.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEdit(cat)}>
                          <Pencil className="w-3 h-3" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive gap-1" onClick={() => handleDelete(cat.id)}>
                          <Trash2 className="w-3 h-3" /> Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        {!loading && categories.length === 0 && (
          <p className="text-center py-12 text-muted-foreground">No categories yet. Add one!</p>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editId ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Image URL *</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
              {form.image_url && <img src={form.image_url} alt="Preview" className="w-full h-32 object-cover rounded-lg" />}
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

export default AdminCategories;
