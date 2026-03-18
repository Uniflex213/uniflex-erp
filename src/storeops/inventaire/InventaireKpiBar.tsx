import React, { useState } from "react";
import { InventaireProduct, StockMovement } from "./inventaireTypes";
import { T } from "../../theme";

const fmt = (n: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function getMonthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { start: start.toISOString(), end: end.toISOString() };
}

interface KpiData {
  totalValue: number;
  inStockCount: number;
  totalUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  reservedUnits: number;
  lastReceptionDate: string | null;
  monthlyMovementsValue: number;
}

interface Props {
  products: InventaireProduct[];
  movements: StockMovement[];
}

interface KpiModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function KpiModal({ title, onClose, children }: KpiModalProps) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 20 }} onClick={onClose}>
      <div style={{ background: T.card, borderRadius: 16, padding: 28, width: "100%", maxWidth: 560, maxHeight: "80vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: T.textMid }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  subvalue?: string;
  color?: string;
  bgColor?: string;
  onClick: () => void;
}

function KpiCard({ label, value, subvalue, color, bgColor, onClick }: KpiCardProps) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? "#fafbff" : T.card,
        borderRadius: 12,
        border: `1.5px solid ${hover ? T.main + "30" : T.border}`,
        padding: "14px 16px",
        cursor: "pointer",
        transition: "all 0.15s",
        flex: 1,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: color || T.text, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {subvalue && <div style={{ fontSize: 11, color: T.textLight, marginTop: 3, background: bgColor, padding: bgColor ? "2px 6px" : undefined, borderRadius: bgColor ? 6 : undefined, display: "inline-block" }}>{subvalue}</div>}
    </div>
  );
}

