import React, { useRef } from "react";
import { T } from "../../theme";
import { CalendarEvent } from "./calendarTypes";
import { DAYS_FR, MONTHS_FR, getWeekDays, isToday, isSameDay, getLabelColor } from "./calendarUtils";

const HOUR_START = 6;
const HOUR_END = 22;
const HOUR_HEIGHT = 64;
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

interface Props {
  currentDate: Date;
  events: CalendarEvent[];
  onSlotClick: (date: Date, hour?: number) => void;
  onEventClick: (event: CalendarEvent) => void;
  singleDay?: boolean;
}

function getEventTop(event: CalendarEvent): number {
  const start = new Date(event.start_at);
  const hours = start.getHours() + start.getMinutes() / 60 - HOUR_START;
  return Math.max(0, hours * HOUR_HEIGHT);
}

function getEventHeight(event: CalendarEvent): number {
  const durationHours = (new Date(event.end_at).getTime() - new Date(event.start_at).getTime()) / 3600000;
  return Math.max(20, durationHours * HOUR_HEIGHT);
}

function getEventsForColumn(events: CalendarEvent[], day: Date): { timed: CalendarEvent[]; allDay: CalendarEvent[] } {
  const allDay: CalendarEvent[] = [];
  const timed: CalendarEvent[] = [];
  events.forEach(ev => {
    const start = new Date(ev.start_at);
    const end = new Date(ev.end_at);
    const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);
    if (start <= dayEnd && end >= dayStart) {
      if (ev.all_day) allDay.push(ev);
      else timed.push(ev);
    }
  });
  return { timed, allDay };
}

export default function WeekView({ currentDate, events, onSlotClick, onEventClick, singleDay = false }: Props) {
  const days = singleDay ? [currentDate] : getWeekDays(currentDate);
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", borderBottom: `2px solid ${T.border}`, background: "#fafafa", flexShrink: 0 }}>
        <div style={{ width: 52, flexShrink: 0 }} />
        {days.map((day, i) => {
          const today = isToday(day);
          return (
            <div
              key={i}
              style={{
                flex: 1, padding: "8px 4px", textAlign: "center", cursor: "pointer",
                borderLeft: `1px solid ${T.border}`,
              }}
              onClick={() => onSlotClick(day)}
            >
              <div style={{ fontSize: 10, color: today ? T.main : T.textLight, fontWeight: 700, textTransform: "uppercase" }}>
                {DAYS_FR[(day.getDay() + 6) % 7]}
              </div>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: today ? T.main : "transparent",
                color: today ? "#fff" : T.text,
                fontSize: 14, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "2px auto 0",
              }}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", background: "rgba(0,0,0,0.03)", borderBottom: `1px solid ${T.border}`, flexShrink: 0, minHeight: 24 }}>
        <div style={{ width: 52, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6 }}>
          <span style={{ fontSize: 9, color: T.textLight }}>All day</span>
        </div>
        {days.map((day, i) => {
          const { allDay } = getEventsForColumn(events, day);
          return (
            <div key={i} style={{ flex: 1, borderLeft: `1px solid ${T.border}`, padding: "2px 3px", display: "flex", flexDirection: "column", gap: 2 }}>
              {allDay.map(ev => {
                const color = getLabelColor(ev.label, ev.label_color);
                return (
                  <button
                    key={ev.id}
                    onClick={() => onEventClick(ev)}
                    style={{
                      width: "100%", padding: "2px 4px", borderRadius: 3, border: "none",
                      background: color, color: "#fff", fontSize: 9, fontWeight: 700,
                      textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}
                  >
                    {ev.title}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflow: "auto" }}>
        <div style={{ display: "flex", position: "relative" }}>
          <div style={{ width: 52, flexShrink: 0 }}>
            {HOURS.map(h => (
              <div
                key={h}
                style={{ height: HOUR_HEIGHT, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", paddingRight: 8, paddingTop: 2 }}
              >
                <span style={{ fontSize: 9, color: T.textLight, fontWeight: 600 }}>
                  {h < 10 ? `0${h}` : h}h
                </span>
              </div>
            ))}
          </div>

          {days.map((day, di) => {
            const { timed } = getEventsForColumn(events, day);
            const today = isToday(day);

            return (
              <div
                key={di}
                style={{ flex: 1, borderLeft: `1px solid ${T.border}`, position: "relative" }}
                onClick={e => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const hour = Math.floor(y / HOUR_HEIGHT) + HOUR_START;
                  const clickDate = new Date(day);
                  clickDate.setHours(hour, 0, 0, 0);
                  onSlotClick(clickDate, hour);
                }}
              >
                {today && (
                  <div style={{
                    position: "absolute", left: 0, right: 0, height: 2,
                    background: T.main, zIndex: 5,
                    top: (() => {
                      const now = new Date();
                      return (now.getHours() + now.getMinutes() / 60 - HOUR_START) * HOUR_HEIGHT;
                    })(),
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.main, marginTop: -3, marginLeft: -4 }} />
                  </div>
                )}

                {HOURS.map((h, hi) => (
                  <div key={h} style={{ height: HOUR_HEIGHT, borderBottom: `1px solid ${T.border}`, position: "relative" }}>
                    <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: T.border, opacity: 0.4, borderStyle: "dashed" }} />
                  </div>
                ))}

                {timed.map(ev => {
                  const color = getLabelColor(ev.label, ev.label_color);
                  const top = getEventTop(ev);
                  const height = getEventHeight(ev);
                  const start = new Date(ev.start_at);
                  const end = new Date(ev.end_at);
                  return (
                    <button
                      key={ev.id}
                      onClick={e => { e.stopPropagation(); onEventClick(ev); }}
                      style={{
                        position: "absolute", left: 2, right: 2, top,
                        height: Math.max(height, 20),
                        background: `${color}25`, border: `1.5px solid ${color}`,
                        borderLeft: `4px solid ${color}`,
                        borderRadius: 6, padding: "3px 6px", cursor: "pointer",
                        textAlign: "left", fontFamily: "inherit", overflow: "hidden",
                        zIndex: 2, transition: "opacity 0.1s",
                        display: "flex", flexDirection: "column", gap: 1,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                          {ev.title}
                        </span>
                        {ev.importance === "Haute" && <span style={{ color: T.red, fontSize: 9 }}>▲</span>}
                        {ev.source === "google" && <span style={{ fontSize: 9, color: "#ea4335" }}>G</span>}
                      </div>
                      {height > 32 && (
                        <div style={{ fontSize: 9, color: T.textLight }}>
                          {start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} –{" "}
                          {end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      )}
                      {height > 48 && ev.location && (
                        <div style={{ fontSize: 9, color: T.textLight, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          📍 {ev.location}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
