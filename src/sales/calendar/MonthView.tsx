import React, { useState } from "react";
import { T } from "../../theme";
import { CalendarEvent } from "./calendarTypes";
import {
  DAYS_FR, MONTHS_FR, getMonthGrid, getEventsForDay,
  isSameDay, isToday, getLabelColor,
} from "./calendarUtils";

interface Props {
  currentDate: Date;
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

function OverflowModal({ date, events, onClose, onEventClick }: {
  date: Date;
  events: CalendarEvent[];
  onClose: () => void;
  onEventClick: (ev: CalendarEvent) => void;
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: T.bgCard, borderRadius: 12, padding: "20px", minWidth: 280, maxWidth: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>
            {date.getDate()} {MONTHS_FR[date.getMonth()]}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: T.textLight }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {events.map(ev => {
            const color = getLabelColor(ev.label, ev.label_color);
            const start = new Date(ev.start_at);
            return (
              <button
                key={ev.id}
                onClick={() => { onEventClick(ev); onClose(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                  background: `${color}15`, border: `1px solid ${color}40`,
                  borderRadius: 8, cursor: "pointer", textAlign: "left",
                  width: "100%", fontFamily: "inherit",
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{ev.title}</div>
                  {!ev.all_day && (
                    <div style={{ fontSize: 10, color: T.textLight }}>
                      {start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  )}
                </div>
                {ev.importance === "Haute" && <span style={{ color: T.red, fontSize: 10 }}>▲</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function MonthView({ currentDate, events, onDayClick, onEventClick }: Props) {
  const [overflowDay, setOverflowDay] = useState<{ date: Date; events: CalendarEvent[] } | null>(null);
  const grid = getMonthGrid(currentDate);
  const weeks: Date[][] = [];
  for (let i = 0; i < grid.length; i += 7) {
    weeks.push(grid.slice(i, i + 7));
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: `2px solid ${T.border}`, background: "#fafafa" }}>
        {DAYS_FR.map(d => (
          <div key={d} style={{
            padding: "10px 8px", textAlign: "center",
            fontSize: 11, fontWeight: 800, color: T.textLight,
            textTransform: "uppercase", letterSpacing: 0.5,
          }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
        {weeks.map((week, wi) => (
          <div
            key={wi}
            style={{
              display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
              flex: 1, minHeight: 100,
              borderBottom: wi < weeks.length - 1 ? `1px solid ${T.border}` : "none",
            }}
          >
            {week.map((day, di) => {
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const today = isToday(day);
              const dayEvents = getEventsForDay(events, day).sort(
                (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
              );
              const visibleEvents = dayEvents.slice(0, 3);
              const hiddenCount = dayEvents.length - visibleEvents.length;

              return (
                <div
                  key={di}
                  onClick={() => onDayClick(day)}
                  style={{
                    padding: "6px 6px 4px",
                    borderRight: di < 6 ? `1px solid ${T.border}` : "none",
                    background: today ? `${T.main}06` : "transparent",
                    cursor: "pointer",
                    minHeight: 90,
                    transition: "background 0.1s",
                    position: "relative",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = today ? `${T.main}10` : "#f9fafb"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = today ? `${T.main}06` : "transparent"; }}
                >
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: today ? T.main : "transparent",
                      color: today ? "#fff" : isCurrentMonth ? T.text : "#c9cdd4",
                      fontSize: 11, fontWeight: today ? 800 : isCurrentMonth ? 500 : 400,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {day.getDate()}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {visibleEvents.map(ev => {
                      const color = getLabelColor(ev.label, ev.label_color);
                      const start = new Date(ev.start_at);
                      return (
                        <button
                          key={ev.id}
                          onClick={e => { e.stopPropagation(); onEventClick(ev); }}
                          style={{
                            display: "flex", alignItems: "center", gap: 4,
                            padding: "2px 5px", borderRadius: 4, border: "none",
                            background: `${color}20`, cursor: "pointer",
                            textAlign: "left", width: "100%", fontFamily: "inherit",
                          }}
                        >
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                          <span style={{
                            fontSize: 10, color: T.text, fontWeight: 600,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
                          }}>
                            {!ev.all_day && (
                              <span style={{ color: T.textLight, marginRight: 3 }}>
                                {start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                            {ev.title}
                          </span>
                          {ev.importance === "Haute" && <span style={{ color: T.red, fontSize: 8, flexShrink: 0 }}>▲</span>}
                          {ev.source === "google" && <span style={{ fontSize: 8, flexShrink: 0 }}>G</span>}
                        </button>
                      );
                    })}
                    {hiddenCount > 0 && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setOverflowDay({ date: day, events: dayEvents });
                        }}
                        style={{
                          fontSize: 10, color: T.main, fontWeight: 700,
                          background: "none", border: "none", cursor: "pointer",
                          textAlign: "left", padding: "1px 5px", fontFamily: "inherit",
                        }}
                      >
                        +{hiddenCount} autre{hiddenCount > 1 ? "s" : ""}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {overflowDay && (
        <OverflowModal
          date={overflowDay.date}
          events={overflowDay.events}
          onClose={() => setOverflowDay(null)}
          onEventClick={onEventClick}
        />
      )}
    </div>
  );
}
