import { T } from "../../theme";
export { T };

export type { AgentInfo } from "../../hooks/useCurrentAgent";

export type WidgetId =
  | "maJournee"
  | "pipeline"
  | "kpis"
  | "actionsRapides"
  | "notes"
  | "activite"
  | "deals"
  | "clients"
  | "samples"
  | "calendar"
  | "score";

export type WidgetVisibility = Record<WidgetId, boolean>;

export const DEFAULT_WIDGET_VISIBILITY: WidgetVisibility = {
  maJournee: true,
  pipeline: true,
  kpis: true,
  actionsRapides: true,
  notes: true,
  activite: true,
  deals: true,
  clients: true,
  samples: true,
  calendar: true,
  score: true,
};

export const WIDGET_LABELS: Record<WidgetId, string> = {
  maJournee: "Ma journée",
  pipeline: "Mon Pipeline",
  kpis: "Mes KPIs",
  actionsRapides: "Actions rapides",
  notes: "Mes notes & idées",
  activite: "Activité récente",
  deals: "Deals à closer cette semaine",
  clients: "Mes clients actifs",
  samples: "Mes Samples",
  calendar: "Mon calendrier du jour",
  score: "Score & Classement",
};

export const WIDGET_ICONS: Record<WidgetId, string> = {
  maJournee: "☀️",
  pipeline: "📊",
  kpis: "🎯",
  actionsRapides: "⚡",
  notes: "📝",
  activite: "🕐",
  deals: "💰",
  clients: "👥",
  samples: "📦",
  calendar: "📅",
  score: "🏆",
};

export const DEFAULT_WIDGET_ORDER: WidgetId[] = [
  "maJournee", "pipeline", "kpis", "actionsRapides",
  "notes", "activite", "deals", "clients",
  "samples", "calendar", "score",
];


export const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

export const daysSince = (dateStr: string): number => {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

export const isToday = (dateStr: string): boolean => {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

export const isPast = (dateStr: string): boolean => new Date(dateStr) < new Date();

export const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} jours`;
  return new Date(dateStr).toLocaleDateString("fr-CA");
};

export const mkId = () => Math.random().toString(36).slice(2, 9);
