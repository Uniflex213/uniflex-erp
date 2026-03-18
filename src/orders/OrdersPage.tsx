import React, { useState, useMemo } from "react";
import { Order, STATUS_CONFIG, OrderStatus, ORDER_BILLING_LABELS, ORDER_BILLING_COLORS, OrderBillingStatus } from "./orderTypes";
import OrderDetailView from "./OrderDetailView";
import { T } from "../theme";

const fmt = (n: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const TruckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="3" width="15" height="13" rx="1"/>
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
    <circle cx="5.5" cy="18.5" r="2.5"/>
    <circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);

function BillingBadge({ status }: { status?: OrderBillingStatus }) {
  const s = ORDER_BILLING_COLORS[status ?? "unbilled"];
  return (
    <span style={{ background: s.bg, color: s.color, padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
      {ORDER_BILLING_LABELS[status ?? "unbilled"]}
    </span>
  );
}

interface Props {
  onNewOrder: () => void;
  orders: Order[];
  onRemoveOrder: (id: string) => void;
  onUpdateOrder: (id: string, updates: Partial<Order>) => void | Promise<void>;
}

const pulseStyle = `
@keyframes orderBtnPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.4), 0 4px 16px rgba(99,102,241,0.3); }
  50% { box-shadow: 0 0 0 8px rgba(99,102,241,0), 0 4px 24px rgba(99,102,241,0.5); }
}
`;

const SECTION_CONFIG: {
  key: "pending" | "ongoing" | "completed";
  label: string;
  statuses: OrderStatus[];
  color: string;
  bg: string;
  borderColor: string;
}[] = [
  {
    key: "pending",
    label: "En attente",
    statuses: ["pending_approval", "en_revision", "rejected"],
    color: "#b45309",
    bg: "#fffbeb",
    borderColor: "#fde68a",
  },
  {
    key: "ongoing",
    label: "En cours",
    statuses: ["en_production", "produced", "shipped"],
    color: "#1d4ed8",
    bg: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  {
    key: "completed",
    label: "Complétée",
    statuses: ["completed"],
    color: "#15803d",
    bg: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
];

function WithdrawModal({ orderId, orderClient, onConfirm, onCancel }: { orderId: string; orderClient: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(230,228,224,0.35)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: T.bgCard, borderRadius: 14, padding: 28, maxWidth: 420, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 10 }}>Retirer la demande</div>
        <p style={{ fontSize: 13, color: T.textMid, lineHeight: 1.6, marginBottom: 24 }}>
          Êtes-vous sûr de vouloir retirer la demande de commande <strong style={{ color: T.text }}>{orderId}</strong> pour <strong style={{ color: T.text }}>{orderClient}</strong> ? Elle sera supprimée définitivement.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "9px 18px", background: "#f4f5f9", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: T.textMid, fontFamily: "inherit" }}>
            Annuler
          </button>
          <button onClick={onConfirm} style={{ padding: "9px 18px", background: T.red, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#fff", fontFamily: "inherit" }}>
            Oui, retirer la demande
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderRow({ order, onClick, isLast, onWithdraw }: { order: Order; onClick: () => void; isLast: boolean; onWithdraw?: (e: React.MouseEvent) => void }) {
  const cfg = STATUS_CONFIG[order.status];
  return (
    <tr
      onClick={onClick}
      style={{ borderBottom: isLast ? "none" : `1px solid ${T.border}`, cursor: "pointer", transition: "background 0.15s" }}
      onMouseOver={e => (e.currentTarget as HTMLTableRowElement).style.background = "#f8f9ff"}
      onMouseOut={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}
    >
      <td style={{ padding: "12px 16px", fontWeight: 700, color: T.main, fontFamily: "monospace", fontSize: 12 }}>{order.id}</td>
      <td style={{ padding: "12px 16px", color: T.textMid }}>{order.date}</td>
      <td style={{ padding: "12px 16px", fontWeight: 600 }}>{order.client}</td>
      <td style={{ padding: "12px 16px", color: T.textMid }}>{order.motif}</td>
      <td style={{ padding: "12px 16px", fontWeight: 800, color: T.text }}>{fmt(order.total)}</td>
      <td style={{ padding: "12px 16px" }}>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
          background: order.destination === "CANADA" ? "#dcfce7" : order.destination === "USA" ? "#dbeafe" : "#f3f4f6",
          color: order.destination === "CANADA" ? "#15803d" : order.destination === "USA" ? "#1d4ed8" : "#374151",
        }}>
          {order.destination}
        </span>
      </td>
      <td style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ background: cfg.bg, color: cfg.color, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
            {order.status === "shipped" && <TruckIcon />}
            {cfg.label}
          </span>
          {["en_production", "produced", "shipped", "completed"].includes(order.status) && (
            <BillingBadge status={order.billing_status} />
          )}
          {order.status === "pending_approval" && onWithdraw && (
            <button
              onClick={onWithdraw}
              style={{
                padding: "3px 8px", background: T.redBg, border: `1px solid rgba(255,59,48,0.3)`,
                borderRadius: 5, fontSize: 10, fontWeight: 700, color: T.red, cursor: "pointer",
                fontFamily: "inherit", whiteSpace: "nowrap",
              }}
            >
              Retirer
            </button>
          )}
        </div>
      </td>
      <td style={{ padding: "12px 16px" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.textLight} strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
      </td>
    </tr>
  );
}

function OrderSection({
  label, orders, color, bg, borderColor, onSelect, onWithdraw,
}: {
  label: string;
  orders: Order[];
  color: string;
  bg: string;
  borderColor: string;
  onSelect: (o: Order) => void;
  onWithdraw: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ marginBottom: 20 }}>
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          background: bg, border: `1px solid ${borderColor}`,
          borderRadius: collapsed ? 10 : "10px 10px 0 0",
          padding: "12px 16px", cursor: "pointer", fontFamily: "inherit",
          transition: "border-radius 0.15s",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 800, color }}>{label}</span>
        <span style={{ background: color, color: "#fff", borderRadius: 20, fontSize: 11, fontWeight: 800, padding: "2px 10px", minWidth: 24, textAlign: "center" }}>
          {orders.length}
        </span>
        <span style={{ marginLeft: "auto", display: "flex", color, transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        </span>
      </button>

      {!collapsed && (
        <div style={{ background: T.card, borderRadius: "0 0 10px 10px", border: `1px solid ${borderColor}`, borderTop: "none", overflow: "hidden" }}>
          {orders.length === 0 ? (
            <div style={{ padding: "28px 16px", textAlign: "center", color: T.textLight, fontSize: 13 }}>
              Aucune commande dans cette section
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8f9fb" }}>
                  {["# Commande", "Date", "Client", "Motif", "Montant total", "Destination", "État", ""].map(h => (
                    <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3, color: T.textLight, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order, i) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onClick={() => onSelect(order)}
                    isLast={i === orders.length - 1}
                    onWithdraw={order.status === "pending_approval" ? (e) => { e.stopPropagation(); onWithdraw(order.id); } : undefined}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage({ onNewOrder, orders, onRemoveOrder, onUpdateOrder }: Props) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<Order | null>(null);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterAmtMin, setFilterAmtMin] = useState("");
  const [filterAmtMax, setFilterAmtMax] = useState("");
  const [filterMotif, setFilterMotif] = useState("");
  const [filterZip, setFilterZip] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [activeFilters, setActiveFilters] = useState({
    dateFrom: "", dateTo: "", amtMin: "", amtMax: "", motif: "", zip: "", client: "",
  });

  const applyFilters = () => {
    setActiveFilters({ dateFrom: filterDateFrom, dateTo: filterDateTo, amtMin: filterAmtMin, amtMax: filterAmtMax, motif: filterMotif, zip: filterZip, client: filterClient });
  };

  const resetFilters = () => {
    setFilterDateFrom(""); setFilterDateTo(""); setFilterAmtMin(""); setFilterAmtMax("");
    setFilterMotif(""); setFilterZip(""); setFilterClient("");
    setActiveFilters({ dateFrom: "", dateTo: "", amtMin: "", amtMax: "", motif: "", zip: "", client: "" });
  };

  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (activeFilters.dateFrom && o.date < activeFilters.dateFrom) return false;
      if (activeFilters.dateTo && o.date > activeFilters.dateTo) return false;
      if (activeFilters.amtMin && o.total < Number(activeFilters.amtMin)) return false;
      if (activeFilters.amtMax && o.total > Number(activeFilters.amtMax)) return false;
      if (activeFilters.motif && o.motif !== activeFilters.motif) return false;
      if (activeFilters.zip && !o.deliveryAddress.toLowerCase().includes(activeFilters.zip.toLowerCase())) return false;
      if (activeFilters.client && !o.client.toLowerCase().includes(activeFilters.client.toLowerCase()) && !o.clientId.toLowerCase().includes(activeFilters.client.toLowerCase())) return false;
      return true;
    });
  }, [orders, activeFilters]);

  const sections = useMemo(() =>
    SECTION_CONFIG.map(s => ({
      ...s,
      orders: filtered.filter(o => s.statuses.includes(o.status)),
    })),
    [filtered]
  );

  const handleWithdrawConfirm = () => {
    if (withdrawTarget) {
      onRemoveOrder(withdrawTarget.id);
      if (selectedOrder?.id === withdrawTarget.id) setSelectedOrder(null);
      setWithdrawTarget(null);
    }
  };

  if (selectedOrder) {
    const liveOrder = orders.find(o => o.id === selectedOrder.id) ?? selectedOrder;
    return <OrderDetailView order={liveOrder} onBack={() => setSelectedOrder(null)} onUpdateOrder={onUpdateOrder} />;
  }

  const inputStyle: React.CSSProperties = {
    border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 12px",
    fontSize: 13, fontFamily: "inherit", outline: "none", background: T.bgCard,
    color: T.text, width: "100%", boxSizing: "border-box",
  };

  return (
    <div>
      <style>{pulseStyle}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800 }}>Commandes</h2>
          <p style={{ margin: 0, color: T.textMid, fontSize: 14 }}>{filtered.length} commande(s)</p>
        </div>
        <button
          onClick={onNewOrder}
          style={{
            background: T.main, color: "#fff", border: "none", borderRadius: 10,
            padding: "11px 22px", fontSize: 13, fontWeight: 800, cursor: "pointer",
            fontFamily: "inherit", letterSpacing: 0.3,
            animation: "orderBtnPulse 2.5s ease-in-out infinite",
          }}
        >
          + PASSER UNE COMMANDE
        </button>
      </div>

      {orders.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "80px 20px", background: T.card, borderRadius: 14, border: `1px dashed ${T.border}`,
        }}>
          <div style={{ color: "#d1d5db", marginBottom: 16 }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 8 }}>Aucune commande</div>
          <div style={{ fontSize: 13, color: T.textMid, marginBottom: 28 }}>Cliquez sur PASSER UNE COMMANDE pour commencer</div>
          <button
            onClick={onNewOrder}
            style={{
              background: T.main, color: "#fff", border: "none", borderRadius: 10,
              padding: "12px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer",
              fontFamily: "inherit", animation: "orderBtnPulse 2.5s ease-in-out infinite",
            }}
          >
            + PASSER UNE COMMANDE
          </button>
        </div>
      ) : (
        <>
          <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 16, marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: "1 1 180px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", marginBottom: 4 }}>Date début</div>
                <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ flex: "1 1 180px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", marginBottom: 4 }}>Date fin</div>
                <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ flex: "1 1 120px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", marginBottom: 4 }}>Montant min</div>
                <input type="number" placeholder="0" value={filterAmtMin} onChange={e => setFilterAmtMin(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ flex: "1 1 120px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", marginBottom: 4 }}>Montant max</div>
                <input type="number" placeholder="∞" value={filterAmtMax} onChange={e => setFilterAmtMax(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ flex: "1 1 160px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", marginBottom: 4 }}>Motif</div>
                <select value={filterMotif} onChange={e => setFilterMotif(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">Tous</option>
                  {["Restock", "Dropship client", "Sample", "Gros client", "Autre"].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: "1 1 140px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", marginBottom: 4 }}>Code postal</div>
                <input placeholder="H3A, 98101..." value={filterZip} onChange={e => setFilterZip(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ flex: "1 1 160px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", marginBottom: 4 }}>Client</div>
                <input placeholder="Nom du client..." value={filterClient} onChange={e => setFilterClient(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <button onClick={applyFilters} style={{ background: T.main, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                  Filtrer
                </button>
                <button onClick={resetFilters} style={{ background: "#f4f5f9", color: T.textMid, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>

          {sections.map(s => (
            <OrderSection
              key={s.key}
              label={s.label}
              orders={s.orders}
              color={s.color}
              bg={s.bg}
              borderColor={s.borderColor}
              onSelect={setSelectedOrder}
              onWithdraw={(id) => {
                const order = orders.find(o => o.id === id);
                if (order) setWithdrawTarget(order);
              }}
            />
          ))}
        </>
      )}

      {withdrawTarget && (
        <WithdrawModal
          orderId={withdrawTarget.id}
          orderClient={withdrawTarget.client}
          onConfirm={handleWithdrawConfirm}
          onCancel={() => setWithdrawTarget(null)}
        />
      )}
    </div>
  );
}
