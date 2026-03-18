import { useState, useEffect, useMemo } from "react";
import { CRMLead, STAGE_COLORS, TEMP_COLORS, STAGES } from "../crmTypes";
import { useTeamAgents } from "../../hooks/useAgents";
import { SampleRequest } from "../sampleTypes";
import { T, fmt, daysSince, timeAgo, isToday, isPast, mkId } from "./workstationTypes";
import { useUserPreferences } from "../../hooks/useUserPreferences";
import { useCurrentAgent } from "../../hooks/useCurrentAgent";
import { ExpandModal } from "./WidgetShell";
import { useApp } from "../../AppContext";

const fmtShort = (n: number) => n >= 1000000 ? `${(n / 1e6).toFixed(1)}M$` : n >= 1000 ? `${(n / 1000).toFixed(0)}k$` : `${n}$`;

function Chip({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span style={{ background: bg, color, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{label}</span>;
}
function HBar({ value, max, color, h = 8 }: { value: number; max: number; color: string; h?: number }) {
  return (
    <div style={{ background: "rgba(0,0,0,0.07)", borderRadius: h, height: h, overflow: "hidden", flex: 1 }}>
      <div style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%`, height: "100%", background: color, borderRadius: h, transition: "width 0.5s ease" }} />
    </div>
  );
}
function Section({ title, children, mt = 20 }: { title: string; children: React.ReactNode; mt?: number }) {
  return (
    <div style={{ marginTop: mt }}>
      <h3 style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>{title}</h3>
      {children}
    </div>
  );
}
function Tabs({ tabs, active, onChange }: { tabs: string[]; active: number; onChange: (i: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, borderBottom: `1px solid rgba(0,0,0,0.08)`, marginBottom: 20, paddingBottom: 0 }}>
      {tabs.map((tab, i) => (
        <button key={i} className="ws-tab-btn" onClick={() => onChange(i)} style={{
          background: "none", border: "none", cursor: "pointer", padding: "10px 18px",
          fontSize: 13, fontWeight: i === active ? 700 : 500, color: i === active ? T.main : T.textMid,
          borderBottom: i === active ? `2px solid ${T.main}` : "2px solid transparent",
          marginBottom: -1, borderRadius: "4px 4px 0 0", transition: "all 0.15s", fontFamily: "inherit",
        }}>{tab}</button>
      ))}
    </div>
  );
}

export function MaJourneeModal({ leads, onClose, onOpenLead }: { leads: CRMLead[]; onClose: () => void; onOpenLead: (id: string) => void }) {
  const agent = useCurrentAgent();
  const [tab, setTab] = useState(0);
  const myLeads = useMemo(() => leads.filter(l => l.assigned_agent_id === agent.id), [leads, agent.id]);
  const now = new Date();
  const todayStr = now.toDateString();

  const allReminders = useMemo(() => myLeads.flatMap(l =>
    (l.reminders || []).map(r => ({ ...r, leadName: l.company_name, leadId: l.id, lead: l }))
  ), [myLeads]);

  const overdueReminders = allReminders.filter(r => !r.completed && new Date(r.reminder_at) < now).sort((a, b) => new Date(a.reminder_at).getTime() - new Date(b.reminder_at).getTime());
  const todayReminders = allReminders.filter(r => !r.completed && new Date(r.reminder_at).toDateString() === todayStr && new Date(r.reminder_at) >= now);
  const upcomingReminders = allReminders.filter(r => !r.completed && new Date(r.reminder_at) > now && new Date(r.reminder_at).toDateString() !== todayStr);

  const todayActivities = useMemo(() => myLeads.flatMap(l =>
    (l.activities || []).filter(a => new Date(a.activity_at).toDateString() === todayStr).map(a => ({ ...a, leadName: l.company_name, leadId: l.id }))
  ), [myLeads, todayStr]);

  const callsToday = todayActivities.filter(a => a.type === "Appel").length;
  const emailsToday = todayActivities.filter(a => a.type === "Email envoyé" || a.type === "Email reçu").length;
  const meetingsToday = todayActivities.filter(a => a.type === "Rencontre / Visite").length;
  const notesToday = todayActivities.filter(a => a.type === "Note interne").length;
  const totalToday = todayActivities.length;
  const dailyGoal = 5;

  const followUpLeads = myLeads
    .filter(l => l.stage !== "Fermé Gagné" && l.stage !== "Fermé Perdu" && !l.archived)
    .filter(l => daysSince(l.last_activity_at) >= 3)
    .sort((a, b) => daysSince(b.last_activity_at) - daysSince(a.last_activity_at))
    .slice(0, 20);

  const getActionRec = (l: CRMLead): string => {
    const days = daysSince(l.last_activity_at);
    if (days >= 14) return "⚠️ Risque de perte — contacter ASAP";
    if (l.stage === "Négociation" && days >= 5) return "⚡ Accélérer — proposer un incitatif";
    if (l.stage === "Proposition Envoyée" && days >= 3) return "📞 Relancer pour connaître la décision";
    if (l.temperature === "Hot" && days >= 7) return "🔥 Appeler immédiatement";
    if (l.temperature === "Warm" && days >= 7) return "📧 Envoyer un email de relance";
    return "Faire un suivi";
  };

  const priorityColor: Record<string, string> = { Haute: T.red, Moyenne: T.orange, Basse: T.textMid };

  return (
    <ExpandModal title="Ma journée — Vue complète" icon="☀️" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { l: "Tâches en retard", v: overdueReminders.length, c: overdueReminders.length > 0 ? T.red : T.green },
          { l: "Aujourd'hui", v: todayReminders.length, c: T.main },
          { l: "Activités du jour", v: totalToday, c: T.green },
          { l: "Leads à suivre", v: followUpLeads.length, c: T.orange },
        ].map((k, i) => (
          <div key={i} style={{ background: T.cardAlt, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{k.l}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      <Tabs tabs={["Tâches & Reminders", "Suivis recommandés", "Activité du jour"]} active={tab} onChange={setTab} />

      {tab === 0 && (
        <div>
          {overdueReminders.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.red, marginBottom: 8 }}>EN RETARD — {overdueReminders.length} reminder{overdueReminders.length !== 1 ? "s" : ""}</div>
              {overdueReminders.map(r => (
                <div key={r.id} className="ws-row-hover" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, marginBottom: 6, transition: "background 0.15s" }}
                  onClick={() => { onClose(); onOpenLead(r.leadId); }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.title}</div>
                    <div style={{ fontSize: 11, color: T.textLight }}>{r.leadName}</div>
                  </div>
                  <Chip label={`EN RETARD ${Math.floor((now.getTime() - new Date(r.reminder_at).getTime()) / 86400000)}j`} color={T.red} bg="rgba(239,68,68,0.1)" />
                  <Chip label={r.priority} color={priorityColor[r.priority]} bg={`${priorityColor[r.priority]}18`} />
                </div>
              ))}
            </div>
          )}
          {todayReminders.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.main, marginBottom: 8 }}>AUJOURD'HUI — {todayReminders.length}</div>
              {todayReminders.map(r => (
                <div key={r.id} className="ws-row-hover" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: `${T.main}06`, border: `1px solid ${T.main}22`, borderRadius: 8, marginBottom: 6, transition: "background 0.15s" }}
                  onClick={() => { onClose(); onOpenLead(r.leadId); }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.title}</div>
                    <div style={{ fontSize: 11, color: T.textLight }}>{r.leadName} · {new Date(r.reminder_at).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                  <Chip label={r.priority} color={priorityColor[r.priority]} bg={`${priorityColor[r.priority]}18`} />
                </div>
              ))}
            </div>
          )}
          {upcomingReminders.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, marginBottom: 8 }}>À VENIR</div>
              {upcomingReminders.slice(0, 10).map(r => (
                <div key={r.id} className="ws-row-hover" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: T.cardAlt, borderRadius: 8, marginBottom: 6, transition: "background 0.15s" }}
                  onClick={() => { onClose(); onOpenLead(r.leadId); }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}>{r.title}</div>
                    <div style={{ fontSize: 11, color: T.textLight }}>{r.leadName} · {new Date(r.reminder_at).toLocaleDateString("fr-CA")}</div>
                  </div>
                  <Chip label={r.priority} color={priorityColor[r.priority]} bg={`${priorityColor[r.priority]}18`} />
                </div>
              ))}
            </div>
          )}
          {overdueReminders.length + todayReminders.length + upcomingReminders.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: T.textLight }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div>Aucun reminder à venir. Belle journée!</div>
            </div>
          )}
        </div>
      )}

      {tab === 1 && (
        <div>
          {followUpLeads.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: T.textLight }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👍</div>
              <div>Tous vos leads sont à jour!</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {followUpLeads.map(lead => {
                const days = daysSince(lead.last_activity_at);
                const action = getActionRec(lead);
                return (
                  <div key={lead.id} className="ws-row-hover" style={{
                    display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr",
                    padding: "12px 14px", borderRadius: 10, border: `1px solid rgba(0,0,0,0.07)`,
                    background: days >= 14 ? "rgba(239,68,68,0.03)" : "#fff",
                    transition: "background 0.15s", alignItems: "center", gap: 8,
                  }} onClick={() => { onClose(); onOpenLead(lead.id); }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{lead.company_name}</div>
                      <div style={{ fontSize: 11, color: T.textLight, marginTop: 2 }}>{lead.stage}</div>
                    </div>
                    <div style={{ fontSize: 11, color: days >= 14 ? T.red : days >= 7 ? T.orange : T.textMid, fontWeight: 600 }}>{action}</div>
                    <div style={{ fontSize: 11, color: T.textMid }}>il y a {days}j</div>
                    <div><span style={{ color: TEMP_COLORS[lead.temperature], fontWeight: 700, fontSize: 11 }}>{lead.temperature === "Hot" ? "🔥" : lead.temperature === "Warm" ? "⚡" : "❄️"} {lead.temperature}</span></div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.main }}>{fmt(lead.estimated_value)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 2 && (
        <div>
          <Section title="Progression du jour" mt={0}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, background: T.cardAlt, borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: T.main }}>{totalToday}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>activités aujourd'hui / objectif {dailyGoal}</div>
                <HBar value={totalToday} max={dailyGoal} color={totalToday >= dailyGoal ? T.green : T.main} h={12} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {[
                { l: "Appels", v: callsToday, goal: 3, c: T.green },
                { l: "Emails", v: emailsToday, goal: 5, c: T.blue },
                { l: "Rencontres", v: meetingsToday, goal: 1, c: T.orange },
                { l: "Notes", v: notesToday, goal: 2, c: "#8b5cf6" },
              ].map((item, i) => (
                <div key={i} style={{ background: T.bgCard, border: `1px solid rgba(0,0,0,0.07)`, borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, color: T.textLight, marginBottom: 4 }}>{item.l}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: item.c, marginBottom: 6 }}>{item.v} <span style={{ fontSize: 11, color: T.textLight, fontWeight: 400 }}>/ {item.goal}</span></div>
                  <HBar value={item.v} max={item.goal} color={item.v >= item.goal ? T.green : item.c} h={6} />
                </div>
              ))}
            </div>
          </Section>
          {todayActivities.length > 0 && (
            <Section title="Timeline du jour">
              {[...todayActivities].sort((a, b) => new Date(b.activity_at).getTime() - new Date(a.activity_at).getTime()).map(a => (
                <div key={a.id} className="ws-row-hover" style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: `1px solid rgba(0,0,0,0.06)`, transition: "background 0.15s" }}
                  onClick={() => { onClose(); onOpenLead(a.leadId); }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${T.main}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                    {a.type === "Appel" ? "📞" : a.type?.includes("Email") ? "📧" : a.type === "Rencontre / Visite" ? "🤝" : "📝"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{a.title}</div>
                    <div style={{ fontSize: 11, color: T.textLight }}>{a.leadName} · {new Date(a.activity_at).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
              ))}
            </Section>
          )}
        </div>
      )}
    </ExpandModal>
  );
}

export function PipelineModal({ leads, onClose, onOpenLead }: { leads: CRMLead[]; onClose: () => void; onOpenLead: (id: string) => void }) {
  const agent = useCurrentAgent();
  const myLeads = useMemo(() => leads.filter(l => l.assigned_agent_id === agent.id), [leads, agent.id]);
  const activeLeads = myLeads.filter(l => l.stage !== "Fermé Gagné" && l.stage !== "Fermé Perdu" && !l.archived);
  const totalValue = activeLeads.reduce((s, l) => s + (l.estimated_value || 0), 0);
  const hotLeads = activeLeads.filter(l => l.temperature === "Hot").length;
  const wonLeads = myLeads.filter(l => l.stage === "Fermé Gagné");
  const convRate = myLeads.length > 0 ? (wonLeads.length / myLeads.length) * 100 : 0;

  const activeStages = STAGES.filter(s => s !== "Fermé Gagné" && s !== "Fermé Perdu");

  return (
    <ExpandModal title="Mon Pipeline — Vue complète" icon="📊" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 24 }}>
        {[
          { l: "Leads actifs", v: activeLeads.length, c: T.main },
          { l: "Valeur pipeline", v: fmtShort(totalValue), c: T.main },
          { l: "Pipeline pondéré", v: fmtShort(activeLeads.reduce((s, l) => s + (l.estimated_value || 0) * (l.closing_probability || 0) / 100, 0)), c: "#0891b2" },
          { l: "Leads Hot", v: hotLeads, c: T.red },
          { l: "Taux conversion", v: `${convRate.toFixed(1)}%`, c: convRate > 30 ? T.green : T.orange },
        ].map((k, i) => (
          <div key={i} style={{ background: T.cardAlt, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{k.l}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      {activeStages.map(stage => {
        const stageLeads = activeLeads.filter(l => l.stage === stage);
        if (stageLeads.length === 0) return null;
        const stageColor = STAGE_COLORS[stage];
        return (
          <div key={stage} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: stageColor, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: stageColor }}>{stage}</span>
              <span style={{ background: `${stageColor}18`, color: stageColor, borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>{stageLeads.length}</span>
              <span style={{ fontSize: 11, color: T.textMid }}>{fmt(stageLeads.reduce((s, l) => s + (l.estimated_value || 0), 0))}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {stageLeads.map(lead => (
                <div key={lead.id} className="ws-row-hover" style={{
                  padding: "12px 14px", borderRadius: 10, border: `1px solid rgba(0,0,0,0.07)`,
                  background: T.bgCard, transition: "background 0.15s",
                }} onClick={() => { onClose(); onOpenLead(lead.id); }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{lead.company_name}</div>
                  <div style={{ fontSize: 11, color: T.textLight, marginBottom: 6 }}>{lead.contact_first_name} {lead.contact_last_name}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.main }}>{fmt(lead.estimated_value)}</span>
                    <span style={{ color: TEMP_COLORS[lead.temperature], fontSize: 12, fontWeight: 700 }}>
                      {lead.temperature === "Hot" ? "🔥" : lead.temperature === "Warm" ? "⚡" : "❄️"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </ExpandModal>
  );
}

export function KpisModal({ leads, onClose }: { leads: CRMLead[]; onClose: () => void }) {
  const currentAgent = useCurrentAgent();
  const agents = useTeamAgents();
  const myLeads = useMemo(() => leads.filter(l => l.assigned_agent_id === currentAgent.id), [leads, currentAgent.id]);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const closedThisMonth = myLeads.filter(l => l.stage === "Fermé Gagné" && l.closed_at && l.closed_at >= monthStart);
  const revenueThisMonth = closedThisMonth.reduce((s, l) => s + l.estimated_value, 0);
  const commission = revenueThisMonth * (currentAgent.commissionRate / 100);

  const allActs = useMemo(() => myLeads.flatMap(l => (l.activities || []).map(a => ({ ...a, leadName: l.company_name }))), [myLeads]);
  const actsThisMonth = allActs.filter(a => a.activity_at >= monthStart);

  const wonLeads = myLeads.filter(l => l.stage === "Fermé Gagné");
  const convRate = myLeads.length > 0 ? (wonLeads.length / myLeads.length) * 100 : 0;

  const leaderboard = agents.map(agent => {
    const al = leads.filter(l => l.assigned_agent_id === agent.id && l.stage === "Fermé Gagné" && l.closed_at && l.closed_at >= monthStart);
    return { agent, revenue: al.reduce((s, l) => s + l.estimated_value, 0) };
  }).sort((a, b) => b.revenue - a.revenue);

  const myRank = leaderboard.findIndex(l => l.agent.id === currentAgent.id) + 1;
  const maxRevenue = Math.max(...leaderboard.map(l => l.revenue), 1);

  const months6: Array<{ label: string; acts: number; closed: number; revenue: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const ms = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const me = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const msl = ms.toISOString(); const mel = me.toISOString();
    const mActs = allActs.filter(a => a.activity_at >= msl && a.activity_at <= mel).length;
    const mClosed = myLeads.filter(l => l.stage === "Fermé Gagné" && l.closed_at && l.closed_at >= msl && l.closed_at <= mel);
    months6.push({ label: ms.toLocaleString("fr-CA", { month: "short" }), acts: mActs, closed: mClosed.length, revenue: mClosed.reduce((s, l) => s + l.estimated_value, 0) });
  }

  const actByType: Record<string, number> = {};
  actsThisMonth.forEach(a => { actByType[a.type] = (actByType[a.type] || 0) + 1; });
  const maxActCount = Math.max(...Object.values(actByType), 1);

  const podiumEmojis = ["🥇", "🥈", "🥉"];

  return (
    <ExpandModal title="Mes KPIs — Vue complète" icon="🎯" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
        {[
          { l: "Leads actifs", v: myLeads.filter(l => l.stage !== "Fermé Gagné" && l.stage !== "Fermé Perdu").length, c: T.main },
          { l: "Deals fermés ce mois", v: closedThisMonth.length, c: T.green },
          { l: "Revenu ce mois", v: fmtShort(revenueThisMonth), c: T.green },
          { l: "Commission estimée", v: fmtShort(commission), c: T.orange },
        ].map((k, i) => (
          <div key={i} style={{ background: T.cardAlt, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{k.l}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <Section title="Évolution sur 6 mois" mt={0}>
            <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 100 }}>
              {months6.map((m, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.main }}>{m.closed}</div>
                  <div style={{ width: "100%", background: i === 5 ? T.green : T.main, borderRadius: "4px 4px 0 0", height: `${(m.closed / Math.max(...months6.map(x => x.closed), 1)) * 70}px`, minHeight: m.closed > 0 ? 4 : 0, transition: "height 0.5s" }} />
                  <div style={{ fontSize: 9, color: T.textLight }}>{m.label}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Activités par type ce mois">
            {Object.entries(actByType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 100, fontSize: 11, color: T.textMid, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{type}</div>
                <HBar value={count} max={maxActCount} color={T.main} h={10} />
                <div style={{ width: 28, fontSize: 12, fontWeight: 700, textAlign: "right", flexShrink: 0 }}>{count}</div>
              </div>
            ))}
            {Object.keys(actByType).length === 0 && <div style={{ fontSize: 13, color: T.textLight }}>Aucune activité ce mois</div>}
          </Section>
        </div>

        <div>
          <Section title="Classement de l'équipe ce mois" mt={0}>
            {leaderboard.map(({ agent, revenue }, i) => (
              <div key={agent.id} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8,
                background: agent.id === currentAgent.id ? `${T.main}0a` : i === 0 ? "rgba(34,197,94,0.05)" : "transparent",
                border: agent.id === currentAgent.id ? `1px solid ${T.main}22` : "1px solid transparent",
                marginBottom: 6,
              }}>
                <div style={{ width: 28, fontSize: 16, textAlign: "center", flexShrink: 0 }}>{podiumEmojis[i] || `#${i + 1}`}</div>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: agent.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{agent.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: agent.id === currentAgent.id ? 800 : 600 }}>{agent.name}</div>
                  <div style={{ height: 6, marginTop: 4 }}>
                    <HBar value={revenue} max={maxRevenue} color={agent.id === currentAgent.id ? T.main : T.silver} h={6} />
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: agent.id === currentAgent.id ? T.main : T.textMid, flexShrink: 0 }}>{fmtShort(revenue)}</div>
              </div>
            ))}
            <div style={{ marginTop: 10, fontSize: 12, color: T.textMid, textAlign: "center" }}>
              Votre rang : <strong style={{ color: T.main }}>#{myRank}</strong> sur {leaderboard.length}
            </div>
          </Section>
        </div>
      </div>

      <Section title="Taux de conversion personnel">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <div style={{ background: T.cardAlt, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: T.textLight, marginBottom: 4 }}>Total leads</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.main }}>{myLeads.length}</div>
          </div>
          <div style={{ background: T.cardAlt, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: T.textLight, marginBottom: 4 }}>Fermés gagnés</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.green }}>{wonLeads.length}</div>
          </div>
          <div style={{ background: T.cardAlt, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: T.textLight, marginBottom: 4 }}>Taux conversion</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: convRate > 30 ? T.green : convRate >= 15 ? T.orange : T.red }}>{convRate.toFixed(1)}%</div>
          </div>
        </div>
      </Section>
    </ExpandModal>
  );
}

