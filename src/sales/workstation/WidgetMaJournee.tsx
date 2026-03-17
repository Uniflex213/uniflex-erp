import React, { useState, useMemo } from "react";
import { CRMLead, CRMReminder } from "../crmTypes";
import { T, daysSince, isToday, isPast, fmt, mkId } from "./workstationTypes";
import { useCurrentAgent } from "../../hooks/useCurrentAgent";

interface Props {
  leads: CRMLead[];
  onOpenLead: (leadId: string) => void;
}

export default function WidgetMaJournee({ leads, onOpenLead }: Props) {
  const agent = useCurrentAgent();
  const myLeads = useMemo(() => leads.filter(l => l.assigned_agent_id === agent.id), [leads, agent.id]);

  const allReminders = useMemo(() => {
    const reminders: (CRMReminder & { leadName: string })[] = [];
    myLeads.forEach(lead => {
      (lead.reminders || []).forEach(r => {
        if (r.assigned_agent_name === agent.name || r.assigned_agent_name === "") {
          reminders.push({ ...r, leadName: lead.company_name });
        }
      });
    });
    return reminders;
  }, [myLeads]);

  const today = new Date().toISOString().slice(0, 10);
  const todayTasks = allReminders.filter(r => isToday(r.reminder_at) || (isPast(r.reminder_at) && !r.completed));
  const overdueTasks = todayTasks.filter(r => !isToday(r.reminder_at) && isPast(r.reminder_at));
  const todayOnly = todayTasks.filter(r => isToday(r.reminder_at));

  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [newTaskText, setNewTaskText] = useState("");
  const [localTasks, setLocalTasks] = useState<Array<{ id: string; title: string; time: string }>>([]);

  const toggleCompleted = (id: string) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const addLocalTask = () => {
    if (!newTaskText.trim()) return;
    setLocalTasks(prev => [...prev, { id: mkId(), title: newTaskText.trim(), time: new Date().toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" }) }]);
    setNewTaskText("");
  };

  const followUpItems = useMemo(() => {
    const items: Array<{ lead: CRMLead; type: "overdue14" | "overdue7" | "negociation" | "proposition"; days: number }> = [];
    myLeads.filter(l => l.stage !== "Fermé Gagné" && l.stage !== "Fermé Perdu").forEach(lead => {
      const days = daysSince(lead.last_activity_at);
      if (lead.stage === "Négociation" && days >= 5) {
        items.push({ lead, type: days >= 14 ? "overdue14" : "negociation", days });
      } else if (lead.stage === "Proposition Envoyée" && days >= 3) {
        items.push({ lead, type: days >= 14 ? "overdue14" : "proposition", days });
      } else if (days >= 14) {
        items.push({ lead, type: "overdue14", days });
      } else if (days >= 7) {
        items.push({ lead, type: "overdue7", days });
      }
    });
    return items.sort((a, b) => b.days - a.days);
  }, [myLeads]);

  const allMyActivities = useMemo(() => {
    const acts: any[] = [];
    myLeads.forEach(lead => { (lead.activities || []).forEach(a => acts.push({ ...a, leadName: lead.company_name })); });
    return acts;
  }, [myLeads]);

  const todayActivities = allMyActivities.filter(a => isToday(a.activity_at));
  const callsToday = todayActivities.filter(a => a.type === "Appel").length;
  const emailsToday = todayActivities.filter(a => a.type === "Email envoyé" || a.type === "Email reçu").length;
  const meetingsToday = todayActivities.filter(a => a.type === "Rencontre / Visite").length;

  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekProposals = allMyActivities
    .filter(a => a.type === "Proposition / Soumission" && new Date(a.activity_at) >= weekStart)
    .reduce((s: number, a: any) => s + (a.proposal_amount || 0), 0);

  const [dailyGoal] = useState(5);
  const totalActivitiesToday = callsToday + emailsToday + meetingsToday;
  const goalPct = Math.min((totalActivitiesToday / dailyGoal) * 100, 100);

  const dateLabel = new Date().toLocaleDateString("fr-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const priorityColor: Record<string, string> = { Haute: T.red, Moyenne: T.orange, Basse: T.textLight };

  const followUpLabel: Record<string, { label: string; color: string; bg: string }> = {
    overdue14: { label: "Inactif +14j", color: T.red, bg: "#fee2e2" },
    overdue7: { label: "Inactif +7j", color: T.orange, bg: "#fef3c7" },
    negociation: { label: "Négo sans activité", color: T.orange, bg: "#fef3c7" },
    proposition: { label: "Prop. sans réponse", color: T.blue, bg: "#eff6ff" },
  };

  return (
    <div style={{ background: `rgba(99,102,241,0.04)`, border: `1.5px solid rgba(99,102,241,0.15)`, borderRadius: 16, padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: T.main }}>
          Bonjour {agent.firstName} — voici votre journée du {dateLabel}
        </div>
        <div style={{ fontSize: 13, color: T.textMid, marginTop: 4 }}>
          {todayTasks.length} tâche{todayTasks.length !== 1 ? "s" : ""} • {followUpItems.length} suivi{followUpItems.length !== 1 ? "s" : ""} recommandé{followUpItems.length !== 1 ? "s" : ""} • {totalActivitiesToday}/{dailyGoal} activités aujourd'hui
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
        {/* Col 1: Tâches */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 }}>
            Tâches du jour
          </div>

          {overdueTasks.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              {overdueTasks.map(r => (
                <TaskItem
                  key={r.id}
                  id={r.id}
                  title={r.title}
                  time={new Date(r.reminder_at).toLocaleDateString("fr-CA")}
                  leadName={r.leadName}
                  leadId={r.lead_id}
                  completed={completed.has(r.id)}
                  isOverdue
                  priority={(r as any).priority}
                  onToggle={toggleCompleted}
                  onOpenLead={onOpenLead}
                  priorityColor={priorityColor}
                />
              ))}
            </div>
          )}

          {todayOnly.length === 0 && overdueTasks.length === 0 && localTasks.length === 0 && (
            <div style={{ color: T.textLight, fontSize: 13, fontStyle: "italic", marginBottom: 12 }}>
              Aucune tâche prévue aujourd'hui
            </div>
          )}

          {todayOnly.map(r => (
            <TaskItem
              key={r.id}
              id={r.id}
              title={r.title}
              time={new Date(r.reminder_at).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}
              leadName={r.leadName}
              leadId={r.lead_id}
              completed={completed.has(r.id)}
              isOverdue={false}
              priority={(r as any).priority}
              onToggle={toggleCompleted}
              onOpenLead={onOpenLead}
              priorityColor={priorityColor}
            />
          ))}

          {localTasks.map(t => (
            <div key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8, padding: "8px 10px", background: T.card, borderRadius: 8, border: `1px solid ${T.border}` }}>
              <input type="checkbox" style={{ marginTop: 2, accentColor: T.main }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{t.title}</div>
                <div style={{ fontSize: 11, color: T.textLight }}>{t.time}</div>
              </div>
            </div>
          ))}

          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <input
              placeholder="+ Ajouter une tâche rapide"
              value={newTaskText}
              onChange={e => setNewTaskText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addLocalTask()}
              style={{ flex: 1, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "7px 10px", fontSize: 12, fontFamily: "inherit", outline: "none" }}
            />
            <button
              onClick={addLocalTask}
              style={{ background: T.main, color: "#fff", border: "none", borderRadius: 8, padding: "0 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              +
            </button>
          </div>
        </div>

        {/* Col 2: Suivis à faire */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.6 }}>
              Suivis recommandés
            </div>
            {followUpItems.length > 0 && (
              <span style={{ background: T.orange, color: "#fff", borderRadius: 20, fontSize: 10, fontWeight: 800, padding: "2px 7px" }}>
                {followUpItems.length}
              </span>
            )}
          </div>

          {followUpItems.length === 0 && (
            <div style={{ color: T.textLight, fontSize: 13, fontStyle: "italic" }}>
              Tous vos leads sont à jour
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
            {followUpItems.map(({ lead, type, days }) => {
              const info = followUpLabel[type];
              return (
                <div
                  key={lead.id}
                  onClick={() => onOpenLead(lead.id)}
                  style={{
                    background: info.bg,
                    border: `1px solid ${info.color}33`,
                    borderRadius: 8,
                    padding: "8px 10px",
                    cursor: "pointer",
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{lead.company_name}</div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: info.color, background: `${info.color}22`, padding: "2px 6px", borderRadius: 4 }}>
                      {info.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: T.textMid, marginTop: 2 }}>
                    {lead.stage} · Inactif depuis {days} jour{days !== 1 ? "s" : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Col 3: Résumé */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 }}>
            Résumé du jour
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            {[
              { label: "Appels", value: callsToday, icon: "📞" },
              { label: "Emails", value: emailsToday, icon: "📧" },
              { label: "Rencontres", value: meetingsToday, icon: "🤝" },
              { label: "Propositions/sem.", value: fmt(weekProposals), icon: "💰" },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{ background: T.card, borderRadius: 10, padding: "10px 12px", border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 16 }}>{icon}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: T.main, marginTop: 2 }}>{value}</div>
                <div style={{ fontSize: 10, color: T.textLight, fontWeight: 600 }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ background: T.card, borderRadius: 10, padding: "12px 14px", border: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Objectif quotidien</div>
              <div style={{ fontSize: 12, color: goalPct >= 100 ? T.green : T.textMid, fontWeight: 700 }}>
                {totalActivitiesToday}/{dailyGoal} activités
              </div>
            </div>
            <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: 6, height: 8, overflow: "hidden" }}>
              <div style={{
                width: `${goalPct}%`, height: "100%", borderRadius: 6, transition: "width 0.3s",
                background: goalPct >= 100 ? T.green : goalPct >= 60 ? T.orange : T.main,
              }} />
            </div>
            <div style={{ fontSize: 11, color: T.textLight, marginTop: 6 }}>
              {goalPct >= 100 ? "Objectif atteint !" : `${dailyGoal - totalActivitiesToday} activité${dailyGoal - totalActivitiesToday !== 1 ? "s" : ""} restante${dailyGoal - totalActivitiesToday !== 1 ? "s" : ""}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskItem({
  id, title, time, leadName, leadId, completed, isOverdue, priority, onToggle, onOpenLead, priorityColor,
}: {
  id: string; title: string; time: string; leadName: string; leadId: string;
  completed: boolean; isOverdue: boolean; priority: string;
  onToggle: (id: string) => void; onOpenLead: (id: string) => void;
  priorityColor: Record<string, string>;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8,
      padding: "8px 10px", background: isOverdue ? "#fff1f2" : T.card,
      borderRadius: 8, border: `1px solid ${isOverdue ? "#fecaca" : T.border}`,
      opacity: completed ? 0.5 : 1, transition: "opacity 0.2s",
    }}>
      <input
        type="checkbox"
        checked={completed}
        onChange={() => onToggle(id)}
        style={{ marginTop: 2, accentColor: T.main }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        {isOverdue && (
          <span style={{ fontSize: 9, fontWeight: 800, color: "#991b1b", background: "#fee2e2", padding: "1px 5px", borderRadius: 3, marginRight: 4 }}>
            EN RETARD
          </span>
        )}
        <div style={{ fontSize: 12, fontWeight: 600, textDecoration: completed ? "line-through" : "none", color: T.text }}>
          {title}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 2, alignItems: "center" }}>
          <span style={{ fontSize: 10, color: T.textLight }}>{time}</span>
          <span style={{ fontSize: 10, color: T.textLight }}>·</span>
          <span
            onClick={e => { e.stopPropagation(); onOpenLead(leadId); }}
            style={{ fontSize: 10, color: "#6366f1", cursor: "pointer", fontWeight: 600 }}
          >
            {leadName}
          </span>
          {priority && (
            <span style={{ fontSize: 9, fontWeight: 800, color: priorityColor[priority] || T.textLight }}>
              {priority}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
