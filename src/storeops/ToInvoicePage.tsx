import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { InvoiceDoc, SciEmailLog, T, fmt, BILLING_LABEL, PAYMENT_LABEL, PAYMENT_COLORS } from "./toinvoice/toInvoiceTypes";
import ToInvoiceKpiBar from "./toinvoice/ToInvoiceKpiBar";
import TabToSend from "./toinvoice/TabToSend";
import TabSent from "./toinvoice/TabSent";
import TabBilled from "./toinvoice/TabBilled";
import TabPaid from "./toinvoice/TabPaid";
import TabHistory from "./toinvoice/TabHistory";
import TabAnalytics from "./toinvoice/TabAnalytics";
import EmailToolModal from "./toinvoice/EmailToolModal";
import PaymentRecordModal from "./toinvoice/PaymentRecordModal";

type Tab = "to_send" | "sent" | "billed" | "paid" | "history" | "analytics";

const TABS: { key: Tab; label: string }[] = [
  { key: "to_send", label: "A envoyer" },
  { key: "sent", label: "Envoye — en attente" },
  { key: "billed", label: "Facture" },
  { key: "paid", label: "Paye & Ferme" },
  { key: "history", label: "Historique des envois" },
  { key: "analytics", label: "Analytics" },
];

function mapPickup(row: Record<string, unknown>): InvoiceDoc {
  return {
    id: row.id as string,
    document_type: "pickup",
    document_number: row.ticket_number as string,
    client_name: (row.client_name as string) || (row.walkin_name as string) || "—",
    value: Number(row.total_with_tax) || Number(row.total_value) || 0,
    issued_at: row.issued_at as string,
    billing_status: row.billing_status as InvoiceDoc["billing_status"],
    sent_to_sci_at: (row.sent_to_sci_at as string | null) ?? null,
    sci_invoice_number: (row.sci_invoice_number as string) || "",
    sci_billed_amount: Number(row.sci_billed_amount) || 0,
    sci_billed_at: (row.sci_billed_at as string | null) ?? null,
    payment_status: (row.payment_status as InvoiceDoc["payment_status"]) || "En attente",
    paid_amount: Number(row.paid_amount) || 0,
    paid_at: (row.paid_at as string | null) ?? null,
    closed_at: (row.closed_at as string | null) ?? null,
    closed_by: (row.closed_by as string | null) ?? null,
    pickup_status: (row.status as string) || "",
    raw: row,
  };
}

function mapOrder(row: Record<string, unknown>): InvoiceDoc {
  return {
    id: row.id as string,
    document_type: "order",
    document_number: row.id as string,
    client_name: (row.client as string) || "—",
    value: Number(row.total) || 0,
    issued_at: (row.date as string) || (row.created_at as string),
    billing_status: (row.billing_status as InvoiceDoc["billing_status"]) || "unbilled",
    sent_to_sci_at: (row.sent_to_sci_at as string | null) ?? null,
    sci_invoice_number: (row.sci_invoice_number as string) || "",
    sci_billed_amount: Number(row.sci_billed_amount) || 0,
    sci_billed_at: (row.sci_billed_at as string | null) ?? null,
    payment_status: (row.payment_status as InvoiceDoc["payment_status"]) || "En attente",
    paid_amount: Number(row.paid_amount) || 0,
    paid_at: (row.paid_at as string | null) ?? null,
    closed_at: (row.closed_at as string | null) ?? null,
    closed_by: (row.closed_by as string | null) ?? null,
    order_status: (row.status as string) || "",
    raw: row,
  };
}

