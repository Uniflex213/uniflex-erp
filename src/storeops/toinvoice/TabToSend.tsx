import React, { useState } from "react";
import { InvoiceDoc, T, fmt, fmtDate, daysSince, PICKUP_STATUS_CONFIG } from "./toInvoiceTypes";
import { supabase } from "../../supabaseClient";
import EmailToolModal from "./EmailToolModal";
import { useLanguage } from "../../i18n/LanguageContext";

interface Props {
  docs: InvoiceDoc[];
  onRefresh: () => void;
  onDocClick: (doc: InvoiceDoc) => void;
}

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  en_production: { label: "En production", color: "#1d4ed8", bg: "#dbeafe" },
  produced:      { label: "Produite / à facturer", color: "#0f766e", bg: "#ccfbf1" },
  shipped:       { label: "En route", color: "#0e7490", bg: "#cffafe" },
  completed:     { label: "Complétée", color: "#15803d", bg: "#dcfce7" },
};

function OrderStatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const cfg = ORDER_STATUS_CONFIG[status];
  if (!cfg) return <span style={{ fontSize: 12, color: T.textMid }}>{status}</span>;
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
      {cfg.label}
    </span>
  );
}

function PickupStatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const cfg = PICKUP_STATUS_CONFIG[status];
  if (!cfg) return <span style={{ fontSize: 12, color: T.textMid }}>{status}</span>;
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
      {cfg.label}
    </span>
  );
}

