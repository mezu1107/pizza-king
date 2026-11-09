import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Minus, Plus, ShoppingCart, Check } from "lucide-react";
import { usePizzaOptions, optionsTotal, type PizzaOption } from "@/lib/pizzaOptions";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";

interface Props {
  food: { id: string; title: string; price: number; image_url: string; description?: string | null } | null;
  onClose: () => void;
  /** Optional custom handler (e.g. table QR menu); defaults to the main cart. */
  onAdd?: (line: { id: string; foodId: string; title: string; price: number; options: string[]; optionLabels: string[]; note?: string }, qty: number) => void;
}

export default function PizzaCustomizer({ food, onClose, onAdd }: Props) {
  const { crusts: CRUSTS, toppings: TOPPINGS, dips: DIPS, all } = usePizzaOptions();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [crust, setCrust] = useState("");
  const [extras, setExtras] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [qty, setQty] = useState(1);

  useEffect(() => { setCrust(""); setExtras([]); setNote(""); setQty(1); }, [food?.id]);

  useEffect(() => { if (!crust && CRUSTS.length) setCrust(CRUSTS[0].key); }, [CRUSTS, crust]);

  if (!food) return null;
  const keys = [crust, ...extras].filter((k) => all.some((o) => o.key === k));
  const unit = Number(food.price) + optionsTotal(keys, all);
  const toggle = (k: string) => setExtras((e) => (e.includes(k) ? e.filter((x) => x !== k) : [...e, k]));

  const add = () => {
    const sorted = [...keys].sort();
    const cleanNote = note.trim().slice(0, 200);
    const line = {
      id: `${food.id}|${sorted.join(",")}|${cleanNote}`,
      foodId: food.id,
      title: food.title,
      price: unit,
      options: sorted,
      optionLabels: keys.map((k) => all.find((o) => o.key === k)?.label || k),
      note: cleanNote || undefined,
    };
    if (onAdd) onAdd(line, qty);
    else addItem({ ...line, imageUrl: food.image_url }, qty);
    toast({ title: `${food.title} × ${qty} added!` });
    onClose();
  };

  const Chip = ({ o, active, onClick }: { o: PizzaOption; active: boolean; onClick: () => void }) => (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm text-left transition-colors ${active ? "border-primary bg-primary/10 text-foreground" : "border-border hover:border-primary/50"}`}>
      <span className="flex items-center gap-2">{active && <Check className="w-4 h-4 text-primary" />}{o.label}</span>
      <span className="text-muted-foreground text-xs shrink-0">{o.price ? `+Rs ${o.price}` : "Free"}</span>
    </button>
  );

  return (
    <Dialog open={!!food} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <img src={food.image_url} alt={food.title} className="w-full h-44 object-cover" />
        <div className="p-5 space-y-5">
          <DialogHeader><DialogTitle className="text-2xl">Customize {food.title}</DialogTitle></DialogHeader>
          <section className="space-y-2">
            <h3 className="font-semibold">Choose crust</h3>
            <div className="grid grid-cols-2 gap-2">{CRUSTS.map((o) => <Chip key={o.key} o={o} active={crust === o.key} onClick={() => setCrust(o.key)} />)}</div>
          </section>
          {TOPPINGS.length > 0 && <section className="space-y-2">
            <h3 className="font-semibold">Extra toppings</h3>
            <div className="grid grid-cols-2 gap-2">{TOPPINGS.map((o) => <Chip key={o.key} o={o} active={extras.includes(o.key)} onClick={() => toggle(o.key)} />)}</div>
          </section>}
          {DIPS.length > 0 && <section className="space-y-2">
            <h3 className="font-semibold">Dips & sauces</h3>
            <div className="grid grid-cols-2 gap-2">{DIPS.map((o) => <Chip key={o.key} o={o} active={extras.includes(o.key)} onClick={() => toggle(o.key)} />)}</div>
          </section>}
          <section className="space-y-2">
            <h3 className="font-semibold">Special instructions</h3>
            <Textarea value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Less spicy, well done" />
          </section>
          <div className="flex items-center gap-3 pt-1">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Less"><Minus className="w-4 h-4" /></Button>
              <span className="w-6 text-center font-bold">{qty}</span>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => setQty(Math.min(50, qty + 1))} aria-label="More"><Plus className="w-4 h-4" /></Button>
            </div>
            <Button onClick={add} className="flex-1 h-12 rounded-full font-bold gap-2">
              <ShoppingCart className="w-5 h-5" /> Add · Rs {(unit * qty).toLocaleString()}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
