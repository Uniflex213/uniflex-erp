import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { T, EXPENSE_TYPES, fmt } from "./beneficeTypes";

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

const TYPES = Object.entries(EXPENSE_TYPES);

export default function AddExpenseModal({ onClose, onSaved }: Props) {
  const { profile, storeCode } = useAuth();
  const [expenseType, setExpenseType] = useState("sample");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [docRef, setDocRef] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setSaving(true);
    try {
      await supabase.from("store_expenses").insert({
        document_type: "general",
        document_id: docRef.trim() || null,
        expense_type: expenseType,
        description: description.trim(),
        amount: amt,
        recorded_by: profile?.full_name || "admin",
        owner_id: profile?.id,
        store_code: storeCode ?? "BSB",
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px",
    fontSize: 13, outline: "none", background: T.bgCard,
    color: T.text, width: "100%", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase",
    letterSpacing: 0.8, marginBottom: 6,
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(230,228,224,0.85)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", zIndex: 9000, display: "flex", justifyContent: "center", overflowY: "auto", padding: 20 }}>
      <div style={{ background: T.card, borderRadius: 16, width: "100%", maxWidth: 460, margin: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: T.text }}>Ajouter une depense</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: T.textMid, lineHeight: 1 }}>x</button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={labelStyle}>Type de depense</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {TYPES.map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setExpenseType(key)}
                  style={{
                    background: expenseType === key ? cfg.bg : T.cardAlt,
                    color: expenseType === key ? cfg.color : T.textMid,
                    border: expenseType === key ? `2px solid ${cfg.color}` : `1px solid ${T.border}`,
                    borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={labelStyle}>Montant ($) *</div>
            <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" style={inputStyle} />
          </div>

          <div>
            <div style={labelStyle}>Description</div>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Details de la depense..." style={inputStyle} />
          </div>

          <div>
            <div style={labelStyle}>Reference document (optionnel)</div>
            <input value={docRef} onChange={e => setDocRef(e.target.value)} placeholder="# ticket ou commande..." style={inputStyle} />
          </div>
        </div>

        <div style={{ padding: "16px 24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ background: T.cardAlt, color: T.textMid, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !parseFloat(amount)}
            style={{
              background: parseFloat(amount) > 0 ? T.red : "#e5e7eb",
              color: parseFloat(amount) > 0 ? "#fff" : "#9ca3af",
              border: "none", borderRadius: 8, padding: "10px 24px",
              fontSize: 13, fontWeight: 700,
              cursor: parseFloat(amount) > 0 ? "pointer" : "not-allowed",
            }}
          >
            {saving ? "Enregistrement..." : `Ajouter depense ${parseFloat(amount) > 0 ? fmt(parseFloat(amount)) : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
