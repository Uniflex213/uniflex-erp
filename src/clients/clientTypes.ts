export type ClientType = "Installateur" | "Distributeur" | "Large Scale" | "Contracteur" | "Autre";
export type ClientTier = "HIGH" | "MED" | "LOW";
export type ClientStatus = "Actif" | "Inactif";
export type ClientSource = "Converti depuis CRM" | "Référence" | "Salon" | "Cold call" | "Site web" | "Autre";
export type PaymentTerms = "Net 15" | "Net 30" | "Net 45" | "Net 60" | "COD" | "Prépayé";
export type ClientCurrency = "CAD" | "USD" | "EUR";
export type CreditNoteStatus = "En attente" | "Approuvée" | "Appliquée";
export type DisputeStatus = "Ouverte" | "En cours" | "Résolue" | "Fermée";
export type DisputePriority = "Haute" | "Moyenne" | "Basse";
export type PickupStatus = "Prêt" | "Récupéré" | "Annulé";

export const CLIENT_TYPES: ClientType[] = ["Installateur", "Distributeur", "Large Scale", "Contracteur", "Autre"];
export const CLIENT_TIERS: ClientTier[] = ["HIGH", "MED", "LOW"];
export const CLIENT_SOURCES: ClientSource[] = ["Converti depuis CRM", "Référence", "Salon", "Cold call", "Site web", "Autre"];
export const PAYMENT_TERMS: PaymentTerms[] = ["Net 15", "Net 30", "Net 45", "Net 60", "COD", "Prépayé"];
export const CLIENT_CURRENCIES: ClientCurrency[] = ["CAD", "USD", "EUR"];
export const CREDIT_NOTE_REASONS = ["Produit endommagé", "Erreur de commande", "Retour produit", "Ajustement de prix", "Geste commercial", "Autre"] as const;
export const DISPUTE_PRIORITIES: DisputePriority[] = ["Haute", "Moyenne", "Basse"];

export interface Client {
  id: string;
  company_name: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_title: string;
  email: string;
  phone: string;
  phone_secondary: string;
  website: string;
  billing_address: string;
  billing_city: string;
  billing_province: string;
  billing_postal_code: string;
  billing_country: string;
  shipping_same_as_billing: boolean;
  shipping_address: string;
  shipping_city: string;
  shipping_province: string;
  shipping_postal_code: string;
  shipping_country: string;
  client_type: ClientType;
  client_type_other: string;
  tier: ClientTier;
  region: string;
  source: ClientSource;
  agent_id: string;
  agent_name: string;
  client_code: string;
  payment_terms: PaymentTerms;
  currency: ClientCurrency;
  special_commission_rate?: number | null;
  pricelist_id: string;
  pricelist_name: string;
  pricelist_pdf_url: string;
  notes: string;
  lead_id: string;
  is_converted_lead: boolean;
  crm_history_transferred: boolean;
  created_at: string;
  updated_at: string;
  client_notes?: ClientNote[];
  client_credit_notes?: CreditNote[];
  client_disputes?: ClientDispute[];
  client_pickup_tickets?: PickupTicket[];
}

export interface ClientNote {
  id: string;
  client_id: string;
  content: string;
  author_name: string;
  is_from_crm: boolean;
  created_at: string;
}

export interface CreditNote {
  id: string;
  client_id: string;
  order_id: string;
  reason: string;
  reason_other: string;
  amount: number;
  description: string;
  status: CreditNoteStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ClientDispute {
  id: string;
  client_id: string;
  order_id: string;
  order_ref?: string;
  invoice_ref?: string;
  amount_disputed?: number;
  subject: string;
  priority: DisputePriority;
  description: string;
  status: DisputeStatus;
  resolution: string;
  credit_note_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  dispute_messages?: DisputeMessage[];
}

export interface DisputeMessage {
  id: string;
  dispute_id: string;
  sender_id?: string;
  author_name: string;
  content: string;
  is_admin: boolean;
  created_at: string;
}

export interface PickupTicket {
  id: string;
  client_id: string;
  order_id: string;
  availability_date: string;
  notes: string;
  status: PickupStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const TIER_COLORS: Record<ClientTier, string> = {
  HIGH: "#d4a017",
  MED: "#0891b2",
  LOW: "#6b7280",
};

export const TIER_BG: Record<ClientTier, string> = {
  HIGH: "rgba(212,160,23,0.15)",
  MED: "rgba(8,145,178,0.15)",
  LOW: "rgba(107,114,128,0.15)",
};

export const TYPE_COLORS: Record<ClientType, string> = {
  Installateur: "#3b82f6",
  Distributeur: "#0891b2",
  "Large Scale": "#d97706",
  Contracteur: "#059669",
  Autre: "#6b7280",
};

export const TYPE_BG: Record<ClientType, string> = {
  Installateur: "rgba(59,130,246,0.15)",
  Distributeur: "rgba(8,145,178,0.15)",
  "Large Scale": "rgba(217,119,6,0.15)",
  Contracteur: "rgba(5,150,105,0.15)",
  Autre: "rgba(107,114,128,0.15)",
};

export const DISPUTE_STATUS_COLORS: Record<DisputeStatus, string> = {
  Ouverte: "#ef4444",
  "En cours": "#f59e0b",
  Résolue: "#22c55e",
  Fermée: "#6b7280",
};

export const CREDIT_STATUS_COLORS: Record<CreditNoteStatus, string> = {
  "En attente": "#f59e0b",
  Approuvée: "#22c55e",
  Appliquée: "#6b7280",
};

export const mkClientId = () => Math.random().toString(36).slice(2, 11);

export function generateClientCode(companyName: string, index: number): string {
  const prefix = companyName
    .replace(/[^a-zA-ZÀ-ÿ]/g, "")
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, "X");
  return `${prefix}-${String(index).padStart(3, "0")}`;
}

export const EMPTY_CLIENT: Omit<Client, "id" | "created_at" | "updated_at"> = {
  company_name: "",
  contact_first_name: "",
  contact_last_name: "",
  contact_title: "",
  email: "",
  phone: "",
  phone_secondary: "",
  website: "",
  billing_address: "",
  billing_city: "",
  billing_province: "",
  billing_postal_code: "",
  billing_country: "Canada",
  shipping_same_as_billing: true,
  shipping_address: "",
  shipping_city: "",
  shipping_province: "",
  shipping_postal_code: "",
  shipping_country: "Canada",
  client_type: "Installateur",
  client_type_other: "",
  tier: "MED",
  region: "",
  source: "Référence",
  agent_id: "",
  agent_name: "",
  client_code: "",
  payment_terms: "Net 30",
  currency: "CAD",
  special_commission_rate: null,
  pricelist_id: "",
  pricelist_name: "",
  pricelist_pdf_url: "",
  notes: "",
  lead_id: "",
  is_converted_lead: false,
  crm_history_transferred: false,
};
