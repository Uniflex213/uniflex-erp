export interface BilledDoc {
  id: string;
  document_type: "pickup" | "order";
  document_number: string;
  client_name: string;
  selling_price: number;
  cost_total: number;
  expenses_total: number;
  profit: number;
  margin_pct: number;
  billed_at: string;
  sci_invoice_number: string;
  sci_billed_amount: number;
  payment_status: string;
  paid_amount: number;
  items: BilledDocItem[];
  expenses: StoreExpense[];
}

export interface BilledDocItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  cost_price: number;
  cost_total: number;
  profit: number;
}

export interface StoreExpense {
  id: string;
  document_type: string;
  document_id: string | null;
  expense_type: string;
  description: string;
  amount: number;
  expense_date: string;
  recorded_by: string;
}

export interface WeekData {
  label: string;
  start: Date;
  end: Date;
  revenue: number;
  cost: number;
  expenses: number;
  profit: number;
  docs: BilledDoc[];
}

import { T } from "../../theme";
export { T };

export const EXPENSE_TYPES: Record<string, { label: string; color: string; bg: string }> = {
  sample: { label: "Sample", color: "#0891b2", bg: "#cffafe" },
  dispute: { label: "Dispute", color: "#dc2626", bg: "#fee2e2" },
  lost_product: { label: "Produit perdu", color: "#d97706", bg: "#fef3c7" },
  transport: { label: "Transport", color: "#2563eb", bg: "#dbeafe" },
  other: { label: "Autre", color: "#636366", bg: "#f3f4f6" },
};


export const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);

export const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-CA", { year: "numeric", month: "short", day: "numeric" });
};

export const fmtPct = (n: number) => `${n.toFixed(1)}%`;

export function getWeekLabel(d: Date): string {
  const start = new Date(d);
  start.setDate(start.getDate() - start.getDay() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const s = start.toLocaleDateString("fr-CA", { day: "numeric", month: "short" });
  const e = end.toLocaleDateString("fr-CA", { day: "numeric", month: "short" });
  return `${s} — ${e}`;
}

export function getWeekStart(d: Date): Date {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay() + 1);
  return start;
}
