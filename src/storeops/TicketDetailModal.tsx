import React, { useState, useEffect } from "react";
import {
  PickupTicket, PickupTicketStatus, PickupBillingStatus,
  STATUS_LABELS, STATUS_COLORS, BILLING_LABELS, BILLING_COLORS,
  PAYMENT_METHOD_LABELS, TaxLine,
} from "./storeOpsTypes";
import { generatePickupTicketPDF, generatePickupTicketPDFBase64 } from "./pickupTicketPDF";
import EditTicketModal from "./EditTicketModal";
import ChangeLogPanel from "../shared/ChangeLogPanel";
import { supabase } from "../supabaseClient";
import SendEmailModal from "../components/email/SendEmailModal";
import { tplPickupTicketClient } from "../lib/emailTemplates";
import { T } from "../theme";

const fmt2 = (n: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-CA", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }: { status: PickupTicketStatus }) {
  const s = STATUS_COLORS[status];
  return <span style={{ background: s.bg, color: s.color, padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>{STATUS_LABELS[status]}</span>;
}

function BillingBadge({ status }: { status: PickupBillingStatus }) {
  const s = BILLING_COLORS[status];
  return <span style={{ background: s.bg, color: s.color, padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700 }}>{BILLING_LABELS[status]}</span>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: T.textMid, minWidth: 180 }}>{label}</span>
      <span style={{ fontSize: 13, color: T.text }}>{value}</span>
    </div>
  );
}

function TotalRow({ label, value, bold, negative, muted }: { label: React.ReactNode; value: string; bold?: boolean; negative?: boolean; muted?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
      <span style={{ fontSize: 13, color: muted ? T.textLight : T.textMid }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 500, color: negative ? T.red : muted ? T.textLight : T.text }}>{value}</span>
    </div>
  );
}

function Divider() { return <div style={{ height: 1, background: T.border, margin: "8px 0" }} />; }

const TIMELINE_STEPS: { key: PickupTicketStatus; label: string; description: string }[] = [
  { key: "prepared", label: "Préparé", description: "Le ticket a été créé et les produits sont en préparation" },
  { key: "ready", label: "Prêt au ramassage", description: "Les produits sont prêts, en attente du client" },
  { key: "picked_up", label: "Récupéré", description: "Le client a récupéré sa commande" },
];

const STATUS_ORDER: Record<PickupTicketStatus, number> = {
  prepared: 0,
  ready: 1,
  picked_up: 2,
  cancelled: -1,
};

const BILLING_STEPS: { key: PickupBillingStatus; label: string; description: string }[] = [
  { key: "unbilled", label: "Non-facturé", description: "En attente d'envoi au manufacturier" },
  { key: "sent", label: "Envoyé à SCI", description: "Document transmis pour facturation" },
  { key: "billed_by_sci", label: "Facturé par SCI", description: "Facture émise par le manufacturier" },
];

const BILLING_ORDER: Record<PickupBillingStatus, number> = {
  unbilled: 0,
  sent: 1,
  billed_by_sci: 2,
};

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  );
}

type DetailTab = "details" | "history";

interface Props {
  ticket: PickupTicket;
  onBack: () => void;
  onStatusChange: (id: string, status: PickupTicketStatus) => Promise<void> | void;
  onBillingChange: (id: string, billing: PickupBillingStatus) => Promise<void> | void;
  onTicketUpdated?: (updated: PickupTicket) => void;
}

const STATUS_TRANSITIONS: Record<PickupTicketStatus, PickupTicketStatus[]> = {
  prepared: ["ready", "cancelled"],
  ready: ["picked_up", "cancelled"],
  picked_up: [],
  cancelled: [],
};

const BILLING_TRANSITIONS: Record<PickupBillingStatus, PickupBillingStatus[]> = {
  unbilled: ["sent"],
  sent: ["billed_by_sci"],
  billed_by_sci: [],
};

const STATUS_ACTION_LABELS: Record<PickupTicketStatus, string> = {
  prepared: "Préparé",
  ready: "Marquer prêt au ramassage",
  picked_up: "Marquer comme récupéré",
  cancelled: "Annuler le ticket",
};

const BILLING_ACTION_LABELS: Record<PickupBillingStatus, string> = {
  unbilled: "Non-facturé",
  sent: "Marquer envoyé à SCI",
  billed_by_sci: "Marquer facturé par SCI",
};

