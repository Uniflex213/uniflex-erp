import React, { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { useEmailSender } from "../../hooks/useEmailSender";
import { T } from "../../theme";

const SMTP_LABELS: Record<string, string> = {
  commandes: "Confirmations de commandes",
  factures: "Facturation SCI",
  samples: "Échantillons",
  pricelist: "Pricelists clients",
  pickups: "Pickup Tickets",
  user_personal: "Votre boîte personnelle",
};

export interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSent?: () => void;
  smtpConfigKey: string;
  to: string;
  cc?: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  templateKey: string;
  referenceType?: string;
  referenceId?: string;
  attachmentLabel?: string;
  onGetAttachment?: () => Promise<{ filename: string; base64: string; mimeType: string } | null>;
}


const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: `1.5px solid ${T.border}`, borderRadius: 8,
  fontSize: 13, fontFamily: "inherit", color: T.text, background: T.bgCard,
  outline: "none", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase",
  letterSpacing: 0.5, marginBottom: 5, display: "block",
};

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export default function SendEmailModal({
  isOpen, onClose, onSent,
  smtpConfigKey, to: initialTo, cc: initialCc = "", subject: initialSubject,
  htmlBody, textBody, templateKey, referenceType, referenceId,
  attachmentLabel, onGetAttachment,
}: SendEmailModalProps) {
  const { sendEmail, sending } = useEmailSender();
  const [to, setTo] = useState(initialTo);
  const [cc, setCc] = useState(initialCc);
  const [subject, setSubject] = useState(initialSubject);
  const [attachmentRemoved, setAttachmentRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTo(initialTo);
      setCc(initialCc);
      setSubject(initialSubject);
      setAttachmentRemoved(false);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, initialTo, initialCc, initialSubject]);

  if (!isOpen) return null;

  const handleSend = async () => {
    setError(null);
    const toList = to.split(",").map(s => s.trim()).filter(Boolean);
    if (toList.length === 0 || !isValidEmail(toList[0])) {
      setError("Adresse email destinataire invalide ou manquante.");
      return;
    }

    let attachments: { filename: string; base64Content: string; mimeType: string }[] | undefined;
    if (onGetAttachment && !attachmentRemoved) {
      try {
        const att = await onGetAttachment();
        if (att) {
          attachments = [{ filename: att.filename, base64Content: att.base64, mimeType: att.mimeType }];
        }
      } catch {
        setError("Impossible de générer la pièce jointe. Réessayez.");
        return;
      }
    }

    const ccList = cc.split(",").map(s => s.trim()).filter(Boolean);
    const result = await sendEmail({
      smtp_config_key: smtpConfigKey,
      to: toList,
      cc: ccList,
      subject,
      html: htmlBody,
      text: textBody,
      template_key: templateKey,
      reference_type: referenceType,
      reference_id: referenceId,
      attachments,
    });

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        onSent?.();
        onClose();
      }, 1800);
    } else {
      setError(result.error ?? "Erreur lors de l'envoi. Vérifiez la configuration SMTP.");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(230,228,224,0.35)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", zIndex: 9600, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: T.card, borderRadius: 16, width: "100%", maxWidth: 680, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.2)", fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: T.mainBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={T.main} strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>Aperçu et envoi</div>
            <div style={{ fontSize: 11, color: T.textMid }}>{SMTP_LABELS[smtpConfigKey] ?? smtpConfigKey}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMid, padding: 6, borderRadius: 6, display: "flex", alignItems: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {success ? (
          <div style={{ padding: 52, textAlign: "center" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: T.greenBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: T.green }}>Email envoyé avec succès</div>
            <div style={{ fontSize: 13, color: T.textMid, marginTop: 6 }}>Fermeture automatique...</div>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
              {error && (
                <div style={{ background: T.redBg, border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: T.red, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </div>
              )}

              <div>
                <label style={labelStyle}>À (destinataire) *</label>
                <input value={to} onChange={e => setTo(e.target.value)} placeholder="email@exemple.com"
                  style={{ ...inputStyle, borderColor: to && !isValidEmail(to.split(",")[0].trim()) ? T.red : T.border }} />
                <div style={{ fontSize: 11, color: T.textLight, marginTop: 4 }}>Plusieurs adresses séparées par des virgules</div>
              </div>

              <div>
                <label style={labelStyle}>CC (optionnel)</label>
                <input value={cc} onChange={e => setCc(e.target.value)} placeholder="email@exemple.com, email2@exemple.com" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Objet</label>
                <input value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle} />
              </div>

              <div style={{ background: T.cardAlt, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: T.textMid, display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
                Envoyé depuis : <strong style={{ color: T.text }}>{SMTP_LABELS[smtpConfigKey] ?? smtpConfigKey}</strong>
              </div>

              {attachmentLabel && (
                <div>
                  <label style={labelStyle}>Pièce jointe</label>
                  {attachmentRemoved ? (
                    <div style={{ fontSize: 13, color: T.textMid, fontStyle: "italic" }}>Pièce jointe supprimée.</div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.cardAlt, borderRadius: 8, padding: "8px 12px", border: `1px solid ${T.border}` }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.text, flex: 1 }}>{attachmentLabel}</span>
                      <button onClick={() => setAttachmentRemoved(true)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMid, padding: 2, display: "flex", alignItems: "center" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label style={labelStyle}>Aperçu de l'email</label>
                <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden", height: 300, overflowY: "auto" }}>
                  {htmlBody ? (
                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlBody) }} style={{ fontSize: 13, lineHeight: 1.5 }} />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: T.textLight, fontSize: 13 }}>Aperçu non disponible</div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ padding: "14px 22px", borderTop: `1px solid ${T.border}`, background: T.cardAlt, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: T.textLight }}>Config : {SMTP_LABELS[smtpConfigKey] ?? smtpConfigKey}</span>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={onClose} style={{ background: T.bgCard, color: T.textMid, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  Annuler
                </button>
                <button onClick={handleSend} disabled={sending} style={{ background: T.main, color: "#fff", border: "none", borderRadius: 8, padding: "9px 22px", fontSize: 13, fontWeight: 700, cursor: sending ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: sending ? 0.75 : 1, display: "flex", alignItems: "center", gap: 8 }}>
                  {sending && <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />}
                  {sending ? "Envoi..." : "Envoyer"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}
