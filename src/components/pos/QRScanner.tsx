import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Keyboard } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onScan: (text: string) => void;
}

const ELEMENT_ID = "pos-qr-reader";

export default function QRScanner({ open, onOpenChange, onScan }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);

    const start = async () => {
      try {
        const el = document.getElementById(ELEMENT_ID);
        if (!el) return;
        const scanner = new Html5Qrcode(ELEMENT_ID, { verbose: false });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 230, height: 230 } },
          (decoded) => {
            if (cancelled) return;
            cancelled = true;
            onScan(decoded.trim());
            onOpenChange(false);
          },
          () => {}
        );
      } catch (e) {
        setError(
          e instanceof Error
            ? `Camera unavailable: ${e.message}. Use manual entry below.`
            : "Camera unavailable. Use manual entry below."
        );
      }
    };

    const t = setTimeout(start, 120);
    return () => {
      cancelled = true;
      clearTimeout(t);
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        s.stop()
          .then(() => s.clear())
          .catch(() => {});
      }
    };
  }, [open, onScan, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" /> Scan item QR / barcode
          </DialogTitle>
        </DialogHeader>

        <div id={ELEMENT_ID} className="w-full rounded-lg overflow-hidden bg-muted min-h-[220px]" />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-2 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Keyboard className="w-3.5 h-3.5" /> Or type the item code manually
          </p>
          <div className="flex gap-2">
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="e.g. Pizza King-0007"
              onKeyDown={(e) => {
                if (e.key === "Enter" && manual.trim()) {
                  onScan(manual.trim());
                  setManual("");
                  onOpenChange(false);
                }
              }}
            />
            <Button
              onClick={() => {
                if (!manual.trim()) return;
                onScan(manual.trim());
                setManual("");
                onOpenChange(false);
              }}
            >
              Add
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
