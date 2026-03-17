export type Stage =
  | "Nouveau Lead"
  | "Premier Contact"
  | "Qualification"
  | "Proposition Envoyée"
  | "Négociation"
  | "Fermé Gagné"
  | "Fermé Perdu";

export type Temperature = "Hot" | "Warm" | "Cold";
export type LeadType = "Installateur" | "Distributeur" | "Large Scale";
export type LeadSource =
  | "Référence"
  | "Site web"
  | "Cold call"
  | "Salon / événement"
  | "Réseau"
  | "Pub en ligne"
  | "Autre";

export type ActivityType =
  | "Appel"
  | "Email envoyé"
  | "Email reçu"
  | "Rencontre / Visite"
  | "Pricelist envoyée"
  | "Proposition / Soumission"
  | "Échantillon envoyé"
  | "Note interne"
  | "Changement d'étape"
  | "Lead créé"
  | "Raison de perte";

export type CallResult = "Positif" | "Neutre" | "Négatif";
export type Priority = "Haute" | "Moyenne" | "Basse";
export type Recurrence =
  | "Aucune"
  | "Quotidien"
  | "Chaque 2 jours"
  | "Hebdomadaire"
  | "Bi-hebdomadaire"
  | "Mensuel";

export type LossReason =
  | "Prix trop élevé"
  | "Compétiteur choisi"
  | "Pas de budget"
  | "Timing pas bon"
  | "Pas de réponse"
  | "Mauvais fit produit"
  | "Autre";

export interface CRMActivity {
  id: string;
  lead_id: string;
  type: ActivityType;
  title: string;
  description: string;
  call_duration?: number;
  call_result?: CallResult;
  email_subject?: string;
  meeting_location?: string;
  meeting_duration?: number;
  meeting_attendees?: string;
  proposal_amount?: number;
  sample_products?: string;
  sample_qty?: number;
  loss_reason?: string;
  stage_from?: string;
  stage_to?: string;
  logged_by_name: string;
  logged_by_initials: string;
  activity_at: string;
  created_at: string;
}

export interface CRMReminder {
  id: string;
  lead_id: string;
  title: string;
  reminder_at: string;
  priority: Priority;
  recurrence: Recurrence;
  notes: string;
  completed: boolean;
  completed_at?: string;
  assigned_agent_name: string;
  created_at: string;
}

export interface CRMFile {
  id: string;
  lead_id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  generated_by_uniflex: boolean;
  uploaded_by: string;
  created_at: string;
}

export interface CRMLead {
  id: string;
  company_name: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_title: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  region: string;
  postal_code: string;
  type: LeadType;
  source: LeadSource;
  temperature: Temperature;
  stage: Stage;
  estimated_value: number;
  monthly_volume: number;
  products_interest: string[];
  closing_probability: number;
  target_closing_date?: string;
  annual_revenue_goal: number;
  monthly_volume_goal: number;
  notes: string;
  assigned_agent_id: string;
  assigned_agent_name: string;
  assigned_agent_initials: string;
  assigned_agent_color: string;
  last_activity_at: string;
  closed_at?: string;
  archived: boolean;
  has_sample?: boolean;
  created_at: string;
  updated_at: string;
  converted_to_client_id?: string;
  is_converted?: boolean;
  vendeur_code?: string | null;
  activities?: CRMActivity[];
  reminders?: CRMReminder[];
  files?: CRMFile[];
}

export const STAGES: Stage[] = [
  "Nouveau Lead",
  "Premier Contact",
  "Qualification",
  "Proposition Envoyée",
  "Négociation",
  "Fermé Gagné",
  "Fermé Perdu",
];

export const STAGE_COLORS: Record<Stage, string> = {
  "Nouveau Lead": "#c0c0c0",
  "Premier Contact": "#60a5fa",
  "Qualification": "#6366f1",
  "Proposition Envoyée": "#f59e0b",
  "Négociation": "#d97706",
  "Fermé Gagné": "#22c55e",
  "Fermé Perdu": "#ef4444",
};

export const STAGE_BG: Record<Stage, string> = {
  "Nouveau Lead": "rgba(192,192,192,0.15)",
  "Premier Contact": "rgba(96,165,250,0.15)",
  "Qualification": "rgba(99,102,241,0.15)",
  "Proposition Envoyée": "rgba(245,158,11,0.15)",
  "Négociation": "rgba(217,119,6,0.15)",
  "Fermé Gagné": "rgba(34,197,94,0.15)",
  "Fermé Perdu": "rgba(239,68,68,0.15)",
};

export const TEMP_COLORS: Record<Temperature, string> = {
  Hot: "#ef4444",
  Warm: "#f59e0b",
  Cold: "#60a5fa",
};

export const TEMP_BG: Record<Temperature, string> = {
  Hot: "rgba(239,68,68,0.15)",
  Warm: "rgba(245,158,11,0.15)",
  Cold: "rgba(96,165,250,0.15)",
};

export const TEMP_LABEL: Record<Temperature, string> = {
  Hot: "🔥 Hot",
  Warm: "⚡ Warm",
  Cold: "❄️ Cold",
};

export const TYPE_COLORS: Record<LeadType, string> = {
  Installateur: "#3b82f6",
  Distributeur: "#8b5cf6",
  "Large Scale": "#d97706",
};

export const TYPE_BG: Record<LeadType, string> = {
  Installateur: "rgba(59,130,246,0.15)",
  Distributeur: "rgba(139,92,246,0.15)",
  "Large Scale": "rgba(217,119,6,0.15)",
};

export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  "Appel": "📞",
  "Email envoyé": "📧",
  "Email reçu": "📧",
  "Rencontre / Visite": "🤝",
  "Pricelist envoyée": "📄",
  "Proposition / Soumission": "📋",
  "Échantillon envoyé": "📦",
  "Note interne": "💬",
  "Changement d'étape": "🔄",
  "Lead créé": "✨",
  "Raison de perte": "❌",
};

export const REGIONS = [
  "Montréal",
  "Québec",
  "Laval",
  "Rive-Sud",
  "Rive-Nord",
  "Outaouais",
  "Estrie",
  "Ontario",
];

export const PRODUCTS_CATALOGUE = [
  "Enduit de lissage Pro",
  "Apprêt universel",
  "Kit nivelage auto",
  "Colle parquet haute perf.",
  "Joint d'étanchéité",
  "Sous-couche acoustique",
  "Mortier polymère",
  "Résine époxy",
  "Primer béton",
  "Finition satin",
];