export function NotesModal({ onClose }: { onClose: () => void }) {
  const { prefs, loaded: prefsLoaded, updatePref } = useUserPreferences();
  type NotePage = { id: string; title: string; content: string; updatedAt: string };

  const defaultPages: NotePage[] = [{ id: "general", title: "Notes générales", content: "", updatedAt: new Date().toISOString() }];

  const [pages, setPages] = useState<NotePage[]>(defaultPages);
  const [activePageId, setActivePageId] = useState("general");
  const [newPageTitle, setNewPageTitle] = useState("");
  const [addingPage, setAddingPage] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Load from Supabase
  useEffect(() => {
    if (!prefsLoaded) return;
    if (prefs.workstation_sticky_notes?.length > 0) {
      setPages(prefs.workstation_sticky_notes);
      setActivePageId(prefs.workstation_sticky_notes[0]?.id || "general");
    }
  }, [prefsLoaded]);

  const activePage = pages.find(p => p.id === activePageId) || pages[0];
  const savePages = (updated: NotePage[]) => {
    setPages(updated);
    updatePref('workstation_sticky_notes', updated);
  };

  const updateContent = (content: string) => {
    const updated = pages.map(p => p.id === activePageId ? { ...p, content, updatedAt: new Date().toISOString() } : p);
    savePages(updated);
  };

  const addPage = () => {
    if (!newPageTitle.trim()) return;
    const np: NotePage = { id: mkId(), title: newPageTitle.trim(), content: "", updatedAt: new Date().toISOString() };
    savePages([...pages, np]);
    setActivePageId(np.id);
    setNewPageTitle("");
    setAddingPage(false);
  };

  const deletePage = (id: string) => {
    if (pages.length <= 1) return;
    const updated = pages.filter(p => p.id !== id);
    savePages(updated);
    if (activePageId === id) setActivePageId(updated[0].id);
  };

  const filtered = searchTerm
    ? pages.filter(p => p.content.toLowerCase().includes(searchTerm.toLowerCase()) || p.title.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  return (
    <ExpandModal title="Mes notes & idées" icon="📝" onClose={onClose}>
      <div style={{ display: "flex", gap: 0, height: "calc(100% - 0px)", minHeight: 500 }}>
        <div style={{ width: 200, borderRight: `1px solid rgba(0,0,0,0.08)`, flexShrink: 0, paddingRight: 16, marginRight: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Chercher dans les notes..." style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid rgba(0,0,0,0.12)`, fontSize: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
          </div>
          {searchTerm ? (
            <div>
              <div style={{ fontSize: 11, color: T.textLight, marginBottom: 8 }}>{filtered.length} page{filtered.length !== 1 ? "s" : ""} trouvée{filtered.length !== 1 ? "s" : ""}</div>
              {filtered.map(p => <div key={p.id} onClick={() => { setActivePageId(p.id); setSearchTerm(""); }} style={{ fontSize: 12, padding: "6px 8px", borderRadius: 6, cursor: "pointer", marginBottom: 2, background: `${T.main}12`, color: T.main, fontWeight: 600 }}>{p.title}</div>)}
            </div>
          ) : (
            pages.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                <div onClick={() => setActivePageId(p.id)} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: p.id === activePageId ? 700 : 400, background: p.id === activePageId ? `${T.main}12` : "transparent", color: p.id === activePageId ? T.main : T.text, transition: "all 0.15s" }}>{p.title}</div>
                {pages.length > 1 && <button onClick={() => deletePage(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textLight, fontSize: 14, padding: "2px 4px" }}>×</button>}
              </div>
            ))
          )}
          {addingPage ? (
            <div style={{ marginTop: 8 }}>
              <input autoFocus value={newPageTitle} onChange={e => setNewPageTitle(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addPage(); if (e.key === "Escape") setAddingPage(false); }} placeholder="Nom de la page..." style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${T.main}`, fontSize: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 4 }} />
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={addPage} style={{ flex: 1, background: T.main, color: "#fff", border: "none", borderRadius: 6, padding: "4px 0", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Ajouter</button>
                <button onClick={() => setAddingPage(false)} style={{ flex: 1, background: T.cardAlt, color: T.text, border: "none", borderRadius: 6, padding: "4px 0", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingPage(true)} style={{ marginTop: 8, width: "100%", background: "none", border: `1px dashed rgba(0,0,0,0.15)`, borderRadius: 8, padding: "6px 0", fontSize: 11, cursor: "pointer", color: T.textLight, fontFamily: "inherit" }}>+ Nouvelle page</button>
          )}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{activePage?.title}</div>
            {activePage && <div style={{ fontSize: 11, color: T.textLight }}>Modifié {new Date(activePage.updatedAt).toLocaleDateString("fr-CA")}</div>}
          </div>
          <textarea
            value={activePage?.content || ""}
            onChange={e => updateContent(e.target.value)}
            placeholder="Commencer à écrire..."
            style={{
              flex: 1, width: "100%", minHeight: 400, padding: "14px 16px",
              border: `1px solid rgba(0,0,0,0.08)`, borderRadius: 10,
              fontSize: 14, lineHeight: 1.7, fontFamily: "inherit",
              outline: "none", resize: "none", background: T.cardAlt,
              boxSizing: "border-box", color: T.text,
            }}
          />
        </div>
      </div>
    </ExpandModal>
  );
}

export function ActiviteModal({ leads, onClose, onOpenLead }: { leads: CRMLead[]; onClose: () => void; onOpenLead: (id: string) => void }) {
  const agent = useCurrentAgent();
  const [typeFilter, setTypeFilter] = useState("Tous");
  const [search, setSearch] = useState("");

  const myLeads = useMemo(() => leads.filter(l => l.assigned_agent_id === agent.id), [leads, agent.id]);
  const allActs = useMemo(() => myLeads.flatMap(l => (l.activities || []).map(a => ({ ...a, leadName: l.company_name, leadId: l.id }))).sort((a, b) => new Date(b.activity_at).getTime() - new Date(a.activity_at).getTime()), [myLeads]);

  const actTypes = ["Tous", ...Array.from(new Set(allActs.map(a => a.type)))];
  const filtered = allActs.filter(a =>
    (typeFilter === "Tous" || a.type === typeFilter) &&
    (search === "" || a.title.toLowerCase().includes(search.toLowerCase()) || a.leadName.toLowerCase().includes(search.toLowerCase()))
  );

  const actCounts: Record<string, number> = {};
  allActs.forEach(a => { actCounts[a.type] = (actCounts[a.type] || 0) + 1; });
  const maxCount = Math.max(...Object.values(actCounts), 1);

  return (
    <ExpandModal title="Mon historique d'activités" icon="🕐" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { l: "Total activités", v: allActs.length, c: T.main },
          { l: "Ce mois", v: allActs.filter(a => new Date(a.activity_at).getMonth() === new Date().getMonth()).length, c: T.main },
          { l: "Appels", v: allActs.filter(a => a.type === "Appel").length, c: T.green },
          { l: "Emails", v: allActs.filter(a => a.type?.includes("Email")).length, c: T.blue },
        ].map((k, i) => (
          <div key={i} style={{ background: T.cardAlt, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{k.l}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." style={{ height: 34, borderRadius: 8, border: `1px solid rgba(0,0,0,0.12)`, padding: "0 12px", fontSize: 13, fontFamily: "inherit", outline: "none", width: 200 }} />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ height: 34, borderRadius: 8, border: `1px solid rgba(0,0,0,0.12)`, padding: "0 10px", fontSize: 13, fontFamily: "inherit", outline: "none", cursor: "pointer" }}>
          {actTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{ display: "flex", alignItems: "center", fontSize: 12, color: T.textMid }}>{filtered.length} activité{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {filtered.slice(0, 50).map(a => (
          <div key={a.id} className="ws-row-hover" style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 12px", borderRadius: 8, background: isToday(a.activity_at) ? `${T.main}06` : "#fff", border: `1px solid rgba(0,0,0,0.06)`, transition: "background 0.15s" }}
            onClick={() => { onClose(); onOpenLead(a.leadId); }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${T.main}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
              {a.type === "Appel" ? "📞" : a.type?.includes("Email") ? "📧" : a.type === "Rencontre / Visite" ? "🤝" : "📝"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{a.title}</div>
              <div style={{ fontSize: 11, color: T.textLight }}>{a.leadName}</div>
            </div>
            <div style={{ flexShrink: 0, textAlign: "right" }}>
              <div style={{ fontSize: 11, color: T.textLight }}>{timeAgo(a.activity_at)}</div>
              <Chip label={a.type} color={T.main} bg={`${T.main}12`} />
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: T.textLight }}>Aucune activité trouvée</div>}
        {filtered.length > 50 && <div style={{ textAlign: "center", fontSize: 12, color: T.textLight, padding: "8px 0" }}>Affichage de 50 / {filtered.length} activités</div>}
      </div>
    </ExpandModal>
  );
}

export function DealsModal({ leads, onClose, onOpenLead }: { leads: CRMLead[]; onClose: () => void; onOpenLead: (id: string) => void }) {
  const agent = useCurrentAgent();
  const myLeads = useMemo(() => leads.filter(l => l.assigned_agent_id === agent.id), [leads, agent.id]);
  const dealLeads = myLeads.filter(l => l.stage === "Proposition Envoyée" || l.stage === "Négociation");

  const scored = dealLeads.map(l => {
    const tempMult = l.temperature === "Hot" ? 3 : l.temperature === "Warm" ? 2 : 1;
    const daysInStage = daysSince(l.last_activity_at) || 1;
    const score = (l.estimated_value * (l.closing_probability / 100) * tempMult) / daysInStage;
    return { lead: l, score };
  }).sort((a, b) => b.score - a.score);

  const getActionSuggestion = (l: CRMLead): string => {
    const days = daysSince(l.last_activity_at);
    if (!l.reminders?.some(r => !r.completed && new Date(r.reminder_at) > new Date())) return "⚠️ Définir une prochaine action MAINTENANT";
    if (l.temperature === "Hot" && l.stage === "Proposition Envoyée" && days >= 3) return "📞 Relancer — proposer un call de closing";
    if (l.temperature === "Hot" && l.stage === "Négociation") return "📄 Envoyer pricelist finale + fixer une deadline";
    if (l.temperature === "Warm" && l.stage === "Proposition Envoyée" && days >= 7) return "📧 Email de suivi avec incitatif";
    if (days >= 5) return "📞 Faire un suivi — deal qui stagne";
    return "👍 Continuer le suivi";
  };

  return (
    <ExpandModal title="Mes deals en cours — Détail" icon="💰" onClose={onClose}>
      <div style={{ marginBottom: 20, background: T.cardAlt, borderRadius: 10, padding: 14 }}>
        <div style={{ fontSize: 12, color: T.textMid, marginBottom: 4 }}>Score = Valeur × (Probabilité/100) × Multiplicateur température ÷ Jours d'inactivité</div>
        <div style={{ fontSize: 11, color: T.textLight }}>Hot=×3 · Warm=×2 · Cold=×1 — Plus le score est élevé, plus le deal est prioritaire</div>
      </div>

      {scored.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: T.textLight }}>Aucun deal en cours de proposition ou négociation</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {scored.map(({ lead, score }, i) => {
            const days = daysSince(lead.last_activity_at);
            const stageColor = STAGE_COLORS[lead.stage];
            const action = getActionSuggestion(lead);
            return (
              <div key={lead.id} className="ws-row-hover" style={{
                padding: "14px 16px", borderRadius: 12, border: `1px solid rgba(0,0,0,0.08)`,
                background: i === 0 ? `${T.main}06` : "#fff", transition: "background 0.15s",
              }} onClick={() => { onClose(); onOpenLead(lead.id); }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${T.main}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: T.main, flexShrink: 0 }}>#{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{lead.company_name}</span>
                      <Chip label={lead.stage} color={stageColor} bg={`${stageColor}18`} />
                      <span style={{ color: TEMP_COLORS[lead.temperature], fontWeight: 700, fontSize: 12 }}>{lead.temperature === "Hot" ? "🔥" : lead.temperature === "Warm" ? "⚡" : "❄️"}</span>
                    </div>
                    <div style={{ fontSize: 12, color: days >= 5 ? T.red : T.textMid, marginBottom: 6 }}>
                      {action}
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: T.textMid }}>
                      <span>Valeur: <strong style={{ color: T.main }}>{fmt(lead.estimated_value)}</strong></span>
                      <span>Prob: <strong>{lead.closing_probability}%</strong></span>
                      <span>Inactivité: <strong style={{ color: days >= 7 ? T.red : T.text }}>{days}j</strong></span>
                      <span style={{ marginLeft: "auto", color: T.textLight, fontSize: 10 }}>Score: {score.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ExpandModal>
  );
}

export function ClientsModal({ leads, onClose, onOpenLead }: { leads: CRMLead[]; onClose: () => void; onOpenLead: (id: string) => void }) {
  const agent = useCurrentAgent();
  const myLeads = useMemo(() => leads.filter(l => l.assigned_agent_id === agent.id), [leads, agent.id]);
  const clients = myLeads.filter(l => l.stage === "Fermé Gagné");
  const now = new Date();

  const clientsWithHealth = clients.map(l => {
    const lastDays = daysSince(l.last_activity_at);
    const health = lastDays <= 30 ? "active" : lastDays <= 90 ? "at_risk" : "inactive";
    const avgFreqDays = 30;
    const nextRestockDays = avgFreqDays - lastDays;
    return { lead: l, lastDays, health, nextRestockDays };
  });

  const activeCount = clientsWithHealth.filter(c => c.health === "active").length;
  const atRiskCount = clientsWithHealth.filter(c => c.health === "at_risk").length;
  const inactiveCount = clientsWithHealth.filter(c => c.health === "inactive").length;
  const newCount = clientsWithHealth.filter(c => daysSince(c.lead.closed_at || c.lead.created_at) <= 90).length;

  const topClients = [...clientsWithHealth].sort((a, b) => (b.lead.estimated_value || 0) - (a.lead.estimated_value || 0)).slice(0, 5);
  const needsContact = [...clientsWithHealth].sort((a, b) => b.lastDays - a.lastDays).slice(0, 8);

  const healthLabels: Record<string, { label: string; color: string }> = {
    active: { label: "🟢 Actif", color: T.green },
    at_risk: { label: "🟡 À risque", color: T.orange },
    inactive: { label: "🔴 Inactif", color: T.red },
  };

  return (
    <ExpandModal title="Mon portefeuille clients — Détail" icon="👥" onClose={onClose}>
      <Section title="Santé du portefeuille" mt={0}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
          {[
            { l: "🟢 Actifs", v: activeCount, c: T.green },
            { l: "🟡 À risque", v: atRiskCount, c: T.orange },
            { l: "🔴 Inactifs", v: inactiveCount, c: T.red },
            { l: "🆕 Nouveaux (3 mois)", v: newCount, c: T.blue },
          ].map((k, i) => (
            <div key={i} style={{ background: T.cardAlt, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: T.textLight, marginBottom: 4 }}>{k.l}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: k.c }}>{k.v}</div>
            </div>
          ))}
        </div>
      </Section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <Section title="Top 5 clients par valeur" mt={0}>
            {topClients.map(({ lead, health }, i) => (
              <div key={lead.id} className="ws-row-hover" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: T.cardAlt, marginBottom: 6, transition: "background 0.15s" }}
                onClick={() => { onClose(); onOpenLead(lead.id); }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: T.textLight, width: 20 }}>#{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{lead.company_name}</div>
                  <div style={{ fontSize: 11, color: T.textLight }}>{healthLabels[health].label}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.main }}>{fmt(lead.estimated_value)}</div>
              </div>
            ))}
          </Section>
        </div>

        <div>
          <Section title="Clients à contacter en priorité" mt={0}>
            {needsContact.map(({ lead, lastDays, health }) => (
              <div key={lead.id} className="ws-row-hover" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: T.cardAlt, marginBottom: 6, transition: "background 0.15s" }}
                onClick={() => { onClose(); onOpenLead(lead.id); }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{lead.company_name}</div>
                  <div style={{ fontSize: 11, color: healthLabels[health].color, fontWeight: 600 }}>il y a {lastDays}j — {healthLabels[health].label}</div>
                </div>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: healthLabels[health].color === T.green ? T.green : healthLabels[health].color === T.orange ? T.orange : T.red, flexShrink: 0 }} />
              </div>
            ))}
          </Section>
        </div>
      </div>

      <Section title="Tous les clients">
        <div style={{ border: `1px solid rgba(0,0,0,0.07)`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "8px 14px", background: T.cardAlt, borderBottom: `1px solid rgba(0,0,0,0.07)` }}>
            {["Client", "Valeur", "Santé", "Dernière activité", "Type"].map((h, i) => (
              <div key={i} style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</div>
            ))}
          </div>
          {clientsWithHealth.map(({ lead, health, lastDays }) => (
            <div key={lead.id} className="ws-row-hover" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "10px 14px", borderBottom: `1px solid rgba(0,0,0,0.06)`, transition: "background 0.15s" }}
              onClick={() => { onClose(); onOpenLead(lead.id); }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{lead.company_name}</div>
                <div style={{ fontSize: 11, color: T.textLight }}>{lead.contact_first_name} {lead.contact_last_name}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", fontSize: 13, fontWeight: 700, color: T.main }}>{fmt(lead.estimated_value)}</div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: healthLabels[health].color, fontWeight: 700 }}>{healthLabels[health].label}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", fontSize: 12, color: lastDays > 60 ? T.red : T.textMid }}>il y a {lastDays}j</div>
              <div style={{ display: "flex", alignItems: "center", fontSize: 12, color: T.textMid }}>{lead.type}</div>
            </div>
          ))}
          {clients.length === 0 && <div style={{ padding: "24px", textAlign: "center", color: T.textLight }}>Aucun client fermé gagné</div>}
        </div>
      </Section>
    </ExpandModal>
  );
}

export function SamplesModal({ samples, leads, onClose }: { samples: SampleRequest[]; leads: CRMLead[]; onClose: () => void }) {
  const now = new Date();
  const active = samples.filter(s => !["Follow-up complété", "Rejeté"].includes(s.status));
  const pending = samples.filter(s => s.status === "En attente d'approbation");
  const sent = samples.filter(s => s.status === "Envoyé");
  const followUp = samples.filter(s => s.status === "Follow-up requis" || (s.status === "Livré" && s.timer_expires_at && new Date(s.timer_expires_at) < now));
  const completed = samples.filter(s => s.status === "Follow-up complété");
  const positifs = samples.filter(s => s.follow_up_result === "Positif").length;

  return (
    <ExpandModal title="Mes Samples — Détail" icon="📦" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 24 }}>
        {[
          { l: "Actifs", v: active.length, c: "#d4a017" },
          { l: "En attente", v: pending.length, c: T.orange },
          { l: "Envoyés", v: sent.length, c: T.blue },
          { l: "Follow-up requis", v: followUp.length, c: followUp.length > 0 ? T.red : T.green },
          { l: "Résultats positifs", v: positifs, c: T.green },
        ].map((k, i) => (
          <div key={i} style={{ background: T.cardAlt, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{k.l}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      {followUp.length > 0 && (
        <div style={{ background: "rgba(239,68,68,0.05)", border: `1px solid rgba(239,68,68,0.2)`, borderRadius: 10, padding: 14, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: T.red, marginBottom: 8, fontSize: 13 }}>⚠️ {followUp.length} sample{followUp.length !== 1 ? "s" : ""} nécessite{followUp.length !== 1 ? "nt" : ""} un follow-up</div>
          {followUp.map(s => {
            const lead = leads.find(l => l.id === s.lead_id);
            return (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid rgba(0,0,0,0.06)`, fontSize: 12 }}>
                <span style={{ fontWeight: 600 }}>{s.company_name || lead?.company_name || "—"}</span>
                <span style={{ color: T.textMid }}>{s.products?.join(", ") || "—"}</span>
                <Chip label="Follow-up requis" color={T.red} bg="rgba(239,68,68,0.1)" />
              </div>
            );
          })}
        </div>
      )}

      <Section title="Tous les samples actifs">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {active.map(s => {
            const statusColors: Record<string, string> = { "En attente d'approbation": T.orange, "Envoyé": T.blue, "Livré": T.green, "Follow-up requis": T.red };
            const color = statusColors[s.status] || T.textMid;
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, background: T.bgCard, border: `1px solid rgba(0,0,0,0.07)` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.company_name || "—"}</div>
                  <div style={{ fontSize: 11, color: T.textLight }}>{s.products?.join(", ") || "—"}</div>
                </div>
                <Chip label={s.status} color={color} bg={`${color}18`} />
                <div style={{ fontSize: 11, color: T.textLight }}>{new Date(s.created_at).toLocaleDateString("fr-CA")}</div>
              </div>
            );
          })}
          {active.length === 0 && <div style={{ textAlign: "center", padding: "20px", color: T.textLight }}>Aucun sample actif</div>}
        </div>
      </Section>
    </ExpandModal>
  );
}

