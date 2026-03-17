import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { useApp } from "../../AppContext";
import { CARRIERS } from "./inventaireTypes";
import { useAuth } from "../../contexts/AuthContext";
import { FORMATS } from "../storeOpsTypes";
import { T } from "../../theme";

const inputStyle: React.CSSProperties = {
  padding: "9px 12px", borderRadius: 8, border: `1px solid ${T.border}`,
  fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box",
};

interface ReceptionItem {
  tempId: string;
  product_id: string;
  product_name: string;
  quantity_received: number;
  format: string;
  batch_number: string;
  condition: 'good' | 'damaged_partial' | 'damaged_total';
  quantity_damaged: number;
  damage_description: string;
  quantity_ok: number;
}

function newItem(): ReceptionItem {
  return { tempId: Math.random().toString(36).slice(2), product_id: "", product_name: "", quantity_received: 1, format: "", batch_number: "", condition: "good", quantity_damaged: 0, damage_description: "", quantity_ok: 1 };
}

interface Props {
  prefillProduct?: { id: string; name: string };
  onClose: () => void;
  onDone: () => void;
}

export default function StockReceptionModal({ prefillProduct, onClose, onDone }: Props) {
  const { storeCode } = useAuth();
  const { products, reloadProducts } = useApp();
  const [receptionNumber, setReceptionNumber] = useState("");
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().slice(0, 10));
  const [deliveryNote, setDeliveryNote] = useState("");
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ReceptionItem[]>([]);
  const [itemForm, setItemForm] = useState<ReceptionItem>(newItem());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    generateNumber();
    if (prefillProduct) {
      setItemForm(f => ({ ...f, product_id: prefillProduct.id, product_name: prefillProduct.name }));
    }
  }, []);

  async function generateNumber() {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yy = String(now.getFullYear()).slice(2);
    const period = `${mm}${yy}`;
    const { data } = await supabase.from("stock_reception_counter").select("last_number")
      .eq("store_code", storeCode ?? "BSB").eq("period", period).maybeSingle();
    const next = (data?.last_number ?? 0) + 1;
    setReceptionNumber(`REC-${period}-${String(next).padStart(5, "0")}`);
  }

  function syncQtyOk(item: ReceptionItem): ReceptionItem {
    const ok = Math.max(0, item.quantity_received - item.quantity_damaged);
    return { ...item, quantity_ok: ok };
  }

  function updateItem(field: keyof ReceptionItem, value: string | number) {
    setItemForm(f => {
      const updated = { ...f, [field]: value };
      if (field === 'quantity_received' || field === 'quantity_damaged') return syncQtyOk(updated);
      if (field === 'condition' && value === 'good') return { ...updated, quantity_damaged: 0, quantity_ok: updated.quantity_received };
      return updated;
    });
  }

  function addItem() {
    if (!itemForm.product_name || itemForm.quantity_received <= 0) return;
    setItems(prev => [...prev, { ...itemForm }]);
    setItemForm(f => ({ ...newItem(), product_id: "", product_name: "" }));
  }

  function removeItem(tid: string) {
    setItems(prev => prev.filter(i => i.tempId !== tid));
  }

  const totalUnits = items.reduce((s, i) => s + i.quantity_received, 0);
  const totalOk = items.reduce((s, i) => s + i.quantity_ok, 0);
  const totalDamaged = items.reduce((s, i) => s + i.quantity_damaged, 0);
  const canAdd = itemForm.product_name && itemForm.quantity_received > 0;
  const canSave = items.length > 0 && !saving;

  async function handleConfirm() {
    if (!canSave) return;
    setSaving(true);
    try {
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yy = String(now.getFullYear()).slice(2);
      const period = `${mm}${yy}`;

      const { data: counter } = await supabase.from("stock_reception_counter")
        .select("last_number").eq("store_code", storeCode ?? "BSB").eq("period", period).maybeSingle();
      const nextNum = (counter?.last_number ?? 0) + 1;
      const finalNumber = `REC-${period}-${String(nextNum).padStart(5, "0")}`;
      if (counter) {
        await supabase.from("stock_reception_counter").update({ last_number: nextNum }).eq("store_code", storeCode ?? "BSB").eq("period", period);
      } else {
        await supabase.from("stock_reception_counter").insert({ store_code: storeCode ?? "BSB", period, last_number: nextNum });
      }

      const { data: reception, error } = await supabase.from("stock_receptions").insert({
        reception_number: finalNumber,
        store_code: storeCode ?? "BSB",
        received_at: receivedAt ? new Date(receivedAt).toISOString() : now.toISOString(),
        supplier: 'SCI',
        delivery_note_number: deliveryNote,
        carrier,
        tracking_number: tracking,
        received_by: receivedBy,
        notes,
        status: 'confirmed',
        total_units: totalUnits,
        total_units_ok: totalOk,
        total_units_damaged: totalDamaged,
        confirmed_at: now.toISOString(),
      }).select().maybeSingle();
      if (error || !reception) throw new Error("Erreur création réception");

      const itemRows = items.map((it, idx) => ({
        reception_id: reception.id,
        product_id: it.product_id || null,
        product_name: it.product_name,
        quantity_received: it.quantity_received,
        format: it.format,
        batch_number: it.batch_number,
        condition: it.condition,
        quantity_damaged: it.quantity_damaged,
        damage_description: it.damage_description,
        quantity_ok: it.quantity_ok,
        sort_order: idx,
      }));
      await supabase.from("stock_reception_items").insert(itemRows);

      for (const it of items) {
        if (!it.product_id) continue;
        const { data: prod } = await supabase.from("sale_products").select("stock_qty").eq("id", it.product_id).maybeSingle();
        const before = prod?.stock_qty ?? 0;
        const after = before + it.quantity_ok;
        await supabase.from("sale_products").update({ stock_qty: after }).eq("id", it.product_id);
        await supabase.from("stock_movements").insert({
          product_id: it.product_id,
          product_name: it.product_name,
          movement_type: 'reception',
          quantity: it.quantity_ok,
          stock_before: before,
          stock_after: after,
          reference_type: 'reception',
          reference_id: reception.id,
          reference_number: finalNumber,
          reason: `Réception SCI — ${deliveryNote || 'sans BL'}`,
          agent_name: receivedBy || 'Système',
          store_code: storeCode ?? "BSB",
          notes: it.quantity_damaged > 0 ? `${it.quantity_damaged} unités endommagées` : '',
        });
        if (it.quantity_damaged > 0) {
          await supabase.from("stock_movements").insert({
            product_id: it.product_id,
            product_name: it.product_name,
            movement_type: 'damaged',
            quantity: -it.quantity_damaged,
            stock_before: after,
            stock_after: after,
            reference_type: 'reception',
            reference_id: reception.id,
            reference_number: finalNumber,
            reason: it.damage_description || 'Endommagé à la réception',
            agent_name: receivedBy || 'Système',
            store_code: storeCode ?? "BSB",
            notes: it.damage_description,
          });
        }
      }

      await reloadProducts();
      onDone();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1500, padding: 20, overflowY: "auto" }} onClick={onClose}>
      <div style={{ background: T.card, borderRadius: 16, padding: 32, width: "100%", maxWidth: 760, marginBottom: 20, boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: T.text }}>Entrée de stock</h2>
            <div style={{ fontSize: 13, color: T.textMid, marginTop: 3 }}>Réception de marchandise — Consignation SCI</div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ background: T.cardAlt, borderRadius: 8, padding: "6px 12px", border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.textMid, letterSpacing: 0.7 }}># RÉCEPTION</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.main }}>{receptionNumber}</div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: T.textMid }}>×</button>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>1 — Informations de réception</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Date de réception">
              <input type="date" value={receivedAt} onChange={e => setReceivedAt(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Fournisseur">
              <input value="SCI" disabled style={{ ...inputStyle, background: T.cardAlt, color: T.textMid }} />
            </Field>
            <Field label="Numéro BL SCI">
              <input value={deliveryNote} onChange={e => setDeliveryNote(e.target.value)} style={inputStyle} placeholder="BL-0000-XXX" />
            </Field>
            <Field label="Transporteur">
              <select value={carrier} onChange={e => setCarrier(e.target.value)} style={inputStyle}>
                <option value="">Sélectionner…</option>
                {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="# Tracking (opt.)">
              <input value={tracking} onChange={e => setTracking(e.target.value)} style={inputStyle} placeholder="1Z…" />
            </Field>
            <Field label="Reçu par">
              <input value={receivedBy} onChange={e => setReceivedBy(e.target.value)} style={inputStyle} placeholder="Nom de l'employé" />
            </Field>
          </div>
          <div style={{ marginTop: 12 }}>
            <Field label="Notes">
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} placeholder="Ex: 2 palettes, colis endommagé…" />
            </Field>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>2 — Produits reçus</div>
          <div style={{ background: T.cardAlt, borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
              <Field label="Produit">
                <select value={itemForm.product_id} onChange={e => {
                  const p = products.find(x => x.id === e.target.value);
                  setItemForm(f => ({ ...f, product_id: e.target.value, product_name: p?.name ?? "" }));
                }} style={inputStyle}>
                  <option value="">Sélectionner…</option>
                  {products.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Format">
                <select value={itemForm.format} onChange={e => updateItem('format', e.target.value)} style={inputStyle}>
                  <option value="">Format…</option>
                  {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>
              <Field label="Quantité">
                <input type="number" min={1} value={itemForm.quantity_received || ""} onChange={e => updateItem('quantity_received', Number(e.target.value))} style={inputStyle} />
              </Field>
              <Field label="Lot (opt.)">
                <input value={itemForm.batch_number} onChange={e => updateItem('batch_number', e.target.value)} style={inputStyle} placeholder="LOT-XXX" />
              </Field>
              <Field label="État">
                <select value={itemForm.condition} onChange={e => updateItem('condition', e.target.value)} style={inputStyle}>
                  <option value="good">Bon état</option>
                  <option value="damaged_partial">Endommagé (partiel)</option>
                  <option value="damaged_total">Endommagé (total)</option>
                </select>
              </Field>
              <div style={{ paddingBottom: 0 }}>
                <button onClick={addItem} disabled={!canAdd}
                  style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: canAdd ? T.main : "#e5e7eb", color: canAdd ? "#fff" : "#9ca3af", fontSize: 12, fontWeight: 700, cursor: canAdd ? "pointer" : "default", fontFamily: "inherit", whiteSpace: "nowrap", height: 37 }}>
                  Ajouter
                </button>
              </div>
            </div>
            {itemForm.condition !== 'good' && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: 10, marginTop: 10 }}>
                <Field label="Qté endommagée">
                  <input type="number" min={0} max={itemForm.quantity_received} value={itemForm.quantity_damaged || ""} onChange={e => updateItem('quantity_damaged', Number(e.target.value))} style={inputStyle} />
                </Field>
                <Field label="Description des dommages">
                  <input value={itemForm.damage_description} onChange={e => updateItem('damage_description', e.target.value)} style={inputStyle} placeholder="Ex: boîtes écrasées, fuites…" />
                </Field>
              </div>
            )}
          </div>

          {items.length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse", border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden" }}>
              <thead>
                <tr style={{ background: T.cardAlt }}>
                  {["#", "Produit", "Qté", "Format", "Lot", "État", "Endommagé", "OK", ""].map(h => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.7, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.tempId} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "9px 10px", fontSize: 12, color: T.textMid }}>{idx + 1}</td>
                    <td style={{ padding: "9px 10px", fontSize: 13, fontWeight: 600 }}>{it.product_name || "—"}</td>
                    <td style={{ padding: "9px 10px", fontSize: 13 }}>{it.quantity_received}</td>
                    <td style={{ padding: "9px 10px", fontSize: 12, color: T.textMid }}>{it.format || "—"}</td>
                    <td style={{ padding: "9px 10px", fontSize: 12, color: T.textMid }}>{it.batch_number || "—"}</td>
                    <td style={{ padding: "9px 10px" }}>
                      <span style={{ padding: "2px 7px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: it.condition === 'good' ? "#d1f5db" : "#ffe5e3", color: it.condition === 'good' ? T.green : T.red }}>
                        {it.condition === 'good' ? 'Bon' : it.condition === 'damaged_partial' ? 'Endommagé partiellement' : 'Endommagé totalement'}
                      </span>
                    </td>
                    <td style={{ padding: "9px 10px", fontSize: 13, color: it.quantity_damaged > 0 ? T.red : T.textLight }}>{it.quantity_damaged}</td>
                    <td style={{ padding: "9px 10px", fontSize: 13, fontWeight: 700, color: T.green }}>{it.quantity_ok}</td>
                    <td style={{ padding: "9px 10px" }}>
                      <button onClick={() => removeItem(it.tempId)} style={{ background: "#ffe5e3", color: T.red, border: "none", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit" }}>Retirer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: "center", padding: "20px 0", color: T.textLight, fontSize: 13, border: `1px dashed ${T.border}`, borderRadius: 8 }}>
              Aucun produit ajouté.
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div style={{ background: T.cardAlt, borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Résumé de la réception</div>
            <div style={{ display: "flex", gap: 24 }}>
              <div><div style={{ fontSize: 11, color: T.textMid }}>Produits</div><div style={{ fontSize: 18, fontWeight: 800 }}>{items.length}</div></div>
              <div><div style={{ fontSize: 11, color: T.textMid }}>Unités totales</div><div style={{ fontSize: 18, fontWeight: 800 }}>{totalUnits}</div></div>
              <div><div style={{ fontSize: 11, color: T.textMid }}>En bon état</div><div style={{ fontSize: 18, fontWeight: 800, color: T.green }}>{totalOk}</div></div>
              {totalDamaged > 0 && <div><div style={{ fontSize: 11, color: T.textMid }}>Endommagées</div><div style={{ fontSize: 18, fontWeight: 800, color: T.red }}>{totalDamaged}</div></div>}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: `1px solid ${T.border}`, background: "transparent", color: T.textMid, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Annuler
          </button>
          <button onClick={handleConfirm} disabled={!canSave}
            style={{ flex: 2, padding: "12px 0", borderRadius: 10, border: "none", background: canSave ? T.green : "#e5e7eb", color: canSave ? "#fff" : "#9ca3af", fontSize: 14, fontWeight: 700, cursor: canSave ? "pointer" : "default", fontFamily: "inherit" }}>
            {saving ? "Enregistrement…" : "Confirmer la réception"}
          </button>
        </div>
      </div>
    </div>
  );
}
