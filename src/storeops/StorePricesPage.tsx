import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import {
  Search, Save, DollarSign, Package, AlertCircle, Check,
  Pencil, Plus, Trash2, X, ToggleLeft, ToggleRight,
} from "lucide-react";
import { T } from "../theme";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2 }).format(n);

const ALL_FORMATS = ["Common (3gal/2gal)", "Large (15GAL/10GAL)", "BARREL KIT", "TOTE KIT", "SPECIAL"];
const PRICE_UNITS = ["/KIT", "/GAL"];

interface StoreItem {
  id: string;
  name: string;
  sku: string;
  formats: string[];
  unit_price: number;
  price_unit: string;
  is_active: boolean;
  sort_order: number;
}

interface SaleProduct {
  id: string;
  name: string;
  sku: string;
  cost_price: number;
  is_active: boolean;
  formats: string[];
}

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

function emptyItem(): Omit<StoreItem, "id"> {
  return { name: "", sku: "", formats: [], unit_price: 0, price_unit: "/KIT", is_active: true, sort_order: 0 };
}

export default function StorePricesPage() {
  const [tab, setTab] = useState<"catalogue" | "coutants">("catalogue");

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: T.text, margin: "0 0 4px" }}>Store Prices</h1>
        <p style={{ margin: 0, fontSize: 14, color: T.textMid }}>
          Gerez le catalogue de produits du magasin et les prix coutants
        </p>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: `2px solid ${T.border}`, paddingBottom: 0 }}>
        {([
          { key: "catalogue", label: "Catalogue Magasin" },
          { key: "coutants", label: "Prix Coutants" },
        ] as { key: "catalogue" | "coutants"; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: "none",
              border: "none",
              borderBottom: tab === t.key ? `2px solid ${T.main}` : "2px solid transparent",
              marginBottom: -2,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? T.main : T.textMid,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "catalogue" ? <CatalogueTab /> : <CoutantsTab />}
    </div>
  );
}

