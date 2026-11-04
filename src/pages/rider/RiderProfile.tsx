import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RiderLayout from "@/components/rider/RiderLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User, Phone, MapPin, Save, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const RiderProfile = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [totalDelivered, setTotalDelivered] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setFullName((data as any).full_name || "");
        setPhone((data as any).phone || "");
        setAddress((data as any).address || "");
      }

      // Stats
      const { data: orders } = await supabase
        .from("orders")
        .select("total, status")
        .eq("rider_id", user.id);

      const delivered = (orders || []).filter((o: any) => o.status === "delivered");
      setTotalDelivered(delivered.length);
      setTotalEarnings(delivered.reduce((s: number, o: any) => s + Number(o.total) * 0.1, 0));
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone, address } as any)
      .eq("user_id", user.id);

    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else toast({ title: "Profile updated! ✅" });
    setSaving(false);
  };

  return (
    <RiderLayout title="Profile">
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-heading font-bold text-foreground">My Profile</h1>

        {/* Performance Stats */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-1" />
                <p className="text-2xl font-bold">{loading ? "..." : totalDelivered}</p>
                <p className="text-xs text-muted-foreground">Total Deliveries</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold">{loading ? "..." : `Rs. ${Math.round(totalEarnings).toLocaleString()}`}</p>
                <p className="text-xs text-muted-foreground">Total Earnings</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><User className="w-5 h-5" /> Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="flex items-center gap-2 mb-1"><User className="w-3.5 h-3.5" /> Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-1"><Phone className="w-3.5 h-3.5" /> Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 300 1234567" />
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-1"><MapPin className="w-3.5 h-3.5" /> Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Your address" />
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">Email: <span className="text-foreground font-medium">{user?.email}</span></p>
            </div>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Profile"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </RiderLayout>
  );
};

export default RiderProfile;
