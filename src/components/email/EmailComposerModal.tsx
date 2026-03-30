import React, { useState, useRef } from "react";
import { useEmailSender } from "../../hooks/useEmailSender";
import { supabase } from "../../supabaseClient";
import { T } from "../../theme";
import { useLanguage } from "../../i18n/LanguageContext";

interface Attachment {
  filename: string;
  base64: string;
  mimeType: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultTo?: string;
  defaultCc?: string;
  defaultSubject?: string;
  defaultBody?: string;
  module: string;
  referenceId?: string;
  attachmentLabel?: string;
  onGetAttachment?: () => Promise<Attachment | null>;
  onSent?: () => void;
}

function ChipInput({ label, chips, onAdd, onRemove, placeholder }: {
  label: string;
  chips: string[];
  onAdd: (v: string) => void;
  onRemove: (i: number) => void;
  placeholder?: string;
}) {
  const [val, setVal] = useState("");

  const commit = () => {
    const trimmed = val.trim();
    if (trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      onAdd(trimmed);
      setVal("");
    }
  };

  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, letterSpacing: 0.6, textTransform: "uppercase", display: "block", marginBottom: 5 }}>
        {label}
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 8, background: T.bgCard, minHeight: 40, alignItems: "center" }}>
        {chips.map((chip, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#e8f0fe", color: T.main, borderRadius: 5, padding: "3px 8px", fontSize: 12, fontWeight: 600 }}>
            {chip}
            <button onClick={() => onRemove(i)} style={{ background: "none", border: "none", cursor: "pointer", color: T.main, fontSize: 14, lineHeight: 1, padding: 0, display: "flex" }}>×</button>
          </span>
        ))}
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); } }}
          onBlur={commit}
          placeholder={chips.length === 0 ? (placeholder ?? "email@exemple.com") : ""}
          style={{ border: "none", outline: "none", fontSize: 13, fontFamily: "inherit", flex: 1, minWidth: 160, background: "transparent" }}
        />
      </div>
    </div>
  );
}