export default function InventaireKpiBar({ products, movements }: Props) {
  const [modal, setModal] = useState<string | null>(null);

  const kpi: KpiData = {
    totalValue: products.reduce((s, p) => s + p.stock_qty * p.cost_price, 0),
    inStockCount: products.filter(p => p.stock_qty > 0).length,
    totalUnits: products.reduce((s, p) => s + p.stock_qty, 0),
    lowStockCount: products.filter(p => p.min_stock > 0 && p.stock_qty > 0 && p.stock_qty <= p.min_stock).length,
    outOfStockCount: products.filter(p => p.stock_qty === 0 && p.is_active).length,
    reservedUnits: products.reduce((s, p) => s + p.reserved_qty, 0),
    lastReceptionDate: (() => {
      const recMvs = movements.filter(m => m.movement_type === 'reception');
      if (!recMvs.length) return null;
      return recMvs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at;
    })(),
    monthlyMovementsValue: (() => {
      const { start, end } = getMonthBounds();
      return movements
        .filter(m => m.created_at >= start && m.created_at <= end && (m.movement_type === 'reception' || m.movement_type.includes('out')))
        .reduce((s, m) => s + Math.abs(m.quantity), 0);
    })(),
  };

  const lowProducts = products.filter(p => p.min_stock > 0 && p.stock_qty > 0 && p.stock_qty <= p.min_stock);
  const outProducts = products.filter(p => p.stock_qty === 0 && p.is_active);
  const reservedProducts = products.filter(p => p.reserved_qty > 0);

  return (
    <>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <KpiCard
          label="Valeur consignation SCI"
          value={fmt(kpi.totalValue)}
          subvalue="stock × coût"
          onClick={() => setModal('value')}
        />
        <KpiCard
          label="Produits en stock"
          value={String(kpi.inStockCount)}
          subvalue={`/${products.filter(p => p.is_active).length} SKUs actifs`}
          onClick={() => setModal('instock')}
        />
        <KpiCard
          label="Unités totales"
          value={kpi.totalUnits.toLocaleString("fr-CA")}
          subvalue="toutes catégories"
          onClick={() => setModal('units')}
        />
        <KpiCard
          label="Stocks bas"
          value={String(kpi.lowStockCount)}
          color={kpi.lowStockCount > 0 ? T.orange : T.text}
          subvalue={kpi.lowStockCount > 0 ? "en alerte" : "aucune alerte"}
          bgColor={kpi.lowStockCount > 0 ? T.orangeBg : undefined}
          onClick={() => setModal('low')}
        />
        <KpiCard
          label="Ruptures"
          value={String(kpi.outOfStockCount)}
          color={kpi.outOfStockCount > 0 ? T.red : T.text}
          subvalue={kpi.outOfStockCount > 0 ? "stock épuisé" : "aucune rupture"}
          bgColor={kpi.outOfStockCount > 0 ? T.redBg : undefined}
          onClick={() => setModal('out')}
        />
        <KpiCard
          label="Unités réservées"
          value={String(kpi.reservedUnits)}
          subvalue="tickets en attente"
          color={kpi.reservedUnits > 0 ? T.main : T.text}
          onClick={() => setModal('reserved')}
        />
        <KpiCard
          label="Dernière réception"
          value={kpi.lastReceptionDate ? fmtDate(kpi.lastReceptionDate) : "—"}
          subvalue="entrée de stock"
          onClick={() => setModal('lastrecep')}
        />
        <KpiCard
          label="Mouvements ce mois"
          value={String(kpi.monthlyMovementsValue)}
          subvalue="unités entrées/sorties"
          onClick={() => setModal('monthmov')}
        />
      </div>

      {modal === 'value' && (
        <KpiModal title="Valeur de la consignation SCI" onClose={() => setModal(null)}>
          <div style={{ fontSize: 13, color: T.textMid, marginBottom: 16 }}>Valeur théorique du stock en consignation, calculée sur la base du prix coûtant de chaque produit.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {products.filter(p => p.stock_qty > 0 && p.cost_price > 0).map(p => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
                <span style={{ color: T.text, fontWeight: 600 }}>{p.name}</span>
                <span style={{ color: T.textMid }}>{p.stock_qty} × {fmt(p.cost_price)} = <strong style={{ color: T.main }}>{fmt(p.stock_qty * p.cost_price)}</strong></span>
              </div>
            ))}
            {products.filter(p => p.stock_qty > 0 && p.cost_price === 0).length > 0 && (
              <div style={{ fontSize: 12, color: T.orange, padding: "8px 0" }}>
                {products.filter(p => p.stock_qty > 0 && p.cost_price === 0).length} produit(s) sans prix coûtant défini — non comptabilisés.
              </div>
            )}
          </div>
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `2px solid ${T.border}`, display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 800 }}>
            <span>Total</span><span style={{ color: T.main }}>{fmt(kpi.totalValue)}</span>
          </div>
        </KpiModal>
      )}

      {modal === 'instock' && (
        <KpiModal title="Produits en stock" onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {products.filter(p => p.stock_qty > 0).map(p => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontWeight: 600 }}>{p.name}</span>
                <span style={{ color: T.green, fontWeight: 700 }}>{p.stock_qty} unités</span>
              </div>
            ))}
          </div>
        </KpiModal>
      )}

      {modal === 'low' && (
        <KpiModal title="Produits en stock bas" onClose={() => setModal(null)}>
          {lowProducts.length === 0 ? (
            <div style={{ textAlign: "center", color: T.textMid, padding: "20px 0" }}>Aucun produit en alerte.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lowProducts.map(p => (
                <div key={p.id} style={{ background: T.orangeBg, borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontWeight: 700, color: T.text }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: T.orange, marginTop: 2 }}>Stock actuel: {p.stock_qty} — Minimum: {p.min_stock}</div>
                </div>
              ))}
            </div>
          )}
        </KpiModal>
      )}

      {modal === 'out' && (
        <KpiModal title="Produits en rupture de stock" onClose={() => setModal(null)}>
          {outProducts.length === 0 ? (
            <div style={{ textAlign: "center", color: T.textMid, padding: "20px 0" }}>Aucune rupture.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {outProducts.map(p => (
                <div key={p.id} style={{ background: T.redBg, borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontWeight: 700, color: T.red }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: T.textMid, marginTop: 2 }}>Stock: 0 unités — Minimum requis: {p.min_stock}</div>
                </div>
              ))}
            </div>
          )}
        </KpiModal>
      )}

      {modal === 'reserved' && (
        <KpiModal title="Unités réservées" onClose={() => setModal(null)}>
          <div style={{ fontSize: 13, color: T.textMid, marginBottom: 14 }}>Unités réservées par des pickup tickets en statut "Préparé" ou "Prêt au ramassage" (non encore récupérés).</div>
          {reservedProducts.length === 0 ? (
            <div style={{ textAlign: "center", color: T.textMid, padding: "20px 0" }}>Aucune réservation active.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {reservedProducts.map(p => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                  <span><strong style={{ color: T.orange }}>{p.reserved_qty}</strong> réservé(s) / {p.available_qty} disponible(s)</span>
                </div>
              ))}
            </div>
          )}
        </KpiModal>
      )}

      {modal === 'lastrecep' && (
        <KpiModal title="Dernière réception de stock" onClose={() => setModal(null)}>
          {kpi.lastReceptionDate ? (
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, color: T.main, marginBottom: 8 }}>{fmtDate(kpi.lastReceptionDate)}</div>
              <div style={{ fontSize: 13, color: T.textMid }}>Dernière entrée de stock enregistrée dans le système.</div>
            </div>
          ) : (
            <div style={{ textAlign: "center", color: T.textMid, padding: "20px 0" }}>Aucune réception enregistrée.</div>
          )}
        </KpiModal>
      )}

      {modal === 'monthmov' && (
        <KpiModal title="Mouvements ce mois" onClose={() => setModal(null)}>
          <div style={{ fontSize: 13, color: T.textMid, marginBottom: 14 }}>Total des unités entrées (réceptions) et sorties (pickups, commandes, échantillons) ce mois-ci.</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: T.main }}>{kpi.monthlyMovementsValue} unités</div>
        </KpiModal>
      )}

      {(modal === 'units') && (
        <KpiModal title="Unités totales en stock" onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {products.filter(p => p.stock_qty > 0).map(p => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontWeight: 600 }}>{p.name}</span>
                <span style={{ color: T.main, fontWeight: 700 }}>{p.stock_qty}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: `2px solid ${T.border}`, display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 14 }}>
            <span>Total</span><span style={{ color: T.main }}>{kpi.totalUnits}</span>
          </div>
        </KpiModal>
      )}
    </>
  );
}
