import React, { useState } from "react";
import { SaleProduct } from "../sales/productTypes";
import { T } from "../theme";
import { DownloadIcon, EditIcon, ImageIcon } from "./productIcons";
import { PARTIE_LABELS } from "./productFormTypes";
import ProductCarousel from "./ProductCarousel";

export default function ProductCard({ product, onEdit, canEdit }: { product: SaleProduct; onEdit: (p: SaleProduct) => void; canEdit?: boolean }) {
  const [activeTab, setActiveTab] = useState("description");

  const mainImage = product.images?.find(img => img.image_type === "main");
  const exampleImages = product.images?.filter(img => img.image_type === "example").sort((a, b) => a.sort_order - b.sort_order) ?? [];
  const hasExamples = exampleImages.length > 0;
  const tdsFile = product.files?.find(f => f.file_type === "TDS");

  const getSdsFile = (letter: string) => product.files?.find(f => f.file_type === `SDS-${letter}`);

  const tabs = [
    { key: "description", label: "Description" },
    { key: "formats", label: "Formats" },
    { key: "composants", label: "Composants" },
  ];

  const renderTabContent = () => {
    if (activeTab === "description") {
      return (
        <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.55, color: T.textMid, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical" } as React.CSSProperties}>
          {product.description || <span style={{ color: T.silverDark, fontStyle: "italic" }}>Aucune description.</span>}
        </p>
      );
    }
    if (activeTab === "formats") {
      const allFormats = [...product.formats, ...(product.formats_other ? [product.formats_other] : [])];
      return (
        <div>
          {allFormats.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: product.units_per_pallet ? 6 : 0 }}>
              {allFormats.map(f => (
                <span key={f} style={{ background: "rgba(99,102,241,0.08)", color: T.main, border: `1px solid rgba(99,102,241,0.2)`, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{f}</span>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: 11, color: T.silverDark, fontStyle: "italic" }}>Aucun format défini.</span>
          )}
          {product.units_per_pallet != null && (
            <div style={{ fontSize: 11, color: T.textMid, marginTop: allFormats.length > 0 ? 4 : 0 }}>
              <span style={{ fontWeight: 600, color: T.text }}>Palette complète :</span> {product.units_per_pallet} unités
            </div>
          )}
        </div>
      );
    }
    if (activeTab === "composants") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {PARTIE_LABELS.slice(0, product.components_count).map((letter) => {
            const sdsFile = getSdsFile(letter);
            return (
              <div key={letter} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ background: "rgba(99,102,241,0.08)", border: `1px solid rgba(99,102,241,0.2)`, borderRadius: 6, padding: "3px 12px", fontSize: 11, fontWeight: 700, color: T.main, flexShrink: 0 }}>
                  Partie {letter}
                </div>
                {sdsFile ? (
                  <a href={sdsFile.file_url} download={sdsFile.file_name} style={{ textDecoration: "none" }}>
                    <button style={{
                      display: "flex", alignItems: "center", gap: 4, padding: "3px 8px",
                      background: "rgba(101,119,168,0.1)", border: "1px solid rgba(101,119,168,0.3)",
                      borderRadius: 5, cursor: "pointer", fontSize: 10, fontWeight: 700, color: "#516094",
                      fontFamily: "inherit",
                    }}>
                      <DownloadIcon /> SDS-{letter}
                    </button>
                  </a>
                ) : (
                  <span style={{ fontSize: 10, color: T.textLight, fontStyle: "italic" }}>Pas de SDS</span>
                )}
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 10,
      height: 190,
      width: "100%",
      boxSizing: "border-box",
      display: "flex",
      overflow: "hidden",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      position: "relative",
    }}>
      <div style={{ width: 150, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: `1px solid ${T.border}`, overflow: "hidden" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: T.cardAlt, overflow: "hidden" }}>
          {mainImage ? (
            <img src={mainImage.image_url} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: T.silverDark }}>
              <ImageIcon />
              <span style={{ fontSize: 10 }}>Photo</span>
            </div>
          )}
        </div>
        <div style={{ padding: "6px 8px", borderTop: `1px solid ${T.border}`, background: T.card }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.text, letterSpacing: -0.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {product.name}
          </div>
          <div style={{ marginTop: 3 }}>
            <span style={{
              fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
              background: product.is_active ? T.greenBg : "#f3f4f6",
              color: product.is_active ? T.green : T.textMid,
            }}>
              {product.is_active ? "Actif" : "Inactif"}
            </span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, overflowX: "auto", flexShrink: 0, scrollbarWidth: "none" }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "7px 14px", border: "none", background: "transparent", cursor: "pointer",
                fontSize: 11, fontWeight: activeTab === tab.key ? 700 : 500,
                color: activeTab === tab.key ? T.main : T.textMid,
                borderBottom: activeTab === tab.key ? `2px solid ${T.main}` : "2px solid transparent",
                whiteSpace: "nowrap", fontFamily: "inherit", flexShrink: 0,
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, padding: "8px 12px", overflow: "hidden" }}>
          {renderTabContent()}
        </div>

        <div style={{ padding: "5px 10px 6px", borderTop: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 5 }}>
            {tdsFile && (
              <a href={tdsFile.file_url} download={tdsFile.file_name} style={{ textDecoration: "none" }}>
                <button style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "3px 8px",
                  background: "rgba(99,102,241,0.08)", border: `1px solid rgba(99,102,241,0.2)`,
                  borderRadius: 5, cursor: "pointer", fontSize: 10, fontWeight: 700, color: T.main,
                  fontFamily: "inherit",
                }}>
                  <DownloadIcon /> TDS
                </button>
              </a>
            )}
          </div>
          {canEdit !== false && (
            <button
              onClick={() => onEdit(product)}
              style={{
                display: "flex", alignItems: "center", gap: 4, padding: "3px 9px",
                background: T.cardAlt, border: `1px solid ${T.silverLight}`,
                borderRadius: 5, cursor: "pointer", fontSize: 10, fontWeight: 600, color: T.textMid,
                fontFamily: "inherit",
              }}
            >
              <EditIcon /> Modifier
            </button>
          )}
        </div>
      </div>

      {hasExamples && (
        <div style={{ width: 300, flexShrink: 0, borderLeft: `1px solid ${T.border}`, overflow: "hidden" }}>
          <ProductCarousel images={exampleImages} />
        </div>
      )}
    </div>
  );
}
