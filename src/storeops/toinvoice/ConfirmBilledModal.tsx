import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import { InvoiceDoc, T, fmt } from "./toInvoiceTypes";

interface Props {
  doc: InvoiceDoc;
  onClose: () => void;
  onConfirmed: () => void;
}

export default function ConfirmBilledModal({ doc, onClose, onConfirmed }: Props) {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [billedDate, setBilledDate] = useState(new Date().toISOString().split("T")[0]);
  const [billedAmount, setBilledAmount] = useState(String(doc.value));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const billedAmountNum = parseFloat(billedAmount) || 0;
  const ecart = billedAmountNum - doc.value;

  const handleConfirm = async () => {
    if (!invoiceNumber.trim()) return alert("Veuillez entrer le numéro de facture SCI.");
    setSaving(true);
    try {
      const table = doc.document_type === "pickup" ? "pickup_tickets" : "orders";
      const { error } = await supabase
        .from(table)
        .update({
          billing_status: "billed_by_sci",
          sci_invoice_number: invoiceNumber.trim(),
          sci_billed_amount: billedAmountNum,
          sci_billed_at: new Date(billedDate).toISOString(),
        })
        .eq("id", doc.id);
      if (error) throw error;
      onConfirmed();
      onClose();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la confirmation.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: "9px 12px", border: `1px solid ${T.border}`, borderRadius: 8,
    fontSize: 13, fontFamily: "inherit", color: T.text, background: T.bgCard,
    outline: "none", width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9500, display: "flex", justifyContent: "center", overflowY: "auto", padding: 20 }}>
      <div style={{ background: T.card, borderRadius: 16, width: "100%", maxWidth: 500, margin: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text }}>Confirmer — Facturé par SCI</h2>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: T.textMid }}>{doc.document_number} — {doc.client_name}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: T.textMid, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: T.cardAlt, borderRadius: 10, padding: "12px 16px", border: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: T.textMid }}>Valeur du document</span>
            <strong style={{ fontSize: 13, color: T.text }}>{fmt(doc.value)}</strong>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, letterSpacing: 0.6, textTransform: "uppercase", display: "block", marginBottom: 5 }}>Numéro de facture SCI *</label>
            <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="ex: INV-SCI-2026-0042" style={inputStyle} />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, letterSpacing: 0.6, textTransform: "uppercase", display: "block", marginBottom: 5 }}>Date de facturation</label>
            <input type="date" value={billedDate} onChange={e => setBilledDate(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, letterSpacing: 0.6, textTransform: "uppercase", display: "block", marginBottom: 5 }}>Montant facturé ($)</label>
            <input type="number" value={billedAmount} onChange={e => setBilledAmount(e.target.value)} min="0" step="0.01" style={inputStyle} />
          </div>

          {billedAmountNum > 0 && Math.abs(ecart) > 0.01 && (
            <div style={{ background: T.orangeBg, borderRadius: 8, padding: "10px 14px", border: `1px solid ${T.orange}30`, display: "flex", gap: 8, alignItems: "flex-start" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.orange} strokeWidth="2" style={{ marginTop: 1, flexShrink: 0 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div style={{ fontSize: 12, color: T.orange }}>
                <strong>Écart de {fmt(Math.abs(ecart))}</strong> entre le montant du document ({fmt(doc.value)}) et le montant facturé par SCI ({fmt(billedAmountNum)}). Veuillez vérifier.
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, letterSpacing: 0.6, textTransform: "uppercase", display: "block", marginBottom: 5 }}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Observations, commentaires..." style={{ ...inputStyle, resize: "vertical" }} />
          </div>
        </div>

        <div style={{ padding: "16px 24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ background: T.cardAlt, color: T.textMid, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Annuler
          </button>
          <button onClick={handleConfirm} disabled={saving} style={{ background: T.green, color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Confirmation..." : "Confirmer facturé"}
          </button>
        </div>
      </div>
    </div>
  );
}
