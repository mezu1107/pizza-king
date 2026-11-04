import RiderLayout from "@/components/rider/RiderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const RiderSchedule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>(DAYS.map((_, i) => ({ day_of_week: i, start_time: "10:00", end_time: "22:00", available: true })));

  useEffect(() => {
    if (!user) return;
    supabase.from("rider_schedule" as any).select("*").eq("rider_id", user.id).then(({ data }) => {
      if (data && data.length) {
        const map = new Map((data as any[]).map((r: any) => [r.day_of_week, r]));
        setRows(DAYS.map((_, i) => map.get(i) || { day_of_week: i, start_time: "10:00", end_time: "22:00", available: true }));
      }
    });
  }, [user]);

  const update = (i: number, field: string, val: any) => {
    setRows(rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  };

  const save = async () => {
    if (!user) return;
    const payload = rows.map(r => ({ rider_id: user.id, day_of_week: r.day_of_week, start_time: r.start_time, end_time: r.end_time, available: r.available }));
    const { error } = await supabase.from("rider_schedule" as any).upsert(payload, { onConflict: "rider_id,day_of_week" });
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Schedule saved! ✅" });
  };

  return (
    <RiderLayout title="Schedule">
      <div className="max-w-3xl space-y-6">
        <h1 className="text-2xl font-heading font-bold">My Weekly Schedule</h1>
        <Card>
          <CardHeader><CardTitle className="text-base">Set your availability for each day</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <div className="w-24 font-semibold text-sm">{DAYS[i]}</div>
                <Switch checked={r.available} onCheckedChange={(v) => update(i, "available", v)} />
                <Input type="time" value={r.start_time} onChange={(e) => update(i, "start_time", e.target.value)} disabled={!r.available} className="w-32" />
                <span className="text-muted-foreground text-sm">to</span>
                <Input type="time" value={r.end_time} onChange={(e) => update(i, "end_time", e.target.value)} disabled={!r.available} className="w-32" />
              </div>
            ))}
            <Button onClick={save} className="gap-2 mt-2"><Save className="w-4 h-4" /> Save Schedule</Button>
          </CardContent>
        </Card>
      </div>
    </RiderLayout>
  );
};
export default RiderSchedule;
