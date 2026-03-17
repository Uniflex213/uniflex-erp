import React, { useState, useMemo } from "react";
import { StockMovement, MOVEMENT_TYPE_CONFIG } from "./inventaireTypes";
import { T } from "../../theme";

const fmtDate = (s: string) => new Date(s).toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

interface Props {
  movements: StockMovement[];
  productFilter?: string;
  onClose?: () => void;
}

export default function StockMovementsView({ movements, productFilter, onClose }: Props) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const allTypes = useMemo(() => {
    const s = new Set(movements.map(m => m.movement_type));
    return Array.from(s);
  }, [movements]);

  const filtered = useMemo(() => {
    let list = [...movements];
    if (productFilter) list = list.filter(m => m.product_id === productFilter || m.product_name.toLowerCase().includes(productFilter.toLowerCase()));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.product_name.toLowerCase().includes(q) ||
        m.reference_number.toLowerCase().includes(q) ||
        m.agent_name.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== 'all') list = list.filter(m => m.movement_type === typeFilter);
    if (dateFrom) list = list.filter(m => m.created_at >= dateFrom);
    if (dateTo) list = list.filter(m => m.created_at <= dateTo + 'T23:59:59');
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [movements, productFilter, search, typeFilter, dateFrom, dateTo]);

  function exportCsv() {
    const headers = ['Date', 'Type', 'Référence', 'Produit', 'Quantité', 'Stock après', 'Agent'];
    const rows = filtered.map(m => [
      fmtDate(m.created_at),
      MOVEMENT_TYPE_CONFIG[m.movement_type]?.label || m.movement_type,
      m.reference_number,
      m.product_name,
      (m.quantity > 0 ? '+' : '') + m.quantity,
      m.stock_after,
      m.agent_name,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'mouvements.csv'; a.click();
  }

  return (
    <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden" }}>
      {onClose && (
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Historique des mouvements</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: T.textMid }}>×</button>
        </div>
      )}

      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher…"
          style={{ padding: "7px 11px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12, fontFamily: "inherit", outline: "none", width: 200 }}
        />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12, fontFamily: "inherit", outline: "none" }}>
          <option value="all">Tous les types</option>
          {allTypes.map(t => <option key={t} value={t}>{MOVEMENT_TYPE_CONFIG[t]?.label || t}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12, fontFamily: "inherit", outline: "none" }} />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12, fontFamily: "inherit", outline: "none" }} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: T.textLight }}>{filtered.length} mouvement(s)</span>
          <button onClick={exportCsv}
            style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.cardAlt, color: T.textMid, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Export CSV
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: T.cardAlt }}>
              {["Date", "Type", "# Référence", "Produit", "Quantité", "Stock après", "Agent", "Source"].map(h => (
                <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.7, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: "32px 0", color: T.textLight, fontSize: 13 }}>Aucun mouvement.</td></tr>
            ) : (
              filtered.map(m => {
                const tc = MOVEMENT_TYPE_CONFIG[m.movement_type] || { label: m.movement_type, color: T.textMid, bg: T.cardAlt, sign: '' };
                const isPositive = m.quantity > 0;
                return (
                  <tr key={m.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: T.textMid, whiteSpace: "nowrap" }}>{fmtDate(m.created_at)}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ display: "inline-block", padding: "2px 7px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: tc.bg, color: tc.color, whiteSpace: "nowrap" }}>
                        {tc.label}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: T.main, fontWeight: 600 }}>{m.reference_number || "—"}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>{m.product_name}</td>
                    <td style={{ padding: "10px 12px", fontSize: 14, fontWeight: 800, color: m.movement_type === 'reservation' || m.movement_type === 'release' ? T.textMid : (isPositive ? "#16a34a" : "#dc2626") }}>
                      {tc.sign !== '~' ? (isPositive ? '+' : '') + m.quantity : '~' + Math.abs(m.quantity)}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: T.textMid }}>{m.stock_after}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: T.textMid }}>{m.agent_name || "—"}</td>
                    <td style={{ padding: "10px 12px", fontSize: 11, color: T.textLight }}>{m.reference_type || "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
