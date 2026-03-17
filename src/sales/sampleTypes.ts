export type FollowUpResult = "Positif" | "Neutre" | "Négatif";

export const FOLLOWUP_NEXT_STEPS = [
  "Prêt à commander",
  "Demande une pricelist",
  "Veut tester sur un plus gros projet",
  "Veut d'autres samples",
  "Autre",
] as const;

export const FOLLOWUP_NEUTRAL_REASONS = [
  "Pas encore testé le sample",
  "Besoin de plus de temps pour évaluer",
  "Attend l'approbation de son équipe",
  "Veut comparer avec un compétiteur",
  "Autre",
] as const;

export const FOLLOWUP_NEGATIVE_REASONS = [
  "Produit ne convient pas au projet",
  "Prix trop élevé",
  "Qualité insatisfaisante",
  "A choisi un compétiteur",
  "Projet annulé / reporté",
  "Autre",
] as const;

export type SampleStatus =
  | "En attente d'approbation"
  | "Approuvé"
  | "En préparation"
  | "Envoyé"
  | "Livré"
  | "Follow-up requis"
  | "Follow-up complété"
  | "Rejeté";

export type SampleReason =
  | "Démonstration client"
  | "Test de produit"
  | "Remplacement (produit défectueux)"
  | "Demande spéciale client"
  | "Salon / Événement"
  | "Autre";

export type SamplePriority = "Urgente" | "Normale" | "Basse";
export type SampleFormat = "Sample Kit" | "1 GAL" | "2 GAL" | "Autre";
export type SampleActivityType =
  | "Demande envoyée"
  | "Approuvé"
  | "En préparation"
  | "Envoyé"
  | "Livré"
  | "Follow-up requis"
  | "Follow-up complété"
  | "Rejeté";

export interface SampleItem {
  id: string;
  sample_request_id: string;
  product_name: string;
  quantity: number;
  format: SampleFormat;
  color_finish: string;
  created_at: string;
}

export interface SampleActivity {
  id: string;
  sample_request_id: string;
  type: SampleActivityType;
  description: string;
  actor_name: string;
  created_at: string;
}

export interface SampleRequest {
  id: string;
  lead_id: string;
  agent_id: string;
  agent_name: string;
  reason: SampleReason;
  priority: SamplePriority;
  delivery_address: string;
  notes_for_office: string;
  status: SampleStatus;
  approved_by: string;
  approved_at?: string;
  approval_notes: string;
  estimated_cost: number;
  transporteur: string;
  tracking_number: string;
  eta_delivery?: string;
  shipped_at?: string;
  delivered_at?: string;
  timer_expires_at?: string;
  follow_up_completed_at?: string;
  follow_up_notes: string;
  follow_up_result?: FollowUpResult;
  follow_up_next_step?: string;
  follow_up_reason?: string;
  follow_up_agent_name?: string;
  follow_up_reminder_date?: string;
  rejection_reason: string;
  created_at: string;
  updated_at: string;
  items?: SampleItem[];
  activities?: SampleActivity[];
}

export const SAMPLE_REASONS: SampleReason[] = [
  "Démonstration client",
  "Test de produit",
  "Remplacement (produit défectueux)",
  "Demande spéciale client",
  "Salon / Événement",
  "Autre",
];

export const SAMPLE_FORMATS: SampleFormat[] = [
  "Sample Kit",
  "1 GAL",
  "2 GAL",
  "Autre",
];

export const SAMPLE_STATUS_COLORS: Record<SampleStatus, string> = {
  "En attente d'approbation": "#d4a017",
  "Approuvé": "#10b981",
  "En préparation": "#3b82f6",
  "Envoyé": "#0891b2",
  "Livré": "#22c55e",
  "Follow-up requis": "#ef4444",
  "Follow-up complété": "#6b7280",
  "Rejeté": "#dc2626",
};

export const SAMPLE_STATUS_BG: Record<SampleStatus, string> = {
  "En attente d'approbation": "rgba(212,160,23,0.15)",
  "Approuvé": "rgba(16,185,129,0.15)",
  "En préparation": "rgba(59,130,246,0.15)",
  "Envoyé": "rgba(8,145,178,0.15)",
  "Livré": "rgba(34,197,94,0.15)",
  "Follow-up requis": "rgba(239,68,68,0.15)",
  "Follow-up complété": "rgba(107,114,128,0.15)",
  "Rejeté": "rgba(220,38,38,0.15)",
};

export const TRANSPORTEURS = [
  "Purolator",
  "UPS",
  "FedEx",
  "Poste Canada",
  "LTL Freight",
  "Autre",
];
