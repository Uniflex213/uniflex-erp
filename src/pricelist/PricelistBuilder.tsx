import React, { useState, useRef } from "react";
import {
  Pricelist, PricelistLine, PricelistUnit, PricelistFormat,
  ClientType, PricelistCurrency,
} from "./pricelistTypes";
import { useApp } from "../AppContext";
import PricelistPreviewModal from "./PricelistPreviewModal";
import { generatePricelistPDF } from "./pdfGenerator";
import { T } from "../theme";
import AddressAutocomplete from "../components/AddressAutocomplete";


const fmt = (n: number, currency = "CAD") =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6M14 11v6"/>
  </svg>
);

const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const DragIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
    <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
    <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
  </svg>
);

type ClientForm = {
  companyName: string;
  address: string;
  clientType: ClientType | "";
  contactName: string;
  clientEmail: string;
  clientPhone: string;
  validUntil: string;
  currency: PricelistCurrency;
  exchangeRate: number;
  internalNotes: string;
};

type NewLineRow = {
  product: string;
  minQty: string;
  price: string;
  unit: PricelistUnit;
  format: PricelistFormat | "";
};

interface Props {
  onBack: () => void;
  onSave: (pl: Pricelist) => void;
  prefill?: Pricelist | null;
}

const defaultValidUntil = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
};

