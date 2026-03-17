import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { Team, TeamMember, TeamTab } from "./team/teamTypes";
import { useCurrentAgent } from "../hooks/useCurrentAgent";
import { useAuth } from "../contexts/AuthContext";

import NoTeamView from "./team/NoTeamView";
import TeamOverviewTab from "./team/TeamOverviewTab";
import TeamMembersTab from "./team/TeamMembersTab";
import TeamChatTab from "./team/TeamChatTab";
import TeamGoalsTab from "./team/TeamGoalsTab";
import TeamCommissionsTab from "./team/TeamCommissionsTab";
import TeamProjectsTab from "./team/TeamProjectsTab";
import { T } from "../theme";

const TABS: { key: TeamTab; label: string; icon: string }[] = [
  { key: "overview", label: "Vue d'ensemble", icon: "📊" },
  { key: "members", label: "Membres", icon: "👥" },
  { key: "chat", label: "Messagerie", icon: "💬" },
  { key: "goals", label: "Objectifs", icon: "🎯" },
  { key: "commissions", label: "Commissions", icon: "💰" },
  { key: "projects", label: "Projets", icon: "🚀" },
];

export default function MyTeamPage() {
  const agent = useCurrentAgent();
  const { profile } = useAuth();
  const userId = profile?.id ?? "";
  const teamId = profile?.team_id ?? null;
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentMember, setCurrentMember] = useState<TeamMember | null>(null);
  const [tab, setTab] = useState<TeamTab>("overview");
  const [loading, setLoading] = useState(true);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const loadTeam = useCallback(async () => {
    if (!userId || !teamId) { setLoading(false); return; }
    setLoading(true);

    const [{ data: teamData }, { data: memberData }, { data: allMembers }] = await Promise.all([
      supabase.from("teams").select("*").eq("id", teamId).maybeSingle(),
      supabase.from("team_members").select("*").eq("team_id", teamId).eq("user_id", userId).is("removed_at", null).maybeSingle(),
      supabase.from("team_members").select("*").eq("team_id", teamId).is("removed_at", null),
    ]);

    if (!teamData) { setLoading(false); return; }

    setTeam(teamData as Team);
    setCurrentMember((memberData as TeamMember) ?? null);
    setMembers((allMembers ?? []) as TeamMember[]);
    setLoading(false);
  }, [userId, teamId]);

  useEffect(() => { loadTeam(); }, [loadTeam]);

  const handleJoined = async (newTeam: Team, _memberId: string) => {
    // profile.team_id was updated by NoTeamView + reloadProfile.
    // But React state (teamId) hasn't re-rendered yet, so load directly with the known team.
    setLoading(true);
    const [{ data: memberData }, { data: allMembers }] = await Promise.all([
      supabase.from("team_members").select("*").eq("team_id", newTeam.id).eq("user_id", userId).is("removed_at", null).maybeSingle(),
      supabase.from("team_members").select("*").eq("team_id", newTeam.id).is("removed_at", null),
    ]);
    setTeam(newTeam);
    setCurrentMember((memberData as TeamMember) ?? null);
    setMembers((allMembers ?? []) as TeamMember[]);
    setLoading(false);
  };

  const handleLeaveTeam = async () => {
    if (!currentMember || !userId) return;
    await supabase.from("team_members").update({ removed_at: new Date().toISOString() }).eq("id", currentMember.id);
    // Clear profile.team_id
    await supabase.from("profiles").update({ team_id: null }).eq("id", userId);
    setTeam(null);
    setCurrentMember(null);
    setMembers([]);
    setConfirmLeave(false);
  };

  const copyCode = () => {
    if (team) {
      navigator.clipboard.writeText(team.join_code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: T.bg }}>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${T.bg}`, borderTop: `3px solid ${T.main}`, animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 13, color: T.textLight }}>Chargement...</div>
        </div>
      </div>
    );
  }

  if (!team || !currentMember) {
    return <NoTeamView currentUser={agent.name} onJoined={handleJoined} />;
  }

  const isLeader = currentMember.role === "leader";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: T.bg, overflow: "hidden" }}>
      <style>{`
        @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.4); } 50% { box-shadow: 0 0 0 5px rgba(22,163,74,0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ background: T.bgCard, borderBottom: `1px solid ${T.border}`, padding: "14px 28px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: T.text }}>{team.name}</h1>
              {isLeader ? (
                <span style={{ fontSize: 11, fontWeight: 800, background: "#fef3c7", color: "#92400e", padding: "3px 10px", borderRadius: 99 }}>
                  👑 Chef d'équipe
                </span>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 700, background: T.bg, color: T.textLight, padding: "3px 10px", borderRadius: 99 }}>
                  Membre
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 5 }}>
              <span style={{ fontSize: 12, color: T.textLight }}>{members.length} membre{members.length > 1 ? "s" : ""}</span>
              <div style={{ display: "flex" }}>
                {members.slice(0, 6).map(m => (
                  <div key={m.id} title={m.agent_name} style={{ position: "relative", marginLeft: -6 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: m.avatar_color, color: "#fff", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>
                      {m.agent_initials}
                    </div>
                    <div style={{ position: "absolute", bottom: 1, right: 0, width: 7, height: 7, borderRadius: "50%", background: m.is_online ? T.green : "#9ca3af", border: "1px solid #fff" }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {isLeader && (
              <button
                onClick={copyCode}
                style={{
                  padding: "8px 16px", borderRadius: 10, border: `1.5px solid ${T.main}`,
                  background: codeCopied ? T.main : "#fff", color: codeCopied ? "#fff" : T.main,
                  cursor: "pointer", fontFamily: "monospace", fontSize: 12, fontWeight: 800,
                  letterSpacing: 1, transition: "all 0.2s",
                }}
              >
                {codeCopied ? "✅ Copié !" : `Code : ${team.join_code}`}
              </button>
            )}

            {confirmLeave ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: T.red }}>Quitter l'équipe ?</span>
                <button onClick={handleLeaveTeam} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: T.red, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700 }}>Confirmer</button>
                <button onClick={() => setConfirmLeave(false)} style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>Annuler</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmLeave(true)}
                style={{ padding: "7px 14px", borderRadius: 10, border: `1px solid ${T.red}40`, background: T.bgCard, color: T.red, cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 600 }}
              >
                Quitter l'équipe
              </button>
            )}

          </div>
        </div>

        <div style={{ display: "flex", gap: 2, marginTop: 14, overflowX: "auto", paddingBottom: 2 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                background: tab === t.key ? T.main : "transparent",
                color: tab === t.key ? "#fff" : T.textLight,
                fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
                transition: "all 0.15s",
              }}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {tab === "overview" && (
          <TeamOverviewTab team={team} members={members} activity={[]} />
        )}
        {tab === "members" && (
          <TeamMembersTab
            team={team}
            members={members}
            currentMemberId={currentMember.id}
            isLeader={isLeader}
            onMembersChange={setMembers}
          />
        )}
        {tab === "chat" && (
          <TeamChatTab teamId={team.id} currentMember={currentMember} members={members} />
        )}
        {tab === "goals" && (
          <TeamGoalsTab team={team} members={members} isLeader={isLeader} />
        )}
        {tab === "commissions" && (
          <TeamCommissionsTab members={members} />
        )}
        {tab === "projects" && (
          <TeamProjectsTab team={{ id: team.id }} members={members} isLeader={isLeader} />
        )}
      </div>
    </div>
  );
}
