import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import { InvoiceDoc, PaymentStatus, T, fmt, fmtDate, PICKUP_STATUS_CONFIG, PAYMENT_COLORS, PAYMENT_LABEL } from "./toInvoiceTypes";

interface Props {
  docs: InvoiceDoc[];
  onRefresh: () => void;
  onDocClick: (doc: InvoiceDoc) => void;
  onRecordPayment: (doc: InvoiceDoc) => void;
}

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  en_production: { label: "En production", color: "#1d4ed8", bg: "#dbeafe" },
  produced:      { label: "Produite / a facturer", color: "#0f766e", bg: "#ccfbf1" },
  shipped:       { label: "En route", color: "#0e7490", bg: "#cffafe" },
  completed:     { label: "Completee", color: "#15803d", bg: "#dcfce7" },
};

function OrderStatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const cfg = ORDER_STATUS_CONFIG[status];
  if (!cfg) return <span style={{ fontSize: 12, color: T.textMid }}>{status}</span>;
  return <span style={{ background: cfg.bg, color: cfg.color, padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>{cfg.label}</span>;
}

function PickupStatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const cfg = PICKUP_STATUS_CONFIG[status];
  if (!cfg) return <span style={{ fontSize: 12, color: T.textMid }}>{status}</span>;
  return <span style={{ background: cfg.bg, color: cfg.color, padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>{cfg.label}</span>;
}

function EcartBadge({ doc }: { doc: InvoiceDoc }) {
  const ecart = doc.sci_billed_amount > 0 ? doc.sci_billed_amount - doc.value : 0;
  if (Math.abs(ecart) < 0.01) return <span style={{ color: T.green, fontSize: 13, fontWeight: 700 }}>0</span>;
  return <span style={{ background: T.orangeBg, color: T.orange, padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700 }}>{ecart > 0 ? "+" : ""}{fmt(ecart)}</span>;
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const s = PAYMENT_COLORS[status];
  return <span style={{ background: s.bg, color: s.color, padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700 }}>{PAYMENT_LABEL[status]}</span>;
}

function PaymentProgressBar({ doc }: { doc: InvoiceDoc }) {
  const total = doc.sci_billed_amount > 0 ? doc.sci_billed_amount : doc.value;
  const paid = doc.paid_amount || 0;
  const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0;

  if (paid === 0) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
      <div style={{ flex: 1, background: "rgba(0,0,0,0.04)", borderRadius: 4, height: 4, minWidth: 50 }}>
        <div style={{ height: "100%", borderRadius: 4, background: pct >= 100 ? T.green : T.blue, width: `${pct}%`, transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: pct >= 100 ? T.green : T.blue, whiteSpace: "nowrap" }}>{fmt(paid)}</span>
    </div>
  );
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

function BilledTable({
  docs, showOrderStatus, showPickupStatus, onDocClick, onUpdateStatus, onRecordPayment,
}: {
  docs: InvoiceDoc[];
  showOrderStatus: boolean;
  showPickupStatus?: boolean;
  onDocClick: (d: InvoiceDoc) => void;
  onUpdateStatus: (doc: InvoiceDoc, status: PaymentStatus) => void;
  onRecordPayment: (doc: InvoiceDoc) => void;
}) {
  const thStyle: React.CSSProperties = {
    textAlign: "left", fontSize: 10, fontWeight: 700, color: T.textMid,
    textTransform: "uppercase", letterSpacing: 0.6, padding: "8px 10px 10px",
    borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap",
  };
  const tdStyle: React.CSSProperties = {
    padding: "11px 10px", borderBottom: `1px solid ${T.border}`, fontSize: 13, verticalAlign: "middle",
  };

  return (
    <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: T.cardAlt }}>
              <th style={thStyle}># Document</th>
              <th style={thStyle}>Client</th>
              {showOrderStatus && <th style={thStyle}>Statut</th>}
              {showPickupStatus && <th style={thStyle}>Statut</th>}
              <th style={thStyle}>Valeur doc.</th>
              <th style={thStyle}># Facture SCI</th>
              <th style={thStyle}>Montant facture</th>
              <th style={thStyle}>Ecart</th>
              <th style={thStyle}>Paiement</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {docs.map(d => (
              <tr key={d.id}>
                <td style={tdStyle}>
                  <button onClick={() => onDocClick(d)} style={{ background: "none", border: "none", cursor: "pointer", color: T.main, fontWeight: 700, fontSize: 13, fontFamily: "inherit", padding: 0, textDecoration: "underline" }}>
                    {d.document_number}
                  </button>
                </td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{d.client_name}</td>
                {showOrderStatus && <td style={tdStyle}><OrderStatusBadge status={d.order_status} /></td>}
                {showPickupStatus && <td style={tdStyle}><PickupStatusBadge status={d.pickup_status} /></td>}
                <td style={{ ...tdStyle, fontWeight: 700 }}>{fmt(d.value)}</td>
                <td style={{ ...tdStyle, color: T.textMid, fontSize: 12 }}>{d.sci_invoice_number || "—"}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{d.sci_billed_amount > 0 ? fmt(d.sci_billed_amount) : "—"}</td>
                <td style={tdStyle}><EcartBadge doc={d} /></td>
                <td style={tdStyle}>
                  <div>
                    <PaymentBadge status={d.payment_status} />
                    <PaymentProgressBar doc={d} />
                  </div>
                </td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => onRecordPayment(d)}
                      style={{
                        background: T.greenBg, color: T.green, border: `1px solid ${T.green}33`,
                        borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700,
                        cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                      }}
                    >
                      $ Paiement
                    </button>
                    {d.payment_status !== "En litige" && (
                      <button
                        onClick={() => onUpdateStatus(d, "En litige")}
                        style={{
                          background: T.redBg, color: T.red, border: `1px solid ${T.red}33`,
                          borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 600,
                          cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                        }}
                      >
                        Litige
                      </button>
                    )}
                    {d.payment_status === "En litige" && (
                      <button
                        onClick={() => onUpdateStatus(d, "En attente")}
                        style={{
                          background: T.orangeBg, color: T.orange, border: `1px solid ${T.orange}33`,
                          borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 600,
                          cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                        }}
                      >
                        Retirer litige
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TabBilled({ docs, onRefresh, onDocClick, onRecordPayment }: Props) {
  const [filterClient, setFilterClient] = useState("");
  const [filterPayment, setFilterPayment] = useState<"" | PaymentStatus>("");

  const activeDocs = docs.filter(d => d.payment_status !== "Payé");

  const filtered = activeDocs.filter(d => {
    if (filterClient && !d.client_name.toLowerCase().includes(filterClient.toLowerCase())) return false;
    if (filterPayment && d.payment_status !== filterPayment) return false;
    return true;
  });

  const orderDocs = filtered.filter(d => d.document_type === "order");
  const pickupDocs = filtered.filter(d => d.document_type === "pickup");

  const updatePaymentStatus = async (doc: InvoiceDoc, status: PaymentStatus) => {
    const table = doc.document_type === "pickup" ? "pickup_tickets" : "orders";
    await supabase.from(table).update({ payment_status: status }).eq("id", doc.id);
    onRefresh();
  };

  const exportCSV = () => {
    const rows = [
      ["Type", "# Document", "Client", "Valeur doc", "# Facture SCI", "Montant facture", "Ecart", "Statut paiement", "Montant paye"],
      ...filtered.map(d => [
        d.document_type === "pickup" ? "Pickup" : "Commande",
        d.document_number, d.client_name, String(d.value),
        d.sci_invoice_number, String(d.sci_billed_amount),
        String(d.sci_billed_amount > 0 ? d.sci_billed_amount - d.value : 0),
        d.payment_status, String(d.paid_amount || 0),
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `factures-sci-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const FILTER_STATUSES: PaymentStatus[] = ["En attente", "Partiel", "En litige"];

  const inputStyle: React.CSSProperties = {
    padding: "7px 10px", border: `1px solid ${T.border}`, borderRadius: 7,
    fontSize: 12, fontFamily: "inherit", color: T.text, background: T.bgCard, outline: "none",
  };

  if (activeDocs.length === 0) {
    return (
      <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.textMid, marginBottom: 4 }}>Aucune facture en attente de paiement</div>
        <div style={{ fontSize: 13, color: T.textLight }}>Les factures payees se trouvent dans l'onglet "Paye & Ferme".</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input value={filterClient} onChange={e => setFilterClient(e.target.value)} placeholder="Filtrer par client..." style={inputStyle} />
        <select value={filterPayment} onChange={e => setFilterPayment(e.target.value as "" | PaymentStatus)} style={inputStyle}>
          <option value="">Tous les statuts paiement</option>
          {FILTER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={exportCSV} style={{ background: T.cardAlt, color: T.text, border: `1px solid ${T.border}`, borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginLeft: "auto" }}>
          Export CSV
        </button>
      </div>

      {orderDocs.length > 0 && (
        <div>
          <SectionHeader label="Commandes" count={orderDocs.length} color={T.green} />
          <BilledTable docs={orderDocs} showOrderStatus={true} onDocClick={onDocClick} onUpdateStatus={updatePaymentStatus} onRecordPayment={onRecordPayment} />
        </div>
      )}

      {pickupDocs.length > 0 && (
        <div>
          <SectionHeader label="Pickup Tickets" count={pickupDocs.length} color={T.blue} />
          <BilledTable docs={pickupDocs} showOrderStatus={false} showPickupStatus={true} onDocClick={onDocClick} onUpdateStatus={updatePaymentStatus} onRecordPayment={onRecordPayment} />
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: T.textMid }}>Aucun resultat pour ce filtre.</div>
        </div>
      )}
    </div>
  );
}
