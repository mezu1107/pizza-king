import logoUrl from "@/assets/logo.png";

// Printable artwork colours (canvas output, not themed UI).
export type FrameStyle = "royal" | "classic" | "minimal" | "custom";
export interface FrameSettings { frame_style: FrameStyle; headline: string; tagline: string; frame_image_url: string | null }
export const DEFAULT_FRAME: FrameSettings = { frame_style: "royal", headline: "Scan to Order", tagline: "Fresh, hot & royal pizza", frame_image_url: null };

const PALETTES: Record<Exclude<FrameStyle, "custom">, { bg: string; card: string; accent: string; text: string; sub: string }> = {
  royal: { bg: "#120d08", card: "#1f170e", accent: "#d4a73a", text: "#f8e7b0", sub: "#c9b27a" },
  classic: { bg: "#b3261e", card: "#fff6e5", accent: "#f2b705", text: "#3b1d0e", sub: "#7a4a2a" },
  minimal: { bg: "#ffffff", card: "#ffffff", accent: "#111111", text: "#111111", sub: "#555555" },
};

const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => {
  const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = rej; i.src = src;
});

const rounded = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
};

/** Draws a branded table card (frame + QR + table name) and returns a PNG data URL. */
export async function renderQrFrame(opts: { qrDataUrl: string; tableName: string; code: string; settings: FrameSettings; frameImage?: string | null }) {
  const W = 1000, H = 1400;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d")!;
  const s = opts.settings;
  const [qr, logo] = await Promise.all([loadImg(opts.qrDataUrl), loadImg(logoUrl).catch(() => null)]);
  const qrSize = 560, qrX = (W - qrSize) / 2, qrY = 430;

  if (s.frame_style === "custom" && opts.frameImage) {
    const bg = await loadImg(opts.frameImage).catch(() => null);
    if (bg) c.drawImage(bg, 0, 0, W, H); else { c.fillStyle = "#ffffff"; c.fillRect(0, 0, W, H); }
    c.fillStyle = "#ffffff"; rounded(c, qrX - 30, qrY - 30, qrSize + 60, qrSize + 60, 28); c.fill();
    c.drawImage(qr, qrX, qrY, qrSize, qrSize);
    c.fillStyle = "rgba(0,0,0,0.75)"; rounded(c, 200, 1080, 600, 130, 65); c.fill();
    c.fillStyle = "#ffffff"; c.textAlign = "center"; c.font = "bold 72px Georgia, serif";
    c.fillText(opts.tableName, W / 2, 1168);
    return cv.toDataURL("image/png");
  }

  const p = PALETTES[s.frame_style === "custom" ? "royal" : s.frame_style];
  c.fillStyle = p.bg; c.fillRect(0, 0, W, H);
  c.fillStyle = p.card; rounded(c, 40, 40, W - 80, H - 80, 48); c.fill();
  c.strokeStyle = p.accent; c.lineWidth = 10; rounded(c, 60, 60, W - 120, H - 120, 40); c.stroke();
  if (s.frame_style === "royal") { c.lineWidth = 2; rounded(c, 80, 80, W - 160, H - 160, 32); c.stroke(); }

  if (logo) c.drawImage(logo, W / 2 - 110, 100, 220, 220);
  c.textAlign = "center"; c.fillStyle = p.text;
  c.font = "bold 64px Georgia, serif"; c.fillText((s.headline || "Scan to Order").toUpperCase(), W / 2, 385);
  c.fillStyle = "#ffffff"; rounded(c, qrX - 24, qrY - 24, qrSize + 48, qrSize + 48, 24); c.fill();
  c.strokeStyle = p.accent; c.lineWidth = 6; c.stroke();
  c.drawImage(qr, qrX, qrY, qrSize, qrSize);

  c.fillStyle = p.accent; rounded(c, 220, 1050, 560, 130, 65); c.fill();
  c.fillStyle = s.frame_style === "minimal" ? "#ffffff" : p.bg; c.font = "bold 76px Georgia, serif";
  c.fillText(opts.tableName, W / 2, 1140);
  c.fillStyle = p.sub; c.font = "34px sans-serif"; c.fillText(s.tagline || "", W / 2, 1240);
  c.font = "26px monospace"; c.fillText(`PIZZA KING · ${opts.code}`, W / 2, 1290);
  return cv.toDataURL("image/png");
}
