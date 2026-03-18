import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { T } from "../../theme";

interface Store {
  id: string;
  store_code: string;
  store_name: string;
  store_address: string | null;
  store_city: string | null;
  store_province: string;
  store_phone: string | null;
  store_email: string | null;
  is_active: boolean;
  created_at: string;
  user_count?: number;
}

const inputStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: `1px solid ${T.border}`,
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  background: T.bgInput,
  color: T.text,
};

export default function StoresManagementPage() {
  const { can } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editStore, setEditStore] = useState<Store | null>(null);

  // Create form
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newProvince, setNewProvince] = useState("QC");
  const [newAddress, setNewAddress] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadStores = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("stores")
      .select("*")
      .order("created_at", { ascending: true });

    if (data) {
      // Get user counts per store
      const { data: profiles } = await supabase
        .from("profiles")
        .select("store_code")
        .not("store_code", "is", null);

      const counts: Record<string, number> = {};
      (profiles ?? []).forEach((p: { store_code: string }) => {
        counts[p.store_code] = (counts[p.store_code] || 0) + 1;
      });

      setStores(data.map((s: Store) => ({ ...s, user_count: counts[s.store_code] || 0 })));
    }
    setLoading(false);
  };

  useEffect(() => { loadStores(); }, []);

  const handleCreate = async () => {
    if (!newCode.trim() || !newName.trim()) {
      setFormError("Code et nom sont requis.");
      return;
    }
    setSaving(true);
    setFormError("");

    const { error } = await supabase.from("stores").insert({
      store_code: newCode.toUpperCase().trim(),
      store_name: newName.trim(),
      store_city: newCity.trim() || null,
      store_province: newProvince,
      store_address: newAddress.trim() || null,
      store_phone: newPhone.trim() || null,
      store_email: newEmail.trim() || null,
    });

    if (error) {
      setFormError(error.message.includes("duplicate") ? "Ce code magasin existe déjà." : error.message);
      setSaving(false);
      return;
    }

    setShowCreate(false);
    resetForm();
    setSaving(false);
    loadStores();
  };

  const handleUpdate = async () => {
    if (!editStore) return;
    setSaving(true);
    setFormError("");

    const { error } = await supabase
      .from("stores")
      .update({
        store_name: newName.trim(),
        store_city: newCity.trim() || null,
        store_province: newProvince,
        store_address: newAddress.trim() || null,
        store_phone: newPhone.trim() || null,
        store_email: newEmail.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editStore.id);

    if (error) {
      setFormError(error.message);
      setSaving(false);
      return;
    }

    setEditStore(null);
    resetForm();
    setSaving(false);
    loadStores();
  };

  const handleToggleActive = async (store: Store) => {
    await supabase
      .from("stores")
      .update({ is_active: !store.is_active, updated_at: new Date().toISOString() })
      .eq("id", store.id);
    loadStores();
  };

  const resetForm = () => {
    setNewCode("");
    setNewName("");
    setNewCity("");
    setNewProvince("QC");
    setNewAddress("");
    setNewPhone("");
    setNewEmail("");
    setFormError("");
  };

  const openEdit = (store: Store) => {
    setEditStore(store);
    setNewCode(store.store_code);
    setNewName(store.store_name);
    setNewCity(store.store_city ?? "");
    setNewProvince(store.store_province);
    setNewAddress(store.store_address ?? "");
    setNewPhone(store.store_phone ?? "");
    setNewEmail(store.store_email ?? "");
    setFormError("");
  };

  const isFormOpen = showCreate || editStore !== null;

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: T.text, fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "0.05em" }}>
            Gestion des Magasins
          </h1>
          <p style={{ color: T.textMid, fontSize: 12, marginTop: 4 }}>
            {stores.length} magasin{stores.length !== 1 ? "s" : ""} enregistré{stores.length !== 1 ? "s" : ""}
          </p>
        </div>
        {can("admin.stores.create") && (
          <button
            onClick={() => { resetForm(); setShowCreate(true); }}
            style={{
              padding: "10px 20px",
              background: T.main,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "inherit",
              letterSpacing: "0.06em",
              cursor: "pointer",
            }}
          >
            + Nouveau magasin
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: T.textLight, padding: 60, fontSize: 13 }}>Chargement...</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {stores.map((store) => (
            <div
              key={store.id}
              style={{
                background: T.bgCard,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: "18px 22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                opacity: store.is_active ? 1 : 0.5,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: store.is_active ? `${T.main}22` : `${T.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 800, color: store.is_active ? T.main : T.textLight,
                  letterSpacing: "0.06em",
                }}>
                  {store.store_code}
                </div>
                <div>
                  <div style={{ color: T.text, fontSize: 14, fontWeight: 700 }}>{store.store_name}</div>
                  <div style={{ color: T.textMid, fontSize: 11, marginTop: 2 }}>
                    {store.store_city ?? "—"}, {store.store_province}
                    {store.user_count ? ` · ${store.user_count} utilisateur${store.user_count > 1 ? "s" : ""}` : ""}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 6,
                  background: store.is_active ? "#d1f5db" : "#ffe5e3",
                  color: store.is_active ? "#16a34a" : "#dc2626",
                  letterSpacing: "0.06em",
                }}>
                  {store.is_active ? "ACTIF" : "INACTIF"}
                </span>
                {can("admin.stores.edit") && (
                  <button
                    onClick={() => openEdit(store)}
                    style={{
                      padding: "6px 14px", background: T.bgHover, color: T.text,
                      border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11,
                      fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
                    }}
                  >
                    Modifier
                  </button>
                )}
                {can("admin.stores.deactivate") && (
                  <button
                    onClick={() => handleToggleActive(store)}
                    style={{
                      padding: "6px 14px",
                      background: store.is_active ? "#ffe5e3" : "#d1f5db",
                      color: store.is_active ? "#dc2626" : "#16a34a",
                      border: "none", borderRadius: 6, fontSize: 11,
                      fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
                    }}
                  >
                    {store.is_active ? "Désactiver" : "Réactiver"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isFormOpen && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
        }}>
          <div style={{
            background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16,
            padding: 32, width: 440, maxWidth: "90vw", maxHeight: "80vh", overflowY: "auto",
          }}>
            <h3 style={{ color: T.text, fontSize: 16, fontWeight: 800, marginBottom: 20, letterSpacing: "0.04em" }}>
              {editStore ? "Modifier le magasin" : "Nouveau magasin"}
            </h3>

            <div style={{ display: "grid", gap: 14 }}>
              {!editStore && (
                <div>
                  <label style={{ color: T.textMid, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>
                    Code magasin *
                  </label>
                  <input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="ex: MTL01"
                    style={inputStyle}
                  />
                </div>
              )}
              <div>
                <label style={{ color: T.textMid, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>
                  Nom *
                </label>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="ex: Montréal Centre" style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ color: T.textMid, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Ville</label>
                  <input value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="Montréal" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: T.textMid, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Province</label>
                  <input value={newProvince} onChange={(e) => setNewProvince(e.target.value)} placeholder="QC" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ color: T.textMid, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Adresse</label>
                <input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="123 Rue Exemple" style={inputStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ color: T.textMid, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Téléphone</label>
                  <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="450-123-4567" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: T.textMid, fontSize: 11, fontWeight: 700, display: "block", marginBottom: 4 }}>Email</label>
                  <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="store@uniflex.ca" style={inputStyle} />
                </div>
              </div>
            </div>

            {formError && (
              <p style={{ color: T.red, fontSize: 11, fontWeight: 600, marginTop: 12 }}>{formError}</p>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setShowCreate(false); setEditStore(null); resetForm(); }}
                style={{
                  padding: "10px 20px", background: "transparent", color: T.textMid,
                  border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12,
                  fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
                }}
              >
                Annuler
              </button>
              <button
                onClick={editStore ? handleUpdate : handleCreate}
                disabled={saving}
                style={{
                  padding: "10px 24px", background: T.main, color: "#fff",
                  border: "none", borderRadius: 8, fontSize: 12,
                  fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Enregistrement..." : editStore ? "Enregistrer" : "Créer le magasin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
