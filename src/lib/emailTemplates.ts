/* ────────────────────────────────────────────────────
   Uniflex Email Templates — Opal-inspired dark minimal
   ──────────────────────────────────────────────────── */

const BRAND = "#111111";
const BRAND_LIGHT = "#1c1c1e";
const TEXT_MID = "#6b7280";
const TEXT_LIGHT = "#9ca3af";
const BG = "#f5f4f0";
const CARD_BG = "#ffffff";
const BORDER = "#e5e7eb";
const ACCENT = "#111111";

function getLogoUrl(): string {
  if (typeof window !== "undefined") return `${window.location.origin}/icons/icon-96x96.png`;
  return "https://uniflex-erp.vercel.app/icons/icon-96x96.png";
}

function baseTemplate(heroTitle: string, content: string, senderLine?: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Uniflex Distribution</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,Helvetica,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BG};padding:0;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">

          <!-- HEADER BAR -->
          <tr>
            <td style="background:${BRAND};padding:16px 32px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="vertical-align:middle;width:44px;">
                    <img src="${getLogoUrl()}" alt="Uniflex" width="36" height="36" style="display:block;border-radius:8px;" />
                  </td>
                  <td style="vertical-align:middle;padding-left:12px;">
                    <span style="font-size:18px;font-weight:900;color:#ffffff;letter-spacing:1px;font-family:Arial,sans-serif;">UNIFLEX</span>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="font-size:11px;color:rgba(255,255,255,0.5);font-family:Arial,sans-serif;">Distribution Inc.</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- HERO -->
          <tr>
            <td style="background:${BRAND};padding:40px 32px 48px;">
              <div style="font-size:36px;font-weight:900;color:#ffffff;line-height:1.1;letter-spacing:-1px;font-family:Arial,sans-serif;margin:0 0 16px;">${heroTitle}</div>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background:${CARD_BG};padding:36px 32px 28px;">
              ${content}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:${CARD_BG};padding:0 32px 24px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid ${BORDER};padding-top:20px;">
                <tr>
                  <td>
                    <div style="font-size:11px;color:${TEXT_LIGHT};line-height:1.7;font-family:Arial,sans-serif;">
                      ${senderLine ? `<span style="color:${BRAND_LIGHT};font-weight:700;">${senderLine}</span><br/>` : ""}
                      <span style="color:${BRAND_LIGHT};font-weight:600;">Uniflex Distribution Inc.</span><br/>
                      Boisbriand, Qu\u00e9bec, Canada
                    </div>
                  </td>
                  <td align="right" valign="bottom">
                    <span style="font-size:9px;font-weight:900;color:${TEXT_LIGHT};letter-spacing:3px;font-family:Arial,sans-serif;opacity:0.35;">UNIFLEX</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BOTTOM BAR -->
          <tr>
            <td style="background:${BRAND};padding:14px 32px;text-align:center;">
              <span style="font-size:10px;color:rgba(255,255,255,0.4);font-family:Arial,sans-serif;">\u00a9 2026 Uniflex Distribution Inc. \u2014 Boisbriand, QC</span>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function sectionTitle(t: string) {
  return `<div style="font-size:10px;font-weight:800;color:${BRAND};text-transform:uppercase;letter-spacing:2px;margin:28px 0 14px;font-family:Arial,sans-serif;">${t}</div>`;
}

