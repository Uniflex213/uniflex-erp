import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { InvoiceDoc, InvoicePayment, T, fmt, fmtDate } from "./toInvoiceTypes";
import { useCurrentAgent } from "../../hooks/useCurrentAgent";

interface Props {
  doc: InvoiceDoc;
  onClose: () => void;
  onSaved: () => void;
}

export default function PaymentRecordModal({ doc, onClose, onSaved }: Props) {
  const agent = useCurrentAgent();
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);

  const invoiceTotal = doc.sci_billed_amount > 0 ? doc.sci_billed_amount : doc.value;
  const currentPaid = doc.paid_amount || 0;
  const remaining = invoiceTotal - currentPaid;

  useEffect(() => {
    supabase
      .from("invoice_payments")
      .select("*")
      .eq("document_id", doc.id)
      .eq("document_type", doc.document_type)
      .order("payment_date", { ascending: false })
      .then(({ data }) => {
        setPayments((data || []) as InvoicePayment[]);
        setLoadingPayments(false);
      });
  }, [doc.id, doc.document_type]);

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setSaving(true);

    try {
      await supabase.from("invoice_payments").insert({
        document_type: doc.document_type,
        document_id: doc.id,
        amount: amt,
        reference: reference.trim(),
        notes: notes.trim(),
        recorded_by: agent.name,
      });

      const newPaidTotal = currentPaid + amt;
      const newStatus = newPaidTotal >= invoiceTotal ? "Payé" : "Partiel";
      const table = doc.document_type === "pickup" ? "pickup_tickets" : "orders";

      const updateData: Record<string, unknown> = {
        paid_amount: newPaidTotal,
        payment_status: newStatus,
      };

      if (newStatus === "Payé") {
        updateData.paid_at = new Date().toISOString();
        updateData.closed_at = new Date().toISOString();
        updateData.closed_by = "admin";
      }

      await supabase.from(table).update(updateData).eq("id", doc.id);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const handlePayFull = () => {
    setAmount(remaining.toFixed(2));
  };

  const pct = invoiceTotal > 0 ? Math.min((currentPaid / invoiceTotal) * 100, 100) : 0;
  const parsedAmount = parseFloat(amount) || 0;
  const newPct = invoiceTotal > 0 ? Math.min(((currentPaid + parsedAmount) / invoiceTotal) * 100, 100) : 0;

  const inputStyle: React.CSSProperties = {
    border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px",
    fontSize: 13, fontFamily: "inherit", outline: "none", background: T.bgCard,
    color: T.text, width: "100%", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase",
    letterSpacing: 0.8, marginBottom: 6,
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9000, display: "flex", justifyContent: "center", overflowY: "auto", padding: 20 }}>
      <div style={{ background: T.card, borderRadius: 16, width: "100%", maxWidth: 580, margin: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: T.text }}>Enregistrer un paiement</h2>
              <div style={{ fontSize: 12, color: T.textMid, marginTop: 3 }}>
                {doc.document_number} — {doc.client_name}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: T.textMid, lineHeight: 1 }}>x</button>
          </div>
        </div>

        <div style={{ padding: "20px 24px" }}>
          <div style={{ background: T.cardAlt, borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <div style={labelStyle}>Total facture</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>{fmt(invoiceTotal)}</div>
              </div>
              <div>
                <div style={labelStyle}>Deja paye</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: currentPaid > 0 ? T.green : T.textLight }}>{fmt(currentPaid)}</div>
              </div>
              <div>
                <div style={labelStyle}>Solde restant</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: remaining > 0 ? T.red : T.green }}>{fmt(remaining)}</div>
              </div>
            </div>

            <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: 6, height: 8, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 6, transition: "width 0.3s",
                width: `${newPct}%`,
                background: parsedAmount > 0
                  ? `linear-gradient(90deg, ${T.green} ${(pct / newPct) * 100}%, ${T.blue} ${(pct / newPct) * 100}%)`
                  : T.green,
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 10, color: T.textMid }}>{pct.toFixed(0)}% paye</span>
              {parsedAmount > 0 && <span style={{ fontSize: 10, color: T.blue, fontWeight: 600 }}>{newPct.toFixed(0)}% apres ce paiement</span>}
            </div>
          </div>

          <div style={{ display: "grid", gap: 16, marginBottom: 20 }}>
            <div>
              <div style={labelStyle}>Montant du paiement *</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={remaining}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  style={{ ...inputStyle, flex: 1 }}
                />
                {remaining > 0 && (
                  <button
                    onClick={handlePayFull}
                    style={{
                      background: T.greenBg, color: T.green, border: `1px solid ${T.green}33`,
                      borderRadius: 8, padding: "10px 14px", fontSize: 12, fontWeight: 700,
                      cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                    }}
                  >
                    Payer tout ({fmt(remaining)})
                  </button>
                )}
              </div>
              {parsedAmount > remaining && remaining > 0 && (
                <div style={{ fontSize: 11, color: T.red, marginTop: 4, fontWeight: 600 }}>
                  Le montant depasse le solde restant de {fmt(remaining)}
                </div>
              )}
            </div>

            <div>
              <div style={labelStyle}>Reference (cheque, virement, etc.)</div>
              <input
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="Numero de cheque, reference virement..."
                style={inputStyle}
              />
            </div>

            <div>
              <div style={labelStyle}>Notes</div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notes optionnelles..."
                rows={2}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>
          </div>

          {payments.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>Historique des paiements</div>
              <div style={{ background: T.cardAlt, borderRadius: 10, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Date", "Montant", "Reference", "Par"].map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.textMid, textTransform: "uppercase", borderBottom: `1px solid ${T.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td style={{ padding: "8px 10px", fontSize: 12, color: T.textMid }}>{fmtDate(p.payment_date)}</td>
                        <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 700, color: T.green }}>{fmt(p.amount)}</td>
                        <td style={{ padding: "8px 10px", fontSize: 12, color: T.text }}>{p.reference || "—"}</td>
                        <td style={{ padding: "8px 10px", fontSize: 12, color: T.textMid }}>{p.recorded_by || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {loadingPayments && (
            <div style={{ textAlign: "center", padding: 10, color: T.textMid, fontSize: 12 }}>Chargement...</div>
          )}
        </div>

        <div style={{ padding: "16px 24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ background: T.cardAlt, color: T.textMid, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !parsedAmount || parsedAmount <= 0}
            style={{
              background: parsedAmount > 0 ? T.green : "#e5e7eb",
              color: parsedAmount > 0 ? "#fff" : "#9ca3af",
              border: "none", borderRadius: 8, padding: "10px 24px",
              fontSize: 13, fontWeight: 700, cursor: parsedAmount > 0 ? "pointer" : "not-allowed",
              fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {saving ? "Enregistrement..." : `Enregistrer ${parsedAmount > 0 ? fmt(parsedAmount) : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
