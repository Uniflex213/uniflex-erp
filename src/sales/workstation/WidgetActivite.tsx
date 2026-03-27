import React, { useMemo } from "react";
import { CRMLead, ACTIVITY_ICONS, ActivityType } from "../crmTypes";
import { T, timeAgo, isToday } from "./workstationTypes";
import { useCurrentAgent } from "../../hooks/useCurrentAgent";
import { useLanguage } from "../../i18n/LanguageContext";

interface Props {
  leads: CRMLead[];
  onOpenLead: (leadId: string) => void;
}

export default function WidgetActivite({ leads, onOpenLead }: Props) {
  const { t } = useLanguage();
  const agent = useCurrentAgent();
  const myLeads = useMemo(() => leads.filter(l => l.assigned_agent_id === agent.id), [leads, agent.id]);

  const allActivities = useMemo(() => {
    const acts: Array<{ leadId: string; leadName: string; type: ActivityType; title: string; description: string; activity_at: string }> = [];
    myLeads.forEach(lead => {
      (lead.activities || []).forEach(a => {
        acts.push({
          leadId: lead.id,
          leadName: lead.company_name,
          type: a.type,
          title: a.title,
          description: a.description,
          activity_at: a.activity_at,
        });
      });
    });
    return acts.sort((a, b) => new Date(b.activity_at).getTime() - new Date(a.activity_at).getTime()).slice(0, 12);
  }, [myLeads]);

  const grouped = useMemo(() => {
    const today: typeof allActivities = [];
    const yesterday: typeof allActivities = [];
    const older: typeof allActivities = [];
    const yd = new Date(); yd.setDate(yd.getDate() - 1);
    allActivities.forEach(a => {
      const d = new Date(a.activity_at);
      if (isToday(a.activity_at)) today.push(a);
      else if (d.toDateString() === yd.toDateString()) yesterday.push(a);
      else older.push(a);
    });
    return { today, yesterday, older };
  }, [allActivities]);

  const actTypeColors: Partial<Record<ActivityType, { bg: string; border: string }>> = {
    "Appel": { bg: "#dcfce7", border: "#22c55e" },
    "Email envoyé": { bg: "#dbeafe", border: "#3b82f6" },
    "Email reçu": { bg: "#e0f2fe", border: "#0891b2" },
    "Rencontre / Visite": { bg: "#fef3c7", border: "#f59e0b" },
    "Proposition / Soumission": { bg: "#fde8d8", border: "#d97706" },
    "Note interne": { bg: "#f3e8ff", border: "#8b5cf6" },
    "Changement d'étape": { bg: "#e0e7ff", border: "#6366f1" },
    "Pricelist envoyée": { bg: "#ffe4e6", border: "#f43f5e" },
    "Fermé Gagné": { bg: "#dcfce7", border: "#22c55e" },
  };

  const renderGroup = (label: string, items: typeof allActivities) => {
    if (items.length === 0) return null;
    return (
      <div key={label}>
        <div style={{ fontSize: 10, fontWeight: 800, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginTop: 12 }}>
          {label}
        </div>
        {items.map((a, i) => {
          const colors = actTypeColors[a.type] || { bg: T.cardAlt, border: T.border };
          return (
            <div
              key={i}
              onClick={() => onOpenLead(a.leadId)}
              style={{
                display: "flex", gap: 10, alignItems: "flex-start",
                padding: "9px 10px", marginBottom: 6,
                background: T.cardAlt, borderRadius: 9,
                border: `1px solid ${T.border}`, cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#eef0f8")}
              onMouseLeave={e => (e.currentTarget.style.background = T.cardAlt)}
            >
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: colors.bg, border: `1px solid ${colors.border}33`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14,
              }}>
                {ACTIVITY_ICONS[a.type] || "📌"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.leadName}
                  </span>
                  <span style={{ fontSize: 10, color: T.textLight, flexShrink: 0, marginLeft: 8 }}>
                    {timeAgo(a.activity_at)}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: T.textMid, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.title}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: T.text }}>{t("ws.activity.title", "Activité récente")}</div>
        <span style={{ fontSize: 11, color: T.textLight, fontWeight: 600 }}>{allActivities.length} {t("ws.activity.activities", "activités")}</span>
      </div>
      <div style={{ fontSize: 12, color: T.textMid, marginBottom: 12 }}>
        {t("ws.activity.subtitle", "Vos dernières actions tous leads confondus")}
      </div>
      <div style={{ maxHeight: 400, overflowY: "auto" }}>
        {allActivities.length === 0 ? (
          <div style={{ color: T.textLight, fontSize: 13, fontStyle: "italic", textAlign: "center", padding: "32px 0" }}>
            {t("ws.activity.none", "Aucune activité enregistrée")}
          </div>
        ) : (
          <>
            {renderGroup(t("ws.activity.today", "Aujourd'hui"), grouped.today)}
            {renderGroup(t("ws.activity.yesterday", "Hier"), grouped.yesterday)}
            {renderGroup(t("ws.activity.earlier", "Cette semaine / Plus tôt"), grouped.older)}
          </>
        )}
      </div>
    </div>
  );
}
