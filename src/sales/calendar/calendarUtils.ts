import { CalendarEvent, DEFAULT_LABELS, EventLabel } from "./calendarTypes";

export const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
export const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

export function parseDateTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00`);
}

export function fmtDayFull(date: Date): string {
  return `${DAYS_FR[(date.getDay() + 6) % 7]} ${date.getDate()} ${MONTHS_FR[date.getMonth()]} ${date.getFullYear()}`;
}

export function fmtMonthYear(date: Date): string {
  return `${MONTHS_FR[date.getMonth()]} ${date.getFullYear()}`;
}

export function fmtShortDate(date: Date): string {
  return `${date.getDate()} ${MONTHS_FR[date.getMonth()].slice(0, 3)}.`;
}

export function getMonthGrid(date: Date): Date[] {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const firstDay = (start.getDay() + 6) % 7;
  const days: Date[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    days.push(addDays(start, -(i + 1)));
  }
  const cur = new Date(start);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  while (days.length % 7 !== 0) {
    days.push(addDays(days[days.length - 1], 1));
  }
  return days;
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function getEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter(ev => {
    const start = new Date(ev.start_at);
    const end = new Date(ev.end_at);
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    return start <= dayEnd && end >= dayStart;
  });
}

export function getLabelColor(labelKey: string, labelColor?: string): string {
  if (labelColor && labelKey.startsWith("custom_")) return labelColor;
  const found = DEFAULT_LABELS.find(l => l.key === labelKey);
  return found?.color ?? "#2563eb";
}

export function getLabelName(labelKey: string, customLabels: EventLabel[]): string {
  const custom = customLabels.find(l => l.key === labelKey);
  if (custom) return custom.name;
  const def = DEFAULT_LABELS.find(l => l.key === labelKey);
  return def?.name ?? labelKey;
}

export function eventDurationMinutes(event: CalendarEvent): number {
  return (new Date(event.end_at).getTime() - new Date(event.start_at).getTime()) / 60000;
}

export function getNextDayEvents(events: CalendarEvent[], days: number): { date: Date; events: CalendarEvent[] }[] {
  const result: { date: Date; events: CalendarEvent[] }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < days; i++) {
    const day = addDays(today, i);
    const dayEvents = getEventsForDay(events, day).sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    );
    if (dayEvents.length > 0) {
      result.push({ date: day, events: dayEvents });
    }
  }
  return result;
}

export function filterEvents(
  events: CalendarEvent[],
  filters: { labels: Record<string, boolean>; showGoogle: boolean; showCRM: boolean; showUniflexCal: boolean }
): CalendarEvent[] {
  return events.filter(ev => {
    if (ev.source === "google" && !filters.showGoogle) return false;
    if (ev.source === "crm_reminder" && !filters.showCRM) return false;
    if (ev.source === "uniflex" && !filters.showUniflexCal) return false;
    const labelFilters = filters.labels;
    const hasActiveFilters = Object.values(labelFilters).some(v => v);
    if (hasActiveFilters && !labelFilters[ev.label]) return false;
    return true;
  });
}
