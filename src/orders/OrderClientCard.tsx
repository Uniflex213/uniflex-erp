import React, { useState } from "react";
import { Client } from "../clients/clientTypes";
import { T } from "../theme";
import { useLanguage } from "../i18n/LanguageContext";

const LockIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const PencilIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

export { LockIcon };

export default function ClientCard({ client, deliveryAddress, onDeliveryAddressChange }: {
  client: Client;
  deliveryAddress: string;
  onDeliveryAddressChange: (addr: string) => void;
}) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [tempAddr, setTempAddr] = useState(deliveryAddress);
  const billingAddr = [client.billing_address, client.billing_city, client.billing_province, client.billing_postal_code].filter(Boolean).join(", ");

  const handleSave = () => {
    onDeliveryAddressChange(tempAddr);
    setEditing(false);
  };

  const handleCancel = () => {
    setTempAddr(deliveryAddress);
    setEditing(false);
  };

  const ReadOnlyField = ({ label, value }: { label: string; value?: string }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <LockIcon />
        <span style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</span>
      </div>
      <div style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>{value || "—"}</div>
    </div>
  );

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 10,
      background: "#f4f5f9", border: `1px solid ${T.border}`, borderRadius: 12,
      padding: "16px 20px", marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      display: "flex", gap: 0, flexWrap: "wrap",
    }}>
      <div style={{ flex: "3 1 360px", paddingRight: 24, borderRight: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: T.main, textTransform: "uppercase", letterSpacing: 1.2 }}>{t("client")}</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: T.text }}>{client.company_name}</span>
          {(client.contact_first_name || client.contact_last_name) && (
            <span style={{ fontSize: 12, color: T.textMid }}>
              · {[client.contact_first_name, client.contact_last_name].filter(Boolean).join(" ")}
              {client.contact_title && <span style={{ color: T.textLight }}>, {client.contact_title}</span>}
            </span>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 16px" }}>
          <ReadOnlyField label={t("email")} value={client.email} />
          <ReadOnlyField label={t("phone")} value={client.phone} />
          <ReadOnlyField label={t("orders.billing_address", "Adresse de facturation")} value={billingAddr || "—"} />
        </div>
        {client.pricelist_pdf_url && (
          <div style={{ marginTop: 10 }}>
            <a href={client.pricelist_pdf_url} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#dbeafe", color: "#2563eb", padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              {t("orders.view_price_list", "Voir la liste de prix")}
            </a>
          </div>
        )}
      </div>

      <div style={{ flex: "2 1 240px", paddingLeft: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.8 }}>{t("orders.delivery_address")}</span>
          {!editing ? (
            <button onClick={() => { setTempAddr(deliveryAddress); setEditing(true); }} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: `1px solid ${T.border}`, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700, color: T.main, cursor: "pointer", fontFamily: "inherit" }}>
              <PencilIcon /> {t("edit")}
            </button>
          ) : (
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={handleSave} style={{ background: T.main, color: "#fff", border: "none", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{t("save")}</button>
              <button onClick={handleCancel} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 6, padding: "3px 8px", fontSize: 11, color: T.textMid, cursor: "pointer", fontFamily: "inherit" }}>{t("cancel")}</button>
            </div>
          )}
        </div>
        {editing ? (
          <textarea
            value={tempAddr}
            onChange={e => setTempAddr(e.target.value)}
            rows={2}
            style={{ border: `1px solid ${T.main}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", outline: "none", background: T.bgCard, width: "100%", boxSizing: "border-box", resize: "vertical" }}
            autoFocus
          />
        ) : (
          <div style={{ fontSize: 13, color: T.text, fontWeight: 500, lineHeight: 1.5, minHeight: 38 }}>
            {deliveryAddress || <span style={{ color: T.textLight, fontStyle: "italic" }}>{t("orders.no_address", "Aucune adresse")}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
