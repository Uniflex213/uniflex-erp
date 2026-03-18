import React, { useState, useEffect } from "react";
import {
  PickupTicket, NewTicketItem, PaymentMethodOps,
  FORMATS, PRICE_UNITS, PAYMENT_METHOD_LABELS, TaxLine,
} from "./storeOpsTypes";
import { supabase } from "../supabaseClient";
import { T } from "../theme";

interface StoreItem {
  id: string;
  name: string;
  formats: string[];
  unit_price: number;
  price_unit: string;
}
import { logChanges } from "../shared/changeLogUtils";
import { useCurrentAgent } from "../hooks/useCurrentAgent";


const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text,
  fontFamily: "inherit", background: T.bgCard, outline: "none", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase",
  letterSpacing: 0.5, marginBottom: 4, display: "block",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);

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

interface Props {
  ticket: PickupTicket;
  onSaved: (updated: PickupTicket) => void;
  onCancel: () => void;
}

export default function EditTicketModal({ ticket, onSaved, onCancel }: Props) {
  const agent = useCurrentAgent();
  const [clientName, setClientName] = useState(ticket.client_name);
  const [clientContact, setClientContact] = useState(ticket.client_contact || "");
  const [clientPhone, setClientPhone] = useState(ticket.client_phone || "");
  const [clientEmail, setClientEmail] = useState(ticket.client_email || "");
  const [billingAddress, setBillingAddress] = useState(ticket.billing_address || "");
  const [province, setProvince] = useState(ticket.province || "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodOps>(ticket.payment_method);
  const [notes, setNotes] = useState(ticket.notes || "");
  const [estimatedPickupAt, setEstimatedPickupAt] = useState(
    ticket.estimated_pickup_at ? ticket.estimated_pickup_at.slice(0, 16) : ""
  );
  const [discountType, setDiscountType] = useState<"%" | "$">(
    (ticket.discount_type as "%" | "$") || "%"
  );
  const [discountValue, setDiscountValue] = useState(String(ticket.discount_value || ""));
  const [extraFees, setExtraFees] = useState(String(ticket.extra_fees || ""));

  const [items, setItems] = useState<(NewTicketItem & { existing_id?: string })[]>(
    (ticket.items || []).map(it => ({
      tempId: it.id,
      existing_id: it.id,
      product_id: it.product_id,
      product_name: it.product_name,
      quantity: it.quantity,
      format: it.format,
      unit_price: it.unit_price,
      price_unit: it.price_unit,
      subtotal: it.subtotal,
    }))
  );

  const [newItem, setNewItem] = useState({
    product_id: "", product_name: "", quantity: 1, format: FORMATS[0], unit_price: 0, price_unit: "/KIT",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);

  useEffect(() => {
    supabase
      .from("store_price_items")
      .select("id, name, formats, unit_price, price_unit")
      .eq("is_active", true)
      .order("sort_order")
      .order("name")
      .then(({ data }) => { if (data) setStoreItems(data as StoreItem[]); });
  }, []);

  const subtotalProducts = items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const discountNum = Number(discountValue) || 0;
  const discountAmt = discountNum > 0
    ? (discountType === "%" ? subtotalProducts * discountNum / 100 : Math.min(discountNum, subtotalProducts))
    : 0;
  const subtotalAfterDiscount = subtotalProducts - discountAmt;
  const taxLines = computeTaxLines(province, subtotalAfterDiscount);
  const taxTotal = taxLines.reduce((s, t) => s + t.amount, 0);
  const extraFeesNum = Number(extraFees) || 0;
  const totalWithTax = subtotalAfterDiscount + taxTotal + extraFeesNum;

  function addItem() {
    if (!newItem.product_id || newItem.quantity <= 0 || newItem.unit_price <= 0) return;
    const subtotal = newItem.quantity * newItem.unit_price;
    setItems(prev => [...prev, {
      tempId: `new_${Date.now()}`,
      product_id: newItem.product_id || null,
      product_name: newItem.product_name,
      quantity: newItem.quantity,
      format: newItem.format,
      unit_price: newItem.unit_price,
      price_unit: newItem.price_unit,
      subtotal,
    }]);
    setNewItem({ product_id: "", product_name: "", quantity: 1, format: FORMATS[0], unit_price: 0, price_unit: "/KIT" });
  }

  const selectedNewStoreItem = storeItems.find(s => s.id === newItem.product_id);
  const newItemAvailableFormats = selectedNewStoreItem && (selectedNewStoreItem.formats || []).length > 0
    ? selectedNewStoreItem.formats
    : FORMATS;

  function removeItem(tempId: string) {
    setItems(prev => prev.filter(it => it.tempId !== tempId));
  }

  function updateItem(tempId: string, field: string, value: string | number) {
    setItems(prev => prev.map(it => {
      if (it.tempId !== tempId) return it;
      const updated = { ...it, [field]: value };
      updated.subtotal = updated.quantity * updated.unit_price;
      return updated;
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const now = new Date().toISOString();
      const totalQty = items.reduce((s, it) => s + it.quantity, 0);
      const by = agent.name;

      const updates = {
        client_name: clientName,
        client_contact: clientContact,
        client_phone: clientPhone,
        client_email: clientEmail,
        billing_address: billingAddress,
        province,
        payment_method: paymentMethod,
        notes,
        estimated_pickup_at: estimatedPickupAt || null,
        discount_type: discountType,
        discount_value: discountNum,
        discount_amount: discountAmt,
        subtotal_products: subtotalProducts,
        subtotal_after_discount: subtotalAfterDiscount,
        tax_lines: taxLines,
        tax_total: taxTotal,
        extra_fees: extraFeesNum,
        total_with_tax: totalWithTax,
        total_value: subtotalProducts,
        total_qty: totalQty,
        updated_at: now,
      };

      const { error: updateErr } = await supabase
        .from("pickup_tickets")
        .update(updates)
        .eq("id", ticket.id);

      if (updateErr) throw updateErr;

      const existingIds = items.filter(it => it.existing_id).map(it => it.existing_id!);
      const originalIds = (ticket.items || []).map(it => it.id);
      const removedIds = originalIds.filter(id => !existingIds.includes(id));

      if (removedIds.length > 0) {
        await supabase.from("pickup_ticket_items").delete().in("id", removedIds);
      }

      for (const it of items) {
        if (it.existing_id) {
          await supabase.from("pickup_ticket_items").update({
            product_name: it.product_name,
            quantity: it.quantity,
            format: it.format,
            unit_price: it.unit_price,
            price_unit: it.price_unit,
            subtotal: it.quantity * it.unit_price,
          }).eq("id", it.existing_id);
        } else {
          await supabase.from("pickup_ticket_items").insert({
            ticket_id: ticket.id,
            product_id: it.product_id ?? null,
            product_name: it.product_name,
            quantity: it.quantity,
            format: it.format,
            unit_price: it.unit_price,
            price_unit: it.price_unit,
            subtotal: it.quantity * it.unit_price,
            sort_order: 0,
          });
        }
      }

      const logs = [];
      const base = { entity_type: "pickup_ticket" as const, entity_id: ticket.id, entity_label: ticket.ticket_number, changed_by: by };

      const fieldChecks = [
        { label: "Nom client", old: ticket.client_name, nw: clientName },
        { label: "Contact", old: ticket.client_contact, nw: clientContact },
        { label: "Téléphone", old: ticket.client_phone, nw: clientPhone },
        { label: "Email", old: ticket.client_email, nw: clientEmail },
        { label: "Adresse", old: ticket.billing_address, nw: billingAddress },
        { label: "Province", old: ticket.province, nw: province },
        { label: "Méthode paiement", old: ticket.payment_method, nw: paymentMethod },
        { label: "Notes", old: ticket.notes, nw: notes },
        { label: "Rabais", old: `${ticket.discount_value}${ticket.discount_type}`, nw: `${discountValue}${discountType}` },
        { label: "Frais supplémentaires", old: String(ticket.extra_fees || "0"), nw: String(extraFeesNum) },
      ];

      for (const f of fieldChecks) {
        if ((f.old || "") !== (f.nw || "")) {
          logs.push({ ...base, field_name: f.label, old_value: f.old || null, new_value: f.nw || null, change_type: "field_edit" as const });
        }
      }

      const oldItemsSummary = (ticket.items || []).map(it => `${it.product_name} x${it.quantity}`).join(", ");
      const newItemsSummary = items.map(it => `${it.product_name} x${it.quantity}`).join(", ");
      if (oldItemsSummary !== newItemsSummary) {
        logs.push({ ...base, field_name: "Produits", old_value: oldItemsSummary || null, new_value: newItemsSummary || null, change_type: "item_edited" as const });
      }

      if (logs.length > 0) await logChanges(logs);

      const { data: refreshed } = await supabase
        .from("pickup_tickets")
        .select("*, pickup_ticket_items(*)")
        .eq("id", ticket.id)
        .maybeSingle();

      if (refreshed) {
        onSaved({ ...refreshed, items: refreshed.pickup_ticket_items || [] });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(230,228,224,0.85)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: T.card, borderRadius: 16, width: "100%", maxWidth: 820,
        maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        fontFamily: "'Outfit', sans-serif",
      }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text }}>Modifier le ticket</h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: T.textMid, fontFamily: "monospace" }}>{ticket.ticket_number}</p>
          </div>
          <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: T.textMid }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          {error && (
            <div style={{ background: "#fee2e2", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13, fontWeight: 600 }}>
              {error}
            </div>
          )}

          <div style={{ background: T.bg, borderRadius: 12, padding: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 12, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }}>Client</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Nom / Compagnie</label>
                <input value={clientName} onChange={e => setClientName(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Contact</label>
                <input value={clientContact} onChange={e => setClientContact(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Téléphone</label>
                <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input value={clientEmail} onChange={e => setClientEmail(e.target.value)} style={inputStyle} type="email" />
              </div>
              <div>
                <label style={labelStyle}>Adresse de facturation</label>
                <input value={billingAddress} onChange={e => setBillingAddress(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Province</label>
                <select value={province} onChange={e => setProvince(e.target.value)} style={inputStyle}>
                  <option value="">—</option>
                  {["QC","ON","BC","AB","MB","SK","NB","NS","PE","NL","NT","YT","NU"].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Méthode de paiement</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethodOps)} style={inputStyle}>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Ramassage estimé</label>
              <input type="datetime-local" value={estimatedPickupAt} onChange={e => setEstimatedPickupAt(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", background: T.bg, fontWeight: 800, fontSize: 13, color: T.text, borderBottom: `1px solid ${T.border}` }}>
              Produits
            </div>
            <div style={{ padding: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 14 }}>
                <thead>
                  <tr style={{ background: T.bg }}>
                    {["Produit", "Format", "Qté", "Prix unitaire", "Unité", "Sous-total", ""].map(h => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, fontSize: 11, color: T.textMid, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(it => (
                    <tr key={it.tempId} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: "8px 10px" }}>
                        <input value={it.product_name} onChange={e => updateItem(it.tempId, "product_name", e.target.value)}
                          style={{ ...inputStyle, padding: "6px 8px" }} />
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <select value={it.format} onChange={e => updateItem(it.tempId, "format", e.target.value)}
                          style={{ ...inputStyle, padding: "6px 8px" }}>
                          {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <input type="number" value={it.quantity} onChange={e => updateItem(it.tempId, "quantity", Number(e.target.value))}
                          style={{ ...inputStyle, padding: "6px 8px", width: 70 }} min="1" />
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <input type="number" value={it.unit_price} onChange={e => updateItem(it.tempId, "unit_price", Number(e.target.value))}
                          style={{ ...inputStyle, padding: "6px 8px", width: 90 }} min="0" step="0.01" />
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <select value={it.price_unit} onChange={e => updateItem(it.tempId, "price_unit", e.target.value)}
                          style={{ ...inputStyle, padding: "6px 8px", width: 80 }}>
                          {PRICE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: T.main, whiteSpace: "nowrap" }}>{fmt(it.quantity * it.unit_price)}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <button onClick={() => removeItem(it.tempId)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: T.red, padding: 4 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 100px 110px 90px auto", gap: 8, alignItems: "end" }}>
                <select value={newItem.product_id} onChange={e => {
                  const item = storeItems.find(s => s.id === e.target.value);
                  setNewItem(p => ({
                    ...p,
                    product_id: e.target.value,
                    product_name: item?.name ?? p.product_name,
                    unit_price: item?.unit_price ?? p.unit_price,
                    price_unit: item?.price_unit ?? p.price_unit,
                    format: FORMATS[0],
                  }));
                }} style={{ ...inputStyle, padding: "8px 10px" }}>
                  <option value="">Sélectionner un produit...</option>
                  {storeItems.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <select value={newItem.format} onChange={e => setNewItem(p => ({ ...p, format: e.target.value }))}
                  style={{ ...inputStyle, padding: "8px 10px" }}>
                  {newItemAvailableFormats.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <input type="number" placeholder="Qté" value={newItem.quantity} onChange={e => setNewItem(p => ({ ...p, quantity: Number(e.target.value) }))}
                  style={{ ...inputStyle, padding: "8px 10px" }} min="1" />
                <input type="number" placeholder="Prix" value={newItem.unit_price || ""} onChange={e => setNewItem(p => ({ ...p, unit_price: Number(e.target.value) }))}
                  style={{ ...inputStyle, padding: "8px 10px" }} min="0" step="0.01" />
                <select value={newItem.price_unit} onChange={e => setNewItem(p => ({ ...p, price_unit: e.target.value }))}
                  style={{ ...inputStyle, padding: "8px 10px" }}>
                  {PRICE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <button onClick={addItem}
                  style={{ background: T.main, color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  + Ajouter
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={labelStyle}>Rabais</label>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={discountType} onChange={e => setDiscountType(e.target.value as "%" | "$")}
                  style={{ ...inputStyle, width: 70 }}>
                  <option value="%">%</option>
                  <option value="$">$</option>
                </select>
                <input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)}
                  style={inputStyle} placeholder="0" min="0" step="0.01" />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Frais supplémentaires ($)</label>
              <input type="number" value={extraFees} onChange={e => setExtraFees(e.target.value)}
                style={inputStyle} placeholder="0" min="0" step="0.01" />
            </div>
          </div>

          <div style={{ background: T.bg, borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <div style={{ fontSize: 13, color: T.textMid }}>Sous-total: <strong style={{ color: T.text }}>{fmt(subtotalProducts)}</strong></div>
              {discountAmt > 0 && <div style={{ fontSize: 13, color: T.red }}>Rabais: <strong>−{fmt(discountAmt)}</strong></div>}
              {taxLines.map(tl => (
                <div key={tl.label} style={{ fontSize: 13, color: T.textMid }}>{tl.label}: <strong>{fmt(tl.amount)}</strong></div>
              ))}
              {extraFeesNum > 0 && <div style={{ fontSize: 13, color: T.textMid }}>Frais supplémentaires: <strong>{fmt(extraFeesNum)}</strong></div>}
              <div style={{ fontSize: 18, fontWeight: 800, color: T.main, marginTop: 4 }}>Total: {fmt(totalWithTax)}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: "16px 24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onCancel}
            style={{ background: T.bg, color: T.textMid, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ background: T.main, color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Sauvegarde..." : "Sauvegarder les modifications"}
          </button>
        </div>
      </div>
    </div>
  );
}