export default function EmailComposerModal({
  isOpen, onClose,
  defaultTo = "", defaultCc = "", defaultSubject = "", defaultBody = "",
  module, referenceId,
  attachmentLabel, onGetAttachment, onSent,
}: Props) {
  const { sendEmail, sending } = useEmailSender();
  const { t } = useLanguage();

  const [toChips, setToChips] = useState<string[]>(() => defaultTo ? [defaultTo] : []);
  const [showCc, setShowCc] = useState(!!defaultCc);
  const [ccChips, setCcChips] = useState<string[]>(() => defaultCc ? [defaultCc] : []);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [attachmentIncluded, setAttachmentIncluded] = useState(!!attachmentLabel);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [userFullName, setUserFullName] = useState("");

  React.useEffect(() => {
    if (!isOpen) return;
    setToChips(defaultTo ? [defaultTo] : []);
    setCcChips(defaultCc ? [defaultCc] : []);
    setShowCc(!!defaultCc);
    setSubject(defaultSubject);
    setBody(defaultBody);
    setAttachmentIncluded(!!attachmentLabel);
    setSent(false);
    setSendError(null);

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
        .then(({ data }) => { if (data?.full_name) setUserFullName(data.full_name); });
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const buildHtml = () => {
    const escaped = body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const lines = escaped.split("\n").map(l => `<p style="margin:4px 0;font-size:14px;line-height:1.7;color:#1c1c1e;">${l || "&nbsp;"}</p>`).join("");
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:580px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
    <div style="background:#6366f1;padding:20px 28px;">
      <div style="color:#fff;font-size:20px;font-weight:800;">Uniflex Distribution Inc.</div>
    </div>
    <div style="padding:28px 32px;">${lines}</div>
    <div style="background:#f8f9fb;padding:14px 32px;border-top:3px solid #6366f1;text-align:center;">
      <p style="margin:0;font-size:12px;color:#6b7280;">Uniflex Distribution Inc. · Boisbriand, Québec</p>
    </div>
  </div>
</body></html>`;
  };

  const handleSend = async () => {
    if (toChips.length === 0) { setSendError(t("emailcomp.add_recipient")); return; }
    setSendError(null);

    let attachments: { filename: string; base64Content: string; mimeType: string }[] = [];
    if (attachmentIncluded && onGetAttachment && attachmentLabel) {
      const att = await onGetAttachment();
      if (att) attachments = [{ filename: att.filename, base64Content: att.base64, mimeType: att.mimeType }];
    }

    const smtpKey = module === "orders" ? "commandes" : module === "samples" ? "samples" : module === "pricelist" ? "pricelist" : module === "pickups" ? "pickups" : "commandes";
    const result = await sendEmail({
      smtp_config_key: smtpKey,
      to: toChips,
      cc: ccChips,
      subject,
      html: buildHtml(),
      text: body,
      template_key: `${module}_confirmation`,
      reference_type: module,
      reference_id: referenceId,
      attachments,
    });

    if (result.success) {
      setSent(true);
      onSent?.();
      setTimeout(() => onClose(), 1800);
    } else {
      setSendError(result.error ?? t("emailcomp.send_error"));
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: "9px 12px", border: `1px solid ${T.border}`, borderRadius: 8,
    fontSize: 13, fontFamily: "inherit", color: T.text, background: T.bgCard,
    outline: "none", width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(230,228,224,0.35)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", backdropFilter: "blur(4px)", zIndex: 9600, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: T.card, borderRadius: 16, width: "100%", maxWidth: 520, boxShadow: "0 24px 60px rgba(0,0,0,0.2)", fontFamily: "'Outfit',sans-serif" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "#e8f0fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.main} strokeWidth="2.5"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,4 12,13 2,4"/></svg>
            </div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text }}>{t("emailcomp.send_by_email")}</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.textLight, display: "flex", padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {sent ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: T.greenBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: T.green, marginBottom: 5 }}>{t("emailcomp.email_sent")}</div>
            <div style={{ fontSize: 13, color: T.textMid }}>{t("emailcomp.sent_success")}</div>
          </div>
        ) : (
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
            {sendError && (
              <div style={{ background: T.redBg, border: `1px solid #fca5a5`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: T.red, fontWeight: 600 }}>
                {sendError}
              </div>
            )}

            <ChipInput label={t("emailcomp.to_label")} chips={toChips} onAdd={v => setToChips(p => [...p, v])} onRemove={i => setToChips(p => p.filter((_, j) => j !== i))} />

            {showCc ? (
              <ChipInput label={t("emailcomp.cc_label")} chips={ccChips} onAdd={v => setCcChips(p => [...p, v])} onRemove={i => setCcChips(p => p.filter((_, j) => j !== i))} placeholder={t("emailcomp.cc_placeholder")} />
            ) : (
              <button onClick={() => setShowCc(true)} style={{ alignSelf: "flex-start", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: T.main, fontWeight: 700, fontFamily: "inherit", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                {t("emailcomp.add_cc")}
              </button>
            )}

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, letterSpacing: 0.6, textTransform: "uppercase", display: "block", marginBottom: 5 }}>{t("emailcomp.subject_label")}</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, letterSpacing: 0.6, textTransform: "uppercase", display: "block", marginBottom: 5 }}>{t("emailcomp.message_label")}</label>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={8} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
            </div>

            {attachmentLabel && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, letterSpacing: 0.6, textTransform: "uppercase", display: "block", marginBottom: 5 }}>{t("emailcomp.attachment_label")}</label>
                {attachmentIncluded ? (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: T.text }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.main} strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                    {attachmentLabel}
                    <button onClick={() => setAttachmentIncluded(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textLight, display: "flex", padding: 0 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: T.textLight, fontStyle: "italic" }}>{t("emailcomp.attachment_removed")}</span>
                )}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 6, borderTop: `1px solid ${T.border}`, marginTop: 4 }}>
              <button onClick={onClose} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: T.textMid, fontFamily: "inherit" }}>
                {t("emailcomp.cancel")}
              </button>
              <button onClick={handleSend} disabled={sending} style={{ background: T.main, color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: sending ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: sending ? 0.7 : 1, display: "flex", alignItems: "center", gap: 8 }}>
                {sending && <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "email-spin 0.7s linear infinite" }} />}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                {sending ? t("emailcomp.sending") : t("emailcomp.send")}
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes email-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
