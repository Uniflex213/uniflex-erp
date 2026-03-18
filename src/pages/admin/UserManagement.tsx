import React, { useState, useEffect, useCallback } from "react";
import { Search, Plus, Shield, Trash2, CreditCard as Edit2, Check, X, ChevronDown, ChevronRight, Users } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { logActivity } from "../../lib/activityLogger";
import { useAuth } from "../../contexts/AuthContext";
import { AdminProfile, PlatformTeam, AccountRequest } from "./adminTypes";
import CreateUserModal from "./CreateUserModal";
import SuspendModal from "./SuspendModal";
import EditUserPanel from "./EditUserPanel";
import { T } from "../../theme";

const ROLE_LABELS: Record<string, string> = { god_admin: "God Admin", admin: "Admin", vendeur: "Vendeur", manuf: "Manuf", magasin: "Magasin" };
const ROLE_COLORS: Record<string, string> = { god_admin: "#dc2626", admin: "#111", vendeur: "#2563eb", manuf: "#059669", magasin: "#d97706" };

function RoleBadge({ role }: { role: string }) {
  const c = ROLE_COLORS[role] || "#6b7280";
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: `${c}18`, color: c }}>{ROLE_LABELS[role] || role}</span>;
}

function StatusBadge({ profile }: { profile: AdminProfile }) {
  if (!profile.is_active) return <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "#f3f4f6", color: T.light }}>Inactif</span>;
  if (profile.is_suspended) return <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "#fef3c7", color: T.orange }}>Suspendu</span>;
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "#d1fae5", color: T.green }}>Actif</span>;
}

function Avatar({ name, avatarUrl, size = 32 }: { name: string; avatarUrl?: string | null; size?: number }) {
  if (avatarUrl) return <img src={avatarUrl} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return <div style={{ width: size, height: size, borderRadius: "50%", background: T.main, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: size * 0.35, fontWeight: 700, flexShrink: 0 }}>{initials}</div>;
}

