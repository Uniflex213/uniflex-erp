const LOGO_MARK = `<table cellpadding="0" cellspacing="0" border="0" style="display:inline-table;">
  <tr>
    <td style="background:#ffffff;border-radius:8px;width:40px;height:40px;text-align:center;vertical-align:middle;font-size:15px;font-weight:900;color:#6366f1;letter-spacing:-1px;font-family:Arial,sans-serif;">UF</td>
  </tr>
</table>`;

function baseTemplate(content: string, senderLine?: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Uniflex Distribution</title>
</head>
<body style="margin:0;padding:0;background:#eef1f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,Helvetica,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#eef1f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background:#6366f1;border-radius:14px 14px 0 0;padding:28px 36px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="vertical-align:middle;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background:rgba(255,255,255,0.18);border-radius:10px;width:44px;height:44px;text-align:center;vertical-align:middle;">
                          <span style="font-size:16px;font-weight:900;color:#ffffff;letter-spacing:-1px;font-family:Arial,sans-serif;line-height:44px;display:block;">UF</span>
                        </td>
                        <td style="padding-left:14px;vertical-align:middle;">
                          <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;line-height:1.1;font-family:Arial,sans-serif;">UNIFLEX</div>
                          <div style="font-size:12px;color:rgba(255,255,255,0.65);margin-top:2px;font-family:Arial,sans-serif;">Distribution Inc. — Boisbriand, Québec</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background:#ffffff;padding:36px 36px 28px;border-left:1px solid #e5e8ef;border-right:1px solid #e5e8ef;">
              ${content}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f4f6fb;border-radius:0 0 14px 14px;padding:20px 36px;border:1px solid #e5e8ef;border-top:none;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <div style="font-size:12px;color:#6b7280;line-height:1.7;font-family:Arial,sans-serif;">
                      ${senderLine ? `<strong style="color:#374151;">${senderLine}</strong><br/>` : ""}
                      <strong style="color:#374151;">Uniflex Distribution Inc.</strong><br/>
                      Boisbriand, Québec, Canada<br/>
                      <span style="color:#9ca3af;">Ce message a été généré automatiquement par la plateforme Uniflex.</span>
                    </div>
                  </td>
                  <td align="right" valign="top">
                    <div style="font-size:10px;font-weight:800;color:#6366f1;letter-spacing:2px;font-family:Arial,sans-serif;opacity:0.4;">UNIFLEX</div>
                  </td>
                </tr>
              </table>
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
  return `<div style="font-size:10px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 12px;font-family:Arial,sans-serif;">${t}</div>`;
}

function infoTable(rows: [string, string][]) {
  const trs = rows.map(([label, val]) => `
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#6b7280;width:160px;vertical-align:top;font-family:Arial,sans-serif;">${label}</td>
      <td style="padding:9px 0;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:600;color:#111827;font-family:Arial,sans-serif;">${val}</td>
    </tr>`).join("");
  return `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">${trs}</table>`;
}

function productTable(headers: string[], rows: string[][], totals: [string, string][]) {
  const ths = headers.map((h, i) => `<th style="background:#f8f9fb;padding:9px 12px;text-align:${i >= headers.length - 2 ? "right" : "left"};font-size:10px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;font-family:Arial,sans-serif;border-bottom:2px solid #e5e8ef;">${h}</th>`).join("");
  const trs = rows.map(cells => {
    const tds = cells.map((c, i) => `<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#111827;text-align:${i >= cells.length - 2 ? "right" : "left"};font-family:Arial,sans-serif;">${c}</td>`).join("");
    return `<tr>${tds}</tr>`;
  }).join("");
  const totalRows = totals.map(([l, v]) => `
    <tr>
      <td colspan="${headers.length - 1}" style="padding:12px;font-weight:700;font-size:13px;color:#6366f1;font-family:Arial,sans-serif;">${l}</td>
      <td style="padding:12px;font-weight:800;font-size:15px;color:#6366f1;text-align:right;font-family:Arial,sans-serif;">${v}</td>
    </tr>`).join("");
  return `<div style="border-radius:10px;overflow:hidden;border:1px solid #e5e8ef;margin-bottom:24px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <thead><tr>${ths}</tr></thead>
      <tbody>${trs}</tbody>
      <tfoot style="background:#f0f4ff;">${totalRows}</tfoot>
    </table>
  </div>`;
}

