import React, { useState, useEffect } from "react";
import { useEmailSender } from "../hooks/useEmailSender";
import { ComposeData } from "./emailTypes";
import { X, Send, Paperclip, ChevronDown } from "lucide-react";
import { T } from "../theme";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initial?: Partial<ComposeData>;
  fromEmail?: string;
}

export default function EmailComposeModal({ isOpen, onClose, initial, fromEmail }: Props) {
  const { sendEmail, sending } = useEmailSender();
  const [to, setTo] = useState(initial?.to ?? "");
  const [cc, setCc] = useState(initial?.cc ?? "");
  const [showCc, setShowCc] = useState(!!(initial?.cc));
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTo(initial?.to ?? "");
      setCc(initial?.cc ?? "");
      setShowCc(!!(initial?.cc));
      setSubject(initial?.subject ?? "");
      setBody(initial?.body ?? "");
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = async () => {
    setError(null);
    const toList = to.split(",").map(s => s.trim()).filter(Boolean);
    if (toList.length === 0) { setError("Adresse destinataire requise."); return; }

    const htmlBody = `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1c1c1e;">${body.replace(/\n/g, "<br/>")}</div>`;

    const result = await sendEmail({
      smtp_config_key: "user_personal",
      to: toList,
      cc: cc ? cc.split(",").map(s => s.trim()).filter(Boolean) : [],
      subject,
      html: htmlBody,
      text: body,
      template_key: "compose",
      reference_type: "email_compose",
    });

    if (result.success) {
      setSuccess(true);
      setTimeout(() => { onClose(); }, 1800);
    } else {
      setError(result.error ?? "Erreur lors de l'envoi.");
    }
  };

  const iStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", border: `1px solid ${T.border}`,
    borderRadius: 6, fontSize: 13, fontFamily: "inherit", outline: "none",
    background: T.bgCard, color: T.text, boxSizing: "border-box",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10100, display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: "0 24px 24px 0", pointerEvents: "none" }}>
      <div style={{ width: 540, background: T.card, borderRadius: 14, boxShadow: "0 24px 80px rgba(0,0,0,0.22)", border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", pointerEvents: "all", overflow: "hidden", maxHeight: "80vh" }}>
        <div style={{ padding: "14px 18px", background: T.main, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", flex: 1 }}>
            {initial?.replyToId ? "Répondre" : "Nouveau message"}
          </span>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 6, cursor: "pointer", color: "#fff", padding: "4px 6px", display: "flex", alignItems: "center" }}>
            <X size={14} />
          </button>
        </div>

        {success ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: T.greenBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.green }}>Message envoyé</div>
          </div>
        ) : (
          <>
            <div style={{ padding: "0 18px", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${T.border}`, paddingBottom: 8, paddingTop: 10, gap: 8 }}>
                <span style={{ fontSize: 12, color: T.textMid, width: 24, flexShrink: 0 }}>À</span>
                <input value={to} onChange={e => setTo(e.target.value)} placeholder="destinataire@email.com" style={{ ...iStyle, border: "none", padding: "0", flex: 1 }} />
                <button onClick={() => setShowCc(!showCc)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textLight, fontSize: 11, display: "flex", alignItems: "center", gap: 2 }}>
                  Cc <ChevronDown size={12} />
                </button>
              </div>
              {showCc && (
                <div style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${T.border}`, paddingBottom: 8, paddingTop: 8, gap: 8 }}>
                  <span style={{ fontSize: 12, color: T.textMid, width: 24, flexShrink: 0 }}>Cc</span>
                  <input value={cc} onChange={e => setCc(e.target.value)} placeholder="cc@email.com" style={{ ...iStyle, border: "none", padding: "0", flex: 1 }} />
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", paddingBottom: 8, paddingTop: 8, gap: 8 }}>
                <span style={{ fontSize: 12, color: T.textMid, width: 24, flexShrink: 0 }}>Objet</span>
                <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Objet du message" style={{ ...iStyle, border: "none", padding: "0", flex: 1 }} />
              </div>
            </div>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Rédigez votre message..."
              style={{ flex: 1, padding: "14px 18px", border: "none", resize: "none", fontSize: 13, fontFamily: "inherit", color: T.text, outline: "none", minHeight: 200, background: T.bgCard, lineHeight: 1.6 }}
            />
            {fromEmail && (
              <div style={{ padding: "6px 18px", borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.textLight }}>
                Envoyé depuis : {fromEmail}
              </div>
            )}
            {error && (
              <div style={{ margin: "0 18px 10px", background: T.redBg, border: "1px solid #fca5a5", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: T.red }}>
                {error}
              </div>
            )}
            <div style={{ padding: "10px 18px", borderTop: `1px solid ${T.border}`, background: T.bg, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button style={{ background: "none", border: "none", cursor: "pointer", color: T.textLight, display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <Paperclip size={14} /> Joindre
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !to.trim()}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 20px", borderRadius: 8, border: "none", background: sending || !to.trim() ? "#9ca3af" : T.main, color: "#fff", fontSize: 13, fontWeight: 700, cursor: sending || !to.trim() ? "not-allowed" : "pointer", fontFamily: "inherit" }}
              >
                {sending && <span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />}
                <Send size={14} /> {sending ? "Envoi..." : "Envoyer"}
              </button>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}
