import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { OrderStatus, STATUS_CONFIG, OrderBillingStatus, ORDER_BILLING_LABELS, ORDER_BILLING_COLORS } from "../../orders/orderTypes";
import { T } from "../../theme";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-CA", { year: "numeric", month: "short", day: "numeric" });

interface DBOrder {
  id: string; client: string; vendeur_code: string; total: number;
  status: OrderStatus; billing_status: OrderBillingStatus;
  created_at: string; motif: string;
  products?: { product: string; qty: number; price: number }[];
  subtotal?: number; discount?: number; tax_total?: number; admin_note?: string;
}

type FilterStatus = "all" | OrderStatus;

const STATUS_FILTERS: { key: FilterStatus; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "pending_approval", label: "À confirmer" },
  { key: "en_production", label: "En production" },
  { key: "produced", label: "À facturer" },
  { key: "shipped", label: "En route" },
  { key: "completed", label: "Complétée" },
  { key: "rejected", label: "Annulée" },
];

export default function ManufOrdersView() {
  const [orders, setOrders] = useState<DBOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("orders")
      .select("id, client, vendeur_code, total, status, billing_status, created_at, motif, subtotal, discount, tax_total, admin_note, products")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrders((data ?? []) as DBOrder[]);
        setLoading(false);
      });
  }, []);

  const filtered = orders.filter(o => {
    if (filter !== "all" && o.status !== filter) return false;
    if (dateFrom && o.created_at < dateFrom) return false;
    if (dateTo && o.created_at > dateTo + "T23:59:59") return false;
    if (search) {
      const q = search.toLowerCase();
      return o.id.toLowerCase().includes(q) || (o.client ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  const exportCSV = () => {
    const headers = ["# Commande", "Client", "Vendeur", "Total", "Statut", "Facturation", "Date"];
    const rows = filtered.map(o => [
      o.id, o.client ?? "", o.vendeur_code ?? "",
      String(o.total ?? 0),
      STATUS_CONFIG[o.status]?.label ?? o.status,
      ORDER_BILLING_LABELS[o.billing_status] ?? o.billing_status ?? "",
      fmtDate(o.created_at),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = `commandes-sci-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: T.text }}>Commandes</h1>
            <span style={{ background: "#fffbeb", color: T.accent, fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 5, border: `1px solid ${T.accent}33` }}>LECTURE SEULE</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: T.textMid }}>Toutes les commandes — vue lecture seule pour l'équipe SCI.</p>
        </div>
        <button onClick={exportCSV} style={{ display: "flex", alignItems: "center", gap: 7, background: T.card, color: T.text, border: `1px solid ${T.border}`, borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {STATUS_FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            background: filter === f.key ? T.main : T.card,
            color: filter === f.key ? "#fff" : T.textMid,
            border: `1px solid ${filter === f.key ? T.main : T.border}`,
            borderRadius: 8, padding: "6px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>{f.label}</button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 2, display: "flex", alignItems: "center", gap: 8, background: T.card, borderRadius: 8, border: `1px solid ${T.border}`, padding: "0 12px" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.textMid} strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par # commande ou client..."
            style={{ border: "none", outline: "none", fontSize: 13, color: T.text, fontFamily: "inherit", background: "transparent", flex: 1, padding: "9px 0" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.card, borderRadius: 8, border: `1px solid ${T.border}`, padding: "0 12px" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.textMid} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ border: "none", outline: "none", fontSize: 12, color: T.text, fontFamily: "inherit", background: "transparent", padding: "9px 0" }} />
          <span style={{ color: T.textLight, fontSize: 12 }}>→</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ border: "none", outline: "none", fontSize: 12, color: T.text, fontFamily: "inherit", background: "transparent", padding: "9px 0" }} />
        </div>
      </div>

      <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8f9fb" }}>
                {["# Commande", "Client", "Vendeur", "Motif", "Total", "Statut", "Facturation", "Date", ""].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: T.textMid, fontSize: 13 }}>Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: T.textMid, fontSize: 13 }}>Aucune commande trouvée.</td></tr>
              ) : filtered.map((o, i) => {
                const sc = STATUS_CONFIG[o.status] ?? { label: o.status, color: T.textMid, bg: "#f3f4f6" };
                const bc = ORDER_BILLING_COLORS[o.billing_status] ?? { color: T.textMid, bg: "#f3f4f6" };
                const isOpen = expanded === o.id;
                return (
                  <React.Fragment key={o.id}>
                    <tr
                      onClick={() => setExpanded(isOpen ? null : o.id)}
                      style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc", cursor: "pointer", transition: "background 0.1s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f0f2ff")}
                      onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafbfc")}
                    >
                      <td style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: T.main, borderBottom: isOpen ? "none" : `1px solid ${T.border}`, fontFamily: "monospace", whiteSpace: "nowrap" }}>{o.id.slice(0, 26)}{o.id.length > 26 ? "..." : ""}</td>
                      <td style={{ padding: "11px 14px", fontSize: 13, color: T.text, borderBottom: isOpen ? "none" : `1px solid ${T.border}`, fontWeight: 600 }}>{o.client || "—"}</td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: T.textMid, borderBottom: isOpen ? "none" : `1px solid ${T.border}` }}>{o.vendeur_code || "—"}</td>
                      <td style={{ padding: "11px 14px", fontSize: 11, color: T.textMid, borderBottom: isOpen ? "none" : `1px solid ${T.border}` }}>{o.motif || "—"}</td>
                      <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 700, color: T.main, borderBottom: isOpen ? "none" : `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{fmt(o.total ?? 0)}</td>
                      <td style={{ padding: "11px 14px", borderBottom: isOpen ? "none" : `1px solid ${T.border}` }}>
                        <span style={{ background: sc.bg, color: sc.color, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 5 }}>{sc.label}</span>
                      </td>
                      <td style={{ padding: "11px 14px", borderBottom: isOpen ? "none" : `1px solid ${T.border}` }}>
                        <span style={{ background: bc.bg, color: bc.color, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 5 }}>{ORDER_BILLING_LABELS[o.billing_status] ?? "—"}</span>
                      </td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: T.textMid, borderBottom: isOpen ? "none" : `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{fmtDate(o.created_at)}</td>
                      <td style={{ padding: "11px 14px", borderBottom: isOpen ? "none" : `1px solid ${T.border}`, textAlign: "center" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.textMid} strokeWidth="2" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9"/></svg>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={9} style={{ borderBottom: `1px solid ${T.border}`, padding: 0 }}>
                          <div style={{ padding: "16px 18px", background: "#f8f9fd", borderTop: `2px solid ${T.main}22` }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
                              {[
                                { label: "Sous-total", value: fmt(o.subtotal ?? 0) },
                                { label: "Remise", value: o.discount ? fmt(o.discount) : "—" },
                                { label: "Taxes", value: fmt(o.tax_total ?? 0) },
                                { label: "Total", value: fmt(o.total ?? 0) },
                              ].map(item => (
                                <div key={item.label} style={{ background: T.bgCard, borderRadius: 8, padding: "10px 14px", border: `1px solid ${T.border}` }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>{item.label}</div>
                                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{item.value}</div>
                                </div>
                              ))}
                            </div>
                            {o.products && o.products.length > 0 && (
                              <div style={{ background: T.bgCard, borderRadius: 10, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                                <div style={{ padding: "10px 14px", borderBottom: `1px solid ${T.border}`, fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4 }}>Produits commandés</div>
                                {o.products.map((p, pi) => (
                                  <div key={pi} style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderBottom: pi < o.products!.length - 1 ? `1px solid ${T.border}` : "none" }}>
                                    <span style={{ fontSize: 13, color: T.text }}>{p.product}</span>
                                    <span style={{ fontSize: 13, color: T.textMid }}>× {p.qty} — {fmt((p.price ?? 0) * (p.qty ?? 0))}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {o.admin_note && (
                              <div style={{ marginTop: 12, padding: "10px 14px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a", fontSize: 12, color: "#92400e" }}>
                                <strong>Note admin :</strong> {o.admin_note}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && (
          <div style={{ padding: "10px 16px", borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.textLight, background: "#f8f9fb" }}>
            {filtered.length} commande{filtered.length !== 1 ? "s" : ""} affichée{filtered.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
