import { Pricelist, PRICELIST_PRODUCTS } from "./pricelistTypes";

const MAIN_COLOR = "#111111";
const TEXT_COLOR = "#1c1c1e";
const TEXT_LIGHT = "#8e8e93";
const BORDER_COLOR = "#e5e7eb";

function fmtCurrency(n: number, currency: string) {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" });
}

async function buildPricelistDoc(pricelist: Pricelist) {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const PAGE_W = 210;
  const MARGIN = 18;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  let y = 0;

  const addPage = () => {
    doc.addPage();
    y = MARGIN;
    addWatermark();
  };

  const checkPageBreak = (needed: number) => {
    if (y + needed > 275) addPage();
  };

  const addWatermark = () => {
    doc.saveGraphicsState();
    doc.setGState(new (doc as unknown as { GState: new (s: Record<string, unknown>) => unknown }).GState({ opacity: 0.07 }));
    doc.setFontSize(36);
    doc.setTextColor(TEXT_COLOR);
    doc.setFont("helvetica", "bold");
    for (let wy = 60; wy < 280; wy += 70) {
      doc.text(`CONFIDENTIEL — ${pricelist.companyName.toUpperCase()}`, PAGE_W / 2, wy, {
        align: "center",
        angle: 45,
      });
    }
    doc.restoreGraphicsState();
  };

  const LEGAL_NOTICE = "This Pricelist is personal to you. Sharing these informations to a third party company not included in this deal could have legal repercussions.";

  const addHeader = (pageNum: number, totalPages: number) => {
    y = MARGIN;

    doc.setFillColor(MAIN_COLOR);
    doc.rect(MARGIN, y, 28, 10, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("UNIFLEX", MARGIN + 14, y + 6.5, { align: "center" });

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(TEXT_LIGHT);
    doc.text("Karim Benali — Directeur des ventes", MARGIN, y + 14);
    doc.text("karim@uniflex.ca  ·  514-555-0100  ·  VND-KA01", MARGIN, y + 18);
    doc.text("Uniflex Distribution Inc.  ·  Boisbriand, QC", MARGIN, y + 22);

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(TEXT_LIGHT);
    const rx = PAGE_W - MARGIN;
    doc.text(pricelist.companyName, rx, y + 4, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(pricelist.address, rx, y + 8, { align: "right" });
    doc.text(`${pricelist.contactName}  ·  ${pricelist.clientEmail}`, rx, y + 12, { align: "right" });
    doc.text(`${pricelist.clientPhone}  ·  ${pricelist.clientType}`, rx, y + 16, { align: "right" });

    y += 28;
    doc.setDrawColor(BORDER_COLOR);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 8;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(MAIN_COLOR);
    doc.text("LISTE DE PRIX", PAGE_W / 2, y, { align: "center" });
    y += 6;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(TEXT_LIGHT);
    const currencyLabel = pricelist.currency === "EUR"
      ? "Prix en EUR (Euros)"
      : pricelist.currency === "USD"
      ? "Prix en USD (Dollars américains)"
      : "Prix en CAD (Dollars canadiens)";
    const rateNote = pricelist.exchangeRate && pricelist.currency !== "CAD"
      ? `  ·  Taux ${pricelist.currency}/CAD : ${pricelist.exchangeRate.toFixed(2)}`
      : "";
    doc.text(`Créée le ${fmtDate(pricelist.createdAt)}  ·  Valide jusqu'au ${fmtDate(pricelist.validUntil)}  ·  ${currencyLabel}${rateNote}`, PAGE_W / 2, y, { align: "center" });
    y += 6;

    doc.setFontSize(6.5);
    doc.setTextColor("#adb5bd");
    doc.text(LEGAL_NOTICE, PAGE_W / 2, y, { align: "center", maxWidth: CONTENT_W });
    y += 8;

    doc.setDrawColor(BORDER_COLOR);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 8;

    void pageNum;
    void totalPages;
  };

  const addFooter = (pageNum: number, totalPages: number) => {
    const fy = 287;
    doc.setDrawColor(BORDER_COLOR);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, fy - 4, PAGE_W - MARGIN, fy - 4);

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor("#adb5bd");
    doc.text(LEGAL_NOTICE, PAGE_W / 2, fy, { align: "center", maxWidth: CONTENT_W });
    doc.text("© 2026 Uniflex Distribution Inc. — Boisbriand, QC", PAGE_W / 2, fy + 4, { align: "center" });
    doc.setTextColor(TEXT_LIGHT);
    doc.text(`Page ${pageNum} de ${totalPages}`, PAGE_W - MARGIN, fy, { align: "right" });
  };

  addWatermark();
  addHeader(1, 1);

  for (const line of pricelist.lines) {
    const productInfo = PRICELIST_PRODUCTS.find(p => p.name === line.product);

    checkPageBreak(28);

    const rowY = y;

    doc.setFillColor("#f8f9fb");
    doc.roundedRect(MARGIN, rowY, CONTENT_W, 24, 2, 2, "F");

    doc.setFillColor("#e5e7eb");
    doc.roundedRect(MARGIN + 2, rowY + 2, 20, 20, 1, 1, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(MAIN_COLOR);
    doc.text(line.product.slice(0, 3).toUpperCase(), MARGIN + 12, rowY + 12, { align: "center" });

    const tx = MARGIN + 26;

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(TEXT_COLOR);
    doc.text(line.product, tx, rowY + 7);

    if (productInfo) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(TEXT_LIGHT);
      const descLines = doc.splitTextToSize(productInfo.description, CONTENT_W - 90);
      doc.text(descLines.slice(0, 2), tx, rowY + 12);
    }

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(TEXT_LIGHT);
    doc.text(`Format : ${line.format}`, tx, rowY + 20);

    const priceX = PAGE_W - MARGIN - 2;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(MAIN_COLOR);
    doc.text(`${fmtCurrency(line.price, pricelist.currency)}${line.unit}`, priceX, rowY + 9, { align: "right" });

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(TEXT_LIGHT);
    doc.text(`Qté min. : ${line.minQty}`, priceX, rowY + 15, { align: "right" });

    const lineTotal = line.minQty * line.price;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(TEXT_COLOR);
    doc.text(`Total : ${fmtCurrency(lineTotal, pricelist.currency)}`, priceX, rowY + 21, { align: "right" });

    y += 28;
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  return doc;
}

export async function generatePricelistPDF(pricelist: Pricelist): Promise<void> {
  const doc = await buildPricelistDoc(pricelist);
  doc.save(`Pricelist_${pricelist.companyName.replace(/\s+/g, "_")}_${pricelist.id}.pdf`);
}

export async function generatePricelistPDFBase64(pricelist: Pricelist): Promise<{ filename: string; base64: string; mimeType: string }> {
  const doc = await buildPricelistDoc(pricelist);
  const base64 = doc.output("datauristring").split(",")[1];
  const filename = `Pricelist_${pricelist.companyName.replace(/\s+/g, "_")}_${pricelist.id || "new"}.pdf`;
  return { filename, base64, mimeType: "application/pdf" };
}