function badge(label: string, color: "blue" | "green" | "orange") {
  const styles: Record<string, string> = {
    blue: "background:#dbeafe;color:#1d4ed8;",
    green: "background:#d1fae5;color:#065f46;",
    orange: "background:#fef3c7;color:#92400e;",
  };
  return `<span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;${styles[color]}font-family:Arial,sans-serif;">${label}</span>`;
}

function alertBox(html: string, type: "info" | "warning" = "info") {
  const styles = {
    info: "background:#eff6ff;border-left:4px solid #6366f1;color:#1e40af;",
    warning: "background:#fffbeb;border-left:4px solid #d97706;color:#92400e;",
  };
  return `<div style="${styles[type]}padding:14px 16px;border-radius:0 8px 8px 0;margin-bottom:24px;font-size:13px;line-height:1.6;font-family:Arial,sans-serif;">${html}</div>`;
}

function pdfAttachmentNote(filename?: string) {
  if (!filename) return "";
  return `<div style="display:flex;align-items:center;gap:8px;background:#f8f9fb;border:1px solid #e5e8ef;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
    <span style="font-size:22px;">📎</span>
    <div>
      <div style="font-size:12px;font-weight:700;color:#374151;font-family:Arial,sans-serif;">Pièce jointe</div>
      <div style="font-size:12px;color:#6b7280;font-family:Arial,sans-serif;">${filename}</div>
    </div>
  </div>`;
}

function fmtCAD(n: number): string {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);
}
function fmtDate(d: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" });
}

export interface EmailTemplate { subject: string; html: string; text: string; }

export function tplOrderConfirmationClient(order: Record<string, unknown>): EmailTemplate {
  const orderNum = (order.order_number ?? (order.id as string)?.slice(0, 20) ?? "—") as string;
  const subject = `Uniflex — Confirmation de commande ${orderNum}`;
  const products = (order.products ?? order.items ?? []) as Record<string, unknown>[];
  const rows = products.map(p => [
    String(p.product ?? p.product_name ?? "—"),
    String(p.format ?? "—"),
    String(p.qty ?? p.quantity ?? "—"),
    fmtCAD(Number(p.price ?? 0)),
    fmtCAD(Number(p.price ?? 0) * Number(p.qty ?? p.quantity ?? 0)),
  ]);
  const html = baseTemplate(`
    <p style="font-size:17px;font-weight:700;color:#111827;margin:0 0 6px;font-family:Arial,sans-serif;">Bonjour ${order.client_name ?? order.client ?? ""},</p>
    <p style="font-size:14px;color:#6b7280;margin:0 0 28px;line-height:1.6;font-family:Arial,sans-serif;">Votre commande a bien été reçue et est en cours de traitement. Merci de votre confiance.</p>
    ${sectionTitle("Détails de la commande")}
    ${infoTable([
      ["Numéro", `<strong>${orderNum}</strong>`],
      ["Date", fmtDate((order.created_at ?? new Date().toISOString()) as string)],
      ["Statut", badge("En traitement", "blue")],
      ["Type de livraison", String(order.deliveryType ?? order.delivery_type ?? "—")],
      ...(order.deliveryAddress || order.delivery_address ? [["Adresse", String(order.deliveryAddress ?? order.delivery_address)] as [string, string]] : []),
    ])}
    ${rows.length > 0 ? sectionTitle("Produits commandés") + productTable(
      ["Produit", "Format", "Qté", "Prix unit.", "Sous-total"],
      rows,
      [["Total", fmtCAD(Number(order.total ?? 0))]]
    ) : ""}
    ${alertBox("Votre commande est en cours de traitement. Vous serez contacté dès qu'elle sera prête. Répondez à cet email pour toute question.")}
    <p style="font-size:13px;color:#6b7280;margin:0;font-family:Arial,sans-serif;">Document PDF joint pour vos dossiers.</p>
  `, (order.seller_name ?? "Équipe Uniflex") as string);
  const text = `Confirmation de commande ${orderNum}\n\nBonjour ${order.client_name ?? order.client ?? ""},\n\nVotre commande a été reçue.\nTotal: ${fmtCAD(Number(order.total ?? 0))}\n\nMerci,\nUniflex Distribution Inc.`;
  return { subject, html, text };
}

