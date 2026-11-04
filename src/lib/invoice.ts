import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { BUSINESS, DEVELOPER } from "@/lib/contact";

export interface InvoiceOrder {
  id: string;
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  total: number;
  status: string;
  subtotal?: number;
  delivery_charges?: number;
  discount_amount?: number;
  coupon_code?: string | null;
}

export interface InvoiceItem {
  title: string;
  quantity: number;
  price: number;
}

export const downloadInvoice = (
  order: InvoiceOrder,
  items: InvoiceItem[],
  restaurantName = BUSINESS.name
) => {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(20);
  doc.setTextColor(204, 0, 0);
  doc.text(restaurantName, pageW / 2, 18, { align: "center" });
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `${BUSINESS.type} • ${BUSINESS.address} • ${BUSINESS.phoneIntl}`,
    pageW / 2,
    25,
    { align: "center" }
  );

  doc.setDrawColor(220);
  doc.line(14, 30, pageW - 14, 30);

  // Invoice meta
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("INVOICE", 14, 40);
  doc.setFontSize(9);
  doc.text(`Invoice #: ${order.id.slice(0, 8).toUpperCase()}`, 14, 47);
  doc.text(`Date: ${new Date(order.created_at).toLocaleString()}`, 14, 52);
  doc.text(`Status: ${order.status}`, 14, 57);

  // Customer
  doc.setFontSize(11);
  doc.text("Bill To:", 130, 40);
  doc.setFontSize(9);
  doc.text(order.customer_name || "-", 130, 47);
  doc.text(order.customer_phone || "-", 130, 52);
  const addr = doc.splitTextToSize(order.customer_address || "-", 65);
  doc.text(addr, 130, 57);

  // Items table
  autoTable(doc, {
    startY: 75,
    head: [["#", "Item", "Qty", "Price", "Subtotal"]],
    body: items.map((it, idx) => [
      idx + 1,
      it.title,
      it.quantity,
      `Rs. ${Number(it.price).toLocaleString()}`,
      `Rs. ${(Number(it.price) * it.quantity).toLocaleString()}`,
    ]),
    headStyles: { fillColor: [204, 0, 0] },
    styles: { fontSize: 9 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;
  const right = pageW - 14;
  let y = finalY;
  doc.setFontSize(10);
  if (order.subtotal !== undefined) {
    doc.text(`Subtotal: Rs. ${Number(order.subtotal).toLocaleString()}`, right, y, { align: "right" });
    y += 6;
  }
  if (order.delivery_charges !== undefined && order.delivery_charges > 0) {
    doc.text(`Delivery: Rs. ${Number(order.delivery_charges).toLocaleString()}`, right, y, { align: "right" });
    y += 6;
  }
  if (order.discount_amount && order.discount_amount > 0) {
    doc.setTextColor(0, 150, 0);
    doc.text(`Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}: -Rs. ${Number(order.discount_amount).toLocaleString()}`, right, y, { align: "right" });
    doc.setTextColor(0);
    y += 6;
  }
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`Total: Rs. ${Number(order.total).toLocaleString()}`, right, y + 2, { align: "right" });
  doc.setFont("helvetica", "normal");

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    `Thank you for ordering from ${BUSINESS.name}!`,
    pageW / 2,
    282,
    { align: "center" }
  );
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(
    `Software Developed by ${DEVELOPER.name} · ${DEVELOPER.phone}`,
    pageW / 2,
    287,
    { align: "center" }
  );

  doc.save(`invoice-${order.id.slice(0, 8)}.pdf`);
};
