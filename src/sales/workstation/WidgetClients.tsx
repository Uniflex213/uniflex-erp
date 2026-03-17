import React, { useMemo } from "react";
import { CRMLead } from "../crmTypes";
import { T, fmt, daysSince } from "./workstationTypes";
import { useCurrentAgent } from "../../hooks/useCurrentAgent";

interface Props {
  leads: CRMLead[];
  onOpenLead: (leadId: string) => void;
}

export default function WidgetClients({ leads, onOpenLead }: Props) {
  const agent = useCurrentAgent();
  const myLeads = useMemo(() => leads.filter(l => l.assigned_agent_id === agent.id), [leads, agent.id]);

  const activeClients = useMemo(() =>
    myLeads.filter(l => l.stage === "Fermé Gagné").sort((a, b) => {
      const aDate = a.closed_at || a.last_activity_at;
      const bDate = b.closed_at || b.last_activity_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    }),
    [myLeads]
  );

  const getRestockStatus = (lead: CRMLead): { label: string; color: string; bg: string } => {
    const avgFreqDays = 30;
    const lastOrderDays = daysSince(lead.last_activity_at);
    const daysUntilRestock = avgFreqDays - lastOrderDays;
    if (daysUntilRestock < 0) return { label: "En retard — contacter", color: T.red, bg: "#fee2e2" };
    if (daysUntilRestock <= 7) return { label: "Bientôt", color: T.greenDark, bg: "#dcfce7" };
    return { label: `Dans ~${daysUntilRestock}j`, color: T.textMid, bg: T.cardAlt };
  };

  const thColor = { fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase" as const, letterSpacing: 0.3, padding: "8px 12px", textAlign: "left" as const };
  const tdStyle = { padding: "11px 12px", fontSize: 12, borderBottom: `1px solid ${T.border}` };

  if (activeClients.length === 0) {
    return (
      <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>Mes clients actifs</div>
        <div style={{ color: T.textLight, fontSize: 13, fontStyle: "italic", padding: "16px 0" }}>
          Aucun client actif (deals fermés gagnés)
        </div>
      </div>
    );
  }

  const totalYtd = activeClients.reduce((s, l) => s + l.estimated_value, 0);

  return (
    <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>Mes clients actifs</div>
          <div style={{ fontSize: 12, color: T.textMid, marginTop: 2 }}>
            {activeClients.length} client{activeClients.length !== 1 ? "s" : ""} · {fmt(totalYtd)} total YTD
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {activeClients.filter(l => getRestockStatus(l).label === "En retard — contacter").length > 0 && (
            <span style={{ background: "#fee2e2", color: T.red, padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
              {activeClients.filter(l => getRestockStatus(l).label === "En retard — contacter").length} à contacter
            </span>
          )}
          {activeClients.filter(l => getRestockStatus(l).label === "Bientôt").length > 0 && (
            <span style={{ background: "#dcfce7", color: T.greenDark, padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
              {activeClients.filter(l => getRestockStatus(l).label === "Bientôt").length} bientôt
            </span>
          )}
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 740 }}>
          <thead>
            <tr style={{ background: T.cardAlt }}>
              {["Client", "Dernière activité", "Total (YTD)", "Vol. mensuel objectif", "Fréq. moy.", "Prochain restock", "Statut"].map(h => (
                <th key={h} style={thColor}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeClients.map(lead => {
              const restock = getRestockStatus(lead);
              const lastDays = daysSince(lead.last_activity_at);
              const closedDate = lead.closed_at
                ? new Date(lead.closed_at).toLocaleDateString("fr-CA")
                : new Date(lead.last_activity_at).toLocaleDateString("fr-CA");

              return (
                <tr
                  key={lead.id}
                  onClick={() => onOpenLead(lead.id)}
                  style={{
                    cursor: "pointer",
                    background: restock.label === "En retard — contacter" ? "#fff5f5" : "transparent",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => {
                    if (restock.label !== "En retard — contacter")
                      (e.currentTarget as HTMLElement).style.background = T.cardAlt;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = restock.label === "En retard — contacter" ? "#fff5f5" : "transparent";
                  }}
                >
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 700 }}>{lead.company_name}</div>
                    <div style={{ fontSize: 10, color: T.textLight }}>{lead.type}</div>
                  </td>
                  <td style={{ ...tdStyle, color: lastDays > 30 ? T.orange : T.text }}>
                    {lastDays === 0 ? "Aujourd'hui" : lastDays === 1 ? "Hier" : `Il y a ${lastDays}j`}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: T.main }}>{fmt(lead.estimated_value)}</td>
                  <td style={tdStyle}>{fmt(lead.monthly_volume_goal)}/mois</td>
                  <td style={tdStyle}>~30 jours</td>
                  <td style={tdStyle}>
                    <span style={{
                      background: restock.bg, color: restock.color,
                      padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                    }}>
                      {restock.label}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ background: "#dcfce7", color: "#15803d", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                      Client actif
                    </span>
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