export function tplOrderToSCI(order: Record<string, unknown>, senderName = "Administration Uniflex"): EmailTemplate {
  const orderNum = (order.order_number ?? (order.id as string)?.slice(0, 20) ?? "—") as string;
  const subject = `Uniflex → SCI — Nouvelle commande ${orderNum} — ${order.client_name ?? order.client ?? ""}`;
  const products = (order.products ?? order.items ?? []) as Record<string, unknown>[];
  const rows = products.map(p => [
    String(p.product ?? p.product_name ?? "—"),
    String(p.format ?? "—"),
    String(p.qty ?? p.quantity ?? "—"),
    String(p.label ?? order.label ?? "—"),
    fmtCAD(Number(p.price ?? 0)),
  ]);
  const html = baseTemplate(`
    <p style="font-size:17px;font-weight:700;color:#111827;margin:0 0 6px;font-family:Arial,sans-serif;">Bonjour,</p>
    <p style="font-size:14px;color:#6b7280;margin:0 0 28px;line-height:1.6;font-family:Arial,sans-serif;">Veuillez trouver ci-dessous une nouvelle commande à produire. Le document PDF est joint.</p>
    ${sectionTitle("Informations commande")}
    ${infoTable([
      ["Numéro", `<strong>${orderNum}</strong>`],
      ["Date", fmtDate((order.created_at ?? new Date().toISOString()) as string)],
      ["Client final", String(order.client_name ?? order.client ?? "—")],
      ["Motif", String(order.motif ?? "—")],
      ["Destination", String(order.destination ?? "—")],
      ["Label", String(order.label ?? "—")],
    ])}
    ${rows.length > 0 ? sectionTitle("Produits à produire") + productTable(
      ["Produit", "Format", "Qté", "Label", "Prix"],
      rows,
      [["Total commande", fmtCAD(Number(order.total ?? 0))]]
    ) : ""}
    ${alertBox("Merci de confirmer la réception de cette commande et de nous communiquer le numéro de suivi dès expédition.", "warning")}
    <p style="font-size:13px;color:#6b7280;margin:0;font-family:Arial,sans-serif;">Envoyé par : <strong style="color:#374151;">${senderName}</strong></p>
  `);
  const text = `Nouvelle commande SCI: ${orderNum}\nClient: ${order.client_name ?? order.client ?? "—"}\nTotal: ${fmtCAD(Number(order.total ?? 0))}\n\nMerci de confirmer la réception.\n${senderName}`;
  return { subject, html, text };
}

export function tplPickupTicketClient(ticket: Record<string, unknown>): EmailTemplate {
  const ticketNum = (ticket.ticket_number ?? (ticket.id as string)?.slice(0, 12) ?? "—") as string;
  const subject = `Uniflex — Ticket de ramassage ${ticketNum}`;
  const items = (ticket.items ?? []) as Record<string, unknown>[];
  const rows = items.map(item => [
    String(item.product_name ?? "—"),
    String(item.format ?? "—"),
    String(item.quantity ?? "—"),
    fmtCAD(Number(item.unit_price ?? 0)),
    fmtCAD(Number(item.subtotal ?? 0)),
  ]);
  const html = baseTemplate(`
    <p style="font-size:17px;font-weight:700;color:#111827;margin:0 0 6px;font-family:Arial,sans-serif;">Bonjour ${ticket.client_name ?? ""},</p>
    <p style="font-size:14px;color:#6b7280;margin:0 0 28px;line-height:1.6;font-family:Arial,sans-serif;">Votre ticket de ramassage est prêt. Présentez-vous au comptoir Uniflex avec ce document ou le PDF joint.</p>
    ${sectionTitle("Ticket de ramassage")}
    ${infoTable([
      ["Numéro de ticket", `<strong>${ticketNum}</strong>`],
      ["Date", fmtDate((ticket.created_at ?? new Date().toISOString()) as string)],
      ["Statut", badge("Prêt pour ramassage", "green")],
      ...(ticket.notes ? [["Notes", String(ticket.notes)] as [string, string]] : []),
    ])}
    ${rows.length > 0 ? sectionTitle("Articles") + productTable(
      ["Produit", "Format", "Qté", "Prix unit.", "Sous-total"],
      rows,
      [["Total (taxes incluses)", fmtCAD(Number(ticket.total_with_tax ?? ticket.total_value ?? 0))]]
    ) : ""}
    ${alertBox("Le PDF de votre ticket est joint à cet email. Présentez-le lors de votre visite aux heures d'ouverture habituelles.")}
  `);
  const text = `Ticket de ramassage ${ticketNum}\n\nBonjour ${ticket.client_name ?? ""},\n\nVotre commande est prête.\nTotal: ${fmtCAD(Number(ticket.total_with_tax ?? ticket.total_value ?? 0))}\n\nUniflex Distribution Inc.`;
  return { subject, html, text };
}

