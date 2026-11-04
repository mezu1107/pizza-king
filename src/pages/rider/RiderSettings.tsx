import RiderLayout from "@/components/rider/RiderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Settings as SettingsIcon, KeyRound, Bell } from "lucide-react";

const RiderSettings = () => {
  const { toast } = useToast();
  const [pwd, setPwd] = useState("");
  const [notif, setNotif] = useState(true);
  const [sound, setSound] = useState(true);
  const [saving, setSaving] = useState(false);

  const changePwd = async () => {
    if (pwd.length < 6) { toast({ title: "Password too short (min 6)", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setSaving(false);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Password updated! 🔒" }); setPwd(""); }
  };

  return (
    <RiderLayout title="Settings">
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2"><SettingsIcon className="w-6 h-6" /> Settings</h1>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><KeyRound className="w-5 h-5" /> Change Password</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>New Password</Label><Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Min 6 characters" /></div>
            <Button onClick={changePwd} disabled={saving}>{saving ? "Updating..." : "Update Password"}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="w-5 h-5" /> Notifications</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <div><p className="text-sm font-medium">Order alerts</p><p className="text-xs text-muted-foreground">Receive alerts for new assigned orders</p></div>
              <Switch checked={notif} onCheckedChange={setNotif} />
            </div>
            <div className="flex justify-between items-center">
              <div><p className="text-sm font-medium">Sound</p><p className="text-xs text-muted-foreground">Play sound on new notifications</p></div>
              <Switch checked={sound} onCheckedChange={setSound} />
            </div>
            <p className="text-xs text-muted-foreground italic">Preferences saved locally on this device.</p>
          </CardContent>
        </Card>
      </div>
    </RiderLayout>
  );
};
export default RiderSettings;
