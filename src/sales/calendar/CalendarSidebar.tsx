import React, { useState } from "react";
import { T } from "../../theme";
import { DEFAULT_LABELS, EventLabel } from "./calendarTypes";
import {
  DAYS_FR, MONTHS_FR, addDays, addMonths, getMonthGrid,
  isSameDay, isToday, startOfMonth,
} from "./calendarUtils";
import { useLanguage } from "../../i18n/LanguageContext";

interface Props {
  currentDate: Date;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  filters: { labels: Record<string, boolean>; showGoogle: boolean; showCRM: boolean; showUniflexCal: boolean };
  onFiltersChange: (f: Props["filters"]) => void;
  googleConnected: boolean;
  customLabels: EventLabel[];
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function MiniCalendar({ month, selectedDate, onSelectDate }: {
  month: Date;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
}) {
  const [displayMonth, setDisplayMonth] = useState(new Date(month));
  const grid = getMonthGrid(displayMonth);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <button
          onClick={() => setDisplayMonth(addMonths(displayMonth, -1))}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: T.textLight, padding: "2px 6px" }}
        >
          ‹
        </button>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>
          {MONTHS_FR[displayMonth.getMonth()].slice(0, 3)} {displayMonth.getFullYear()}
        </span>
        <button
          onClick={() => setDisplayMonth(addMonths(displayMonth, 1))}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: T.textLight, padding: "2px 6px" }}
        >
          ›
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
        {DAYS_FR.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 9, fontWeight: 700, color: T.textLight, padding: "2px 0" }}>
            {d[0]}
          </div>
        ))}
        {grid.map((day, i) => {
          const isCurrentMonth = day.getMonth() === displayMonth.getMonth();
          const today = isToday(day);
          const selected = isSameDay(day, selectedDate);
          return (
            <button
              key={i}
              onClick={() => onSelectDate(day)}
              style={{
                width: "100%", aspectRatio: "1", border: "none", borderRadius: 4,
                background: today ? T.main : selected ? `${T.main}20` : "transparent",
                color: today ? "#fff" : !isCurrentMonth ? "#d1d5db" : T.text,
                fontSize: 9, fontWeight: today || selected ? 700 : 400,
                cursor: "pointer", padding: 0,
                transition: "all 0.1s",
              }}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarSidebar({
  currentDate, selectedDate, onSelectDate,
  filters, onFiltersChange,
  googleConnected, customLabels, collapsed, onToggleCollapse,
}: Props) {
  const { t } = useLanguage();
  const allLabels = [...DEFAULT_LABELS, ...customLabels];
  const activeFilterCount = Object.values(filters.labels).filter(Boolean).length;

  if (collapsed) {
    return (
      <div style={{
        width: 36, flexShrink: 0, background: T.bgCard, borderRight: `1px solid ${T.border}`,
        display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12, gap: 8,
      }}>
        <button
          onClick={onToggleCollapse}
          title={t("cal.sidebar.open", "Ouvrir le panneau")}
          style={{
            background: "none", border: "none", cursor: "pointer", fontSize: 16,
            color: T.textLight, padding: 4, borderRadius: 6,
          }}
        >
          ›
        </button>
        {activeFilterCount > 0 && (
          <div style={{
            width: 18, height: 18, borderRadius: "50%", background: T.main,
            color: "#fff", fontSize: 9, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {activeFilterCount}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      width: 220, flexShrink: 0, background: T.bgCard, borderRight: `1px solid ${T.border}`,
      display: "flex", flexDirection: "column", overflowY: "auto",
    }}>
      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{t("cal.sidebar.navigation", "Navigation")}</span>
        <button
          onClick={onToggleCollapse}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: T.textLight, padding: "2px 4px" }}
        >
          ‹
        </button>
      </div>

      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}` }}>
        <MiniCalendar
          month={currentDate}
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
        />
      </div>

      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
          {t("cal.sidebar.calendars", "Calendriers")}
        </div>
        {[
          { key: "showUniflexCal", label: t("cal.sidebar.my_cal", "Mon calendrier"), color: T.main, always: true },
          { key: "showGoogle", label: t("cal.sidebar.google_cal", "Google Calendar"), color: "#ea4335", disabled: !googleConnected },
          { key: "showCRM", label: t("cal.sidebar.crm_reminders", "Rappels CRM"), color: "#2563eb", always: false },
        ].map(({ key, label, color, disabled, always }) => (
          <label
            key={key}
            style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 7,
              cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1,
            }}
          >
            <input
              type="checkbox"
              checked={!!filters[key as keyof typeof filters]}
              onChange={e => !disabled && onFiltersChange({ ...filters, [key]: e.target.checked })}
              disabled={disabled}
              style={{ display: "none" }}
            />
            <div style={{
              width: 12, height: 12, borderRadius: 3, background: filters[key as keyof typeof filters] ? color : "#e5e7eb",
              border: `1.5px solid ${color}`, flexShrink: 0, transition: "all 0.15s",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {filters[key as keyof typeof filters] && (
                <div style={{ width: 6, height: 6, background: T.bgCard, borderRadius: 1 }} />
              )}
            </div>
            <span style={{ fontSize: 11, color: T.text }}>{label}</span>
            {disabled && <span style={{ fontSize: 9, color: T.textLight }}>{t("cal.sidebar.not_connected", "(non connecté)")}</span>}
          </label>
        ))}
      </div>

      <div style={{ padding: "12px 14px", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Labels
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={() => onFiltersChange({ ...filters, labels: {} })}
              style={{ fontSize: 9, color: T.main, background: "none", border: "none", cursor: "pointer" }}
            >
              {t("cal.sidebar.show_all", "Tout afficher")}
            </button>
          )}
        </div>
        {allLabels.map(label => {
          const active = !!filters.labels[label.key];
          return (
            <label
              key={label.key}
              style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={e => {
                  const newLabels = { ...filters.labels, [label.key]: e.target.checked };
                  if (!e.target.checked) delete newLabels[label.key];
                  onFiltersChange({ ...filters, labels: newLabels });
                }}
                style={{ display: "none" }}
              />
              <div style={{
                width: 10, height: 10, borderRadius: "50%",
                background: active ? label.color : "transparent",
                border: `2px solid ${label.color}`,
                flexShrink: 0, transition: "all 0.15s",
              }} />
              <span style={{ fontSize: 11, color: active ? T.text : T.textLight }}>{label.name}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
