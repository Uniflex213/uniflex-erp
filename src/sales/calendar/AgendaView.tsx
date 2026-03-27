import React from "react";
import { T } from "../../theme";
import { CalendarEvent } from "./calendarTypes";
import { getNextDayEvents, getLabelColor, MONTHS_FR, DAYS_FR } from "./calendarUtils";
import { useLanguage } from "../../i18n/LanguageContext";

interface Props {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export default function AgendaView({ events, onEventClick }: Props) {
  const { t } = useLanguage();
  const groups = getNextDayEvents(events, 60);

  if (groups.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: T.textLight }}>
        <div style={{ fontSize: 40 }}>📅</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{t("cal.agenda.no_events", "Aucun événement à venir")}</div>
        <div style={{ fontSize: 12 }}>{t("cal.agenda.create_hint", "Cliquez sur \"Nouvel événement\" pour en créer un")}</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "0 24px 32px" }}>
      {groups.map(({ date, events: dayEvents }) => {
        const isToday = (() => {
          const now = new Date();
          return date.toDateString() === now.toDateString();
        })();
        const dayName = DAYS_FR[(date.getDay() + 6) % 7];
        const monthName = MONTHS_FR[date.getMonth()];

        return (
          <div key={date.toISOString()} style={{ marginTop: 24 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 12, marginBottom: 10,
              paddingBottom: 8, borderBottom: `2px solid ${isToday ? T.main : T.border}`,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: isToday ? T.main : T.bg,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: isToday ? "#fff" : T.textLight, textTransform: "uppercase" }}>
                  {dayName}
                </span>
                <span style={{ fontSize: 18, fontWeight: 800, color: isToday ? "#fff" : T.text, lineHeight: 1 }}>
                  {date.getDate()}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: isToday ? T.main : T.text }}>
                  {isToday ? t("cal.agenda.today", "Aujourd'hui") : `${dayName} ${date.getDate()} ${monthName}`}
                </div>
                <div style={{ fontSize: 11, color: T.textLight }}>
                  {dayEvents.length} {t("cal.agenda.events", "événement(s)")}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 56 }}>
              {dayEvents.map(ev => {
                const color = getLabelColor(ev.label, ev.label_color);
                const start = new Date(ev.start_at);
                const end = new Date(ev.end_at);

                return (
                  <button
                    key={ev.id}
                    onClick={() => onEventClick(ev)}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 12,
                      padding: "12px 14px", borderRadius: 10,
                      background: T.bgCard, border: `1px solid ${T.border}`,
                      borderLeft: `4px solid ${color}`,
                      cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                      transition: "box-shadow 0.15s",
                      width: "100%",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
                  >
                    <div style={{ width: 46, flexShrink: 0, textAlign: "center" }}>
                      {ev.all_day ? (
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, background: T.bg, borderRadius: 4, padding: "2px 4px" }}>
                          {t("cal.agenda.all_day", "Journée")}
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: 12, fontWeight: 800, color: T.text }}>
                            {start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          <div style={{ fontSize: 10, color: T.textLight }}>
                            {end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ev.title}
                        </span>
                        {ev.importance === "Haute" && (
                          <span style={{ fontSize: 10, color: T.red, fontWeight: 700 }}>▲ {t("cal.agenda.urgent", "URGENT")}</span>
                        )}
                        {ev.source === "google" && (
                          <span style={{ fontSize: 9, color: "#ea4335", fontWeight: 700, background: "#fef2f2", borderRadius: 3, padding: "1px 4px" }}>G</span>
                        )}
                        {ev.source === "crm_reminder" && (
                          <span style={{ fontSize: 9, color: T.main, fontWeight: 700, background: `${T.main}15`, borderRadius: 3, padding: "1px 4px" }}>CRM</span>
                        )}
                      </div>
                      {ev.location && (
                        <div style={{ fontSize: 11, color: T.textMid }}>📍 {ev.location}</div>
                      )}
                      {ev.description && (
                        <div style={{ fontSize: 11, color: T.textLight, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ev.description}
                        </div>
                      )}
                      {ev.lead_name && (
                        <div style={{ fontSize: 10, color: T.main, marginTop: 2, fontWeight: 600 }}>🔗 {ev.lead_name}</div>
                      )}
                    </div>

                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 3 }} />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
