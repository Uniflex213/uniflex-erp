import { PickupTicket, TaxLine, STATUS_LABELS, BILLING_LABELS, PAYMENT_METHOD_LABELS } from "./storeOpsTypes";

const MAIN = "#6366f1";
const TEXT = "#1c1c1e";
const TEXT_MID = "#636366";
const TEXT_LIGHT = "#8e8e93";
const BORDER = "#e5e7eb";
const ORANGE = "#d97706";

const fmt2 = (n: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-CA", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function s(val: any): string {
  if (val == null) return "—";
  return String(val);
}

async function buildPickupTicketDoc(ticket: PickupTicket) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const PAGE_W = 210;
  const MARGIN = 18;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  let y = MARGIN;

  function setColor(hex: string, type: "draw" | "fill" | "text" = "text") {
    const [r, g, b] = hexToRgb(hex);
    if (type === "fill") doc.setFillColor(r, g, b);
    else if (type === "draw") doc.setDrawColor(r, g, b);
    else doc.setTextColor(r, g, b);
  }

  function hLine(yPos: number, color = BORDER) {
    setColor(color, "draw");
    doc.setLineWidth(0.25);
    doc.line(MARGIN, yPos, PAGE_W - MARGIN, yPos);
  }

  function checkPage(needed: number) {
    if (y + needed > 275) { doc.addPage(); y = MARGIN; }
  }

  const [mr, mg, mb] = hexToRgb(MAIN);

  doc.setFillColor(mr, mg, mb);
  doc.rect(0, 0, PAGE_W, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("PICKUP TICKET — CONSIGNATION", MARGIN, 14);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(s(ticket.ticket_number), PAGE_W - MARGIN, 14, { align: "right" });
  y = 30;

  setColor(TEXT_MID);
  doc.setFontSize(8);
  doc.text("Ce document n'est PAS une facture. La facturation sera effectuée par le manufacturier (SCI).", MARGIN, y);
  y += 8;

  const statusLabel = STATUS_LABELS[ticket.status] || ticket.status;
  const billingLabel = BILLING_LABELS[ticket.billing_status] || ticket.billing_status;
  setColor(TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`Statut: ${statusLabel}    Facturation: ${billingLabel}`, MARGIN, y);
  y += 8;

  hLine(y);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setColor(MAIN);
  doc.text("INFORMATIONS CLIENT", MARGIN, y);
  y += 5;

  const clientData = [
    ["Compagnie", s(ticket.client_name)],
    ticket.client_contact ? ["Contact", s(ticket.client_contact)] : null,
    ticket.client_phone ? ["Téléphone", s(ticket.client_phone)] : null,
    ticket.client_email ? ["Email", s(ticket.client_email)] : null,
    ticket.billing_address ? ["Adresse de facturation", s(ticket.billing_address)] : null,
    ticket.province ? ["Province", s(ticket.province)] : null,
  ].filter(Boolean) as [string, string][];

  doc.setFontSize(8);
  for (const [label, val] of clientData) {
    checkPage(6);
    doc.setFont("helvetica", "bold");
    setColor(TEXT_MID);
    doc.text(label + ":", MARGIN, y);
    doc.setFont("helvetica", "normal");
    setColor(TEXT);
    doc.text(val, MARGIN + 45, y);
    y += 5;
  }

  if (ticket.is_walkin) {
    doc.setFont("helvetica", "italic");
    setColor(ORANGE);
    doc.text("Client walk-in — non répertorié dans la base de données", MARGIN, y);
    y += 5;
  }

  doc.setFont("helvetica", "italic");
  setColor(TEXT_LIGHT);
  doc.setFontSize(7.5);
  doc.text("Pickup en magasin — pas d'adresse de livraison", MARGIN, y);
  y += 6;

  hLine(y);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setColor(MAIN);
  doc.text("DÉTAILS DU TICKET", MARGIN, y);
  y += 5;

  const detailData = [
    ["Date d'émission", fmtDateTime(ticket.issued_at)],
    ticket.estimated_pickup_at ? ["Ramassage estimé", fmtDateTime(ticket.estimated_pickup_at)] : null,
    ticket.picked_up_at ? ["Récupéré le", fmtDateTime(ticket.picked_up_at)] : null,
    ["Agent", s(ticket.agent_name)],
    ["Méthode de paiement", s(PAYMENT_METHOD_LABELS[ticket.payment_method] || ticket.payment_method)],
    ticket.notes ? ["Notes", s(ticket.notes)] : null,
  ].filter(Boolean) as [string, string][];

  doc.setFontSize(8);
  for (const [label, val] of detailData) {
    checkPage(6);
    doc.setFont("helvetica", "bold");
    setColor(TEXT_MID);
    doc.text(label + ":", MARGIN, y);
    doc.setFont("helvetica", "normal");
    setColor(TEXT);
    doc.text(val, MARGIN + 45, y);
    y += 5;
  }
  y += 3;

  hLine(y);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setColor(MAIN);
  doc.text("PRODUITS", MARGIN, y);
  y += 5;

  const colWidths = [8, 55, 25, 20, 22, 14, 30];
  const colX = colWidths.reduce((acc, w, i) => { acc.push(i === 0 ? MARGIN : acc[i - 1] + colWidths[i - 1]); return acc; }, [] as number[]);
  const headers = ["#", "Produit", "Format", "Qté", "Prix unit.", "Unité", "Sous-total"];

  doc.setFillColor(mr, mg, mb);
  doc.rect(MARGIN, y - 3, CONTENT_W, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  headers.forEach((h, i) => doc.text(h, colX[i] + 1, y + 1));
  y += 7;

  setColor(TEXT);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  (ticket.items || []).forEach((it: any, idx: number) => {
    checkPage(7);
    const bg = idx % 2 === 0 ? "#f6f7fb" : "#ffffff";
    const [br, bg2, bb] = hexToRgb(bg);
    doc.setFillColor(br, bg2, bb);
    doc.rect(MARGIN, y - 3, CONTENT_W, 7, "F");
    setColor(TEXT);
    const pname = s(it.product_name);
    const pfmt = s(it.format);
    const cells = [
      String(idx + 1),
      pname.length > 28 ? pname.slice(0, 26) + "…" : pname,
      pfmt.length > 16 ? pfmt.slice(0, 14) + "…" : pfmt,
      String(it.quantity ?? 0),
      fmt2(it.unit_price ?? 0),
      s(it.price_unit),
      fmt2(it.subtotal ?? 0),
    ];
    cells.forEach((c, i) => doc.text(c, colX[i] + 1, y + 1));
    y += 7;
  });
  y += 4;

  hLine(y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setColor(MAIN);
  doc.text("RÉSUMÉ FINANCIER", MARGIN, y);
  y += 6;

  const subtotalProducts = ticket.subtotal_products ?? ticket.total_value ?? 0;
  const discountAmt = ticket.discount_amount ?? 0;
  const subtotalAfterDiscount = ticket.subtotal_after_discount ?? (subtotalProducts - discountAmt);
  const taxLines: TaxLine[] = Array.isArray(ticket.tax_lines) ? ticket.tax_lines : [];
  const taxTotal = ticket.tax_total ?? 0;
  const extraFees = ticket.extra_fees ?? 0;
  const totalWithTax = ticket.total_with_tax ?? (subtotalAfterDiscount + taxTotal + extraFees);

  const RIGHT = PAGE_W - MARGIN;
  const LABEL_X = MARGIN + 40;

  function sumRow(label: string, value: string, bold = false) {
    checkPage(6);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(8.5);
    setColor(TEXT_MID);
    doc.text(label, LABEL_X, y);
    setColor(bold ? TEXT : TEXT_MID);
    doc.text(value, RIGHT, y, { align: "right" });
    y += 6;
  }

  function divLine() { checkPage(4); hLine(y - 2); y += 2; }

  sumRow("Sous-total produits", fmt2(subtotalProducts));
  if (discountAmt > 0) {
    sumRow(`Rabais (${s(ticket.discount_value)}${s(ticket.discount_type)})`, `— ${fmt2(discountAmt)}`);
  }
  divLine();
  sumRow("Sous-total après rabais", fmt2(subtotalAfterDiscount), true);
  divLine();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setColor(TEXT_LIGHT);
  doc.text("Shipping", LABEL_X, y);
  doc.text("N/A — Pickup en magasin", RIGHT, y, { align: "right" });
  y += 6;
  divLine();
  if (taxLines.length === 0) {
    setColor(TEXT_LIGHT);
    doc.text("Taxes", LABEL_X, y);
    doc.text(ticket.province ? "N/A" : "Province non renseignée", RIGHT, y, { align: "right" });
    y += 6;
  } else {
    for (const t of taxLines) sumRow(t.label, fmt2(t.amount));
  }
  if (extraFees > 0) {
    divLine();
    sumRow("Extra fees", fmt2(extraFees));
  }
  y += 2;

  checkPage(14);
  doc.setFillColor(mr, mg, mb);
  doc.rect(LABEL_X - 2, y - 4, RIGHT - LABEL_X + 4, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL", LABEL_X + 2, y + 4);
  doc.setFontSize(12);
  doc.text(fmt2(totalWithTax), RIGHT - 2, y + 4, { align: "right" });
  y += 18;

  hLine(y);
  y += 8;

  checkPage(40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setColor(TEXT_MID);
  doc.text("SIGNATURES", MARGIN, y);
  y += 6;

  const sigY = y;
  doc.setLineWidth(0.4);
  setColor(TEXT, "draw");
  doc.line(MARGIN, sigY + 14, MARGIN + 70, sigY + 14);
  doc.line(MARGIN + 90, sigY + 14, MARGIN + 160, sigY + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  setColor(TEXT_LIGHT);
  doc.text("Signature du client", MARGIN, sigY + 19);
  doc.text("Signature de l'employé", MARGIN + 90, sigY + 19);
  doc.text(`Agent: ${s(ticket.agent_name)}`, MARGIN + 90, sigY + 23);
  doc.text(`Date: ${fmtDateTime(ticket.issued_at)}`, MARGIN, sigY + 23);
  y = sigY + 28;

  hLine(y);
  y += 5;

  const [or, og, ob] = hexToRgb(ORANGE);
  doc.setFillColor(or, og, ob);
  doc.setFillColor(255, 243, 212);
  doc.rect(MARGIN, y - 2, CONTENT_W, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  setColor(ORANGE);
  doc.text("IMPORTANT : Ce document n'est PAS une facture. La facturation sera effectuée par le manufacturier (SCI).", MARGIN + 2, y + 4);

  return { doc, filename: `${ticket.ticket_number}.pdf` };
}

export async function generatePickupTicketPDF(ticket: PickupTicket): Promise<void> {
  const { doc, filename } = await buildPickupTicketDoc(ticket);
  doc.save(filename);
}

export async function generatePickupTicketPDFBase64(ticket: PickupTicket): Promise<{ filename: string; base64: string; mimeType: string }> {
  const { doc, filename } = await buildPickupTicketDoc(ticket);
  const base64 = doc.output("datauristring").split(",")[1];
  return { filename, base64, mimeType: "application/pdf" };
}
