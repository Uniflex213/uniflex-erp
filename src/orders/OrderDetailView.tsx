import React, { useState, useEffect } from "react";
import { Order, STATUS_CONFIG, OrderStatus, ORDER_BILLING_LABELS, ORDER_BILLING_COLORS, OrderBillingStatus } from "./orderTypes";
import EditOrderModal from "./EditOrderModal";
import ChangeLogPanel from "../shared/ChangeLogPanel";
import { supabase } from "../supabaseClient";
import EmailComposerModal from "../components/email/EmailComposerModal";
import { generateOrderPDFBase64 } from "./orderPDF";
import { T } from "../theme";
import { useLanguage } from "../i18n/LanguageContext";

const fmt = (n: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

// NOTE: labelKey/labelFallback are translated at render time via t()
const TIMELINE_STEPS: { key: OrderStatus | "confirmed"; labelKey: string; labelFallback: string }[] = [
  { key: "pending_approval", labelKey: "orders.pending_approval", labelFallback: "À confirmer" },
  { key: "confirmed", labelKey: "orders.confirmed", labelFallback: "Confirmée" },
  { key: "en_production", labelKey: "orders.in_production", labelFallback: "En production" },
  { key: "produced", labelKey: "orders.produced", labelFallback: "Produite" },
  { key: "shipped", labelKey: "orders.shipped", labelFallback: "En route" },
  { key: "completed", labelKey: "orders.completed", labelFallback: "Complétée" },
];

const statusOrder: Record<string, number> = {
  pending_approval: 0,
  en_revision: 0.5,
  rejected: -1,
  confirmed: 1,
  en_production: 2,
  produced: 3,
  shipped: 4,
  completed: 5,
};

type DetailTab = "details" | "history";

interface Props {
  order: Order;
  onBack: () => void;
  onUpdateOrder?: (id: string, updates: Partial<Order>) => void;
}

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

const TruckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="3" width="15" height="13" rx="1"/>
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
    <circle cx="5.5" cy="18.5" r="2.5"/>
    <circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

function BillingBadge({ status }: { status?: OrderBillingStatus }) {
  const s = ORDER_BILLING_COLORS[status ?? "unbilled"];
  return (
    <span style={{ background: s.bg, color: s.color, padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
      {ORDER_BILLING_LABELS[status ?? "unbilled"]}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontWeight: 800, fontSize: 11, marginBottom: 14, textTransform: "uppercase", letterSpacing: 1.5, color: T.textLight }}>{children}</div>
  );
}

function InfoField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{value || "—"}</div>
    </div>
  );
}

function FinancialRow({ label, value, bold, red, muted }: { label: React.ReactNode; value: string; bold?: boolean; red?: boolean; muted?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }}>
      <span style={{ fontSize: 13, color: muted ? T.textLight : T.textMid }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 500, color: red ? "#dc2626" : muted ? T.textLight : T.text }}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: `1px solid ${T.divider}`, margin: "6px 0" }} />;
}

