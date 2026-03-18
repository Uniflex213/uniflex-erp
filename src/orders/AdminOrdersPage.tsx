import React, { useState, useEffect } from "react";
import { Order, STATUS_CONFIG, ShippingInfo, OrderBillingStatus, OrderStatus } from "./orderTypes";
import { supabase } from "../supabaseClient";
import { logChange } from "../shared/changeLogUtils";
import { T } from "../theme";
import { fmt, TruckIcon, EyeIcon, CloseIcon, BillingBadge, FinancialSummary, BillingDropdown, adminStyles } from "./adminOrderHelpers";

interface Props {
  orders: Order[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => void | Promise<void>;
}

type ModalType = "shipping" | null;
type DetailAction = "confirm" | "revision" | "reject" | null;
type AdminTab = OrderStatus | "all";

const TAB_CONFIG: { key: AdminTab; label: string }[] = [
  { key: "pending_approval", label: "À confirmer" },
  { key: "en_revision", label: "En révision" },
  { key: "en_production", label: "En production" },
  { key: "produced", label: "Produite / à facturer" },
  { key: "shipped", label: "En route" },
  { key: "completed", label: "Complétée" },
  { key: "rejected", label: "Annulée" },
  { key: "all", label: "Toutes" },
];

interface ClientInfo {
  email: string;
  phone: string;
  contact_first_name: string;
  contact_last_name: string;
  billing_address: string;
  billing_city: string;
  billing_province: string;
  billing_postal_code: string;
}

export default function AdminOrdersPage({ orders, onUpdateOrder }: Props) {
  const [activeTab, setActiveTab] = useState<AdminTab>("pending_approval");
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [detailAction, setDetailAction] = useState<DetailAction>(null);
  const [adminNote, setAdminNote] = useState("");
  const [revisionComment, setRevisionComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [shippingCarrier, setShippingCarrier] = useState("");
  const [shippingTracking, setShippingTracking] = useState("");
  const [shippingEta, setShippingEta] = useState("");
  const [delayEta, setDelayEta] = useState("");
  const [showDelayInput, setShowDelayInput] = useState(false);
  const [modalClient, setModalClient] = useState<ClientInfo | null>(null);

  useEffect(() => {
    if (!viewOrder?.clientId) { setModalClient(null); return; }
    supabase
      .from("clients")
      .select("email, phone, contact_first_name, contact_last_name, billing_address, billing_city, billing_province, billing_postal_code")
      .eq("id", viewOrder.clientId)
      .maybeSingle()
      .then(({ data }) => setModalClient(data ?? null));
  }, [viewOrder?.clientId]);

  const displayed = activeTab === "all" ? orders : orders.filter(o => o.status === activeTab);

  const inputStyle: React.CSSProperties = {
    border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px",
    fontSize: 13, fontFamily: "inherit", outline: "none", background: T.bgCard,
    color: T.text, width: "100%", boxSizing: "border-box",
  };

  const openView = (order: Order) => {
    setViewOrder(order);
    setDetailAction(null);
    setAdminNote(""); setRevisionComment(""); setRejectReason("");
  };

  const closeView = () => {
    setViewOrder(null);
    setDetailAction(null);
    setModalClient(null);
  };

  const handleConfirm = () => {
    if (!viewOrder) return;
    onUpdateOrder(viewOrder.id, { status: "en_production", adminNote });
    logChange({
      entity_type: "order", entity_id: viewOrder.id, entity_label: viewOrder.id,
      field_name: "Statut", old_value: viewOrder.status, new_value: "en_production",
      change_type: "status_change", changed_by: "Admin",
      note: adminNote || null,
    });
    closeView();
  };

  const handleRevision = () => {
    if (!viewOrder || !revisionComment.trim()) return;
    onUpdateOrder(viewOrder.id, { status: "en_revision", revisionComment });
    logChange({
      entity_type: "order", entity_id: viewOrder.id, entity_label: viewOrder.id,
      field_name: "Statut", old_value: viewOrder.status, new_value: "en_revision",
      change_type: "status_change", changed_by: "Admin",
      note: revisionComment,
    });
    closeView();
  };

  const handleReject = () => {
    if (!viewOrder || !rejectReason.trim()) return;
    onUpdateOrder(viewOrder.id, { status: "rejected", rejectionReason: rejectReason });
    logChange({
      entity_type: "order", entity_id: viewOrder.id, entity_label: viewOrder.id,
      field_name: "Statut", old_value: viewOrder.status, new_value: "rejected",
      change_type: "status_change", changed_by: "Admin",
      note: rejectReason,
    });
    closeView();
  };

  const handleMarkProduced = (order: Order) => {
    onUpdateOrder(order.id, { status: "produced" });
    logChange({
      entity_type: "order", entity_id: order.id, entity_label: order.id,
      field_name: "Statut", old_value: order.status, new_value: "produced",
      change_type: "status_change", changed_by: "Admin",
    });
  };

  const handleShipUpdate = () => {
    if (!selectedOrder) return;
    const trackNums = shippingTracking.split(",").map(s => s.trim()).filter(Boolean);
    onUpdateOrder(selectedOrder.id, {
      shipping: {
        carrier: shippingCarrier,
        trackingNumbers: [...(selectedOrder.shipping?.trackingNumbers || []), ...trackNums],
        eta: shippingEta,
      },
    });
    logChange({
      entity_type: "order", entity_id: selectedOrder.id, entity_label: selectedOrder.id,
      field_name: "Expédition", old_value: null, new_value: `${shippingCarrier} — ${trackNums.join(", ")} — ETA: ${shippingEta}`,
      change_type: "field_edit", changed_by: "Admin",
    });
    setModalType(null);
  };

  const handleMarkShipped = () => {
    if (!selectedOrder) return;
    const trackNums = shippingTracking.split(",").map(s => s.trim()).filter(Boolean);
    onUpdateOrder(selectedOrder.id, {
      status: "shipped",
      shipping: {
        carrier: shippingCarrier,
        trackingNumbers: trackNums.length ? trackNums : (selectedOrder.shipping?.trackingNumbers || []),
        eta: shippingEta,
      },
    });
    logChange({
      entity_type: "order", entity_id: selectedOrder.id, entity_label: selectedOrder.id,
      field_name: "Statut", old_value: selectedOrder.status, new_value: "shipped",
      change_type: "status_change", changed_by: "Admin",
      note: `${shippingCarrier} — ${trackNums.join(", ")} — ETA: ${shippingEta}`,
    });
    setModalType(null);
  };

  const handleMarkCompleted = (order: Order) => {
    onUpdateOrder(order.id, { status: "completed" });
    logChange({
      entity_type: "order", entity_id: order.id, entity_label: order.id,
      field_name: "Statut", old_value: order.status, new_value: "completed",
      change_type: "status_change", changed_by: "Admin",
    });
  };

  const handleDelay = (order: Order) => {
    if (!delayEta) return;
    onUpdateOrder(order.id, { shipping: { ...(order.shipping as ShippingInfo), delayed: true, newEta: delayEta } });
    logChange({
      entity_type: "order", entity_id: order.id, entity_label: order.id,
      field_name: "Délai signalé", old_value: order.shipping?.eta || null, new_value: delayEta,
      change_type: "field_edit", changed_by: "Admin",
    });
    setShowDelayInput(false);
  };

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontSize: 11, fontWeight: 800, color: T.textLight, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>{children}</div>
  );

  const InfoField = ({ label, value }: { label: string; value?: string }) => (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{value || "—"}</div>
    </div>
  );

  const showBillingBadge = (o: Order) => ["en_production", "produced", "shipped", "completed"].includes(o.status);

  return (
    <div>
      <style>{adminStyles}</style>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800 }}>Commandes — Vue Admin</h2>
        <p style={{ margin: 0, color: T.textMid, fontSize: 14 }}>Gestion et approbation des commandes</p>
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        {([
          ["À confirmer", orders.filter(o => o.status === "pending_approval").length, T.orange, T.orangeBg],
          ["En révision", orders.filter(o => o.status === "en_revision").length, "#c2410c", "#ffedd5"],
          ["En production", orders.filter(o => o.status === "en_production").length, T.blue, T.blueBg],
          ["Produite", orders.filter(o => o.status === "produced").length, "#0f766e", "#ccfbf1"],
          ["En route", orders.filter(o => o.status === "shipped").length, "#0e7490", "#cffafe"],
          ["Complétées", orders.filter(o => o.status === "completed").length, T.green, T.greenBg],
        ] as [string, number, string, string][]).map(([label, count, color, bg]) => (
          <div key={label} style={{ flex: "1 1 100px", background: bg, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color }}>{count}</div>
            <div style={{ fontSize: 12, color, fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {TAB_CONFIG.map(({ key, label }) => {
          const count = key === "all" ? orders.length : orders.filter(o => o.status === key).length;
          const isActive = activeTab === key;
          const cfg = key === "all" ? { color: T.main, bg: "#f0f1ff" } : { color: STATUS_CONFIG[key as OrderStatus].color, bg: STATUS_CONFIG[key as OrderStatus].bg };
          const hasNewResponses = key === "en_revision" && orders.filter(o => o.status === "en_revision").some(o => o.revisionResponse);
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                background: isActive ? cfg.color : "#fff",
                color: isActive ? "#fff" : T.textMid,
                border: `1px solid ${isActive ? cfg.color : T.border}`,
                borderRadius: 8, padding: "7px 14px", fontSize: 12,
                fontWeight: isActive ? 700 : 500, cursor: "pointer", fontFamily: "inherit",
                position: "relative", transition: "all 0.15s",
              }}
            >
              {label}
              <span style={{
                background: isActive ? "rgba(255,255,255,0.25)" : cfg.bg,
                color: isActive ? "#fff" : cfg.color,
                borderRadius: 20, fontSize: 10, fontWeight: 800, padding: "2px 7px", minWidth: 18, textAlign: "center",
              }}>{count}</span>
              {hasNewResponses && (
                <span style={{ position: "absolute", top: -4, right: -4, width: 9, height: 9, background: "#ff9f0a", borderRadius: "50%", border: "2px solid #fff" }} />
              )}
            </button>
          );
        })}
      </div>

      <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8f9fb" }}>
              {["# Commande", "Date", "Vendeur / Client", "Montant", "État", "Facturation", "Actions"].map(h => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3, color: T.textLight, borderBottom: `1px solid ${T.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: "40px 16px", textAlign: "center", color: T.textLight }}>Aucune commande</td></tr>
            ) : displayed.map((order, i) => {
              const cfg = STATUS_CONFIG[order.status];
              const canShip = order.status === "produced" || order.status === "shipped";
              const canComplete = order.status === "shipped";
              const canMarkProduced = order.status === "en_production";
              const canBill = ["en_production", "produced", "shipped", "completed"].includes(order.status);
              const hasRevisionResponse = order.status === "en_revision" && !!order.revisionResponse;
              return (
                <tr
                  key={order.id}
                  className={hasRevisionResponse ? "revision-response-row" : undefined}
                  style={{ borderBottom: i < displayed.length - 1 ? `1px solid ${T.border}` : "none" }}
                >
                  <td style={{ padding: "12px 16px" }}>
                    <button onClick={() => openView(order)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit", padding: 0 }}>
                      <span style={{ fontWeight: 700, color: T.main, fontSize: 13 }}>{order.id}</span>
                      <span style={{ color: T.textLight }}><EyeIcon /></span>
                    </button>
                  </td>
                  <td style={{ padding: "12px 16px", color: T.textMid }}>{order.date}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 700 }}>{order.client}</div>
                    <div style={{ fontSize: 11, color: T.textLight }}>{order.vendeurCode}</div>
                  </td>
                  <td style={{ padding: "12px 16px", fontWeight: 800 }}>{fmt(order.total)}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ background: cfg.bg, color: cfg.color, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", width: "fit-content" }}>
                        {order.status === "shipped" && <TruckIcon />}
                        {cfg.label}
                      </span>
                      {hasRevisionResponse && (
                        <span style={{ background: "#4ade80", color: "#15803d", padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 4, width: "fit-content", whiteSpace: "nowrap" }}>
                          Réponse reçue
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {showBillingBadge(order) && <BillingBadge status={order.billing_status} />}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button onClick={() => openView(order)} style={{ background: "#f0f1ff", color: T.main, border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                        <EyeIcon /> Voir
                      </button>
                      {canMarkProduced && (
                        <button onClick={() => handleMarkProduced(order)} style={{ background: "#ccfbf1", color: "#0f766e", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                          Produite
                        </button>
                      )}
                      {canShip && (
                        <button onClick={() => { setSelectedOrder(order); setShippingCarrier(order.shipping?.carrier || ""); setShippingEta(order.shipping?.eta || ""); setShippingTracking(""); setModalType("shipping"); }} style={{ background: T.blueBg, color: T.blue, border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                          <TruckIcon /> Shipping
                        </button>
                      )}
                      {canComplete && (
                        <button onClick={() => handleMarkCompleted(order)} style={{ background: T.greenBg, color: "#15803d", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                          Compléter
                        </button>
                      )}
                      {order.status === "shipped" && !order.shipping?.delayed && (
                        <button onClick={() => { setSelectedOrder(order); setShowDelayInput(true); }} style={{ background: T.orangeBg, color: "#c2410c", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                          Délai
                        </button>
                      )}
                      {canBill && (
                        <BillingDropdown order={order} onUpdate={onUpdateOrder} />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {viewOrder && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(230,228,224,0.85)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, overflowY: "auto", padding: "16px" }}>
          <div style={{ background: "#f4f5f9", borderRadius: 16, width: "80%", maxWidth: 1100, boxShadow: "0 32px 80px rgba(0,0,0,0.25)", position: "relative" }}>
            <div style={{ background: T.card, borderRadius: "16px 16px 0 0", padding: "24px 28px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: T.main }}>{viewOrder.id}</span>
                  <span style={{ background: STATUS_CONFIG[viewOrder.status].bg, color: STATUS_CONFIG[viewOrder.status].color, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                    {viewOrder.status === "shipped" && <TruckIcon />}
                    {STATUS_CONFIG[viewOrder.status].label}
                  </span>
                  {showBillingBadge(viewOrder) && <BillingBadge status={viewOrder.billing_status} />}
                </div>
                <div style={{ fontSize: 13, color: T.textMid }}>
                  {viewOrder.date} · Agent : <strong style={{ color: T.text }}>{viewOrder.vendeurCode}</strong> · Créé par : <strong style={{ color: T.text }}>{(viewOrder as any).createdBy || viewOrder.vendeurCode}</strong>
                </div>
              </div>
              <button onClick={closeView} style={{ background: "#f4f5f9", border: `1px solid ${T.border}`, borderRadius: 8, padding: 8, cursor: "pointer", display: "flex", alignItems: "center", color: T.textMid }}>
                <CloseIcon />
              </button>
            </div>

            <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 20 }}>
                  <SectionTitle>1 — Contexte de la commande</SectionTitle>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
                    <InfoField label="Motif" value={viewOrder.motif + (viewOrder.motifAutre ? ` — ${viewOrder.motifAutre}` : "")} />
                    <InfoField label="Code vendeur" value={viewOrder.vendeurCode} />
                    <InfoField label="Type de livraison" value={viewOrder.deliveryType} />
                    <InfoField label="Destination" value={viewOrder.destination + (viewOrder.destinationAutre ? ` — ${viewOrder.destinationAutre}` : "") + (viewOrder.province ? ` (${viewOrder.province})` : "")} />
                    <InfoField label="Label" value={viewOrder.label} />
                    <InfoField label="Statut" value={STATUS_CONFIG[viewOrder.status].label} />
                  </div>
                </div>

                <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 20 }}>
                  <SectionTitle>2 — Informations client</SectionTitle>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
                    <InfoField label="Compagnie" value={viewOrder.client} />
                    <InfoField label="Email" value={modalClient?.email} />
                    <InfoField label="Téléphone" value={modalClient?.phone} />
                    <InfoField label="Contact" value={[modalClient?.contact_first_name, modalClient?.contact_last_name].filter(Boolean).join(" ") || undefined} />
                    <div style={{ gridColumn: "1 / -1" }}>
                      <InfoField label="Adresse de facturation" value={[modalClient?.billing_address, modalClient?.billing_city, modalClient?.billing_province, modalClient?.billing_postal_code].filter(Boolean).join(", ") || "—"} />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <InfoField label="Adresse de livraison" value={viewOrder.deliveryAddress} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 20 }}>
                <SectionTitle>3 — Produits commandés</SectionTitle>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8f9fb" }}>
                      {["#", "Produit", "Format", "Qté", "Prix négocié", "Unité", "Sous-total ligne"].map((h, j) => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: j >= 3 ? "right" : "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.3, color: T.textLight, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {viewOrder.products.map((p, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td style={{ padding: "10px 12px", color: T.textLight, fontSize: 11 }}>{i + 1}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 700 }}>{p.product}</td>
                        <td style={{ padding: "10px 12px", color: T.textMid, fontSize: 12 }}>{p.format}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right" }}>{p.qty}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmt(p.price)}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: T.textMid, fontSize: 11 }}>{p.unit}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>{fmt(p.qty * p.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 20 }}>
                  <SectionTitle>4 — Résumé financier</SectionTitle>
                  <FinancialSummary order={viewOrder} />
                </div>

                <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 20 }}>
                  <SectionTitle>5 — Actions admin</SectionTitle>

                  {(viewOrder.status === "pending_approval" || viewOrder.status === "en_revision") ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {viewOrder.revisionComment && (
                        <div style={{ background: "#ffedd5", borderRadius: 8, padding: "10px 14px", border: "1px solid #fed7aa" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#c2410c", textTransform: "uppercase", marginBottom: 4 }}>Commentaire de révision envoyé</div>
                          <div style={{ fontSize: 13, color: "#7c2d12" }}>{viewOrder.revisionComment}</div>
                        </div>
                      )}
                      {viewOrder.revisionResponse && (
                        <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "12px 14px", border: "2px solid #4ade80", position: "relative" }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "#15803d", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                            Réponse du vendeur
                            <span style={{ marginLeft: 8, background: "#4ade80", color: "#fff", borderRadius: 10, padding: "2px 8px", fontSize: 10 }}>NOUVEAU</span>
                          </div>
                          <div style={{ fontSize: 13, color: "#166534", lineHeight: 1.6 }}>{viewOrder.revisionResponse}</div>
                          {viewOrder.revisionResponseAt && (
                            <div style={{ fontSize: 11, color: "#4ade80", marginTop: 6 }}>{new Date(viewOrder.revisionResponseAt).toLocaleString("fr-CA")}</div>
                          )}
                        </div>
                      )}

                      {detailAction === null && (
                        <div style={{ display: "flex", gap: 10 }}>
                          <button onClick={() => setDetailAction("confirm")} style={{ flex: 1, background: T.greenBg, color: "#15803d", border: "1px solid #86efac", borderRadius: 8, padding: "11px 16px", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                            Confirmer
                          </button>
                          <button onClick={() => setDetailAction("revision")} style={{ flex: 1, background: T.orangeBg, color: "#c2410c", border: "1px solid #fed7aa", borderRadius: 8, padding: "11px 16px", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                            À réviser
                          </button>
                          <button onClick={() => setDetailAction("reject")} style={{ flex: 1, background: T.redBg, color: T.red, border: "1px solid #fca5a5", borderRadius: 8, padding: "11px 16px", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                            Annuler
                          </button>
                        </div>
                      )}

                      {detailAction === "confirm" && (
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", marginBottom: 6 }}>Note optionnelle pour le vendeur</div>
                          <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="Ajouter une note..." rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                            <button onClick={() => setDetailAction(null)} style={{ background: "#f4f5f9", color: T.textMid, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
                            <button onClick={handleConfirm} style={{ flex: 1, background: T.green, color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Confirmer → En production</button>
                          </div>
                        </div>
                      )}

                      {detailAction === "revision" && (
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", marginBottom: 6 }}>Commentaire de révision *</div>
                          <textarea value={revisionComment} onChange={e => setRevisionComment(e.target.value)} placeholder="Expliquer ce qui doit être révisé..." rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                            <button onClick={() => setDetailAction(null)} style={{ background: "#f4f5f9", color: T.textMid, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
                            <button onClick={handleRevision} disabled={!revisionComment.trim()} style={{ flex: 1, background: revisionComment.trim() ? T.orange : "#e5e7eb", color: revisionComment.trim() ? "#fff" : "#9ca3af", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 12, fontWeight: 800, cursor: revisionComment.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}>Envoyer en révision</button>
                          </div>
                        </div>
                      )}

                      {detailAction === "reject" && (
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", marginBottom: 6 }}>Raison de l'annulation *</div>
                          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Expliquer la raison de l'annulation..." rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                            <button onClick={() => setDetailAction(null)} style={{ background: "#f4f5f9", color: T.textMid, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
                            <button onClick={handleReject} disabled={!rejectReason.trim()} style={{ flex: 1, background: rejectReason.trim() ? T.red : "#e5e7eb", color: rejectReason.trim() ? "#fff" : "#9ca3af", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 12, fontWeight: 800, cursor: rejectReason.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}>Annuler la commande</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : viewOrder.status === "rejected" ? (
                    <div style={{ background: "#fee2e2", borderRadius: 10, padding: 16, border: "1px solid #fca5a5" }}>
                      <div style={{ fontWeight: 800, color: "#dc2626", marginBottom: 6 }}>Commande annulée</div>
                      <div style={{ fontSize: 13, color: "#7f1d1d" }}>{viewOrder.rejectionReason || "—"}</div>
                    </div>
                  ) : viewOrder.status === "en_production" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ background: T.blueBg, borderRadius: 10, padding: 16, border: `1px solid #bfdbfe` }}>
                        <div style={{ fontWeight: 800, color: "#1d4ed8", marginBottom: 4 }}>En production</div>
                        <div style={{ fontSize: 13, color: "#1e40af" }}>La commande a été confirmée et est en cours de production.</div>
                        {viewOrder.adminNote && <div style={{ fontSize: 12, color: "#1e40af", marginTop: 8, fontStyle: "italic" }}>Note : {viewOrder.adminNote}</div>}
                      </div>
                      <button
                        onClick={() => { handleMarkProduced(viewOrder); closeView(); }}
                        style={{ background: "#ccfbf1", color: "#0f766e", border: "1px solid #99f6e4", borderRadius: 8, padding: "11px 16px", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Marquer comme produite
                      </button>
                    </div>
                  ) : viewOrder.status === "produced" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ background: "#ccfbf1", borderRadius: 10, padding: 16, border: "1px solid #99f6e4" }}>
                        <div style={{ fontWeight: 800, color: "#0f766e", marginBottom: 4 }}>Produite / à facturer</div>
                        <div style={{ fontSize: 13, color: "#134e4a" }}>La commande est produite et en attente de facturation / expédition.</div>
                      </div>
                      <button
                        onClick={() => { setSelectedOrder(viewOrder); setShippingCarrier(viewOrder.shipping?.carrier || ""); setShippingEta(viewOrder.shipping?.eta || ""); setShippingTracking(""); setModalType("shipping"); closeView(); }}
                        style={{ background: T.blueBg, color: T.blue, border: "none", borderRadius: 8, padding: "11px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}
                      >
                        <TruckIcon /> Expédier la commande
                      </button>
                    </div>
                  ) : viewOrder.status === "shipped" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ background: "#cffafe", borderRadius: 8, padding: 12, border: "1px solid #a5f3fc" }}>
                        <div style={{ fontWeight: 700, color: "#0e7490", marginBottom: 4 }}>En route</div>
                        {viewOrder.shipping && (
                          <>
                            <div style={{ fontSize: 13, color: T.textMid }}>{viewOrder.shipping.carrier} · ETA : {viewOrder.shipping.eta}</div>
                            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {viewOrder.shipping.trackingNumbers.map((tn, i) => (
                                <span key={i} style={{ background: T.bgCard, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontFamily: "monospace", border: "1px solid #a5f3fc" }}>{tn}</span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => { handleMarkCompleted(viewOrder); closeView(); }}
                        style={{ background: T.greenBg, color: "#15803d", border: "1px solid #86efac", borderRadius: 8, padding: "11px 16px", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Marquer comme complétée
                      </button>
                    </div>
                  ) : viewOrder.status === "completed" ? (
                    <div style={{ background: T.greenBg, borderRadius: 10, padding: 16, border: "1px solid #86efac" }}>
                      <div style={{ fontWeight: 800, color: "#15803d" }}>Commande complétée</div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDelayInput && selectedOrder && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(230,228,224,0.85)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: T.bgCard, borderRadius: 16, padding: 28, maxWidth: 400, width: "90%", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>Signaler un délai</div>
            <div style={{ color: T.textMid, fontSize: 13, marginBottom: 16 }}>{selectedOrder.id} · {selectedOrder.client}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", marginBottom: 6 }}>Nouvelle ETA</div>
            <input type="date" value={delayEta} onChange={e => setDelayEta(e.target.value)} style={inputStyle} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowDelayInput(false)} style={{ background: "#f4f5f9", color: T.textMid, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
              <button onClick={() => handleDelay(selectedOrder)} disabled={!delayEta} style={{ background: delayEta ? T.orange : "#e5e7eb", color: delayEta ? "#fff" : "#9ca3af", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: delayEta ? "pointer" : "not-allowed", fontFamily: "inherit" }}>Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {modalType === "shipping" && selectedOrder && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(230,228,224,0.85)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: T.bgCard, borderRadius: 16, padding: 28, maxWidth: 520, width: "90%", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>Informations de shipping</div>
            <div style={{ color: T.textMid, fontSize: 13, marginBottom: 20 }}>{selectedOrder.id} · {selectedOrder.client}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", marginBottom: 6 }}>Transporteur</div>
                <select value={shippingCarrier} onChange={e => setShippingCarrier(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">Sélectionner...</option>
                  {["Purolator", "UPS", "FedEx", "LTL Freight", "Autre"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", marginBottom: 6 }}>Numéro(s) de tracking</div>
                <input value={shippingTracking} onChange={e => setShippingTracking(e.target.value)} placeholder="ex: PIN892034567CA, 1Z999..." style={inputStyle} />
                <div style={{ fontSize: 11, color: T.textLight, marginTop: 4 }}>Séparer par virgule pour plusieurs numéros</div>
                {selectedOrder.shipping?.trackingNumbers && selectedOrder.shipping.trackingNumbers.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, color: T.textLight, marginBottom: 4 }}>Numéros existants :</div>
                    {selectedOrder.shipping.trackingNumbers.map((tn, i) => (
                      <div key={i} style={{ background: "#f4f5f9", borderRadius: 6, padding: "4px 8px", fontSize: 11, fontFamily: "monospace", display: "inline-block", marginRight: 6, marginBottom: 4 }}>{tn}</div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", marginBottom: 6 }}>ETA</div>
                <input type="date" value={shippingEta} onChange={e => setShippingEta(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20, flexWrap: "wrap" }}>
              <button onClick={() => setModalType(null)} style={{ background: "#f4f5f9", color: T.textMid, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
              <button onClick={handleShipUpdate} style={{ background: T.blueBg, color: T.blue, border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Mettre à jour</button>
              {(selectedOrder.status === "produced" || selectedOrder.status === "en_production") && (
                <button onClick={handleMarkShipped} style={{ background: T.blue, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Marquer comme expédiée</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
