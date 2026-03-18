import { useMemo } from "react";
import { CRMLead } from "../crmTypes";
import { T } from "./workstationTypes";
import { useCurrentAgent } from "../../hooks/useCurrentAgent";
import { useTeamAgents } from "../../hooks/useAgents";

interface Props {
  leads: CRMLead[];
}

export default function WidgetScore({ leads }: Props) {
  const currentAgent = useCurrentAgent();
  const agents = useTeamAgents();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const myLeads = useMemo(() => leads.filter(l => l.assigned_agent_id === currentAgent.id), [leads, currentAgent.id]);

  const closedThisMonth = myLeads.filter(l => l.stage === "Fermé Gagné" && l.closed_at && l.closed_at >= monthStart).length;
  const newLeads = myLeads.filter(l => l.created_at >= monthStart).length;
  const wonLeads = myLeads.filter(l => l.stage === "Fermé Gagné").length;
  const convRate = myLeads.length > 0 ? (wonLeads / myLeads.length) * 100 : 0;
  const actsThisMonth = myLeads.flatMap(l => (l.activities || []).filter(a => a.activity_at >= monthStart)).length;

  const salesScore = Math.min(100, (closedThisMonth / 3) * 100);
  const newClientsScore = Math.min(100, (newLeads / 8) * 100);
  const convScore = Math.min(100, (convRate / 30) * 100);
  const activityScore = Math.min(100, (actsThisMonth / 20) * 100);
  const composite = Math.round(salesScore * 0.4 + newClientsScore * 0.25 + convScore * 0.2 + activityScore * 0.15);

  const leaderboard = agents.map(agent => {
    const al = leads.filter(l => l.assigned_agent_id === agent.id);
    const ac = al.filter(l => l.stage === "Fermé Gagné" && l.closed_at && l.closed_at >= monthStart).length;
    const newL = al.filter(l => l.created_at >= monthStart).length;
    const cr = al.length > 0 ? (al.filter(l => l.stage === "Fermé Gagné").length / al.length) * 100 : 0;
    const acts = al.flatMap(l => (l.activities || []).filter(a => a.activity_at >= monthStart)).length;
    return {
      agent,
      score: Math.round(Math.min(100, (ac / 3) * 100) * 0.4 + Math.min(100, (newL / 8) * 100) * 0.25 + Math.min(100, (cr / 30) * 100) * 0.2 + Math.min(100, (acts / 20) * 100) * 0.15),
    };
  }).sort((a, b) => b.score - a.score);

  const myRank = leaderboard.findIndex(l => l.agent.id === currentAgent.id) + 1;
  const scoreColor = composite >= 80 ? T.green : composite >= 60 ? T.main : composite >= 40 ? T.orange : T.red;

  const badgeBg = composite >= 80 ? "rgba(34,197,94,0.1)" : composite >= 60 ? `${T.main}12` : composite >= 40 ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)";
  const badgeLabel = composite >= 80 ? "Excellent" : composite >= 60 ? "Bon" : composite >= 40 ? "Moyen" : "À améliorer";

  const circumference = 2 * Math.PI * 36;
  const dashOffset = circumference * (1 - composite / 100);

  return (
    <div style={{
      background: T.card, borderRadius: 16, border: `1px solid ${T.border}`,
      padding: "16px 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      paddingTop: 24,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.main, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>🏆 Mon Score & Classement</div>

      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
        <svg width="90" height="90" viewBox="0 0 90 90" style={{ flexShrink: 0 }}>
          <circle cx="45" cy="45" r="36" fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="10" />
          <circle cx="45" cy="45" r="36" fill="none" stroke={scoreColor} strokeWidth="10"
            strokeDasharray={circumference} strokeDashoffset={dashOffset}
            strokeLinecap="round" transform="rotate(-90 45 45)"
            style={{ transition: "stroke-dashoffset 1s ease" }} />
          <text x="45" y="41" textAnchor="middle" fontSize="18" fontWeight="900" fill={scoreColor}>{composite}</text>
          <text x="45" y="54" textAnchor="middle" fontSize="9" fill="#8e8e93">/100</text>
        </svg>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: scoreColor }}>#{myRank}</span>
            <span style={{ fontSize: 13, color: T.textMid }}>sur {leaderboard.length}</span>
          </div>
          <span style={{ background: badgeBg, color: scoreColor, borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{badgeLabel}</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {leaderboard.map(({ agent, score }, i) => (
          <div key={agent.id} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8,
            background: agent.id === currentAgent.id ? `${T.main}0a` : "transparent",
            border: agent.id === currentAgent.id ? `1px solid ${T.main}22` : "1px solid transparent",
          }}>
            <div style={{ width: 18, fontSize: 13, textAlign: "center", flexShrink: 0 }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}</div>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: agent.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{agent.initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: agent.id === currentAgent.id ? 800 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{agent.name}</div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: agent.id === currentAgent.id ? T.main : T.textMid, flexShrink: 0 }}>{score}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
