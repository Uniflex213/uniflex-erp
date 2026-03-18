import React, { useState } from "react";
import { SampleRequest, SampleItem, SampleReason, SamplePriority, SampleFormat, SAMPLE_REASONS, SAMPLE_FORMATS } from "./sampleTypes";
import { CRMLead } from "./crmTypes";
import { useProducts } from "./useProducts";
import { useCurrentAgent } from "../hooks/useCurrentAgent";
import { T } from "../theme";

interface Props {
  lead: CRMLead;
  onClose: () => void;
  onSave: (req: Omit<SampleRequest, "id" | "created_at" | "updated_at">) => void;
}

const inpStyle: React.CSSProperties = {
  width: "100%", height: 38, borderRadius: 8, border: `1px solid ${T.border}`,
  padding: "0 12px", fontSize: 13, fontFamily: "inherit", outline: "none",
  boxSizing: "border-box", color: T.text, background: T.bgCard,
};
const selStyle: React.CSSProperties = { ...inpStyle, cursor: "pointer" };

export default function SampleRequestModal({ lead, onClose, onSave }: Props) {
  const agent = useCurrentAgent();
  const agentName = agent.name;
  const { products, loading: productsLoading } = useProducts();
  const [reason, setReason] = useState<SampleReason>("Démonstration client");
  const [priority, setPriority] = useState<SamplePriority>("Normale");
  const [deliveryAddress, setDeliveryAddress] = useState(lead.address || "");
  const [notesForOffice, setNotesForOffice] = useState("");
  const [items, setItems] = useState<Omit<SampleItem, "id" | "sample_request_id" | "created_at">[]>([]);
  const [otherReason, setOtherReason] = useState("");

  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedQuantity, setSelectedQuantity] = useState("1");
  const [selectedFormat, setSelectedFormat] = useState<SampleFormat>("Sample Kit");
  const [selectedColor, setSelectedColor] = useState("");

  const canAddItem = selectedProduct && selectedQuantity && selectedFormat;
  const finalReason = reason === "Autre" ? otherReason : reason;

  const addItem = () => {
    if (!canAddItem) return;
    setItems([
      ...items,
      {
        product_name: selectedProduct,
        quantity: parseInt(selectedQuantity),
        format: selectedFormat,
        color_finish: selectedColor,
      },
    ]);
    setSelectedProduct("");
    setSelectedQuantity("1");
    setSelectedFormat("Sample Kit");
    setSelectedColor("");
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (!finalReason || items.length === 0 || !deliveryAddress) return;

    const now = new Date().toISOString();
    onSave({
      lead_id: lead.id,
      agent_id: agent.id,
      agent_name: agentName,
      reason: finalReason as SampleReason,
      priority,
      delivery_address: deliveryAddress,
      notes_for_office: notesForOffice,
      status: "En attente d'approbation",
      approved_by: "",
      approval_notes: "",
      estimated_cost: 0,
      transporteur: "",
      tracking_number: "",
      rejection_reason: "",
      items: items.map(it => ({ ...it, id: `si${Date.now()}`, sample_request_id: `sr${Date.now()}`, created_at: now })),
      activities: [],
    });
  };

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(230,228,224,0.85)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto", padding: "16px" }}>
      <div style={{ background: T.bgCard, borderRadius: 16, width: "100%", maxWidth: 760, boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "20px 28px", borderBottom: "1px solid rgba(0,0,0,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: T.text }}>📦 Demander un Sample</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#8e8e93" }}>✕</button>
        </div>

        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 24, maxHeight: "calc(90vh - 130px)", overflowY: "auto" }}>
          <Section title="Contexte du sample">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Lead" col2>
                <div style={{ padding: "10px 12px", borderRadius: 8, background: "#f3f4f6", fontSize: 13, color: T.text, fontWeight: 600 }}>
                  {lead.company_name}
                </div>
              </Field>
              <Field label="Contact">
                <div style={{ padding: "10px 12px", borderRadius: 8, background: "#f3f4f6", fontSize: 13, color: T.text }}>
                  {lead.contact_first_name} {lead.contact_last_name}
                </div>
              </Field>
              <Field label="Agent demandeur">
                <div style={{ padding: "10px 12px", borderRadius: 8, background: "#f3f4f6", fontSize: 13, color: T.text }}>
                  {agentName}
                </div>
              </Field>

              <Field label="Motif du sample *" col2>
                <select value={reason} onChange={e => setReason(e.target.value as SampleReason)} style={selStyle}>
                  {SAMPLE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>

              {reason === "Autre" && (
                <Field label="Précisez le motif *" col2>
                  <input value={otherReason} onChange={e => setOtherReason(e.target.value)} placeholder="Expliquez..." style={inpStyle} />
                </Field>
              )}

              <Field label="Priorité">
                <div style={{ display: "flex", gap: 10 }}>
                  {(["Urgente", "Normale", "Basse"] as SamplePriority[]).map(p => {
                    const colors: Record<SamplePriority, string> = { "Urgente": "#ef4444", "Normale": "#f59e0b", "Basse": "#10b981" };
                    return (
                      <label key={p} style={{
                        display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
                        padding: "8px 12px", borderRadius: 8, border: `2px solid ${priority === p ? colors[p] : "rgba(0,0,0,0.12)"}`,
                        background: priority === p ? `${colors[p]}12` : "#fff", fontSize: 13,
                      }}>
                        <input type="radio" checked={priority === p} onChange={() => setPriority(p)} style={{ display: "none" }} />
                        <span style={{ color: priority === p ? colors[p] : T.textMid, fontWeight: priority === p ? 700 : 400 }}>
                          {p === "Urgente" ? "🔴" : p === "Basse" ? "🟢" : "🟠"} {p}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </Field>

              <Field label="Adresse de livraison *" col2>
                <input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} style={inpStyle} />
              </Field>

              <Field label="Notes pour le Head Office" col2>
                <textarea value={notesForOffice} onChange={e => setNotesForOffice(e.target.value)}
                  style={{ ...inpStyle, height: 80, paddingTop: 10, resize: "vertical" }} />
              </Field>
            </div>
          </Section>

          <Section title="Builder de sample">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 0.6fr 1fr 1fr 0.8fr auto", gap: 10, alignItems: "flex-end", marginBottom: 16 }}>
              <Field label="Produit">
                <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} style={selStyle}>
                  <option value="">{productsLoading ? "Chargement..." : "Sélectionner..."}</option>
                  {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Quantité">
                <input type="number" min={1} value={selectedQuantity} onChange={e => setSelectedQuantity(e.target.value)} style={inpStyle} />
              </Field>
              <Field label="Format">
                <select value={selectedFormat} onChange={e => setSelectedFormat(e.target.value as SampleFormat)} style={selStyle}>
                  {SAMPLE_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>
              <Field label="Couleur/Finition">
                <input value={selectedColor} onChange={e => setSelectedColor(e.target.value)} placeholder="Optionnel" style={inpStyle} />
              </Field>
              <div />
              <button
                onClick={addItem}
                disabled={!canAddItem}
                style={{
                  padding: "10px 16px", borderRadius: 8, border: "none",
                  background: canAddItem ? T.gold : "#ccc", color: canAddItem ? "#000" : "#999",
                  cursor: canAddItem ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 700,
                  fontFamily: "inherit", whiteSpace: "nowrap",
                }}
              >
                + AJOUTER
              </button>
            </div>

            {items.length > 0 && (
              <div style={{ overflowX: "auto", marginBottom: 16 }}>
                <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${T.border}` }}>
                      <th style={{ textAlign: "left", padding: "8px", fontWeight: 700, color: T.textLight }}>Produit</th>
                      <th style={{ textAlign: "center", padding: "8px", fontWeight: 700, color: T.textLight }}>Qté</th>
                      <th style={{ textAlign: "left", padding: "8px", fontWeight: 700, color: T.textLight }}>Format</th>
                      <th style={{ textAlign: "left", padding: "8px", fontWeight: 700, color: T.textLight }}>Couleur</th>
                      <th style={{ textAlign: "center", padding: "8px", fontWeight: 700, color: T.textLight }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td style={{ padding: "10px 8px", color: T.text }}>{it.product_name}</td>
                        <td style={{ padding: "10px 8px", textAlign: "center", color: T.text }}>{it.quantity}</td>
                        <td style={{ padding: "10px 8px", color: T.text }}>{it.format}</td>
                        <td style={{ padding: "10px 8px", color: T.textMid }}>{it.color_finish || "—"}</td>
                        <td style={{ padding: "10px 8px", textAlign: "center" }}>
                          <button
                            onClick={() => removeItem(i)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: T.red, fontSize: 16, padding: 0 }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {items.length > 0 && (
              <div style={{ fontSize: 13, color: T.textMid, padding: "10px 12px", background: "#f3f4f6", borderRadius: 8 }}>
                <strong>{items.length}</strong> article{items.length > 1 ? "s" : ""} — <strong>{totalQty}</strong> unité{totalQty > 1 ? "s" : ""}
              </div>
            )}
          </Section>
        </div>

        <div style={{ padding: "16px 28px", borderTop: "1px solid rgba(0,0,0,0.07)", display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "11px 22px", borderRadius: 8, border: "1px solid #ddd", background: T.bgCard,
            cursor: "pointer", fontFamily: "inherit", fontSize: 14,
          }}>
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!finalReason || items.length === 0 || !deliveryAddress}
            style={{
              padding: "11px 22px", borderRadius: 8, border: "none", background: (!finalReason || items.length === 0 || !deliveryAddress) ? "#ccc" : T.gold,
              color: (!finalReason || items.length === 0 || !deliveryAddress) ? "#999" : "#000",
              cursor: (!finalReason || items.length === 0 || !deliveryAddress) ? "not-allowed" : "pointer",
              fontFamily: "inherit", fontSize: 14, fontWeight: 700,
            }}
          >
            ENVOYER AU HEAD OFFICE
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#8e8e93", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, col2, children }: { label: string; col2?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ gridColumn: col2 ? "1 / -1" : undefined }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}
