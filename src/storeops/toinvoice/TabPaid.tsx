import React, { useState } from "react";
import { InvoiceDoc, T, fmt, fmtDate } from "./toInvoiceTypes";
import { useLanguage } from "../../i18n/LanguageContext";

interface Props {
  docs: InvoiceDoc[];
  onDocClick: (doc: InvoiceDoc) => void;
  isGodAdmin?: boolean;
  onReopenDoc?: (doc: InvoiceDoc) => void;
}

function SectionHeader({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <div style={{ width: 3, height: 18, borderRadius: 2, background: color }} />
      <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{label}</span>
      <span style={{ background: color + "20", color: color, borderRadius: 20, padding: "1px 9px", fontSize: 11, fontWeight: 700 }}>{count}</span>
    </div>
  );
}

function PaidTable({ docs, onDocClick, isGodAdmin, onReopenDoc }: {
  docs: InvoiceDoc[];
  onDocClick: (d: InvoiceDoc) => void;
  isGodAdmin?: boolean;
  onReopenDoc?: (doc: InvoiceDoc) => void;
}) {
  const { t } = useLanguage();
  const thStyle: React.CSSProperties = {
    textAlign: "left", fontSize: 10, fontWeight: 700, color: T.textMid,
    textTransform: "uppercase", letterSpacing: 0.6, padding: "8px 12px 10px",
    borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap",
  };
  const tdStyle: React.CSSProperties = {
    padding: "11px 12px", borderBottom: `1px solid ${T.border}`, fontSize: 13, verticalAlign: "middle",
  };

  return (
    <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: T.cardAlt }}>
              <th style={thStyle}># Document</th>
              <th style={thStyle}>Client</th>
              <th style={thStyle}># Facture SCI</th>
              <th style={thStyle}>Montant facture</th>
              <th style={thStyle}>Montant paye</th>
              <th style={thStyle}>Date paiement</th>
              <th style={thStyle}>Ferme le</th>
              {isGodAdmin && <th style={thStyle}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {docs.map(d => (
              <tr key={d.id} style={{ opacity: 1 }}>
                <td style={tdStyle}>
                  <button onClick={() => onDocClick(d)} style={{ background: "none", border: "none", cursor: "pointer", color: T.main, fontWeight: 700, fontSize: 13, fontFamily: "inherit", padding: 0, textDecoration: "underline" }}>
                    {d.document_number}
                  </button>
                </td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{d.client_name}</td>
                <td style={{ ...tdStyle, color: T.textMid, fontSize: 12 }}>{d.sci_invoice_number || "—"}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{d.sci_billed_amount > 0 ? fmt(d.sci_billed_amount) : fmt(d.value)}</td>
                <td style={{ ...tdStyle, fontWeight: 700, color: T.green }}>{fmt(d.paid_amount)}</td>
                <td style={{ ...tdStyle, color: T.textMid, fontSize: 12 }}>{fmtDate(d.paid_at)}</td>
                <td style={{ ...tdStyle, color: T.textMid, fontSize: 12 }}>
                  <div>
                    {fmtDate(d.closed_at)}
                    {d.closed_by && <div style={{ fontSize: 10, color: T.textLight }}>par {d.closed_by}</div>}
                  </div>
                </td>
                {isGodAdmin && (
                  <td style={tdStyle}>
                    <button
                      onClick={() => onReopenDoc?.(d)}
                      style={{
                        background: T.orangeBg, color: T.orange, border: `1px solid ${T.orange}33`,
                        borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700,
                        cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                      }}
                    >
                      {t("paid.reopen")}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TabPaid({ docs, onDocClick, isGodAdmin, onReopenDoc }: Props) {
  const { t } = useLanguage();
  const [filterClient, setFilterClient] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  const paidDocs = docs.filter(d => d.payment_status === "Payé");

  const filtered = paidDocs.filter(d => {
    if (filterClient && !d.client_name.toLowerCase().includes(filterClient.toLowerCase())) return false;
    if (filterMonth && d.paid_at && !d.paid_at.startsWith(filterMonth)) return false;
    return true;
  });

  const orderDocs = filtered.filter(d => d.document_type === "order");
  const pickupDocs = filtered.filter(d => d.document_type === "pickup");

  const totalPaid = filtered.reduce((a, d) => a + (d.paid_amount || 0), 0);

  const exportCSV = () => {
    const rows = [
      ["Type", "# Document", "Client", "# Facture SCI", "Montant facture", "Montant paye", "Date paiement", "Ferme le", "Ferme par"],
      ...filtered.map(d => [
        d.document_type === "pickup" ? "Pickup" : "Commande",
        d.document_number, d.client_name,
        d.sci_invoice_number, String(d.sci_billed_amount > 0 ? d.sci_billed_amount : d.value),
        String(d.paid_amount || 0), fmtDate(d.paid_at), fmtDate(d.closed_at), d.closed_by || "",
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `factures-payees-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const inputStyle: React.CSSProperties = {
    padding: "7px 10px", border: `1px solid ${T.border}`, borderRadius: 7,
    fontSize: 12, fontFamily: "inherit", color: T.text, background: T.bgCard, outline: "none",
  };

  if (paidDocs.length === 0) {
    return (
      <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.textMid, marginBottom: 4 }}>{t("paid.no_invoices")}</div>
        <div style={{ fontSize: 13, color: T.textLight }}>{t("paid.will_appear")}</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: "#f0fdf4", borderRadius: 12, border: "1px solid #86efac", padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#166534" }}>{t("paid.closed_section")}</div>
          <div style={{ fontSize: 12, color: "#15803d", marginTop: 2 }}>
            {t("paid.fully_paid_info")} {!isGodAdmin && t("paid.admin_only")}
          </div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: 0.5 }}>{t("paid.total_paid")}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#166534" }}>{fmt(totalPaid)}</div>
          <div style={{ fontSize: 11, color: "#15803d" }}>{filtered.length} {t("paid.invoice_count")}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input value={filterClient} onChange={e => setFilterClient(e.target.value)} placeholder={t("paid.filter_client")} style={inputStyle} />
        <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={inputStyle} />
        <button onClick={exportCSV} style={{ background: T.cardAlt, color: T.text, border: `1px solid ${T.border}`, borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginLeft: "auto" }}>
          {t("paid.export_csv")}
        </button>
      </div>

      {orderDocs.length > 0 && (
        <div>
          <SectionHeader label={t("paid.orders")} count={orderDocs.length} color={T.green} />
          <PaidTable docs={orderDocs} onDocClick={onDocClick} isGodAdmin={isGodAdmin} onReopenDoc={onReopenDoc} />
        </div>
      )}

      {pickupDocs.length > 0 && (
        <div>
          <SectionHeader label={t("paid.pickup_tickets")} count={pickupDocs.length} color={T.blue} />
          <PaidTable docs={pickupDocs} onDocClick={onDocClick} isGodAdmin={isGodAdmin} onReopenDoc={onReopenDoc} />
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: T.textMid }}>{t("paid.no_results")}</div>
        </div>
      )}
    </div>
  );
}
