import React, { useState } from "react";
import { Order, OrderProduct, OrderMotif, OrderDestination, OrderLabel, DeliveryType } from "./orderTypes";
import { logChanges } from "../shared/changeLogUtils";
import { useCurrentAgent } from "../hooks/useCurrentAgent";
import { T } from "../theme";

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

const MOTIFS: OrderMotif[] = ["Restock", "Dropship client", "Sample", "Gros client", "Autre"];
const DESTINATIONS: OrderDestination[] = ["CANADA", "USA", "AUTRE"];
const LABELS: OrderLabel[] = ["UNIFLEX", "PRIVATE LABEL", "BLANK"];
const DELIVERY_TYPES: DeliveryType[] = ["Pickup", "Shipping Client", "Add Shipping"];
const FORMATS = ["Common Kit", "Large Kit", "BARREL KIT", "TOTE KIT", "SPECIAL"];

interface Props {
  order: Order;
  onSave: (updates: Partial<Order>) => void;
  onCancel: () => void;
}

interface ProductRow extends OrderProduct {
  tempId: string;
}

export default function EditOrderModal({ order, onSave, onCancel }: Props) {
  const agent = useCurrentAgent();
  const [client, setClient] = useState(order.client);
  const [vendeurCode, setVendeurCode] = useState(order.vendeurCode);
  const [motif, setMotif] = useState<OrderMotif>(order.motif);
  const [motifAutre, setMotifAutre] = useState(order.motifAutre || "");
  const [destination, setDestination] = useState<OrderDestination>(order.destination);
  const [deliveryAddress, setDeliveryAddress] = useState(order.deliveryAddress);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(order.deliveryType);
  const [label, setLabel] = useState<OrderLabel>(order.label);
  const [discountType, setDiscountType] = useState<"%" | "$">(order.discountType || "%");
  const [discountValue, setDiscountValue] = useState(String(order.discountValue ?? ""));
  const [adminNote, setAdminNote] = useState(order.adminNote || "");

  const [products, setProducts] = useState<ProductRow[]>(
    order.products.map((p, i) => ({ ...p, tempId: String(i) }))
  );

  const [newProduct, setNewProduct] = useState<Omit<ProductRow, "tempId">>({
    id: "", product: "", qty: 0, price: 0, unit: "/KIT", format: "Common Kit",
  });

  const [saving, setSaving] = useState(false);

  const subtotal = products.reduce((s, p) => s + p.qty * p.price, 0);
  const discountAmt = discountValue && Number(discountValue) > 0
    ? (discountType === "%" ? subtotal * (Number(discountValue) / 100) : Math.min(Number(discountValue), subtotal))
    : 0;
  const total = subtotal - discountAmt;

  function addProduct() {
    if (!newProduct.product || newProduct.qty <= 0 || newProduct.price <= 0 || !newProduct.format) return;
    setProducts(prev => [...prev, { ...newProduct, id: Date.now().toString(), tempId: Date.now().toString() }]);
    setNewProduct({ id: "", product: "", qty: 0, price: 0, unit: "/KIT", format: "Common Kit" });
  }

  function removeProduct(tempId: string) {
    setProducts(prev => prev.filter(p => p.tempId !== tempId));
  }

  function updateProductField(tempId: string, field: keyof OrderProduct, value: string | number) {
    setProducts(prev => prev.map(p => p.tempId === tempId ? { ...p, [field]: value } : p));
  }

  async function handleSave() {
    setSaving(true);
    const logs = [];
    const by = agent.name;

    const fields: Array<{ key: string; label: string; oldVal: string; newVal: string }> = [
      { key: "client", label: "Client", oldVal: order.client, newVal: client },
      { key: "vendeurCode", label: "Code vendeur", oldVal: order.vendeurCode, newVal: vendeurCode },
      { key: "motif", label: "Motif", oldVal: order.motif, newVal: motif },
      { key: "destination", label: "Destination", oldVal: order.destination, newVal: destination },
      { key: "deliveryAddress", label: "Adresse de livraison", oldVal: order.deliveryAddress, newVal: deliveryAddress },
      { key: "deliveryType", label: "Type de livraison", oldVal: order.deliveryType, newVal: deliveryType },
      { key: "label", label: "Label", oldVal: order.label, newVal: label },
      { key: "discountType", label: "Type de rabais", oldVal: order.discountType || "", newVal: discountType },
      { key: "discountValue", label: "Valeur du rabais", oldVal: String(order.discountValue ?? ""), newVal: discountValue },
      { key: "adminNote", label: "Note admin", oldVal: order.adminNote || "", newVal: adminNote },
    ].filter(f => f.oldVal !== f.newVal);

    const base = { entity_type: "order" as const, entity_id: order.id, entity_label: order.id, changed_by: by };

    for (const f of fields) {
      logs.push({ ...base, field_name: f.label, old_value: f.oldVal || null, new_value: f.newVal || null, change_type: "field_edit" as const });
    }

    const oldProductsSummary = order.products.map(p => `${p.product} x${p.qty}`).join(", ");
    const newProductsSummary = products.map(p => `${p.product} x${p.qty}`).join(", ");
    if (oldProductsSummary !== newProductsSummary) {
      logs.push({ ...base, field_name: "Produits", old_value: oldProductsSummary || null, new_value: newProductsSummary || null, change_type: "item_edited" as const });
    }

    if (logs.length > 0) await logChanges(logs);

    const discountNum = Number(discountValue);
    const newDiscount = discountNum > 0
      ? (discountType === "%" ? subtotal * discountNum / 100 : Math.min(discountNum, subtotal))
      : 0;

    await onSave({
      client,
      vendeurCode,
      motif,
      motifAutre,
      destination,
      deliveryAddress,
      deliveryType,
      label,
      discountType,
      discountValue: discountNum,
      discount: newDiscount,
      subtotal,
      total: subtotal - newDiscount,
      products: products.map(({ tempId: _tempId, ...p }) => p),
      adminNote,
    });
    setSaving(false);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(230,228,224,0.35)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: T.card, borderRadius: 16, width: "100%", maxWidth: 780,
        maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        fontFamily: "'Outfit', sans-serif",
      }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text }}>Modifier la commande</h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: T.textMid, fontFamily: "monospace" }}>{order.id}</p>
          </div>
          <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: T.textMid }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={labelStyle}>Client</label>
              <input value={client} onChange={e => setClient(e.target.value)} style={inputStyle} placeholder="Nom du client" />
            </div>
            <div>
              <label style={labelStyle}>Code vendeur</label>
              <input value={vendeurCode} onChange={e => setVendeurCode(e.target.value)} style={inputStyle} placeholder="Ex: KM-001" />
            </div>
            <div>
              <label style={labelStyle}>Motif</label>
              <select value={motif} onChange={e => setMotif(e.target.value as OrderMotif)} style={inputStyle}>
                {MOTIFS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            {motif === "Autre" && (
              <div>
                <label style={labelStyle}>Préciser le motif</label>
                <input value={motifAutre} onChange={e => setMotifAutre(e.target.value)} style={inputStyle} />
              </div>
            )}
            <div>
              <label style={labelStyle}>Destination</label>
              <select value={destination} onChange={e => setDestination(e.target.value as OrderDestination)} style={inputStyle}>
                {DESTINATIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Label</label>
              <select value={label} onChange={e => setLabel(e.target.value as OrderLabel)} style={inputStyle}>
                {LABELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Type de livraison</label>
              <select value={deliveryType} onChange={e => setDeliveryType(e.target.value as DeliveryType)} style={inputStyle}>
                {DELIVERY_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Adresse de livraison</label>
            <textarea value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} rows={2}
              style={{ ...inputStyle, resize: "vertical" }} placeholder="Adresse complète..." />
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
                  {products.map(p => (
                    <tr key={p.tempId} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: "8px 10px" }}>
                        <input value={p.product} onChange={e => updateProductField(p.tempId, "product", e.target.value)}
                          style={{ ...inputStyle, padding: "6px 8px" }} />
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <select value={p.format} onChange={e => updateProductField(p.tempId, "format", e.target.value)}
                          style={{ ...inputStyle, padding: "6px 8px" }}>
                          {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <input type="number" value={p.qty} onChange={e => updateProductField(p.tempId, "qty", Number(e.target.value))}
                          style={{ ...inputStyle, padding: "6px 8px", width: 70 }} min="1" />
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <input type="number" value={p.price} onChange={e => updateProductField(p.tempId, "price", Number(e.target.value))}
                          style={{ ...inputStyle, padding: "6px 8px", width: 90 }} min="0" step="0.01" />
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <select value={p.unit} onChange={e => updateProductField(p.tempId, "unit", e.target.value as "/KIT" | "/GAL")}
                          style={{ ...inputStyle, padding: "6px 8px", width: 80 }}>
                          <option value="/KIT">/KIT</option>
                          <option value="/GAL">/GAL</option>
                        </select>
                      </td>
                      <td style={{ padding: "8px 10px", fontWeight: 700, color: T.main, whiteSpace: "nowrap" }}>{fmt(p.qty * p.price)}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <button onClick={() => removeProduct(p.tempId)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: T.red, padding: 4 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 100px 110px 90px auto auto", gap: 8, alignItems: "end" }}>
                <input placeholder="Nouveau produit" value={newProduct.product} onChange={e => setNewProduct(p => ({ ...p, product: e.target.value }))}
                  style={{ ...inputStyle, padding: "8px 10px" }} />
                <select value={newProduct.format} onChange={e => setNewProduct(p => ({ ...p, format: e.target.value }))}
                  style={{ ...inputStyle, padding: "8px 10px" }}>
                  {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <input type="number" placeholder="Qté" value={newProduct.qty || ""} onChange={e => setNewProduct(p => ({ ...p, qty: Number(e.target.value) }))}
                  style={{ ...inputStyle, padding: "8px 10px" }} min="1" />
                <input type="number" placeholder="Prix" value={newProduct.price || ""} onChange={e => setNewProduct(p => ({ ...p, price: Number(e.target.value) }))}
                  style={{ ...inputStyle, padding: "8px 10px" }} min="0" step="0.01" />
                <select value={newProduct.unit} onChange={e => setNewProduct(p => ({ ...p, unit: e.target.value as "/KIT" | "/GAL" }))}
                  style={{ ...inputStyle, padding: "8px 10px" }}>
                  <option value="/KIT">/KIT</option>
                  <option value="/GAL">/GAL</option>
                </select>
                <button onClick={addProduct}
                  style={{ background: T.main, color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
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
              <label style={labelStyle}>Note admin</label>
              <input value={adminNote} onChange={e => setAdminNote(e.target.value)} style={inputStyle} placeholder="Note interne..." />
            </div>
          </div>

          <div style={{ background: T.bg, borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "flex-end", gap: 24, alignItems: "center" }}>
            <div style={{ fontSize: 13, color: T.textMid }}>Sous-total: <strong style={{ color: T.text }}>{fmt(subtotal)}</strong></div>
            {discountAmt > 0 && <div style={{ fontSize: 13, color: T.red }}>Rabais: <strong>−{fmt(discountAmt)}</strong></div>}
            <div style={{ fontSize: 16, fontWeight: 800, color: T.main }}>Total: {fmt(total)}</div>
          </div>
        </div>

        <div style={{ padding: "16px 24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onCancel}
            style={{ background: T.bg, color: T.textMid, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving || products.length === 0}
            style={{ background: T.main, color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Sauvegarde..." : "Sauvegarder les modifications"}
          </button>
        </div>
      </div>
    </div>
  );
}
