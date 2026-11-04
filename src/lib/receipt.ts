import jsPDF from "jspdf";
import { BUSINESS, DEVELOPER } from "@/lib/contact";

export interface ReceiptItem {
  title: string;
  quantity: number;
  price: number;
}

export interface ReceiptOrder {
  id: string;
  created_at: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  subtotal?: number | null;
  delivery_charges?: number | null;
  discount_amount?: number | null;
  total: number;
  payment_method?: string | null;
  amount_paid?: number | null;
  order_type?: string | null;
  table_no?: string | null;
  source?: string | null;
  status?: string | null;
}

const money = (n: number) => `Rs. ${Number(n || 0).toLocaleString()}`;

export function receiptHtml(order: ReceiptOrder, items: ReceiptItem[], shopName: string = BUSINESS.name) {
  const rows = items
    .map(
      (it) => `<tr>
        <td class="l">${escapeHtml(it.title)}<br/><span class="dim">${it.quantity} x ${money(it.price)}</span></td>
        <td class="r">${money(it.price * it.quantity)}</td>
      </tr>`
    )
    .join("");

  const change =
    order.amount_paid && order.amount_paid > order.total ? order.amount_paid - order.total : 0;

  return `<!doctype html><html><head><meta charset="utf-8"/>
  <title>Receipt ${order.id.slice(0, 8)}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    * { box-sizing: border-box; }
    body { font-family: "Courier New", monospace; width: 72mm; margin: 0 auto; color: #000; font-size: 12px; }
    h1 { font-size: 16px; text-align: center; margin: 0 0 2px; letter-spacing: 1px; }
    .center { text-align: center; }
    .dim { color: #555; font-size: 10px; }
    hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { vertical-align: top; padding: 2px 0; }
    .r { text-align: right; white-space: nowrap; }
    .l { text-align: left; }
    .tot { font-size: 14px; font-weight: bold; }
  </style></head><body>
    <h1>${escapeHtml(shopName)}</h1>
    <div class="center dim">${escapeHtml(BUSINESS.type)}<br/>${escapeHtml(BUSINESS.address)}<br/>${BUSINESS.phoneIntl}</div>
    <hr/>
    <div class="dim">
      Receipt #: ${order.id.slice(0, 8).toUpperCase()}<br/>
      Date: ${new Date(order.created_at).toLocaleString()}<br/>
      Type: ${(order.order_type || "delivery").toUpperCase()}${order.table_no ? ` • Table ${escapeHtml(order.table_no)}` : ""}<br/>
      Source: ${(order.source || "web").toUpperCase()} • Payment: ${(order.payment_method || "cod").toUpperCase()}<br/>
      ${order.customer_name ? `Customer: ${escapeHtml(order.customer_name)}<br/>` : ""}
      ${order.customer_phone ? `Phone: ${escapeHtml(order.customer_phone)}<br/>` : ""}
      ${order.customer_address ? `Address: ${escapeHtml(order.customer_address)}` : ""}
    </div>
    <hr/>
    <table>${rows}</table>
    <hr/>
    <table>
      ${order.subtotal != null ? `<tr><td>Subtotal</td><td class="r">${money(order.subtotal)}</td></tr>` : ""}
      ${order.delivery_charges ? `<tr><td>Delivery</td><td class="r">${money(order.delivery_charges)}</td></tr>` : ""}
      ${order.discount_amount ? `<tr><td>Discount</td><td class="r">-${money(order.discount_amount)}</td></tr>` : ""}
      <tr class="tot"><td>TOTAL</td><td class="r">${money(order.total)}</td></tr>
      ${order.amount_paid ? `<tr><td>Paid</td><td class="r">${money(order.amount_paid)}</td></tr>` : ""}
      ${change ? `<tr><td>Change</td><td class="r">${money(change)}</td></tr>` : ""}
    </table>
    <hr/>
    <div class="center dim">Thank you for your order!<br/>${BUSINESS.phoneIntl}</div>
    <div class="center" style="font-size:8px;color:#777;margin-top:4px;">
      Software Developed by ${escapeHtml(DEVELOPER.name)}<br/>${DEVELOPER.phone}
    </div>
  </body></html>`;
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

/** Opens a hidden iframe and triggers the browser/thermal printer dialog. */
export function printReceipt(order: ReceiptOrder, items: ReceiptItem[], shopName?: string) {
  const html = receiptHtml(order, items, shopName);
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
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
}

/** Downloads an 80mm thermal-sized PDF receipt. */
export function downloadReceiptPdf(order: ReceiptOrder, items: ReceiptItem[], shopName: string = BUSINESS.name) {
  const lineH = 5;
  const height = 98 + items.length * 10;
  const doc = new jsPDF({ unit: "mm", format: [80, height] });
  const W = 80;
  let y = 8;

  doc.setFont("courier", "bold");
  doc.setFontSize(12);
  doc.text(shopName, W / 2, y, { align: "center" });
  y += 5;
  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  doc.splitTextToSize(BUSINESS.address, 68).forEach((l: string) => {
    doc.text(l, W / 2, y, { align: "center" });
    y += 3.2;
  });
  doc.text(BUSINESS.phoneIntl, W / 2, y, { align: "center" });
  y += 4;
  doc.setLineDashPattern([1, 1], 0);
  doc.line(6, y, W - 6, y);
  y += 4;

  doc.setFontSize(8);
  const meta = [
    `Receipt #: ${order.id.slice(0, 8).toUpperCase()}`,
    `Date: ${new Date(order.created_at).toLocaleString()}`,
    `Type: ${(order.order_type || "delivery").toUpperCase()} | ${(order.payment_method || "cod").toUpperCase()}`,
    order.customer_name ? `Customer: ${order.customer_name}` : "",
    order.customer_phone ? `Phone: ${order.customer_phone}` : "",
  ].filter(Boolean) as string[];
  meta.forEach((m) => {
    doc.text(m, 6, y);
    y += 3.8;
  });
  y += 1;
  doc.line(6, y, W - 6, y);
  y += 4;

  items.forEach((it) => {
    doc.splitTextToSize(it.title, 50).forEach((l: string) => {
      doc.text(l, 6, y);
      y += 3.6;
    });
    doc.text(`${it.quantity} x ${money(it.price)}`, 6, y);
    doc.text(money(it.price * it.quantity), W - 6, y, { align: "right" });
    y += lineH;
  });

  doc.line(6, y, W - 6, y);
  y += 4;
  const row = (label: string, value: string, bold = false) => {
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.text(label, 6, y);
    doc.text(value, W - 6, y, { align: "right" });
    y += 4.5;
  };
  if (order.subtotal != null) row("Subtotal", money(order.subtotal));
  if (order.delivery_charges) row("Delivery", money(order.delivery_charges));
  if (order.discount_amount) row("Discount", `-${money(order.discount_amount)}`);
  row("TOTAL", money(order.total), true);
  if (order.amount_paid) row("Paid", money(order.amount_paid));
  if (order.amount_paid && order.amount_paid > order.total)
    row("Change", money(order.amount_paid - order.total));

  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  y += 3;
  doc.text("Thank you for your order!", W / 2, y, { align: "center" });
  y += 4;
  doc.setFontSize(6);
  doc.setTextColor(120);
  doc.text(`Software Developed by ${DEVELOPER.name}`, W / 2, y, { align: "center" });
  y += 3;
  doc.text(DEVELOPER.phone, W / 2, y, { align: "center" });
  doc.setTextColor(0);

  doc.save(`receipt-${order.id.slice(0, 8)}.pdf`);
}

/** Generic CSV export helper. */
export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
