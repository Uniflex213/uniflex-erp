import React, { useState } from "react";
import { BilledDoc, T, fmt, fmtDate, fmtPct } from "./beneficeTypes";
import { useLanguage } from "../../i18n/LanguageContext";

interface Props {
  docs: BilledDoc[];
  onDocClick: (doc: BilledDoc) => void;
}

export default function ProfitInvoiceLog({ docs, onDocClick }: Props) {
  const [filterClient, setFilterClient] = useState("");
  const [filterType, setFilterType] = useState<"" | "pickup" | "order">("");
  const [sortBy, setSortBy] = useState<"date" | "profit" | "margin">("date");
  const { t } = useLanguage();

  const filtered = docs.filter(d => {
    if (filterClient && !d.client_name.toLowerCase().includes(filterClient.toLowerCase())) return false;
    if (filterType && d.document_type !== filterType) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "profit") return b.profit - a.profit;
    if (sortBy === "margin") return b.margin_pct - a.margin_pct;
    return new Date(b.billed_at).getTime() - new Date(a.billed_at).getTime();
  });

  const inputStyle: React.CSSProperties = {
    padding: "7px 10px", border: `1px solid ${T.border}`, borderRadius: 7,
    fontSize: 12, color: T.text, background: T.bgCard, outline: "none",
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <input value={filterClient} onChange={e => setFilterClient(e.target.value)} placeholder={t("benefice.filter_client")} style={inputStyle} />
        <select value={filterType} onChange={e => setFilterType(e.target.value as typeof filterType)} style={inputStyle}>
          <option value="">{t("benefice.all_types")}</option>
          <option value="pickup">{t("benefice.pickup_tickets")}</option>
          <option value="order">{t("benefice.orders")}</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} style={inputStyle}>
          <option value="date">{t("benefice.sort_date")}</option>
          <option value="profit">{t("benefice.sort_profit")}</option>
          <option value="margin">{t("benefice.sort_margin")}</option>
        </select>
        <span style={{ fontSize: 12, color: T.textMid, marginLeft: "auto" }}>
          {sorted.length} {t("benefice.invoice_count")}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {sorted.map(doc => {
          const profitColor = doc.profit >= 0 ? T.green : T.red;
          const profitBg = doc.profit >= 0 ? "#f0fdf4" : "#fef2f2";
          const isPickup = doc.document_type === "pickup";

          return (
            <div
              key={doc.id + doc.document_type}
              onClick={() => onDocClick(doc)}
              style={{
                background: T.card, borderRadius: 10, border: `1px solid ${T.border}`,
                padding: "12px 16px", cursor: "pointer",
                transition: "border-color 0.15s, box-shadow 0.15s",
                display: "flex", alignItems: "center", gap: 14,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.main; e.currentTarget.style.boxShadow = `0 0 0 2px ${T.mainBg}`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 10, background: profitBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={profitColor} strokeWidth="2.5">
                  {doc.profit >= 0
                    ? <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>
                    : <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></>
                  }
                </svg>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{doc.document_number}</span>
                  <span style={{ background: isPickup ? T.blueBg : T.greenBg, color: isPickup ? T.blue : T.green, padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700 }}>
                    {isPickup ? "PKP" : "CMD"}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: T.textMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {doc.client_name}
                </div>
              </div>

              <div style={{ textAlign: "right", flexShrink: 0, minWidth: 80 }}>
                <div style={{ fontSize: 11, color: T.textMid }}>{fmtDate(doc.billed_at)}</div>
                <div style={{ fontSize: 11, color: T.textLight }}>{t("benefice.sale")} {fmt(doc.selling_price)}</div>
              </div>

              <div style={{ textAlign: "right", flexShrink: 0, minWidth: 100 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: profitColor }}>{fmt(doc.profit)}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: profitColor }}>{fmtPct(doc.margin_pct)} {t("benefice.margin")}</div>
              </div>
            </div>
          );
        })}

        {sorted.length === 0 && (
          <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 13, color: T.textMid }}>{t("benefice.no_invoices")}</div>
          </div>
        )}
      </div>
    </div>
  );
}