export function tplSampleApproved(sample: Record<string, unknown>): EmailTemplate {
  const company = (sample.lead_company_name ?? sample.company_name ?? "") as string;
  const subject = `Uniflex — Demande d'échantillon approuvée — ${company}`;
  const html = baseTemplate(`
    <p style="font-size:17px;font-weight:700;color:#111827;margin:0 0 6px;font-family:Arial,sans-serif;">Bonjour ${sample.contact_name ?? sample.lead_name ?? ""},</p>
    <p style="font-size:14px;color:#6b7280;margin:0 0 28px;line-height:1.6;font-family:Arial,sans-serif;">Bonne nouvelle ! Votre demande d'échantillon a été approuvée et est en cours de préparation.</p>
    ${sectionTitle("Détails")}
    ${infoTable([
      ["Entreprise", company],
      ["Statut", badge("Approuvé", "green")],
      ...(sample.eta_delivery ? [["Livraison estimée", fmtDate(sample.eta_delivery as string)] as [string, string]] : []),
      ...(sample.approval_notes ? [["Notes", String(sample.approval_notes)] as [string, string]] : []),
    ])}
    ${alertBox("Nous vous contacterons dès que votre échantillon sera expédié. Un suivi de 72h sera effectué après réception.")}
    <p style="font-size:13px;color:#6b7280;margin:0;font-family:Arial,sans-serif;">Merci de votre intérêt pour les produits Uniflex.</p>
  `);
  const text = `Demande d'échantillon approuvée\n\nBonjour,\n\nVotre demande pour ${company} a été approuvée.\n\nUniflex Distribution Inc.`;
  return { subject, html, text };
}

export function tplSampleDelivered(sample: Record<string, unknown>, senderName: string): EmailTemplate {
  const company = (sample.lead_company_name ?? sample.company_name ?? "") as string;
  const subject = `Uniflex — Échantillon livré — ${company}`;
  const html = baseTemplate(`
    <p style="font-size:17px;font-weight:700;color:#111827;margin:0 0 6px;font-family:Arial,sans-serif;">Bonjour ${sample.contact_name ?? sample.lead_name ?? ""},</p>
    <p style="font-size:14px;color:#6b7280;margin:0 0 28px;line-height:1.6;font-family:Arial,sans-serif;">Votre échantillon Uniflex a été livré. Nous espérons qu'il répondra à vos attentes !</p>
    ${alertBox("Un suivi sera effectué dans les 72 heures. Notre équipe vous contactera pour recueillir vos impressions.", "warning")}
    ${sectionTitle("Recommandations d'application")}
    ${infoTable([
      ["Préparation surface", "Nettoyage mécanique requis (meulage ou grenaillage)"],
      ["Température", "Min. 10°C — Humidité relative &lt; 85%"],
      ["Mélange", "Respecter les ratios du guide technique fourni"],
      ["Temps de pot", "Consulter la fiche technique du produit"],
    ])}
    ${alertBox("Pour toute question technique, répondez directement à cet email.")}
    <p style="font-size:13px;color:#6b7280;margin:0;font-family:Arial,sans-serif;">Votre représentant : <strong style="color:#374151;">${senderName}</strong></p>
  `, senderName);
  const text = `Échantillon livré\n\nBonjour,\n\nVotre échantillon pour ${company} a été livré. Un suivi sera effectué dans 72h.\n\n${senderName}\nUniflex Distribution Inc.`;
  return { subject, html, text };
}

