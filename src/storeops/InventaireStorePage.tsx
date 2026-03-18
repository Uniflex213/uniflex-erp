import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useApp } from "../AppContext";
import { InventaireProduct, StockMovement } from "./inventaire/inventaireTypes";
import { useAuth } from "../contexts/AuthContext";
import InventaireKpiBar from "./inventaire/InventaireKpiBar";
import InventaireTable from "./inventaire/InventaireTable";
import StockMovementsView from "./inventaire/StockMovementsView";
import StockReceptionModal from "./inventaire/StockReceptionModal";
import StockAdjustmentModal from "./inventaire/StockAdjustmentModal";
import PhysicalInventoryModal from "./inventaire/PhysicalInventoryModal";
import { T } from "../theme";

type Tab = "inventaire" | "mouvements";
type Modal = "reception" | "adjustment" | "physical" | "history" | null;

export default function InventaireStorePage() {
  const { reloadProducts } = useApp();
  const { storeCode } = useAuth();
  const [tab, setTab] = useState<Tab>("inventaire");
  const [modal, setModal] = useState<Modal>(null);
  const [selectedProduct, setSelectedProduct] = useState<InventaireProduct | null>(null);
  const [products, setProducts] = useState<InventaireProduct[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [productsRes, pendingTicketsRes, movementsRes, lastRecepRes] = await Promise.all([
        supabase.from("sale_products").select("id, name, sku, description, formats, is_active, units_per_pallet, stock_qty, min_stock, cost_price").eq("is_active", true).order("name"),
        supabase.from("pickup_tickets").select("id").in("status", ["prepared", "ready"]),
        supabase.from("stock_movements").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("stock_receptions").select("id, received_at, stock_reception_items(product_id)").eq("status", "confirmed"),
      ]);

      const pendingTicketIds = (pendingTicketsRes.data || []).map((t: any) => t.id);
      const reservedByProduct: Record<string, number> = {};
      if (pendingTicketIds.length > 0) {
        const { data: reservedItems } = await supabase.from("pickup_ticket_items").select("product_id, quantity").in("ticket_id", pendingTicketIds);
        if (reservedItems) {
          for (const row of reservedItems as any[]) {
            const pid = row.product_id;
            if (!pid) continue;
            reservedByProduct[pid] = (reservedByProduct[pid] || 0) + row.quantity;
          }
        }
      }

      const lastRecepByProduct: Record<string, string> = {};
      if (lastRecepRes.data) {
        for (const reception of lastRecepRes.data as any[]) {
          const items = reception.stock_reception_items || [];
          for (const item of items) {
            const pid = item.product_id;
            if (!pid) continue;
            const date = reception.received_at;
            if (!lastRecepByProduct[pid] || date > lastRecepByProduct[pid]) {
              lastRecepByProduct[pid] = date;
            }
          }
        }
      }

      const mapped: InventaireProduct[] = (productsRes.data || []).map((p: any) => {
        const reserved = reservedByProduct[p.id] || 0;
        const available = Math.max(0, (p.stock_qty || 0) - reserved);
        return {
          id: p.id,
          name: p.name,
          sku: p.sku || "",
          description: p.description || "",
          formats: p.formats || [],
          is_active: p.is_active,
          units_per_pallet: p.units_per_pallet ?? null,
          stock_qty: p.stock_qty || 0,
          min_stock: p.min_stock || 0,
          cost_price: Number(p.cost_price) || 0,
          reserved_qty: reserved,
          available_qty: available,
          last_movement_at: null,
          last_reception_at: lastRecepByProduct[p.id] || null,
        };
      });

      setProducts(mapped);
      setMovements((movementsRes.data as StockMovement[]) || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function handleDone() {
    setModal(null);
    setSelectedProduct(null);
    loadData();
    reloadProducts();
  }

  function openReception(product?: InventaireProduct) {
    setSelectedProduct(product || null);
    setModal("reception");
  }

  function openAdjustment(product: InventaireProduct) {
    setSelectedProduct(product);
    setModal("adjustment");
  }

  function openHistory(product: InventaireProduct) {
    setSelectedProduct(product);
    setModal("history");
  }

  const TabBtn = ({ id, label }: { id: Tab; label: string }) => (
    <button
      onClick={() => setTab(id)}
      style={{
        padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit",
        fontSize: 13, fontWeight: 700,
        background: tab === id ? T.main : "transparent",
        color: tab === id ? "#fff" : T.textMid,
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ padding: "28px 32px", background: T.cardAlt, minHeight: "100%" }}>
      <style>{`@keyframes breathe { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0)} 50%{box-shadow:0 0 0 10px rgba(99,102,241,0.15)} } .breathe-inv{animation:breathe 2.5s ease-in-out infinite}`}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: T.text, margin: 0 }}>Inventaire — Gestion des stocks</h1>
          <div style={{ fontSize: 13, color: T.textMid, marginTop: 4 }}>Produits en consignation SCI — {storeCode ?? "BSB"}</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setModal("physical")} style={{ padding: "9px 16px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: "transparent", color: T.textMid, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
            Inventaire physique
          </button>
          <button onClick={() => openAdjustment(products[0])} disabled={products.length === 0} style={{ padding: "9px 16px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.card, color: T.text, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
            Ajustement
          </button>
          <button onClick={() => openReception()} className="breathe-inv" style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: T.main, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
            + Entrée de stock
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: T.textMid, fontSize: 14 }}>Chargement…</div>
      ) : (
        <>
          <InventaireKpiBar products={products} movements={movements} />

          <div style={{ display: "flex", gap: 4, background: T.card, borderRadius: 10, padding: 4, border: `1px solid ${T.border}`, marginBottom: 16, width: "fit-content" }}>
            <TabBtn id="inventaire" label={`Inventaire (${products.length})`} />
            <TabBtn id="mouvements" label={`Mouvements (${movements.length})`} />
          </div>

          {tab === "inventaire" && (
            <InventaireTable
              products={products}
              onReception={p => openReception(p)}
              onAdjustment={p => openAdjustment(p)}
              onHistory={p => openHistory(p)}
            />
          )}

          {tab === "mouvements" && (
            <StockMovementsView movements={movements} />
          )}
        </>
      )}

      {modal === "reception" && (
        <StockReceptionModal
          prefillProduct={selectedProduct ? { id: selectedProduct.id, name: selectedProduct.name } : undefined}
          onClose={() => { setModal(null); setSelectedProduct(null); }}
          onDone={handleDone}
        />
      )}

      {modal === "adjustment" && selectedProduct && (
        <StockAdjustmentModal
          product={selectedProduct}
          onClose={() => { setModal(null); setSelectedProduct(null); }}
          onDone={handleDone}
        />
      )}

      {modal === "adjustment" && !selectedProduct && (
        <AdjustmentProductPicker
          products={products}
          onSelect={p => setSelectedProduct(p)}
          onClose={() => setModal(null)}
        />
      )}

      {modal === "physical" && (
        <PhysicalInventoryModal
          products={products}
          onClose={() => setModal(null)}
          onDone={handleDone}
        />
      )}

      {modal === "history" && selectedProduct && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1500, padding: 20, overflowY: "auto" }} onClick={() => { setModal(null); setSelectedProduct(null); }}>
          <div style={{ width: "100%", maxWidth: 880, marginBottom: 20 }} onClick={e => e.stopPropagation()}>
            <StockMovementsView
              movements={movements.filter(m => m.product_id === selectedProduct.id)}
              onClose={() => { setModal(null); setSelectedProduct(null); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AdjustmentProductPicker({ products, onSelect, onClose }: { products: InventaireProduct[]; onSelect: (p: InventaireProduct) => void; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1500, padding: 20 }} onClick={onClose}>
      <div style={{ background: T.card, borderRadius: 16, padding: 28, width: "100%", maxWidth: 440, boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Choisir un produit</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: T.textMid }}>×</button>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box", marginBottom: 12 }} />
        <div style={{ maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          {filtered.map(p => (
            <button key={p.id} onClick={() => onSelect(p)} style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", textAlign: "left", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: T.text, transition: "background 0.1s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f0f3ff")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              {p.name} <span style={{ fontSize: 11, color: T.textLight, fontWeight: 400 }}>— {p.stock_qty} unités</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
