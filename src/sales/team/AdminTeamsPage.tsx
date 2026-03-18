import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { T } from "../../theme";
import { TeamJoinRequest, Team, TeamMember } from "./teamTypes";
import { generateTeamCode, fmtCurrency } from "./teamUtils";

function ApproveModal({ request, onApprove, onClose }: {
  request: TeamJoinRequest;
  onApprove: (code: string) => void;
  onClose: () => void;
}) {
  const [code] = useState(generateTeamCode());
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(230,228,224,0.35)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.bgCard, borderRadius: 16, width: "100%", maxWidth: 400, boxShadow: "0 24px 80px rgba(0,0,0,0.2)", textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 36, marginBottom: 14 }}>✅</div>
        <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800, color: T.text }}>Équipe approuvée !</h3>
        <p style={{ fontSize: 13, color: T.textLight, margin: "0 0 20px" }}>
          Code généré pour <strong>{request.requester_name}</strong> :
        </p>
        <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "monospace", letterSpacing: 4, color: T.main, background: T.bg, borderRadius: 12, padding: "14px 20px", marginBottom: 16 }}>
          {code}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={copy} style={{ flex: 1, padding: "11px", borderRadius: 10, border: `1.5px solid ${T.main}`, background: copied ? T.main : "#fff", color: copied ? "#fff" : T.main, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, transition: "all 0.2s" }}>
            {copied ? "✅ Copié !" : "Copier le code"}
          </button>
          <button onClick={() => onApprove(code)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: T.main, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

interface Props { isAdmin: boolean; }

export default function AdminTeamsPage({ isAdmin }: Props) {
  const [requests, setRequests] = useState<TeamJoinRequest[]>([]);
  const [teams, setTeams] = useState<(Team & { members?: TeamMember[]; member_count?: number })[]>([]);
  const [approving, setApproving] = useState<TeamJoinRequest | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: reqs }, { data: teamsData }] = await Promise.all([
      supabase.from("team_join_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("teams").select("*, team_members(count)").order("created_at", { ascending: false }),
    ]);
    if (reqs) setRequests(reqs as TeamJoinRequest[]);
    if (teamsData) {
      setTeams(teamsData.map((t: any) => ({ ...t, member_count: t.team_members?.[0]?.count ?? 0 })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (request: TeamJoinRequest, code: string) => {
    const { data: team } = await supabase.from("teams").insert({
      name: `Équipe de ${request.requester_name}`,
      join_code: code,
      region: request.target_region,
      code_active: true,
    }).select().maybeSingle();

    await supabase.from("team_join_requests").update({
      status: "approved",
      generated_code: code,
      team_id: team?.id ?? null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: "Admin",
    }).eq("id", request.id);

    setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: "approved" as const, generated_code: code } : r));
    if (team) setTeams(prev => [{ ...team, member_count: 0 }, ...prev]);
    setApproving(null);
  };

  const handleReject = async (id: string) => {
    await supabase.from("team_join_requests").update({
      status: "rejected",
      rejection_reason: rejectReason,
      reviewed_at: new Date().toISOString(),
      reviewed_by: "Admin",
    }).eq("id", id);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "rejected" as const } : r));
    setRejectId(null);
    setRejectReason("");
  };

  const handleDissolve = async (teamId: string) => {
    if (!window.confirm("Dissoudre cette équipe ? Cette action est irréversible.")) return;
    await supabase.from("teams").delete().eq("id", teamId);
    setTeams(prev => prev.filter(t => t.id !== teamId));
  };

  const pending = requests.filter(r => r.status === "pending");
  const processed = requests.filter(r => r.status !== "pending");
  const activeTeams = teams.filter(t => t.id);
  const totalMembers = activeTeams.reduce((s, t) => s + (t.member_count ?? 0), 0);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 900, color: T.text }}>Gestion des équipes</h2>
        <p style={{ margin: 0, fontSize: 13, color: T.textLight }}>Gérez les demandes de création d'équipes et supervisez les équipes actives</p>
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
        {[
          { label: "Équipes actives", value: String(activeTeams.length), icon: "👥" },
          { label: "Membres en équipe", value: String(totalMembers), icon: "👤" },
          { label: "Demandes en attente", value: String(pending.length), icon: "📋" },
        ].map(({ label, value, icon }) => (
          <div key={label} style={{ background: T.bgCard, borderRadius: 12, padding: "14px 18px", border: `1px solid ${T.border}`, display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 22 }}>{icon}</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: T.text }}>{value}</div>
              <div style={{ fontSize: 11, color: T.textLight }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {pending.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 800, color: T.text }}>
            Demandes en attente ({pending.length})
          </h3>
          <div style={{ background: T.bgCard, borderRadius: 16, border: `1px solid ${T.border}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: T.bg }}>
                  {["Date", "Demandeur", "Raison", "Membres est.", "Région", "Actions"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 800, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.4, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pending.map(req => (
                  <tr key={req.id} style={{ borderTop: `1px solid ${T.border}` }}>
                    <td style={{ padding: "12px 14px", color: T.textLight, whiteSpace: "nowrap" }}>
                      {new Date(req.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: 700 }}>{req.requester_name}</td>
                    <td style={{ padding: "12px 14px", color: T.textLight, maxWidth: 240 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{req.reason}</div>
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "center" }}>{req.estimated_members}</td>
                    <td style={{ padding: "12px 14px" }}>{req.target_region || "—"}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => setApproving(req)} style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: T.green, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700 }}>
                          Approuver
                        </button>
                        {rejectId === req.id ? (
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Raison..." style={{ height: 28, borderRadius: 6, border: `1px solid ${T.border}`, padding: "0 8px", fontSize: 11, fontFamily: "inherit", outline: "none", width: 120 }} />
                            <button onClick={() => handleReject(req.id)} style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: T.red, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>OK</button>
                            <button onClick={() => setRejectId(null)} style={{ padding: "5px 8px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.bgCard, cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>✕</button>
                          </div>
                        ) : (
                          <button onClick={() => setRejectId(req.id)} style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${T.red}40`, background: T.bgCard, color: T.red, cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 600 }}>
                            Rejeter
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 28 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 800, color: T.text }}>Équipes actives ({activeTeams.length})</h3>
        {activeTeams.length === 0 ? (
          <div style={{ background: T.bgCard, borderRadius: 14, padding: 32, border: `1px solid ${T.border}`, textAlign: "center", color: T.textLight }}>
            Aucune équipe active pour le moment
          </div>
        ) : (
          <div style={{ background: T.bgCard, borderRadius: 16, border: `1px solid ${T.border}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: T.bg }}>
                  {["Nom de l'équipe", "Code", "Membres", "Région", "Créée le", "Actions"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 800, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.4, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeTeams.map(team => (
                  <tr key={team.id} style={{ borderTop: `1px solid ${T.border}` }}>
                    <td style={{ padding: "12px 14px", fontWeight: 700 }}>{team.name}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: T.main, background: `${T.main}10`, padding: "3px 8px", borderRadius: 6 }}>
                        {team.join_code}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>{team.member_count ?? 0}</td>
                    <td style={{ padding: "12px 14px", color: T.textLight }}>{team.region || "—"}</td>
                    <td style={{ padding: "12px 14px", color: T.textLight, whiteSpace: "nowrap" }}>
                      {new Date(team.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <button onClick={() => handleDissolve(team.id)} style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${T.red}40`, background: T.bgCard, color: T.red, cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 600 }}>
                        Dissoudre
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {processed.length > 0 && (
        <div>
          <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 800, color: T.text }}>Demandes traitées</h3>
          <div style={{ background: T.bgCard, borderRadius: 16, border: `1px solid ${T.border}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: T.bg }}>
                  {["Date", "Demandeur", "Région", "Statut", "Code généré"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 800, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.4 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {processed.map(req => (
                  <tr key={req.id} style={{ borderTop: `1px solid ${T.border}` }}>
                    <td style={{ padding: "10px 14px", color: T.textLight }}>{new Date(req.created_at).toLocaleDateString("fr-FR")}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 700 }}>{req.requester_name}</td>
                    <td style={{ padding: "10px 14px", color: T.textLight }}>{req.target_region || "—"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                        background: req.status === "approved" ? "#dcfce7" : "#fef2f2",
                        color: req.status === "approved" ? T.green : T.red,
                      }}>
                        {req.status === "approved" ? "Approuvée" : "Rejetée"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      {req.generated_code ? (
                        <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: T.main }}>{req.generated_code}</span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {approving && (
        <ApproveModal
          request={approving}
          onApprove={code => handleApprove(approving, code)}
          onClose={() => setApproving(null)}
        />
      )}
    </div>
  );
}