export function tplPricelistClient(pricelist: Record<string, unknown>, senderName: string): EmailTemplate {
  const company = (pricelist.companyName ?? pricelist.company_name ?? "") as string;
  const contact = (pricelist.contactName ?? pricelist.contact_name ?? "") as string;
  const validUntil = (pricelist.validUntil ?? pricelist.valid_until ?? "") as string;
  const subject = `Uniflex — Liste de prix — ${company} — Valide jusqu'au ${fmtDate(validUntil)}`;
  const filename = `Pricelist_${company.replace(/\s+/g, "_")}.pdf`;
  const html = baseTemplate(`
    <p style="font-size:17px;font-weight:700;color:#111827;margin:0 0 6px;font-family:Arial,sans-serif;">Bonjour ${contact},</p>
    <p style="font-size:14px;color:#6b7280;margin:0 0 28px;line-height:1.6;font-family:Arial,sans-serif;">Veuillez trouver ci-joint votre liste de prix personnalisée Uniflex en format PDF.</p>
    ${pdfAttachmentNote(filename)}
    ${sectionTitle("Informations")}
    ${infoTable([
      ["Entreprise", `<strong>${company}</strong>`],
      ["Type client", String(pricelist.clientType ?? pricelist.client_type ?? "—")],
      ["Devise", String(pricelist.currency ?? "CAD")],
      ["Valide jusqu'au", `<strong>${fmtDate(validUntil)}</strong>`],
    ])}
    ${alertBox("<strong>Confidentiel :</strong> Cette liste de prix est personnalisée et strictement confidentielle. Elle est valide jusqu'à la date indiquée.", "warning")}
    ${alertBox("Pour commander ou pour toute question, répondez directement à cet email.")}
    <p style="font-size:13px;color:#6b7280;margin:0;font-family:Arial,sans-serif;">Votre représentant : <strong style="color:#374151;">${senderName}</strong></p>
  `, senderName);
  const text = `Liste de prix personnalisée Uniflex\n\nBonjour ${contact},\n\nVotre pricelist est en pièce jointe.\nValide jusqu'au ${fmtDate(validUntil)}.\n\n${senderName}\nUniflex Distribution Inc.`;
  return { subject, html, text };
}

export function tplSCIInvoice(
  docs: Record<string, unknown>[],
  logType: "send" | "followup" = "send",
  senderName = "Administration Uniflex"
): EmailTemplate {
  const total = docs.reduce((a, d) => a + Number(d.value ?? 0), 0);
  const dateStr = new Date().toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" });
  const subject = logType === "followup"
    ? `Uniflex — RELANCE — Documents pour facturation — ${dateStr} — ${docs.length} doc${docs.length > 1 ? "s" : ""} — ${fmtCAD(total)}`
    : `Uniflex — Documents pour facturation — ${dateStr} — ${docs.length} doc${docs.length > 1 ? "s" : ""} — ${fmtCAD(total)}`;
  const rows = docs.map(d => [
    d.document_type === "pickup" ? "Pickup Ticket" : "Commande",
    `<strong>${String(d.document_number ?? "—")}</strong>`,
    String(d.client_name ?? "—"),
    fmtDate((d.issued_at ?? "") as string),
    fmtCAD(Number(d.value ?? 0)),
  ]);
  const attachmentNote = docs.length > 0
    ? `<div style="background:#f8f9fb;border:1px solid #e5e8ef;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
        <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;font-family:Arial,sans-serif;">Pièces jointes (${docs.length})</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${docs.map(d => `<span style="background:#fff;border:1px solid #e5e8ef;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:600;color:#374151;font-family:Arial,sans-serif;">📎 ${d.document_number}.pdf</span>`).join("")}
        </div>
      </div>`
    : "";
  const html = baseTemplate(`
    <p style="font-size:17px;font-weight:700;color:#111827;margin:0 0 6px;font-family:Arial,sans-serif;">Bonjour,</p>
    <p style="font-size:14px;color:#6b7280;margin:0 0 28px;line-height:1.6;font-family:Arial,sans-serif;">
      ${logType === "followup"
        ? `Relance concernant ${docs.length} document${docs.length > 1 ? "s" : ""} en attente de facturation.`
        : `Veuillez trouver ci-dessous ${docs.length} document${docs.length > 1 ? "s" : ""} pour facturation en date du ${dateStr}.`}
    </p>
    ${logType === "followup" ? alertBox("<strong>RELANCE</strong> — Ces documents sont en attente de traitement.", "warning") : ""}
    ${attachmentNote}
    ${sectionTitle("Documents à facturer")}
    ${productTable(
      ["Type", "# Document", "Client", "Date", "Valeur"],
      rows,
      [["Total à facturer", fmtCAD(total)]]
    )}
    ${alertBox("Merci de confirmer la réception et de nous communiquer le numéro de facture SCI dès traitement.")}
    <p style="font-size:13px;color:#6b7280;margin:0;font-family:Arial,sans-serif;">Envoyé par : <strong style="color:#374151;">${senderName}</strong></p>
  `, senderName);
  const text = `Documents pour facturation SCI\nTotal: ${fmtCAD(total)}\nDocuments: ${docs.length}\n${senderName}`;
  return { subject, html, text };
}
