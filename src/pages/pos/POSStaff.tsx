import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import POSLayout from "@/components/pos/POSLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, KeyRound, UserCog } from "lucide-react";

interface Staff {
  user_id: string;
  email: string | null;
  full_name: string | null;
  last_sign_in_at: string | null;
  created_at: string;
}

export default function POSStaff() {
  const { toast } = useToast();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [busy, setBusy] = useState(false);

  const call = useCallback(
    async (body: Record<string, unknown>) => {
      const { data, error } = await supabase.functions.invoke("admin-create-staff", { body });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as any;
    },
    [],
  );

  const load = useCallback(async () => {
    try {
      const data = await call({ action: "list" });
      setStaff(data.staff || []);
    } catch (e) {
      toast({ title: "Load failed", description: (e as Error).message, variant: "destructive" });
    }
    setLoading(false);
  }, [call, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!form.email.trim() || form.password.length < 6) {
      toast({ title: "Email and a password of at least 6 characters are required", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await call({ action: "create", ...form, email: form.email.trim() });
      toast({ title: "Staff account ready" });
      setForm({ email: "", password: "", full_name: "" });
      setOpen(false);
      load();
    } catch (e) {
      toast({ title: "Create failed", description: (e as Error).message, variant: "destructive" });
    }
    setBusy(false);
  };

  const resetPassword = async (s: Staff) => {
    const password = window.prompt(`New password for ${s.email}`);
    if (!password) return;
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    try {
      await call({ action: "reset_password", email: s.email, password });
      toast({ title: "Password updated" });
    } catch (e) {
      toast({ title: "Reset failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <POSLayout title="Staff accounts">
      <div className="space-y-4 max-w-3xl">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{staff.length} accounts with terminal access</p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Add staff
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>New terminal account</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Full name</Label>
                  <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input
                    type="text"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
                <Button className="w-full" disabled={busy} onClick={create}>
                  {busy ? "Creating" : "Create account"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : staff.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            <UserCog className="w-8 h-8 mx-auto mb-2" />
            No staff accounts yet.
          </Card>
        ) : (
          staff.map((s) => (
            <Card key={s.user_id} className="p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{s.full_name || "Staff"}</p>
                <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                <p className="text-[11px] text-muted-foreground">
                  Last sign in {s.last_sign_in_at ? new Date(s.last_sign_in_at).toLocaleString() : "never"}
                </p>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => resetPassword(s)}>
                <KeyRound className="w-3.5 h-3.5" /> Password
              </Button>
            </Card>
          ))
        )}
      </div>
    </POSLayout>
  );
}
