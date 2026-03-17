import React, { useState } from "react";
import { CRMLead, REGIONS, LeadType, Temperature, LeadSource } from "./crmTypes";
import { useProducts } from "./useProducts";
import { useAgents } from "../hooks/useAgents";
import { useCurrentAgent } from "../hooks/useCurrentAgent";
import { T } from "../theme";

interface Props {
  onSave: (lead: Omit<CRMLead, "id" | "created_at" | "updated_at">) => void;
  onClose: () => void;
  currentAgentId?: string;
  isAdmin?: boolean;
}

const inpStyle: React.CSSProperties = {
  width: "100%", height: 38, borderRadius: 8, border: `1px solid ${T.border}`,
  padding: "0 12px", fontSize: 13, fontFamily: "inherit", outline: "none",
  boxSizing: "border-box", color: T.text, background: T.bgCard,
};
const selStyle: React.CSSProperties = { ...inpStyle, cursor: "pointer" };

function Field({ label, required, children, col2 }: { label: string; required?: boolean; children: React.ReactNode; col2?: boolean }) {
  return (
    <div style={{ gridColumn: col2 ? "1 / -1" : undefined }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 5 }}>
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

export default function CRMNewLeadModal({ onSave, onClose, isAdmin = true }: Props) {
  const agents = useAgents();
  const currentAgent = useCurrentAgent();
  const { products, loading: productsLoading } = useProducts();
  const [companyName, setCompanyName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [region, setRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [type, setType] = useState<LeadType>("Installateur");
  const [source, setSource] = useState<LeadSource>("Cold call");
  const [temperature, setTemperature] = useState<Temperature>("Warm");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [monthlyVolume, setMonthlyVolume] = useState("");
  const [productsInterest, setProductsInterest] = useState<string[]>([]);
  const [closingProbability, setClosingProbability] = useState(25);
  const [targetClosingDate, setTargetClosingDate] = useState("");
  const [assignedAgentId, setAssignedAgentId] = useState(currentAgent.id);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!companyName.trim()) errs.companyName = "Champ requis";
    if (!firstName.trim()) errs.firstName = "Champ requis";
    if (!lastName.trim()) errs.lastName = "Champ requis";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const toggleProduct = (p: string) => {
    setProductsInterest(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const handleSave = () => {
    if (!validate()) return;
    const agent = agents.find(a => a.id === assignedAgentId) || { id: currentAgent.id, name: currentAgent.name, initials: currentAgent.initials, color: currentAgent.color };
    const now = new Date().toISOString();
    onSave({
      company_name: companyName,
      contact_first_name: firstName,
      contact_last_name: lastName,
      contact_title: contactTitle,
      phone, email, website, address,
      region: region || "Montréal",
      postal_code: postalCode,
      type, source, temperature,
      stage: "Nouveau Lead",
      estimated_value: parseFloat(estimatedValue) || 0,
      monthly_volume: parseFloat(monthlyVolume) || 0,
      products_interest: productsInterest,
      closing_probability: closingProbability,
      target_closing_date: targetClosingDate || undefined,
      annual_revenue_goal: parseFloat(estimatedValue) || 0,
      monthly_volume_goal: parseFloat(monthlyVolume) || 0,
      notes,
      assigned_agent_id: agent.id,
      assigned_agent_name: agent.name,
      assigned_agent_initials: agent.initials,
      assigned_agent_color: agent.color,
      last_activity_at: now,
      archived: false,
      activities: [],
      reminders: [],
      files: [],
    });
  };

  const sources: LeadSource[] = ["Référence", "Site web", "Cold call", "Salon / événement", "Réseau", "Pub en ligne", "Autre"];
  const tempColors: Record<Temperature, string> = { Hot: "#ef4444", Warm: "#f59e0b", Cold: "#60a5fa" };
  const tempLabels: Record<Temperature, string> = { Hot: "🔥 Hot", Warm: "⚡ Warm", Cold: "❄️ Cold" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto", padding: "16px" }}>
      <div style={{ background: T.bgCard, borderRadius: 16, width: "100%", maxWidth: 720, boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "20px 28px", borderBottom: "1px solid rgba(0,0,0,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: T.text }}>Nouveau Lead</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#8e8e93" }}>✕</button>
        </div>

        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 24, maxHeight: "calc(90vh - 130px)", overflowY: "auto" }}>
          <Section title="Informations de la compagnie">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Nom de la compagnie" required col2>
                <input value={companyName} onChange={e => setCompanyName(e.target.value)} style={{ ...inpStyle, borderColor: errors.companyName ? "#ef4444" : T.border }} />
                {errors.companyName && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 3 }}>{errors.companyName}</div>}
              </Field>
              <Field label="Prénom" required>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} style={{ ...inpStyle, borderColor: errors.firstName ? "#ef4444" : T.border }} />
                {errors.firstName && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 3 }}>{errors.firstName}</div>}
              </Field>
              <Field label="Nom" required>
                <input value={lastName} onChange={e => setLastName(e.target.value)} style={{ ...inpStyle, borderColor: errors.lastName ? "#ef4444" : T.border }} />
                {errors.lastName && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 3 }}>{errors.lastName}</div>}
              </Field>
              <Field label="Poste / Titre">
                <input value={contactTitle} onChange={e => setContactTitle(e.target.value)} style={inpStyle} />
              </Field>
              <Field label="Téléphone">
                <input value={phone} onChange={e => setPhone(e.target.value)} style={inpStyle} type="tel" />
              </Field>
              <Field label="Email">
                <input value={email} onChange={e => setEmail(e.target.value)} style={inpStyle} type="email" />
              </Field>
              <Field label="Site web">
                <input value={website} onChange={e => setWebsite(e.target.value)} style={inpStyle} />
              </Field>
              <Field label="Région">
                <select value={region} onChange={e => setRegion(e.target.value)} style={selStyle}>
                  <option value="">Sélectionner...</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Adresse" col2>
                <input value={address} onChange={e => setAddress(e.target.value)} style={inpStyle} />
              </Field>
              <Field label="Code postal">
                <input value={postalCode} onChange={e => setPostalCode(e.target.value)} style={inpStyle} />
              </Field>
            </div>
          </Section>

          <Section title="Profil du lead">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Type" required col2>
                <div style={{ display: "flex", gap: 10 }}>
                  {(["Installateur", "Distributeur", "Large Scale"] as LeadType[]).map(t => (
                    <label key={t} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", padding: "8px 14px", borderRadius: 8, border: `2px solid ${type === t ? T.main : "rgba(0,0,0,0.12)"}`, background: type === t ? "rgba(99,102,241,0.06)" : "#fff", fontSize: 13 }}>
                      <input type="radio" checked={type === t} onChange={() => setType(t)} style={{ display: "none" }} />
                      <span style={{ color: type === t ? T.main : T.textMid, fontWeight: type === t ? 700 : 400 }}>{t}</span>
                    </label>
                  ))}
                </div>
              </Field>

              <Field label="Source">
                <select value={source} onChange={e => setSource(e.target.value as LeadSource)} style={selStyle}>
                  {sources.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>

              <Field label="Température initiale">
                <div style={{ display: "flex", gap: 8 }}>
                  {(["Hot", "Warm", "Cold"] as Temperature[]).map(t => (
                    <label key={t} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "7px 12px", borderRadius: 8, border: `2px solid ${temperature === t ? tempColors[t] : "rgba(0,0,0,0.12)"}`, background: temperature === t ? `${tempColors[t]}12` : "#fff", fontSize: 13 }}>
                      <input type="radio" checked={temperature === t} onChange={() => setTemperature(t)} style={{ display: "none" }} />
                      <span style={{ color: temperature === t ? tempColors[t] : T.textMid, fontWeight: temperature === t ? 700 : 400 }}>{tempLabels[t]}</span>
                    </label>
                  ))}
                </div>
              </Field>

              <Field label="Valeur estimée annuelle ($)">
                <input type="number" value={estimatedValue} onChange={e => setEstimatedValue(e.target.value)} placeholder="0" style={inpStyle} />
              </Field>
              <Field label="Volume mensuel estimé">
                <input type="number" value={monthlyVolume} onChange={e => setMonthlyVolume(e.target.value)} placeholder="gallons" style={inpStyle} />
              </Field>

              <Field label={`Probabilité de closing: ${closingProbability}%`} col2>
                <input type="range" min={0} max={100} value={closingProbability} onChange={e => setClosingProbability(parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: T.main }} />
              </Field>

              <Field label="Date cible de closing">
                <input type="date" value={targetClosingDate} onChange={e => setTargetClosingDate(e.target.value)} style={inpStyle} />
              </Field>

              {isAdmin && (
                <Field label="Assigner à">
                  <select value={assignedAgentId} onChange={e => setAssignedAgentId(e.target.value)} style={selStyle}>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </Field>
              )}

              <Field label="Produits d'intérêt" col2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {productsLoading ? (
                    <span style={{ fontSize: 12, color: "#8e8e93" }}>Chargement des produits...</span>
                  ) : products.length === 0 ? (
                    <span style={{ fontSize: 12, color: "#8e8e93" }}>Aucun produit disponible</span>
                  ) : products.map(p => (
                    <button key={p.id} onClick={() => toggleProduct(p.name)} type="button"
                      style={{
                        fontSize: 12, padding: "5px 10px", borderRadius: 7,
                        border: `2px solid ${productsInterest.includes(p.name) ? T.main : "rgba(0,0,0,0.12)"}`,
                        background: productsInterest.includes(p.name) ? "rgba(99,102,241,0.08)" : "#fff",
                        color: productsInterest.includes(p.name) ? T.main : T.textMid,
                        cursor: "pointer", fontFamily: "inherit", fontWeight: productsInterest.includes(p.name) ? 600 : 400,
                        transition: "all 0.1s",
                      }}
                    >
                      {productsInterest.includes(p.name) ? "✓ " : ""}{p.name}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Notes initiales" col2>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  style={{ ...inpStyle, height: 80, paddingTop: 10, resize: "vertical" }} />
              </Field>
            </div>
          </Section>
        </div>

        <div style={{ padding: "16px 28px", borderTop: "1px solid rgba(0,0,0,0.07)", display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "11px 22px", borderRadius: 8, border: "1px solid #ddd", background: T.bgCard, cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}>
            Annuler
          </button>
          <button onClick={handleSave} style={{ padding: "11px 22px", borderRadius: 8, border: "none", background: T.main, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 700 }}>
            Créer le lead
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