export function CalendarModal({ leads, onClose }: { leads: CRMLead[]; onClose: () => void }) {
  const agent = useCurrentAgent();
  const now = new Date();
  const myLeads = useMemo(() => leads.filter(l => l.assigned_agent_id === agent.id), [leads, agent.id]);
  const todayStr = now.toDateString();

  const todayReminders = myLeads.flatMap(l =>
    (l.reminders || []).filter(r => new Date(r.reminder_at).toDateString() === todayStr && !r.completed)
      .map(r => ({ ...r, leadName: l.company_name, leadId: l.id }))
  ).sort((a, b) => new Date(a.reminder_at).getTime() - new Date(b.reminder_at).getTime());

  const upcomingThisWeek = myLeads.flatMap(l =>
    (l.reminders || []).filter(r => {
      const d = new Date(r.reminder_at);
      const diffDays = (d.getTime() - now.getTime()) / 86400000;
      return !r.completed && diffDays > 0 && diffDays <= 7;
    }).map(r => ({ ...r, leadName: l.company_name, leadId: l.id }))
  ).sort((a, b) => new Date(a.reminder_at).getTime() - new Date(b.reminder_at).getTime());

  const hours = Array.from({ length: 11 }, (_, i) => i + 8);
  const priorityColor: Record<string, string> = { Haute: T.red, Moyenne: T.orange, Basse: T.textMid };

  return (
    <ExpandModal title="Mon calendrier — Vue jour" icon="📅" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            {now.toLocaleDateString("fr-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
          <div style={{ border: `1px solid rgba(0,0,0,0.08)`, borderRadius: 12, overflow: "hidden" }}>
            {hours.map(h => {
              const hourReminders = todayReminders.filter(r => new Date(r.reminder_at).getHours() === h);
              return (
                <div key={h} style={{ display: "flex", borderBottom: `1px solid rgba(0,0,0,0.06)` }}>
                  <div style={{ width: 60, padding: "10px 12px", fontSize: 11, color: T.textLight, flexShrink: 0, borderRight: `1px solid rgba(0,0,0,0.06)`, fontWeight: 600 }}>{h}:00</div>
                  <div style={{ flex: 1, padding: "6px 10px", minHeight: 40 }}>
                    {hourReminders.map(r => (
                      <div key={r.id} style={{ background: `${priorityColor[r.priority]}18`, border: `1px solid ${priorityColor[r.priority]}44`, borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, color: priorityColor[r.priority], marginBottom: 2 }}>
                        {r.title} — {r.leadName}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Aujourd'hui — {todayReminders.length} événement{todayReminders.length !== 1 ? "s" : ""}</div>
          {todayReminders.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: T.textLight, background: T.cardAlt, borderRadius: 10, fontSize: 13 }}>Journée libre!</div>
          ) : (
            todayReminders.map(r => (
              <div key={r.id} style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid rgba(0,0,0,0.07)`, background: T.bgCard, marginBottom: 6 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{r.title}</div>
                <div style={{ fontSize: 11, color: T.textLight }}>{r.leadName} · {new Date(r.reminder_at).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            ))
          )}

          {upcomingThisWeek.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Cette semaine</div>
              {upcomingThisWeek.slice(0, 5).map(r => (
                <div key={r.id} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid rgba(0,0,0,0.06)`, background: T.cardAlt, marginBottom: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: T.textLight }}>{r.leadName} · {new Date(r.reminder_at).toLocaleDateString("fr-CA")}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ExpandModal>
  );
}

export function ScoreModal({ leads, onClose }: { leads: CRMLead[]; onClose: () => void }) {
  const currentAgent = useCurrentAgent();
  const agents = useTeamAgents();
  const myLeads = useMemo(() => leads.filter(l => l.assigned_agent_id === currentAgent.id), [leads, currentAgent.id]);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const closedThisMonth = myLeads.filter(l => l.stage === "Fermé Gagné" && l.closed_at && l.closed_at >= monthStart);
  const newLeadsThisMonth = myLeads.filter(l => l.created_at >= monthStart).length;
  const wonLeads = myLeads.filter(l => l.stage === "Fermé Gagné");
  const convRate = myLeads.length > 0 ? (wonLeads.length / myLeads.length) * 100 : 0;
  const actsThisMonth = myLeads.flatMap(l => (l.activities || []).filter(a => a.activity_at >= monthStart)).length;

  const salesScore = Math.min(100, (closedThisMonth.length / 3) * 100);
  const newClientsScore = Math.min(100, (newLeadsThisMonth / 8) * 100);
  const convScore = Math.min(100, (convRate / 30) * 100);
  const activityScore = Math.min(100, (actsThisMonth / 20) * 100);

  const composite = Math.round(salesScore * 0.4 + newClientsScore * 0.25 + convScore * 0.2 + activityScore * 0.15);
  const scoreColor = composite >= 80 ? T.green : composite >= 60 ? T.main : composite >= 40 ? T.orange : T.red;

  const leaderboard = agents.map(agent => {
    const al = leads.filter(l => l.assigned_agent_id === agent.id);
    const ac = al.filter(l => l.stage === "Fermé Gagné" && l.closed_at && l.closed_at >= monthStart);
    const newL = al.filter(l => l.created_at >= monthStart).length;
    const cr = al.length > 0 ? (al.filter(l => l.stage === "Fermé Gagné").length / al.length) * 100 : 0;
    const acts = al.flatMap(l => (l.activities || []).filter(a => a.activity_at >= monthStart)).length;
    const s = Math.round(Math.min(100, (ac.length / 3) * 100) * 0.4 + Math.min(100, (newL / 8) * 100) * 0.25 + Math.min(100, (cr / 30) * 100) * 0.2 + Math.min(100, (acts / 20) * 100) * 0.15);
    return { agent, score: s };
  }).sort((a, b) => b.score - a.score);

  const myRank = leaderboard.findIndex(l => l.agent.id === currentAgent.id) + 1;

  const weakest = [
    { label: "Ventes", score: salesScore, weight: "40%" },
    { label: "Nouveaux leads", score: newClientsScore, weight: "25%" },
    { label: "Conversion", score: convScore, weight: "20%" },
    { label: "Activité CRM", score: activityScore, weight: "15%" },
  ].sort((a, b) => a.score - b.score)[0];

  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference * (1 - composite / 100);

  return (
    <ExpandModal title="Mon Score & Classement" icon="🏆" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: T.cardAlt, borderRadius: 16, padding: "32px 24px" }}>
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="12" />
            <circle cx="70" cy="70" r="54" fill="none" stroke={scoreColor} strokeWidth="12"
              strokeDasharray={circumference} strokeDashoffset={dashOffset}
              strokeLinecap="round" transform="rotate(-90 70 70)"
              style={{ transition: "stroke-dashoffset 1s ease" }} />
            <text x="70" y="67" textAnchor="middle" fontSize="28" fontWeight="900" fill={scoreColor}>{composite}</text>
            <text x="70" y="85" textAnchor="middle" fontSize="11" fill={T.textLight}>/100</text>
          </svg>
          <div style={{ marginTop: 8, fontSize: 16, fontWeight: 800, color: T.text }}>Score composite</div>
          <div style={{ fontSize: 13, color: T.textMid, marginTop: 4 }}>#{myRank} sur {leaderboard.length} agents</div>
        </div>

        <div style={{ background: T.cardAlt, borderRadius: 16, padding: "24px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Breakdown du score</div>
          {[
            { label: "Ventes", score: salesScore, weight: "40%", color: T.green },
            { label: "Nouveaux leads", score: newClientsScore, weight: "25%", color: T.blue },
            { label: "Conversion", score: convScore, weight: "20%", color: T.orange },
            { label: "Activité CRM", score: activityScore, weight: "15%", color: "#8b5cf6" },
          ].map(item => (
            <div key={item.label} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{item.label}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 11, color: T.textLight }}>{item.weight}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: item.color }}>{item.score.toFixed(0)}/100</span>
                </div>
              </div>
              <HBar value={item.score} max={100} color={item.color} h={8} />
            </div>
          ))}
        </div>
      </div>

      {weakest && (
        <div style={{ background: `${T.orange}12`, border: `1px solid ${T.orange}30`, borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.orange }}>💡 Conseil automatique</div>
          <div style={{ fontSize: 12, color: T.textMid, marginTop: 4 }}>
            Votre composante la plus faible est <strong>{weakest.label}</strong> ({weakest.score.toFixed(0)}/100). Concentrez vos efforts sur cet aspect pour améliorer votre score global.
          </div>
        </div>
      )}

      <Section title="Classement de l'équipe">
        {leaderboard.map(({ agent, score }, i) => (
          <div key={agent.id} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
            borderRadius: 8, background: agent.id === currentAgent.id ? `${T.main}0a` : i === 0 ? "rgba(34,197,94,0.05)" : "transparent",
            border: agent.id === currentAgent.id ? `1px solid ${T.main}22` : "1px solid transparent",
            marginBottom: 6,
          }}>
            <div style={{ width: 24, fontWeight: 800, fontSize: 14, color: i === 0 ? T.green : T.textMid }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</div>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: agent.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{agent.initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: agent.id === currentAgent.id ? 800 : 600 }}>{agent.name}</div>
              <HBar value={score} max={100} color={agent.id === currentAgent.id ? T.main : T.silver} h={4} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: agent.id === currentAgent.id ? T.main : T.textMid }}>{score}/100</div>
          </div>
        ))}
      </Section>
    </ExpandModal>
  );
}
