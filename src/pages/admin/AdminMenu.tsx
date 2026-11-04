import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, X, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface FoodRow {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string;
  category_id: string | null;
  active: boolean;
  featured: boolean;
  rating: number | null;
  badge: string | null;
  created_at: string;
}

interface CategoryRow {
  id: string;
  title: string;
}

const emptyForm = {
  title: "",
  description: "",
  price: "",
  image_url: "",
  category_id: "",
  active: true,
  featured: false,
  badge: "",
};

const AdminMenu = () => {
  const [foods, setFoods] = useState<FoodRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    const [foodsRes, catsRes] = await Promise.all([
      supabase.from("foods").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("id, title").order("title"),
    ]);
    setFoods((foodsRes.data || []) as FoodRow[]);
    setCategories((catsRes.data || []) as CategoryRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (food: FoodRow) => {
    setEditId(food.id);
    setForm({
      title: food.title,
      description: food.description || "",
      price: String(food.price),
      image_url: food.image_url,
      category_id: food.category_id || "",
      active: food.active,
      featured: food.featured,
      badge: food.badge || "",
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
      image_url: form.image_url.trim(),
      category_id: form.category_id || null,
      active: form.active,
      featured: form.featured,
      badge: form.badge.trim() || null,
    };

    if (editId) {
      const { error } = await supabase.from("foods").update(payload).eq("id", editId);
      if (error) {
        toast({ title: "Update failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Menu item updated! ✅" });
      }
    } else {
      const { error } = await supabase.from("foods").insert(payload);
      if (error) {
        toast({ title: "Create failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Menu item created! 🎉" });
      }
    }

    setSaving(false);
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    const { error } = await supabase.from("foods").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Item deleted" });
      fetchData();
    }
  };

  const filtered = foods.filter((f) =>
    f.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Menu Management">
      <div className="space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search menu items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        </div>

        {/* Table */}
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
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground hidden lg:table-cell">Category</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground hidden sm:table-cell">Status</th>
                      <th className="py-3 px-4 text-right font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filtered.map((food) => (
                        <motion.tr
                          key={food.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="border-b border-border/50 hover:bg-muted/20"
                        >
                          <td className="py-3 px-4">
                            <img
                              src={food.image_url}
                              alt={food.title}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-foreground">{food.title}</p>
                            {food.badge && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                {food.badge}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell font-semibold">
                            Rs. {Number(food.price).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">
                            {categories.find((c) => c.id === food.category_id)?.title || "—"}
                          </td>
                          <td className="py-3 px-4 hidden sm:table-cell">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                food.active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {food.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(food)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => handleDelete(food.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <p className="text-center py-12 text-muted-foreground">No items found.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price *</Label>
                  <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div>
                  <Label>Badge</Label>
                  <Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="e.g. Best Seller" />
                </div>
              </div>
              <div>
                <Label>Image URL *</Label>
                <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
              </div>
              {form.image_url && (
                <img src={form.image_url} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
              )}
              <div>
                <Label>Category</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Featured</Label>
                <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button className="flex-1" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : editId ? "Update" : "Create"}
                </Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminMenu;
