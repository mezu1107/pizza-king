import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import POSLayout from "@/components/pos/POSLayout";
import QRScanner from "@/components/pos/QRScanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Minus,
  Plus,
  Trash2,
  ScanLine,
  Search,
  ShoppingCart,
  Printer,
  FileDown,
  CheckCircle2,
} from "lucide-react";
import { printReceipt, downloadReceiptPdf, ReceiptOrder, ReceiptItem } from "@/lib/receipt";
import { sendPush } from "@/lib/push";

interface Food {
  id: string;
  title: string;
  price: number;
  image_url: string;
  category_id: string | null;
  sku: string | null;
  stock: number | null;
}
interface Category {
  id: string;
  title: string;
}
interface Line extends ReceiptItem {
  id: string;
}

const money = (n: number) => `Rs. ${Number(n || 0).toLocaleString()}`;

export default function POSTerminal() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [foods, setFoods] = useState<Food[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [scannerOpen, setScannerOpen] = useState(false);

  const [lines, setLines] = useState<Line[]>([]);
  const [orderType, setOrderType] = useState("takeaway");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [tableNo, setTableNo] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [discount, setDiscount] = useState("");
  const [delivery, setDelivery] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastOrder, setLastOrder] = useState<{ order: ReceiptOrder; items: ReceiptItem[] } | null>(null);

  useEffect(() => {
    const load = async () => {
      const [f, c] = await Promise.all([
        supabase.from("foods").select("id,title,price,image_url,category_id,sku,stock").eq("active", true).order("title"),
        supabase.from("categories").select("id,title").eq("active", true).order("title"),
      ]);
      setFoods(((f.data as unknown as Food[]) || []));
      setCategories(((c.data as unknown as Category[]) || []));
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return foods.filter(
      (f) =>
        (activeCat === "all" || f.category_id === activeCat) &&
        (!q || f.title.toLowerCase().includes(q) || (f.sku || "").toLowerCase().includes(q))
    );
  }, [foods, search, activeCat]);

  const addFood = (f: Food) => {
    setLines((prev) => {
      const found = prev.find((l) => l.id === f.id);
      if (found) return prev.map((l) => (l.id === f.id ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { id: f.id, title: f.title, price: Number(f.price), quantity: 1 }];
    });
  };

  const handleScan = (code: string) => {
    const raw = code.trim();
    const value = raw.includes("/") ? raw.split("/").pop()!.trim() : raw;
    const match = foods.find(
      (f) => f.id === value || (f.sku && f.sku.toLowerCase() === value.toLowerCase())
    );
    if (!match) {
      toast({ title: "Item not found", description: `No product matches "${value}"`, variant: "destructive" });
      return;
    }
    addFood(match);
    toast({ title: `${match.title} added`, description: `${money(Number(match.price))} • ${match.sku || "no code"}` });
  };

  const setQty = (id: string, q: number) =>
    setLines((prev) => (q <= 0 ? prev.filter((l) => l.id !== id) : prev.map((l) => (l.id === id ? { ...l, quantity: q } : l))));

  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const discountVal = Math.min(Number(discount) || 0, subtotal);
  const deliveryVal = orderType === "delivery" ? Number(delivery) || 0 : 0;
  const total = Math.max(0, subtotal - discountVal + deliveryVal);
  const paidVal = Number(amountPaid) || 0;
  const change = paidVal > total ? paidVal - total : 0;

  const resetSale = () => {
    setLines([]);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setDiscount("");
    setDelivery("");
    setAmountPaid("");
    setNotes("");
    setTableNo("");
  };

  const placeOrder = async () => {
    if (!user) return;
    if (!lines.length) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }
    if (orderType === "delivery" && !customerAddress.trim()) {
      toast({ title: "Delivery address required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        total,
        subtotal,
        discount_amount: discountVal,
        delivery_charges: deliveryVal,
        points_earned: 0,
        points_redeemed: 0,
        status: orderType === "delivery" ? "pending" : "delivered",
        source: "pos",
        payment_method: paymentMethod,
        amount_paid: paidVal || total,
        order_type: orderType,
        table_no: tableNo.trim() || null,
        notes: notes.trim() || null,
        customer_name: customerName.trim() || "Walk-in Customer",
        customer_phone: customerPhone.trim() || null,
        customer_email: null,
        customer_address: customerAddress.trim() || null,
      };
      const { data: order, error } = await supabase
        .from("orders")
        .insert(payload as never)
        .select()
        .single();
      if (error) throw error;

      const orderId = (order as unknown as { id: string }).id;
      const { error: itemsError } = await supabase.from("order_items").insert(
        lines.map((l) => ({
          order_id: orderId,
          food_id: l.id,
          title: l.title,
          quantity: l.quantity,
          price: l.price,
        })) as never
      );
      if (itemsError) throw itemsError;

      // Decrement stock where tracked
      await Promise.all(
        lines.map(async (l) => {
          const f = foods.find((x) => x.id === l.id);
          if (f && f.stock != null) {
            const next = Math.max(0, f.stock - l.quantity);
            await supabase.from("foods").update({ stock: next } as never).eq("id", l.id);
            setFoods((prev) => prev.map((x) => (x.id === l.id ? { ...x, stock: next } : x)));
          }
        })
      );

      if (orderType === "delivery") {
        sendPush({
          scope: "admin",
          title: "🧾 New POS delivery order",
          body: `${payload.customer_name} • ${money(total)}`,
          url: "/pos/orders",
        });
      }

      const receipt = { order: order as unknown as ReceiptOrder, items: lines as ReceiptItem[] };
      setLastOrder(receipt);
      printReceipt(receipt.order, receipt.items);
      toast({ title: "Sale completed ✅", description: `${money(total)} • ${paymentMethod.toUpperCase()}` });
      resetSale();
    } catch (e) {
      toast({
        title: "Could not complete sale",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <POSLayout title="POS Terminal">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
        {/* Products */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search item or code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button onClick={() => setScannerOpen(true)} className="gap-2 shrink-0">
              <ScanLine className="w-4 h-4" /> Scan
            </Button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <Button
              size="sm"
              variant={activeCat === "all" ? "default" : "outline"}
              onClick={() => setActiveCat("all")}
            >
              All
            </Button>
            {categories.map((c) => (
              <Button
                key={c.id}
                size="sm"
                variant={activeCat === c.id ? "default" : "outline"}
                onClick={() => setActiveCat(c.id)}
                className="whitespace-nowrap"
              >
                {c.title}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm py-10 text-center">No items found.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map((f) => (
                <button
                  key={f.id}
                  onClick={() => addFood(f)}
                  className="text-left rounded-xl border border-border bg-card overflow-hidden hover:border-primary hover:shadow-md transition-all"
                >
                  <img src={f.image_url} alt={f.title} loading="lazy" className="w-full h-24 object-cover" />
                  <div className="p-2.5">
                    <p className="font-medium text-sm line-clamp-1">{f.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-primary font-bold text-sm">{money(Number(f.price))}</span>
                      {f.stock != null && (
                        <Badge variant={f.stock > 0 ? "secondary" : "destructive"} className="text-[10px]">
                          {f.stock} left
                        </Badge>
                      )}
                    </div>
                    {f.sku && <p className="text-[10px] text-muted-foreground mt-0.5">{f.sku}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart / checkout */}
        <Card className="p-4 space-y-3 h-fit lg:sticky lg:top-20">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" />
            <h2 className="font-heading font-bold">Current Sale</h2>
            <Badge variant="secondary" className="ml-auto">{lines.length} items</Badge>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {lines.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Tap or scan items to add.</p>}
            {lines.map((l) => (
              <div key={l.id} className="flex items-center gap-2 border border-border rounded-lg p-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{l.title}</p>
                  <p className="text-xs text-muted-foreground">{money(l.price)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(l.id, l.quantity - 1)}>
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-6 text-center text-sm font-semibold">{l.quantity}</span>
                  <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(l.id, l.quantity + 1)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setQty(l.id, 0)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Order type</Label>
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="takeaway">Takeaway</SelectItem>
                  <SelectItem value="dine-in">Dine-in</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Payment</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="online">Online / Easypaisa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {orderType === "dine-in" && (
            <div>
              <Label className="text-xs">Table no.</Label>
              <Input value={tableNo} onChange={(e) => setTableNo(e.target.value)} placeholder="T-4" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Customer</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Walk-in" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="03xx…" />
            </div>
          </div>

          {orderType === "delivery" && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Address</Label>
                <Textarea rows={2} value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Delivery charges</Label>
                <Input inputMode="numeric" value={delivery} onChange={(e) => setDelivery(e.target.value)} placeholder="0" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Discount (Rs.)</Label>
              <Input inputMode="numeric" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label className="text-xs">Cash received</Label>
              <Input inputMode="numeric" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder={String(total)} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Extra spicy, no onions…" />
          </div>

          <div className="border-t border-border pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{money(subtotal)}</span></div>
            {discountVal > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{money(discountVal)}</span></div>}
            {deliveryVal > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{money(deliveryVal)}</span></div>}
            <div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-primary">{money(total)}</span></div>
            {change > 0 && <div className="flex justify-between text-muted-foreground"><span>Change</span><span>{money(change)}</span></div>}
          </div>

          <Button className="w-full gap-2" size="lg" disabled={saving || !lines.length} onClick={placeOrder}>
            <CheckCircle2 className="w-4 h-4" /> {saving ? "Saving…" : `Charge ${money(total)}`}
          </Button>

          {lastOrder && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => printReceipt(lastOrder.order, lastOrder.items)}>
                <Printer className="w-4 h-4" /> Reprint
              </Button>
              <Button variant="outline" className="flex-1 gap-2" onClick={() => downloadReceiptPdf(lastOrder.order, lastOrder.items)}>
                <FileDown className="w-4 h-4" /> PDF
              </Button>
            </div>
          )}
        </Card>
      </div>

      <QRScanner open={scannerOpen} onOpenChange={setScannerOpen} onScan={handleScan} />
    </POSLayout>
  );
}
