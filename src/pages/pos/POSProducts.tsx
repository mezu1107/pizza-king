import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import POSLayout from "@/components/pos/POSLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, QrCode, Save, Printer, Wand2 } from "lucide-react";
import { BUSINESS } from "@/lib/contact";

interface Food {
  id: string;
  title: string;
  price: number;
  sku: string | null;
  stock: number | null;
  active: boolean;
}

const money = (n: number) => `Rs. ${Number(n || 0).toLocaleString()}`;

export default function POSProducts() {
  const { toast } = useToast();
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Record<string, { sku: string; stock: string }>>({});
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("foods")
      .select("id,title,price,sku,stock,active")
      .order("title");
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    const rows = (data as unknown as Food[]) || [];
    setFoods(rows);
    const d: Record<string, { sku: string; stock: string }> = {};
    rows.forEach((f) => (d[f.id] = { sku: f.sku || "", stock: f.stock == null ? "" : String(f.stock) }));
    setDraft(d);
    setLoading(false);

    const entries = await Promise.all(
      rows.map(async (f) => [f.id, await QRCode.toDataURL(f.sku || f.id, { width: 220, margin: 1 })] as const)
    );
    setQrMap(Object.fromEntries(entries));
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return foods.filter((f) => !q || f.title.toLowerCase().includes(q) || (f.sku || "").toLowerCase().includes(q));
  }, [foods, search]);

  const autoSku = (index: number) => `ATF-${String(index + 1).padStart(4, "0")}`;

  const save = async (f: Food) => {
    const d = draft[f.id];
    setSavingId(f.id);
    const payload = {
      sku: d.sku.trim() || null,
      stock: d.stock.trim() === "" ? null : Math.max(0, Number(d.stock) || 0),
    };
    const { error } = await supabase.from("foods").update(payload as never).eq("id", f.id);
    setSavingId(null);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    setFoods((prev) => prev.map((x) => (x.id === f.id ? { ...x, ...payload } : x)));
    setQrMap((prev) => ({ ...prev, [f.id]: prev[f.id] }));
    const url = await QRCode.toDataURL(payload.sku || f.id, { width: 220, margin: 1 });
    setQrMap((prev) => ({ ...prev, [f.id]: url }));
    toast({ title: `${f.title} updated` });
  };

  const generateAll = () => {
    setDraft((prev) => {
      const next = { ...prev };
      foods.forEach((f, i) => {
        if (!next[f.id].sku) next[f.id] = { ...next[f.id], sku: autoSku(i) };
      });
      return next;
    });
    toast({ title: "Codes generated", description: "Review then press Save on each item." });
  };

  const downloadQr = (f: Food) => {
    const url = qrMap[f.id];
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${(f.sku || f.id).replace(/\s+/g, "-")}.png`;
    a.click();
  };

  const printSheet = () => {
    const cards = filtered
      .filter((f) => qrMap[f.id])
      .map(
        (f) => `<div class="c">
          <img src="${qrMap[f.id]}" />
          <div class="t">${f.title.replace(/</g, "&lt;")}</div>
          <div class="s">${f.sku || f.id.slice(0, 8)}</div>
          <div class="p">${money(Number(f.price))}</div>
        </div>`
      )
      .join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${BUSINESS.name} — QR labels</title>
      <style>
        body{font-family:system-ui,sans-serif;margin:12px}
        .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
        .c{border:1px dashed #999;border-radius:8px;padding:8px;text-align:center;page-break-inside:avoid}
        .c img{width:100%;max-width:120px}
        .t{font-size:11px;font-weight:600;margin-top:4px}
        .s{font-size:10px;color:#555}
        .p{font-size:11px;font-weight:700}
      </style></head><body><h3>${BUSINESS.name} — Item QR labels</h3><div class="grid">${cards}</div></body></html>`;
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1500);
    };
  };

  return (
    <POSLayout title="Products & QR codes">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" className="gap-2" onClick={generateAll}><Wand2 className="w-4 h-4" /> Auto codes</Button>
          <Button variant="outline" className="gap-2" onClick={printSheet}><Printer className="w-4 h-4" /> Print labels</Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((f) => (
              <Card key={f.id} className="p-3 flex gap-3">
                <button onClick={() => downloadQr(f)} title="Download QR" className="shrink-0">
                  {qrMap[f.id] ? (
                    <img src={qrMap[f.id]} alt={`QR for ${f.title}`} className="w-24 h-24 rounded bg-white p-1" />
                  ) : (
                    <div className="w-24 h-24 rounded bg-muted flex items-center justify-center"><QrCode className="w-6 h-6 text-muted-foreground" /></div>
                  )}
                </button>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm line-clamp-1">{f.title}</p>
                    {!f.active && <Badge variant="destructive" className="text-[10px]">off</Badge>}
                  </div>
                  <p className="text-xs text-primary font-bold">{money(Number(f.price))}</p>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Item code (SKU)"
                    value={draft[f.id]?.sku ?? ""}
                    onChange={(e) => setDraft((p) => ({ ...p, [f.id]: { ...p[f.id], sku: e.target.value } }))}
                  />
                  <Input
                    className="h-8 text-xs"
                    inputMode="numeric"
                    placeholder="Stock (blank = untracked)"
                    value={draft[f.id]?.stock ?? ""}
                    onChange={(e) => setDraft((p) => ({ ...p, [f.id]: { ...p[f.id], stock: e.target.value } }))}
                  />
                  <Button size="sm" className="h-8 gap-1.5 w-full" disabled={savingId === f.id} onClick={() => save(f)}>
                    <Save className="w-3.5 h-3.5" /> {savingId === f.id ? "Saving…" : "Save"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </POSLayout>
  );
}