export default function PricelistBuilder({ onBack, onSave, prefill }: Props) {
  const { products: ctxProducts } = useApp();
  const availableProducts = ctxProducts
    .filter(p => p.is_active)
    .map(p => ({ name: p.name, description: "", imageUrl: "" }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const [step, setStep] = useState<"client" | "lines">("client");
  const [clientForm, setClientForm] = useState<ClientForm>({
    companyName: prefill?.companyName ?? "",
    address: prefill?.address ?? "",
    clientType: prefill?.clientType ?? "",
    contactName: prefill?.contactName ?? "",
    clientEmail: prefill?.clientEmail ?? "",
    clientPhone: prefill?.clientPhone ?? "",
    validUntil: prefill?.validUntil ?? defaultValidUntil(),
    currency: prefill?.currency ?? "CAD",
    exchangeRate: prefill?.exchangeRate ?? 1.38,
    internalNotes: prefill?.internalNotes ?? "",
  });

  const [lines, setLines] = useState<PricelistLine[]>(
    prefill?.lines.map(l => ({ ...l, id: Date.now().toString() + Math.random() })) ?? []
  );

  const [newRow, setNewRow] = useState<NewLineRow>({ product: "", minQty: "", price: "", unit: "/KIT", format: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<Partial<NewLineRow>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);

  const addrRef = useRef<HTMLDivElement>(null);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const clientValid = clientForm.companyName.trim() !== "" && clientForm.address.trim() !== "" && clientForm.clientType !== "" && clientForm.contactName.trim() !== "" && clientForm.clientEmail.trim() !== "" && clientForm.clientPhone.trim() !== "" && clientForm.validUntil !== "";

  const rowValid = newRow.product !== "" && newRow.minQty !== "" && Number(newRow.minQty) > 0 && newRow.price !== "" && Number(newRow.price) > 0 && newRow.format !== "";



  const addLine = () => {
    if (!rowValid) return;
    setLines(prev => [...prev, {
      id: Date.now().toString(),
      product: newRow.product,
      minQty: Number(newRow.minQty),
      price: Number(newRow.price),
      unit: newRow.unit,
      format: newRow.format as PricelistFormat,
    }]);
    setNewRow({ product: "", minQty: "", price: "", unit: "/KIT", format: "" });
  };

  const removeLine = (id: string) => setLines(prev => prev.filter(l => l.id !== id));

  const startEdit = (line: PricelistLine) => {
    setEditingId(line.id);
    setEditRow({ product: line.product, minQty: String(line.minQty), price: String(line.price), unit: line.unit, format: line.format });
  };

  const saveEdit = (id: string) => {
    setLines(prev => prev.map(l => l.id !== id ? l : {
      ...l,
      product: editRow.product ?? l.product,
      minQty: Number(editRow.minQty ?? l.minQty),
      price: Number(editRow.price ?? l.price),
      unit: (editRow.unit ?? l.unit) as PricelistUnit,
      format: (editRow.format ?? l.format) as PricelistFormat,
    }));
    setEditingId(null);
  };

  const handleDragStart = (i: number) => { dragItem.current = i; };
  const handleDragEnter = (i: number) => { dragOverItem.current = i; };
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const reordered = [...lines];
    const dragged = reordered.splice(dragItem.current, 1)[0];
    reordered.splice(dragOverItem.current, 0, dragged);
    setLines(reordered);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const buildPricelist = (): Pricelist => ({
    id: `PL-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    createdAt: new Date().toISOString().split("T")[0],
    companyName: clientForm.companyName,
    address: clientForm.address,
    clientType: clientForm.clientType as ClientType,
    contactName: clientForm.contactName,
    clientEmail: clientForm.clientEmail,
    clientPhone: clientForm.clientPhone,
    validUntil: clientForm.validUntil,
    currency: clientForm.currency,
    exchangeRate: clientForm.currency !== "CAD" ? clientForm.exchangeRate : undefined,
    internalNotes: clientForm.internalNotes,
    lines,
  });

  const handleGenerate = async () => {
    setGenerating(true);
    const pl = buildPricelist();
    try {
      await generatePricelistPDF(pl);
    } catch (e) {
      console.error("PDF generation error:", e);
    } finally {
      setGenerating(false);
    }
    setShowPreview(false);
    onSave(pl);
  };

  const inputStyle: React.CSSProperties = {
    border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px",
    fontSize: 13, fontFamily: "inherit", outline: "none", background: T.bgCard,
    color: T.text, width: "100%", boxSizing: "border-box",
  };

  const radioOpt = (label: string, value: string, field: keyof ClientForm) => {
    const checked = clientForm[field] === value;
    return (
      <label key={value} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "5px 0" }}>
        <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${checked ? T.main : "#d1d5db"}`, background: checked ? T.main : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
          {checked && <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.bgCard }} />}
        </div>
        <span style={{ fontSize: 13, fontWeight: checked ? 700 : 400, color: checked ? T.text : T.textMid }}>{label}</span>
        <input type="radio" checked={checked} onChange={() => setClientForm(p => ({ ...p, [field]: value }))} style={{ display: "none" }} />
      </label>
    );
  };

  const previewPricelist = buildPricelist();

  return (
    <div>
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 6, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, color: T.textMid, fontFamily: "inherit" }}
        >
          <BackIcon /> Retour
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{prefill ? "Dupliquer une Pricelist" : "Nouvelle Pricelist"}</h2>
          <p style={{ margin: 0, color: T.textMid, fontSize: 13 }}>Remplir les informations client puis construire la liste de prix</p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden" }}>
          <div
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: step === "lines" ? `1px solid ${T.border}` : "none", cursor: step === "lines" ? "pointer" : "default", background: step === "lines" ? "#f8f9fb" : T.card }}
            onClick={() => step === "lines" && setStep("client")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: step === "lines" ? T.main : `${T.main}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {step === "lines"
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  : <span style={{ fontSize: 13, fontWeight: 800, color: T.main }}>1</span>
                }
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>Informations du client</div>
                {step === "lines" && (
                  <div style={{ fontSize: 12, color: T.textMid, marginTop: 2 }}>
                    {clientForm.companyName} · {clientForm.clientType} · {clientForm.currency}
                  </div>
                )}
              </div>
            </div>
            {step === "lines" && <span style={{ fontSize: 11, color: T.main, fontWeight: 700 }}>Modifier</span>}
          </div>

          {step === "client" && (
            <div style={{ padding: 24, animation: "fadeInUp 0.2s ease-out" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Nom de la compagnie *</div>
                    <input value={clientForm.companyName} onChange={e => setClientForm(p => ({ ...p, companyName: e.target.value }))} placeholder="ex: Époxy Pro Montréal" style={inputStyle} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Adresse complète *</div>
                    <div style={{ position: "relative" }} ref={addrRef}>
                      <AddressAutocomplete
                        style={inputStyle}
                        value={clientForm.address}
                        onChange={v => setClientForm(p => ({ ...p, address: v }))}
                        onSelect={s => setClientForm(p => ({ ...p, address: s.full_address }))}
                        placeholder="1234 Rue..."
                      />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Personne contact *</div>
                    <input value={clientForm.contactName} onChange={e => setClientForm(p => ({ ...p, contactName: e.target.value }))} placeholder="Prénom Nom" style={inputStyle} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Email du client *</div>
                    <input type="email" value={clientForm.clientEmail} onChange={e => setClientForm(p => ({ ...p, clientEmail: e.target.value }))} placeholder="contact@client.com" style={inputStyle} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Téléphone *</div>
                    <input value={clientForm.clientPhone} onChange={e => setClientForm(p => ({ ...p, clientPhone: e.target.value }))} placeholder="514-555-0100" style={inputStyle} />
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>Type de client *</div>
                    {(["Installateur", "Distributeur", "Large Scale"] as ClientType[]).map(ct => radioOpt(ct, ct, "clientType"))}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Date de validité *</div>
                    <input type="date" value={clientForm.validUntil} onChange={e => setClientForm(p => ({ ...p, validUntil: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Devise</div>
                    <select
                      value={clientForm.currency}
                      onChange={e => {
                        const c = e.target.value as PricelistCurrency;
                        setClientForm(p => ({
                          ...p,
                          currency: c,
                          exchangeRate: c === "EUR" ? 1.50 : 1.38,
                        }));
                      }}
                      style={{ ...inputStyle, cursor: "pointer" }}
                    >
                      <option value="CAD">CAD — Dollar canadien</option>
                      <option value="USD">USD — Dollar américain</option>
                      <option value="EUR">EUR — Euro</option>
                    </select>
                  </div>
                  {clientForm.currency !== "CAD" && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>
                        Taux de change {clientForm.currency}/CAD
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="number"
                          min="0.1"
                          step="0.01"
                          value={clientForm.exchangeRate}
                          onChange={e => setClientForm(p => ({ ...p, exchangeRate: parseFloat(e.target.value) || 1 }))}
                          style={{ ...inputStyle, width: "50%" }}
                        />
                        <span style={{ fontSize: 12, color: T.textLight }}>
                          1 {clientForm.currency} = {clientForm.exchangeRate.toFixed(2)} CAD
                        </span>
                      </div>
                    </div>
                  )}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4 }}>Notes internes</div>
                      <span style={{ fontSize: 10, background: "#f3f4f6", color: T.textLight, padding: "2px 7px", borderRadius: 4, fontWeight: 600 }}>Non imprimé sur le PDF</span>
                    </div>
                    <textarea value={clientForm.internalNotes} onChange={e => setClientForm(p => ({ ...p, internalNotes: e.target.value }))}
                      placeholder="Notes de contexte réservées au vendeur..."
                      rows={3}
                      style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={() => clientValid && setStep("lines")}
                  disabled={!clientValid}
                  style={{
                    background: clientValid ? T.main : "#e5e7eb", color: clientValid ? "#fff" : "#9ca3af",
                    border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 800,
                    cursor: clientValid ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "all 0.2s",
                  }}
                >
                  NEXT →
                </button>
              </div>
            </div>
          )}
        </div>

        {step === "lines" && (
          <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 24, animation: "fadeInUp 0.25s ease-out" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${T.main}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: T.main }}>2</span>
              </div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Bâtir la liste de prix</div>
              <span style={{ marginLeft: 4, fontSize: 11, color: T.textLight }}>Glissez pour réorganiser l'ordre</span>
            </div>

            <div style={{ background: "#f8f9fb", borderRadius: 10, padding: 16, marginBottom: 20, border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 12 }}>Ajouter un produit</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: "2 1 160px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", marginBottom: 4 }}>Produit</div>
                  <select value={newRow.product} onChange={e => setNewRow(p => ({ ...p, product: e.target.value }))}
                    style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, fontFamily: "inherit", outline: "none", background: T.bgCard, color: newRow.product ? T.text : T.textLight, width: "100%", cursor: "pointer" }}>
                    <option value="">Sélectionner...</option>
                    {availableProducts.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
                <div style={{ flex: "1 1 100px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", marginBottom: 4 }}>Qté min.</div>
                  <input type="number" min="1" value={newRow.minQty} onChange={e => setNewRow(p => ({ ...p, minQty: e.target.value }))} placeholder="0"
                    style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, fontFamily: "inherit", outline: "none", background: T.bgCard, width: "100%", boxSizing: "border-box" as const }} />
                </div>
                <div style={{ flex: "1 1 130px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", marginBottom: 4 }}>Prix négocié</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input type="number" min="0" value={newRow.price} onChange={e => setNewRow(p => ({ ...p, price: e.target.value }))} placeholder="0.00"
                      style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, fontFamily: "inherit", outline: "none", background: T.bgCard, flex: 1, boxSizing: "border-box" as const }} />
                    <select value={newRow.unit} onChange={e => setNewRow(p => ({ ...p, unit: e.target.value as PricelistUnit }))}
                      style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 8px", fontSize: 12, fontFamily: "inherit", outline: "none", background: T.bgCard, cursor: "pointer", flexShrink: 0 }}>
                      <option value="/KIT">/KIT</option>
                      <option value="/GAL">/GAL</option>
                    </select>
                  </div>
                </div>
                <div style={{ flex: "2 1 160px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", marginBottom: 4 }}>Format</div>
                  <select value={newRow.format} onChange={e => setNewRow(p => ({ ...p, format: e.target.value as PricelistFormat }))}
                    style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, fontFamily: "inherit", outline: "none", background: T.bgCard, color: newRow.format ? T.text : T.textLight, width: "100%", cursor: "pointer" }}>
                    <option value="">Sélectionner...</option>
                    {(["Common Kit (1GAL, 2GAL, 3GAL)", "Large Kit (5GAL, 10GAL, 15GAL)", "BARREL KIT (55 GAL per Barrel)", "TOTE KIT (250 GAL per Tote)", "SPECIAL (see with HO for options)"] as PricelistFormat[]).map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <button
                  onClick={addLine}
                  disabled={!rowValid}
                  style={{ background: rowValid ? T.main : "#e5e7eb", color: rowValid ? "#fff" : "#9ca3af", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: rowValid ? "pointer" : "not-allowed", fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.2s" }}
                >
                  + AJOUTER
                </button>
              </div>
            </div>

            <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8f9fb" }}>
                    {["", "Produit", "Qté min.", "Prix négocié", "Unité", "Format", "Sous-total", ""].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: ["Qté min.", "Prix négocié", "Sous-total"].includes(h) ? "right" : "left", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3, color: T.textLight, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: "32px 16px", textAlign: "center", color: T.textLight, fontSize: 13 }}>Aucun produit ajouté</td></tr>
                  ) : lines.map((line, i) => (
                    <tr
                      key={line.id}
                      draggable
                      onDragStart={() => handleDragStart(i)}
                      onDragEnter={() => handleDragEnter(i)}
                      onDragEnd={handleDragEnd}
                      onDragOver={e => e.preventDefault()}
                      style={{ borderBottom: i < lines.length - 1 ? `1px solid ${T.border}` : "none", background: "transparent", cursor: "grab" }}
                    >
                      <td style={{ padding: "10px 12px", color: T.textLight }}><DragIcon /></td>

                      {editingId === line.id ? (
                        <>
                          <td style={{ padding: "8px 12px" }}>
                            <select value={editRow.product ?? line.product} onChange={e => setEditRow(p => ({ ...p, product: e.target.value }))}
                              style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 8px", fontSize: 12, fontFamily: "inherit", outline: "none", background: T.bgCard, width: "100%", cursor: "pointer" }}>
                              {availableProducts.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <input type="number" value={editRow.minQty ?? line.minQty} onChange={e => setEditRow(p => ({ ...p, minQty: e.target.value }))}
                              style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 8px", fontSize: 12, fontFamily: "inherit", outline: "none", background: T.bgCard, width: 70, textAlign: "right" }} />
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <input type="number" value={editRow.price ?? line.price} onChange={e => setEditRow(p => ({ ...p, price: e.target.value }))}
                              style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 8px", fontSize: 12, fontFamily: "inherit", outline: "none", background: T.bgCard, width: 80, textAlign: "right" }} />
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <select value={editRow.unit ?? line.unit} onChange={e => setEditRow(p => ({ ...p, unit: e.target.value as PricelistUnit }))}
                              style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 8px", fontSize: 12, fontFamily: "inherit", outline: "none", background: T.bgCard, cursor: "pointer" }}>
                              <option value="/KIT">/KIT</option>
                              <option value="/GAL">/GAL</option>
                            </select>
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <select value={editRow.format ?? line.format} onChange={e => setEditRow(p => ({ ...p, format: e.target.value as PricelistFormat }))}
                              style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 8px", fontSize: 12, fontFamily: "inherit", outline: "none", background: T.bgCard, cursor: "pointer", width: "100%" }}>
                              {(["Common Kit (1GAL, 2GAL, 3GAL)", "Large Kit (5GAL, 10GAL, 15GAL)", "BARREL KIT (55 GAL per Barrel)", "TOTE KIT (250 GAL per Tote)", "SPECIAL (see with HO for options)"] as PricelistFormat[]).map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>—</td>
                          <td style={{ padding: "8px 12px" }}>
                            <button onClick={() => saveEdit(line.id)} style={{ background: T.main, color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>OK</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: "12px 12px", fontWeight: 700 }}>{line.product}</td>
                          <td style={{ padding: "12px 12px", textAlign: "right" }}>{line.minQty}</td>
                          <td style={{ padding: "12px 12px", textAlign: "right" }}>{fmt(line.price, clientForm.currency)}</td>
                          <td style={{ padding: "12px 12px", color: T.textMid, fontSize: 12 }}>{line.unit}</td>
                          <td style={{ padding: "12px 12px", color: T.textMid, fontSize: 12 }}>{line.format}</td>
                          <td style={{ padding: "12px 12px", textAlign: "right", fontWeight: 700 }}>{fmt(line.minQty * line.price, clientForm.currency)}</td>
                          <td style={{ padding: "12px 12px" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => startEdit(line)} style={{ background: "#eff6ff", color: "#1d4ed8", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center" }}><EditIcon /></button>
                              <button onClick={() => removeLine(line.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center" }}><TrashIcon /></button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button
                onClick={() => lines.length > 0 && setShowPreview(true)}
                disabled={lines.length === 0}
                style={{
                  background: lines.length > 0 ? "#fff" : "#f4f5f9",
                  color: lines.length > 0 ? T.main : "#9ca3af",
                  border: lines.length > 0 ? `2px solid ${T.main}` : `1px solid ${T.border}`,
                  borderRadius: 10, padding: "12px 24px", fontSize: 13, fontWeight: 800,
                  cursor: lines.length > 0 ? "pointer" : "not-allowed", fontFamily: "inherit", letterSpacing: 0.3,
                }}
              >
                PRÉVISUALISER
              </button>
              <button
                onClick={async () => {
                  if (lines.length === 0) return;
                  setGenerating(true);
                  const pl = buildPricelist();
                  try {
                    await generatePricelistPDF(pl);
                  } catch (e) {
                    console.error("PDF generation error:", e);
                  } finally {
                    setGenerating(false);
                  }
                  onSave(pl);
                }}
                disabled={lines.length === 0 || generating}
                style={{
                  background: lines.length === 0 || generating ? "#e5e7eb" : T.main,
                  color: lines.length === 0 || generating ? "#9ca3af" : "#fff",
                  border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 13, fontWeight: 800,
                  cursor: lines.length === 0 || generating ? "not-allowed" : "pointer", fontFamily: "inherit", letterSpacing: 0.3,
                }}
              >
                {generating ? "Génération..." : "GÉNÉRER PDF"}
              </button>
            </div>
          </div>
        )}
      </div>

      {showPreview && (
        <PricelistPreviewModal
          pricelist={previewPricelist}
          onClose={() => setShowPreview(false)}
          onGenerate={handleGenerate}
          generating={generating}
        />
      )}
    </div>
  );
}
