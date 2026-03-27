import React, { useState } from "react";
import { InvoiceDoc, T, fmt, fmtDate, daysSince, PICKUP_STATUS_CONFIG } from "./toInvoiceTypes";
import EmailToolModal from "./EmailToolModal";
import ConfirmBilledModal from "./ConfirmBilledModal";
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

function WaitBadge({ days }: { days: number }) {
  if (days <= 6) return <span style={{ fontSize: 12, color: T.textMid }}>{days}j</span>;
  if (days <= 13) return <span style={{ background: T.orangeBg, color: T.orange, padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700 }}>En attente {days}j</span>;
  return <span style={{ background: T.redBg, color: T.red, padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700 }}>En retard {days}j</span>;
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

function SentTable({
  docs,
  showOrderStatus,
  showPickupStatus,
  onDocClick,
  onFollowup,
  onConfirm,
}: {
  docs: InvoiceDoc[];
  showOrderStatus: boolean;
  showPickupStatus?: boolean;
  onDocClick: (d: InvoiceDoc) => void;
  onFollowup: (d: InvoiceDoc) => void;
  onConfirm: (d: InvoiceDoc) => void;
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
              <th style={thStyle}>Date doc.</th>
              <th style={thStyle}>Client</th>
              {showOrderStatus && <th style={thStyle}>Statut commande</th>}
              {showPickupStatus && <th style={thStyle}>Statut pickup</th>}
              <th style={thStyle}>Valeur</th>
              <th style={thStyle}>Envoyé le</th>
              <th style={thStyle}>Délai</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {docs.map(d => {
              const daysWaiting = daysSince(d.sent_to_sci_at);
              return (
                <tr key={d.id}>
                  <td style={tdStyle}>
                    <button onClick={() => onDocClick(d)} style={{ background: "none", border: "none", cursor: "pointer", color: T.main, fontWeight: 700, fontSize: 13, fontFamily: "inherit", padding: 0, textDecoration: "underline" }}>
                      {d.document_number}
                    </button>
                  </td>
                  <td style={{ ...tdStyle, color: T.textMid, fontSize: 12 }}>{fmtDate(d.issued_at)}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{d.client_name}</td>
                  {showOrderStatus && <td style={tdStyle}><OrderStatusBadge status={d.order_status} /></td>}
                  {showPickupStatus && <td style={tdStyle}><PickupStatusBadge status={d.pickup_status} /></td>}
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{fmt(d.value)}</td>
                  <td style={{ ...tdStyle, color: T.textMid, fontSize: 12 }}>{fmtDate(d.sent_to_sci_at)}</td>
                  <td style={tdStyle}><WaitBadge days={daysWaiting} /></td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => onFollowup(d)}
                        style={{ background: T.cardAlt, color: T.text, border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                      >
                        {t("sent.followup_sci")}
                      </button>
                      <button
                        onClick={() => onConfirm(d)}
                        style={{ background: T.greenBg, color: T.green, border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                      >
                        {t("sent.confirm_billed")}
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

export default function TabSent({ docs, onRefresh, onDocClick }: Props) {
  const { t } = useLanguage();
  const [followupDoc, setFollowupDoc] = useState<InvoiceDoc | null>(null);
  const [confirmDoc, setConfirmDoc] = useState<InvoiceDoc | null>(null);

  const orderDocs = docs.filter(d => d.document_type === "order");
  const pickupDocs = docs.filter(d => d.document_type === "pickup");

  if (docs.length === 0) {
    return (
      <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.textMid, marginBottom: 4 }}>{t("sent.no_docs")}</div>
        <div style={{ fontSize: 13, color: T.textLight }}>{t("sent.all_confirmed")}</div>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {orderDocs.length > 0 && (
          <div>
            <SectionHeader label={t("sent.orders")} count={orderDocs.length} color={T.green} />
            <SentTable docs={orderDocs} showOrderStatus={true} onDocClick={onDocClick} onFollowup={setFollowupDoc} onConfirm={setConfirmDoc} />
          </div>
        )}
        {pickupDocs.length > 0 && (
          <div>
            <SectionHeader label={t("sent.pickup_tickets")} count={pickupDocs.length} color={T.blue} />
            <SentTable docs={pickupDocs} showOrderStatus={false} showPickupStatus={true} onDocClick={onDocClick} onFollowup={setFollowupDoc} onConfirm={setConfirmDoc} />
          </div>
        )}
      </div>

      {followupDoc && (
        <EmailToolModal
          docs={[followupDoc]}
          logType="followup"
          onClose={() => setFollowupDoc(null)}
          onSent={() => { setFollowupDoc(null); }}
        />
      )}
      {confirmDoc && (
        <ConfirmBilledModal
          doc={confirmDoc}
          onClose={() => setConfirmDoc(null)}
          onConfirmed={() => { setConfirmDoc(null); onRefresh(); }}
        />
      )}
    </>
  );
}
