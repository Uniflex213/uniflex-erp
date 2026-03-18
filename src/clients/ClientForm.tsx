import React, { useState, useRef } from "react";
import {
  Client, ClientSource, PaymentTerms, ClientCurrency,
  CLIENT_TYPES, CLIENT_TIERS, CLIENT_SOURCES, PAYMENT_TERMS, CLIENT_CURRENCIES,
  EMPTY_CLIENT, generateClientCode, TIER_COLORS, TYPE_COLORS,
} from "./clientTypes";
import { Pricelist } from "../pricelist/pricelistTypes";
import { useAgents } from "../hooks/useAgents";
import { supabase } from "../supabaseClient";
import { T } from "../theme";

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase",
  letterSpacing: 0.5, marginBottom: 5, display: "block",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text,
  fontFamily: "inherit", background: T.bgCard, outline: "none", boxSizing: "border-box",
};

const sectionTitle = (title: string) => (
  <div style={{
    fontSize: 12, fontWeight: 800, color: T.main, textTransform: "uppercase",
    letterSpacing: 0.8, padding: "16px 0 10px", borderBottom: `2px solid ${T.main}22`,
    marginBottom: 14,
  }}>
    {title}
  </div>
);

interface Props {
  initial?: Partial<Client>;
  pricelists?: Pricelist[];
  clientCount?: number;
  onSave: (data: Omit<Client, "id" | "created_at" | "updated_at">) => void;
  onCancel: () => void;
  isConversion?: boolean;
  isAdmin?: boolean;
}

