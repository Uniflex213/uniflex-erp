import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { InvoiceDoc, T, fmt, fmtDate } from "./toInvoiceTypes";
import { useEmailSender } from "../../hooks/useEmailSender";
import { generatePickupTicketPDFBase64 } from "../pickupTicketPDF";
import { generateOrderPDFBase64 } from "../../orders/orderPDF";
import { PickupTicket } from "../storeOpsTypes";
import { Order } from "../../orders/orderTypes";

interface Props {
  docs: InvoiceDoc[];
  logType?: "send" | "followup";
  onClose: () => void;
  onSent: () => void;
}

const SCI_EMAIL = "michael@sci.com";
const SENDER_NAME = "Administration Uniflex";
const SENDER_PHONE = "1 (514) 000-0000";

function buildSubject(docs: InvoiceDoc[], now: Date): string {
  const total = docs.reduce((a, d) => a + d.value, 0);
  const dateStr = now.toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" });
  return `Uniflex — Documents pour facturation — ${dateStr} — ${docs.length} document${docs.length !== 1 ? "s" : ""} — ${fmt(total)}`;
}

function buildBody(docs: InvoiceDoc[], now: Date, logType: "send" | "followup"): string {
  const total = docs.reduce((a, d) => a + d.value, 0);
  const dateStr = now.toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" });

  if (logType === "followup") {
    const firstSent = docs[0]?.sent_to_sci_at ? fmtDate(docs[0].sent_to_sci_at) : "—";
    return `Bonjour,

Je fais suite à notre envoi du ${firstSent} concernant ${docs.length} document${docs.length !== 1 ? "s" : ""} pour facturation d'une valeur totale de ${fmt(total)}.

Pourriez-vous confirmer le traitement des documents suivants :

${docs.map(d => `• ${d.document_type === "pickup" ? "Pickup Ticket" : "Commande"} ${d.document_number} — ${d.client_name} — ${fmt(d.value)} — ${fmtDate(d.issued_at)}`).join("\n")}

Valeur totale : ${fmt(total)}

Merci de nous confirmer dès que possible.

Cordialement,
${SENDER_NAME}
Uniflex Distribution Inc.
${SENDER_PHONE}`;
  }

  return `Bonjour,

Veuillez trouver ci-joint ${docs.length} document${docs.length !== 1 ? "s" : ""} pour facturation en date du ${dateStr} :

${docs.map(d => `• ${d.document_type === "pickup" ? "Pickup Ticket" : "Commande"} ${d.document_number} — ${d.client_name} — ${fmt(d.value)} — ${fmtDate(d.issued_at)}`).join("\n")}

Valeur totale à facturer : ${fmt(total)}

Merci de confirmer la facturation une fois traitée.

Cordialement,
${SENDER_NAME}
Uniflex Distribution Inc.
${SENDER_PHONE}`;
}

