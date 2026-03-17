export type PickupTicketStatus = "prepared" | "ready" | "picked_up" | "cancelled";
export type PickupBillingStatus = "unbilled" | "sent" | "billed_by_sci";
export type PaymentMethodOps = "account_net30" | "cod" | "prepaid" | "tbd_sci";

export interface PickupTicketItem {
  id: string;
  ticket_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  format: string;
  unit_price: number;
  price_unit: string;
  subtotal: number;
  sort_order: number;
  created_at: string;
}

export interface TaxLine {
  label: string;
  rate: number;
  amount: number;
}

export interface PickupTicket {
  id: string;
  ticket_number: string;
  store_code: string;
  client_id: string | null;
  client_name: string;
  client_contact: string;
  client_phone: string;
  client_email: string;
  billing_address: string;
  is_walkin: boolean;
  status: PickupTicketStatus;
  billing_status: PickupBillingStatus;
  payment_method: PaymentMethodOps;
  issued_at: string;
  estimated_pickup_at: string | null;
  picked_up_at: string | null;
  agent_name: string;
  notes: string;
  subtotal_products: number;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
  subtotal_after_discount: number;
  province: string;
  tax_lines: TaxLine[];
  tax_total: number;
  extra_fees: number;
  total_with_tax: number;
  total_value: number;
  total_qty: number;
  created_at: string;
  updated_at: string;
  items?: PickupTicketItem[];
}

export interface NewTicketItem {
  tempId: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  format: string;
  unit_price: number;
  price_unit: string;
  subtotal: number;
}

export const STATUS_LABELS: Record<PickupTicketStatus, string> = {
  prepared: "Préparé",
  ready: "Prêt au ramassage",
  picked_up: "Récupéré",
  cancelled: "Annulé",
};

export const STATUS_COLORS: Record<PickupTicketStatus, { bg: string; color: string }> = {
  prepared: { bg: "#dbeafe", color: "#2563eb" },
  ready: { bg: "#fff3d4", color: "#d97706" },
  picked_up: { bg: "#d1f5db", color: "#16a34a" },
  cancelled: { bg: "#ffe5e3", color: "#dc2626" },
};

export const BILLING_LABELS: Record<PickupBillingStatus, string> = {
  unbilled: "Non-facturé",
  sent: "Envoyé",
  billed_by_sci: "Facturé par SCI",
};

export const BILLING_COLORS: Record<PickupBillingStatus, { bg: string; color: string }> = {
  unbilled: { bg: "#ffe5e3", color: "#dc2626" },
  sent: { bg: "#d1f5db", color: "#16a34a" },
  billed_by_sci: { bg: "#bbf7d0", color: "#065f46" },
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodOps, string> = {
  account_net30: "Compte client (Net 30)",
  cod: "COD",
  prepaid: "Prépayé",
  tbd_sci: "À déterminer par SCI",
};

export const FORMATS = ["Common (3gal/2gal)", "Large (15GAL/10GAL)", "BARREL KIT", "TOTE KIT", "SPECIAL"];
export const PRICE_UNITS = ["/KIT", "/GAL"];

// STORE_CODE removed — now dynamic from AuthContext (useAuth().storeCode)
