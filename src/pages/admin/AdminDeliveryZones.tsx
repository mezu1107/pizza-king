import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import MapPicker from "@/components/MapPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Plus, Pencil, Trash2, Save, Crosshair } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DeliveryArea,
  DeliverySettings,
} from "@/lib/delivery";

const emptyForm = {
  name: "",
  lat: 33.5651,
  lng: 73.1486,
  radius_km: 1,
  delivery_charges: 100,
  active: true,
};

const AdminDeliveryZones = () => {
  const [settings, setSettings] = useState<DeliverySettings | null>(null);
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [savingArea, setSavingArea] = useState(false);
  const { toast } = useToast();

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: s }, { data: a }] = await Promise.all([
      supabase.from("delivery_settings").select("*").maybeSingle(),
      supabase.from("delivery_areas").select("*").order("name"),
    ]);
    if (s) setSettings(s as any);
    setAreas((a as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const updateSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    const { error } = await supabase
      .from("delivery_settings")
      .update({
        center_name: settings.center_name,
        center_lat: settings.center_lat,
        center_lng: settings.center_lng,
        free_radius_km: settings.free_radius_km,
        base_delivery_charges: settings.base_delivery_charges,
      } as any)
      .eq("id", settings.id);
    if (error)
      toast({
        title: "Failed to update",
        description: error.message,
        variant: "destructive",
      });
    else toast({ title: "Main delivery zone updated ✅" });
    setSavingSettings(false);
  };

  const openCreate = () => {
    setEditId(null);
    setForm({
      ...emptyForm,
      lat: settings?.center_lat ?? 33.5651,
      lng: settings?.center_lng ?? 73.1486,
    });
    setDialogOpen(true);
  };

  const openEdit = (a: DeliveryArea) => {
    setEditId(a.id);
    setForm({
      name: a.name,
      lat: Number(a.lat),
      lng: Number(a.lng),
      radius_km: Number(a.radius_km),
      delivery_charges: Number(a.delivery_charges),
      active: a.active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Area name is required", variant: "destructive" });
      return;
    }
    setSavingArea(true);
    const payload: any = {
      name: form.name.trim(),
      lat: form.lat,
      lng: form.lng,
      radius_km: form.radius_km,
      delivery_charges: form.delivery_charges,
      active: form.active,
    };
    const { error } = editId
      ? await supabase.from("delivery_areas").update(payload).eq("id", editId)
      : await supabase.from("delivery_areas").insert(payload);

    if (error)
      toast({
        title: "Failed",
        description: error.message,
        variant: "destructive",
      });
    else
      toast({ title: editId ? "Area updated ✅" : "Area added 🎉" });

    setSavingArea(false);
    setDialogOpen(false);
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this delivery area?")) return;
    const { error } = await supabase.from("delivery_areas").delete().eq("id", id);
    if (error)
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    else {
      toast({ title: "Area deleted" });
      fetchAll();
    }
  };

  const useMyLocation = (apply: (lat: number, lng: number) => void) => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => apply(pos.coords.latitude, pos.coords.longitude),
      () => toast({ title: "Could not get your location", variant: "destructive" })
    );
  };

  return (
    <AdminLayout title="Delivery Zones">
      <div className="space-y-8">
        {/* Main free-delivery zone */}
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-heading font-bold flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" /> Main Free-Delivery Zone
                </h2>
                <p className="text-sm text-muted-foreground">
                  Customers inside this radius can place orders. Click the map or drag the pin to move it.
                </p>
              </div>
              <Button onClick={updateSettings} disabled={savingSettings} className="gap-2">
                <Save className="w-4 h-4" /> {savingSettings ? "Saving..." : "Save"}
              </Button>
            </div>

            {loading || !settings ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Zone Name</Label>
                    <Input
                      value={settings.center_name}
                      onChange={(e) =>
                        setSettings({ ...settings, center_name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Base Delivery Charges (Rs.)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={settings.base_delivery_charges}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          base_delivery_charges: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Latitude</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={settings.center_lat}
                      onChange={(e) =>
                        setSettings({ ...settings, center_lat: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <Label>Longitude</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={settings.center_lng}
                      onChange={(e) =>
                        setSettings({ ...settings, center_lng: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label>Free-delivery Radius: {settings.free_radius_km} km</Label>
                  <Slider
                    value={[settings.free_radius_km]}
                    onValueChange={(v) =>
                      setSettings({ ...settings, free_radius_km: v[0] })
                    }
                    min={1}
                    max={30}
                    step={0.5}
                    className="mt-3"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() =>
                      useMyLocation((lat, lng) =>
                        setSettings({ ...settings, center_lat: lat, center_lng: lng })
                      )
                    }
                  >
                    <Crosshair className="w-4 h-4" /> Use my location
                  </Button>
                </div>

                <MapPicker
                  lat={settings.center_lat}
                  lng={settings.center_lng}
                  radiusKm={settings.free_radius_km}
                  onChange={(lat, lng) =>
                    setSettings({ ...settings, center_lat: lat, center_lng: lng })
                  }
                  extras={areas
                    .filter((a) => a.active)
                    .map((a) => ({
                      lat: Number(a.lat),
                      lng: Number(a.lng),
                      radiusKm: Number(a.radius_km),
                    }))}
                  height="380px"
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Extra areas */}
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-heading font-bold">Extra Delivery Areas</h2>
              <p className="text-sm text-muted-foreground">
                Areas outside the main zone where you still deliver (with custom charges).
              </p>
            </div>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="w-4 h-4" /> Add Area
            </Button>
          </div>

          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : areas.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No extra areas yet. Click "Add Area" to start.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {areas.map((a) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-bold">{a.name}</h3>
                            <p className="text-xs text-muted-foreground">
                              Radius {Number(a.radius_km)} km · Rs.{" "}
                              {Number(a.delivery_charges).toLocaleString()}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              a.active
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {a.active ? "Active" : "Off"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {Number(a.lat).toFixed(4)}, {Number(a.lng).toFixed(4)}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-1"
                            onClick={() => openEdit(a)}
                          >
                            <Pencil className="w-3 h-3" /> Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive gap-1"
                            onClick={() => handleDelete(a.id)}
                          >
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
        </div>

        {/* Add/Edit dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editId ? "Edit Delivery Area" : "Add Delivery Area"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Area Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Bahria Town Phase 4"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Latitude</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={form.lat}
                    onChange={(e) => setForm({ ...form, lat: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={form.lng}
                    onChange={(e) => setForm({ ...form, lng: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <Label>Radius: {form.radius_km} km</Label>
                <Slider
                  value={[form.radius_km]}
                  onValueChange={(v) => setForm({ ...form, radius_km: v[0] })}
                  min={0.5}
                  max={20}
                  step={0.5}
                  className="mt-3"
                />
              </div>

              <div>
                <Label>Delivery Charges (Rs.)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.delivery_charges}
                  onChange={(e) =>
                    setForm({ ...form, delivery_charges: Number(e.target.value) })
                  }
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    useMyLocation((lat, lng) => setForm({ ...form, lat, lng }))
                  }
                >
                  <Crosshair className="w-4 h-4" /> Use my location
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Tip: click anywhere on the map or drag the pin to set the area center.
              </p>

              <MapPicker
                lat={form.lat}
                lng={form.lng}
                radiusKm={form.radius_km}
                onChange={(lat, lng) => setForm({ ...form, lat, lng })}
                height="300px"
              />

              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setForm({ ...form, active: v })}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  className="flex-1"
                  onClick={handleSave}
                  disabled={savingArea}
                >
                  {savingArea ? "Saving..." : editId ? "Update" : "Create"}
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

export default AdminDeliveryZones;
