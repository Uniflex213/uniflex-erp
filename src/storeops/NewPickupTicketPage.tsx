import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import {
  PickupTicket, NewTicketItem, TaxLine,
  FORMATS, PRICE_UNITS, PAYMENT_METHOD_LABELS,
  PaymentMethodOps,
} from "./storeOpsTypes";
import { T } from "../theme";

interface StoreItem {
  id: string;
  name: string;
  formats: string[];
  unit_price: number;
  price_unit: string;
}

const fmt2 = (n: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);

function detectProvince(address: string): string {
  const addr = " " + address.toUpperCase() + " ";
  const map: [string, string][] = [
    [" QC ", "QC"], [",QC ", "QC"], [", QC", "QC"], [" QUÉBEC", "QC"], [" QUEBEC", "QC"],
    [" ON ", "ON"], [",ON ", "ON"], [", ON", "ON"], [" ONTARIO", "ON"],
    [" BC ", "BC"], [",BC ", "BC"], [", BC", "BC"], [" BRITISH COLUMBIA", "BC"],
    [" AB ", "AB"], [",AB ", "AB"], [", AB", "AB"], [" ALBERTA", "AB"],
    [" SK ", "SK"], [",SK ", "SK"], [", SK", "SK"], [" SASKATCHEWAN", "SK"],
    [" MB ", "MB"], [",MB ", "MB"], [", MB", "MB"], [" MANITOBA", "MB"],
    [" NB ", "NB"], [",NB ", "NB"], [", NB", "NB"], [" NEW BRUNSWICK", "NB"],
    [" NS ", "NS"], [",NS ", "NS"], [", NS", "NS"], [" NOVA SCOTIA", "NS"],
    [" PE ", "PE"], [",PE ", "PE"], [", PE", "PE"], [" PRINCE EDWARD", "PE"],
    [" NL ", "NL"], [",NL ", "NL"], [", NL", "NL"], [" NEWFOUNDLAND", "NL"],
    [" NT ", "NT"], [",NT ", "NT"], [", NT", "NT"], [" NORTHWEST", "NT"],
    [" YT ", "YT"], [",YT ", "YT"], [", YT", "YT"], [" YUKON", "YT"],
    [" NU ", "NU"], [",NU ", "NU"], [", NU", "NU"], [" NUNAVUT", "NU"],
  ];
  for (const [pattern, code] of map) {
    if (addr.includes(pattern)) return code;
  }
  return "";
}

function computeTaxLines(province: string, taxableAmount: number): TaxLine[] {
  if (!province) return [];
  const TVH15 = ["NB", "NS", "PE", "NL"];
  if (TVH15.includes(province)) return [{ label: "TVH (15%)", rate: 0.15, amount: taxableAmount * 0.15 }];
  if (province === "ON") return [{ label: "TVH (13%)", rate: 0.13, amount: taxableAmount * 0.13 }];
  const lines: TaxLine[] = [{ label: "TPS (5%)", rate: 0.05, amount: taxableAmount * 0.05 }];
  if (province === "QC") lines.push({ label: "TVQ (9.975%)", rate: 0.09975, amount: taxableAmount * 0.09975 });
  else if (province === "BC") lines.push({ label: "PST (7%)", rate: 0.07, amount: taxableAmount * 0.07 });
  else if (province === "SK") lines.push({ label: "PST (6%)", rate: 0.06, amount: taxableAmount * 0.06 });
  else if (province === "MB") lines.push({ label: "PST (7%)", rate: 0.07, amount: taxableAmount * 0.07 });
  return lines;
}

interface ClientRow {
  id: string;
  company_name: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_title: string;
  phone: string;
  email: string;
  billing_address: string;
  billing_city: string;
  billing_province: string;
  billing_postal_code: string;
  billing_country: string;
  pricelist_pdf_url: string;
}

function buildBillingString(c: ClientRow): string {
  return [c.billing_address, c.billing_city, c.billing_province, c.billing_postal_code, c.billing_country].filter(Boolean).join(", ");
}

const LockIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
);

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: T.textMid, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 }}>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid }}>
        {label}{required && <span style={{ color: T.red, marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "9px 12px", border: `1px solid ${T.border}`, borderRadius: 8,
  fontSize: 13, fontFamily: "inherit", color: T.text, background: T.bgCard,
  outline: "none", width: "100%", boxSizing: "border-box",
};

function TotalRow({ label, value, bold, highlight, negative, muted }: {
  label: React.ReactNode; value: string; bold?: boolean; highlight?: boolean; negative?: boolean; muted?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
      <span style={{ fontSize: 13, color: muted ? T.textLight : T.textMid }}>{label}</span>
      <span style={{ fontSize: highlight ? 18 : 13, fontWeight: bold || highlight ? 800 : 500, color: highlight ? T.main : negative ? T.red : muted ? T.textLight : T.text }}>
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: T.border, margin: "8px 0" }} />;
}

interface Props {
  onBack: () => void;
  onCreated: (ticket: PickupTicket) => void;
}

export default function NewPickupTicketPage({ onBack, onCreated }: Props) {
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const { profile, realProfile, storeCode } = useAuth();
  const ownerId = realProfile?.id ?? profile?.id ?? null;
  const [ticketNumber, setTicketNumber] = useState("");
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDrop, setShowClientDrop] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [isWalkin, setIsWalkin] = useState(false);
  const [walkinName, setWalkinName] = useState("");
  const [walkinPhone, setWalkinPhone] = useState("");
  const [walkinEmail, setWalkinEmail] = useState("");
  const [walkinProvince, setWalkinProvince] = useState("");
  const [issuedAt, setIssuedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [estimatedPickupAt, setEstimatedPickupAt] = useState("");
  const [agentName, setAgentName] = useState(profile?.full_name || "");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodOps>("account_net30");
  const [items, setItems] = useState<NewTicketItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [itemForm, setItemForm] = useState({
    product_id: "", product_name: "", quantity: 1,
    format: "", unit_price: 0, price_unit: "/KIT",
  });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [discountType, setDiscountType] = useState<"%" | "$">("%");
  const [discountValue, setDiscountValue] = useState("");
  const [extraFees, setExtraFees] = useState("");
  const clientRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    generateTicketNumber();
    loadClients();
    loadStoreItems();
  }, []);

  async function loadStoreItems() {
    const { data } = await supabase
      .from("sale_products")
      .select("id, name, formats, store_unit_price, store_price_unit")
      .eq("is_active", true)
      .order("name");
    if (data) setStoreItems(data.map((p: any) => ({
      id: p.id, name: p.name, formats: p.formats || [],
      unit_price: p.store_unit_price || 0, price_unit: p.store_price_unit || "/KIT",
    })) as StoreItem[]);
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) {
        setShowClientDrop(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function generateTicketNumber() {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yy = String(now.getFullYear()).slice(2);
    const period = `${mm}${yy}`;
    const { data } = await supabase
      .from("pickup_ticket_counter")
      .select("last_number")
      .eq("store_code", storeCode ?? "BSB")
      .eq("period", period)
      .maybeSingle();
    const next = (data?.last_number ?? 0) + 1;
    setTicketNumber(`PU-${storeCode ?? "BSB"}-${period}-${String(next).padStart(5, "0")}`);
  }

  async function loadClients() {
    const { data } = await supabase
      .from("clients")
      .select("id, company_name, contact_first_name, contact_last_name, contact_title, phone, email, billing_address, billing_city, billing_province, billing_postal_code, billing_country, pricelist_pdf_url")
      .order("company_name");
    if (data) setClients(data as ClientRow[]);
  }

  const filteredClients = clients.filter(c =>
    c.company_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    `${c.contact_first_name} ${c.contact_last_name}`.toLowerCase().includes(clientSearch.toLowerCase())
  ).slice(0, 8);

  function selectClient(c: ClientRow) {
    setSelectedClient(c);
    setClientSearch(c.company_name);
    setShowClientDrop(false);
  }

  function addItem() {
    if (!itemForm.product_name || !itemForm.format || itemForm.unit_price <= 0) return;
    if (editingItemId) {
      setItems(prev => prev.map(it => it.tempId === editingItemId ? {
        ...it,
        product_id: itemForm.product_id || null,
        product_name: itemForm.product_name,
        quantity: itemForm.quantity,
        format: itemForm.format,
        unit_price: itemForm.unit_price,
        price_unit: itemForm.price_unit,
        subtotal: itemForm.quantity * itemForm.unit_price,
      } : it));
      setEditingItemId(null);
    } else {
      setItems(prev => [...prev, {
        tempId: Math.random().toString(36).slice(2),
        product_id: itemForm.product_id || null,
        product_name: itemForm.product_name,
        quantity: itemForm.quantity,
        format: itemForm.format,
        unit_price: itemForm.unit_price,
        price_unit: itemForm.price_unit,
        subtotal: itemForm.quantity * itemForm.unit_price,
      }]);
    }
    setItemForm({ product_id: "", product_name: "", quantity: 1, format: "", unit_price: 0, price_unit: "/KIT" });
  }

  function editItem(it: NewTicketItem) {
    setItemForm({
      product_id: it.product_id || "",
      product_name: it.product_name,
      quantity: it.quantity,
      format: it.format,
      unit_price: it.unit_price,
      price_unit: it.price_unit,
    });
    setEditingItemId(it.tempId);
  }

  function removeItem(tempId: string) {
    setItems(prev => prev.filter(it => it.tempId !== tempId));
  }

  const subtotalProducts = items.reduce((s, it) => s + it.subtotal, 0);
  const totalQty = items.reduce((s, it) => s + it.quantity, 0);

  const discountAmt = discountValue !== "" && Number(discountValue) > 0
    ? (discountType === "%" ? subtotalProducts * (Number(discountValue) / 100) : Math.min(Number(discountValue), subtotalProducts))
    : 0;
  const subtotalAfterDiscount = subtotalProducts - discountAmt;

  const billingAddr = isWalkin
    ? walkinProvince
    : selectedClient ? buildBillingString(selectedClient) : "";

  const isCanada = isWalkin
    ? true
    : selectedClient ? (selectedClient.billing_country || "Canada").toLowerCase().includes("canada") || (selectedClient.billing_country === "") : false;

  const province = isCanada ? detectProvince(billingAddr) : "";
  const taxLines = isCanada ? computeTaxLines(province, subtotalAfterDiscount) : [];
  const taxTotal = taxLines.reduce((s, t) => s + t.amount, 0);
  const extraFeesAmt = extraFees !== "" ? Number(extraFees) : 0;
  const totalWithTax = subtotalAfterDiscount + taxTotal + extraFeesAmt;

  const canAdd = itemForm.product_name && itemForm.format && itemForm.unit_price > 0 && itemForm.quantity > 0;
  const canSave = (isWalkin ? walkinName : selectedClient) && items.length > 0 && !saving;

  const selectedStoreItem = storeItems.find(s => s.id === itemForm.product_id);
  const availableFormats = selectedStoreItem && (selectedStoreItem.formats || []).length > 0
    ? selectedStoreItem.formats
    : FORMATS;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yy = String(now.getFullYear()).slice(2);
      const period = `${mm}${yy}`;
      const { data: counterRow } = await supabase
        .from("pickup_ticket_counter")
        .select("last_number")
        .eq("store_code", storeCode ?? "BSB")
        .eq("period", period)
        .maybeSingle();
      const nextNum = (counterRow?.last_number ?? 0) + 1;
      const finalTicketNumber = `PU-${storeCode ?? "BSB"}-${period}-${String(nextNum).padStart(5, "0")}`;
      if (counterRow) {
        await supabase.from("pickup_ticket_counter")
          .update({ last_number: nextNum })
          .eq("store_code", storeCode ?? "BSB")
          .eq("period", period);
      } else {
        await supabase.from("pickup_ticket_counter")
          .insert({ store_code: storeCode ?? "BSB", period, last_number: nextNum });
      }
      const clientName = isWalkin ? walkinName : (selectedClient?.company_name ?? "");
      const clientContact = isWalkin ? "" : `${selectedClient?.contact_first_name ?? ""} ${selectedClient?.contact_last_name ?? ""}`.trim();
      const clientPhone = isWalkin ? walkinPhone : (selectedClient?.phone ?? "");
      const clientEmail = isWalkin ? walkinEmail : (selectedClient?.email ?? "");
      const billingAddress = isWalkin ? walkinProvince : (selectedClient ? buildBillingString(selectedClient) : "");
      const { data: ticketRow, error } = await supabase.from("pickup_tickets").insert({
        ticket_number: finalTicketNumber,
        store_code: storeCode ?? "BSB",
        client_id: isWalkin ? null : (selectedClient?.id ?? null),
        client_name: clientName,
        client_contact: clientContact,
        client_phone: clientPhone,
        client_email: clientEmail,
        billing_address: billingAddress,
        is_walkin: isWalkin,
        status: "prepared",
        billing_status: "unbilled",
        payment_method: paymentMethod,
        issued_at: issuedAt ? new Date(issuedAt).toISOString() : now.toISOString(),
        estimated_pickup_at: estimatedPickupAt ? new Date(estimatedPickupAt).toISOString() : null,
        picked_up_at: null,
        agent_name: agentName,
        notes,
        subtotal_products: subtotalProducts,
        discount_type: discountType,
        discount_value: Number(discountValue) || 0,
        discount_amount: discountAmt,
        subtotal_after_discount: subtotalAfterDiscount,
        province,
        tax_lines: taxLines,
        tax_total: taxTotal,
        extra_fees: extraFeesAmt,
        total_with_tax: totalWithTax,
        total_value: subtotalProducts,
        total_qty: totalQty,
        owner_id: ownerId,
      }).select().maybeSingle();
      if (error || !ticketRow) throw new Error("Erreur création ticket");
      const itemRows = items.map((it, idx) => ({
        ticket_id: ticketRow.id,
        product_id: it.product_id,
        product_name: it.product_name,
        quantity: it.quantity,
        format: it.format,
        unit_price: it.unit_price,
        price_unit: it.price_unit,
        subtotal: it.subtotal,
        sort_order: idx,
      }));
      const { data: insertedItems } = await supabase.from("pickup_ticket_items").insert(itemRows).select();
      onCreated({ ...ticketRow, items: insertedItems ?? [] });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <style>{`
        @keyframes breathe { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0)} 50%{box-shadow:0 0 0 8px rgba(99,102,241,0.18)} }
        .breathe-btn { animation: breathe 2.5s ease-in-out infinite; }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, color: T.textMid, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Retour
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: 0 }}>Nouveau Pickup Ticket</h1>
          <div style={{ fontSize: 12, color: T.textMid, marginTop: 2 }}>Sortie de consignation</div>
        </div>
        <div style={{ marginLeft: "auto", background: T.cardAlt, borderRadius: 10, padding: "10px 20px", border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.textMid, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}># Ticket</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: T.main, fontFamily: "monospace" }}>{ticketNumber || "—"}</div>
        </div>
      </div>

      {(selectedClient || isWalkin) && (
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          background: "#f4f5f9", border: `1px solid ${T.border}`, borderRadius: 12,
          padding: "14px 20px", marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap",
        }}>
          <div style={{ flex: "3 1 360px", borderRight: `1px solid ${T.border}`, paddingRight: 24 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: T.main, textTransform: "uppercase", letterSpacing: 1.2 }}>Client</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: T.text }}>
                {isWalkin ? walkinName || "Walk-in" : selectedClient?.company_name}
              </span>
              {isWalkin && <span style={{ fontSize: 11, background: T.orangeBg, color: T.orange, padding: "2px 8px", borderRadius: 5, fontWeight: 700 }}>Walk-in</span>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px 16px" }}>
              {[
                { label: "Contact", value: isWalkin ? walkinName : `${selectedClient?.contact_first_name ?? ""} ${selectedClient?.contact_last_name ?? ""}`.trim() },
                { label: "Téléphone", value: isWalkin ? walkinPhone : selectedClient?.phone },
                { label: "Email", value: isWalkin ? walkinEmail : selectedClient?.email },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                    <LockIcon />
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.8 }}>{f.label}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>{f.value || "—"}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: "2 1 240px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Adresse de facturation</div>
            <div style={{ fontSize: 13, color: T.text, fontWeight: 500, lineHeight: 1.5, marginBottom: 8 }}>
              {isWalkin ? (walkinProvince || <span style={{ color: T.textLight, fontStyle: "italic" }}>Non renseignée</span>) :
                (selectedClient ? buildBillingString(selectedClient) || <span style={{ color: T.textLight, fontStyle: "italic" }}>—</span> : "—")}
            </div>
            {province && (
              <div style={{ fontSize: 11, background: T.blueBg, color: T.blue, padding: "3px 8px", borderRadius: 5, fontWeight: 700, display: "inline-block" }}>
                Province : {province}
              </div>
            )}
            {selectedClient?.pricelist_pdf_url && (
              <a href={selectedClient.pricelist_pdf_url} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#dbeafe", color: "#2563eb", padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 700, textDecoration: "none", marginTop: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Voir la liste de prix
              </a>
            )}
            <div style={{ marginTop: 8, fontSize: 11, color: T.textMid, fontStyle: "italic" }}>
              Pickup en magasin — pas d'adresse de livraison
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 24 }}>
          <SectionTitle>Client</SectionTitle>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
              <div onClick={() => { setIsWalkin(!isWalkin); setSelectedClient(null); setClientSearch(""); }}
                style={{ width: 40, height: 22, borderRadius: 11, background: isWalkin ? T.main : "#d1d5db", position: "relative", transition: "background 0.2s", cursor: "pointer", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 2, left: isWalkin ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: T.bgCard, transition: "left 0.2s" }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Client walk-in</span>
            </label>
          </div>

          {isWalkin ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="Nom" required>
                <input style={inputStyle} value={walkinName} onChange={e => setWalkinName(e.target.value)} placeholder="Nom du client" />
              </Field>
              <Field label="Téléphone">
                <input style={inputStyle} value={walkinPhone} onChange={e => setWalkinPhone(e.target.value)} placeholder="514-000-0000" />
              </Field>
              <Field label="Email">
                <input style={inputStyle} value={walkinEmail} onChange={e => setWalkinEmail(e.target.value)} placeholder="email@exemple.com" />
              </Field>
              <Field label="Province (pour les taxes)">
                <input style={inputStyle} value={walkinProvince} onChange={e => setWalkinProvince(e.target.value)} placeholder="Ex: Québec, QC, Ontario..." />
              </Field>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="Client" required>
                <div ref={clientRef} style={{ position: "relative" }}>
                  <input
                    style={inputStyle}
                    value={clientSearch}
                    onChange={e => { setClientSearch(e.target.value); setShowClientDrop(true); setSelectedClient(null); }}
                    onFocus={() => setShowClientDrop(true)}
                    placeholder="Rechercher un client..."
                  />
                  {showClientDrop && filteredClients.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, marginTop: 4, maxHeight: 220, overflowY: "auto" }}>
                      {filteredClients.map(c => (
                        <div key={c.id} onClick={() => selectClient(c)} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${T.border}`, fontSize: 13 }}
                          onMouseOver={e => (e.currentTarget.style.background = "#f4f5f9")}
                          onMouseOut={e => (e.currentTarget.style.background = "transparent")}>
                          <div style={{ fontWeight: 600 }}>{c.company_name}</div>
                          <div style={{ fontSize: 11, color: T.textMid }}>{c.contact_first_name} {c.contact_last_name} · {c.billing_province || c.billing_city || c.phone}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
            </div>
          )}
        </div>

        <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 24 }}>
          <SectionTitle>Détails du ticket</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Date et heure d'émission" required>
              <input type="datetime-local" style={inputStyle} value={issuedAt} onChange={e => setIssuedAt(e.target.value)} />
            </Field>
            <Field label="Date estimée de ramassage">
              <input type="datetime-local" style={inputStyle} value={estimatedPickupAt} onChange={e => setEstimatedPickupAt(e.target.value)} />
            </Field>
            <Field label="Employé / Agent responsable" required>
              <input style={inputStyle} value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="Nom de l'agent" />
            </Field>
            <Field label="Méthode de paiement prévue">
              <select style={inputStyle} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethodOps)}>
                {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethodOps, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Notes internes">
              <textarea style={{ ...inputStyle, height: 72, resize: "vertical" }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex: Client passe vers 14h..." />
            </Field>
          </div>
        </div>
      </div>

      <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 24, marginBottom: 20 }}>
        <SectionTitle>Produits</SectionTitle>
        <div style={{ background: T.cardAlt, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 100px 1.5fr 130px 100px auto", gap: 10, alignItems: "end" }}>
            <Field label="Produit">
              <select style={inputStyle} value={itemForm.product_id} onChange={e => {
                const item = storeItems.find(x => x.id === e.target.value);
                setItemForm(f => ({
                  ...f,
                  product_id: e.target.value,
                  product_name: item?.name ?? "",
                  unit_price: item?.unit_price ?? f.unit_price,
                  price_unit: item?.price_unit ?? f.price_unit,
                  format: "",
                }));
              }}>
                <option value="">Sélectionner...</option>
                {storeItems.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Quantité">
              <input type="number" min={1} style={inputStyle} value={itemForm.quantity || ""} onChange={e => setItemForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
            </Field>
            <Field label="Format">
              <select style={inputStyle} value={itemForm.format} onChange={e => setItemForm(f => ({ ...f, format: e.target.value }))}>
                <option value="">Sélectionner...</option>
                {availableFormats.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Prix unitaire">
              <input type="number" min={0} step={0.01} style={inputStyle} value={itemForm.unit_price || ""} onChange={e => setItemForm(f => ({ ...f, unit_price: Number(e.target.value) }))} />
            </Field>
            <Field label="Unité">
              <select style={inputStyle} value={itemForm.price_unit} onChange={e => setItemForm(f => ({ ...f, price_unit: e.target.value }))}>
                {PRICE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
            <div style={{ paddingTop: 22 }}>
              <button onClick={addItem} disabled={!canAdd}
                style={{ background: canAdd ? T.main : "#e5e7eb", color: canAdd ? "#fff" : "#9ca3af", border: "none", borderRadius: 8, padding: "9px 16px", cursor: canAdd ? "pointer" : "default", fontSize: 12, fontWeight: 700, fontFamily: "inherit", whiteSpace: "nowrap" }}>
                {editingItemId ? "Modifier" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: T.textLight, fontSize: 13 }}>
            Aucun produit ajouté. Utilisez le formulaire ci-dessus.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {["#", "Produit", "Qté", "Format", "Prix unitaire", "Unité", "Sous-total", ""].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={it.tempId} style={{ borderBottom: `1px solid ${T.border}`, background: editingItemId === it.tempId ? "#f0f7ff" : "transparent" }}>
                  <td style={{ padding: "12px", fontSize: 13, color: T.textMid }}>{idx + 1}</td>
                  <td style={{ padding: "12px", fontSize: 13, fontWeight: 600 }}>{it.product_name}</td>
                  <td style={{ padding: "12px", fontSize: 13 }}>{it.quantity}</td>
                  <td style={{ padding: "12px", fontSize: 13, color: T.textMid }}>{it.format}</td>
                  <td style={{ padding: "12px", fontSize: 13 }}>{fmt2(it.unit_price)}</td>
                  <td style={{ padding: "12px", fontSize: 12, color: T.textMid }}>{it.price_unit}</td>
                  <td style={{ padding: "12px", fontSize: 13, fontWeight: 700, color: T.main }}>{fmt2(it.subtotal)}</td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => editItem(it)} style={{ background: T.blueBg, color: T.blue, border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}>Modifier</button>
                      <button onClick={() => removeItem(it.tempId)} style={{ background: "#ffe5e3", color: T.red, border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}>Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, marginBottom: 28 }}>
        <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 24 }}>
          <SectionTitle>Informations complémentaires</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.textMid, marginBottom: 8 }}>Rabais</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ display: "flex", border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
                  {(["%", "$"] as const).map(t => (
                    <button key={t} onClick={() => setDiscountType(t)}
                      style={{ padding: "8px 16px", border: "none", background: discountType === t ? T.main : "transparent", color: discountType === t ? "#fff" : T.textMid, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}>
                      {t}
                    </button>
                  ))}
                </div>
                <input type="number" min={0} step={discountType === "%" ? 0.1 : 1}
                  value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  placeholder={discountType === "%" ? "0.0" : "0.00"}
                  style={{ ...inputStyle, width: 120 }} />
                {discountAmt > 0 && (
                  <span style={{ fontSize: 13, color: T.red, fontWeight: 700 }}>— {fmt2(discountAmt)}</span>
                )}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.textMid, marginBottom: 6 }}>Frais additionnels (Extra fees)</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="number" min={0} step={1} value={extraFees} onChange={e => setExtraFees(e.target.value)} placeholder="0.00" style={{ ...inputStyle, width: 160 }} />
                <span style={{ fontSize: 12, color: T.textMid }}>Manutention, palette, etc.</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: "#f8f9fb", border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 22px" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.textLight, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14 }}>Résumé du ticket</div>

          <TotalRow label="Sous-total produits" value={fmt2(subtotalProducts)} />

          {discountAmt > 0 && (
            <TotalRow label={`Rabais (${discountValue}${discountType})`} value={`— ${fmt2(discountAmt)}`} negative />
          )}

          <Divider />
          <TotalRow label="Sous-total après rabais" value={fmt2(subtotalAfterDiscount)} bold />

          <Divider />
          <TotalRow label="Shipping" value="N/A — Pickup en magasin" muted />

          <Divider />
          {!selectedClient && !isWalkin ? (
            <TotalRow label="Taxes" value="Sélectionner un client" muted />
          ) : !isCanada ? (
            <TotalRow label="Taxes" value="N/A — Client hors Canada" muted />
          ) : !province ? (
            <div style={{ fontSize: 12, color: "#b45309", background: "#fef3c7", borderRadius: 6, padding: "6px 10px", marginBottom: 4 }}>
              Province non détectée — renseignez l'adresse de facturation pour calculer les taxes
            </div>
          ) : taxLines.length === 0 ? (
            <TotalRow label="Taxes" value="N/A" muted />
          ) : (
            taxLines.map(t => (
              <TotalRow key={t.label} label={t.label} value={fmt2(t.amount)} />
            ))
          )}

          {extraFeesAmt > 0 && (
            <>
              <Divider />
              <TotalRow label="Extra fees" value={fmt2(extraFeesAmt)} />
            </>
          )}

          <div style={{ borderTop: `2px solid ${T.main}22`, marginTop: 10, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: T.text }}>TOTAL</span>
            <span style={{ fontSize: 26, fontWeight: 800, color: T.main }}>{fmt2(totalWithTax)}</span>
          </div>

          <div style={{ marginTop: 12, background: "#fff3d4", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: T.orange, fontWeight: 500, lineHeight: 1.5 }}>
            Ce document n'est PAS une facture.<br/>
            La facturation sera effectuée par le manufacturier.
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginBottom: 32 }}>
        <button onClick={onBack} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 24px", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit", color: T.textMid }}>
          Annuler
        </button>
        <button onClick={handleSave} disabled={!canSave} className={canSave ? "breathe-btn" : ""}
          style={{ background: canSave ? T.main : "#e5e7eb", color: canSave ? "#fff" : "#9ca3af", border: "none", borderRadius: 10, padding: "12px 28px", cursor: canSave ? "pointer" : "default", fontSize: 14, fontWeight: 700, fontFamily: "inherit", transition: "background 0.2s" }}>
          {saving ? "Création en cours..." : "Créer le pickup ticket"}
        </button>
      </div>
    </div>
  );
}