export default function ClientForm({ initial, pricelists = [], clientCount = 0, onSave, onCancel, isConversion, isAdmin }: Props) {
  const agents = useAgents();
  const [form, setForm] = useState<Omit<Client, "id" | "created_at" | "updated_at">>({
    ...EMPTY_CLIENT,
    ...initial,
  });
  const [uploadingPDF, setUploadingPDF] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  async function handlePDFUpload(file: File) {
    if (!file || file.type !== "application/pdf") {
      setUploadError("Veuillez sélectionner un fichier PDF.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setUploadError("Le fichier dépasse la limite de 20 Mo.");
      return;
    }
    setUploadingPDF(true);
    setUploadError("");
    const path = `pricelists/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("client-files").upload(path, file, { upsert: true });
    if (error) {
      setUploadError("Erreur lors du téléversement. Veuillez réessayer.");
      setUploadingPDF(false);
      return;
    }
    const { data } = supabase.storage.from("client-files").getPublicUrl(path);
    set("pricelist_pdf_url", data.publicUrl);
    setUploadingPDF(false);
  }

  const handleSubmit = () => {
    if (!form.company_name.trim() || !form.contact_first_name.trim() || !form.contact_last_name.trim() || !form.email.trim() || !form.phone.trim()) return;
    const code = form.client_code.trim() || generateClientCode(form.company_name, clientCount + 1);
    onSave({ ...form, client_code: code });
  };

  const canSubmit = form.company_name.trim() && form.contact_first_name.trim() && form.contact_last_name.trim() && form.email.trim() && form.phone.trim();

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(230,228,224,0.85)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", zIndex: 9999 }} onClick={onCancel} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "min(900px, 96vw)", maxHeight: "92vh", overflowY: "auto",
        background: T.bgCard, borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,0.22)",
        zIndex: 10000, fontFamily: "'Outfit', sans-serif",
      }}>
        <div style={{
          position: "sticky", top: 0, background: T.bgCard, zIndex: 10,
          padding: "20px 28px 16px", borderBottom: `1px solid ${T.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: T.text }}>
              {isConversion ? "Convertir en client" : initial ? "Modifier le client" : "Nouveau Client"}
            </div>
            {isConversion && (
              <div style={{ fontSize: 12, color: T.textMid, marginTop: 3 }}>
                Les informations du lead ont été pré-remplies. Complétez les champs manquants.
              </div>
            )}
          </div>
          <button onClick={onCancel} style={{ border: "none", background: T.bg, borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", color: T.text, flexShrink: 0 }}>
            ×
          </button>
        </div>

        <div style={{ padding: "20px 28px 28px" }}>
          {sectionTitle("Informations générales")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Nom de la compagnie *</label>
              <input style={inputStyle} value={form.company_name} onChange={e => set("company_name", e.target.value)} placeholder="Ex: Époxy Pro Montréal" />
            </div>
            <div>
              <label style={labelStyle}>Prénom du contact *</label>
              <input style={inputStyle} value={form.contact_first_name} onChange={e => set("contact_first_name", e.target.value)} placeholder="Jean" />
            </div>
            <div>
              <label style={labelStyle}>Nom du contact *</label>
              <input style={inputStyle} value={form.contact_last_name} onChange={e => set("contact_last_name", e.target.value)} placeholder="Tremblay" />
            </div>
            <div>
              <label style={labelStyle}>Poste / Titre</label>
              <input style={inputStyle} value={form.contact_title} onChange={e => set("contact_title", e.target.value)} placeholder="Directeur des achats" />
            </div>
            <div>
              <label style={labelStyle}>Email *</label>
              <input style={inputStyle} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="jean@example.com" />
            </div>
            <div>
              <label style={labelStyle}>Téléphone *</label>
              <input style={inputStyle} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="514-555-0123" />
            </div>
            <div>
              <label style={labelStyle}>Téléphone secondaire</label>
              <input style={inputStyle} value={form.phone_secondary} onChange={e => set("phone_secondary", e.target.value)} placeholder="Optionnel" />
            </div>
            <div>
              <label style={labelStyle}>Site web</label>
              <input style={inputStyle} value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://example.com" />
            </div>
          </div>

          {sectionTitle("Adresse de facturation")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Adresse complète</label>
              <input style={inputStyle} value={form.billing_address} onChange={e => set("billing_address", e.target.value)} placeholder="1234 Rue Sherbrooke O" />
            </div>
            <div>
              <label style={labelStyle}>Ville</label>
              <input style={inputStyle} value={form.billing_city} onChange={e => set("billing_city", e.target.value)} placeholder="Montréal" />
            </div>
            <div>
              <label style={labelStyle}>Province / État</label>
              <input style={inputStyle} value={form.billing_province} onChange={e => set("billing_province", e.target.value)} placeholder="QC" />
            </div>
            <div>
              <label style={labelStyle}>Code postal</label>
              <input style={inputStyle} value={form.billing_postal_code} onChange={e => set("billing_postal_code", e.target.value)} placeholder="H3A 1B1" />
            </div>
            <div>
              <label style={labelStyle}>Pays</label>
              <select style={inputStyle} value={form.billing_country} onChange={e => set("billing_country", e.target.value)}>
                <option>Canada</option>
                <option>États-Unis</option>
                <option>Autre</option>
              </select>
            </div>
          </div>

          {sectionTitle("Adresse de livraison")}
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 12 }}>
            <input type="checkbox" checked={form.shipping_same_as_billing} onChange={e => set("shipping_same_as_billing", e.target.checked)} style={{ width: 16, height: 16, accentColor: T.main }} />
            Même que l'adresse de facturation
          </label>
          {!form.shipping_same_as_billing && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Adresse de livraison</label>
                <input style={inputStyle} value={form.shipping_address} onChange={e => set("shipping_address", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Ville</label>
                <input style={inputStyle} value={form.shipping_city} onChange={e => set("shipping_city", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Province</label>
                <input style={inputStyle} value={form.shipping_province} onChange={e => set("shipping_province", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Code postal</label>
                <input style={inputStyle} value={form.shipping_postal_code} onChange={e => set("shipping_postal_code", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Pays</label>
                <select style={inputStyle} value={form.shipping_country} onChange={e => set("shipping_country", e.target.value)}>
                  <option>Canada</option>
                  <option>États-Unis</option>
                  <option>Autre</option>
                </select>
              </div>
            </div>
          )}

          {sectionTitle("Classification")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={labelStyle}>Type de client</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {CLIENT_TYPES.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("client_type", t)}
                    style={{
                      padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      background: form.client_type === t ? TYPE_COLORS[t] : T.bg,
                      color: form.client_type === t ? "#fff" : T.textMid,
                      border: `1.5px solid ${form.client_type === t ? TYPE_COLORS[t] : T.border}`,
                    }}
                  >{t}</button>
                ))}
              </div>
              {form.client_type === "Autre" && (
                <input style={{ ...inputStyle, marginTop: 8 }} value={form.client_type_other} onChange={e => set("client_type_other", e.target.value)} placeholder="Précisez..." />
              )}
            </div>
            <div>
              <label style={labelStyle}>Tier</label>
              <div style={{ display: "flex", gap: 10 }}>
                {CLIENT_TIERS.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("tier", t)}
                    style={{
                      flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                      background: form.tier === t ? TIER_COLORS[t] : T.bg,
                      color: form.tier === t ? "#fff" : T.textMid,
                      border: `1.5px solid ${form.tier === t ? TIER_COLORS[t] : T.border}`,
                    }}
                  >{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Région assignée</label>
              <input style={inputStyle} value={form.region} onChange={e => set("region", e.target.value)} placeholder="Ex: Montréal, Québec..." />
            </div>
            <div>
              <label style={labelStyle}>Source</label>
              <select style={inputStyle} value={form.source} onChange={e => set("source", e.target.value as ClientSource)}>
                {CLIENT_SOURCES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {sectionTitle("Commercial")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {isAdmin && (
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Agent assigné</label>
                <select
                  style={inputStyle}
                  value={form.agent_id}
                  onChange={e => {
                    const agent = agents.find(a => a.id === e.target.value);
                    if (agent) { set("agent_id", agent.id); set("agent_name", agent.name); }
                  }}
                >
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label style={labelStyle}>Code client</label>
              <input style={inputStyle} value={form.client_code} onChange={e => set("client_code", e.target.value)} placeholder="Auto-généré si vide (ex: EPO-001)" />
            </div>
            <div>
              <label style={labelStyle}>Conditions de paiement</label>
              <select style={inputStyle} value={form.payment_terms} onChange={e => set("payment_terms", e.target.value as PaymentTerms)}>
                {PAYMENT_TERMS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Devise préférée</label>
              <select style={inputStyle} value={form.currency} onChange={e => set("currency", e.target.value as ClientCurrency)}>
                {CLIENT_CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Commission spéciale (%)</label>
              <input
                style={inputStyle}
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={form.special_commission_rate ?? ""}
                onChange={e => set("special_commission_rate", e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Laissez vide = taux standard"
              />
            </div>
          </div>

          {sectionTitle("Liste de prix (PDF)")}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handlePDFUpload(f); }}
            />
            {form.pricelist_pdf_url ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#f0f7ff", border: "1.5px solid #93c5fd", borderRadius: 10 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1d4ed8" }}>Liste de prix attachée</div>
                  <div style={{ fontSize: 11, color: T.textMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {form.pricelist_pdf_url.split("/").pop()?.replace(/_/g, " ")}
                  </div>
                </div>
                <a href={form.pricelist_pdf_url} target="_blank" rel="noopener noreferrer"
                  style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 7, padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>
                  Ouvrir
                </a>
                <button onClick={() => { set("pricelist_pdf_url", ""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  style={{ background: "#ffe5e3", color: "#dc2626", border: "none", borderRadius: 7, padding: "7px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit", flexShrink: 0 }}>
                  Supprimer
                </button>
                <button onClick={() => fileInputRef.current?.click()} disabled={uploadingPDF}
                  style={{ background: T.bg, color: T.textMid, border: `1.5px solid ${T.border}`, borderRadius: 7, padding: "7px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit", flexShrink: 0 }}>
                  Remplacer
                </button>
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handlePDFUpload(f); }}
                onClick={() => !uploadingPDF && fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? T.main : T.border}`,
                  borderRadius: 10, padding: "28px 20px", textAlign: "center",
                  background: dragOver ? "#eff1ff" : T.bg,
                  cursor: uploadingPDF ? "default" : "pointer",
                  transition: "all 0.18s",
                }}>
                {uploadingPDF ? (
                  <div style={{ color: T.textMid, fontSize: 13 }}>Téléversement en cours...</div>
                ) : (
                  <>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={T.main} strokeWidth="1.5" style={{ marginBottom: 8 }}>
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="12" y1="18" x2="12" y2="12"/>
                      <polyline points="9 15 12 12 15 15"/>
                    </svg>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>
                      Glisser-déposer un PDF ou cliquer pour parcourir
                    </div>
                    <div style={{ fontSize: 11, color: T.textLight }}>Format PDF — 20 Mo maximum</div>
                  </>
                )}
              </div>
            )}
            {uploadError && (
              <div style={{ fontSize: 12, color: "#dc2626", marginTop: 6, fontWeight: 600 }}>{uploadError}</div>
            )}
          </div>

          {sectionTitle("Notes internes")}
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
            value={form.notes}
            onChange={e => set("notes", e.target.value)}
            placeholder="Notes libres sur ce client..."
          />

          {isConversion && (
            <>
              {sectionTitle("Options de transfert")}
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: T.text }}>
                <input
                  type="checkbox"
                  checked={form.crm_history_transferred}
                  onChange={e => set("crm_history_transferred", e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: T.main }}
                />
                Transférer tout l'historique CRM (activités, notes, samples, fichiers) vers la fiche client
              </label>
            </>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: "11px 24px", borderRadius: 10, border: `1.5px solid ${T.border}`,
                background: T.bgCard, color: T.text, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                padding: "11px 28px", borderRadius: 10, border: "none",
                background: canSubmit ? T.main : "#d1d5db",
                color: "#fff", fontSize: 13, fontWeight: 800, cursor: canSubmit ? "pointer" : "not-allowed",
                fontFamily: "inherit", transition: "all 0.15s",
              }}
            >
              {isConversion ? "Convertir en client" : initial ? "Enregistrer" : "Créer le client"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
