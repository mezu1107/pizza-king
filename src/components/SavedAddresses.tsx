import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Plus, Trash2, Star, Home, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface SavedAddress {
  id: string;
  user_id: string;
  label: string;
  recipient_name: string | null;
  phone: string | null;
  address: string;
  lat: number | null;
  lng: number | null;
  is_default: boolean;
}

interface Props {
  onSelect?: (addr: SavedAddress) => void;
  selectable?: boolean;
}

const labelIcon = (label: string) =>
  label.toLowerCase() === "work" ? Briefcase : Home;

const SavedAddresses = ({ onSelect, selectable = false }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [list, setList] = useState<SavedAddress[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    label: "Home",
    recipient_name: "",
    phone: "",
    address: "",
  });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_addresses" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    setList(((data as any) || []) as SavedAddress[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const addAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.address.trim()) return;
    const { error } = await supabase.from("user_addresses" as any).insert({
      user_id: user.id,
      label: form.label || "Home",
      recipient_name: form.recipient_name || null,
      phone: form.phone || null,
      address: form.address.trim(),
      is_default: list.length === 0,
    } as any);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      return;
    }
    setForm({ label: "Home", recipient_name: "", phone: "", address: "" });
    setAdding(false);
    toast({ title: "Address saved ✅" });
    load();
  };

  const setDefault = async (id: string) => {
    if (!user) return;
    await supabase.from("user_addresses" as any).update({ is_default: false } as any).eq("user_id", user.id);
    await supabase.from("user_addresses" as any).update({ is_default: true } as any).eq("id", id);
    toast({ title: "Default address updated" });
    load();
  };

  const deleteAddress = async (id: string) => {
    await supabase.from("user_addresses" as any).delete().eq("id", id);
    toast({ title: "Address removed" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-heading font-bold text-foreground flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" /> Saved Addresses
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAdding((v) => !v)}
          className="gap-1.5 rounded-full"
        >
          <Plus className="w-4 h-4" /> Add new
        </Button>
      </div>

      <AnimatePresence>
        {adding && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={addAddress}
            className="bg-card border border-border/50 rounded-2xl p-4 space-y-3 overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Label</Label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Home / Work / Other"
                />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+92 ..."
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Recipient Name</Label>
              <Input
                value={form.recipient_name}
                onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                placeholder="Receiver name"
              />
            </div>
            <div>
              <Label className="text-xs">Full Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="House #, Street, Area, City"
                required
              />
            </div>
            <Button type="submit" size="sm" className="rounded-full">Save Address</Button>
          </motion.form>
        )}
      </AnimatePresence>

      {list.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No saved addresses yet. Add one for faster checkout.
        </p>
      ) : (
        <div className="grid gap-3">
          {list.map((a) => {
            const Icon = labelIcon(a.label);
            return (
              <motion.div
                key={a.id}
                layout
                className={`bg-card rounded-2xl p-4 border transition-all ${
                  a.is_default
                    ? "border-primary shadow-md"
                    : "border-border/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-foreground">{a.label}</span>
                      {a.is_default && (
                        <span className="text-[10px] uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                          Default
                        </span>
                      )}
                    </div>
                    {a.recipient_name && (
                      <p className="text-sm text-foreground">{a.recipient_name}</p>
                    )}
                    {a.phone && <p className="text-xs text-muted-foreground">{a.phone}</p>}
                    <p className="text-sm text-muted-foreground mt-1">{a.address}</p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {selectable && onSelect && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full text-xs"
                        onClick={() => onSelect(a)}
                      >
                        Use
                      </Button>
                    )}
                    {!a.is_default && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title="Set default"
                        onClick={() => setDefault(a.id)}
                      >
                        <Star className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => deleteAddress(a.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SavedAddresses;