export default function TicketDetailModal({ ticket: initialTicket, onBack, onStatusChange, onBillingChange, onTicketUpdated }: Props) {
  const [ticket, setTicket] = useState(initialTicket);
  const [activeTab, setActiveTab] = useState<DetailTab>("details");
  const [showEdit, setShowEdit] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [clientIsCod, setClientIsCod] = useState(false);
  const [showCodWarning, setShowCodWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  useEffect(() => {
    if (!ticket.client_id) return;
    supabase.from("clients").select("payment_terms").eq("id", ticket.client_id).maybeSingle().then(({ data }) => {
      if (data?.payment_terms === "COD") setClientIsCod(true);
    });
  }, [ticket.client_id]);

  const nextStatuses = STATUS_TRANSITIONS[ticket.status];
  const nextBillings = BILLING_TRANSITIONS[ticket.billing_status];

  const taxLines: TaxLine[] = Array.isArray(ticket.tax_lines) ? ticket.tax_lines : [];
  const subtotalProducts = ticket.subtotal_products ?? ticket.total_value ?? 0;
  const discountAmt = ticket.discount_amount ?? 0;
  const subtotalAfterDiscount = ticket.subtotal_after_discount ?? (subtotalProducts - discountAmt);
  const taxTotal = ticket.tax_total ?? 0;
  const extraFees = ticket.extra_fees ?? 0;
  const totalWithTax = ticket.total_with_tax ?? (subtotalAfterDiscount + taxTotal + extraFees);

  const canEdit = ticket.status !== "picked_up" && ticket.status !== "cancelled";

  const ticketIsCod = ticket.payment_method === "cod";
  const isCodContext = ticketIsCod || clientIsCod;

  const currentStatusIdx = STATUS_ORDER[ticket.status];
  const currentBillingIdx = BILLING_ORDER[ticket.billing_status];
  const isCancelled = ticket.status === "cancelled";

  async function handleStatusChange(s: PickupTicketStatus) {
    if (s === "picked_up" && isCodContext) {
      setShowCodWarning(true);
      return;
    }
    setPendingAction(`status-${s}`);
    try {
      await onStatusChange(ticket.id, s);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleBillingChange(b: PickupBillingStatus) {
    setPendingAction(`billing-${b}`);
    try {
      await onBillingChange(ticket.id, b);
    } finally {
      setPendingAction(null);
    }
  }

  const handleTicketSaved = (updated: PickupTicket) => {
    setTicket(updated);
    onTicketUpdated?.(updated);
    setShowEdit(false);
    setHistoryRefresh(r => r + 1);
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, color: T.textMid, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Retour
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: 0, fontFamily: "monospace" }}>{ticket.ticket_number}</h1>
            <StatusBadge status={ticket.status} />
            <BillingBadge status={ticket.billing_status} />
          </div>
          <div style={{ fontSize: 12, color: T.textMid, marginTop: 4 }}>
            {ticket.client_name} · {formatDateTime(ticket.issued_at)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {canEdit && (
            <button onClick={() => setShowEdit(true)}
              style={{ background: T.cardAlt, color: T.main, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 16px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Modifier
            </button>
          )}
          <button onClick={() => generatePickupTicketPDF(ticket)}
            style={{ background: T.cardAlt, color: T.text, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 16px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            PDF
          </button>
          {ticket.client_email && (
            <button onClick={() => setShowEmailModal(true)}
              style={{ background: T.main, color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              Envoyer email
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: `1px solid ${T.border}` }}>
        {([["details", "Détails"], ["history", "Historique des modifications"]] as [DetailTab, string][]).map(([key, label]) => (
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
        <ChangeLogPanel entityType="pickup_ticket" entityId={ticket.id} refreshKey={historyRefresh} />
      )}

      {activeTab === "details" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textMid, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 }}>Statut du ticket</div>

              {isCancelled ? (
                <div style={{ background: T.redBg, borderRadius: 10, padding: 16, border: "1px solid #fca5a5" }}>
                  <div style={{ fontWeight: 800, color: T.red, marginBottom: 4 }}>Ticket annulé</div>
                  <div style={{ fontSize: 13, color: "#7f1d1d" }}>Ce ticket a été annulé et ne peut plus être modifié.</div>
                </div>
              ) : (
                <>
                  <div style={{ position: "relative", marginBottom: 20 }}>
                    {TIMELINE_STEPS.map((step, i) => {
                      const stepIdx = STATUS_ORDER[step.key];
                      const isDone = currentStatusIdx >= stepIdx;
                      const isCurrent = currentStatusIdx === stepIdx;
                      const isLast = i === TIMELINE_STEPS.length - 1;

                      return (
                        <div key={step.key} style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: isLast ? 0 : 24, position: "relative" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: "50%",
                              background: isDone ? T.main : "#f0f0f5",
                              border: isCurrent ? `3px solid ${T.main}` : isDone ? "none" : "2px solid #d1d5db",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: isDone ? "#fff" : T.textLight,
                              transition: "all 0.3s",
                              boxShadow: isCurrent ? `0 0 0 4px ${T.main}22` : "none",
                            }}>
                              {isDone ? <CheckIcon /> : <span style={{ fontSize: 12, fontWeight: 700 }}>{i + 1}</span>}
                            </div>
                            {!isLast && (
                              <div style={{ width: 2, height: 24, background: isDone ? T.main : "#e5e7eb", marginTop: 2 }} />
                            )}
                          </div>
                          <div style={{ paddingTop: 5 }}>
                            <div style={{ fontSize: 14, fontWeight: isCurrent ? 800 : isDone ? 600 : 400, color: isDone ? T.text : T.textLight }}>
                              {step.label}
                            </div>
                            <div style={{ fontSize: 11, color: T.textMid, marginTop: 2, lineHeight: 1.4 }}>
                              {step.description}
                            </div>
                            {isCurrent && ticket.estimated_pickup_at && step.key === "ready" && (
                              <div style={{ fontSize: 11, color: T.orange, fontWeight: 600, marginTop: 4 }}>
                                Ramassage estimé: {formatDateTime(ticket.estimated_pickup_at)}
                              </div>
                            )}
                            {isDone && step.key === "picked_up" && ticket.picked_up_at && (
                              <div style={{ fontSize: 11, color: T.green, fontWeight: 600, marginTop: 4 }}>
                                Récupéré le {formatDateTime(ticket.picked_up_at)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {nextStatuses.length > 0 && (
                    <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Prochaine étape</div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {nextStatuses.filter(s => s !== "cancelled").map(s => {
                          const isLoading = pendingAction === `status-${s}`;
                          const anyLoading = pendingAction !== null;
                          return (
                            <button key={s} onClick={() => !anyLoading && handleStatusChange(s)} disabled={anyLoading}
                              style={{
                                flex: 1, minWidth: 160, background: STATUS_COLORS[s].bg, color: STATUS_COLORS[s].color,
                                border: `1px solid ${STATUS_COLORS[s].color}22`, borderRadius: 10, padding: "12px 18px",
                                cursor: anyLoading ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700,
                                fontFamily: "inherit", opacity: anyLoading && !isLoading ? 0.5 : 1,
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                transition: "all 0.15s",
                              }}>
                              {isLoading ? <Spinner /> : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                              )}
                              {isLoading ? "En cours..." : STATUS_ACTION_LABELS[s]}
                            </button>
                          );
                        })}
                        {nextStatuses.includes("cancelled") && (
                          <button onClick={() => !pendingAction && handleStatusChange("cancelled")} disabled={pendingAction !== null}
                            style={{
                              background: "transparent", color: T.red,
                              border: `1px solid ${T.red}33`, borderRadius: 10, padding: "12px 16px",
                              cursor: pendingAction ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600,
                              fontFamily: "inherit", opacity: pendingAction ? 0.5 : 1,
                              display: "flex", alignItems: "center", gap: 6,
                              transition: "all 0.15s",
                            }}>
                            {pendingAction === "status-cancelled" ? <Spinner /> : (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            )}
                            Annuler le ticket
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textMid, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 }}>Facturation SCI</div>

              <div style={{ position: "relative", marginBottom: 20 }}>
                {BILLING_STEPS.map((step, i) => {
                  const stepIdx = BILLING_ORDER[step.key];
                  const isDone = currentBillingIdx >= stepIdx;
                  const isCurrent = currentBillingIdx === stepIdx;
                  const isLast = i === BILLING_STEPS.length - 1;
                  const colors = BILLING_COLORS[step.key];

                  return (
                    <div key={step.key} style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: isLast ? 0 : 24, position: "relative" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%",
                          background: isDone ? (step.key === "unbilled" ? "#6b7280" : colors.color) : "#f0f0f5",
                          border: isCurrent ? `3px solid ${step.key === "unbilled" ? "#6b7280" : colors.color}` : isDone ? "none" : "2px solid #d1d5db",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: isDone ? "#fff" : T.textLight,
                          transition: "all 0.3s",
                          boxShadow: isCurrent ? `0 0 0 4px ${colors.color}22` : "none",
                        }}>
                          {isDone && !isCurrent ? <CheckIcon /> : <span style={{ fontSize: 12, fontWeight: 700 }}>{i + 1}</span>}
                        </div>
                        {!isLast && (
                          <div style={{ width: 2, height: 24, background: isDone && !isCurrent ? (colors.color) : "#e5e7eb", marginTop: 2 }} />
                        )}
                      </div>
                      <div style={{ paddingTop: 5 }}>
                        <div style={{ fontSize: 14, fontWeight: isCurrent ? 800 : isDone ? 600 : 400, color: isDone ? T.text : T.textLight }}>
                          {step.label}
                        </div>
                        <div style={{ fontSize: 11, color: T.textMid, marginTop: 2, lineHeight: 1.4 }}>
                          {step.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {nextBillings.length > 0 && (
                <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Action de facturation</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {nextBillings.map(b => {
                      const isLoading = pendingAction === `billing-${b}`;
                      const anyLoading = pendingAction !== null;
                      const colors = BILLING_COLORS[b];
                      return (
                        <button key={b} onClick={() => !anyLoading && handleBillingChange(b)} disabled={anyLoading}
                          style={{
                            flex: 1, minWidth: 160, background: colors.bg, color: colors.color,
                            border: `1px solid ${colors.color}22`, borderRadius: 10, padding: "12px 18px",
                            cursor: anyLoading ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700,
                            fontFamily: "inherit", opacity: anyLoading && !isLoading ? 0.5 : 1,
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            transition: "all 0.15s",
                          }}>
                          {isLoading ? <Spinner /> : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                            </svg>
                          )}
                          {isLoading ? "En cours..." : BILLING_ACTION_LABELS[b]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {ticket.billing_status === "billed_by_sci" && (
                <div style={{ background: "#f0fdf4", borderRadius: 10, padding: 14, marginTop: 16, border: "1px solid #86efac" }}>
                  <div style={{ fontWeight: 700, color: T.green, fontSize: 13 }}>Facturation complétée</div>
                  <div style={{ fontSize: 12, color: "#166534", marginTop: 4 }}>Ce document a été facturé par SCI.</div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textMid, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 }}>Client</div>
              <InfoRow label="Compagnie" value={ticket.client_name} />
              {ticket.client_contact && <InfoRow label="Contact" value={ticket.client_contact} />}
              {ticket.client_phone && <InfoRow label="Téléphone" value={ticket.client_phone} />}
              {ticket.client_email && <InfoRow label="Email" value={ticket.client_email} />}
              {ticket.billing_address && <InfoRow label="Adresse de facturation" value={ticket.billing_address} />}
              {ticket.province && <InfoRow label="Province" value={ticket.province} />}
              {ticket.is_walkin && (
                <div style={{ marginTop: 10, background: T.orangeBg, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: T.orange, fontWeight: 600 }}>
                  Client walk-in — non répertorié dans la base de données
                </div>
              )}
            </div>

            <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textMid, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 }}>Détails</div>
              <InfoRow label="Agent" value={ticket.agent_name} />
              <InfoRow label="Méthode de paiement" value={PAYMENT_METHOD_LABELS[ticket.payment_method]} />
              <InfoRow label="Date d'émission" value={formatDateTime(ticket.issued_at)} />
              {ticket.estimated_pickup_at && <InfoRow label="Ramassage estimé" value={formatDateTime(ticket.estimated_pickup_at)} />}
              {ticket.picked_up_at && <InfoRow label="Récupéré le" value={formatDateTime(ticket.picked_up_at)} />}
              {ticket.notes && <InfoRow label="Notes" value={ticket.notes} />}
            </div>
          </div>

          <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 24, marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textMid, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>Produits</div>
            {(ticket.items || []).length === 0 ? (
              <div style={{ color: T.textLight, fontSize: 13 }}>Aucun produit.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${T.border}`, background: T.cardAlt }}>
                    {["#", "Produit", "Format", "Quantité", "Prix unitaire", "Unité", "Sous-total"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(ticket.items || []).map((it: any, idx: number) => (
                    <tr key={it.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: "12px 14px", fontSize: 13, color: T.textMid }}>{idx + 1}</td>
                      <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>{it.product_name}</td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: T.textMid }}>{it.format}</td>
                      <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700 }}>{it.quantity}</td>
                      <td style={{ padding: "12px 14px", fontSize: 13 }}>{fmt2(it.unit_price)}</td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: T.textMid }}>{it.price_unit}</td>
                      <td style={{ padding: "12px 14px", fontSize: 14, fontWeight: 800, color: T.main }}>{fmt2(it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, marginBottom: 28 }}>
            <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 24, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textMid, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 }}>Quantités</div>
              <div style={{ display: "flex", gap: 40 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.textMid, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Lignes produits</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: T.text }}>{(ticket.items || []).length}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.textMid, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Quantité totale</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: T.text }}>{ticket.total_qty}</div>
                </div>
              </div>
            </div>

            <div style={{ background: "#f8f9fb", border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 22px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: T.textLight, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14 }}>Résumé financier</div>

              <TotalRow label="Sous-total produits" value={fmt2(subtotalProducts)} />

              {discountAmt > 0 && (
                <TotalRow
                  label={`Rabais (${ticket.discount_value}${ticket.discount_type})`}
                  value={`— ${fmt2(discountAmt)}`}
                  negative
                />
              )}

              <Divider />
              <TotalRow label="Sous-total après rabais" value={fmt2(subtotalAfterDiscount)} bold />

              <Divider />
              <TotalRow label="Shipping" value="N/A — Pickup en magasin" muted />

              <Divider />
              {taxLines.length === 0 ? (
                <TotalRow label="Taxes" value={ticket.province ? "N/A" : "Province non renseignée"} muted />
              ) : (
                taxLines.map((t: TaxLine) => (
                  <TotalRow key={t.label} label={t.label} value={fmt2(t.amount)} />
                ))
              )}

              {extraFees > 0 && (
                <>
                  <Divider />
                  <TotalRow label="Extra fees" value={fmt2(extraFees)} />
                </>
              )}

              <div style={{ borderTop: `2px solid ${T.main}22`, marginTop: 10, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: T.text }}>TOTAL</span>
                <span style={{ fontSize: 26, fontWeight: 800, color: T.main }}>{fmt2(totalWithTax)}</span>
              </div>

              <div style={{ marginTop: 12, background: "#fff3d4", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: T.orange, fontWeight: 500, lineHeight: 1.5 }}>
                Ce document n'est PAS une facture.<br/>
                La facturation sera effectuée par le manufacturier (SCI).
              </div>
            </div>
          </div>
        </>
      )}

      {showEmailModal && (() => {
        const tpl = tplPickupTicketClient(ticket as unknown as Record<string, unknown>);
        return (
          <SendEmailModal
            isOpen={true}
            onClose={() => setShowEmailModal(false)}
            smtpConfigKey="pickups"
            to={ticket.client_email ?? ""}
            subject={tpl.subject}
            htmlBody={tpl.html}
            textBody={tpl.text}
            templateKey="pickup_ticket_client"
            referenceType="pickup_ticket"
            referenceId={ticket.id}
            attachmentLabel={`${ticket.ticket_number}.pdf`}
            onGetAttachment={() => generatePickupTicketPDFBase64(ticket)}
          />
        );
      })()}

      {showEdit && (
        <EditTicketModal
          ticket={ticket}
          onSaved={handleTicketSaved}
          onCancel={() => setShowEdit(false)}
        />
      )}

      {showCodWarning && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: T.bgCard, borderRadius: 16, padding: "32px 36px", maxWidth: 420, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#fff3d4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>Commande non facturée</div>
                <div style={{ fontSize: 12, color: T.textMid, marginTop: 2 }}>Confirmation requise</div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: T.textMid, lineHeight: "1.6", margin: "0 0 24px 0" }}>
              {ticketIsCod && clientIsCod
                ? "Ce ticket et ce client sont en mode COD."
                : ticketIsCod
                  ? "Ce ticket est en mode COD."
                  : "Ce client est en mode COD."}
              {" "}Cette commande <strong style={{ color: T.text }}>n'a pas encore été facturée</strong>. Voulez-vous quand même la marquer comme récupérée ?
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowCodWarning(false)}
                style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.cardAlt, color: T.textMid, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Annuler
              </button>
              <button onClick={async () => { setShowCodWarning(false); setPendingAction("status-picked_up"); try { await onStatusChange(ticket.id, "picked_up"); } finally { setPendingAction(null); } }}
                style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "#d97706", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Confirmer quand même
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
