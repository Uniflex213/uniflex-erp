import React, { useState, useEffect, useRef } from "react";
import { Order, ORDER_BILLING_LABELS, ORDER_BILLING_COLORS, OrderBillingStatus } from "./orderTypes";
import { logChange } from "../shared/changeLogUtils";
import { T } from "../theme";

export const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export const TruckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="3" width="15" height="13" rx="1"/>
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
    <circle cx="5.5" cy="18.5" r="2.5"/>
    <circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);

export const EyeIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

export const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export const ReceiptIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

export function BillingBadge({ status }: { status?: OrderBillingStatus }) {
  const s = ORDER_BILLING_COLORS[status ?? "unbilled"];
  return (
    <span style={{ background: s.bg, color: s.color, padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      {ORDER_BILLING_LABELS[status ?? "unbilled"]}
    </span>
  );
}

export function FinancialSummary({ order }: { order: Order }) {
  const subtotalAfterDiscount = order.subtotalAfterDiscount ?? (order.subtotal - (order.discount ?? 0));
  const shippingAmt = order.deliveryType === "Add Shipping" ? (order.shippingCost ?? 0) : 0;
  const Divider = () => <div style={{ borderTop: `1px solid ${T.divider}`, margin: "6px 0" }} />;
  const Row = ({ label, value, bold, red, muted }: { label: React.ReactNode; value: string; bold?: boolean; red?: boolean; muted?: boolean }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }}>
      <span style={{ fontSize: 13, color: muted ? T.textLight : T.textMid }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 500, color: red ? "#dc2626" : muted ? T.textLight : T.text }}>{value}</span>
    </div>
  );

  return (
    <div>
      <Row label="Sous-total produits" value={fmt(order.subtotal)} bold />
      {order.discount != null && order.discount > 0 && (
        <Row label={`Rabais${order.discountType ? ` (${order.discountValue}${order.discountType})` : ""}`} value={`-${fmt(order.discount)}`} red />
      )}
      <Divider />
      <Row label="Sous-total après rabais" value={fmt(subtotalAfterDiscount)} bold />
      <Row
        label="Shipping"
        value={order.deliveryType === "Add Shipping" ? fmt(shippingAmt) : "N/A"}
        muted={order.deliveryType !== "Add Shipping"}
      />
      {order.taxLines && order.taxLines.length > 0 ? (
        <>
          <Divider />
          {order.taxLines.map(t => <Row key={t.label} label={t.label} value={fmt(t.amount)} />)}
        </>
      ) : (
        <>
          <Divider />
          <Row label="Taxes" value={order.destination === "CANADA" ? "N/C" : "N/A — Hors Canada"} muted />
        </>
      )}
      {order.extraFees != null && order.extraFees > 0 && (
        <>
          <Divider />
          <Row label="Extra fees" value={fmt(order.extraFees)} />
        </>
      )}
      <div style={{ borderTop: `2px solid ${T.main}22`, marginTop: 8, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 14, fontWeight: 800 }}>TOTAL</span>
        <span style={{ fontSize: 22, fontWeight: 800, color: T.main }}>{fmt(order.total)}</span>
      </div>
    </div>
  );
}

export function BillingDropdown({ order, onUpdate }: { order: Order; onUpdate: (id: string, updates: Partial<Order>) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const options: { key: OrderBillingStatus; label: string }[] = [
    { key: "unbilled", label: "Non-facturé" },
    { key: "sent", label: "Envoyé à SCI" },
    { key: "billed_by_sci", label: "Facturé par SCI" },
  ];

  const current = order.billing_status ?? "unbilled";

  const handleSelect = (key: OrderBillingStatus) => {
    onUpdate(order.id, { billing_status: key });
    logChange({
      entity_type: "order", entity_id: order.id, entity_label: order.id,
      field_name: "Facturation", old_value: current, new_value: key,
      change_type: "field_edit", changed_by: "Admin",
    });
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: "#f0fdf4", color: "#15803d", border: "1px solid #86efac",
          borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
        }}
      >
        <ReceiptIcon /> Facturer
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, background: T.bgCard,
          border: `1px solid ${T.border}`, borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          zIndex: 50, overflow: "hidden", minWidth: 160,
        }}>
          {options.map(opt => {
            const colors = ORDER_BILLING_COLORS[opt.key];
            const isActive = current === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => handleSelect(opt.key)}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "9px 14px", fontSize: 12, fontWeight: isActive ? 800 : 500,
                  background: isActive ? colors.bg : "transparent", color: isActive ? colors.color : T.text,
                  border: "none", cursor: "pointer", fontFamily: "inherit",
                  borderBottom: `1px solid ${T.border}`,
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const adminStyles = `
@keyframes revisionResponseFlash {
  0%   { background-color: #ffffff; }
  15%  { background-color: #ffedd5; }
  30%  { background-color: #fed7aa; }
  50%  { background-color: #ff9f0a22; }
  65%  { background-color: #fed7aa; }
  80%  { background-color: #ffedd5; }
  100% { background-color: #fff7ed; }
}
.revision-response-row {
  animation: revisionResponseFlash 1.4s ease-in-out 4 forwards;
  background-color: #fff7ed !important;
}
.revision-response-row td:first-child {
  border-left: 3px solid #ff9f0a;
}
`;