function AgeBadge({ days }: { days: number }) {
  if (days <= 2) return <span style={{ fontSize: 12, color: T.textMid }}>{days}j</span>;
  const c = days >= 7 ? { color: T.red, bg: T.redBg } : { color: T.orange, bg: T.orangeBg };
  return (
    <span style={{ background: c.bg, color: c.color, padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700 }}>
      {days}j
    </span>
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

function DocsTable({
  docs,
  selected,
  onToggleOne,
  onToggleAll,
  showOrderStatus,
  showPickupStatus,
  onDocClick,
  onSendOne,
  onMarkBilled,
}: {
  docs: InvoiceDoc[];
  selected: Set<string>;
  onToggleOne: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
  showOrderStatus: boolean;
  showPickupStatus?: boolean;
  onDocClick: (d: InvoiceDoc) => void;
  onSendOne: (d: InvoiceDoc) => void;
  onMarkBilled: (d: InvoiceDoc) => void;
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
  const allChecked = docs.length > 0 && docs.every(d => selected.has(d.id));

  return (
    <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: T.cardAlt }}>
              <th style={{ ...thStyle, width: 36 }}>
                <input type="checkbox" checked={allChecked} onChange={() => onToggleAll(docs.map(d => d.id))} style={{ cursor: "pointer" }} />
              </th>
              <th style={thStyle}># Document</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Client</th>
              {showOrderStatus && <th style={thStyle}>Statut commande</th>}
              {showPickupStatus && <th style={thStyle}>Statut pickup</th>}
              <th style={thStyle}>Valeur</th>
              <th style={thStyle}>En attente</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {docs.map(d => {
              const age = daysSince(d.issued_at);
              return (
                <tr key={d.id} style={{ background: selected.has(d.id) ? `${T.main}06` : undefined }}>
                  <td style={{ ...tdStyle, width: 36 }}>
                    <input type="checkbox" checked={selected.has(d.id)} onChange={() => onToggleOne(d.id)} style={{ cursor: "pointer" }} />
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => onDocClick(d)} style={{ background: "none", border: "none", cursor: "pointer", color: T.main, fontWeight: 700, fontSize: 13, fontFamily: "inherit", padding: 0, textDecoration: "underline" }}>
                      {d.document_number}
                    </button>
                  </td>
                  <td style={{ ...tdStyle, color: T.textMid, fontSize: 12 }}>{fmtDate(d.issued_at)}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{d.client_name}</td>
                  {showOrderStatus && <td style={tdStyle}><OrderStatusBadge status={d.order_status} /></td>}
                  {showPickupStatus && <td style={tdStyle}><PickupStatusBadge status={d.pickup_status} /></td>}
                  <td style={{ ...tdStyle, fontWeight: 700, color: T.text }}>{fmt(d.value)}</td>
                  <td style={tdStyle}><AgeBadge days={age} /></td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => onSendOne(d)}
                        style={{ background: T.main, color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                      >
                        {t("tosend.send_sci")}
                      </button>
                      <button
                        onClick={() => onMarkBilled(d)}
                        style={{ background: T.greenBg, color: T.green, border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                      >
                        {t("tosend.mark_billed")}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TabToSend({ docs, onRefresh, onDocClick }: Props) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [emailDocs, setEmailDocs] = useState<InvoiceDoc[] | null>(null);

  const orderDocs = docs.filter(d => d.document_type === "order");
  const pickupDocs = docs.filter(d => d.document_type === "pickup");

  const over7 = docs.filter(d => daysSince(d.issued_at) > 7);
  const over3 = docs.filter(d => daysSince(d.issued_at) > 3);

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const toggleSection = (ids: string[]) => {
    const allSelected = ids.every(id => selected.has(id));
    setSelected(prev => {
      const s = new Set(prev);
      if (allSelected) ids.forEach(id => s.delete(id));
      else ids.forEach(id => s.add(id));
      return s;
    });
  };

  const selectedDocs = docs.filter(d => selected.has(d.id));

  const markDirectlyBilled = async (doc: InvoiceDoc) => {
    if (!confirm(`Marquer "${doc.document_number}" comme facturé sans passer par l'email ?`)) return;
    const table = doc.document_type === "pickup" ? "pickup_tickets" : "orders";
    await supabase.from(table).update({ billing_status: "billed_by_sci", sci_billed_at: new Date().toISOString() }).eq("id", doc.id);
    onRefresh();
  };

  if (docs.length === 0) {
    return (
      <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 40, textAlign: "center" }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="1.5" style={{ marginBottom: 12 }}><polyline points="20 6 9 17 4 12"/></svg>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.green, marginBottom: 4 }}>{t("tosend.all_up_to_date")}</div>
        <div style={{ fontSize: 13, color: T.textMid }}>{t("tosend.no_pending")}</div>
      </div>
    );
  }

  return (
    <>
      {over7.length > 0 && (
        <div style={{ background: T.redBg, border: `1px solid ${T.red}40`, borderRadius: 10, padding: "10px 16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.red }}>{t("tosend.urgent_7d").replace("{count}", String(over7.length))}</span>
        </div>
      )}
      {over3.length > 0 && over7.length === 0 && (
        <div style={{ background: T.orangeBg, border: `1px solid ${T.orange}40`, borderRadius: 10, padding: "10px 16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.orange} strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.orange }}>{t("tosend.warning_3d").replace("{count}", String(over3.length))}</span>
        </div>
      )}

      {selectedDocs.length > 0 && (
        <div style={{ background: T.mainBg, border: `1px solid ${T.main}30`, borderRadius: 10, padding: "10px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.main }}>
            {selectedDocs.length} {t("tosend.selected_docs")} — {fmt(selectedDocs.reduce((a, d) => a + d.value, 0))}
          </span>
          <button
            onClick={() => setEmailDocs(selectedDocs)}
            style={{ background: T.main, color: "#fff", border: "none", borderRadius: 7, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginLeft: "auto" }}
          >
            {t("tosend.send_selection")}
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {orderDocs.length > 0 && (
          <div>
            <SectionHeader label={t("tosend.orders")} count={orderDocs.length} color={T.green} />
            <DocsTable
              docs={orderDocs}
              selected={selected}
              onToggleOne={toggleOne}
              onToggleAll={toggleSection}
              showOrderStatus={true}
              onDocClick={onDocClick}
              onSendOne={d => setEmailDocs([d])}
              onMarkBilled={markDirectlyBilled}
            />
          </div>
        )}

        {pickupDocs.length > 0 && (
          <div>
            <SectionHeader label={t("tosend.pickup_tickets")} count={pickupDocs.length} color={T.blue} />
            <DocsTable
              docs={pickupDocs}
              selected={selected}
              onToggleOne={toggleOne}
              onToggleAll={toggleSection}
              showOrderStatus={false}
              showPickupStatus={true}
              onDocClick={onDocClick}
              onSendOne={d => setEmailDocs([d])}
              onMarkBilled={markDirectlyBilled}
            />
          </div>
        )}
      </div>

      {emailDocs && (
        <EmailToolModal
          docs={emailDocs}
          logType="send"
          onClose={() => setEmailDocs(null)}
          onSent={() => { setSelected(new Set()); setEmailDocs(null); onRefresh(); }}
        />
      )}
    </>
  );
}
