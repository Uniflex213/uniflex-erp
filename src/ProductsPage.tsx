import React, { useState, useMemo } from "react";
import { useApp } from "./AppContext";
import { useAuth } from "./contexts/AuthContext";
import { SaleProduct, PRODUCT_CATEGORIES } from "./sales/productTypes";
import { T } from "./theme";
import { PlusIcon, SearchIcon } from "./products/productIcons";
import ProductCard from "./products/ProductCard";
import AddProductModal from "./products/AddProductModal";
import EditProductModal from "./products/EditProductModal";

const CATEGORY_ORDER: string[] = [...PRODUCT_CATEGORIES];

export default function ProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct } = useApp();
  const { profile, can } = useAuth();
  const canCreate = profile?.role === "god_admin";
  const canEditProducts = can("ventes.products.edit");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<SaleProduct | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.formats_other) cats.add(p.category);
    });
    const sorted = CATEGORY_ORDER.filter(c => cats.has(c));
    cats.forEach(c => { if (!sorted.includes(c)) sorted.push(c); });
    return sorted;
  }, [products]);

  const grouped = useMemo(() => {
    const map: Record<string, SaleProduct[]> = {};
    filtered.forEach(p => {
      const cat = p.category || "Autre";
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    });
    return map;
  }, [filtered]);

  const displayCategories = activeCategory === "all"
    ? categories.filter(c => grouped[c]?.length)
    : [activeCategory].filter(c => grouped[c]?.length);

  const totalFiltered = activeCategory === "all"
    ? filtered.length
    : (grouped[activeCategory]?.length || 0);

  const handleAddSave = (p: SaleProduct) => {
    addProduct(p);
    setShowModal(false);
  };

  const handleEditSave = (updated: SaleProduct) => {
    updateProduct(updated);
    setEditProduct(null);
  };

  const handleDelete = (id: string) => {
    deleteProduct(id);
    setEditProduct(null);
  };

  return (
    <div style={{ padding: "28px 32px", fontFamily: "'Outfit', sans-serif", minHeight: "100%", background: "#f4f5f9" }}>
      <style>{`
        @keyframes btnGlow {
          0%   { box-shadow: 0 0 6px 1px rgba(99,102,241,0.2), 0 2px 8px rgba(99,102,241,0.15); }
          50%  { box-shadow: 0 0 18px 4px rgba(99,102,241,0.45), 0 4px 16px rgba(99,102,241,0.3); }
          100% { box-shadow: 0 0 6px 1px rgba(99,102,241,0.2), 0 2px 8px rgba(99,102,241,0.15); }
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6577a8", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>
            Ventes / Outils de vente
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: T.text, letterSpacing: -0.5 }}>Produits</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textMid }}>
            {products.length === 0 ? "Aucun produit dans le catalogue" : `${totalFiltered} produit${totalFiltered !== 1 ? "s" : ""} dans le catalogue`}
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "11px 20px", background: T.main, border: "none",
              borderRadius: 9, fontSize: 13, fontWeight: 700, color: "#fff",
              cursor: "pointer", fontFamily: "inherit",
              animation: "btnGlow 2.5s ease-in-out infinite",
            }}
          >
            <PlusIcon /> Ajouter un produit
          </button>
        )}
      </div>

      {products.length > 0 && (
        <>
          {/* Search */}
          <div style={{ marginBottom: 14, position: "relative", maxWidth: 340 }}>
            <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.silverDark }}>
              <SearchIcon />
            </div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un produit..."
              style={{
                width: "100%", padding: "9px 12px 9px 33px",
                border: `1.5px solid ${T.silverLight}`, borderRadius: 8,
                fontSize: 13, fontFamily: "inherit", outline: "none",
                background: T.card, color: T.text, boxSizing: "border-box",
              }}
              onFocus={e => e.currentTarget.style.borderColor = T.main}
              onBlur={e => e.currentTarget.style.borderColor = T.silverLight}
            />
          </div>

          {/* Category tabs */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
            <button
              onClick={() => setActiveCategory("all")}
              style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit", border: "none",
                background: activeCategory === "all" ? T.main : T.card,
                color: activeCategory === "all" ? "#fff" : T.textMid,
                transition: "all 0.15s",
              }}
            >
              Tout ({filtered.length})
            </button>
            {categories.map(cat => {
              const count = grouped[cat]?.length || 0;
              if (count === 0 && search) return null;
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(active ? "all" : cat)}
                  style={{
                    padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit", border: "none",
                    background: active ? T.main : T.card,
                    color: active ? "#fff" : T.textMid,
                    transition: "all 0.15s",
                  }}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </>
      )}

      {totalFiltered === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "70px 20px", background: T.card, borderRadius: 12, border: `1px dashed ${T.silverLight}`,
        }}>
          <div style={{ color: T.silverLight, marginBottom: 14 }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 8 }}>
            {search ? `Aucun résultat pour "${search}"` : "Aucun produit"}
          </div>
          <div style={{ fontSize: 13, color: T.textMid, marginBottom: 24, textAlign: "center" }}>
            {search ? "Essayez un autre terme de recherche." : canCreate ? "Cliquez sur Ajouter un produit pour commencer." : "Aucun produit disponible."}
          </div>
          {!search && canCreate && (
            <button
              onClick={() => setShowModal(true)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 20px", background: T.main, border: "none",
                borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <PlusIcon /> Ajouter un produit
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {displayCategories.map(cat => (
            <div key={cat}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
              }}>
                <div style={{
                  fontSize: 14, fontWeight: 800, color: T.text, textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}>
                  {cat}
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: T.textLight,
                  background: T.bg, padding: "2px 10px", borderRadius: 12,
                }}>
                  {grouped[cat].length}
                </div>
                <div style={{ flex: 1, height: 1, background: T.border }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {grouped[cat].map(p => (
                  <ProductCard key={p.id} product={p} onEdit={setEditProduct} canEdit={canEditProducts} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <AddProductModal onClose={() => setShowModal(false)} onSave={handleAddSave} />}
      {editProduct && canEditProducts && (
        <EditProductModal
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onSave={handleEditSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
