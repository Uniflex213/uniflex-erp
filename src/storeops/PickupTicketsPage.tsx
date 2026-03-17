import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import {
  PickupTicket, PickupTicketStatus, PickupBillingStatus,
  STATUS_LABELS, STATUS_COLORS, BILLING_LABELS, BILLING_COLORS,
} from "./storeOpsTypes";
import NewPickupTicketPage from "./NewPickupTicketPage";
import TicketDetailModal from "./TicketDetailModal";
import { logChange } from "../shared/changeLogUtils";
import { useCurrentAgent } from "../hooks/useCurrentAgent";
import { useAuth } from "../contexts/AuthContext";
import { T } from "../theme";

const fmt2 = (n: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-CA", { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }: { status: PickupTicketStatus }) {
  const s = STATUS_COLORS[status];
  return (
    <span style={{ background: s.bg, color: s.color, padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function BillingBadge({ status }: { status: PickupBillingStatus }) {
  const s = BILLING_COLORS[status];
  return (
    <span style={{ background: s.bg, color: s.color, padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      {BILLING_LABELS[status]}
    </span>
  );
}

function KpiCard({ label, value, sub, accent, warn }: { label: string; value: string; sub?: string; accent?: boolean; warn?: boolean }) {
  return (
    <div style={{ background: T.card, borderRadius: 12, padding: "18px 20px", border: `1px solid ${T.border}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.textMid, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: warn ? T.red : accent ? T.main : T.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.textLight, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 8,
  fontSize: 13, fontFamily: "inherit", color: T.text, background: T.bgCard, outline: "none",
};

const selectStyle: React.CSSProperties = { ...inputStyle };

export default function PickupTicketsPage() {
  const { storeCode } = useAuth();
  const agent = useCurrentAgent();
  const [view, setView] = useState<"list" | "new" | "detail">("list");
  const [tickets, setTickets] = useState<PickupTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<PickupTicket | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | PickupTicketStatus>("");
  const [filterBilling, setFilterBilling] = useState<"" | PickupBillingStatus>("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterAgent, setFilterAgent] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({ cancelled: true });

  const loadTickets = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pickup_tickets")
      .select("*, pickup_ticket_items(*)")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setTickets(data.map((t: any) => ({ ...t, items: t.pickup_ticket_items || [] })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTickets();
    const channel = supabase
      .channel("pickup-tickets-billing")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pickup_tickets" }, () => {
        loadTickets();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadTickets]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = tickets.filter(t => new Date(t.issued_at) >= startOfMonth);
  const pendingPickup = tickets.filter(t => t.status === "prepared" || t.status === "ready");
  const sentToManufacturer = tickets.filter(t => t.billing_status === "sent" || t.billing_status === "billed_by_sci");
  const unbilledTickets = tickets.filter(t => t.billing_status === "unbilled" && t.status !== "cancelled");
  const pickedUpTickets = tickets.filter(t => t.status === "picked_up" && t.picked_up_at);
  const avgHours = pickedUpTickets.length > 0
    ? Math.round(pickedUpTickets.reduce((s, t) => {
        const diff = new Date(t.picked_up_at!).getTime() - new Date(t.issued_at).getTime();
        return s + diff / 3600000;
      }, 0) / pickedUpTickets.length)
    : 0;
  const getTotal = (t: PickupTicket) => t.total_with_tax > 0 ? t.total_with_tax : t.total_value;
  const confirmedThisMonth = thisMonth.filter(t => t.status === "picked_up" || t.billing_status !== "unbilled");

  const filtered = tickets.filter(t => {
    if (search) {
      const q = search.toLowerCase();
      if (!t.ticket_number.toLowerCase().includes(q) &&
          !t.client_name.toLowerCase().includes(q) &&
          !(t.items || []).some((i: any) => i.product_name.toLowerCase().includes(q))) return false;
    }
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterBilling && t.billing_status !== filterBilling) return false;
    if (filterAgent && !t.agent_name.toLowerCase().includes(filterAgent.toLowerCase())) return false;
    if (filterDateFrom && new Date(t.issued_at) < new Date(filterDateFrom)) return false;
    if (filterDateTo && new Date(t.issued_at) > new Date(filterDateTo + "T23:59:59")) return false;
    return true;
  });

  const uniqueAgents = Array.from(new Set(tickets.map(t => t.agent_name))).filter(Boolean);

  function resetFilters() {
    setSearch(""); setFilterStatus(""); setFilterBilling("");
    setFilterDateFrom(""); setFilterDateTo(""); setFilterAgent("");
  }

  function handleCreated(ticket: PickupTicket) {
    setTickets(prev => [ticket, ...prev]);
    setSelectedTicket(ticket);
    setView("detail");
  }

  function openDetail(ticket: PickupTicket) {
    setSelectedTicket(ticket);
    setView("detail");
  }

  async function updateTicketStatus(ticketId: string, status: PickupTicketStatus) {
    const ticket = tickets.find(t => t.id === ticketId);
    const updates: any = { status, updated_at: new Date().toISOString() };
    if (status === "picked_up") updates.picked_up_at = new Date().toISOString();
    await supabase.from("pickup_tickets").update(updates).eq("id", ticketId);
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...updates } : t));
    if (selectedTicket?.id === ticketId) setSelectedTicket(prev => prev ? { ...prev, ...updates } : prev);
    if (ticket) {
      logChange({
        entity_type: "pickup_ticket", entity_id: ticketId, entity_label: ticket.ticket_number,
        field_name: "Statut", old_value: STATUS_LABELS[ticket.status], new_value: STATUS_LABELS[status],
        change_type: "status_change", changed_by: agent.name,
      });
      if (status === "picked_up" && ticket.items && ticket.items.length > 0) {
        for (const item of ticket.items) {
          if (!item.product_id) continue;
          const { data: prod } = await supabase.from("sale_products").select("stock_qty").eq("id", item.product_id).maybeSingle();
          const before = prod?.stock_qty ?? 0;
          const after = Math.max(0, before - item.quantity);
          await supabase.from("sale_products").update({ stock_qty: after }).eq("id", item.product_id);
          await supabase.from("stock_movements").insert({
            product_id: item.product_id,
            product_name: item.product_name,
            movement_type: "pickup_out",
            quantity: -(item.quantity),
            stock_before: before,
            stock_after: after,
            reference_type: "pickup_ticket",
            reference_id: ticketId,
            reference_number: ticket.ticket_number,
            reason: `Récupéré — ${ticket.client_name}`,
            agent_name: ticket.agent_name || agent.name,
            store_code: storeCode ?? "BSB",
            notes: "",
          });
        }
      }
      if (status === "cancelled" && (ticket.status === "prepared" || ticket.status === "ready") && ticket.items && ticket.items.length > 0) {
        for (const item of ticket.items) {
          if (!item.product_id) continue;
          const { data: prod } = await supabase.from("sale_products").select("stock_qty").eq("id", item.product_id).maybeSingle();
          const qty = prod?.stock_qty ?? 0;
          await supabase.from("stock_movements").insert({
            product_id: item.product_id,
            product_name: item.product_name,
            movement_type: "release",
            quantity: item.quantity,
            stock_before: qty,
            stock_after: qty,
            reference_type: "pickup_ticket",
            reference_id: ticketId,
            reference_number: ticket.ticket_number,
            reason: `Ticket annulé — ${ticket.client_name}`,
            agent_name: ticket.agent_name || agent.name,
            store_code: storeCode ?? "BSB",
            notes: "",
          });
        }
      }
    }
  }

  async function updateBillingStatus(ticketId: string, billing_status: PickupBillingStatus) {
    const ticket = tickets.find(t => t.id === ticketId);
    const updates = { billing_status, updated_at: new Date().toISOString() };
    await supabase.from("pickup_tickets").update(updates).eq("id", ticketId);
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...updates } : t));
    if (selectedTicket?.id === ticketId) setSelectedTicket(prev => prev ? { ...prev, ...updates } : prev);
    if (ticket) {
      logChange({
        entity_type: "pickup_ticket", entity_id: ticketId, entity_label: ticket.ticket_number,
        field_name: "Statut de facturation", old_value: BILLING_LABELS[ticket.billing_status], new_value: BILLING_LABELS[billing_status],
        change_type: "status_change", changed_by: agent.name,
      });
    }
  }

  function handleTicketUpdated(updated: PickupTicket) {
    setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
    setSelectedTicket(updated);
  }

  if (view === "new") {
    return <NewPickupTicketPage onBack={() => setView("list")} onCreated={handleCreated} />;
  }

  if (view === "detail" && selectedTicket) {
    return (
      <TicketDetailModal
        ticket={selectedTicket}
        onBack={() => setView("list")}
        onStatusChange={updateTicketStatus}
        onBillingChange={updateBillingStatus}
        onTicketUpdated={handleTicketUpdated}
      />
    );
  }

  return (
    <div style={{ padding: "28px 32px", background: T.cardAlt, minHeight: "100%" }}>
      <style>{`
        @keyframes breathe { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0)} 50%{box-shadow:0 0 0 10px rgba(99,102,241,0.2)} }
        .breathe-btn { animation: breathe 2.5s ease-in-out infinite; }
        .ticket-row:hover { background: #f8f9ff !important; cursor: pointer; }
      `}</style>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: T.text, margin: 0 }}>Pickup Tickets</h1>
          <div style={{ fontSize: 13, color: T.textMid, marginTop: 4 }}>Gestion des sorties de consignation</div>
        </div>
        <button onClick={() => setView("new")} className="breathe-btn"
          style={{ background: T.main, color: "#fff", border: "none", borderRadius: 10, padding: "12px 22px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", letterSpacing: 0.3 }}>
          + NOUVEAU PICKUP TICKET
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 14, marginBottom: 24 }}>
        <KpiCard label="Tickets ce mois" value={String(thisMonth.length)} sub="Émis depuis le 1er" />
        <KpiCard label="Valeur ce mois (taxes)" value={fmt2(confirmedThisMonth.reduce((s, t) => s + getTotal(t), 0))} accent sub="Facturés ou ramassés" />
        <KpiCard label="En attente" value={String(pendingPickup.length)} sub="Préparés / Prêts" />
        <KpiCard label="Envoyés" value={String(sentToManufacturer.length)} sub="Au manufacturier" />
        <KpiCard label="Non-facturés" value={String(unbilledTickets.length)} warn={unbilledTickets.length > 0} sub="Tickets actifs" />
        <KpiCard
          label="Délai moyen"
          value={avgHours < 24 ? `${avgHours}h` : `${Math.round(avgHours / 24)}j`}
          sub="Émission → Ramassage"
        />
      </div>

      <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: "16px 20px", marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.cardAlt, borderRadius: 8, padding: "8px 12px", minWidth: 260 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.textMid} strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="# ticket, client, produit..." style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, fontFamily: "inherit", width: "100%" }} />
        </div>
        <select style={selectStyle} value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}>
          <option value="">Tous les statuts</option>
          <option value="prepared">Préparé</option>
          <option value="ready">Prêt au ramassage</option>
          <option value="picked_up">Récupéré</option>
          <option value="cancelled">Annulé</option>
        </select>
        <select style={selectStyle} value={filterBilling} onChange={e => setFilterBilling(e.target.value as any)}>
          <option value="">Facturation — Tous</option>
          <option value="unbilled">Non-facturé</option>
          <option value="sent">Envoyé</option>
          <option value="billed_by_sci">Facturé par SCI</option>
        </select>
        <input type="date" style={selectStyle} value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} title="Date de début" />
        <input type="date" style={selectStyle} value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} title="Date de fin" />
        <select style={selectStyle} value={filterAgent} onChange={e => setFilterAgent(e.target.value)}>
          <option value="">Tous les agents</option>
          {uniqueAgents.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {(search || filterStatus || filterBilling || filterDateFrom || filterDateTo || filterAgent) && (
          <button onClick={resetFilters} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 12, color: T.textMid, fontFamily: "inherit" }}>
            Réinitialiser
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: 12, color: T.textMid }}>{filtered.length} ticket{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {loading ? (
        <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 40, textAlign: "center", color: T.textMid }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.textMid, marginBottom: 8 }}>Aucun pickup ticket</div>
          <div style={{ fontSize: 13, color: T.textLight }}>Créez votre premier pickup ticket avec le bouton en haut à droite.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {(["prepared", "ready", "picked_up", "cancelled"] as PickupTicketStatus[]).map(status => {
            const group = filtered.filter(t => t.status === status);
            if (group.length === 0) return null;
            const collapsed = !!collapsedGroups[status];
            const sc = STATUS_COLORS[status];
            const groupTotal = group.reduce((s, t) => s + getTotal(t), 0);
            const toggleCollapse = () => setCollapsedGroups(prev => ({ ...prev, [status]: !prev[status] }));
            const TABLE_HEADERS = ["# Ticket", "Date", "Client", "Produits", "Qté", "Valeur", "Facturé", "Agent", "Actions"];

            return (
              <div key={status} style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                <div
                  onClick={toggleCollapse}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", cursor: "pointer", background: collapsed ? T.cardAlt : "#fff", borderBottom: collapsed ? "none" : `1px solid ${T.border}`, userSelect: "none" }}
                >
                  <span style={{ background: sc.bg, color: sc.color, padding: "4px 12px", borderRadius: 7, fontSize: 12, fontWeight: 800 }}>
                    {STATUS_LABELS[status]}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{group.length} ticket{group.length !== 1 ? "s" : ""}</span>
                  {status !== "cancelled" && (
                    <span style={{ fontSize: 12, color: T.textMid }}>— {fmt2(groupTotal)}</span>
                  )}
                  <span style={{ marginLeft: "auto", fontSize: 18, color: T.textLight, lineHeight: 1 }}>{collapsed ? "›" : "‹"}</span>
                </div>

                {!collapsed && (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: T.cardAlt }}>
                        {TABLE_HEADERS.map(h => (
                          <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.8, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.map(ticket => {
                        const productNames = (ticket.items || []).map((it: any) => it.product_name).filter(Boolean);
                        const displayProducts = productNames.length <= 2
                          ? productNames.join(", ")
                          : `${productNames.slice(0, 2).join(", ")} +${productNames.length - 2}`;
                        return (
                          <tr key={ticket.id} className="ticket-row" onClick={() => openDetail(ticket)}
                            style={{ borderTop: `1px solid ${T.border}`, transition: "background 0.1s" }}>
                            <td style={{ padding: "13px 16px" }}>
                              <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: T.main }}>{ticket.ticket_number}</span>
                            </td>
                            <td style={{ padding: "13px 16px", fontSize: 12, color: T.textMid, whiteSpace: "nowrap" }}>
                              {formatDateTime(ticket.issued_at)}
                            </td>
                            <td style={{ padding: "13px 16px" }}>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{ticket.client_name}</div>
                              {ticket.is_walkin && <div style={{ fontSize: 10, color: T.orange, fontWeight: 600 }}>Walk-in</div>}
                            </td>
                            <td style={{ padding: "13px 16px", fontSize: 12, color: T.textMid, maxWidth: 200 }}>
                              <span title={productNames.join(", ")}>{displayProducts || "—"}</span>
                            </td>
                            <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 600, color: T.text }}>{ticket.total_qty}</td>
                            <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 700, color: T.main, whiteSpace: "nowrap" }}>{fmt2(getTotal(ticket))}</td>
                            <td style={{ padding: "13px 16px" }}><BillingBadge status={ticket.billing_status} /></td>
                            <td style={{ padding: "13px 16px", fontSize: 12, color: T.textMid }}>{ticket.agent_name}</td>
                            <td style={{ padding: "13px 16px" }}>
                              <button onClick={e => { e.stopPropagation(); openDetail(ticket); }}
                                style={{ background: T.blueBg, color: T.blue, border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit" }}>
                                Voir
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
