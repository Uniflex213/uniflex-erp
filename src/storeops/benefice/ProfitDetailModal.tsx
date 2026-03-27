import React from "react";
import { BilledDoc, T, fmt, fmtDate, fmtPct, EXPENSE_TYPES } from "./beneficeTypes";
import { useLanguage } from "../../i18n/LanguageContext";

interface Props {
  doc: BilledDoc;
  onClose: () => void;
}

export default function ProfitDetailModal({ doc, onClose }: Props) {
  const { t } = useLanguage();
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: T.textMid, textTransform: "uppercase",
    letterSpacing: 0.8, marginBottom: 4,
  };

  const isPickup = doc.document_type === "pickup";
  const profitColor = doc.profit >= 0 ? T.green : T.red;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(230,228,224,0.35)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", zIndex: 9000, display: "flex", justifyContent: "center", overflowY: "auto", padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{ background: T.card, borderRadius: 16, width: "100%", maxWidth: 640, margin: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
              <span style={{ background: isPickup ? T.blueBg : T.greenBg, color: isPickup ? T.blue : T.green, padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700 }}>
                {isPickup ? t("benefice.pickup") : t("benefice.order")}
              </span>
              <span style={{ background: profitColor === T.green ? T.greenBg : T.redBg, color: profitColor, padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700 }}>
                {doc.profit >= 0 ? t("benefice.profitable") : t("benefice.loss")}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text }}>{doc.document_number}</h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: T.textMid }}>{doc.client_name} -- {fmtDate(doc.billed_at)}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: T.textMid, lineHeight: 1 }}>x</button>
        </div>

        <div style={{ padding: "16px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div>
              <div style={labelStyle}>{t("benefice.sale")}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>{fmt(doc.selling_price)}</div>
            </div>
            <div>
              <div style={labelStyle}>{t("benefice.cost")}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.red }}>{fmt(doc.cost_total)}</div>
            </div>
            <div>
              <div style={labelStyle}>{t("benefice.expenses")}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.orange }}>{fmt(doc.expenses_total)}</div>
            </div>
            <div>
              <div style={labelStyle}>{t("benefice.profit")}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: profitColor }}>{fmt(doc.profit)}</div>
              <div style={{ fontSize: 11, color: profitColor, fontWeight: 600 }}>{fmtPct(doc.margin_pct)} {t("benefice.margin")}</div>
            </div>
          </div>

          {doc.items.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={labelStyle}>{t("benefice.articles")}</div>
              <div style={{ background: T.cardAlt, borderRadius: 10, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {[t("benefice.product"), t("benefice.qty"), t("benefice.unit_price"), t("benefice.cost_unit"), t("benefice.subtotal"), t("benefice.profit")].map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.textMid, textTransform: "uppercase", borderBottom: `1px solid ${T.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {doc.items.map((item, i) => (
                      <tr key={i}>
                        <td style={{ padding: "8px 10px", fontSize: 12, fontWeight: 600, color: T.text, borderBottom: `1px solid ${T.border}` }}>{item.product_name}</td>
                        <td style={{ padding: "8px 10px", fontSize: 12, color: T.text, borderBottom: `1px solid ${T.border}` }}>{item.quantity}</td>
                        <td style={{ padding: "8px 10px", fontSize: 12, color: T.text, borderBottom: `1px solid ${T.border}` }}>{fmt(item.unit_price)}</td>
                        <td style={{ padding: "8px 10px", fontSize: 12, color: T.red, borderBottom: `1px solid ${T.border}` }}>{fmt(item.cost_price)}</td>
                        <td style={{ padding: "8px 10px", fontSize: 12, fontWeight: 600, color: T.text, borderBottom: `1px solid ${T.border}` }}>{fmt(item.subtotal)}</td>
                        <td style={{ padding: "8px 10px", fontSize: 12, fontWeight: 700, color: item.profit >= 0 ? T.green : T.red, borderBottom: `1px solid ${T.border}` }}>{fmt(item.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {doc.expenses.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={labelStyle}>{t("benefice.deducted_expenses")}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {doc.expenses.map(exp => {
                  const cfg = EXPENSE_TYPES[exp.expense_type] || EXPENSE_TYPES.other;
                  return (
                    <div key={exp.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: T.cardAlt, borderRadius: 8, padding: "8px 12px", border: `1px solid ${T.border}` }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ background: cfg.bg, color: cfg.color, padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>{cfg.label}</span>
                        <span style={{ fontSize: 12, color: T.text }}>{exp.description || "—"}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.red }}>-{fmt(exp.amount)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {doc.sci_invoice_number && (
              <div>
                <div style={labelStyle}>{t("benefice.sci_invoice")}</div>
                <div style={{ fontSize: 13, color: T.text }}>{doc.sci_invoice_number}</div>
              </div>
            )}
            {doc.sci_billed_amount > 0 && (
              <div>
                <div style={labelStyle}>{t("benefice.sci_amount")}</div>
                <div style={{ fontSize: 13, color: T.text }}>{fmt(doc.sci_billed_amount)}</div>
              </div>
            )}
            <div>
              <div style={labelStyle}>{t("benefice.payment_status")}</div>
              <div style={{ fontSize: 13, color: T.text }}>{doc.payment_status}</div>
            </div>
            <div>
              <div style={labelStyle}>{t("benefice.paid_amount")}</div>
              <div style={{ fontSize: 13, color: T.text }}>{fmt(doc.paid_amount)}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: "14px 24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: T.cardAlt, color: T.text, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {t("benefice.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
