import { useMemo } from "react";
import { CRMLead } from "../crmTypes";
import { T } from "./workstationTypes";
import { useCurrentAgent } from "../../hooks/useCurrentAgent";
import { useLanguage } from "../../i18n/LanguageContext";

interface Props {
  leads: CRMLead[];
}

const PRIORITY_COLORS: Record<string, string> = {
  Haute: "#ef4444",
  Moyenne: "#f59e0b",
  Basse: "#8e8e93",
};

export default function WidgetCalendar({ leads }: Props) {
  const { t, lang } = useLanguage();
  const agent = useCurrentAgent();
  const now = new Date();
  const todayStr = now.toDateString();

  const myLeads = useMemo(() => leads.filter(l => l.assigned_agent_id === agent.id), [leads, agent.id]);

  const todayEvents = useMemo(() => myLeads.flatMap(l =>
    (l.reminders || [])
      .filter(r => !r.completed && new Date(r.reminder_at).toDateString() === todayStr)
      .map(r => ({ ...r, leadName: l.company_name }))
  ).sort((a, b) => new Date(a.reminder_at).getTime() - new Date(b.reminder_at).getTime()), [myLeads, todayStr]);

  const overdueCount = myLeads.flatMap(l =>
    (l.reminders || []).filter(r => !r.completed && new Date(r.reminder_at) < now)
  ).length;

  const dateLabel = now.toLocaleDateString(lang === "en" ? "en-CA" : "fr-CA", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div style={{
      background: T.card, borderRadius: 16, border: `1px solid ${T.border}`,
      padding: "16px 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      paddingTop: 24,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.main, textTransform: "uppercase", letterSpacing: 0.5 }}>📅 {t("ws.cal.title", "Mon calendrier du jour")}</div>
          <div style={{ fontSize: 11, color: T.textLight, marginTop: 2, textTransform: "capitalize" }}>{dateLabel}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: T.main }}>{todayEvents.length}</div>
          <div style={{ fontSize: 10, color: T.textLight }}>{t("ws.cal.events", "événement(s)")}</div>
        </div>
      </div>

      {overdueCount > 0 && (
        <div style={{ background: "rgba(239,68,68,0.07)", borderRadius: 8, padding: "6px 10px", marginBottom: 10, fontSize: 12, color: T.red, fontWeight: 600 }}>
          ⚠️ {overdueCount} {t("ws.cal.overdue", "reminder(s) en retard")}
        </div>
      )}

      {todayEvents.length === 0 ? (
        <div style={{ fontSize: 12, color: T.textLight, textAlign: "center", padding: "16px 0", background: T.cardAlt, borderRadius: 8 }}>
          🎉 {t("ws.cal.free_day", "Journée libre — aucun événement aujourd'hui")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {todayEvents.slice(0, 5).map(event => {
            const isPast = new Date(event.reminder_at) < now;
            const color = PRIORITY_COLORS[event.priority] || T.textMid;
            return (
              <div key={event.id} style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "8px 10px", borderRadius: 8,
                background: isPast ? "rgba(239,68,68,0.05)" : `${T.main}06`,
                border: `1px solid ${isPast ? "rgba(239,68,68,0.15)" : `${T.main}18`}`,
                opacity: isPast ? 0.7 : 1,
              }}>
                <div style={{ width: 3, borderRadius: 2, alignSelf: "stretch", background: color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.title}</div>
                  <div style={{ fontSize: 10, color: T.textLight }}>{event.leadName}</div>
                </div>
                <div style={{ fontSize: 11, color: T.textMid, flexShrink: 0 }}>
                  {new Date(event.reminder_at).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            );
          })}
          {todayEvents.length > 5 && (
            <div style={{ fontSize: 11, color: T.textLight, textAlign: "center" }}>+{todayEvents.length - 5} {t("ws.cal.others", "autres")}</div>
          )}
        </div>
      )}
    </div>
  );
}
