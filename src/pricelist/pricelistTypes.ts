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

/** @deprecated Use real DB data instead of mocks */
export const MOCK_PRICELISTS: Pricelist[] = [];

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

