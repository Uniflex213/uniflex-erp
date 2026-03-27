import React, { useState } from "react";
import { SciEmailLog, T, fmt, fmtDate } from "./toInvoiceTypes";
import { useLanguage } from "../../i18n/LanguageContext";

interface Props {
  logs: SciEmailLog[];
}

export default function TabHistory({ logs }: Props) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState<string | null>(null);

  const exportCSV = () => {
    const rows = [
      ["Date envoi", "Destinataire", "Nombre docs", "Valeur totale", "Documents inclus", "Type", "Envoyé par"],
      ...logs.map(l => [
        new Date(l.sent_at).toLocaleString("fr-CA"),
        l.recipients.join(", "),
        String(l.num_documents),
        String(l.total_value),
        (l.items || []).map(i => i.document_number).join(" | "),
        l.log_type === "send" ? "Envoi initial" : "Relance",
        l.sent_by,
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `historique-envois-sci-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  if (logs.length === 0) {
    return (
      <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.textMid, marginBottom: 4 }}>{t("history.no_history")}</div>
        <div style={{ fontSize: 13, color: T.textLight }}>{t("history.emails_here")}</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={exportCSV} style={{ background: T.cardAlt, color: T.text, border: `1px solid ${T.border}`, borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          {t("history.export_csv")}
        </button>
      </div>

      {logs.map(log => {
        const isOpen = expanded === log.id;
        return (
          <div key={log.id} style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
            <div
              onClick={() => setExpanded(isOpen ? null : log.id)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", cursor: "pointer", transition: "background 0.1s" }}
              onMouseEnter={e => (e.currentTarget.style.background = T.cardAlt)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: log.log_type === "send" ? T.mainBg : T.orangeBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={log.log_type === "send" ? T.main : T.orange} strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 2 }}>
                  {log.log_type === "send" ? t("history.initial_send") : t("history.followup")} — {log.num_documents} {t("history.document_count")} — <span style={{ color: T.main }}>{fmt(log.total_value)}</span>
                </div>
                <div style={{ fontSize: 11, color: T.textMid }}>
                  {new Date(log.sent_at).toLocaleString("fr-CA", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })} — À : {log.recipients.join(", ")} — Envoyé par : {log.sent_by}
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.textMid} strokeWidth="2" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>

            {isOpen && (
              <div style={{ borderTop: `1px solid ${T.border}`, padding: "16px 18px", background: T.cardAlt }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>{t("history.recipients")}</div>
                    <div style={{ fontSize: 13, color: T.text }}>{log.recipients.join(", ")}</div>
                    {log.cc_recipients.length > 0 && (
                      <div style={{ fontSize: 12, color: T.textMid, marginTop: 2 }}>CC : {log.cc_recipients.join(", ")}</div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>{t("history.subject")}</div>
                    <div style={{ fontSize: 13, color: T.text }}>{log.subject}</div>
                  </div>
                </div>

                {log.items && log.items.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>{t("history.docs_included")}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {log.items.map(item => (
                        <div key={item.id} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, color: T.text }}>
                          {item.document_number} — {item.client_name} — {fmt(item.value)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>{t("history.email_body")}</div>
                  <div style={{ background: T.bgCard, borderRadius: 8, border: `1px solid ${T.border}`, padding: "12px 14px", fontSize: 12, color: T.text, whiteSpace: "pre-wrap", lineHeight: 1.7, maxHeight: 240, overflowY: "auto" }}>
                    {log.body}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
