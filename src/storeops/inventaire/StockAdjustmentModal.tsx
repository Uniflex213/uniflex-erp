import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import { InventaireProduct, ADJUSTMENT_REASONS } from "./inventaireTypes";
import { useAuth } from "../../contexts/AuthContext";
import { useApp } from "../../AppContext";
import { T } from "../../theme";

const inputStyle: React.CSSProperties = {
  padding: "9px 12px", borderRadius: 8, border: `1px solid ${T.border}`,
  fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box",
};

interface Props {
  product: InventaireProduct;
  onClose: () => void;
  onDone: () => void;
}

export default function StockAdjustmentModal({ product, onClose, onDone }: Props) {
  const { storeCode } = useAuth();
  const { reloadProducts } = useApp();
  const [newQty, setNewQty] = useState<number | "">(product.stock_qty);
  const [reason, setReason] = useState("");
  const [reasonOther, setReasonOther] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const diff = newQty !== "" ? (newQty as number) - product.stock_qty : 0;
  const canSave = newQty !== "" && reason !== "" && (newQty as number) >= 0;

  async function handleConfirm() {
    if (!canSave) return;
    setSaving(true);
    try {
      const qty = newQty as number;
      const delta = qty - product.stock_qty;
      const movementType = delta >= 0 ? 'adjustment_plus' : 'adjustment_minus';
      const finalReason = reason === 'Autre' ? reasonOther : reason;

      await supabase.from("sale_products")
        .update({ stock_qty: qty })
        .eq("id", product.id);

      await supabase.from("stock_movements").insert({
        product_id: product.id,
        product_name: product.name,
        movement_type: movementType,
        quantity: delta,
        stock_before: product.stock_qty,
        stock_after: qty,
        reference_type: 'adjustment',
        reference_id: '',
        reference_number: '',
        reason: finalReason,
        agent_name: 'Système',
        store_code: storeCode ?? "BSB",
        notes,
      });

      await reloadProducts();
      onDone();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(230,228,224,0.35)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1500, padding: 20 }} onClick={onClose}>
      <div style={{ background: T.card, borderRadius: 16, padding: 32, width: "100%", maxWidth: 480, boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text }}>Ajustement d'inventaire</h2>
            <div style={{ fontSize: 13, color: T.textMid, marginTop: 3 }}>{product.name}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: T.textMid }}>×</button>
        </div>

        <div style={{ background: T.cardAlt, borderRadius: 10, padding: "14px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.7 }}>Stock actuel</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: T.text }}>{product.stock_qty}</div>
          </div>
          {diff !== 0 && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.7 }}>Différence</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: diff > 0 ? T.green : T.red }}>
                {diff > 0 ? '+' : ''}{diff}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 6 }}>Nouveau stock (quantité réelle)</label>
            <input
              type="number" min={0} value={newQty}
              onChange={e => setNewQty(e.target.value === "" ? "" : Number(e.target.value))}
              style={{ ...inputStyle, fontSize: 18, fontWeight: 700, color: T.main }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 6 }}>Raison de l'ajustement *</label>
            <select value={reason} onChange={e => setReason(e.target.value)} style={inputStyle}>
              <option value="">Sélectionner une raison…</option>
              {ADJUSTMENT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {reason === 'Autre' && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 6 }}>Préciser</label>
              <input value={reasonOther} onChange={e => setReasonOther(e.target.value)} style={inputStyle} placeholder="Décrire la raison…" />
            </div>
          )}

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 6 }}>Notes (optionnel)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="Observations, contexte…" />
          </div>
        </div>

        {diff !== 0 && newQty !== "" && (
          <div style={{ background: diff > 0 ? T.greenBg : T.redBg, borderRadius: 8, padding: "10px 14px", marginTop: 16, fontSize: 13 }}>
            <strong>Résumé :</strong> Le stock va passer de <strong>{product.stock_qty}</strong> à <strong>{newQty}</strong> unités ({diff > 0 ? '+' : ''}{diff}).
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1px solid ${T.border}`, background: "transparent", color: T.textMid, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Annuler
          </button>
          <button onClick={handleConfirm} disabled={!canSave || saving}
            style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none", background: canSave ? T.main : "#e5e7eb", color: canSave ? "#fff" : "#9ca3af", fontSize: 13, fontWeight: 700, cursor: canSave ? "pointer" : "default", fontFamily: "inherit" }}>
            {saving ? "Enregistrement…" : "Confirmer l'ajustement"}
          </button>
        </div>
      </div>
    </div>
  );
}
