import { T } from "../../theme";
export { T };

export type DocType = "pickup" | "order";
export type BillingStatus = "unbilled" | "sent" | "billed_by_sci";
export type PaymentStatus = "En attente" | "Partiel" | "Payé" | "En litige";

export interface InvoicePayment {
  id: string;
  document_type: DocType;
  document_id: string;
  amount: number;
  payment_date: string;
  reference: string;
  notes: string;
  recorded_by: string;
  created_at: string;
}

export interface InvoiceDoc {
  id: string;
  document_type: DocType;
  document_number: string;
  client_name: string;
  value: number;
  issued_at: string;
  billing_status: BillingStatus;
  sent_to_sci_at: string | null;
  sci_invoice_number: string;
  sci_billed_amount: number;
  sci_billed_at: string | null;
  payment_status: PaymentStatus;
  paid_amount: number;
  paid_at: string | null;
  closed_at: string | null;
  closed_by: string | null;
  order_status?: string;
  pickup_status?: string;
  raw?: Record<string, unknown>;
}

export interface SciEmailLog {
  id: string;
  sent_at: string;
  sent_by: string;
  recipients: string[];
  cc_recipients: string[];
  subject: string;
  body: string;
  num_documents: number;
  total_value: number;
  log_type: "send" | "followup";
  created_at: string;
  items?: SciEmailLogItem[];
}

export interface SciEmailLogItem {
  id: string;
  log_id: string;
  document_type: DocType;
  document_id: string;
  document_number: string;
  client_name: string;
  value: number;
}


export const BILLING_LABEL: Record<BillingStatus, string> = {
  unbilled: "Non-facturé",
  sent: "Envoyé",
  billed_by_sci: "Facturé par SCI",
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  "En attente": "En attente",
  "Partiel": "Partiellement payé",
  "Payé": "Payé",
  "En litige": "En litige",
};

export const PAYMENT_COLORS: Record<PaymentStatus, { bg: string; color: string }> = {
  "En attente": { bg: T.orangeBg, color: T.orange },
  "Partiel": { bg: T.blueBg, color: T.blue },
  "Payé": { bg: T.greenBg, color: T.green },
  "En litige": { bg: T.redBg, color: T.red },
};

export const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);

export const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-CA", { year: "numeric", month: "short", day: "numeric" });
};

export const daysSince = (iso: string | null): number => {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
};

export const PICKUP_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  prepared:  { label: "Preparé", color: "#2563eb", bg: "#dbeafe" },
  ready:     { label: "Prêt au ramassage", color: "#d97706", bg: "#fef3c7" },
  picked_up: { label: "Récupéré", color: "#16a34a", bg: "#d1fae5" },
  cancelled: { label: "Annulé", color: "#dc2626", bg: "#fee2e2" },
};