function DocDetailModal({ doc, onClose }: { doc: InvoiceDoc; onClose: () => void }) {
  const raw = doc.raw || {};
  const isPickup = doc.document_type === "pickup";
  const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 };
  const valueStyle: React.CSSProperties = { fontSize: 13, color: T.text, fontWeight: 500 };

  function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
    return (
      <div>
        <div style={labelStyle}>{label}</div>
        <div style={valueStyle}>{value !== null && value !== undefined && value !== "" ? String(value) : "—"}</div>
      </div>
    );
  }

  const payColors = PAYMENT_COLORS[doc.payment_status] || PAYMENT_COLORS["En attente"];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9000, display: "flex", justifyContent: "center", overflowY: "auto", padding: 20 }}>
      <div style={{ background: T.card, borderRadius: 16, width: "100%", maxWidth: 600, margin: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <span style={{ background: isPickup ? T.blueBg : T.greenBg, color: isPickup ? T.blue : T.green, padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700 }}>
                {isPickup ? "Pickup" : "Commande"}
              </span>
              <span style={{ background: payColors.bg, color: payColors.color, padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700 }}>
                {PAYMENT_LABEL[doc.payment_status]}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: T.text }}>{doc.document_number}</h2>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: T.textMid }}>{doc.client_name}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: T.textMid, lineHeight: 1 }}>x</button>
        </div>

        <div style={{ padding: "18px 22px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Client" value={doc.client_name} />
          <Field label="Valeur totale" value={fmt(doc.value)} />
          <Field label="Date document" value={new Date(doc.issued_at).toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" })} />
          <Field label="Statut facturation" value={BILLING_LABEL[doc.billing_status]} />
          {doc.sent_to_sci_at && <Field label="Envoye a SCI le" value={new Date(doc.sent_to_sci_at).toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" })} />}
          {doc.sci_invoice_number && <Field label="# Facture SCI" value={doc.sci_invoice_number} />}
          {doc.sci_billed_amount > 0 && <Field label="Montant facture SCI" value={fmt(doc.sci_billed_amount)} />}
          {doc.sci_billed_at && <Field label="Date facturation SCI" value={new Date(doc.sci_billed_at).toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" })} />}
          <Field label="Montant paye" value={fmt(doc.paid_amount)} />
          <Field label="Statut paiement" value={PAYMENT_LABEL[doc.payment_status]} />
          {doc.paid_at && <Field label="Paye le" value={new Date(doc.paid_at).toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" })} />}
          {doc.closed_at && <Field label="Ferme le" value={new Date(doc.closed_at).toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" })} />}
          {isPickup && <Field label="Methode de paiement" value={raw.payment_method as string} />}
          {isPickup && <Field label="Province" value={raw.province as string} />}
          {!isPickup && <Field label="Destination" value={raw.destination as string} />}
          {!isPickup && <Field label="Type de livraison" value={raw.delivery_type as string} />}
        </div>

        <div style={{ padding: "14px 22px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: T.cardAlt, color: T.text, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ToInvoicePage() {
  const { profile, storeCode } = useAuth();
  const [tab, setTab] = useState<Tab>("to_send");
  const [docs, setDocs] = useState<InvoiceDoc[]>([]);
  const [logs, setLogs] = useState<SciEmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailDoc, setDetailDoc] = useState<InvoiceDoc | null>(null);
  const [bulkEmailDocs, setBulkEmailDocs] = useState<InvoiceDoc[] | null>(null);
  const [paymentDoc, setPaymentDoc] = useState<InvoiceDoc | null>(null);

  const isMagasin = profile?.role === "magasin";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let pickupQuery = supabase
        .from("pickup_tickets")
        .select("*")
        .neq("status", "cancelled")
        .order("issued_at", { ascending: false });
      if (isMagasin && storeCode) pickupQuery = pickupQuery.eq("store_code", storeCode);

      let orderQuery = supabase
        .from("orders")
        .select("*")
        .in("status", ["en_production", "produced", "shipped", "completed"])
        .order("date", { ascending: false });
      if (isMagasin && storeCode) orderQuery = orderQuery.eq("store_code", storeCode);

      const [pickupRes, orderRes, logRes, logItemRes] = await Promise.all([
        pickupQuery,
        orderQuery,
        supabase
          .from("sci_email_log")
          .select("*")
          .order("sent_at", { ascending: false }),
        supabase
          .from("sci_email_log_items")
          .select("*"),
      ]);

      const pickupDocs = (pickupRes.data || []).map(r => mapPickup(r as Record<string, unknown>));
      const orderDocs = (orderRes.data || []).map(r => mapOrder(r as Record<string, unknown>));
      setDocs([...pickupDocs, ...orderDocs]);

      const logItems = logItemRes.data || [];
      const enrichedLogs = (logRes.data || []).map((l: Record<string, unknown>) => ({
        ...l,
        items: logItems.filter((i: Record<string, unknown>) => i.log_id === l.id),
      } as SciEmailLog));
      setLogs(enrichedLogs);
    } finally {
      setLoading(false);
    }
  }, [isMagasin, storeCode]);

  useEffect(() => { load(); }, [load]);

  const toSendDocs = docs.filter(d => d.billing_status === "unbilled");
  const sentDocs = docs.filter(d => d.billing_status === "sent");
  const billedDocs = docs.filter(d => d.billing_status === "billed_by_sci");
  const paidDocs = billedDocs.filter(d => d.payment_status === "Payé");
  const unpaidBilledDocs = billedDocs.filter(d => d.payment_status !== "Payé");

  const handleReopenDoc = async (doc: InvoiceDoc) => {
    const table = doc.document_type === "pickup" ? "pickup_tickets" : "orders";
    await supabase.from(table).update({
      payment_status: doc.paid_amount > 0 ? "Partiel" : "En attente",
      paid_at: null,
      closed_at: null,
      closed_by: null,
    }).eq("id", doc.id);
    load();
  };

  function TabBadge({ count, warn, accent }: { count: number; warn?: boolean; accent?: boolean }) {
    if (count === 0) return null;
    return (
      <span style={{ background: warn ? T.red : accent ? T.green : T.main, color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, marginLeft: 6 }}>
        {count}
      </span>
    );
  }

  return (
    <div style={{ padding: "28px 32px", background: T.cardAlt, minHeight: "100%", fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: T.text, margin: 0 }}>To Invoice — Suivi de facturation</h1>
          <div style={{ fontSize: 13, color: T.textMid, marginTop: 4 }}>Documents a envoyer au manufacturier SCI pour facturation</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {toSendDocs.length > 0 && (
            <button
              onClick={() => setBulkEmailDocs(toSendDocs)}
              style={{ background: T.main, color: "#fff", border: "none", borderRadius: 9, padding: "11px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              Envoyer tout a SCI
              <span style={{ background: "rgba(255,255,255,0.25)", borderRadius: 4, padding: "1px 6px", fontSize: 11 }}>{toSendDocs.length}</span>
            </button>
          )}
        </div>
      </div>

      {!loading && <ToInvoiceKpiBar docs={docs} />}

      <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, overflowX: "auto" }}>
          {TABS.map(t => {
            const isActive = tab === t.key;
            const count = t.key === "to_send" ? toSendDocs.length
              : t.key === "sent" ? sentDocs.length
              : t.key === "billed" ? unpaidBilledDocs.length
              : t.key === "paid" ? paidDocs.length
              : t.key === "history" ? logs.length : 0;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  background: "none", border: "none", padding: "14px 20px", cursor: "pointer",
                  fontFamily: "inherit", fontSize: 13, fontWeight: isActive ? 700 : 500,
                  color: isActive ? T.main : T.textMid,
                  borderBottom: isActive ? `2px solid ${T.main}` : "2px solid transparent",
                  whiteSpace: "nowrap", transition: "color 0.15s",
                  display: "flex", alignItems: "center",
                }}
              >
                {t.label}
                <TabBadge count={count} warn={t.key === "to_send" && count > 0} accent={t.key === "paid"} />
              </button>
            );
          })}
        </div>

        <div style={{ padding: "20px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: T.textMid, fontSize: 13 }}>Chargement...</div>
          ) : (
            <>
              {tab === "to_send" && <TabToSend docs={toSendDocs} onRefresh={load} onDocClick={setDetailDoc} />}
              {tab === "sent" && <TabSent docs={sentDocs} onRefresh={load} onDocClick={setDetailDoc} />}
              {tab === "billed" && <TabBilled docs={billedDocs} onRefresh={load} onDocClick={setDetailDoc} onRecordPayment={setPaymentDoc} />}
              {tab === "paid" && <TabPaid docs={billedDocs} onDocClick={setDetailDoc} isGodAdmin={true} onReopenDoc={handleReopenDoc} />}
              {tab === "history" && <TabHistory logs={logs} />}
              {tab === "analytics" && <TabAnalytics docs={docs} />}
            </>
          )}
        </div>
      </div>

      {detailDoc && <DocDetailModal doc={detailDoc} onClose={() => setDetailDoc(null)} />}
      {bulkEmailDocs && (
        <EmailToolModal
          docs={bulkEmailDocs}
          logType="send"
          onClose={() => setBulkEmailDocs(null)}
          onSent={() => { setBulkEmailDocs(null); load(); }}
        />
      )}
      {paymentDoc && (
        <PaymentRecordModal
          doc={paymentDoc}
          onClose={() => setPaymentDoc(null)}
          onSaved={() => { setPaymentDoc(null); load(); }}
        />
      )}
    </div>
  );
}
