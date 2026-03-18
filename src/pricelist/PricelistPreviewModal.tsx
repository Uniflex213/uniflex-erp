import React from "react";
import { Pricelist, PRICELIST_PRODUCTS } from "./pricelistTypes";
import { T } from "../theme";

const fmt = (n: number, currency = "CAD") =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" });

interface Props {
  pricelist: Pricelist;
  onClose: () => void;
  onGenerate: () => void;
  generating: boolean;
}

export default function PricelistPreviewModal({ pricelist, onClose, onGenerate, generating }: Props) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 24 }}>
      <div style={{ background: T.bgCard, borderRadius: 16, width: "100%", maxWidth: 760, maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.3)" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Prévisualisation du PDF</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.textLight, padding: 4, display: "flex", alignItems: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 24, background: "#f4f5f9" }}>
          <div style={{
            background: T.bgCard, borderRadius: 8, padding: "32px 36px", maxWidth: 640, margin: "0 auto",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)", position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 0 }}>
              <div style={{ transform: "rotate(-35deg)", fontSize: 28, fontWeight: 900, color: "rgba(99,102,241,0.04)", whiteSpace: "nowrap", letterSpacing: 2 }}>
                CONFIDENTIEL — {pricelist.companyName.toUpperCase()}
              </div>
            </div>

            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <div style={{ background: T.main, color: "#fff", fontWeight: 900, fontSize: 16, padding: "6px 14px", borderRadius: 4, letterSpacing: 1, display: "inline-block" }}>UNIFLEX</div>
                  <div style={{ marginTop: 8, fontSize: 10, color: T.textLight, lineHeight: 1.7 }}>
                    <div>Karim Benali — Directeur des ventes</div>
                    <div>karim@uniflex.ca · 514-555-0100 · VND-KA01</div>
                    <div>Uniflex Distribution Inc. · Boisbriand, QC</div>
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: 10, color: T.textLight, lineHeight: 1.7 }}>
                  <div style={{ fontWeight: 700, color: T.text }}>{pricelist.companyName}</div>
                  <div>{pricelist.address}</div>
                  <div>{pricelist.contactName} · {pricelist.clientEmail}</div>
                  <div>{pricelist.clientPhone} · {pricelist.clientType}</div>
                </div>
              </div>

              <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14, marginBottom: 14, textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: T.main, letterSpacing: 2 }}>LISTE DE PRIX</div>
                <div style={{ fontSize: 10, color: T.textMid, marginTop: 3 }}>
                  Créée le {fmtDate(pricelist.createdAt)} · Valide jusqu'au {fmtDate(pricelist.validUntil)} · {pricelist.currency}
                </div>
                <div style={{ fontSize: 9, color: "#adb5bd", marginTop: 4, fontStyle: "italic" }}>
                  This Pricelist is personal to you. Sharing these informations to a third party company not included in this deal could have legal repercussions.
                </div>
              </div>

              <div style={{ borderTop: `1px solid ${T.border}`, marginBottom: 12 }} />

              {pricelist.lines.map((line, i) => {
                const prod = PRICELIST_PRODUCTS.find(p => p.name === line.product);
                return (
                  <div key={line.id} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: i < pricelist.lines.length - 1 ? `1px solid ${T.border}` : "none" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 6, background: "rgba(0,0,0,0.04)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      {prod?.imageUrl ? (
                        <img src={prod.imageUrl} alt={line.product} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 800, color: T.main }}>{line.product.slice(0, 3)}</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 12 }}>{line.product}</div>
                      {prod && <div style={{ fontSize: 10, color: T.textLight, marginTop: 2, lineHeight: 1.4 }}>{prod.description}</div>}
                      <div style={{ fontSize: 10, color: T.textMid, marginTop: 3 }}>Format : {line.format} · Qté min. : {line.minQty}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: 13, color: T.main }}>{fmt(line.price, pricelist.currency)}{line.unit}</div>
                      <div style={{ fontSize: 10, color: T.textMid, marginTop: 3 }}>Total : {fmt(line.minQty * line.price, pricelist.currency)}</div>
                    </div>
                  </div>
                );
              })}


              <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 20, paddingTop: 10, textAlign: "center", fontSize: 9, color: "#adb5bd" }}>
                <div style={{ fontStyle: "italic" }}>This Pricelist is personal to you. Sharing these informations to a third party company not included in this deal could have legal repercussions.</div>
                <div style={{ marginTop: 4 }}>© 2026 Uniflex Distribution Inc. — Boisbriand, QC · Page 1 de 1</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "16px 24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ background: "#f4f5f9", color: T.textMid, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            Fermer
          </button>
          <button
            onClick={onGenerate}
            disabled={generating}
            style={{ background: generating ? "#e5e7eb" : T.main, color: generating ? "#9ca3af" : "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 800, cursor: generating ? "not-allowed" : "pointer", fontFamily: "inherit" }}
          >
            {generating ? "Génération..." : "GÉNÉRER PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
