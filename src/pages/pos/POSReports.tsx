import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import POSLayout from "@/components/pos/POSLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table2, TrendingUp, Receipt, Wallet, Store } from "lucide-react";
import { downloadCsv } from "@/lib/receipt";

interface Row {
  id: string;
  created_at: string;
  total: number;
  status: string;
  source: string | null;
  payment_method: string | null;
  order_type: string | null;
  customer_name: string | null;
}

const money = (n: number) => `Rs. ${Number(n || 0).toLocaleString()}`;
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function POSReports() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(iso(new Date(Date.now() - 29 * 864e5)));
  const [to, setTo] = useState(iso(new Date()));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("orders")
        .select("id,created_at,total,status,source,payment_method,order_type,customer_name")
        .gte("created_at", `${from}T00:00:00.000Z`)
        .lte("created_at", `${to}T23:59:59.999Z`)
        .order("created_at", { ascending: false });
      setRows((data as unknown as Row[]) || []);
      setLoading(false);
    };
    load();
  }, [from, to]);

  const stats = useMemo(() => {
    const valid = rows.filter((r) => r.status !== "cancelled");
    const revenue = valid.reduce((s, r) => s + Number(r.total), 0);
    const byKey = (fn: (r: Row) => string) =>
      valid.reduce<Record<string, { count: number; total: number }>>((acc, r) => {
        const k = fn(r) || "unknown";
        acc[k] ||= { count: 0, total: 0 };
        acc[k].count += 1;
        acc[k].total += Number(r.total);
        return acc;
      }, {});
    const daily = byKey((r) => new Date(r.created_at).toLocaleDateString());
    return {
      revenue,
      count: valid.length,
      avg: valid.length ? revenue / valid.length : 0,
      cancelled: rows.length - valid.length,
      bySource: byKey((r) => r.source || "web"),
      byPayment: byKey((r) => r.payment_method || "cod"),
      byType: byKey((r) => r.order_type || "delivery"),
      daily: Object.entries(daily).slice(0, 14),
      maxDaily: Math.max(1, ...Object.values(daily).map((d) => d.total)),
    };
  }, [rows]);

  const exportCsv = () =>
    downloadCsv(
      `sales-${from}_to_${to}.csv`,
      rows.map((r) => ({
        id: r.id,
        date: new Date(r.created_at).toLocaleString(),
        customer: r.customer_name || "",
        source: r.source || "web",
        type: r.order_type || "delivery",
        payment: r.payment_method || "cod",
        status: r.status,
        total: r.total,
      }))
    );

  const Breakdown = ({ title, data }: { title: string; data: Record<string, { count: number; total: number }> }) => (
    <Card className="p-4">
      <h3 className="font-heading font-bold text-sm mb-3">{title}</h3>
      <div className="space-y-2">
        {Object.keys(data).length === 0 && <p className="text-xs text-muted-foreground">No data</p>}
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="flex justify-between text-sm">
            <span className="capitalize text-muted-foreground">{k.replace(/_/g, " ")} ({v.count})</span>
            <span className="font-semibold">{money(v.total)}</span>
          </div>
        ))}
      </div>
    </Card>
  );

  return (
    <POSLayout title="Sales Reports">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button variant="outline" className="gap-2" onClick={exportCsv}><Table2 className="w-4 h-4" /> Export CSV</Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Revenue", value: money(stats.revenue), icon: TrendingUp },
                { label: "Orders", value: String(stats.count), icon: Receipt },
                { label: "Avg. order", value: money(Math.round(stats.avg)), icon: Wallet },
                { label: "Cancelled", value: String(stats.cancelled), icon: Store },
              ].map((s) => (
                <Card key={s.label} className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <s.icon className="w-4 h-4" /> {s.label}
                  </div>
                  <p className="text-xl font-bold mt-1">{s.value}</p>
                </Card>
              ))}
            </div>

            <Card className="p-4">
              <h3 className="font-heading font-bold text-sm mb-3">Daily sales</h3>
              <div className="space-y-1.5">
                {stats.daily.length === 0 && <p className="text-xs text-muted-foreground">No sales in this range.</p>}
                {stats.daily.map(([day, v]) => (
                  <div key={day} className="flex items-center gap-2 text-xs">
                    <span className="w-24 shrink-0 text-muted-foreground">{day}</span>
                    <div className="flex-1 h-3 rounded bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${(v.total / stats.maxDaily) * 100}%` }} />
                    </div>
                    <span className="w-24 text-right font-semibold">{money(v.total)}</span>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Breakdown title="By source" data={stats.bySource} />
              <Breakdown title="By payment" data={stats.byPayment} />
              <Breakdown title="By order type" data={stats.byType} />
            </div>
          </>
        )}
      </div>
    </POSLayout>
  );
}