function buildHtmlBody(docs: InvoiceDoc[], now: Date, logType: "send" | "followup", textBody: string): string {
  const total = docs.reduce((a, d) => a + d.value, 0);
  const docRows = docs.map(d => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;">${d.document_type === "pickup" ? "Pickup Ticket" : "Commande"}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;font-weight:700;">${d.document_number}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;">${d.client_name}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;">${fmtDate(d.issued_at)}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;font-weight:700;text-align:right;color:#6366f1;">${fmt(d.value)}</td>
    </tr>`).join("");

  const htmlLines = textBody
    .split("\n")
    .map(line => line.startsWith("•")
      ? `<li style="margin:4px 0;font-size:14px;">${line.substring(1).trim()}</li>`
      : `<p style="margin:6px 0;font-size:14px;line-height:1.6;">${line || "&nbsp;"}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:640px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
    <div style="background:#6366f1;padding:24px 32px;">
      <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Uniflex Distribution Inc.</div>
      <div style="color:rgba(255,255,255,0.75);font-size:13px;margin-top:4px;">${logType === "followup" ? "Relance de facturation" : "Documents pour facturation"}</div>
    </div>
    <div style="padding:28px 32px;">
      ${htmlLines}
      <div style="margin-top:24px;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
        <table style="width:100%;border-collapse:collapse;background:#fff;">
          <thead>
            <tr style="background:#f8f9fb;">
              <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;">Type</th>
              <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;"># Document</th>
              <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;">Client</th>
              <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;">Date</th>
              <th style="padding:10px 14px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;">Valeur</th>
            </tr>
          </thead>
          <tbody>${docRows}</tbody>
          <tfoot>
            <tr style="background:#f0f4ff;">
              <td colspan="4" style="padding:12px 14px;font-weight:800;font-size:13px;color:#6366f1;">Total</td>
              <td style="padding:12px 14px;font-weight:800;font-size:15px;color:#6366f1;text-align:right;">${fmt(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
    <div style="background:#f8f9fb;padding:16px 32px;border-top:3px solid #6366f1;text-align:center;">
      <p style="margin:0;font-size:12px;color:#6b7280;">Uniflex Distribution Inc. · Boisbriand, Québec · ${SENDER_PHONE}</p>
    </div>
  </div>
</body>
</html>`;
}

export default function EmailToolModal({ docs, logType = "send", onClose, onSent }: Props) {
  const now = new Date();
  const total = docs.reduce((a, d) => a + d.value, 0);
  const { sendEmail, sending } = useEmailSender();

  const [to, setTo] = useState(SCI_EMAIL);
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(() => buildSubject(docs, now));
  const [body, setBody] = useState(() => buildBody(docs, now, logType));
  const [preview, setPreview] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    setSubject(buildSubject(docs, now));
    setBody(buildBody(docs, now, logType));
  }, [docs.length]);

  const handleSend = async () => {
    setSendError(null);
    try {
      const { data: log, error: logErr } = await supabase
        .from("sci_email_log")
        .insert({
          sent_by: "Admin",
          recipients: to.split(",").map(s => s.trim()).filter(Boolean),
          cc_recipients: cc.split(",").map(s => s.trim()).filter(Boolean),
          subject,
          body,
          num_documents: docs.length,
          total_value: total,
          log_type: logType,
        })
        .select("id")
        .single();

      if (logErr) throw logErr;

      await supabase.from("sci_email_log_items").insert(
        docs.map(d => ({
          log_id: log.id,
          document_type: d.document_type,
          document_id: d.id,
          document_number: d.document_number,
          client_name: d.client_name,
          value: d.value,
        }))
      );

      for (const doc of docs) {
        if (doc.document_type === "pickup") {
          await supabase
            .from("pickup_tickets")
            .update({ billing_status: "sent", sent_to_sci_at: now.toISOString() })
            .eq("id", doc.id);
        } else {
          await supabase
            .from("orders")
            .update({ billing_status: "sent", sent_to_sci_at: now.toISOString() })
            .eq("id", doc.id);
        }
      }

      const attachments: Array<{ filename: string; base64Content: string; mimeType: string }> = [];
      for (const doc of docs) {
        try {
          if (doc.document_type === "pickup" && doc.raw) {
            const { data: items } = await supabase
              .from("pickup_ticket_items")
              .select("*")
              .eq("ticket_id", doc.id);
            const ticketObj = { ...doc.raw, items: items ?? [] } as unknown as PickupTicket;
            const att = await generatePickupTicketPDFBase64(ticketObj);
            attachments.push({ filename: att.filename, base64Content: att.base64, mimeType: att.mimeType });
          } else if (doc.document_type === "order" && doc.raw) {
            const orderObj = { ...doc.raw, products: (doc.raw.products ?? []) } as unknown as Order;
            const att = await generateOrderPDFBase64(orderObj);
            attachments.push({ filename: att.filename, base64Content: att.base64, mimeType: att.mimeType });
          }
        } catch {}
      }

      const ccList = cc.split(",").map(s => s.trim()).filter(Boolean);
      const htmlBody = buildHtmlBody(docs, now, logType, body);

      const emailResult = await sendEmail({
        smtp_config_key: "factures",
        to: to.split(",").map(s => s.trim()).filter(Boolean),
        cc: ccList,
        subject,
        html: htmlBody,
        text: body,
        template_key: "sci_invoice",
        reference_type: "sci_invoice",
        reference_id: docs[0]?.id,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      if (!emailResult.success) {
        setSendError(emailResult.error ?? "Erreur lors de l'envoi de l'email.");
        return;
      }

      setSent(true);
      setTimeout(() => {
        onSent();
        onClose();
      }, 1800);
    } catch (e: any) {
      setSendError(e.message ?? "Erreur inattendue. Veuillez réessayer.");
    }
  };

  const isSending = sending;

  const inputStyle: React.CSSProperties = {
    padding: "9px 12px", border: `1px solid ${T.border}`, borderRadius: 8,
    fontSize: 13, fontFamily: "inherit", color: T.text, background: T.bgCard,
    outline: "none", width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(230,228,224,0.85)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", zIndex: 9500, display: "flex", justifyContent: "center", overflowY: "auto", padding: 20 }}>
      <div style={{ background: T.card, borderRadius: 16, width: "100%", maxWidth: 740, margin: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.2)", fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: T.text }}>
              {logType === "followup" ? "Relancer SCI" : "Envoyer à SCI pour facturation"}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: T.textMid }}>
              {docs.length} document{docs.length !== 1 ? "s" : ""} sélectionné{docs.length !== 1 ? "s" : ""} — Valeur totale : <strong style={{ color: T.main }}>{fmt(total)}</strong>
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: T.textMid, lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {sent ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.greenBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.green, marginBottom: 6 }}>Email envoyé !</div>
            <div style={{ fontSize: 13, color: T.textMid }}>{docs.length} document{docs.length !== 1 ? "s" : ""} envoyé{docs.length !== 1 ? "s" : ""} à SCI — {fmt(total)}</div>
          </div>
        ) : preview ? (
          <div style={{ padding: "20px 24px" }}>
            {sendError && (
              <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#dc2626", fontWeight: 600 }}>
                {sendError}
              </div>
            )}
            <div style={{ background: T.cardAlt, borderRadius: 12, padding: 20, border: `1px solid ${T.border}`, fontFamily: "monospace", fontSize: 13 }}>
              <div style={{ marginBottom: 8 }}><strong>À :</strong> {to}</div>
              {cc && <div style={{ marginBottom: 8 }}><strong>CC :</strong> {cc}</div>}
              <div style={{ marginBottom: 12 }}><strong>Objet :</strong> {subject}</div>
              <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{body}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button onClick={() => setPreview(false)} style={{ background: T.cardAlt, color: T.text, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Modifier
              </button>
              <button onClick={handleSend} disabled={isSending} style={{ background: T.main, color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: isSending ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: isSending ? 0.7 : 1, display: "flex", alignItems: "center", gap: 8 }}>
                {isSending && <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />}
                {isSending ? "Envoi en cours..." : "Confirmer et envoyer"}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: "20px 24px" }}>
            {sendError && (
              <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#dc2626", fontWeight: 600 }}>
                {sendError}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, letterSpacing: 0.6, textTransform: "uppercase", display: "block", marginBottom: 5 }}>À (destinataire)</label>
                <input value={to} onChange={e => setTo(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, letterSpacing: 0.6, textTransform: "uppercase", display: "block", marginBottom: 5 }}>CC</label>
                <input value={cc} onChange={e => setCc(e.target.value)} placeholder="email@exemple.com, email2@exemple.com" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, letterSpacing: 0.6, textTransform: "uppercase", display: "block", marginBottom: 5 }}>Objet</label>
                <input value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, letterSpacing: 0.6, textTransform: "uppercase", display: "block", marginBottom: 5 }}>Corps de l'email</label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={14}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                />
              </div>

              <div style={{ background: T.cardAlt, borderRadius: 10, padding: "12px 16px", border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>Pièces jointes ({docs.length} PDF)</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {docs.map(d => (
                    <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 5, background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, color: T.text }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      {d.document_number}.pdf
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
              <button onClick={onClose} style={{ background: T.cardAlt, color: T.textMid, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Annuler
              </button>
              <button onClick={() => setPreview(true)} style={{ background: T.cardAlt, color: T.text, border: `1px solid ${T.borderMid}`, borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Aperçu
              </button>
              <button onClick={handleSend} disabled={isSending} style={{ background: T.main, color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: isSending ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: isSending ? 0.7 : 1, display: "flex", alignItems: "center", gap: 8 }}>
                {isSending && (
                  <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                )}
                {isSending ? "Envoi en cours..." : "Envoyer"}
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
