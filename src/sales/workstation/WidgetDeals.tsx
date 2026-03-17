import React, { useMemo } from "react";
import { CRMLead, STAGE_COLORS, TEMP_COLORS } from "../crmTypes";
import { T, fmt, daysSince } from "./workstationTypes";
import { useCurrentAgent } from "../../hooks/useCurrentAgent";

interface Props {
  leads: CRMLead[];
  onOpenLead: (leadId: string) => void;
}

export default function WidgetDeals({ leads, onOpenLead }: Props) {
  const agent = useCurrentAgent();
  const myLeads = useMemo(() => leads.filter(l => l.assigned_agent_id === agent.id), [leads, agent.id]);

  const dealLeads = useMemo(() =>
    myLeads
      .filter(l => l.stage === "Proposition Envoyée" || l.stage === "Négociation")
      .sort((a, b) => b.estimated_value - a.estimated_value),
    [myLeads]
  );

  const hasNextAction = (lead: CRMLead) => {
    const reminders = lead.reminders || [];
    return reminders.some(r => !r.completed && new Date(r.reminder_at) > new Date());
  };

  const getNextActionLabel = (lead: CRMLead) => {
    const reminders = (lead.reminders || []).filter(r => !r.completed && new Date(r.reminder_at) > new Date());
    if (reminders.length === 0) return null;
    const next = reminders.sort((a, b) => new Date(a.reminder_at).getTime() - new Date(b.reminder_at).getTime())[0];
    return next.title;
  };

  const thColor = { fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase" as const, letterSpacing: 0.3, padding: "8px 12px", textAlign: "left" as const };
  const tdStyle = { padding: "11px 12px", fontSize: 12, borderBottom: `1px solid ${T.border}` };

  if (dealLeads.length === 0) {
    return (
      <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>Deals à closer cette semaine</div>
        <div style={{ color: T.textLight, fontSize: 13, fontStyle: "italic", padding: "16px 0" }}>
          Aucun deal en cours (Proposition envoyée ou Négociation)
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>Deals à closer cette semaine</div>
          <div style={{ fontSize: 12, color: T.textMid, marginTop: 2 }}>
            {dealLeads.length} deal{dealLeads.length !== 1 ? "s" : ""} · valeur totale {fmt(dealLeads.reduce((s, l) => s + l.estimated_value, 0))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ background: "#dcfce7", color: "#15803d", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
            {dealLeads.filter(l => l.closing_probability >= 70).length} chaud{dealLeads.filter(l => l.closing_probability >= 70).length !== 1 ? "s" : ""}
          </span>
          <span style={{ background: "#fef3c7", color: "#92400e", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
            {dealLeads.filter(l => !hasNextAction(l)).length} sans action
          </span>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780 }}>
          <thead>
            <tr style={{ background: T.cardAlt }}>
              {["Lead", "Étape", "Valeur", "Temp.", "Jours dans étape", "Probabilité", "Prochaine action"].map(h => (
                <th key={h} style={thColor}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dealLeads.map(lead => {
              const isHot = lead.closing_probability >= 70;
              const noAction = !hasNextAction(lead);
              const daysInStage = (() => {
                const stageActivity = (lead.activities || [])
                  .filter(a => a.type === "Changement d'étape" && a.stage_to === lead.stage)
                  .sort((a, b) => new Date(b.activity_at).getTime() - new Date(a.activity_at).getTime())[0];
                return stageActivity ? daysSince(stageActivity.activity_at) : daysSince(lead.last_activity_at);
              })();
              const nextAction = getNextActionLabel(lead);

              return (
                <tr
                  key={lead.id}
                  onClick={() => onOpenLead(lead.id)}
                  style={{
                    cursor: "pointer",
                    background: isHot ? "#f0fdf4" : "transparent",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => { if (!isHot) (e.currentTarget as HTMLElement).style.background = T.cardAlt; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isHot ? "#f0fdf4" : "transparent"; }}
                >
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 700 }}>{lead.company_name}</div>
                    <div style={{ fontSize: 10, color: T.textLight }}>{lead.contact_first_name} {lead.contact_last_name}</div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: STAGE_COLORS[lead.stage],
                      background: `${STAGE_COLORS[lead.stage]}15`,
                      padding: "2px 7px", borderRadius: 5,
                    }}>
                      {lead.stage}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 800, color: T.main }}>{fmt(lead.estimated_value)}</td>
                  <td style={tdStyle}>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: TEMP_COLORS[lead.temperature],
                    }}>
                      {lead.temperature === "Hot" ? "🔥" : lead.temperature === "Warm" ? "⚡" : "❄️"} {lead.temperature}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: daysInStage >= 7 ? T.red : T.text }}>
                    {daysInStage}j
                    {daysInStage >= 7 && <span style={{ marginLeft: 4, fontSize: 10, color: T.red }}>!</span>}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ flex: 1, background: "rgba(0,0,0,0.04)", borderRadius: 4, height: 6, overflow: "hidden", minWidth: 50 }}>
                        <div style={{
                          width: `${lead.closing_probability}%`, height: "100%", borderRadius: 4,
                          background: lead.closing_probability >= 70 ? T.green : lead.closing_probability >= 40 ? T.orange : T.red,
                        }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: lead.closing_probability >= 70 ? T.greenDark : T.text }}>
                        {lead.closing_probability}%
                      </span>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    {noAction ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.orange }}>
                        Aucune action planifiée
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: T.text }}>{nextAction}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
