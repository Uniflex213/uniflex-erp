import React, { useState } from "react";
import { useApp } from "./AppContext";
import { useAuth } from "./contexts/AuthContext";
import { can as canPerm } from "./lib/permissions";
import { SaleProduct } from "./sales/productTypes";
import { T } from "./theme";
import { PlusIcon, SearchIcon } from "./products/productIcons";
import ProductCard from "./products/ProductCard";
import AddProductModal from "./products/AddProductModal";
import EditProductModal from "./products/EditProductModal";

export default function ProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct } = useApp();
  const { permissions, profile, can } = useAuth();
  const canCreate = profile?.role === "god_admin";
  const canEditProducts = can("ventes.products.edit");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<SaleProduct | null>(null);

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

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
            {products.length === 0 ? "Aucun produit dans le catalogue" : `${filtered.length} produit${filtered.length !== 1 ? "s" : ""} dans le catalogue`}
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
        <div style={{ marginBottom: 18, position: "relative", maxWidth: 340 }}>
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
      )}

      {filtered.length === 0 ? (
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
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(p => (
            <ProductCard key={p.id} product={p} onEdit={setEditProduct} canEdit={canEditProducts} />
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
