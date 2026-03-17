import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { T } from "../../theme";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);

type StockStatus = "in_stock" | "ok" | "low" | "out_of_stock";

interface Product {
  id: string; name: string; sku: string; stock_qty: number; min_stock: number;
  cost_price: number; is_active: boolean; formats: string[];
}

function getStatus(p: Product): StockStatus {
  if (p.stock_qty === 0) return "out_of_stock";
  if (p.min_stock > 0 && p.stock_qty <= p.min_stock) return "low";
  if (p.min_stock > 0 && p.stock_qty <= p.min_stock * 1.5) return "ok";
  return "in_stock";
}

const STATUS_CONFIG = {
  in_stock: { label: "En stock", color: T.green, bg: T.greenBg },
  ok: { label: "Stock ok", color: "#0891b2", bg: "#cffafe" },
  low: { label: "Stock bas", color: T.orange, bg: T.orangeBg },
  out_of_stock: { label: "Rupture", color: T.red, bg: T.redBg },
};

type FilterKey = "all" | StockStatus;

export default function ManufInventoryView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    supabase
      .from("sale_products")
      .select("id, name, sku, stock_qty, min_stock, cost_price, is_active, formats")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => {
        setProducts((data ?? []) as Product[]);
        setLoading(false);
      });
  }, []);

  const withStatus = products.map(p => ({ ...p, _status: getStatus(p) }));
  const filtered = withStatus.filter(p => {
    if (filter !== "all" && p._status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    }
    return true;
  });

  const counts = {
    all: withStatus.length,
    in_stock: withStatus.filter(p => p._status === "in_stock").length,
    ok: withStatus.filter(p => p._status === "ok").length,
    low: withStatus.filter(p => p._status === "low").length,
    out_of_stock: withStatus.filter(p => p._status === "out_of_stock").length,
  };

  const exportCSV = () => {
    const headers = ["SKU", "Produit", "Formats", "Qté en stock", "Seuil min", "Prix de revient", "Statut"];
    const rows = filtered.map(p => [
      p.sku, p.name, (p.formats ?? []).join(" | "),
      String(p.stock_qty), String(p.min_stock), String(p.cost_price),
      STATUS_CONFIG[p._status].label,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = `inventaire-sci-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: T.text }}>Inventaire</h1>
            <span style={{ background: "#fffbeb", color: T.accent, fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 5, border: `1px solid ${T.accent}33` }}>LECTURE SEULE</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: T.textMid }}>Niveaux de stock en temps réel — aucune modification possible.</p>
        </div>
        <button onClick={exportCSV} style={{ display: "flex", alignItems: "center", gap: 7, background: T.card, color: T.text, border: `1px solid ${T.border}`, borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
        {([
          { key: "all", label: "Tous" },
          { key: "in_stock", label: "En stock" },
          { key: "ok", label: "Stock ok" },
          { key: "low", label: "Stock bas" },
          { key: "out_of_stock", label: "Rupture" },
        ] as { key: FilterKey; label: string }[]).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            background: filter === f.key ? T.main : T.card,
            color: filter === f.key ? "#fff" : T.textMid,
            border: `1px solid ${filter === f.key ? T.main : T.border}`,
            borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>
            {f.label} <span style={{ opacity: 0.7, fontWeight: 400 }}>({counts[f.key]})</span>
          </button>
        ))}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: T.card, borderRadius: 8, border: `1px solid ${T.border}`, padding: "0 12px", marginLeft: 8 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.textMid} strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par produit ou SKU..."
            style={{ border: "none", outline: "none", fontSize: 13, color: T.text, fontFamily: "inherit", background: "transparent", flex: 1, padding: "9px 0" }} />
        </div>
      </div>

      <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8f9fb" }}>
                {["SKU", "Produit", "Formats", "Qté en stock", "Seuil min", "Prix de revient", "Statut"].map(h => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: T.textMid, fontSize: 13 }}>Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: T.textMid, fontSize: 13 }}>Aucun produit trouvé.</td></tr>
              ) : filtered.map((p, i) => {
                const sc = STATUS_CONFIG[p._status];
                return (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc", transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f0f2ff")}
                    onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafbfc")}>
                    <td style={{ padding: "12px 16px", fontSize: 12, fontWeight: 700, color: T.textMid, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{p.sku || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: T.text, borderBottom: `1px solid ${T.border}` }}>{p.name}</td>
                    <td style={{ padding: "12px 16px", fontSize: 11, color: T.textMid, borderBottom: `1px solid ${T.border}`, maxWidth: 160 }}>
                      {(p.formats ?? []).slice(0, 2).join(", ")}{(p.formats?.length ?? 0) > 2 ? "..." : ""}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: p.stock_qty === 0 ? T.red : T.text, borderBottom: `1px solid ${T.border}`, textAlign: "center" }}>{p.stock_qty}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: T.textMid, borderBottom: `1px solid ${T.border}`, textAlign: "center" }}>{p.min_stock}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: T.textMid, borderBottom: `1px solid ${T.border}`, textAlign: "right" }}>{p.cost_price > 0 ? fmt(p.cost_price) : "—"}</td>
                    <td style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ background: sc.bg, color: sc.color, fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 5 }}>{sc.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && (
          <div style={{ padding: "10px 16px", borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.textLight, background: "#f8f9fb" }}>
            {filtered.length} produit{filtered.length !== 1 ? "s" : ""} affiché{filtered.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
