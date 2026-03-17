export type OrderStatus =
  | "pending_approval"
  | "en_revision"
  | "rejected"
  | "en_production"
  | "produced"
  | "shipped"
  | "completed";

export type OrderMotif = "Restock" | "Dropship client" | "Sample" | "Gros client" | "Autre";
export type OrderBillingStatus = "unbilled" | "sent" | "billed_by_sci";
export const ORDER_BILLING_LABELS: Record<OrderBillingStatus, string> = {
  unbilled: "Non-facturé",
  sent: "Envoyé à SCI",
  billed_by_sci: "Facturé par SCI",
};
export const ORDER_BILLING_COLORS: Record<OrderBillingStatus, { bg: string; color: string }> = {
  unbilled: { bg: "#f3f4f6", color: "#6b7280" },
  sent: { bg: "#fef3c7", color: "#b45309" },
  billed_by_sci: { bg: "#dcfce7", color: "#15803d" },
};
export type OrderDestination = "CANADA" | "USA" | "AUTRE";
export type OrderLabel = "UNIFLEX" | "PRIVATE LABEL" | "BLANK";
export type DeliveryType = "Pickup" | "Shipping Client" | "Add Shipping";

export type OrderProduct = {
  id: string;
  product: string;
  qty: number;
  price: number;
  unit: "/KIT" | "/GAL";
  format: "Common Kit (1GAL, 2GAL, 3GAL)" | "Large Kit (5GAL, 10GAL, 15GAL)" | "BARREL KIT (55 GAL per Barrel)" | "TOTE KIT (250 GAL per Tote)" | "SPECIAL (see with HO for options)";
};

export type ShippingInfo = {
  carrier: string;
  trackingNumbers: string[];
  eta: string;
  delayed?: boolean;
  newEta?: string;
};

export type TaxLine = {
  label: string;
  rate: number;
  amount: number;
};

export type Order = {
  id: string;
  date: string;
  client: string;
  clientId: string;
  motif: OrderMotif;
  motifAutre?: string;
  vendeurCode: string;
  vendeur_code?: string | null;
  destination: OrderDestination;
  destinationAutre?: string;
  deliveryAddress: string;
  deliveryType: DeliveryType;
  shippingCost?: number;
  label: OrderLabel;
  products: OrderProduct[];
  subtotal: number;
  discountType?: "%" | "$";
  discountValue?: number;
  discount?: number;
  subtotalAfterDiscount?: number;
  province?: string;
  taxLines?: TaxLine[];
  taxTotal?: number;
  extraFees?: number;
  total: number;
  status: OrderStatus;
  adminNote?: string;
  revisionComment?: string;
  revisionResponse?: string;
  revisionResponseAt?: string;
  rejectionReason?: string;
  shipping?: ShippingInfo;
  createdBy: string;
  billing_status?: OrderBillingStatus;
  team_id?: string | null;
};

export const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  pending_approval: { label: "À confirmer", color: "#b45309", bg: "#fef3c7" },
  en_revision: { label: "En révision", color: "#c2410c", bg: "#ffedd5" },
  rejected: { label: "Annulée", color: "#dc2626", bg: "#fee2e2" },
  en_production: { label: "En production", color: "#1d4ed8", bg: "#dbeafe" },
  produced: { label: "Produite / à facturer", color: "#0f766e", bg: "#ccfbf1" },
  shipped: { label: "En route", color: "#0e7490", bg: "#cffafe" },
  completed: { label: "Complétée", color: "#15803d", bg: "#dcfce7" },
};

export const MOTIF_CODE: Record<OrderMotif, string> = {
  "Restock": "RE",
  "Dropship client": "DC",
  "Sample": "SA",
  "Gros client": "GC",
  "Autre": "AU",
};

export const DESTINATION_CODE: Record<OrderDestination, string> = {
  "CANADA": "CA",
  "USA": "US",
  "AUTRE": "AU",
};

export const LABEL_CODE: Record<OrderLabel, string> = {
  "UNIFLEX": "UNI",
  "PRIVATE LABEL": "PVL",
  "BLANK": "BLK",
};

export function buildOrderId(
  motif: OrderMotif,
  destination: OrderDestination,
  label: OrderLabel,
  counter: number,
  date?: Date,
): string {
  const d = date ?? new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const num = String(counter).padStart(5, "0");
  return `${MOTIF_CODE[motif]}-${DESTINATION_CODE[destination]}-${mm}${yy}-${LABEL_CODE[label]}-${num}`;
}
