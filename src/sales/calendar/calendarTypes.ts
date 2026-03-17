export type CalendarView = "month" | "week" | "day" | "agenda";

export type EventImportance = "Haute" | "Normale" | "Basse";
export type EventVisibility = "public" | "private";
export type EventSource = "uniflex" | "google" | "crm_reminder";

export interface EventLabel {
  key: string;
  name: string;
  color: string;
}

export const DEFAULT_LABELS: EventLabel[] = [
  { key: "rouge", name: "Urgent / Important", color: "#ef4444" },
  { key: "orange", name: "Client meeting", color: "#f97316" },
  { key: "jaune", name: "Rappel / Follow-up", color: "#eab308" },
  { key: "vert", name: "Deal / Closing", color: "#22c55e" },
  { key: "bleu", name: "Interne / Admin", color: "#2563eb" },
  { key: "violet", name: "Formation / Événement", color: "#a855f7" },
  { key: "noir", name: "Personnel", color: "#1c1c1e" },
  { key: "gris", name: "Autre", color: "#9ca3af" },
  { key: "crm", name: "Rappel CRM", color: "#2563eb" },
];

export const REMINDER_OPTIONS = [
  { value: null, label: "Aucun" },
  { value: 5, label: "5 min avant" },
  { value: 15, label: "15 min avant" },
  { value: 30, label: "30 min avant" },
  { value: 60, label: "1 heure avant" },
  { value: 1440, label: "1 jour avant" },
  { value: 2880, label: "2 jours avant" },
];

export const RECURRENCE_OPTIONS = [
  "Aucune",
  "Quotidien",
  "Hebdomadaire",
  "Bi-hebdomadaire",
  "Mensuel",
  "Annuel",
] as const;

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  label: string;
  label_color: string;
  location: string;
  event_link: string;
  importance: EventImportance;
  lead_id?: string | null;
  lead_name?: string;
  client_id?: string | null;
  client_name?: string;
  reminder_minutes?: number | null;
  recurrence: string;
  recurrence_end?: string | null;
  visibility: EventVisibility;
  sync_google: boolean;
  source: EventSource;
  google_event_id?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarFilters {
  labels: Record<string, boolean>;
  showGoogle: boolean;
  showCRM: boolean;
  showUniflexCal: boolean;
}