function infoTable(rows: [string, string][]) {
  const trs = rows.map(([label, val]) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${BORDER};font-size:12px;color:${TEXT_MID};width:160px;vertical-align:top;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">${label}</td>
      <td style="padding:10px 0;border-bottom:1px solid ${BORDER};font-size:13px;font-weight:600;color:${BRAND_LIGHT};font-family:Arial,sans-serif;">${val}</td>
    </tr>`).join("");
  return `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">${trs}</table>`;
}

function productTable(headers: string[], rows: string[][], totals: [string, string][]) {
  const ths = headers.map((h, i) => `<th style="background:${BRAND};padding:10px 12px;text-align:${i >= headers.length - 2 ? "right" : "left"};font-size:9px;color:#ffffff;font-weight:700;text-transform:uppercase;letter-spacing:1px;font-family:Arial,sans-serif;">${h}</th>`).join("");
  const trs = rows.map((cells, rowIdx) => {
    const bg = rowIdx % 2 === 0 ? "#ffffff" : "#fafaf8";
    const tds = cells.map((c, i) => `<td style="padding:11px 12px;border-bottom:1px solid ${BORDER};font-size:12px;color:${BRAND_LIGHT};text-align:${i >= cells.length - 2 ? "right" : "left"};font-family:Arial,sans-serif;background:${bg};">${c}</td>`).join("");
    return `<tr>${tds}</tr>`;
  }).join("");
  const totalRows = totals.map(([l, v]) => `
    <tr>
      <td colspan="${headers.length - 1}" style="padding:14px 12px;font-weight:800;font-size:13px;color:${BRAND};font-family:Arial,sans-serif;background:#f5f4f0;">${l}</td>
      <td style="padding:14px 12px;font-weight:900;font-size:16px;color:${BRAND};text-align:right;font-family:Arial,sans-serif;background:#f5f4f0;">${v}</td>
    </tr>`).join("");
  return `<div style="border-radius:8px;overflow:hidden;border:1px solid ${BORDER};margin-bottom:24px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <thead><tr>${ths}</tr></thead>
      <tbody>${trs}</tbody>
      <tfoot>${totalRows}</tfoot>
    </table>
  </div>`;
}

function badge(label: string, color: "blue" | "green" | "orange") {
  const styles: Record<string, string> = {
    blue: `background:${BRAND};color:#ffffff;`,
    green: "background:#111;color:#ffffff;",
    orange: "background:#92400e;color:#ffffff;",
  };
  return `<span style="display:inline-block;padding:4px 12px;border-radius:4px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;${styles[color]}font-family:Arial,sans-serif;">${label}</span>`;
}

function alertBox(html: string, type: "info" | "warning" = "info") {
  const styles = {
    info: `background:#f5f4f0;border-left:3px solid ${BRAND};color:${BRAND_LIGHT};`,
    warning: `background:#fefce8;border-left:3px solid #92400e;color:#92400e;`,
  };
  return `<div style="${styles[type]}padding:14px 18px;border-radius:0 6px 6px 0;margin-bottom:24px;font-size:12px;line-height:1.7;font-family:Arial,sans-serif;">${html}</div>`;
}

function pdfAttachmentNote(filename?: string) {
  if (!filename) return "";
  return `<div style="background:${BRAND};border-radius:6px;padding:14px 18px;margin-bottom:24px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="width:32px;vertical-align:middle;">
          <div style="width:28px;height:28px;background:rgba(255,255,255,0.12);border-radius:6px;text-align:center;line-height:28px;font-size:14px;">&#128206;</div>
        </td>
        <td style="padding-left:12px;vertical-align:middle;">
          <div style="font-size:11px;font-weight:800;color:#ffffff;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:0.5px;">Pi\u00e8ce jointe</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.6);font-family:Arial,sans-serif;margin-top:1px;">${filename}</div>
        </td>
      </tr>
    </table>
  </div>`;
}

function ctaButton(label: string) {
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr>
      <td style="background:${BRAND};border-radius:6px;padding:14px 36px;text-align:center;">
        <span style="font-size:13px;font-weight:800;color:#ffffff;text-transform:uppercase;letter-spacing:1px;font-family:Arial,sans-serif;">${label}</span>
      </td>
    </tr>
  </table>`;
}

function greeting(name: string) {
  return `<p style="font-size:15px;font-weight:700;color:${BRAND_LIGHT};margin:0 0 6px;font-family:Arial,sans-serif;">Bonjour ${name},</p>`;
}

function bodyText(text: string) {
  return `<p style="font-size:13px;color:${TEXT_MID};margin:0 0 24px;line-height:1.7;font-family:Arial,sans-serif;">${text}</p>`;
}

function fmtCAD(n: number): string {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);
}
function fmtDate(d: string): string {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" });
}

export interface EmailTemplate { subject: string; html: string; text: string; }

/* ──────────── ORDER CONFIRMATION (Client) ──────────── */
export function tplOrderConfirmationClient(order: Record<string, unknown>): EmailTemplate {
  const orderNum = (order.order_number ?? (order.id as string)?.slice(0, 20) ?? "\u2014") as string;
  const subject = `Uniflex \u2014 Confirmation de commande ${orderNum}`;
  const products = (order.products ?? order.items ?? []) as Record<string, unknown>[];
  const rows = products.map(p => [
    String(p.product ?? p.product_name ?? "\u2014"),
    String(p.format ?? "\u2014"),
    String(p.qty ?? p.quantity ?? "\u2014"),
    fmtCAD(Number(p.price ?? 0)),
    fmtCAD(Number(p.price ?? 0) * Number(p.qty ?? p.quantity ?? 0)),
  ]);
  const html = baseTemplate("Commande confirm\u00e9e.", `
    ${greeting(String(order.client_name ?? order.client ?? ""))}
    ${bodyText("Votre commande a bien \u00e9t\u00e9 re\u00e7ue et est en cours de traitement. Merci de votre confiance.")}
    ${sectionTitle("D\u00e9tails de la commande")}
    ${infoTable([
      ["Num\u00e9ro", `<strong>${orderNum}</strong>`],
      ["Date", fmtDate((order.created_at ?? new Date().toISOString()) as string)],
      ["Statut", badge("En traitement", "blue")],
      ["Livraison", String(order.deliveryType ?? order.delivery_type ?? "\u2014")],
      ...(order.deliveryAddress || order.delivery_address ? [["Adresse", String(order.deliveryAddress ?? order.delivery_address)] as [string, string]] : []),
    ])}
    ${rows.length > 0 ? sectionTitle("Produits command\u00e9s") + productTable(
      ["Produit", "Format", "Qt\u00e9", "Prix unit.", "Sous-total"],
      rows,
      [["Total", fmtCAD(Number(order.total ?? 0))]]
    ) : ""}
    ${alertBox("Votre commande est en cours de traitement. Vous serez contact\u00e9 d\u00e8s qu\u2019elle sera pr\u00eate.")}
  `, (order.seller_name ?? "\u00c9quipe Uniflex") as string);
  const text = `Confirmation de commande ${orderNum}\n\nBonjour ${order.client_name ?? order.client ?? ""},\n\nVotre commande a \u00e9t\u00e9 re\u00e7ue.\nTotal: ${fmtCAD(Number(order.total ?? 0))}\n\nMerci,\nUniflex Distribution Inc.`;
  return { subject, html, text };
}

/* ──────────── ORDER TO SCI ──────────── */
export function tplOrderToSCI(order: Record<string, unknown>, senderName = "Administration Uniflex"): EmailTemplate {
  const orderNum = (order.order_number ?? (order.id as string)?.slice(0, 20) ?? "\u2014") as string;
  const subject = `Uniflex \u2192 SCI \u2014 Nouvelle commande ${orderNum} \u2014 ${order.client_name ?? order.client ?? ""}`;
  const products = (order.products ?? order.items ?? []) as Record<string, unknown>[];
  const rows = products.map(p => [
    String(p.product ?? p.product_name ?? "\u2014"),
    String(p.format ?? "\u2014"),
    String(p.qty ?? p.quantity ?? "\u2014"),
    String(p.label ?? order.label ?? "\u2014"),
    fmtCAD(Number(p.price ?? 0)),
  ]);
  const html = baseTemplate("Nouvelle commande \u00e0 produire.", `
    ${greeting("SCI")}
    ${bodyText("Veuillez trouver ci-dessous une nouvelle commande \u00e0 produire. Le document PDF est joint.")}
    ${sectionTitle("Informations commande")}
    ${infoTable([
      ["Num\u00e9ro", `<strong>${orderNum}</strong>`],
      ["Date", fmtDate((order.created_at ?? new Date().toISOString()) as string)],
      ["Client final", String(order.client_name ?? order.client ?? "\u2014")],
      ["Motif", String(order.motif ?? "\u2014")],
      ["Destination", String(order.destination ?? "\u2014")],
      ["Label", String(order.label ?? "\u2014")],
    ])}
    ${rows.length > 0 ? sectionTitle("Produits \u00e0 produire") + productTable(
      ["Produit", "Format", "Qt\u00e9", "Label", "Prix"],
      rows,
      [["Total commande", fmtCAD(Number(order.total ?? 0))]]
    ) : ""}
    ${alertBox("Merci de confirmer la r\u00e9ception de cette commande et de nous communiquer le num\u00e9ro de suivi d\u00e8s exp\u00e9dition.", "warning")}
  `, senderName);
  const text = `Nouvelle commande SCI: ${orderNum}\nClient: ${order.client_name ?? order.client ?? "\u2014"}\nTotal: ${fmtCAD(Number(order.total ?? 0))}\n\nMerci de confirmer la r\u00e9ception.\n${senderName}`;
  return { subject, html, text };
}

/* ──────────── PICKUP TICKET (Client) ──────────── */
export function tplPickupTicketClient(ticket: Record<string, unknown>): EmailTemplate {
  const ticketNum = (ticket.ticket_number ?? (ticket.id as string)?.slice(0, 12) ?? "\u2014") as string;
  const subject = `Uniflex \u2014 Ticket de ramassage ${ticketNum}`;
  const items = (ticket.items ?? []) as Record<string, unknown>[];
  const rows = items.map(item => [
    String(item.product_name ?? "\u2014"),
    String(item.format ?? "\u2014"),
    String(item.quantity ?? "\u2014"),
    fmtCAD(Number(item.unit_price ?? 0)),
    fmtCAD(Number(item.subtotal ?? 0)),
  ]);
  const html = baseTemplate("Votre commande est pr\u00eate.", `
    ${greeting(String(ticket.client_name ?? ""))}
    ${bodyText("Votre ticket de ramassage est pr\u00eat. Pr\u00e9sentez-vous au comptoir Uniflex avec ce document ou le PDF joint.")}
    ${sectionTitle("Ticket de ramassage")}
    ${infoTable([
      ["Num\u00e9ro de ticket", `<strong>${ticketNum}</strong>`],
      ["Date", fmtDate((ticket.created_at ?? new Date().toISOString()) as string)],
      ["Statut", badge("Pr\u00eat", "green")],
      ...(ticket.notes ? [["Notes", String(ticket.notes)] as [string, string]] : []),
    ])}
    ${rows.length > 0 ? sectionTitle("Articles") + productTable(
      ["Produit", "Format", "Qt\u00e9", "Prix unit.", "Sous-total"],
      rows,
      [["Total (taxes incluses)", fmtCAD(Number(ticket.total_with_tax ?? ticket.total_value ?? 0))]]
    ) : ""}
    ${alertBox("Le PDF de votre ticket est joint \u00e0 cet email. Pr\u00e9sentez-le lors de votre visite.")}
  `);
  const text = `Ticket de ramassage ${ticketNum}\n\nBonjour ${ticket.client_name ?? ""},\n\nVotre commande est pr\u00eate.\nTotal: ${fmtCAD(Number(ticket.total_with_tax ?? ticket.total_value ?? 0))}\n\nUniflex Distribution Inc.`;
  return { subject, html, text };
}

/* ──────────── SAMPLE APPROVED ──────────── */
export function tplSampleApproved(sample: Record<string, unknown>): EmailTemplate {
  const company = (sample.lead_company_name ?? sample.company_name ?? "") as string;
  const subject = `Uniflex \u2014 \u00c9chantillon approuv\u00e9 \u2014 ${company}`;
  const html = baseTemplate("\u00c9chantillon approuv\u00e9.", `
    ${greeting(String(sample.contact_name ?? sample.lead_name ?? ""))}
    ${bodyText("Bonne nouvelle ! Votre demande d\u2019\u00e9chantillon a \u00e9t\u00e9 approuv\u00e9e et est en cours de pr\u00e9paration.")}
    ${sectionTitle("D\u00e9tails")}
    ${infoTable([
      ["Entreprise", company],
      ["Statut", badge("Approuv\u00e9", "green")],
      ...(sample.eta_delivery ? [["Livraison estim\u00e9e", fmtDate(sample.eta_delivery as string)] as [string, string]] : []),
      ...(sample.approval_notes ? [["Notes", String(sample.approval_notes)] as [string, string]] : []),
    ])}
    ${alertBox("Nous vous contacterons d\u00e8s que votre \u00e9chantillon sera exp\u00e9di\u00e9. Un suivi de 72h sera effectu\u00e9 apr\u00e8s r\u00e9ception.")}
  `);
  const text = `\u00c9chantillon approuv\u00e9\n\nBonjour,\n\nVotre demande pour ${company} a \u00e9t\u00e9 approuv\u00e9e.\n\nUniflex Distribution Inc.`;
  return { subject, html, text };
}

/* ──────────── SAMPLE DELIVERED ──────────── */
export function tplSampleDelivered(sample: Record<string, unknown>, senderName: string): EmailTemplate {
  const company = (sample.lead_company_name ?? sample.company_name ?? "") as string;
  const subject = `Uniflex \u2014 \u00c9chantillon livr\u00e9 \u2014 ${company}`;
  const html = baseTemplate("\u00c9chantillon livr\u00e9.", `
    ${greeting(String(sample.contact_name ?? sample.lead_name ?? ""))}
    ${bodyText("Votre \u00e9chantillon Uniflex a \u00e9t\u00e9 livr\u00e9. Nous esp\u00e9rons qu\u2019il r\u00e9pondra \u00e0 vos attentes !")}
    ${alertBox("Un suivi sera effectu\u00e9 dans les 72 heures. Notre \u00e9quipe vous contactera pour recueillir vos impressions.", "warning")}
    ${sectionTitle("Recommandations d\u2019application")}
    ${infoTable([
      ["Pr\u00e9paration surface", "Nettoyage m\u00e9canique requis (meulage ou grenaillage)"],
      ["Temp\u00e9rature", "Min. 10\u00b0C \u2014 Humidit\u00e9 relative &lt; 85%"],
      ["M\u00e9lange", "Respecter les ratios du guide technique fourni"],
      ["Temps de pot", "Consulter la fiche technique du produit"],
    ])}
    ${alertBox("Pour toute question technique, r\u00e9pondez directement \u00e0 cet email.")}
  `, senderName);
  const text = `\u00c9chantillon livr\u00e9\n\nBonjour,\n\nVotre \u00e9chantillon pour ${company} a \u00e9t\u00e9 livr\u00e9. Un suivi sera effectu\u00e9 dans 72h.\n\n${senderName}\nUniflex Distribution Inc.`;
  return { subject, html, text };
}

/* ──────────── PRICELIST (Client) ──────────── */
export function tplPricelistClient(pricelist: Record<string, unknown>, senderName: string): EmailTemplate {
  const company = (pricelist.companyName ?? pricelist.company_name ?? "") as string;
  const contact = (pricelist.contactName ?? pricelist.contact_name ?? "") as string;
  const validUntil = (pricelist.validUntil ?? pricelist.valid_until ?? "") as string;
  const subject = `Uniflex \u2014 Liste de prix \u2014 ${company}`;
  const filename = `Pricelist_${company.replace(/\s+/g, "_")}.pdf`;
  const html = baseTemplate("Votre liste de prix.", `
    ${greeting(contact)}
    ${bodyText("Veuillez trouver ci-joint votre liste de prix personnalis\u00e9e Uniflex en format PDF.")}
    ${pdfAttachmentNote(filename)}
    ${sectionTitle("Informations")}
    ${infoTable([
      ["Entreprise", `<strong>${company}</strong>`],
      ["Type client", String(pricelist.clientType ?? pricelist.client_type ?? "\u2014")],
      ["Devise", String(pricelist.currency ?? "CAD")],
      ["Valide jusqu\u2019au", `<strong>${fmtDate(validUntil)}</strong>`],
    ])}
    ${alertBox("<strong>Confidentiel :</strong> Cette liste de prix est personnalis\u00e9e et strictement confidentielle.", "warning")}
    ${alertBox("Pour commander ou pour toute question, r\u00e9pondez directement \u00e0 cet email.")}
  `, senderName);
  const text = `Liste de prix personnalis\u00e9e Uniflex\n\nBonjour ${contact},\n\nVotre pricelist est en pi\u00e8ce jointe.\nValide jusqu\u2019au ${fmtDate(validUntil)}.\n\n${senderName}\nUniflex Distribution Inc.`;
  return { subject, html, text };
}

/* ──────────── SCI INVOICE ──────────── */
export function tplSCIInvoice(
  docs: Record<string, unknown>[],
  logType: "send" | "followup" = "send",
  senderName = "Administration Uniflex"
): EmailTemplate {
  const total = docs.reduce((a, d) => a + Number(d.value ?? 0), 0);
  const dateStr = new Date().toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" });
  const subject = logType === "followup"
    ? `Uniflex \u2014 RELANCE \u2014 Documents facturation \u2014 ${dateStr} \u2014 ${fmtCAD(total)}`
    : `Uniflex \u2014 Documents facturation \u2014 ${dateStr} \u2014 ${fmtCAD(total)}`;
  const rows = docs.map(d => [
    d.document_type === "pickup" ? "Pickup" : "Commande",
    `<strong>${String(d.document_number ?? "\u2014")}</strong>`,
    String(d.client_name ?? "\u2014"),
    fmtDate((d.issued_at ?? "") as string),
    fmtCAD(Number(d.value ?? 0)),
  ]);

  const heroText = logType === "followup"
    ? `Relance \u2014 ${docs.length} document${docs.length > 1 ? "s" : ""} en attente.`
    : `${docs.length} document${docs.length > 1 ? "s" : ""} \u00e0 facturer.`;

  const attachmentNote = docs.length > 0
    ? `<div style="background:${BRAND};border-radius:6px;padding:14px 18px;margin-bottom:24px;">
        <div style="font-size:9px;font-weight:800;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;font-family:Arial,sans-serif;">Pi\u00e8ces jointes (${docs.length})</div>
        ${docs.map(d => `<div style="font-size:11px;color:rgba(255,255,255,0.8);font-family:Arial,sans-serif;margin-bottom:2px;">&#128206; ${d.document_number}.pdf</div>`).join("")}
      </div>`
    : "";

  const html = baseTemplate(heroText, `
    ${greeting("SCI")}
    ${bodyText(logType === "followup"
      ? `Relance concernant ${docs.length} document${docs.length > 1 ? "s" : ""} en attente de facturation.`
      : `Veuillez trouver ci-dessous ${docs.length} document${docs.length > 1 ? "s" : ""} pour facturation en date du ${dateStr}.`)}
    ${logType === "followup" ? alertBox("<strong>RELANCE</strong> \u2014 Ces documents sont en attente de traitement.", "warning") : ""}
    ${attachmentNote}
    ${sectionTitle("Documents \u00e0 facturer")}
    ${productTable(
      ["Type", "# Document", "Client", "Date", "Valeur"],
      rows,
      [["Total \u00e0 facturer", fmtCAD(total)]]
    )}
    ${alertBox("Merci de confirmer la r\u00e9ception et de nous communiquer le num\u00e9ro de facture SCI d\u00e8s traitement.")}
  `, senderName);
  const text = `Documents pour facturation SCI\nTotal: ${fmtCAD(total)}\nDocuments: ${docs.length}\n${senderName}`;
  return { subject, html, text };
}
