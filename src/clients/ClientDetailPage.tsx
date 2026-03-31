import React, { useState, useRef, useEffect } from "react";
import {
  Client, ClientNote, CreditNote, ClientDispute,
  TIER_COLORS, TIER_BG, TYPE_COLORS, TYPE_BG,
} from "./clientTypes";
import { CRMActivity } from "../sales/crmTypes";
import { SampleRequest } from "../sales/sampleTypes";
import { supabase } from "../supabaseClient";
import { NotesTab, CreditNotesTab, DisputesTab, PickupTab, CRMHistoryTab, SamplesTabClient } from "./ClientDetailTabs";
import ClientForm from "./ClientForm";
import { Pricelist } from "../pricelist/pricelistTypes";
import { PrefillData } from "../AppContext";
import { jsPDF } from "jspdf";
import { logChanges, diffFields } from "../shared/changeLogUtils";
import ChangeLogPanel from "../shared/ChangeLogPanel";
import { useCurrentAgent } from "../hooks/useCurrentAgent";
import { Order, STATUS_CONFIG, ORDER_BILLING_LABELS, ORDER_BILLING_COLORS } from "../orders/orderTypes";
import { PickupTicket as RealPickupTicket, STATUS_LABELS as PT_STATUS_LABELS, STATUS_COLORS as PT_STATUS_COLORS, BILLING_LABELS as PT_BILLING_LABELS } from "../storeops/storeOpsTypes";
import { T } from "../theme";
import { useLanguage } from "../i18n/LanguageContext";

const fmtDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString("fr-CA", { year: "numeric", month: "short", day: "numeric" }) : "—";
const fmtCAD = (n: number) => n.toLocaleString("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

type Tab = "info" | "orders" | "pricelists" | "samples" | "notes" | "credit_notes" | "disputes" | "pickup" | "crm_history" | "change_log";

interface Props {
  client: Client;
  onBack: () => void;
  onUpdate: (client: Client) => void;
  pricelists?: Pricelist[];
  navigate?: (page: string, prefill?: PrefillData) => void;
  crmActivities?: CRMActivity[];
  clientSamples?: SampleRequest[];
  isAdmin?: boolean;
  onDeleteClient?: (clientId: string) => void;
  onReassignClient?: (client: Client) => void;
}

function generateClientPDF(client: Client, notes: ClientNote[], creditNotes: CreditNote[], disputes: ClientDispute[]) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const margin = 18;
  let y = 20;

  doc.setFillColor(9, 2, 184);
  doc.rect(0, 0, W, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("UNIFLEX", margin, 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Rapport Client — Document interne confidentiel", margin, 21);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleDateString("fr-CA"), W - margin - 25, 14);

  y = 40;
  doc.setTextColor(28, 28, 30);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(client.company_name, margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(99, 99, 102);
  doc.text(`${client.client_type} | Tier: ${client.tier} | Code: ${client.client_code}`, margin, y);
  y += 4;
  doc.text(`Agent: ${client.agent_name} | Région: ${client.region || "—"} | Source: ${client.source}`, margin, y);

  y += 8;
  doc.setDrawColor(220, 220, 225);
  doc.line(margin, y, W - margin, y);
  y += 6;

  doc.setTextColor(9, 2, 184);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Informations du contact", margin, y);
  y += 5;
  doc.setTextColor(28, 28, 30);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const contactLines = [
    `Contact: ${client.contact_first_name} ${client.contact_last_name}${client.contact_title ? ` — ${client.contact_title}` : ""}`,
    `Email: ${client.email}  |  Tél: ${client.phone}`,
    `Facturation: ${[client.billing_address, client.billing_city, client.billing_province, client.billing_country].filter(Boolean).join(", ") || "—"}`,
    `Paiement: ${client.payment_terms}  |  Devise: ${client.currency}`,
  ];
  contactLines.forEach(l => { doc.text(l, margin, y); y += 4.5; });

  y += 4;
  doc.setTextColor(9, 2, 184);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Notes (${notes.length})`, margin, y);
  y += 5;
  doc.setTextColor(28, 28, 30);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  if (notes.length === 0) {
    doc.text("Aucune note.", margin, y); y += 5;
  } else {
    notes.slice(0, 5).forEach(n => {
      const date = new Date(n.created_at).toLocaleDateString("fr-CA");
      const text = `${date} — ${n.author_name}: ${n.content.slice(0, 80)}${n.content.length > 80 ? "..." : ""}`;
      doc.text(text, margin, y); y += 4.5;
    });
    if (notes.length > 5) { doc.text(`... et ${notes.length - 5} autres notes.`, margin, y); y += 4.5; }
  }

  y += 4;
  doc.setTextColor(9, 2, 184);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Notes de crédit (${creditNotes.length})`, margin, y);
  y += 5;
  doc.setTextColor(28, 28, 30);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  creditNotes.slice(0, 5).forEach((cn, i) => {
    const amount = Number(cn.amount).toLocaleString("fr-CA", { style: "currency", currency: "CAD" });
    doc.text(`NC-${String(i+1).padStart(3,"0")} | ${cn.reason} | ${amount} | ${cn.status}`, margin, y); y += 4.5;
  });
  if (creditNotes.length === 0) { doc.text("Aucune note de crédit.", margin, y); y += 4.5; }

  y += 4;
  doc.setTextColor(9, 2, 184);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Disputes (${disputes.length})`, margin, y);
  y += 5;
  doc.setTextColor(28, 28, 30);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  disputes.slice(0, 5).forEach((d, i) => {
    doc.text(`DSP-${String(i+1).padStart(3,"0")} | ${d.subject} | ${d.priority} | ${d.status}`, margin, y); y += 4.5;
  });
  if (disputes.length === 0) { doc.text("Aucune dispute.", margin, y); y += 4.5; }

  doc.setFontSize(7);
  doc.setTextColor(180, 180, 185);
  doc.text("Document interne — Confidentiel — UNIFLEX", W / 2, 290, { align: "center" });
  doc.setFontSize(7);
  doc.text(`Généré le ${new Date().toLocaleString("fr-CA")}`, W / 2, 294, { align: "center" });

  doc.save(`rapport_client_${client.client_code || client.company_name.replace(/\s/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
}


function ActionButton({ label, color, onClick }: { label: string; color?: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "9px 14px", borderRadius: 8,
        border: `1.5px solid ${color || T.main}22`,
        background: `${color || T.main}0a`,
        color: color || T.main, fontSize: 12, fontWeight: 700, cursor: "pointer",
        fontFamily: "inherit", transition: "all 0.15s", whiteSpace: "nowrap",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${color || T.main}18`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${color || T.main}0a`; }}
    >
      {label}
    </button>
  );
}

export default function ClientDetailPage({
  client: initialClient,
  onBack,
  onUpdate,
  pricelists = [],
  navigate,
  crmActivities = [],
  clientSamples = [],
  isAdmin = false,
  onDeleteClient,
  onReassignClient,
}: Props) {
  const agent = useCurrentAgent();
  const { t } = useLanguage();
  const [client, setClient] = useState(initialClient);
  const [tab, setTab] = useState<Tab>("info");
  const [showEdit, setShowEdit] = useState(false);
  const [showCreditForm, setShowCreditForm] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [notes, setNotes] = useState(client.notes);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [clientOrders, setClientOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [realPickupTickets, setRealPickupTickets] = useState<RealPickupTicket[]>([]);

  useEffect(() => { setClient(initialClient); setNotes(initialClient.notes); }, [initialClient.id]);

  useEffect(() => {
    const loadOrders = async () => {
      setOrdersLoading(true);
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("client_id", initialClient.id)
        .order("created_at", { ascending: false });
      if (data) {
        setClientOrders(data.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          date: ((r.date as string) || "").split("T")[0],
          client: r.client as string,
          clientId: r.client_id as string,
          motif: r.motif as Order["motif"],
          vendeurCode: r.vendeur_code as string,
          destination: r.destination as Order["destination"],
          deliveryAddress: r.delivery_address as string,
          deliveryType: r.delivery_type as Order["deliveryType"],
          label: r.label as Order["label"],
          products: (r.products as Order["products"]) ?? [],
          subtotal: Number(r.subtotal) || 0,
          total: Number(r.total) || 0,
          status: r.status as Order["status"],
          createdBy: r.created_by as string,
          billing_status: (r.billing_status as Order["billing_status"]) ?? "unbilled",
        } as Order)));
      }
      setOrdersLoading(false);
    };
    const loadPickupTickets = async () => {
      const { data } = await supabase
        .from("pickup_tickets")
        .select("*, pickup_ticket_items(*)")
        .eq("client_id", initialClient.id)
        .order("created_at", { ascending: false });
      if (data) setRealPickupTickets(data.map((r: any) => ({ ...r, items: r.pickup_ticket_items })));
    };
    loadOrders();
    loadPickupTickets();
  }, [initialClient.id]);

  const clientNotes = client.client_notes || [];
  const creditNotes = client.client_credit_notes || [];
  const disputes = client.client_disputes || [];
  const pickupTickets = client.client_pickup_tickets || [];

  const daysSinceCreated = Math.floor((Date.now() - new Date(client.created_at).getTime()) / 86400000);
  const isInactive = daysSinceCreated > 60;

  const [historyRefresh, setHistoryRefresh] = useState(0);

  const handleSaveEdit = async (data: Omit<Client, "id" | "created_at" | "updated_at">) => {
    // Strip nested relation arrays — PostgREST rejects unknown columns (PGRST204)
    const { client_notes: _cn, client_credit_notes: _ccn, client_disputes: _cd, client_pickup_tickets: _cpt, ...cleanData } = data as any;
    const updated = { ...client, ...cleanData, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("clients").update({ ...cleanData, updated_at: new Date().toISOString() }).eq("id", client.id);
    if (!error) {
      const diffs = diffFields(client as unknown as Record<string, unknown>, cleanData as unknown as Record<string, unknown>, [
        { key: "company_name", label: "Nom de la compagnie" },
        { key: "contact_first_name", label: "Prénom du contact" },
        { key: "contact_last_name", label: "Nom du contact" },
        { key: "contact_title", label: "Poste du contact" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Téléphone" },
        { key: "client_type", label: "Type de client" },
        { key: "tier", label: "Tier" },
        { key: "region", label: "Région" },
        { key: "payment_terms", label: "Conditions de paiement" },
        { key: "currency", label: "Devise" },
        { key: "billing_address", label: "Adresse de facturation" },
        { key: "billing_city", label: "Ville" },
        { key: "billing_province", label: "Province" },
        { key: "billing_country", label: "Pays" },
        { key: "agent_name", label: "Agent" },
        { key: "source", label: "Source" },
        { key: "special_commission_rate", label: "Commission spéciale" },
      ]);
      if (diffs.length > 0) {
        await logChanges(diffs.map(d => ({
          entity_type: "client" as const,
          entity_id: client.id,
          entity_label: client.company_name,
          field_name: d.label,
          old_value: d.oldVal || null,
          new_value: d.newVal || null,
          change_type: "field_edit" as const,
          changed_by: agent.name,
        })));
        setHistoryRefresh(r => r + 1);
      }
      setClient(updated);
      onUpdate(updated);
    }
    setShowEdit(false);
  };

  const handleAddNote = async (note: Omit<ClientNote, "id" | "created_at">) => {
    const { data, error } = await supabase.from("client_notes").insert({ ...note, created_at: new Date().toISOString() }).select().maybeSingle();
    if (!error && data) {
      const updated = { ...client, client_notes: [...clientNotes, data] };
      setClient(updated); onUpdate(updated);
    }
  };

  const handleAddCreditNote = async (cn: Omit<CreditNote, "id" | "created_at" | "updated_at">) => {
    const now = new Date().toISOString();
    const { data, error } = await supabase.from("client_credit_notes").insert({ ...cn, created_at: now, updated_at: now }).select().maybeSingle();
    if (!error && data) {
      const updated = { ...client, client_credit_notes: [...creditNotes, data] };
      setClient(updated); onUpdate(updated);
    }
    setShowCreditForm(false);
  };

  const handleAddDispute = async (d: Omit<ClientDispute, "id" | "created_at" | "updated_at" | "dispute_messages">) => {
    const now = new Date().toISOString();
    const { data, error } = await supabase.from("client_disputes").insert({ ...d, created_at: now, updated_at: now }).select().maybeSingle();
    if (!error && data) {
      const updated = { ...client, client_disputes: [...disputes, data] };
      setClient(updated); onUpdate(updated);
    }
    setShowDisputeForm(false);
  };

  const handleNotesChange = (val: string) => {
    setNotes(val);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      const updated = { ...client, notes: val, updated_at: new Date().toISOString() };
      await supabase.from("clients").update({ notes: val, updated_at: new Date().toISOString() }).eq("id", client.id);
      setClient(updated); onUpdate(updated);
    }, 2000);
  };

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "info", label: t("clients.tab_info") },
    { key: "orders", label: `${t("clients.tab_orders")} (${clientOrders.length})` },
    { key: "pricelists", label: `${t("clients.tab_pricelists")} (${pricelists.filter(p => p.companyName === client.company_name).length})` },
    { key: "samples", label: `${t("clients.tab_samples")} (${clientSamples.length})` },
    { key: "notes", label: `${t("clients.tab_notes")} (${clientNotes.length})` },
    { key: "credit_notes", label: `${t("clients.tab_credit_notes")} (${creditNotes.length})` },
    { key: "disputes", label: `${t("clients.tab_disputes")} (${disputes.filter(d => d.status === "Ouverte" || d.status === "En cours").length > 0 ? `🔴 ${disputes.length}` : disputes.length})` },
    { key: "pickup", label: `${t("clients.tab_pickup")} (${realPickupTickets.length})` },
    ...(client.is_converted_lead ? [{ key: "crm_history" as Tab, label: t("clients.tab_crm_history") }] : []),
    { key: "change_log" as Tab, label: t("clients.tab_modifications") },
  ];

  const billingAddr = [client.billing_address, client.billing_city, client.billing_province, client.billing_postal_code, client.billing_country].filter(Boolean).join(", ");
  const shippingAddr = client.shipping_same_as_billing ? billingAddr : [client.shipping_address, client.shipping_city, client.shipping_province, client.shipping_postal_code, client.shipping_country].filter(Boolean).join(", ");

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", color: T.text, minHeight: "100%" }}>
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "16px 24px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: T.main, fontSize: 13, fontWeight: 600, padding: 0, display: "flex", alignItems: "center", gap: 6, marginBottom: 14, fontFamily: "inherit" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          {t("clients.back_to_clients")}
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: T.text, margin: 0 }}>{client.company_name}</h1>
              {isInactive && <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(245,158,11,0.15)", color: T.orange, padding: "3px 9px", borderRadius: 10 }}>{t("clients.inactive")}</span>}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 10, background: TYPE_BG[client.client_type], color: TYPE_COLORS[client.client_type] }}>
                {client.client_type}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 10, background: TIER_BG[client.tier], color: TIER_COLORS[client.tier] }}>
                {client.tier}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 10, background: "rgba(34,197,94,0.12)", color: T.green }}>
                {t("clients.active")}
              </span>
              <code style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: T.bg, color: T.textMid, fontFamily: "monospace" }}>
                {client.client_code}
              </code>
            </div>
            <div style={{ fontSize: 13, color: T.textMid }}>
              {t("clients.agent_label")} : <strong style={{ color: T.text }}>{client.agent_name}</strong>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <ActionButton label={`📦 ${t("clients.new_order")}`} color={T.blue} onClick={() => navigate?.("orders", { companyName: client.company_name, address: billingAddr, contactName: `${client.contact_first_name} ${client.contact_last_name}`, clientEmail: client.email, clientPhone: client.phone, clientId: client.id })} />
            <ActionButton label={`📄 ${t("clients.new_pricelist")}`} color={T.main} onClick={() => navigate?.("pricelist", { companyName: client.company_name, address: billingAddr, contactName: `${client.contact_first_name} ${client.contact_last_name}`, clientEmail: client.email, clientPhone: client.phone, clientId: client.id })} />
            <ActionButton label={`📋 ${t("clients.credit_note_btn")}`} color={T.orange} onClick={() => { setTab("credit_notes"); setShowCreditForm(true); }} />
            <ActionButton label={`⚠️ ${t("clients.dispute_btn")}`} color={T.red} onClick={() => { setTab("disputes"); setShowDisputeForm(true); }} />
            <ActionButton label={`📊 ${t("clients.pdf_report")}`} color="#059669" onClick={() => generateClientPDF(client, clientNotes, creditNotes, disputes)} />
            <ActionButton label={`✏️ ${t("clients.edit")}`} color={T.textMid} onClick={() => setShowEdit(true)} />
            {isAdmin && onReassignClient && (
              <ActionButton label={t("clients.reassign")} color="#0891b2" onClick={() => onReassignClient(client)} />
            )}
            {isAdmin && onDeleteClient && (
              <ActionButton label={t("clients.delete_btn")} color={T.red} onClick={() => onDeleteClient(client.id)} />
            )}
          </div>
        </div>
      </div>

      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "0 24px", overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 0, minWidth: "max-content" }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "12px 16px", border: "none", background: "none", cursor: "pointer",
                fontSize: 13, fontWeight: tab === t.key ? 700 : 400,
                color: tab === t.key ? T.main : T.textMid,
                borderBottom: tab === t.key ? `2px solid ${T.main}` : "2px solid transparent",
                fontFamily: "inherit", transition: "all 0.15s", whiteSpace: "nowrap",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 24 }}>
        {tab === "info" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 900 }}>
            <div style={{ background: T.card, borderRadius: 12, padding: 20, border: `1px solid ${T.border}` }}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 14, color: T.text }}>{t("clients.contact_title")}</div>
              {[
                [t("clients.company"), client.company_name],
                [t("clients.contact"), `${client.contact_first_name} ${client.contact_last_name}`],
                [t("clients.position"), client.contact_title || "—"],
                [t("clients.phone"), client.phone],
                [t("clients.phone2"), client.phone_secondary || "—"],
                [t("clients.email_label"), client.email],
                [t("clients.website"), client.website || "—"],
                [t("clients.billing_label"), billingAddr || "—"],
                [t("clients.shipping_label"), shippingAddr || "—"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: T.textLight, width: 90, flexShrink: 0, fontWeight: 600 }}>{k}</span>
                  <span style={{ fontSize: 12, color: T.text }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ background: T.card, borderRadius: 12, padding: 20, border: `1px solid ${T.border}` }}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 14, color: T.text }}>{t("clients.classification_title")}</div>
              {[
                [t("clients.type_label"), client.client_type],
                [t("clients.tier_label"), client.tier],
                [t("clients.region_label"), client.region || "—"],
                [t("clients.client_code_label"), client.client_code],
                [t("clients.payment_label"), client.payment_terms],
                [t("clients.currency_label"), client.currency],
                [t("clients.commission_label"), client.special_commission_rate != null ? `${client.special_commission_rate}%` : t("clients.commission_standard")],
                [t("clients.source_label"), client.source],
                [t("clients.since_label"), fmtDate(client.created_at)],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: T.textLight, width: 90, flexShrink: 0, fontWeight: 600 }}>{k}</span>
                  <span style={{ fontSize: 12, color: T.text }}>{v}</span>
                </div>
              ))}
              <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: T.textLight, width: 90, flexShrink: 0, fontWeight: 600 }}>{t("clients.pricelist_label")}</span>
                {client.pricelist_pdf_url ? (
                  <a href={client.pricelist_pdf_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#dbeafe", color: "#2563eb", padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    {t("clients.open_pdf")}
                  </a>
                ) : (
                  <span style={{ fontSize: 12, color: T.textLight }}>{t("clients.none")}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "orders" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t("clients.orders_title")} ({clientOrders.length})</h3>
              <button onClick={() => navigate?.("orders", { companyName: client.company_name, clientId: client.id })} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: T.blue, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {t("clients.new_order_btn")}
              </button>
            </div>
            {ordersLoading ? (
              <div style={{ textAlign: "center", padding: 40, color: T.textLight }}>{t("clients.loading")}</div>
            ) : clientOrders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: T.textLight, fontSize: 14 }}>{t("clients.no_orders")}</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: T.bg }}>
                    {[t("clients.order_number"), t("clients.date"), t("clients.products_col"), t("clients.amount_col"), t("clients.status_col"), t("clients.billing_col")].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 11, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clientOrders.map(o => {
                    const sc = STATUS_CONFIG[o.status] || { label: o.status, color: T.textMid, bg: T.bg };
                    const bc = ORDER_BILLING_COLORS[o.billing_status || "unbilled"];
                    const productsSummary = (o.products || []).map(p => `${p.product} x${p.qty}`).join(", ");
                    return (
                      <tr key={o.id} style={{ borderBottom: `1px solid ${T.border}`, cursor: "pointer" }} onClick={() => navigate?.("orders")}>
                        <td style={{ padding: "11px 12px", fontFamily: "monospace", fontSize: 12, color: T.main, fontWeight: 700 }}>{o.id}</td>
                        <td style={{ padding: "11px 12px" }}>{fmtDate(o.date)}</td>
                        <td style={{ padding: "11px 12px", color: T.textMid, fontSize: 12, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{productsSummary || "—"}</td>
                        <td style={{ padding: "11px 12px", fontWeight: 700 }}>{fmtCAD(o.total)}</td>
                        <td style={{ padding: "11px 12px" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 10, background: sc.bg, color: sc.color }}>{sc.label}</span>
                        </td>
                        <td style={{ padding: "11px 12px" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 10, background: bc.bg, color: bc.color }}>
                            {ORDER_BILLING_LABELS[o.billing_status || "unbilled"]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "pricelists" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t("clients.quotes_title")}</h3>
              <button onClick={() => navigate?.("pricelist", { companyName: client.company_name, address: billingAddr, contactName: `${client.contact_first_name} ${client.contact_last_name}`, clientEmail: client.email, clientPhone: client.phone })} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: T.main, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {t("clients.new_quote")}
              </button>
            </div>
            {pricelists.filter(p => p.companyName === client.company_name).length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: T.textLight, fontSize: 14 }}>{t("clients.no_pricelists")}</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: T.bg }}>
                    {[t("clients.id_col"), t("clients.date"), t("clients.currency_col"), t("clients.lines_col"), t("clients.validity_col")].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 11, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pricelists.filter(p => p.companyName === client.company_name).map(pl => (
                    <tr key={pl.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: "11px 12px", fontFamily: "monospace", fontSize: 12, color: T.main }}>{pl.id}</td>
                      <td style={{ padding: "11px 12px" }}>{fmtDate(pl.createdAt)}</td>
                      <td style={{ padding: "11px 12px" }}>{pl.currency}</td>
                      <td style={{ padding: "11px 12px" }}>{pl.lines.length} {t("clients.products_suffix")}</td>
                      <td style={{ padding: "11px 12px", color: new Date(pl.validUntil) < new Date() ? T.red : T.green, fontWeight: 600, fontSize: 12 }}>
                        {fmtDate(pl.validUntil)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "samples" && <SamplesTabClient samples={clientSamples} />}

        {tab === "notes" && (
          <NotesTab clientId={client.id} notes={clientNotes} onAdd={handleAddNote} />
        )}

        {tab === "credit_notes" && (
          <CreditNotesTab
            clientId={client.id}
            creditNotes={creditNotes}
            onAdd={handleAddCreditNote}
            showForm={showCreditForm}
            onCloseForm={() => setShowCreditForm(false)}
          />
        )}

        {tab === "disputes" && (
          <DisputesTab
            clientId={client.id}
            disputes={disputes}
            onAdd={handleAddDispute}
            showForm={showDisputeForm}
            onCloseForm={() => setShowDisputeForm(false)}
          />
        )}

        {tab === "pickup" && <PickupTab realTickets={realPickupTickets} />}

        {tab === "crm_history" && (
          <CRMHistoryTab activities={crmActivities} samples={clientSamples} />
        )}

        {tab === "change_log" && (
          <ChangeLogPanel entityType="client" entityId={client.id} refreshKey={historyRefresh} />
        )}
      </div>

      <div style={{ padding: "0 24px 32px" }}>
        <div style={{ background: T.card, borderRadius: 12, padding: 20, border: `1px solid ${T.border}`, maxWidth: 700 }}>
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 12, color: T.text }}>{t("clients.quick_notes")}</div>
          <textarea
            value={notes}
            onChange={e => handleNotesChange(e.target.value)}
            style={{ width: "100%", minHeight: 80, padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 13, resize: "vertical", fontFamily: "inherit", outline: "none", color: T.text, boxSizing: "border-box" }}
            placeholder={t("clients.quick_notes_placeholder")}
          />
        </div>
      </div>

      {showEdit && (
        <ClientForm
          initial={client}
          pricelists={pricelists}
          onSave={handleSaveEdit}
          onCancel={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}
