import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { logActivity } from "../../lib/activityLogger";
import { useAuth } from "../../contexts/AuthContext";
import { AdminProfile, PlatformTeam } from "./adminTypes";
import PermissionsAccordion from "./PermissionsAccordion";
import { T } from "../../theme";
const ROLE_LABELS: Record<string, string> = { god_admin: "God Admin", admin: "Admin", vendeur: "Vendeur", manuf: "Manuf", magasin: "Magasin" };
const iStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 14, color: T.text, outline: "none", boxSizing: "border-box", background: T.bgCard };

type Props = { target: AdminProfile; teams: PlatformTeam[]; onClose: () => void; onDone: () => void };

export default function EditUserPanel({ target, teams, onClose, onDone }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"info" | "security" | "permissions">("info");
  const [fullName, setFullName] = useState(target.full_name);
  const [phone, setPhone] = useState(target.phone || "");
  const [jobTitle, setJobTitle] = useState(target.job_title || "");
  const [role, setRole] = useState(target.role);
  const [teamId, setTeamId] = useState(target.team_id || "");
  const [newPw, setNewPw] = useState("");
  const [perms, setPerms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [vendeurCode, setVendeurCode] = useState(target.vendeur_code ?? "");
  const [commissionRate, setCommissionRate] = useState(
    String(((target.commission_rate ?? 0.05) * 100))
  );
  const [regionCode, setRegionCode] = useState(target.region_code ?? "");

  useEffect(() => {
    supabase.from("user_permissions").select("permission_key").eq("user_id", target.id).then(({ data }) => {
      setPerms((data ?? []).map((r) => r.permission_key));
      setLoading(false);
    });
  }, [target.id]);

  const saveInfo = async () => {
    setSaving(true);
    const updatePayload: Record<string, unknown> = {
      full_name: fullName,
      phone,
      job_title: jobTitle,
      role,
      team_id: teamId || null,
    };
    updatePayload.vendeur_code = vendeurCode || null;
    updatePayload.region_code = regionCode || null;
    if (role === "vendeur" || role === "admin") {
      updatePayload.commission_rate = parseFloat(commissionRate) / 100 || 0.05;
    }
    await supabase.from("profiles").update(updatePayload).eq("id", target.id);
    if (user) await logActivity(supabase, user.id, "user_updated", "admin", { target_id: target.id });
    setMsg("Sauvegardé");
    setSaving(false);
    setTimeout(() => setMsg(""), 2000);
    onDone();
  };

  const savePerms = async () => {
    setSaving(true);
    // Insert new permissions first, then delete old ones (safer than delete-then-insert)
    if (perms.length > 0) {
      const { error: insertErr } = await supabase.from("user_permissions")
        .upsert(perms.map((p) => ({ user_id: target.id, permission_key: p })), { onConflict: "user_id,permission_key" });
      if (insertErr) {
        setMsg("Erreur lors de la sauvegarde des permissions");
        setSaving(false);
        return;
      }
    }
    // Now delete permissions that are no longer in the list
    const { data: existing } = await supabase.from("user_permissions")
      .select("permission_key").eq("user_id", target.id);
    const toDelete = (existing ?? [])
      .map((r: { permission_key: string }) => r.permission_key)
      .filter((k: string) => !perms.includes(k));
    if (toDelete.length > 0) {
      await supabase.from("user_permissions")
        .delete()
        .eq("user_id", target.id)
        .in("permission_key", toDelete);
    }
    if (user) await logActivity(supabase, user.id, "user_permissions_updated", "admin", { target_id: target.id });
    setMsg("Permissions sauvegardées");
    setSaving(false);
    setTimeout(() => setMsg(""), 2000);
  };

  const savePassword = async () => {
    if (!newPw.trim()) return;
    setSaving(true);
    const sess = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.data.session?.access_token}` },
      body: JSON.stringify({ userId: target.id, newPassword: newPw }),
    });
    if (res.ok) { setMsg("Mot de passe mis à jour"); setNewPw(""); }
    else setMsg("Erreur");
    setSaving(false);
    setTimeout(() => setMsg(""), 2000);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: T.bgCard, borderRadius: 16, width: tab === "permissions" ? 680 : 480, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "20px 24px 0", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Modifier {target.full_name}</h2>
            <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer" }}><X size={18} /></button>
          </div>
          <div style={{ display: "flex", gap: 0 }}>
            {(["info", "security", "permissions"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 16px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: tab === t ? 600 : 400, color: tab === t ? T.main : T.mid, borderBottom: tab === t ? `2px solid ${T.main}` : "2px solid transparent" }}>
                {t === "info" ? "Informations" : t === "security" ? "Sécurité" : "Permissions"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {tab === "info" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: T.mid, display: "block", marginBottom: 4 }}>Nom complet</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} style={iStyle} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: T.mid, display: "block", marginBottom: 4 }}>Téléphone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} style={iStyle} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: T.mid, display: "block", marginBottom: 4 }}>Titre</label><input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} style={iStyle} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: T.mid, display: "block", marginBottom: 4 }}>Rôle</label>
                <select value={role} onChange={(e) => setRole(e.target.value as AdminProfile["role"])} style={iStyle}>{["god_admin", "admin", "vendeur", "manuf", "magasin"].map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>
              </div>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: T.mid, display: "block", marginBottom: 4 }}>Équipe</label>
                <select value={teamId} onChange={(e) => setTeamId(e.target.value)} style={iStyle}><option value="">— Aucune —</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.mid, display: "block", marginBottom: 4 }}>Code utilisateur</label>
                <input
                  value={vendeurCode}
                  onChange={(e) => setVendeurCode(e.target.value.toUpperCase())}
                  placeholder="ex: AC.QCM.213"
                  style={iStyle}
                />
                <div style={{ fontSize: 11, color: T.textLight, marginTop: 3 }}>
                  Format: INITIALES.PROVINCE+VILLE.NUMÉRO (ex: AC.QCM.213)
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.mid, display: "block", marginBottom: 4 }}>Code zone</label>
                <input
                  value={regionCode}
                  onChange={(e) => setRegionCode(e.target.value.toUpperCase())}
                  placeholder="ex: QCM, ONT, FLM…"
                  style={{ ...iStyle, width: 120 }}
                  maxLength={3}
                />
              </div>
              {(role === "vendeur" || role === "admin") && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.mid, display: "block", marginBottom: 4 }}>Taux commission (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    style={{ ...iStyle, width: 120 }}
                  />
                  <div style={{ fontSize: 11, color: T.textLight, marginTop: 3 }}>
                    {parseFloat(commissionRate) > 0
                      ? `→ ${(parseFloat(commissionRate) / 100).toFixed(3)} (${commissionRate}%)`
                      : "Entrez un pourcentage entre 0 et 100"}
                  </div>
                </div>
              )}
            </div>
          )}
          {tab === "security" && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.mid, display: "block", marginBottom: 6 }}>Nouveau mot de passe</label>
              <div style={{ display: "flex", gap: 10 }}>
                <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} style={{ ...iStyle, flex: 1 }} placeholder="Nouveau mot de passe" />
                <button onClick={savePassword} disabled={!newPw || saving} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: T.main, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Changer</button>
              </div>
            </div>
          )}
          {tab === "permissions" && !loading && <PermissionsAccordion selected={perms} onChange={setPerms} />}
          {msg && <p style={{ fontSize: 12, color: T.green, marginTop: 10 }}>{msg}</p>}
        </div>

        <div style={{ padding: "12px 24px 20px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, fontSize: 14, cursor: "pointer" }}>Annuler</button>
          <button
            onClick={tab === "permissions" ? savePerms : tab === "info" ? saveInfo : undefined}
            disabled={saving || tab === "security"}
            style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: saving || tab === "security" ? "#9ca3af" : T.main, color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving || tab === "security" ? "not-allowed" : "pointer" }}
          >
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  );
}
