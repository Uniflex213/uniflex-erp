import { Order } from "./orderTypes";

const MAIN = "#111111";
const TEXT = "#1c1c1e";
const TEXT_MID = "#636366";
const TEXT_LIGHT = "#8e8e93";
const BORDER = "#e5e7eb";

const fmt = (n: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" }) : "—";

function hexRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function s(val: any): string {
  if (val == null) return "—";
  return String(val);
}

async function buildOrderDoc(order: Order) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const PAGE_W = 210;
  const MARGIN = 18;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  let y = 0;

  const [mr, mg, mb] = hexRgb(MAIN);
  doc.setFillColor(mr, mg, mb);
  doc.rect(0, 0, PAGE_W, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("UNIFLEX DISTRIBUTION INC.", MARGIN, 15);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("CONFIRMATION DE COMMANDE", PAGE_W - MARGIN, 15, { align: "right" });
  y = 34;

  const [br, bg2, bb] = hexRgb("#f8f9fb");
  doc.setFillColor(br, bg2, bb);
  doc.roundedRect(MARGIN, y - 4, CONTENT_W, 30, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...hexRgb(MAIN));
  doc.text(s(order.id), MARGIN + 4, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...hexRgb(TEXT_MID));
  doc.text(`Date: ${fmtDate(order.date)}`, MARGIN + 4, y + 13);
  doc.text(`Client: ${s(order.client)}`, MARGIN + 4, y + 19);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...hexRgb(TEXT_MID));
  doc.text("Motif:", PAGE_W - MARGIN - 60, y + 6);
  doc.text("Destination:", PAGE_W - MARGIN - 60, y + 11);
  doc.text("Label:", PAGE_W - MARGIN - 60, y + 16);
  doc.text("Livraison:", PAGE_W - MARGIN - 60, y + 21);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...hexRgb(TEXT));
  doc.text(s(order.motif), PAGE_W - MARGIN - 30, y + 6);
  doc.text(s(order.destination), PAGE_W - MARGIN - 30, y + 11);
  doc.text(s(order.label), PAGE_W - MARGIN - 30, y + 16);
  doc.text(s(order.deliveryType), PAGE_W - MARGIN - 30, y + 21);
  y += 36;

  doc.setDrawColor(...hexRgb(BORDER));
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...hexRgb(MAIN));
  doc.text("PRODUITS", MARGIN, y);
  y += 5;

  const cols = [8, 65, 45, 15, 22, 19];
  const colX = cols.reduce((acc, w, i) => { acc.push(i === 0 ? MARGIN : acc[i-1] + cols[i-1]); return acc; }, [] as number[]);
  const headers = ["#", "Produit", "Format", "Qté", "Prix unit.", "Sous-total"];

  doc.setFillColor(mr, mg, mb);
  doc.rect(MARGIN, y - 3, CONTENT_W, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  headers.forEach((h, i) => doc.text(h, colX[i] + 1, y + 1));
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...hexRgb(TEXT));
  order.products.forEach((p, idx) => {
    const bg = idx % 2 === 0 ? "#f6f7fb" : "#ffffff";
    doc.setFillColor(...hexRgb(bg));
    doc.rect(MARGIN, y - 3, CONTENT_W, 7, "F");
    doc.setTextColor(...hexRgb(TEXT));
    const pname = s(p.product);
    const pfmt = s(p.format);
    const name = pname.length > 30 ? pname.slice(0, 28) + "…" : pname;
    const fmtStr = pfmt.length > 24 ? pfmt.slice(0, 22) + "…" : pfmt;
    [String(idx + 1), name, fmtStr, String(p.qty ?? 0), fmt(p.price ?? 0), fmt((p.qty ?? 0) * (p.price ?? 0))].forEach((c, i) => {
      doc.text(c, colX[i] + 1, y + 1);
    });
    y += 7;
  });
  y += 4;

  doc.setDrawColor(...hexRgb(BORDER));
  doc.setLineWidth(0.25);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  const RIGHT = PAGE_W - MARGIN;
  const LABEL_X = MARGIN + 60;

  function sumRow(label: string, value: string, bold = false) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...hexRgb(TEXT_MID));
    doc.text(label, LABEL_X, y);
    doc.setTextColor(...hexRgb(bold ? TEXT : TEXT_MID));
    doc.text(value, RIGHT, y, { align: "right" });
    y += 6;
  }

  sumRow("Sous-total", fmt(order.subtotal));
  if (order.discount && order.discount > 0) {
    sumRow(`Rabais (${s(order.discountValue)}${s(order.discountType)})`, `— ${fmt(order.discount)}`);
  }
  if (order.taxLines && order.taxLines.length > 0) {
    for (const t of order.taxLines) sumRow(t.label, fmt(t.amount));
  }
  if (order.extraFees && order.extraFees > 0) sumRow("Frais supplémentaires", fmt(order.extraFees));

  y += 2;
  doc.setFillColor(mr, mg, mb);
  doc.rect(LABEL_X - 2, y - 4, RIGHT - LABEL_X + 4, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL", LABEL_X + 2, y + 4);
  doc.setFontSize(12);
  doc.text(fmt(order.total), RIGHT - 2, y + 4, { align: "right" });
  y += 18;

  if (order.deliveryAddress) {
    doc.setDrawColor(...hexRgb(BORDER));
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...hexRgb(MAIN));
    doc.text("ADRESSE DE LIVRAISON", MARGIN, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...hexRgb(TEXT));
    const lines = doc.splitTextToSize(order.deliveryAddress, CONTENT_W);
    doc.text(lines, MARGIN, y);
    y += lines.length * 5 + 4;
  }

  const fy = 287;
  doc.setDrawColor(...hexRgb(BORDER));
  doc.setLineWidth(0.25);
  doc.line(MARGIN, fy - 5, PAGE_W - MARGIN, fy - 5);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...hexRgb(TEXT_LIGHT));
  doc.text("Uniflex Distribution Inc. · Boisbriand, Québec · Document confidentiel", PAGE_W / 2, fy, { align: "center" });

  void y;
  return { doc, filename: `Commande_${order.id}.pdf` };
}

export async function generateOrderPDF(order: Order): Promise<void> {
  const { doc, filename } = await buildOrderDoc(order);
  doc.save(filename);
}

export async function generateOrderPDFBase64(order: Order): Promise<{ filename: string; base64: string; mimeType: string }> {
  const { doc, filename } = await buildOrderDoc(order);
  const base64 = doc.output("datauristring").split(",")[1];
  return { filename, base64, mimeType: "application/pdf" };
}