export default function OrderDetailView({ order: initialOrder, onBack, onUpdateOrder }: Props) {
  const { t } = useLanguage();
  const [order, setOrder] = useState(initialOrder);
  const [activeTab, setActiveTab] = useState<DetailTab>("details");
  const [showEdit, setShowEdit] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);

  const cfg = STATUS_CONFIG[order.status];
  const currentStep = statusOrder[order.status] ?? 0;
  const [revisionReply, setRevisionReply] = useState("");
  const [replySent, setReplySent] = useState(false);

  const canEdit = ["pending_approval", "en_revision"].includes(order.status);
  const showBilling = ["en_production", "produced", "shipped", "completed"].includes(order.status);

  useEffect(() => {
    if (!order.clientId) { setClientInfo(null); return; }
    supabase
      .from("clients")
      .select("email, phone, contact_first_name, contact_last_name, billing_address, billing_city, billing_province, billing_postal_code")
      .eq("id", order.clientId)
      .maybeSingle()
      .then(({ data }) => setClientInfo(data ?? null));
  }, [order.clientId]);

  const handleSendRevisionResponse = () => {
    if (!revisionReply.trim() || !onUpdateOrder) return;
    onUpdateOrder(order.id, {
      revisionResponse: revisionReply.trim(),
      revisionResponseAt: new Date().toISOString(),
    });
    setReplySent(true);
    setRevisionReply("");
  };

  const handleEditSave = (updates: Partial<Order>) => {
    const updated = { ...order, ...updates };
    setOrder(updated);
    onUpdateOrder?.(order.id, updates);
    setShowEdit(false);
    setHistoryRefresh(r => r + 1);
  };

  const subtotalAfterDiscount = order.subtotalAfterDiscount ?? (order.subtotal - (order.discount ?? 0));
  const shippingAmt = order.deliveryType === "Add Shipping" ? (order.shippingCost ?? 0) : 0;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button
          onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 6, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, color: T.textMid, fontFamily: "inherit" }}
        >
          <BackIcon /> {t("back")}
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{order.id}</h2>
          <p style={{ margin: 0, color: T.textMid, fontSize: 13 }}>{order.date} · {order.client}</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {canEdit && onUpdateOrder && (
            <button
              onClick={() => setShowEdit(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: T.main, fontFamily: "inherit" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              {t("edit")}
            </button>
          )}
          <button
            onClick={() => setShowEmailModal(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: T.textMid, fontFamily: "inherit" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,4 12,13 2,4"/></svg>
            {t("orders.send_by_email", "Envoyer par email")}
          </button>
          <span style={{ background: cfg.bg, color: cfg.color, padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            {order.status === "shipped" && <TruckIcon />}
            {cfg.label}
          </span>
          {showBilling && <BillingBadge status={order.billing_status} />}
        </div>
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: `1px solid ${T.border}` }}>
        {([["details", t("details")], ["history", t("orders.change_history", "Historique des modifications")]] as [DetailTab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: "10px 18px", border: "none", background: "none", cursor: "pointer",
              fontSize: 13, fontWeight: activeTab === key ? 700 : 400,
              color: activeTab === key ? T.main : T.textMid,
              borderBottom: activeTab === key ? `2px solid ${T.main}` : "2px solid transparent",
              fontFamily: "inherit", transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "history" && (
        <ChangeLogPanel entityType="order" entityId={order.id} refreshKey={historyRefresh} />
      )}

      {activeTab === "details" && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 560px", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 20 }}>
                <SectionTitle>{t("orders.order_context", "Contexte de la commande")}</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
                  <InfoField label={t("orders.motif")} value={order.motif + (order.motifAutre ? ` — ${order.motifAutre}` : "")} />
                  <InfoField label={t("orders.vendor_code")} value={order.vendeurCode} />
                  <InfoField label={t("orders.delivery_type")} value={order.deliveryType} />
                  <InfoField label={t("orders.destination")} value={order.destination + (order.province ? ` (${order.province})` : "")} />
                  <InfoField label={t("orders.label")} value={order.label} />
                  <InfoField label={t("status")} value={cfg.label} />
                </div>
              </div>

              <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 20 }}>
                <SectionTitle>{t("orders.client_info", "Informations client")}</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
                  <InfoField label={t("orders.company", "Compagnie")} value={order.client} />
                  <InfoField label={t("email")} value={clientInfo?.email} />
                  <InfoField label={t("phone")} value={clientInfo?.phone} />
                  <InfoField label={t("orders.contact", "Contact")} value={[clientInfo?.contact_first_name, clientInfo?.contact_last_name].filter(Boolean).join(" ") || undefined} />
                  <div style={{ gridColumn: "1 / -1" }}>
                    <InfoField label={t("orders.billing_address", "Adresse de facturation")} value={[clientInfo?.billing_address, clientInfo?.billing_city, clientInfo?.billing_province, clientInfo?.billing_postal_code].filter(Boolean).join(", ") || undefined} />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <InfoField label={t("orders.delivery_address")} value={order.deliveryAddress} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 20 }}>
              <SectionTitle>{t("orders.ordered_products", "Produits commandés")}</SectionTitle>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8f9fb" }}>
                    {["#", t("product"), t("orders.format"), t("orders.qty"), t("orders.negotiated_price", "Prix négocié"), t("orders.unit"), t("orders.line_subtotal", "Sous-total ligne")].map((h, j) => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: j >= 3 ? "right" : "left", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.3, color: T.textLight, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {order.products.map((p, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: "10px 10px", color: T.textLight, fontSize: 11 }}>{i + 1}</td>
                      <td style={{ padding: "10px 10px", fontWeight: 700 }}>{p.product}</td>
                      <td style={{ padding: "10px 10px", color: T.textMid, fontSize: 12 }}>{p.format}</td>
                      <td style={{ padding: "10px 10px", textAlign: "right" }}>{p.qty}</td>
                      <td style={{ padding: "10px 10px", textAlign: "right" }}>{fmt(p.price)}</td>
                      <td style={{ padding: "10px 10px", textAlign: "right", color: T.textMid, fontSize: 11 }}>{p.unit}</td>
                      <td style={{ padding: "10px 10px", textAlign: "right", fontWeight: 700 }}>{fmt(p.qty * p.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ background: "#f8f9fb", borderRadius: 12, border: `1px solid ${T.border}`, padding: 20 }}>
              <SectionTitle>{t("orders.financial_summary", "Résumé financier")}</SectionTitle>
              <FinancialRow label={t("orders.product_subtotal", "Sous-total produits")} value={fmt(order.subtotal)} bold />
              {order.discount != null && order.discount > 0 && (
                <FinancialRow label={`${t("discount")}${order.discountType ? ` (${order.discountValue}${order.discountType})` : ""}`} value={`-${fmt(order.discount)}`} red />
              )}
              <Divider />
              <FinancialRow label={t("orders.subtotal_after_discount")} value={fmt(subtotalAfterDiscount)} bold />
              <FinancialRow
                label={t("orders.shipping_cost")}
                value={order.deliveryType === "Add Shipping" ? fmt(shippingAmt) : "N/A"}
                muted={order.deliveryType !== "Add Shipping"}
              />
              {order.taxLines && order.taxLines.length > 0 ? (
                <>
                  <Divider />
                  {order.taxLines.map(t => <FinancialRow key={t.label} label={t.label} value={fmt(t.amount)} />)}
                </>
              ) : (
                <>
                  <Divider />
                  <FinancialRow label={t("taxes")} value={order.destination === "CANADA" ? "N/C" : t("orders.taxes_outside_canada", "N/A — Hors Canada")} muted />
                </>
              )}
              {order.extraFees != null && order.extraFees > 0 && (
                <>
                  <Divider />
                  <FinancialRow label={t("orders.extra_fees")} value={fmt(order.extraFees)} />
                </>
              )}
              <div style={{ borderTop: `2px solid ${T.main}22`, marginTop: 8, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 14, fontWeight: 800 }}>TOTAL</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: T.main }}>{fmt(order.total)}</span>
              </div>
            </div>
          </div>

          <div style={{ flex: "0 0 320px", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 20 }}>
              <SectionTitle>{t("orders.order_tracking", "Suivi de commande")}</SectionTitle>

              {order.status === "rejected" ? (
                <div style={{ background: "#fee2e2", borderRadius: 10, padding: 16, border: "1px solid #fca5a5" }}>
                  <div style={{ fontWeight: 800, color: "#dc2626", marginBottom: 6 }}>{t("orders.order_rejected", "Commande rejetée")}</div>
                  <div style={{ fontSize: 13, color: "#7f1d1d" }}>{order.rejectionReason || t("orders.no_reason_provided", "Aucune raison fournie.")}</div>
                </div>
              ) : order.status === "en_revision" ? (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ background: "#ffedd5", borderRadius: 10, padding: 16, border: "1px solid #fed7aa", marginBottom: 12 }}>
                    <div style={{ fontWeight: 800, color: "#c2410c", marginBottom: 6 }}>{t("orders.revision_required_ho", "Révision requise par le Head Office")}</div>
                    <div style={{ fontSize: 13, color: "#7c2d12", lineHeight: 1.6 }}>{order.revisionComment || t("orders.order_must_be_revised", "Cette commande doit être révisée.")}</div>
                  </div>
                  {order.revisionResponse ? (
                    <div style={{ background: "#f0fdf4", borderRadius: 10, padding: 14, border: "1px solid #86efac" }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#15803d", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{t("orders.your_response_sent", "Votre réponse envoyée")}</div>
                      <div style={{ fontSize: 13, color: "#166534", lineHeight: 1.5 }}>{order.revisionResponse}</div>
                      {order.revisionResponseAt && (
                        <div style={{ fontSize: 11, color: "#4ade80", marginTop: 6 }}>{new Date(order.revisionResponseAt).toLocaleString("fr-CA")}</div>
                      )}
                    </div>
                  ) : (
                    <div style={{ background: T.bgCard, borderRadius: 10, padding: 14, border: "1px solid #fed7aa" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#c2410c", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{t("orders.your_revision_response", "Votre réponse à la révision")}</div>
                      {replySent ? (
                        <div style={{ background: "#f0fdf4", borderRadius: 8, padding: 12, fontSize: 13, color: "#15803d", fontWeight: 600 }}>
                          {t("orders.response_sent_success", "Réponse envoyée avec succès.")}
                        </div>
                      ) : (
                        <>
                          <textarea
                            value={revisionReply}
                            onChange={e => setRevisionReply(e.target.value)}
                            placeholder={t("orders.reply_revision_placeholder", "Répondez au commentaire de révision...")}
                            rows={3}
                            style={{ border: "1px solid #fed7aa", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", outline: "none", background: "#fffbf5", width: "100%", boxSizing: "border-box", resize: "vertical", color: "#111" }}
                          />
                          <button
                            onClick={handleSendRevisionResponse}
                            disabled={!revisionReply.trim() || !onUpdateOrder}
                            style={{ marginTop: 8, background: revisionReply.trim() ? "#ff9f0a" : "#e5e7eb", color: revisionReply.trim() ? "#fff" : "#9ca3af", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 12, fontWeight: 800, cursor: revisionReply.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}
                          >
                            {t("orders.send_my_response", "Envoyer ma réponse")}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : null}

              {order.status !== "rejected" && (
                <div style={{ position: "relative" }}>
                  {TIMELINE_STEPS.map((step, i) => {
                    const stepIdx = statusOrder[step.key] ?? 0;
                    const isDone = currentStep >= stepIdx;
                    const isCurrent = Math.floor(currentStep) === Math.floor(stepIdx) && currentStep !== -1;
                    const isLast = i === TIMELINE_STEPS.length - 1;

                    return (
                      <div key={step.key} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: isLast ? 0 : 20, position: "relative" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: "50%",
                            background: isDone ? T.main : "#f0f0f5",
                            border: isCurrent ? `3px solid ${T.main}` : isDone ? "none" : "2px solid #d1d5db",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: isDone ? "#fff" : T.textLight,
                            transition: "all 0.3s",
                          }}>
                            {isDone ? <CheckIcon /> : <span style={{ fontSize: 11, fontWeight: 700 }}>{i + 1}</span>}
                          </div>
                          {!isLast && (
                            <div style={{ width: 2, height: 20, background: isDone ? T.main : "#e5e7eb", marginTop: 2 }} />
                          )}
                        </div>
                        <div style={{ paddingTop: 4 }}>
                          <div style={{ fontSize: 13, fontWeight: isCurrent ? 800 : isDone ? 600 : 400, color: isDone ? T.text : T.textLight }}>
                            {t(step.labelKey, step.labelFallback)}
                          </div>
                          {isCurrent && order.status === "shipped" && order.shipping?.eta && (
                            <div style={{ fontSize: 11, color: T.textMid, marginTop: 2 }}>ETA: {order.shipping.eta}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {(order.status === "shipped" || order.status === "completed") && order.shipping && (
              <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 20 }}>
                <SectionTitle>{t("orders.shipping_info")}</SectionTitle>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: T.textLight, fontWeight: 600, textTransform: "uppercase" }}>{t("orders.carrier")}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{order.shipping.carrier}</div>
                </div>
                {order.shipping.eta && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: T.textLight, fontWeight: 600, textTransform: "uppercase" }}>{t("orders.estimated_delivery_date", "Date estimée de livraison")}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2, color: T.main }}>{order.shipping.eta}</div>
                  </div>
                )}
                {order.shipping.trackingNumbers && order.shipping.trackingNumbers.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: T.textLight, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>{t("orders.tracking_numbers", "Numéros de suivi")}</div>
                    {order.shipping.trackingNumbers.map((tn, i) => (
                      <div key={i} style={{ background: "#f4f5f9", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontFamily: "monospace", marginBottom: 4 }}>{tn}</div>
                    ))}
                  </div>
                )}
                {order.shipping.delayed && order.shipping.newEta && (
                  <div style={{ background: "#fff3d4", borderRadius: 8, padding: 12, marginTop: 10, border: "1px solid #fed7aa" }}>
                    <div style={{ fontWeight: 700, color: T.orange, fontSize: 12 }}>{t("orders.delay_reported", "Délai signalé")}</div>
                    <div style={{ fontSize: 12, color: "#92400e", marginTop: 4 }}>{t("orders.new_eta", "Nouvelle ETA")} : {order.shipping.newEta}</div>
                  </div>
                )}
              </div>
            )}

            {order.status === "en_production" && (
              <div style={{ background: "#dbeafe", borderRadius: 12, padding: 16, border: "1px solid #bfdbfe" }}>
                <div style={{ fontWeight: 800, color: "#1d4ed8", marginBottom: 4 }}>{t("orders.in_production")}</div>
                <div style={{ fontSize: 13, color: "#1e40af" }}>{t("orders.in_production_msg", "Votre commande a été confirmée et est actuellement en production.")}</div>
                {order.adminNote && (
                  <div style={{ fontSize: 12, color: "#1e40af", marginTop: 8, fontStyle: "italic" }}>{t("notes")} : {order.adminNote}</div>
                )}
              </div>
            )}

            {showBilling && (
              <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 20 }}>
                <SectionTitle>{t("orders.billing", "Facturation")}</SectionTitle>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <BillingBadge status={order.billing_status} />
                </div>
                <div style={{ fontSize: 12, color: T.textMid, lineHeight: 1.5 }}>
                  {order.billing_status === "unbilled" && t("orders.billing_unbilled_msg", "Cette commande n'a pas encore été envoyée pour facturation.")}
                  {order.billing_status === "sent" && t("orders.billing_sent_msg", "Cette commande a été envoyée au manufacturier (SCI) pour facturation.")}
                  {order.billing_status === "billed_by_sci" && t("orders.billing_billed_msg", "Cette commande a été facturée par le manufacturier (SCI).")}
                  {!order.billing_status && t("orders.billing_unbilled_msg", "Cette commande n'a pas encore été envoyée pour facturation.")}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showEdit && (
        <EditOrderModal
          order={order}
          onSave={handleEditSave}
          onCancel={() => setShowEdit(false)}
        />
      )}

      <EmailComposerModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        defaultTo={clientInfo?.email ?? ""}
        defaultSubject={`Uniflex — ${t("orders.order_confirmation", "Confirmation de commande")} ${order.id}`}
        defaultBody={`${t("orders.email_greeting", "Bonjour")},\n\n${t("orders.email_body_intro", "Veuillez trouver ci-joint la confirmation pour la commande")} ${order.id}.\n\n${t("client")} : ${order.client}\n${t("date")} : ${order.date}\n${t("orders.total_amount", "Montant total")} : ${new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(order.total)}\n\n${t("orders.email_body_contact", "Pour toute question, n'hésitez pas à nous contacter.")}\n\n${t("orders.email_body_closing", "Cordialement")},\nUniflex Distribution Inc.\nBoisbriand, Québec`}
        module="orders"
        referenceId={order.id}
        attachmentLabel={`${t("orders.order_confirmation", "Confirmation de commande")} ${order.id}`}
        onGetAttachment={async () => {
          const result = await generateOrderPDFBase64(order);
          return result;
        }}
        onSent={() => setShowEmailModal(false)}
      />
    </div>
  );
}
