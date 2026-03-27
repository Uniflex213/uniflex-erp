import React, { useState, useMemo } from "react";
import { InventaireProduct, StockStatus, STOCK_STATUS_LABELS, STOCK_STATUS_COLORS, getStockStatus } from "./inventaireTypes";
import { T } from "../../theme";
import { useLanguage } from "../../i18n/LanguageContext";

const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString("fr-CA", { day: "2-digit", month: "short" }) : "—";

type SortKey = 'name' | 'stock_qty' | 'reserved_qty' | 'available_qty' | 'min_stock' | 'status';

interface Props {
  products: InventaireProduct[];
  onReception: (product: InventaireProduct) => void;
  onAdjustment: (product: InventaireProduct) => void;
  onHistory: (product: InventaireProduct) => void;
}

export default function InventaireTable({ products, onReception, onAdjustment, onHistory }: Props) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<StockStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  const filtered = useMemo(() => {
    let list = [...products];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== 'all') {
      list = list.filter(p => getStockStatus(p) === filterStatus);
    }
    list.sort((a, b) => {
      let av: string | number = 0, bv: string | number = 0;
      if (sortKey === 'name') { av = a.name; bv = b.name; }
      else if (sortKey === 'stock_qty') { av = a.stock_qty; bv = b.stock_qty; }
      else if (sortKey === 'reserved_qty') { av = a.reserved_qty; bv = b.reserved_qty; }
      else if (sortKey === 'available_qty') { av = a.available_qty; bv = b.available_qty; }
      else if (sortKey === 'min_stock') { av = a.min_stock; bv = b.min_stock; }
      else if (sortKey === 'status') {
        const order = { out_of_stock: 0, low: 1, ok: 2, in_stock: 3 };
        av = order[getStockStatus(a)]; bv = order[getStockStatus(b)];
      }
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return list;
  }, [products, search, filterStatus, sortKey, sortDir]);

  function SortArrow({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span style={{ opacity: 0.25, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  const statusCounts = {
    all: products.length,
    in_stock: products.filter(p => getStockStatus(p) === 'in_stock').length,
    ok: products.filter(p => getStockStatus(p) === 'ok').length,
    low: products.filter(p => getStockStatus(p) === 'low').length,
    out_of_stock: products.filter(p => getStockStatus(p) === 'out_of_stock').length,
  };

  const thStyle = (k: SortKey): React.CSSProperties => ({
    padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.textMid,
    textTransform: "uppercase", letterSpacing: 0.8, cursor: "pointer", whiteSpace: "nowrap",
    background: sortKey === k ? "#f0f3ff" : "transparent",
    borderBottom: `1px solid ${T.border}`,
  });

  return (
    <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t("inventory.search_placeholder", "Rechercher par nom ou SKU…")}
          style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: "inherit", outline: "none", width: 240 }}
        />
        <div style={{ display: "flex", gap: 6 }}>
          {([['all', t("all", "Tous")], ['in_stock', t("products.in_stock", "En stock")], ['ok', t("inventory.stock_ok", "Stock correct")], ['low', t("products.low_stock", "Stock bas")], ['out_of_stock', t("inventory.out_of_stock", "Rupture")]] as [typeof filterStatus, string][]).map(([key, label]) => {
            const active = filterStatus === key;
            const colors = key !== 'all' ? STOCK_STATUS_COLORS[key as StockStatus] : null;
            return (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                style={{
                  padding: "5px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  border: active ? `1.5px solid ${colors?.color || T.main}` : `1px solid ${T.border}`,
                  background: active ? (colors?.bg || "#f0f3ff") : "transparent",
                  color: active ? (colors?.color || T.main) : T.textMid,
                  transition: "all 0.15s",
                }}
              >
                {label} {statusCounts[key] > 0 && <span style={{ opacity: 0.7 }}>({statusCounts[key]})</span>}
              </button>
            );
          })}
        </div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: T.textLight }}>{filtered.length} {t("inventory.product_count", "produit(s)")}</div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {([['name', t("inventory.product", "Produit")], ['stock_qty', t("inventory.current_stock", "Stock actuel")], ['reserved_qty', t("inventory.reserved", "Réservé")], ['available_qty', t("inventory.available", "Disponible")], ['min_stock', t("inventory.min_stock", "Min. stock")], ['status', t("status", "Statut")]] as [SortKey, string][]).map(([k, label]) => (
                <th key={k} style={thStyle(k)} onClick={() => handleSort(k)}>
                  {label}<SortArrow k={k} />
                </th>
              ))}
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.8, borderBottom: `1px solid ${T.border}` }}>{t("inventory.last_entry", "Dernière entrée")}</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.8, borderBottom: `1px solid ${T.border}` }}>{t("inventory.units_per_pallet", "Unités/palette")}</th>
              <th style={{ padding: "10px 12px", borderBottom: `1px solid ${T.border}` }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: "40px 0", color: T.textLight, fontSize: 13 }}>{t("products.no_products", "Aucun produit trouvé.")}</td></tr>
            ) : (
              filtered.map(p => {
                const status = getStockStatus(p);
                const sc = STOCK_STATUS_COLORS[status];
                const rowBg = sc.rowBg || "transparent";
                return (
                  <tr key={p.id} style={{ background: rowBg, borderBottom: `1px solid ${T.border}`, transition: "background 0.1s" }}>
                    <td style={{ padding: "12px", fontWeight: 700, fontSize: 13 }}>
                      <div>{p.name}</div>
                      {p.sku && <div style={{ fontSize: 11, color: T.textMid, marginTop: 2, fontWeight: 400 }}>SKU: {p.sku}</div>}
                    </td>
                    <td style={{ padding: "12px", fontSize: 14, fontWeight: 800, color: p.stock_qty === 0 ? T.red : T.text }}>{p.stock_qty}</td>
                    <td style={{ padding: "12px", fontSize: 13, color: p.reserved_qty > 0 ? T.orange : T.textLight }}>{p.reserved_qty}</td>
                    <td style={{ padding: "12px", fontSize: 14, fontWeight: 700, color: p.available_qty <= 0 ? T.red : T.green }}>{p.available_qty}</td>
                    <td style={{ padding: "12px", fontSize: 13, color: T.textMid }}>{p.min_stock || "—"}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
                        {STOCK_STATUS_LABELS[status]}
                      </span>
                    </td>
                    <td style={{ padding: "12px", fontSize: 12, color: T.textMid }}>{fmtDate(p.last_reception_at)}</td>
                    <td style={{ padding: "12px", fontSize: 12, color: T.textMid }}>{p.units_per_pallet ?? "—"}</td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", gap: 5 }}>
                        <ActionBtn color={T.green} bg="#d1f5db" label={t("inventory.entry_btn", "Entrée")} onClick={() => onReception(p)} />
                        <ActionBtn color={T.main} bg="#e8eaff" label={t("inventory.adjust_btn", "Ajust.")} onClick={() => onAdjustment(p)} />
                        <ActionBtn color={T.textMid} bg={T.cardAlt} label={t("inventory.history_btn", "Historique")} onClick={() => onHistory(p)} />
                      </div>
                    </td>
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

function ActionBtn({ color, bg, label, onClick }: { color: string; bg: string; label: string; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? color : bg,
        color: hover ? "#fff" : color,
        border: "none", borderRadius: 6, padding: "4px 8px",
        cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit",
        transition: "all 0.15s", whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}
