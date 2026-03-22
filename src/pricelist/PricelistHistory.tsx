import React from "react";
import { Pricelist } from "./pricelistTypes";
import { T } from "../theme";

const pulseStyle = `
@keyframes pricelistBtnPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.4), 0 4px 16px rgba(99,102,241,0.3); }
  50% { box-shadow: 0 0 0 8px rgba(99,102,241,0), 0 4px 24px rgba(99,102,241,0.5); }
}
`;

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("fr-CA", { year: "numeric", month: "short", day: "numeric" });

function isExpired(validUntil: string) {
  return new Date(validUntil) < new Date();
}

const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6M14 11v6"/>
  </svg>
);

const PdfIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

interface Props {
  pricelists: Pricelist[];
  onCreateNew: () => void;
  onDuplicate: (pl: Pricelist) => void;
  onDelete: (id: string) => void;
  onGeneratePDF: (pl: Pricelist) => void;
}

export default function PricelistHistory({ pricelists, onCreateNew, onDuplicate, onDelete, onGeneratePDF }: Props) {
  return (
    <div>
      <style>{pulseStyle}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800 }}>Générateur de Pricelist</h2>
          <p style={{ margin: 0, color: T.textMid, fontSize: 14 }}>{pricelists.length} pricelist(s) générée(s)</p>
        </div>
        <button
          onClick={onCreateNew}
          style={{
            background: T.main, color: "#fff", border: "none", borderRadius: 10,
            padding: "11px 22px", fontSize: 13, fontWeight: 800, cursor: "pointer",
            fontFamily: "inherit", letterSpacing: 0.3,
            animation: "pricelistBtnPulse 2.5s ease-in-out infinite",
          }}
        >
          + CRÉER UNE PRICELIST
        </button>
      </div>

      <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, background: "#f8f9fb" }}>
          <span style={{ fontWeight: 800, fontSize: 13 }}>Historique des pricelists</span>
        </div>

        {pricelists.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: T.textLight }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Aucune pricelist générée</div>
            <div style={{ fontSize: 13 }}>Cliquez sur "CRÉER UNE PRICELIST" pour commencer.</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8f9fb" }}>
                {["Date de création", "Client", "Type", "Produits", "Validité", "Actions"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3, color: T.textLight, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pricelists.map((pl, i) => {
                const expired = isExpired(pl.validUntil);
                return (
                  <tr
                    key={pl.id}
                    style={{ borderBottom: i < pricelists.length - 1 ? `1px solid ${T.border}` : "none" }}
                  >
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 700, color: T.main, fontFamily: "monospace", fontSize: 12 }}>PL-{pl.createdAt ? new Date(pl.createdAt).getFullYear() : "----"}-{String(i + 1).padStart(3, "0")}</div>
                      <div style={{ fontSize: 11, color: T.textLight, marginTop: 2 }}>{fmtDate(pl.createdAt)}</div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 600 }}>{pl.companyName}</div>
                      <div style={{ fontSize: 11, color: T.textLight, marginTop: 2 }}>{pl.contactName}</div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
                        background: pl.clientType === "Large Scale" ? "#dbeafe" : pl.clientType === "Distributeur" ? "#f3e8ff" : "#dcfce7",
                        color: pl.clientType === "Large Scale" ? "#1d4ed8" : pl.clientType === "Distributeur" ? "#7e22ce" : "#15803d",
                      }}>
                        {pl.clientType}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", color: T.textMid }}>{pl.lines.length} produit(s)</td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 4,
                        background: expired ? T.redBg : "#dcfce7",
                        color: expired ? T.red : "#15803d",
                      }}>
                        {expired ? "Expirée" : `Valide jusqu'au ${fmtDate(pl.validUntil)}`}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => onGeneratePDF(pl)}
                          title="Voir / Télécharger PDF"
                          style={{ background: "#eff6ff", color: "#1d4ed8", border: "none", borderRadius: 7, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}
                        >
                          <PdfIcon /> PDF
                        </button>
                        <button
                          onClick={() => onDuplicate(pl)}
                          title="Dupliquer"
                          style={{ background: "#f0fdf4", color: "#15803d", border: "none", borderRadius: 7, padding: "6px 9px", cursor: "pointer", display: "flex", alignItems: "center" }}
                        >
                          <CopyIcon />
                        </button>
                        <button
                          onClick={() => onDelete(pl.id)}
                          title="Supprimer"
                          style={{ background: T.redBg, color: T.red, border: "none", borderRadius: 7, padding: "6px 9px", cursor: "pointer", display: "flex", alignItems: "center" }}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
