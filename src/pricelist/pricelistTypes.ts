export type ClientType = "Installateur" | "Distributeur" | "Large Scale";
export type PricelistCurrency = "CAD" | "USD" | "EUR";
export type PricelistUnit = "/KIT" | "/GAL";
export type PricelistFormat =
  | "Common Kit (1GAL, 2GAL, 3GAL)"
  | "Large Kit (5GAL, 10GAL, 15GAL)"
  | "BARREL KIT (55 GAL per Barrel)"
  | "TOTE KIT (250 GAL per Tote)"
  | "SPECIAL (see with HO for options)";

export type PricelistLine = {
  id: string;
  product: string;
  minQty: number;
  price: number;
  unit: PricelistUnit;
  format: PricelistFormat;
};

export type Pricelist = {
  id: string;
  createdAt: string;
  companyName: string;
  address: string;
  clientType: ClientType;
  contactName: string;
  clientEmail: string;
  clientPhone: string;
  validUntil: string;
  currency: PricelistCurrency;
  exchangeRate?: number;
  internalNotes: string;
  lines: PricelistLine[];
};

export const PRICELIST_PRODUCTS: { name: string; description: string; imageUrl: string }[] = [
  { name: "Uni-100", description: "Époxy 100% solide — Résistance maximale pour planchers industriels haute intensité.", imageUrl: "https://images.pexels.com/photos/3736527/pexels-photo-3736527.jpeg?w=120" },
  { name: "Uni-8085", description: "Époxy couleur sable — Finition décorative premium pour espaces commerciaux et résidentiels.", imageUrl: "https://images.pexels.com/photos/1148496/pexels-photo-1148496.jpeg?w=120" },
  { name: "Uni-8400", description: "Époxy haute performance — Formule avancée pour environnements corrosifs et chimiques.", imageUrl: "https://images.pexels.com/photos/3760529/pexels-photo-3760529.jpeg?w=120" },
  { name: "Uni-4protek", description: "Uréthane 4:1 — Protection maximale contre les UV et les abrasions. Idéal en couche de finition.", imageUrl: "https://images.pexels.com/photos/4792733/pexels-photo-4792733.jpeg?w=120" },
  { name: "Uni-2protek", description: "Uréthane 2:1 — Formule polyvalente haute durabilité pour planchers commerciaux.", imageUrl: "https://images.pexels.com/photos/4792734/pexels-photo-4792734.jpeg?w=120" },
  { name: "Uni-Primer X", description: "Apprêt universel — Adhérence optimale sur béton, acier et substrats traités.", imageUrl: "https://images.pexels.com/photos/1668928/pexels-photo-1668928.jpeg?w=120" },
  { name: "Uni-TopCoat", description: "Couche de finition brillante — Protection longue durée avec résistance chimique accrue.", imageUrl: "https://images.pexels.com/photos/3736517/pexels-photo-3736517.jpeg?w=120" },
  { name: "Uni-BaseCoat", description: "Couche de base — Préparation idéale pour systèmes multicouches époxy et uréthane.", imageUrl: "https://images.pexels.com/photos/1490818/pexels-photo-1490818.jpeg?w=120" },
];

const mockDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
};

const validDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};

export const MOCK_PRICELISTS: Pricelist[] = [
  {
    id: "PL-2024-001",
    createdAt: mockDate(45),
    companyName: "Époxy Pro Montréal",
    address: "1234 Rue Sherbrooke O, Montréal, QC H3A 1B1",
    clientType: "Installateur",
    contactName: "Marc Tremblay",
    clientEmail: "marc@epoxyproMTL.ca",
    clientPhone: "514-555-0198",
    validUntil: mockDate(-15),
    currency: "CAD",
    internalNotes: "Client fidèle depuis 3 ans, priorité aux produits époxy 100%.",
    lines: [
      { id: "l1", product: "Uni-100", minQty: 20, price: 260, unit: "/KIT", format: "Common Kit (1GAL, 2GAL, 3GAL)" },
      { id: "l2", product: "Uni-Primer X", minQty: 10, price: 85, unit: "/GAL", format: "Common Kit (1GAL, 2GAL, 3GAL)" },
      { id: "l3", product: "Uni-TopCoat", minQty: 10, price: 110, unit: "/GAL", format: "Common Kit (1GAL, 2GAL, 3GAL)" },
    ],
  },
  {
    id: "PL-2024-002",
    createdAt: mockDate(12),
    companyName: "FloorTech Solutions",
    address: "500 King St W, Toronto, ON M5V 1M6",
    clientType: "Distributeur",
    contactName: "Jennifer Walsh",
    clientEmail: "j.walsh@floortech.ca",
    clientPhone: "416-555-0247",
    validUntil: validDate(18),
    currency: "CAD",
    internalNotes: "Négociation volume — objectif 50+ kits/mois.",
    lines: [
      { id: "l1", product: "Uni-8085", minQty: 50, price: 290, unit: "/KIT", format: "Large Kit (5GAL, 10GAL, 15GAL)" },
      { id: "l2", product: "Uni-8400", minQty: 25, price: 370, unit: "/KIT", format: "BARREL KIT (55 GAL per Barrel)" },
    ],
  },
  {
    id: "PL-2024-003",
    createdAt: mockDate(3),
    companyName: "Western Epoxy Ltd.",
    address: "1200 4th Ave, Seattle, WA 98101",
    clientType: "Large Scale",
    contactName: "Derek Mason",
    clientEmail: "derek.mason@westernepoxy.com",
    clientPhone: "206-555-0371",
    validUntil: validDate(27),
    currency: "USD",
    internalNotes: "Contrat annuel potentiel. Présenter aussi Uni-4protek pour leur marché.",
    lines: [
      { id: "l1", product: "Uni-8400", minQty: 100, price: 310, unit: "/KIT", format: "TOTE KIT (250 GAL per Tote)" },
      { id: "l2", product: "Uni-4protek", minQty: 50, price: 175, unit: "/KIT", format: "BARREL KIT (55 GAL per Barrel)" },
      { id: "l3", product: "Uni-2protek", minQty: 50, price: 155, unit: "/KIT", format: "BARREL KIT (55 GAL per Barrel)" },
    ],
  },
];
