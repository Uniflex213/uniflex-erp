import React, { useState, useEffect } from "react";
import { Search, Play, Shield, User } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { useSimulation } from "../../contexts/SimulationContext";
import { AdminProfile } from "./adminTypes";
import { Profile } from "../../contexts/AuthContext";
import AdminUserStats from "./AdminUserStats";
import { T } from "../../theme";
import { useLanguage } from "../../i18n/LanguageContext";

const ROLE_LABELS: Record<string, string> = {
  god_admin: "God Admin", admin: "Admin", vendeur: "Vendeur",
  manuf: "Manuf", magasin: "Magasin",
};
const ROLE_COLORS: Record<string, string> = {
  god_admin: "#dc2626", admin: "#111", vendeur: "#2563eb",
  manuf: "#059669", magasin: "#d97706",
};

function RoleBadge({ role }: { role: string }) {
  const c = ROLE_COLORS[role] || "#6b7280";
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: `${c}18`, color: c }}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}

function Avatar({ name, avatarUrl, size = 36 }: { name: string; avatarUrl?: string | null; size?: number }) {
  if (avatarUrl) return <img src={avatarUrl} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: T.main, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: size * 0.33, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useLanguage();
  const { realProfile } = useAuth();
  const { startSimulation } = useSimulation();
  const [users, setUsers] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminProfile | null>(null);
  const [hoveredUser, setHoveredUser] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });
      if (data) {
        setUsers(data as AdminProfile[]);
        if (data.length > 0 && !selectedUser) setSelectedUser(data[0] as AdminProfile);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  function handleSimulate(user: AdminProfile) {
    if (user.id === realProfile?.id) return;
    const profile: Profile = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role as Profile["role"],
      seller_code: user.seller_code,
      phone: user.phone,
      job_title: user.job_title,
      avatar_url: user.avatar_url,
      team_id: user.team_id,
      username: user.username,
      is_active: user.is_active,
      is_suspended: user.is_suspended,
      suspended_until: user.suspended_until,
      suspension_reason: user.suspension_reason,
      last_login_at: user.last_login_at,
      created_at: user.created_at,
    };
    startSimulation(profile, []);
  }

  const isGodAdmin = realProfile?.role === "god_admin";

  return (
    <div style={{ display: "flex", height: "100%", background: T.bg, overflow: "hidden" }}>
      <div style={{
        width: 280, minWidth: 280, background: T.bgCard, borderRight: `1px solid ${T.border}`,
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Shield size={16} color={T.main} />
            <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{t("admin.dashboard_title", "Tableau de bord admin")}</span>
          </div>
          <div style={{ position: "relative", marginBottom: 8 }}>
            <Search size={13} color={T.light} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("admin.search_user", "Rechercher un utilisateur...")}
              style={{
                width: "100%", boxSizing: "border-box", padding: "8px 10px 8px 30px",
                border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12,
                fontFamily: "inherit", color: T.text, outline: "none",
              }}
            />
          </div>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            style={{ width: "100%", padding: "7px 10px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, fontFamily: "inherit", color: roleFilter ? T.text : T.light, outline: "none" }}
          >
            <option value="">{t("users.all_roles", "Tous les rôles")}</option>
            {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: "center", color: T.light, fontSize: 13 }}>{t("common.loading", "Chargement...")}</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: T.light, fontSize: 13 }}>{t("admin.no_users", "Aucun utilisateur")}</div>
          ) : (
            filtered.map(u => {
              const isSelected = selectedUser?.id === u.id;
              const isHovered = hoveredUser === u.id;
              const isSelf = u.id === realProfile?.id;

              return (
                <div
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  onMouseEnter={() => setHoveredUser(u.id)}
                  onMouseLeave={() => setHoveredUser(null)}
                  style={{
                    padding: "10px 14px", cursor: "pointer", transition: "background 0.1s",
                    background: isSelected ? `${T.main}10` : isHovered ? "#f9fafb" : "transparent",
                    borderLeft: isSelected ? `3px solid ${T.main}` : "3px solid transparent",
                    display: "flex", alignItems: "center", gap: 10,
                  }}
                >
                  <Avatar name={u.full_name} avatarUrl={u.avatar_url} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: isSelected ? T.main : T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {u.full_name}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                      <RoleBadge role={u.role} />
                      {!u.is_active && <span style={{ fontSize: 10, color: T.light }}>{t("status.inactive", "Inactif")}</span>}
                      {u.is_suspended && <span style={{ fontSize: 10, color: T.orange }}>{t("status.suspended", "Suspendu")}</span>}
                    </div>
                  </div>
                  {isGodAdmin && !isSelf && (isSelected || isHovered) && (
                    <button
                      onClick={e => { e.stopPropagation(); handleSimulate(u); }}
                      title={t("admin.simulate_user", "Simuler cet utilisateur")}
                      style={{
                        display: "flex", alignItems: "center", gap: 4, padding: "4px 8px",
                        border: "none", borderRadius: 6, background: T.main, color: "#fff",
                        cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit",
                        flexShrink: 0,
                      }}
                    >
                      <Play size={10} />
                      {t("admin.simulate", "Simuler")}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div style={{ padding: "10px 14px", borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.light, flexShrink: 0 }}>
          {filtered.length} {t("admin.user_count", "utilisateur")}{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {!selectedUser ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: T.light, gap: 12 }}>
            <User size={40} color={T.border} />
            <span style={{ fontSize: 14 }}>{t("admin.select_user", "Sélectionnez un utilisateur")}</span>
          </div>
        ) : (
          <>
            <div style={{ padding: "14px 24px", background: T.bgCard, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
              <Avatar name={selectedUser.full_name} avatarUrl={selectedUser.avatar_url} size={44} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{selectedUser.full_name}</span>
                  <RoleBadge role={selectedUser.role} />
                  {!selectedUser.is_active && <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "#f3f4f6", color: T.light, fontWeight: 600 }}>{t("status.inactive", "Inactif")}</span>}
                  {selectedUser.is_suspended && <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "#fef3c7", color: T.orange, fontWeight: 600 }}>{t("status.suspended", "Suspendu")}</span>}
                </div>
                <div style={{ fontSize: 12, color: T.mid, marginTop: 2 }}>
                  {selectedUser.email}
                  {selectedUser.last_login_at && <span style={{ marginLeft: 12 }}>{t("admin.last_login", "Dernière connexion")}: {new Date(selectedUser.last_login_at).toLocaleDateString("fr-CA")}</span>}
                </div>
              </div>
              {isGodAdmin && selectedUser.id !== realProfile?.id && (
                <button
                  onClick={() => handleSimulate(selectedUser)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                    border: "none", borderRadius: 8, background: T.main, color: "#fff",
                    cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                  }}
                >
                  <Play size={13} />
                  {t("admin.simulate_session", "Simuler la session")}
                </button>
              )}
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <AdminUserStats user={selectedUser} allUsers={users} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
