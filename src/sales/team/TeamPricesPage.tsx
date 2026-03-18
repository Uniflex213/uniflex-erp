import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { T } from "../../theme";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2 }).format(n);

const ALL_FORMATS = ["Common (3gal/2gal)", "Large (15GAL/10GAL)", "BARREL KIT", "TOTE KIT", "SPECIAL"];
const PRICE_UNITS = ["/KIT", "/GAL", "/UN"];

interface TeamPriceItem {
  id: string;
  team_id: string;
  product_id: string | null;
  product_name: string;
  sku: string;
  format: string;
  unit_price: number;
  price_unit: string;
  is_active: boolean;
  sort_order: number;
}

interface SaleProduct {
  id: string;
  name: string;
  sku: string;
  is_active: boolean;
  formats: string[];
}

type FormState = Omit<TeamPriceItem, "id" | "team_id">;

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  border: `1px solid ${T.border}`,
  borderRadius: 7,
  fontSize: 13,
  fontFamily: "inherit",
  color: T.text,
  background: T.bgCard,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

function emptyForm(): FormState {
  return {
    product_id: null,
    product_name: "",
    sku: "",
    format: "",
    unit_price: 0,
    price_unit: "/KIT",
    is_active: true,
    sort_order: 0,
  };
}

export default function TeamPricesPage() {
  const { profile } = useAuth();
  const teamId = profile?.team_id ?? null;

  const [items, setItems] = useState<TeamPriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<TeamPriceItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!teamId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("team_prices")
      .select("id, team_id, product_id, product_name, sku, format, unit_price, price_unit, is_active, sort_order")
      .eq("team_id", teamId)
      .order("sort_order")
      .order("product_name");
    setItems((data || []) as TeamPriceItem[]);
    setLoading(false);
  }, [teamId]);

  useEffect(() => { load(); }, [load]);

  const handleSync = useCallback(async () => {
    if (!teamId) return;
    setSyncing(true);
    setSyncMsg(null);
    try {
      const { data: products } = await supabase
        .from("sale_products")
        .select("id, name, sku, is_active, formats")
        .eq("is_active", true);

      const saleProducts = (products || []) as SaleProduct[];
      const existingProductIds = new Set(items.map(i => i.product_id).filter(Boolean));

      const toInsert: Omit<TeamPriceItem, "id">[] = [];
      for (const p of saleProducts) {
        if (!existingProductIds.has(p.id)) {
          const formats: string[] = p.formats && p.formats.length > 0 ? p.formats : [""];
          for (const fmt_str of formats) {
            toInsert.push({
              team_id: teamId,
              product_id: p.id,
              product_name: p.name,
              sku: p.sku || "",
              format: fmt_str,
              unit_price: 0,
              price_unit: "/KIT",
              is_active: true,
              sort_order: 0,
            });
          }
        }
      }

      if (toInsert.length === 0) {
        setSyncMsg("Tous les produits actifs sont déjà synchronisés.");
      } else {
        await supabase.from("team_prices").insert(toInsert);
        setSyncMsg(`${toInsert.length} produit(s) ajouté(s) avec succès.`);
        load();
      }
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 4000);
    }
  }, [teamId, items, load]);

  function openCreate() {
    setEditItem(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(item: TeamPriceItem) {
    setEditItem(item);
    setForm({
      product_id: item.product_id,
      product_name: item.product_name,
      sku: item.sku,
      format: item.format,
      unit_price: item.unit_price,
      price_unit: item.price_unit,
      is_active: item.is_active,
      sort_order: item.sort_order,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.product_name.trim() || !teamId) return;
    setSaving(true);
    if (editItem) {
      const { data } = await supabase
        .from("team_prices")
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq("id", editItem.id)
        .select()
        .maybeSingle();
      if (data) setItems(prev => prev.map(x => x.id === editItem.id ? data as TeamPriceItem : x));
    } else {
      const { data } = await supabase
        .from("team_prices")
        .insert({ ...form, team_id: teamId })
        .select()
        .maybeSingle();
      if (data) setItems(prev => [...prev, data as TeamPriceItem]);
    }
    setSaving(false);
    setShowForm(false);
  }

  async function handleToggleActive(item: TeamPriceItem) {
    const newVal = !item.is_active;
    await supabase.from("team_prices").update({ is_active: newVal }).eq("id", item.id);
    setItems(prev => prev.map(x => x.id === item.id ? { ...x, is_active: newVal } : x));
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await supabase.from("team_prices").delete().eq("id", id);
    setItems(prev => prev.filter(x => x.id !== id));
    setDeletingId(null);
  }

  const filtered = items.filter(
    i => i.product_name.toLowerCase().includes(search.toLowerCase()) ||
         (i.sku || "").toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = items.filter(i => i.is_active).length;

  if (!teamId) {
    return (
      <div style={{ padding: "24px 28px", background: T.bg, minHeight: "100%", fontFamily: "Inter, system-ui, sans-serif" }}>
        <div style={{ color: T.textMid, fontSize: 14 }}>Vous n'êtes pas assigné à une équipe.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 28px", background: T.bg, minHeight: "100%", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: 0 }}>Team Prices</h1>
            <span style={{
              background: T.greenBg, color: T.green,
              padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
            }}>
              Prix équipe actifs
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: T.textMid }}>Catalogue de prix spécifique à votre équipe</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {syncMsg && (
            <span style={{ fontSize: 12, color: T.green, fontWeight: 600 }}>{syncMsg}</span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              background: T.bgCard, color: T.textMid,
              border: `1px solid ${T.border}`, borderRadius: 8,
              padding: "9px 16px", cursor: syncing ? "default" : "pointer",
              fontSize: 13, fontWeight: 700, fontFamily: "inherit",
              opacity: syncing ? 0.6 : 1,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {syncing ? "Synchronisation..." : "Synchroniser depuis Produits"}
          </button>
          <button
            onClick={openCreate}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              background: T.main, color: "#fff", border: "none", borderRadius: 8,
              padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nouveau prix
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { label: "Produits total", value: items.length, color: T.main, bg: `${T.main}15` },
          { label: "Actifs", value: activeCount, color: T.green, bg: T.greenBg },
          { label: "Inactifs", value: items.length - activeCount, color: T.orange, bg: T.orangeBg },
        ].map(s => (
          <div key={s.label} style={{ flex: "1 1 180px", background: T.bgCard, borderRadius: 12, padding: "16px 20px", border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: T.textMid }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: T.bgCard, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.bg, borderRadius: 8, padding: "8px 14px", flex: 1, maxWidth: 380 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.textLight} strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou SKU..."
              style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, width: "100%", fontFamily: "inherit", color: T.text }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: T.textMid }}>Chargement...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: T.textMid }}>
            {items.length === 0
              ? "Aucun prix d'équipe. Cliquez sur « Synchroniser depuis Produits » ou « Nouveau prix »."
              : "Aucun résultat."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: T.bg }}>
                  {["Produit", "SKU", "Format", "Prix unitaire", "Unité", "Statut", ""].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 10, fontWeight: 800, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} style={{ borderTop: `1px solid ${T.border}` }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{item.product_name}</div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {item.sku ? (
                        <span style={{ background: `${T.main}15`, color: T.main, padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>{item.sku}</span>
                      ) : <span style={{ color: T.textLight, fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {item.format ? (
                        <span style={{ background: T.bgCard2, padding: "2px 7px", borderRadius: 4, fontSize: 11, color: T.textMid }}>{item.format}</span>
                      ) : <span style={{ color: T.textLight, fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: item.unit_price > 0 ? T.text : T.orange }}>
                        {item.unit_price > 0 ? fmt(item.unit_price) : "Non défini"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: T.textMid }}>{item.price_unit}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <button
                        onClick={() => handleToggleActive(item)}
                        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: 0 }}
                      >
                        <svg width="22" height="22" viewBox="0 0 40 24" fill="none">
                          <rect x="0.5" y="0.5" width="39" height="23" rx="11.5" fill={item.is_active ? T.green : T.textLight} stroke="none" />
                          <circle cx={item.is_active ? "28" : "12"} cy="12" r="8" fill="#fff" />
                        </svg>
                        <span style={{ fontSize: 12, fontWeight: 600, color: item.is_active ? T.green : T.textLight }}>
                          {item.is_active ? "Actif" : "Inactif"}
                        </span>
                      </button>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => openEdit(item)}
                          style={{ background: T.bgCard2, color: T.textMid, border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          style={{ background: T.redBg, color: T.red, border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, opacity: deletingId === item.id ? 0.5 : 1 }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(230,228,224,0.35)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: T.bgCard, borderRadius: 16, width: "100%", maxWidth: 520, boxShadow: "0 24px 64px rgba(0,0,0,0.3)", fontFamily: "Inter, system-ui, sans-serif" }}>
            <div style={{ padding: "18px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text }}>
                {editItem ? "Modifier le prix" : "Nouveau prix d'équipe"}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMid, padding: 4 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>
                    Nom du produit <span style={{ color: T.red }}>*</span>
                  </label>
                  <input style={inputStyle} value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} placeholder="Ex: Revêtement Toiture..." />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>SKU</label>
                  <input style={inputStyle} value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="Ex: SKU-001" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Ordre d'affichage</label>
                  <input type="number" style={inputStyle} value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} min={0} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Prix unitaire ($)</label>
                  <input type="number" step="0.01" min="0" style={inputStyle} value={form.unit_price || ""} onChange={e => setForm(f => ({ ...f, unit_price: Number(e.target.value) }))} placeholder="0.00" />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Unité</label>
                  <select style={inputStyle} value={form.price_unit} onChange={e => setForm(f => ({ ...f, price_unit: e.target.value }))}>
                    {PRICE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>Format</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {ALL_FORMATS.map(f => {
                    const active = form.format === f;
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, format: active ? "" : f }))}
                        style={{
                          background: active ? `${T.main}20` : T.bg,
                          color: active ? T.main : T.textMid,
                          border: active ? `1.5px solid ${T.main}60` : `1.5px solid ${T.border}`,
                          borderRadius: 7, padding: "5px 12px",
                          cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                        }}
                      >
                        {f}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 8 }}
                >
                  <svg width="26" height="26" viewBox="0 0 40 24" fill="none">
                    <rect x="0.5" y="0.5" width="39" height="23" rx="11.5" fill={form.is_active ? T.green : T.textLight} />
                    <circle cx={form.is_active ? "28" : "12"} cy="12" r="8" fill="#fff" />
                  </svg>
                  <span style={{ fontSize: 13, fontWeight: 600, color: form.is_active ? T.green : T.textMid }}>
                    {form.is_active ? "Actif" : "Inactif"}
                  </span>
                </button>
              </div>
            </div>
            <div style={{ padding: "14px 24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setShowForm(false)}
                style={{ background: T.bg, color: T.textMid, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={!form.product_name.trim() || saving}
                style={{
                  background: form.product_name.trim() ? T.main : T.textLight,
                  color: "#fff", border: "none", borderRadius: 8,
                  padding: "9px 22px", fontSize: 13, fontWeight: 700,
                  cursor: form.product_name.trim() ? "pointer" : "default",
                  fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                {saving ? "Sauvegarde..." : editItem ? "Sauvegarder" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
