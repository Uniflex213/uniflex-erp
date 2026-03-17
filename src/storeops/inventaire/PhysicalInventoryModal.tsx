import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import { InventaireProduct } from "./inventaireTypes";
import { useAuth } from "../../contexts/AuthContext";
import { T } from "../../theme";

const fmt2 = (n: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);
const inputStyle: React.CSSProperties = {
  padding: "7px 10px", borderRadius: 7, border: `1px solid ${T.border}`,
  fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box",
};

interface CountItem {
  product_id: string;
  product_name: string;
  stock_system: number;
  stock_counted: number | null;
  cost_price: number;
  notes: string;
}

interface Props {
  products: InventaireProduct[];
  onClose: () => void;
  onDone: () => void;
}

export default function PhysicalInventoryModal({ products, onClose, onDone }: Props) {
  const { storeCode } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [startedBy, setStartedBy] = useState("");
  const [items, setItems] = useState<CountItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [invNumber, setInvNumber] = useState("");

  const activeProducts = products.filter(p => p.is_active);

  async function handleStart() {
    if (!startedBy.trim()) return;
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yy = String(now.getFullYear()).slice(2);
    const num = `INV-${storeCode ?? "BSB"}-${mm}${yy}-${Date.now().toString().slice(-5)}`;
    setInvNumber(num);
    setItems(activeProducts.map(p => ({
      product_id: p.id,
      product_name: p.name,
      stock_system: p.stock_qty,
      stock_counted: null,
      cost_price: p.cost_price,
      notes: "",
    })));
    setStep(2);
  }

  function updateCounted(productId: string, val: number | null) {
    setItems(prev => prev.map(it => it.product_id === productId ? { ...it, stock_counted: val } : it));
  }

  function updateNotes(productId: string, val: string) {
    setItems(prev => prev.map(it => it.product_id === productId ? { ...it, notes: val } : it));
  }

  const filledItems = items.filter(it => it.stock_counted !== null);
  const discrepancyItems = filledItems.filter(it => it.stock_counted !== null && it.stock_counted !== it.stock_system);
  const totalDiscrepancyValue = discrepancyItems.reduce((s, it) => {
    const diff = (it.stock_counted ?? 0) - it.stock_system;
    return s + diff * it.cost_price;
  }, 0);

  function printSheet() {
    const rows = items.map(it =>
      `<tr><td>${it.product_name}</td><td style="text-align:center">${it.stock_system}</td><td style="text-align:center">_______</td><td style="text-align:center">_______</td></tr>`
    ).join('');
    const html = `<html><body><h2>Feuille de comptage — ${invNumber}</h2><p>Date: ${new Date().toLocaleDateString('fr-CA')} — Effectué par: ${startedBy}</p><table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse"><tr style="background:#eee"><th>Produit</th><th>Stock système</th><th>Stock compté</th><th>Écart</th></tr>${rows}</table></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  }

  async function handleApply() {
    if (!filledItems.length) return;
    setSaving(true);
    try {
      const { data: inv, error } = await supabase.from("physical_inventories").insert({
        inventory_number: invNumber,
        store_code: storeCode ?? "BSB",
        status: 'completed',
        started_by: startedBy,
        completed_by: startedBy,
        completed_at: new Date().toISOString(),
        total_products: items.length,
        products_with_discrepancy: discrepancyItems.length,
        total_discrepancy_value: totalDiscrepancyValue,
      }).select().maybeSingle();
      if (error || !inv) throw new Error("Erreur création inventaire");

      const itemRows = items.map((it, idx) => ({
        inventory_id: inv.id,
        product_id: it.product_id,
        product_name: it.product_name,
        stock_system: it.stock_system,
        stock_counted: it.stock_counted,
        discrepancy: it.stock_counted !== null ? it.stock_counted - it.stock_system : null,
        cost_price: it.cost_price,
        discrepancy_value: it.stock_counted !== null ? (it.stock_counted - it.stock_system) * it.cost_price : null,
        notes: it.notes,
        sort_order: idx,
      }));
      await supabase.from("physical_inventory_items").insert(itemRows);

      for (const it of filledItems) {
        if (it.stock_counted === it.stock_system) continue;
        const newQty = it.stock_counted ?? it.stock_system;
        await supabase.from("sale_products").update({ stock_qty: newQty }).eq("id", it.product_id);
        await supabase.from("stock_movements").insert({
          product_id: it.product_id,
          product_name: it.product_name,
          movement_type: 'physical_inventory',
          quantity: newQty - it.stock_system,
          stock_before: it.stock_system,
          stock_after: newQty,
          reference_type: 'physical_inventory',
          reference_id: inv.id,
          reference_number: invNumber,
          reason: 'Inventaire physique',
          agent_name: startedBy,
          store_code: storeCode ?? "BSB",
          notes: it.notes,
        });
      }

      onDone();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1500, padding: 20, overflowY: "auto" }} onClick={onClose}>
      <div style={{ background: T.card, borderRadius: 16, padding: 32, width: "100%", maxWidth: 800, marginBottom: 20, boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: T.text }}>Inventaire Physique</h2>
            <div style={{ fontSize: 13, color: T.textMid, marginTop: 3 }}>Comptage physique de la consignation SCI</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {[1, 2, 3].map(n => (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, background: step >= n ? T.main : T.cardAlt, color: step >= n ? "#fff" : T.textMid }}>{n}</div>
                {n < 3 && <div style={{ width: 24, height: 2, background: step > n ? T.main : T.border }} />}
              </div>
            ))}
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: T.textMid, marginLeft: 8 }}>×</button>
          </div>
        </div>

        {step === 1 && (
          <div>
            <div style={{ background: T.cardAlt, borderRadius: 10, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Étape 1 — Démarrer le comptage</div>
              <p style={{ fontSize: 13, color: T.textMid, margin: "0 0 16px" }}>
                Le système va générer une feuille de comptage avec tous les <strong>{activeProducts.length}</strong> produits actifs et leur stock théorique actuel. Vous pourrez l'imprimer ou saisir les quantités directement.
              </p>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 5 }}>Effectué par *</label>
                <input value={startedBy} onChange={e => setStartedBy(e.target.value)} style={{ ...inputStyle, maxWidth: 300 }} placeholder="Nom de l'employé" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1px solid ${T.border}`, background: "transparent", color: T.textMid, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
              <button onClick={handleStart} disabled={!startedBy.trim()}
                style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none", background: startedBy.trim() ? T.main : "#e5e7eb", color: startedBy.trim() ? "#fff" : "#9ca3af", fontSize: 13, fontWeight: 700, cursor: startedBy.trim() ? "pointer" : "default", fontFamily: "inherit" }}>
                Démarrer l'inventaire
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: T.textMid }}>Saisissez les quantités réellement comptées pour chaque produit.</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={printSheet} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.cardAlt, color: T.textMid, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  Imprimer la feuille
                </button>
              </div>
            </div>
            <div style={{ maxHeight: 440, overflowY: "auto", border: `1px solid ${T.border}`, borderRadius: 10 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ position: "sticky", top: 0, background: T.cardAlt, zIndex: 1 }}>
                  <tr>
                    {["Produit", "Stock système", "Stock compté", "Écart", "Notes"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.7, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(it => {
                    const diff = it.stock_counted !== null ? it.stock_counted - it.stock_system : null;
                    return (
                      <tr key={it.product_id} style={{ borderBottom: `1px solid ${T.border}`, background: diff !== null && diff !== 0 ? (diff > 0 ? T.blueBg + "33" : T.redBg + "33") : "transparent" }}>
                        <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>{it.product_name}</td>
                        <td style={{ padding: "10px 12px", fontSize: 14, fontWeight: 700, color: T.textMid }}>{it.stock_system}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <input type="number" min={0} value={it.stock_counted ?? ""} onChange={e => updateCounted(it.product_id, e.target.value === "" ? null : Number(e.target.value))}
                            style={{ ...inputStyle, width: 80, textAlign: "center", fontWeight: 700, fontSize: 14 }} />
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 14, fontWeight: 800, color: diff === null ? T.textLight : diff === 0 ? T.green : diff > 0 ? T.blue : T.red }}>
                          {diff === null ? "—" : diff === 0 ? "✓ 0" : (diff > 0 ? "+" : "") + diff}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <input value={it.notes} onChange={e => updateNotes(it.product_id, e.target.value)} style={{ ...inputStyle, fontSize: 12 }} placeholder="Notes (opt.)" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1px solid ${T.border}`, background: "transparent", color: T.textMid, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Retour</button>
              <button onClick={() => setStep(3)} disabled={filledItems.length === 0}
                style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none", background: filledItems.length > 0 ? T.main : "#e5e7eb", color: filledItems.length > 0 ? "#fff" : "#9ca3af", fontSize: 13, fontWeight: 700, cursor: filledItems.length > 0 ? "pointer" : "default", fontFamily: "inherit" }}>
                Voir le résumé ({filledItems.length}/{items.length} comptés)
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={{ background: T.cardAlt, borderRadius: 10, padding: 18, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Résumé des écarts</div>
              <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
                <div><div style={{ fontSize: 11, color: T.textMid }}>Produits comptés</div><div style={{ fontSize: 20, fontWeight: 800 }}>{filledItems.length} / {items.length}</div></div>
                <div><div style={{ fontSize: 11, color: T.textMid }}>Avec écart</div><div style={{ fontSize: 20, fontWeight: 800, color: discrepancyItems.length > 0 ? T.red : T.green }}>{discrepancyItems.length}</div></div>
                <div><div style={{ fontSize: 11, color: T.textMid }}>Valeur des écarts</div><div style={{ fontSize: 20, fontWeight: 800, color: totalDiscrepancyValue < 0 ? T.red : totalDiscrepancyValue > 0 ? T.blue : T.green }}>{fmt2(totalDiscrepancyValue)}</div></div>
              </div>
              {discrepancyItems.length > 0 && (
                <div style={{ maxHeight: 260, overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Produit", "Système", "Compté", "Écart", "Valeur écart"].map(h => (
                          <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.textMid, textTransform: "uppercase", borderBottom: `1px solid ${T.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {discrepancyItems.map(it => {
                        const diff = (it.stock_counted ?? 0) - it.stock_system;
                        const val = diff * it.cost_price;
                        return (
                          <tr key={it.product_id} style={{ borderBottom: `1px solid ${T.border}` }}>
                            <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 600 }}>{it.product_name}</td>
                            <td style={{ padding: "8px 10px", fontSize: 13 }}>{it.stock_system}</td>
                            <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 700 }}>{it.stock_counted}</td>
                            <td style={{ padding: "8px 10px", fontSize: 14, fontWeight: 800, color: diff > 0 ? T.blue : T.red }}>{diff > 0 ? "+" : ""}{diff}</td>
                            <td style={{ padding: "8px 10px", fontSize: 13, color: val < 0 ? T.red : T.blue }}>{fmt2(val)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {discrepancyItems.length === 0 && (
                <div style={{ textAlign: "center", padding: "12px 0", color: T.green, fontWeight: 700 }}>Aucun écart — stock système conforme au comptage physique.</div>
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1px solid ${T.border}`, background: "transparent", color: T.textMid, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Modifier</button>
              <button onClick={handleApply} disabled={saving}
                style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none", background: T.main, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {saving ? "Application…" : discrepancyItems.length > 0 ? `Appliquer ${discrepancyItems.length} ajustement(s)` : "Valider l'inventaire"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
