import React, { useMemo, useState } from "react";
import { CRMLead } from "../crmTypes";
import { SampleRequest } from "../sampleTypes";
import { T, fmt, daysSince } from "./workstationTypes";
import { useCurrentAgent } from "../../hooks/useCurrentAgent";
import { useAgents } from "../../hooks/useAgents";
import PersonalSamplesModal from "./PersonalSamplesModal";

interface Props {
  leads: CRMLead[];
  samples?: SampleRequest[];
  allSamples?: SampleRequest[];
}

const STORAGE_KEY = "uniflex_workstation_goals";
type Goals = { sales: number; newLeads: number; activities: number };
const DEFAULT_GOALS: Goals = { sales: 150000, newLeads: 8, activities: 60 };

function loadGoals(): Goals {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return { ...DEFAULT_GOALS, ...JSON.parse(s) };
  } catch {}
  return DEFAULT_GOALS;
}

export default function WidgetKpis({ leads, samples = [], allSamples = [] }: Props) {
  const agent = useCurrentAgent();
  const agents = useAgents();
  const myLeads = useMemo(() => leads.filter(l => l.assigned_agent_id === agent.id), [leads, agent.id]);
  const [goals, setGoals] = useState<Goals>(loadGoals);
  const [editingGoals, setEditingGoals] = useState(false);
  const [draftGoals, setDraftGoals] = useState<Goals>(loadGoals);
  const [showSamplesModal, setShowSamplesModal] = useState(false);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

  const thisMonthLeads = myLeads.filter(l => l.created_at >= monthStart);
  const lastMonthLeads = myLeads.filter(l => l.created_at >= lastMonthStart && l.created_at <= lastMonthEnd);

  const closedThisMonth = myLeads.filter(l => l.stage === "Fermé Gagné" && l.closed_at && l.closed_at >= monthStart);
  const closedLastMonth = myLeads.filter(l => l.stage === "Fermé Gagné" && l.closed_at && l.closed_at >= lastMonthStart && l.closed_at <= lastMonthEnd);

  const revenueThisMonth = closedThisMonth.reduce((s, l) => s + l.estimated_value, 0);
  const commissionEstimated = revenueThisMonth * (agent.commissionRate / 100);

  const allMyActivities = useMemo(() => {
    const acts: any[] = [];
    myLeads.forEach(lead => { (lead.activities || []).forEach(a => acts.push(a)); });
    return acts;
  }, [myLeads]);

  const activitiesThisMonth = allMyActivities.filter(a => a.activity_at >= monthStart).length;

  const activeLeads = myLeads.filter(l => l.stage !== "Fermé Gagné" && l.stage !== "Fermé Perdu");
  const conversionRate = myLeads.length > 0
    ? (myLeads.filter(l => l.stage === "Fermé Gagné").length / myLeads.length) * 100
    : 0;

  const leaderboard = useMemo(() => {
    return agents.map(agent => {
      const agentLeads = leads.filter(l => l.assigned_agent_id === agent.id && l.stage === "Fermé Gagné" && l.closed_at && l.closed_at >= monthStart);
      return { agent, revenue: agentLeads.reduce((s, l) => s + l.estimated_value, 0) };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [leads, monthStart, agents]);

  const myRank = leaderboard.findIndex(l => l.agent.id === agent.id) + 1;
  const leader = leaderboard[0];
  const myRevenue = leaderboard.find(l => l.agent.id === agent.id)?.revenue || 0;
  const gapToLeader = leader?.revenue - myRevenue;

  const myActiveSamples = samples.filter(s =>
    !["Follow-up complété", "Rejeté"].includes(s.status)
  );
  const myFollowUpRequired = samples.filter(s => s.status === "Follow-up requis").length;
  const myFollowUpCompleted = samples.filter(s => s.status === "Follow-up complété").length;
  const myPositifs = samples.filter(s => s.follow_up_result === "Positif").length;

  const saveGoals = () => {
    setGoals(draftGoals);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draftGoals));
    setEditingGoals(false);
  };

  const salesPct = Math.min((revenueThisMonth / goals.sales) * 100, 100);
  const leadsPct = Math.min((thisMonthLeads.length / goals.newLeads) * 100, 100);
  const actPct = Math.min((activitiesThisMonth / goals.activities) * 100, 100);

  const diff = (curr: number, prev: number) => {
    const d = curr - prev;
    return (
      <span style={{ fontSize: 10, fontWeight: 700, color: d >= 0 ? T.green : T.red, marginLeft: 4 }}>
        {d >= 0 ? "+" : ""}{d}
      </span>
    );
  };

  return (
    <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: T.text }}>Mes KPIs</div>
        <button
          onClick={() => { setDraftGoals(goals); setEditingGoals(!editingGoals); }}
          style={{ background: editingGoals ? T.main : T.cardAlt, color: editingGoals ? "#fff" : T.textMid, border: "none", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
        >
          {editingGoals ? "Annuler" : "Objectifs"}
        </button>
      </div>

      {editingGoals ? (
        <div style={{ marginBottom: 16 }}>
          {[
            { label: "Objectif ventes (CAD)", key: "sales" as keyof Goals, step: 5000 },
            { label: "Nouveaux leads", key: "newLeads" as keyof Goals, step: 1 },
            { label: "Activités / mois", key: "activities" as keyof Goals, step: 5 },
          ].map(({ label, key, step }) => (
            <div key={key} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textMid, marginBottom: 4 }}>{label}</div>
              <input
                type="number"
                value={draftGoals[key]}
                step={step}
                onChange={e => setDraftGoals(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
                style={{ width: "100%", border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "7px 10px", fontSize: 13, fontFamily: "inherit", outline: "none" }}
              />
            </div>
          ))}
          <button
            onClick={saveGoals}
            style={{ background: T.main, color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", width: "100%" }}
          >
            Sauvegarder
          </button>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
            Performance ce mois
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            {[
              { label: "Leads créés", value: thisMonthLeads.length, compare: diff(thisMonthLeads.length, lastMonthLeads.length) },
              { label: "Taux conv.", value: `${conversionRate.toFixed(0)}%`, compare: null },
              { label: "Deals fermés", value: closedThisMonth.length, compare: diff(closedThisMonth.length, closedLastMonth.length) },
              { label: "Activités", value: activitiesThisMonth, compare: null },
            ].map(({ label, value, compare }) => (
              <div key={label} style={{ background: T.cardAlt, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: T.main }}>{value}{compare}</div>
                <div style={{ fontSize: 10, color: T.textLight, marginTop: 2, fontWeight: 600 }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            <div style={{ background: `${T.green}15`, borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: T.greenDark }}>{fmt(revenueThisMonth)}</div>
              <div style={{ fontSize: 10, color: T.textLight, marginTop: 2, fontWeight: 600 }}>Revenu généré</div>
            </div>
            <div style={{ background: `${T.main}10`, borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: T.main }}>{fmt(commissionEstimated)}</div>
              <div style={{ fontSize: 10, color: T.textLight, marginTop: 2, fontWeight: 600 }}>Commission est.</div>
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 800, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
            Objectifs mensuels
          </div>
          {[
            { label: "Ventes", pct: salesPct, current: fmt(revenueThisMonth), target: fmt(goals.sales) },
            { label: "Nouveaux leads", pct: leadsPct, current: String(thisMonthLeads.length), target: String(goals.newLeads) },
            { label: "Activités", pct: actPct, current: String(activitiesThisMonth), target: String(goals.activities) },
          ].map(({ label, pct, current, target }) => (
            <div key={label} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                <span style={{ fontWeight: 600 }}>{label}</span>
                <span style={{ color: T.textMid }}>{current} / {target}</span>
              </div>
              <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: 6, height: 7, overflow: "hidden" }}>
                <div style={{
                  width: `${pct}%`, height: "100%", borderRadius: 6, transition: "width 0.3s",
                  background: pct >= 100 ? T.green : pct >= 60 ? T.orange : T.main,
                }} />
              </div>
              <div style={{ fontSize: 10, color: T.textLight, marginTop: 3 }}>{pct.toFixed(0)}% atteint</div>
            </div>
          ))}

          <div style={{ marginTop: 12, padding: "10px 12px", background: T.cardAlt, borderRadius: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textMid, marginBottom: 4 }}>
              Classement équipe
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", background: T.main,
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 900, fontSize: 14,
              }}>
                #{myRank}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>
                  {myRank === 1 ? "Leader du classement !" : `#${myRank} sur ${leaderboard.length} agents`}
                </div>
                {myRank > 1 && gapToLeader > 0 && (
                  <div style={{ fontSize: 11, color: T.textMid }}>
                    {fmt(gapToLeader)} derrière {leader.agent.name.split(" ")[0]}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            onClick={() => setShowSamplesModal(true)}
            style={{
              marginTop: 12, padding: "10px 12px", borderRadius: 10, cursor: "pointer",
              background: "rgba(212,160,23,0.06)",
              border: `1.5px solid ${myFollowUpRequired > 0 ? "#d4a017" : "rgba(212,160,23,0.35)"}`,
              transition: "all 0.15s",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#9a7209", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Mes Samples
              </div>
              {myFollowUpRequired > 0 && (
                <span style={{
                  background: "#ef4444", color: "#fff", borderRadius: 10, fontSize: 10,
                  fontWeight: 800, padding: "2px 7px",
                  animation: "pulse 2s infinite",
                }}>
                  {myFollowUpRequired} follow-up
                </span>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#d4a017" }}>{myActiveSamples.length}</div>
                <div style={{ fontSize: 9, color: T.textLight, fontWeight: 600 }}>Actifs</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#22c55e" }}>{myPositifs}</div>
                <div style={{ fontSize: 9, color: T.textLight, fontWeight: 600 }}>Positifs</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: T.textMid }}>{myFollowUpCompleted}</div>
                <div style={{ fontSize: 9, color: T.textLight, fontWeight: 600 }}>Complétés</div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: "#9a7209", marginTop: 6, fontWeight: 600, textAlign: "center" }}>
              Voir mes analytics samples →
            </div>
          </div>
        </>
      )}

      {showSamplesModal && (
        <PersonalSamplesModal
          mySamples={samples}
          allSamples={allSamples}
          onClose={() => setShowSamplesModal(false)}
        />
      )}
    </div>
  );
}