function CatalogueTab() {
  const { profile, storeCode } = useAuth();
  const isMagasin = profile?.role === "magasin";
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<StoreItem | null>(null);
  const [form, setForm] = useState(emptyItem());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("store_price_items")
      .select("id, name, sku, formats, unit_price, price_unit, is_active, sort_order")
      .order("sort_order")
      .order("name");
    if (isMagasin && storeCode) query = query.eq("store_code", storeCode);
    const { data } = await query;
    setItems((data || []) as StoreItem[]);
    setLoading(false);
  }, [isMagasin, storeCode]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditItem(null);
    setForm(emptyItem());
    setShowForm(true);
  }

  function openEdit(item: StoreItem) {
    setEditItem(item);
    setForm({ name: item.name, sku: item.sku, formats: item.formats, unit_price: item.unit_price, price_unit: item.price_unit, is_active: item.is_active, sort_order: item.sort_order });
    setShowForm(true);
  }

  function toggleFormat(f: string) {
    setForm(prev => ({
      ...prev,
      formats: prev.formats.includes(f) ? prev.formats.filter(x => x !== f) : [...prev.formats, f],
    }));
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editItem) {
      const { data } = await supabase
        .from("store_price_items")
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq("id", editItem.id)
        .select()
        .maybeSingle();
      if (data) setItems(prev => prev.map(x => x.id === editItem.id ? data as StoreItem : x));
    } else {
      const { data } = await supabase
        .from("store_price_items")
        .insert({ ...form, owner_id: profile?.id, store_code: storeCode ?? "BSB" })
        .select()
        .maybeSingle();
      if (data) setItems(prev => [...prev, data as StoreItem]);
    }
    setSaving(false);
    setShowForm(false);
  }

  async function handleToggleActive(item: StoreItem) {
    const newVal = !item.is_active;
    await supabase.from("store_price_items").update({ is_active: newVal }).eq("id", item.id);
    setItems(prev => prev.map(x => x.id === item.id ? { ...x, is_active: newVal } : x));
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await supabase.from("store_price_items").delete().eq("id", id);
    setItems(prev => prev.filter(x => x.id !== id));
    setDeletingId(null);
  }

  const filtered = items.filter(
    i => i.name.toLowerCase().includes(search.toLowerCase()) ||
         (i.sku || "").toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = items.filter(i => i.is_active).length;

  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { icon: <Package size={20} />, count: items.length, label: "Produits total", color: T.main, bg: `${T.main}10` },
          { icon: <Check size={20} />, count: activeCount, label: "Actifs", color: T.green, bg: T.greenBg },
          { icon: <AlertCircle size={20} />, count: items.length - activeCount, label: "Inactifs", color: T.orange, bg: T.orangeBg },
        ].map(s => (
          <div key={s.label} style={{ flex: "1 1 180px", background: T.card, borderRadius: 12, padding: "18px 20px", border: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", color: s.color }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.count}</div>
                <div style={{ fontSize: 12, color: T.textMid }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.cardAlt, borderRadius: 8, padding: "8px 14px", flex: 1, maxWidth: 380 }}>
            <Search size={16} color={T.textLight} />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou SKU..."
              style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, width: "100%", fontFamily: "inherit" }}
            />
          </div>
          <button
            onClick={openCreate}
            style={{ display: "flex", alignItems: "center", gap: 7, background: T.main, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}
          >
            <Plus size={15} />
            Nouveau produit
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: T.textMid }}>Chargement...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: T.textMid }}>
            {items.length === 0 ? "Aucun produit. Cliquez sur « Nouveau produit » pour commencer." : "Aucun produit correspondant"}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: T.cardAlt }}>
                  {["Produit", "SKU", "Formats", "Prix de vente", "Unité", "Statut", ""].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "11px 16px", fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${T.border}` }}
                    onMouseOver={e => (e.currentTarget.style.background = "#fafbfc")}
                    onMouseOut={e => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{item.name}</div>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      {item.sku ? (
                        <span style={{ background: `${T.main}10`, color: T.main, padding: "3px 8px", borderRadius: 5, fontSize: 12, fontWeight: 600, fontFamily: "monospace" }}>{item.sku}</span>
                      ) : <span style={{ color: T.textLight, fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {(item.formats || []).slice(0, 2).map(f => (
                          <span key={f} style={{ background: T.cardAlt, padding: "2px 7px", borderRadius: 4, fontSize: 11, color: T.textMid }}>{f}</span>
                        ))}
                        {(item.formats || []).length > 2 && <span style={{ fontSize: 11, color: T.textLight }}>+{item.formats.length - 2}</span>}
                        {(item.formats || []).length === 0 && <span style={{ color: T.textLight, fontSize: 12 }}>—</span>}
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: item.unit_price > 0 ? T.text : T.orange }}>
                        {item.unit_price > 0 ? fmt(item.unit_price) : "Non défini"}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ fontSize: 12, color: T.textMid }}>{item.price_unit}</span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <button
                        onClick={() => handleToggleActive(item)}
                        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: 0 }}
                        title={item.is_active ? "Désactiver" : "Activer"}
                      >
                        {item.is_active
                          ? <ToggleRight size={22} color={T.green} />
                          : <ToggleLeft size={22} color={T.textLight} />}
                        <span style={{ fontSize: 12, fontWeight: 600, color: item.is_active ? T.green : T.textLight }}>
                          {item.is_active ? "Actif" : "Inactif"}
                        </span>
                      </button>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => openEdit(item)}
                          style={{ background: T.cardAlt, color: T.textMid, border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                          <Pencil size={12} /> Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          style={{ background: T.redBg, color: T.red, border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, opacity: deletingId === item.id ? 0.5 : 1 }}>
                          <Trash2 size={12} />
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: T.card, borderRadius: 16, width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", fontFamily: "inherit" }}>
            <div style={{ padding: "18px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: T.text }}>
                {editItem ? "Modifier le produit" : "Nouveau produit magasin"}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMid, padding: 4 }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>
                    Nom du produit <span style={{ color: T.red }}>*</span>
                  </label>
                  <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Revêtement Toiture..." />
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
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Prix de vente par défaut ($)</label>
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
                <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>Formats disponibles</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {ALL_FORMATS.map(f => {
                    const active = form.formats.includes(f);
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => toggleFormat(f)}
                        style={{
                          background: active ? `${T.main}15` : T.cardAlt,
                          color: active ? T.main : T.textMid,
                          border: active ? `1.5px solid ${T.main}40` : `1.5px solid ${T.border}`,
                          borderRadius: 7,
                          padding: "5px 12px",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: "inherit",
                          transition: "all 0.12s",
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
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 7 }}
                >
                  {form.is_active ? <ToggleRight size={24} color={T.green} /> : <ToggleLeft size={24} color={T.textLight} />}
                  <span style={{ fontSize: 13, fontWeight: 600, color: form.is_active ? T.green : T.textMid }}>
                    {form.is_active ? "Actif — visible dans les pickup tickets" : "Inactif — masqué dans les pickup tickets"}
                  </span>
                </button>
              </div>
            </div>
            <div style={{ padding: "14px 24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setShowForm(false)}
                style={{ background: T.cardAlt, color: T.textMid, border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Annuler
              </button>
              <button onClick={handleSave} disabled={!form.name.trim() || saving}
                style={{ background: form.name.trim() ? T.main : "#d1d5db", color: form.name.trim() ? "#fff" : "#9ca3af", border: "none", borderRadius: 8, padding: "9px 22px", fontSize: 13, fontWeight: 700, cursor: form.name.trim() ? "pointer" : "default", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7 }}>
                <Save size={14} />
                {saving ? "Sauvegarde..." : editItem ? "Sauvegarder" : "Créer le produit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CoutantsTab() {
  const [products, setProducts] = useState<SaleProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sale_products")
      .select("id, name, sku, cost_price, is_active, formats")
      .order("name");
    setProducts((data || []) as SaleProduct[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleEdit = (p: SaleProduct) => {
    setEditingId(p.id);
    setEditValue(p.cost_price?.toString() ?? "0");
  };

  const handleSave = async (p: SaleProduct) => {
    const newPrice = parseFloat(editValue) || 0;
    if (newPrice === p.cost_price) { setEditingId(null); return; }
    setSaving(true);
    await supabase.from("sale_products").update({ cost_price: newPrice }).eq("id", p.id);
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, cost_price: newPrice } : x));
    setEditingId(null);
    setSaving(false);
    setSavedId(p.id);
    setTimeout(() => setSavedId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent, p: SaleProduct) => {
    if (e.key === "Enter") handleSave(p);
    if (e.key === "Escape") setEditingId(null);
  };

  const filtered = products.filter(
    p => p.name.toLowerCase().includes(search.toLowerCase()) ||
         (p.sku || "").toLowerCase().includes(search.toLowerCase())
  );

  const withCost = products.filter(p => p.cost_price > 0).length;
  const withoutCost = products.length - withCost;

  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { icon: <Package size={20} />, value: products.length, label: "Produits total", color: T.main, bg: `${T.main}10` },
          { icon: <DollarSign size={20} />, value: withCost, label: "Avec prix coutant", color: T.green, bg: T.greenBg },
          { icon: <AlertCircle size={20} />, value: withoutCost, label: "Sans prix coutant", color: withoutCost > 0 ? T.orange : T.green, bg: withoutCost > 0 ? T.orangeBg : T.greenBg },
        ].map(s => (
          <div key={s.label} style={{ flex: "1 1 180px", background: T.card, borderRadius: 12, padding: "18px 20px", border: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", color: s.color }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: T.textMid }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.cardAlt, borderRadius: 8, padding: "8px 14px", flex: 1, maxWidth: 400 }}>
            <Search size={16} color={T.textLight} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou SKU..."
              style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, width: "100%", fontFamily: "inherit" }} />
          </div>
          {withoutCost > 0 && (
            <button
              onClick={() => { setSearch(""); const first = products.find(p => !p.cost_price || p.cost_price <= 0); if (first) { setEditingId(first.id); setEditValue(""); } }}
              style={{ display: "flex", alignItems: "center", gap: 7, background: T.main, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit", whiteSpace: "nowrap" }}
            >
              <Plus size={15} />
              Ajouter un prix ({withoutCost})
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: T.textMid }}>Chargement des produits...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: T.textMid }}>Aucun produit trouvé</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: T.cardAlt }}>
                  {[
                    { label: "Produit", align: "left" as const, w: undefined },
                    { label: "SKU", align: "left" as const, w: undefined },
                    { label: "Formats", align: "left" as const, w: undefined },
                    { label: "Statut", align: "left" as const, w: undefined },
                    { label: "Prix coutant", align: "right" as const, w: 200 },
                  ].map(h => (
                    <th key={h.label} style={{ textAlign: h.align, padding: "12px 16px", fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, minWidth: h.w }}>
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${T.border}` }}
                    onMouseOver={e => (e.currentTarget.style.background = "#fafbfc")}
                    onMouseOut={e => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{p.name}</div>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      {p.sku ? (
                        <span style={{ background: `${T.main}10`, color: T.main, padding: "3px 8px", borderRadius: 5, fontSize: 12, fontWeight: 600, fontFamily: "monospace" }}>{p.sku}</span>
                      ) : <span style={{ color: T.textLight, fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {(p.formats || []).slice(0, 2).map(f => (
                          <span key={f} style={{ background: T.cardAlt, padding: "2px 7px", borderRadius: 4, fontSize: 11, color: T.textMid }}>{f}</span>
                        ))}
                        {(p.formats || []).length > 2 && <span style={{ fontSize: 11, color: T.textLight }}>+{p.formats.length - 2}</span>}
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ background: p.is_active ? T.greenBg : T.cardAlt, color: p.is_active ? T.green : T.textMid, padding: "3px 9px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                        {p.is_active ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px", textAlign: "right" }}>
                      {editingId === p.id ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                          <span style={{ color: T.textMid, fontSize: 14 }}>$</span>
                          <input type="number" step="0.01" min="0" value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => handleKeyDown(e, p)}
                            autoFocus
                            style={{ width: 100, padding: "6px 10px", border: `2px solid ${T.main}`, borderRadius: 6, fontSize: 14, fontWeight: 600, textAlign: "right", fontFamily: "inherit", outline: "none" }}
                          />
                          <button onClick={() => handleSave(p)} disabled={saving}
                            style={{ background: T.main, color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600 }}>
                            <Save size={14} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: p.cost_price > 0 ? T.text : T.orange }}>
                            {p.cost_price > 0 ? fmt(p.cost_price) : "Non défini"}
                          </span>
                          {savedId === p.id && <Check size={16} color={T.green} />}
                          <button onClick={() => handleEdit(p)}
                            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: p.cost_price > 0 ? T.cardAlt : T.main, color: p.cost_price > 0 ? T.textMid : "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s" }}>
                            <Pencil size={12} />
                            {p.cost_price > 0 ? "Modifier" : "Ajouter"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: 20, padding: "14px 18px", background: T.orangeBg, borderRadius: 10, display: "flex", alignItems: "flex-start", gap: 12 }}>
        <AlertCircle size={18} color={T.orange} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 12, color: T.textMid, lineHeight: 1.5 }}>
          Les prix coutants définis ici sont utilisés pour calculer le bénéfice dans le menu <strong>Bénéfice Magasin</strong>. Ces produits (menu Ventes) sont indépendants du catalogue magasin ci-dessus.
        </div>
      </div>
    </div>
  );
}
