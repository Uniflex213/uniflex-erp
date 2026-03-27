import React, { useState } from "react";
import { SaleProduct } from "../sales/productTypes";
import { T } from "../theme";
import { useLanguage } from "../i18n/LanguageContext";
import { DownloadIcon, EditIcon, ImageIcon } from "./productIcons";
import { PARTIE_LABELS } from "./productFormTypes";
import ProductCarousel from "./ProductCarousel";

export default function ProductCard({ product, onEdit, canEdit }: { product: SaleProduct; onEdit: (p: SaleProduct) => void; canEdit?: boolean }) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("description");

  const mainImage = product.images?.find(img => img.image_type === "main");
  const exampleImages = product.images?.filter(img => img.image_type === "example").sort((a, b) => a.sort_order - b.sort_order) ?? [];
  const hasExamples = exampleImages.length > 0;
  const tdsFile = product.files?.find(f => f.file_type === "TDS");

  const getSdsFile = (letter: string) => product.files?.find(f => f.file_type === `SDS-${letter}`);

  const tabs = [
    { key: "description", label: t("description", "Description") },
    { key: "formats", label: t("products.format", "Formats") },
    { key: "composants", label: t("products.components", "Composants") },
  ];

  const renderTabContent = () => {
    if (activeTab === "description") {
      return (
        <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.55, color: T.textMid, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical" } as React.CSSProperties}>
          {product.description || <span style={{ color: T.silverDark, fontStyle: "italic" }}>{t("products.no_description", "Aucune description.")}</span>}
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
            <span style={{ fontSize: 11, color: T.silverDark, fontStyle: "italic" }}>{t("products.no_formats", "Aucun format défini.")}</span>
          )}
          {product.units_per_pallet != null && (
            <div style={{ fontSize: 11, color: T.textMid, marginTop: allFormats.length > 0 ? 4 : 0 }}>
              <span style={{ fontWeight: 600, color: T.text }}>{t("products.full_pallet", "Palette complète")} :</span> {product.units_per_pallet} {t("products.units", "unités")}
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
                  {t("products.partie", "Partie")} {letter}
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
                  <span style={{ fontSize: 10, color: T.textLight, fontStyle: "italic" }}>{t("products.no_sds", "Pas de SDS")}</span>
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
      width: "100%",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      position: "relative",
    }}>
      {/* Top bar: name + SKU + category badge + status + edit */}
      <div style={{
        padding: "10px 14px", borderBottom: `1px solid ${T.border}`,
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.text, lineHeight: 1.3 }}>
            {product.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
            {product.sku && (
              <span style={{ fontSize: 10, fontWeight: 700, color: T.textLight, fontFamily: "monospace", letterSpacing: 0.5 }}>
                {product.sku}
              </span>
            )}
            {product.category && product.category !== "Other" && (
              <span style={{
                fontSize: 9.5, fontWeight: 700, padding: "1px 8px", borderRadius: 10,
                background: "rgba(99,102,241,0.08)", color: T.main, border: `1px solid rgba(99,102,241,0.15)`,
              }}>
                {product.category}
              </span>
            )}
            <span style={{
              fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
              background: product.is_active ? T.greenBg : "#f3f4f6",
              color: product.is_active ? T.green : T.textMid,
            }}>
              {product.is_active ? t("active", "Actif") : t("inactive", "Inactif")}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
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
              <EditIcon /> {t("edit", "Modifier")}
            </button>
          )}
        </div>
      </div>

      {/* Body: image + tabs + examples */}
      <div style={{ display: "flex", height: 150, overflow: "hidden" }}>
        {/* Product image — floating PNG, no border/outline */}
        <div style={{ width: 140, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
          {mainImage ? (
            <img
              src={mainImage.image_url}
              alt={product.name}
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              loading="lazy"
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: T.silverDark }}>
              <ImageIcon />
              <span style={{ fontSize: 10 }}>Photo</span>
            </div>
          )}
        </div>

        {/* Tabs content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden", borderLeft: `1px solid ${T.border}` }}>
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
        </div>

        {/* Example images carousel */}
        {hasExamples && (
          <div style={{ width: 280, flexShrink: 0, borderLeft: `1px solid ${T.border}`, overflow: "hidden" }}>
            <ProductCarousel images={exampleImages} />
          </div>
        )}
      </div>
    </div>
  );
}
