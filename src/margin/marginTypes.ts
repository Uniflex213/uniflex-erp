export type MarginStatus = "Critique" | "Acceptable" | "Bon" | "Excellent";

export const getMarginStatus = (pct: number): MarginStatus => {
  if (pct <= 20) return "Critique";
  if (pct <= 35) return "Acceptable";
  if (pct <= 50) return "Bon";
  return "Excellent";
};

export const getMarginColor = (pct: number): string => {
  if (pct <= 20) return "#ef4444";
  if (pct <= 35) return "#f59e0b";
  if (pct <= 50) return "#22c55e";
  return "#15803d";
};

export const getMarginBg = (pct: number): string => {
  if (pct <= 20) return "#fee2e2";
  if (pct <= 35) return "#fef3c7";
  if (pct <= 50) return "#dcfce7";
  return "#bbf7d0";
};

export type MarginFormat = "1GAL" | "2GAL" | "3GAL" | "5GAL" | "10GAL" | "15GAL" | "55GAL" | "BARREL" | "250GAL" | "TOTE";

export type MarginLine = {
  id: string;
  productName: string;
  format: MarginFormat;
  cogsUnit: number;
  sellingPriceUnit: number;
  quantity: number;
  unit: "kits" | "gal";
};

export type SaleCurrency = "CAD" | "USD" | "EUR";

export type MarginScenario = {
  reference: string;
  clientName: string;
  commissionPct: number;
  globalDiscountPct: number;
  transportCost: number;
  transportIsUsd: boolean;
  extraFees: number;
  extraIsUsd: boolean;
  saleCurrency: SaleCurrency;
  exchangeRate: number;
  eurExchangeRate: number;
  lines: MarginLine[];
};

export type SavedAnalysis = {
  id: string;
  reference: string;
  clientName: string;
  createdAt: string;
  scenario: MarginScenario;
};

const mkId = () => Math.random().toString(36).slice(2, 9);
const mkDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
};

export const MOCK_ANALYSES: SavedAnalysis[] = [
  {
    id: "MA-2026-001",
    reference: "CMD-2026-001",
    clientName: "Époxy Pro Montréal",
    createdAt: mkDate(8),
    scenario: {
      reference: "CMD-2026-001",
      clientName: "Époxy Pro Montréal",
      commissionPct: 8,
      globalDiscountPct: 5,
      transportCost: 350,
      transportIsUsd: false,
      extraFees: 0,
      extraIsUsd: false,
      saleCurrency: "CAD",
      exchangeRate: 1.38,
      eurExchangeRate: 1.50,
      lines: [
        { id: mkId(), productName: "Uni-100", format: "3GAL", cogsUnit: 165, sellingPriceUnit: 260, quantity: 20, unit: "kits" },
        { id: mkId(), productName: "Uni-Primer X", format: "1GAL", cogsUnit: 48, sellingPriceUnit: 85, quantity: 10, unit: "gal" },
        { id: mkId(), productName: "Uni-TopCoat", format: "1GAL", cogsUnit: 62, sellingPriceUnit: 110, quantity: 10, unit: "gal" },
      ],
    },
  },
  {
    id: "MA-2026-002",
    reference: "CMD-2026-047",
    clientName: "Western Epoxy Ltd.",
    createdAt: mkDate(2),
    scenario: {
      reference: "CMD-2026-047",
      clientName: "Western Epoxy Ltd.",
      commissionPct: 8,
      globalDiscountPct: 0,
      transportCost: 1200,
      transportIsUsd: false,
      extraFees: 420,
      extraIsUsd: false,
      saleCurrency: "USD",
      exchangeRate: 1.38,
      eurExchangeRate: 1.50,
      lines: [
        { id: mkId(), productName: "Uni-8400", format: "5GAL", cogsUnit: 195, sellingPriceUnit: 310, quantity: 100, unit: "kits" },
        { id: mkId(), productName: "Uni-4protek", format: "5GAL", cogsUnit: 105, sellingPriceUnit: 175, quantity: 50, unit: "kits" },
        { id: mkId(), productName: "Uni-2protek", format: "5GAL", cogsUnit: 92, sellingPriceUnit: 155, quantity: 50, unit: "kits" },
        { id: mkId(), productName: "Uni-BaseCoat", format: "55GAL", cogsUnit: 38, sellingPriceUnit: 72, quantity: 30, unit: "gal" },
      ],
    },
  },
];