function IconBtn({ onClick, title, color = "#6b7280", children }: { onClick: () => void; title?: string; color?: string; children: React.ReactNode }) {
  return <button onClick={onClick} title={title} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.border}`, background: T.bgCard, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color }}>{children}</button>;
}

export default function UserManagement() {
  const { user, session, can } = useAuth();
  const [tab, setTab] = useState<"users" | "requests" | "teams">("users");
  const [users, setUsers] = useState<AdminProfile[]>([]);
  const [requests, setRequests] = useState<AccountRequest[]>([]);
  const [teams, setTeams] = useState<PlatformTeam[]>([]);
  const [teamMembers, setTeamMembers] = useState<Record<string, AdminProfile[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<AdminProfile | null>(null);
  const [editTarget, setEditTarget] = useState<AdminProfile | null>(null);
  const [prefill, setPrefill] = useState<{ full_name?: string; email?: string; role_requested?: string; requestId?: string; country?: string; province?: string; city?: string } | undefined>();
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [rejectTarget, setRejectTarget] = useState<AccountRequest | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [reviewTarget, setReviewTarget] = useState<AccountRequest | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [usersRes, reqRes, teamsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("account_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("platform_teams").select("*").order("name"),
    ]);
    setUsers(usersRes.data ?? []);
    setRequests(reqRes.data ?? []);
    setTeams(teamsRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadTeamMembers = async (teamId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("team_id", teamId);
    setTeamMembers((prev) => ({ ...prev, [teamId]: data ?? [] }));
  };

  if (!can("admin.users.view")) {
    return <div style={{ padding: 40, textAlign: "center", color: T.mid }}>Accès non autorisé.</div>;
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchQ = !q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.seller_code ?? "").toLowerCase().includes(q);
    return matchQ && (!roleFilter || u.role === roleFilter);
  });

  const handleDelete = async (u: AdminProfile) => {
    if (!confirm(`Supprimer ${u.full_name}? Son compte auth sera supprimé et son courriel sera libéré.`)) return;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ userId: u.id }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
      try { if (user) await logActivity(supabase, user.id, "user_deleted", "admin", { target_id: u.id }); } catch {}
      alert(`${u.full_name} supprimé avec succès.`);
      return;
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
    load();
  };

  const handleApproveRequest = (req: AccountRequest) => {
    setReviewTarget(req);
  };

  const proceedFromReview = () => {
    if (!reviewTarget) return;
    setPrefill({ full_name: reviewTarget.full_name, email: reviewTarget.email, role_requested: reviewTarget.role_requested ?? undefined, requestId: reviewTarget.id, country: reviewTarget.country ?? undefined, province: reviewTarget.province ?? undefined, city: reviewTarget.city ?? undefined });
    setReviewTarget(null);
    setShowCreate(true);
  };

  const handleRejectRequest = async () => {
    if (!rejectTarget) return;
    await supabase.from("account_requests").update({ status: "rejected", reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq("id", rejectTarget.id);
    setRejectTarget(null);
    setRejectNote("");
    load();
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    await supabase.from("platform_teams").insert({ name: newTeamName.trim() });
    setNewTeamName("");
    setShowCreateTeam(false);
    load();
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: 0 }}>Gestion des utilisateurs</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>Gérez les comptes, les demandes et les équipes</p>
      </div>

      <div style={{ background: T.bgCard, borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, padding: "0 8px" }}>
          {(["users", "requests", "teams"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "16px 20px", border: "none", background: "none", cursor: "pointer", fontSize: 14, fontWeight: tab === t ? 600 : 400, color: tab === t ? T.main : T.mid, borderBottom: tab === t ? `2px solid ${T.main}` : "2px solid transparent", display: "flex", alignItems: "center", gap: 6 }}>
              {t === "users" ? "Utilisateurs" : t === "requests" ? "Demandes" : "Équipes"}
              {t === "requests" && pendingRequests.length > 0 && (
                <span style={{ background: T.red, color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10 }}>{pendingRequests.length}</span>
              )}
            </button>
          ))}
        </div>

        <div style={{ padding: 24 }}>
          {tab === "users" && (
            <>
              <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
                  <Search size={14} color={T.light} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." style={{ width: "100%", padding: "8px 12px 8px 32px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, boxSizing: "border-box", outline: "none" }} />
                </div>
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, background: T.bgCard }}>
                  <option value="">Tous les rôles</option>
                  {["god_admin", "admin", "vendeur", "manuf", "magasin"].map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
                {can("admin.users.create") && (
                  <button onClick={() => { setPrefill(undefined); setShowCreate(true); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", background: T.main, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    <Plus size={14} /> Nouvel utilisateur
                  </button>
                )}
              </div>
              {loading ? (
                <div style={{ padding: 40, textAlign: "center", color: T.mid }}>Chargement...</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                        {["Utilisateur", "Rôle", "Code", "Statut", "Dernière connexion", ""].map((h) => (
                          <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: T.mid, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((u) => (
                        <tr key={u.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                          <td style={{ padding: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <Avatar name={u.full_name} avatarUrl={u.avatar_url} />
                              <div>
                                <div style={{ fontWeight: 600, color: T.text }}>{u.full_name}</div>
                                <div style={{ fontSize: 11, color: T.mid }}>{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px" }}><RoleBadge role={u.role} /></td>
                          <td style={{ padding: "12px", color: T.mid }}>{u.seller_code || "—"}</td>
                          <td style={{ padding: "12px" }}><StatusBadge profile={u} /></td>
                          <td style={{ padding: "12px", color: T.mid, fontSize: 12 }}>{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString("fr-CA") : "Jamais"}</td>
                          <td style={{ padding: "12px" }}>
                            <div style={{ display: "flex", gap: 4 }}>
                              {can("admin.users.edit") && <IconBtn onClick={() => setEditTarget(u)} title="Modifier"><Edit2 size={13} /></IconBtn>}
                              {can("admin.users.suspend") && <IconBtn onClick={() => setSuspendTarget(u)} title={u.is_suspended ? "Lever" : "Suspendre"} color={u.is_suspended ? T.green : T.orange}><Shield size={13} /></IconBtn>}
                              {can("admin.users.delete") && <IconBtn onClick={() => handleDelete(u)} title="Désactiver" color={T.red}><Trash2 size={13} /></IconBtn>}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: T.mid }}>Aucun utilisateur trouvé.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {tab === "requests" && (
            loading ? <div style={{ padding: 40, textAlign: "center", color: T.mid }}>Chargement...</div> : requests.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: T.mid }}>Aucune demande.</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {requests.map((req) => (
                  <div key={req.id} style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, display: "flex", alignItems: "flex-start", gap: 16 }}>
                    <Avatar name={req.full_name} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{req.full_name}</span>
                        <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 4, fontWeight: 600, background: req.status === "pending" ? "#fef3c7" : req.status === "approved" ? "#d1fae5" : "#fee2e2", color: req.status === "pending" ? T.orange : req.status === "approved" ? T.green : T.red }}>{req.status}</span>
                      </div>
                      <div style={{ fontSize: 12, color: T.mid }}>{req.email} {req.phone && `· ${req.phone}`} {req.company && `· ${req.company}`}</div>
                      {req.role_requested && <div style={{ fontSize: 12, color: T.mid, marginTop: 2 }}>Rôle: <strong>{req.role_requested}</strong></div>}
                      {req.message && <div style={{ fontSize: 12, color: T.text, marginTop: 6, background: "rgba(0,0,0,0.03)", borderRadius: 6, padding: "6px 10px" }}>{req.message}</div>}
                      <div style={{ fontSize: 11, color: T.light, marginTop: 6 }}>{new Date(req.created_at).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" })}</div>
                    </div>
                    {req.status === "pending" && can("admin.account_requests.approve") && (
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => handleApproveRequest(req)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, border: "none", background: T.main, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}><Check size={13} /> Approuver</button>
                        <button onClick={() => setRejectTarget(req)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, color: T.red, fontSize: 12, fontWeight: 600, cursor: "pointer" }}><X size={13} /> Rejeter</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {tab === "teams" && (
            <>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                {can("admin.teams.create") && <button onClick={() => setShowCreateTeam(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", background: T.main, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}><Plus size={14} /> Nouvelle équipe</button>}
              </div>
              {showCreateTeam && (
                <div style={{ background: "rgba(0,0,0,0.03)", border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, marginBottom: 16, display: "flex", gap: 10 }}>
                  <input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="Nom de l'équipe" style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 14 }} />
                  <button onClick={handleCreateTeam} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: T.main, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Créer</button>
                  <button onClick={() => setShowCreateTeam(false)} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, fontSize: 13, cursor: "pointer" }}>Annuler</button>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {teams.map((team) => (
                  <div key={team.id} style={{ border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", background: expandedTeam === team.id ? "#f8fafc" : "#fff" }} onClick={() => { if (expandedTeam === team.id) setExpandedTeam(null); else { setExpandedTeam(team.id); loadTeamMembers(team.id); } }}>
                      <Users size={18} color={T.mid} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{team.name}</div>
                        {team.description && <div style={{ fontSize: 12, color: T.mid }}>{team.description}</div>}
                      </div>
                      {expandedTeam === team.id ? <ChevronDown size={16} color={T.mid} /> : <ChevronRight size={16} color={T.mid} />}
                    </div>
                    {expandedTeam === team.id && (
                      <div style={{ borderTop: `1px solid ${T.border}`, padding: 16 }}>
                        {(teamMembers[team.id] ?? []).length === 0 ? <p style={{ fontSize: 13, color: T.mid, margin: 0 }}>Aucun membre.</p> : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {(teamMembers[team.id] ?? []).map((m) => (
                              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <Avatar name={m.full_name} avatarUrl={m.avatar_url} size={28} />
                                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: T.text }}>{m.full_name} <span style={{ fontSize: 11, color: T.mid, fontWeight: 400, marginLeft: 8 }}>{m.email}</span></span>
                                <RoleBadge role={m.role} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {teams.length === 0 && <div style={{ padding: 32, textAlign: "center", color: T.mid }}>Aucune équipe configurée.</div>}
              </div>
            </>
          )}
        </div>
      </div>

      {showCreate && <CreateUserModal teams={teams} prefill={prefill} onClose={() => { setShowCreate(false); setPrefill(undefined); }} onCreated={load} />}
      {suspendTarget && <SuspendModal target={suspendTarget} onClose={() => setSuspendTarget(null)} onDone={() => { setSuspendTarget(null); load(); }} />}
      {editTarget && <EditUserPanel target={editTarget} teams={teams} onClose={() => setEditTarget(null)} onDone={() => { setEditTarget(null); load(); }} />}
      {reviewTarget && (
        <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 400, maxWidth: "100vw", background: T.bgCard, boxShadow: "-8px 0 40px rgba(0,0,0,0.25)", zIndex: 1000, display: "flex", flexDirection: "column", fontFamily: "'Outfit', sans-serif", animation: "slideInRight 0.2s ease-out" }}>
          <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
          <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>Demande d'accès</div>
              <div style={{ fontSize: 11, color: T.mid, marginTop: 2 }}>Reçue le {new Date(reviewTarget.created_at).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" })}</div>
            </div>
            <button onClick={() => setReviewTarget(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: T.mid, padding: 4 }}>✕</button>
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <Avatar name={reviewTarget.full_name} size={56} />
              <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginTop: 10 }}>{reviewTarget.full_name}</div>
              <div style={{ fontSize: 13, color: T.mid }}>{reviewTarget.email}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                ["Téléphone", reviewTarget.phone],
                ["Entreprise", reviewTarget.company],
                ["Rôle demandé", reviewTarget.role_requested],
                ["Code magasin", reviewTarget.store_code_requested],
                ["Zone", [reviewTarget.city, reviewTarget.province, reviewTarget.country].filter(Boolean).join(", ")],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label as string} style={{ background: "rgba(0,0,0,0.03)", border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.light, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{value}</div>
                </div>
              ))}
              {reviewTarget.message && (
                <div style={{ background: "rgba(0,0,0,0.03)", border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.light, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Message</div>
                  <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{reviewTarget.message}</div>
                </div>
              )}
            </div>
          </div>
          <div style={{ padding: "16px 24px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 10 }}>
            <button onClick={() => { setReviewTarget(null); setRejectTarget(reviewTarget); }} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, color: T.red, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Rejeter</button>
            <button onClick={proceedFromReview} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: T.main, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Créer le compte</button>
          </div>
        </div>
      )}
      {rejectTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: T.bgCard, borderRadius: 16, width: 400, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: T.text }}>Rejeter la demande</h3>
            <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Note (optionnel)" rows={3} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 14, resize: "none", boxSizing: "border-box", marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setRejectTarget(null)} style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, fontSize: 14, cursor: "pointer" }}>Annuler</button>
              <button onClick={handleRejectRequest} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: T.red, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Rejeter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
