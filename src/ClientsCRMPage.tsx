import React, { useState, useMemo } from "react";
import { T } from "./theme";
import { useLanguage } from "./i18n/LanguageContext";
import AddressAutocomplete from "./components/AddressAutocomplete";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

// ── TYPES ──
type ClientStatus = "active" | "inactive";

type ActivityEntry = {
  date: string;
  type: "order" | "note" | "call" | "email";
  text: string;
};

type CRMClient = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  type: "Installateur" | "Distributeur";
  region: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  tier: "HIGH" | "MED" | "LOW";
  orders: number;
  spent: number;
  lastOrder: string;
  status: ClientStatus;
  agentAssigned: string;
  paymentTerms: string;
  notes: string;
  lat: number;
  lng: number;
  activity: ActivityEntry[];
};

// ── MOCK DATA ──
// TODO: Replace with CRM API calls when backend is ready
const CLIENTS_CRM: CRMClient[] = [
  {
    id: "C001",
    name: "Époxy Pro Montréal",
    contact: "Jean-Pierre Tremblay",
    phone: "514-555-0182",
    email: "jpt@epoxypromt.ca",
    type: "Installateur",
    region: "Montréal",
    address: "8420 Rue Hochelaga",
    city: "Montréal",
    province: "QC",
    postalCode: "H1L 2P5",
    country: "Canada",
    tier: "HIGH",
    orders: 47,
    spent: 128450,
    lastOrder: "2026-03-04",
    status: "active",
    agentAssigned: "Philippe Dubois",
    paymentTerms: "Net 30",
    notes: "Client prioritaire. Commander toujours 2 semaines à l'avance pour les gros volumes. Préfère livraison le mardi.",
    lat: 45.5631,
    lng: -73.5442,
    activity: [
      { date: "2026-03-04", type: "order", text: "Commande ORD-2026-001 — Uni-100 x10, Uni-8085 x5 — 5 059 $" },
      { date: "2026-03-01", type: "order", text: "Commande ORD-2026-006 — Uni-8085 x20 — 7 129 $" },
      { date: "2026-02-28", type: "call", text: "Appel de suivi — satisfait des délais de livraison" },
      { date: "2026-02-15", type: "email", text: "Demande de soumission Q2 2026 envoyée" },
    ],
  },
  {
    id: "C002",
    name: "FloorTech Solutions",
    contact: "Sarah Mitchell",
    phone: "416-555-0247",
    email: "sarah@floortech.ca",
    type: "Installateur",
    region: "Toronto",
    address: "1250 Eglinton Ave E",
    city: "Toronto",
    province: "ON",
    postalCode: "M3C 1J3",
    country: "Canada",
    tier: "HIGH",
    orders: 32,
    spent: 94200,
    lastOrder: "2026-03-05",
    status: "active",
    agentAssigned: "Tyler Morrison",
    paymentTerms: "Net 30",
    notes: "Grande entreprise, 3 équipes sur le terrain. Commandes régulières chaque mois. Tyler entretient une bonne relation.",
    lat: 43.7040,
    lng: -79.3491,
    activity: [
      { date: "2026-03-05", type: "order", text: "Commande ORD-2026-002 — Uni-8400 x8 — 3 797 $" },
      { date: "2026-03-05", type: "email", text: "Re: Commande ORD-2026-002 — Confirmation de livraison" },
      { date: "2026-02-20", type: "call", text: "Intéressés par Uni-8400 en grande quantité Q2" },
    ],
  },
  {
    id: "C003",
    name: "Béton & Design QC",
    contact: "Marc-André Gagnon",
    phone: "418-555-0319",
    email: "magagnon@betondesign.qc.ca",
    type: "Distributeur",
    region: "Québec",
    address: "3500 Boulevard Hamel",
    city: "Québec",
    province: "QC",
    postalCode: "G1P 2H8",
    country: "Canada",
    tier: "MED",
    orders: 18,
    spent: 52300,
    lastOrder: "2026-03-05",
    status: "active",
    agentAssigned: "Julie Bergeron",
    paymentTerms: "Net 45",
    notes: "Distributeur régional important pour la région de Québec et Chaudière-Appalaches. Potentiel de croissance HIGH d'ici Q4.",
    lat: 46.8139,
    lng: -71.2082,
    activity: [
      { date: "2026-03-05", type: "order", text: "Commande ORD-2026-003 — Uni-4protek x15, Primer X x10 — 6 266 $" },
      { date: "2026-02-10", type: "note", text: "Discussion sur l'expansion vers Lévis et Rive-Sud de Québec" },
    ],
  },
  {
    id: "C004",
    name: "Atlantic Coatings",
    contact: "Mike Johnson",
    phone: "506-555-0488",
    email: "mjohnson@atlanticcoatings.ca",
    type: "Installateur",
    region: "Maritimes",
    address: "245 Chemin Rothesay",
    city: "Saint John",
    province: "NB",
    postalCode: "E2H 2R5",
    country: "Canada",
    tier: "MED",
    orders: 11,
    spent: 28750,
    lastOrder: "2026-03-06",
    status: "active",
    agentAssigned: "Ryan Cooper",
    paymentTerms: "Net 30",
    notes: "Croissance stable. Marché des Maritimes encore sous-exploité. Ryan prévoit une visite en avril.",
    lat: 45.2733,
    lng: -66.0633,
    activity: [
      { date: "2026-03-06", type: "order", text: "Commande ORD-2026-005 — Uni-2protek x12 — 2 848 $" },
      { date: "2026-02-25", type: "call", text: "Appel Ryan — Mike intéressé par expansion vers Halifax" },
    ],
  },
  {
    id: "C005",
    name: "Revêtements Laurentides",
    contact: "Isabelle Roy",
    phone: "450-555-0561",
    email: "iroy@revetements-laurentides.ca",
    type: "Installateur",
    region: "Laurentides",
    address: "785 Rue Saint-Isidore",
    city: "Saint-Jérôme",
    province: "QC",
    postalCode: "J7Z 3C7",
    country: "Canada",
    tier: "MED",
    orders: 8,
    spent: 19200,
    lastOrder: "2025-12-15",
    status: "inactive",
    agentAssigned: "Nadia Khoury",
    paymentTerms: "Net 30",
    notes: "Client inactif depuis décembre. Nadia doit faire un appel de relance. Isabelle avait mentionné des problèmes de budget Q1.",
    lat: 45.7769,
    lng: -74.0005,
    activity: [
      { date: "2025-12-15", type: "order", text: "Dernière commande — Uni-100 x5 — 1 425 $" },
      { date: "2026-01-10", type: "call", text: "Appel sans réponse — message laissé" },
      { date: "2026-02-05", type: "note", text: "À relancer en mars — pause budget confirmée par Isabelle par SMS" },
    ],
  },
  {
    id: "C006",
    name: "Western Epoxy Ltd.",
    contact: "David Chen",
    phone: "604-555-0632",
    email: "dchen@westernepoxy.ca",
    type: "Distributeur",
    region: "Vancouver",
    address: "6200 Boundary Road",
    city: "Burnaby",
    province: "BC",
    postalCode: "V5B 3M6",
    country: "Canada",
    tier: "HIGH",
    orders: 24,
    spent: 76800,
    lastOrder: "2026-03-06",
    status: "active",
    agentAssigned: "Tyler Morrison",
    paymentTerms: "Net 30",
    notes: "Distributeur majeur pour BC et Alberta. Commandes en forte croissance depuis Q3 2025. Négociation contrat annuel en cours.",
    lat: 49.2827,
    lng: -123.0207,
    activity: [
      { date: "2026-03-06", type: "order", text: "Commande ORD-2026-004 — Uni-100 x20, Uni-8085 x15, Uni-8400 x10 — 16 442 $" },
      { date: "2026-02-28", type: "note", text: "Réunion via Teams — David demande tarif distributeur préférentiel Q2" },
      { date: "2026-02-10", type: "email", text: "Contrat annuel — brouillon envoyé pour révision" },
    ],
  },
  {
    id: "C007",
    name: "ProFinish Calgary",
    contact: "Jordan Patel",
    phone: "403-555-0714",
    email: "jpatel@profinish.ca",
    type: "Installateur",
    region: "Alberta",
    address: "11250 50 St SE",
    city: "Calgary",
    province: "AB",
    postalCode: "T2C 4P5",
    country: "Canada",
    tier: "MED",
    orders: 6,
    spent: 14800,
    lastOrder: "2026-02-20",
    status: "active",
    agentAssigned: "Tyler Morrison",
    paymentTerms: "Net 30",
    notes: "Nouveau client — premier achat août 2025. Croissance prometteuse. Marché de Calgary en expansion.",
    lat: 51.0447,
    lng: -114.0719,
    activity: [
      { date: "2026-02-20", type: "order", text: "Commande — Uni-100 x8, Primer X x6 — 3 390 $" },
      { date: "2026-01-15", type: "call", text: "Appel de suivi — Jordan très satisfait de la qualité" },
    ],
  },
  {
    id: "C008",
    name: "Planchers Rive-Sud",
    contact: "François Lemieux",
    phone: "450-555-0829",
    email: "flemieux@planchersrs.ca",
    type: "Installateur",
    region: "Rive-Sud",
    address: "540 Boulevard Taschereau",
    city: "Saint-Hubert",
    province: "QC",
    postalCode: "J3Y 2P5",
    country: "Canada",
    tier: "LOW",
    orders: 4,
    spent: 8400,
    lastOrder: "2026-02-08",
    status: "active",
    agentAssigned: "Philippe Dubois",
    paymentTerms: "Net 15",
    notes: "Petite entreprise familiale. Potentiel de devenir MED si Philippe les accompagne bien. Fidèles à la marque.",
    lat: 45.4956,
    lng: -73.4437,
    activity: [
      { date: "2026-02-08", type: "order", text: "Commande — Uni-4protek x6 — 1 440 $" },
      { date: "2026-01-20", type: "call", text: "François demande échantillons Uni-8085 pour présenter à un client" },
    ],
  },
  {
    id: "C009",
    name: "Ottawa Floor Experts",
    contact: "Amanda Ross",
    phone: "613-555-0956",
    email: "aross@ottawafloor.ca",
    type: "Installateur",
    region: "Ottawa",
    address: "1900 St. Laurent Blvd",
    city: "Ottawa",
    province: "ON",
    postalCode: "K1G 4K1",
    country: "Canada",
    tier: "MED",
    orders: 13,
    spent: 34600,
    lastOrder: "2026-03-02",
    status: "active",
    agentAssigned: "Tyler Morrison",
    paymentTerms: "Net 30",
    notes: "Client stable en région d'Ottawa. Gouvernement fédéral parmi ses clients — commandes volumineuses ponctuelles.",
    lat: 45.4215,
    lng: -75.6972,
    activity: [
      { date: "2026-03-02", type: "order", text: "Commande — Uni-100 x12, Uni-8085 x8 — 5 900 $" },
      { date: "2026-02-18", type: "email", text: "Amanda demande fiche technique Uni-8400 pour soumission gouvernementale" },
    ],
  },
  {
    id: "C010",
    name: "Garage Pro Halifax",
    contact: "Patrick O'Brien",
    phone: "902-555-1033",
    email: "pobrien@garagepro.ca",
    type: "Installateur",
    region: "Maritimes",
    address: "700 Windmill Road",
    city: "Dartmouth",
    province: "NS",
    postalCode: "B3B 1C1",
    country: "Canada",
    tier: "LOW",
    orders: 3,
    spent: 6200,
    lastOrder: "2026-01-28",
    status: "inactive",
    agentAssigned: "Ryan Cooper",
    paymentTerms: "Net 15",
    notes: "Nouveau client. Ryan doit valider si l'entreprise est en expansion ou si c'est un achat ponctuel.",
    lat: 44.6658,
    lng: -63.5669,
    activity: [
      { date: "2026-01-28", type: "order", text: "Première commande — Primer X x10, Uni-100 x3 — 2 705 $" },
      { date: "2026-02-15", type: "call", text: "Pas de réponse — Ryan laisse message" },
    ],
  },
];

// ── CANADA MAP APPROXIMATE POSITIONS (for mock map) ──
// Province bounding boxes used to position client pins on SVG map
// TODO: Replace MapMock component with Mapbox GL JS
// Required: process.env.MAPBOX_TOKEN (or VITE_MAPBOX_TOKEN in Vite)
// Initialization: new mapboxgl.Map({ container: 'map', style: 'mapbox://styles/mapbox/dark-v11', center: [lng, lat], zoom: 5, accessToken: MAPBOX_TOKEN })

const MAP_BOUNDS = { minLng: -141, maxLng: -52, minLat: 42, maxLat: 70 };

function lngToX(lng: number, w: number) {
  return ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * w;
}
function latToY(lat: number, h: number) {
  return h - ((lat - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * h;
}

// ── ICONS ──
const Ico = {
  plus: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  list: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  map: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  ),
  search: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  close: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  edit: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  phone: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.95 10.5a19.79 19.79 0 01-3.07-8.67A2 2 0 012.88 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
    </svg>
  ),
  mail: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  pin: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  order: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  note: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  call: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.95 10.5a19.79 19.79 0 01-3.07-8.67A2 2 0 012.88 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
    </svg>
  ),
  email: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  user: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  dollar: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  ),
  users: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  chev: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  fire: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 12c2-2.96 0-7-1-8 0 3.038-1.773 4.741-3 6-1.226 1.26-2 3.24-2 5a6 6 0 1012 0c0-1.532-1.056-3.94-2-5-1.786 3-2 2-4 2z" />
    </svg>
  ),
};

// ── SHARED SMALL COMPONENTS ──

const Badge = ({ s }: { s: ClientStatus }) => {
  const { t } = useLanguage();
  const v = s === "active"
    ? { bg: T.greenBg, c: T.green, l: t("active", "Actif") }
    : { bg: "#f3f4f6", c: T.textMid, l: t("inactive", "Inactif") };
  return (
    <span style={{ background: v.bg, color: v.c, padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      {v.l}
    </span>
  );
};

const TierBadge = ({ tier }: { tier: string }) => {
  const map: Record<string, { bg: string; c: string }> = {
    HIGH: { bg: `${T.main}14`, c: T.main },
    MED: { bg: T.orangeBg, c: T.orange },
    LOW: { bg: "#f3f4f6", c: T.textMid },
  };
  const v = map[tier] || map.LOW;
  return (
    <span style={{ background: v.bg, color: v.c, padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
      {tier}
    </span>
  );
};

const TypeBadge = ({ type }: { type: string }) => (
  <span style={{
    background: type === "Installateur" ? T.blueBg : "#f3e8ff",
    color: type === "Installateur" ? "#2563eb" : "#6d28d9",
    padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700,
  }}>
    {type}
  </span>
);

type BtnProps = {
  children: React.ReactNode;
  v?: "primary" | "secondary" | "ghost" | "outline" | "danger";
  sz?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
  disabled?: boolean;
};

const Btn = ({ children, v = "primary", sz = "md", icon, onClick, style: s, disabled }: BtnProps) => {
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6, border: "none",
    borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer", fontWeight: 600,
    transition: "all 0.15s", whiteSpace: "nowrap", fontFamily: "inherit",
    opacity: disabled ? 0.5 : 1,
  };
  const sizes = { sm: { padding: "5px 10px", fontSize: 11 }, md: { padding: "8px 16px", fontSize: 13 }, lg: { padding: "10px 20px", fontSize: 14 } };
  const vars: Record<string, React.CSSProperties> = {
    primary: { background: T.main, color: "#fff" },
    secondary: { background: T.silverLight, color: T.text },
    ghost: { background: "transparent", color: T.textMid, padding: "4px 8px" },
    outline: { background: "transparent", color: T.main, border: `1.5px solid ${T.main}` },
    danger: { background: T.red, color: "#fff" },
  };
  return (
    <button disabled={disabled} onClick={onClick} style={{ ...base, ...sizes[sz], ...vars[v], ...s }}>
      {icon}{children}
    </button>
  );
};

// ── ACTIVITY ICON ──
const ActivityIcon = ({ type }: { type: ActivityEntry["type"] }) => {
  const icons = {
    order: { icon: <Ico.order />, bg: T.blueBg, c: "#2563eb" },
    note: { icon: <Ico.note />, bg: "#f3f4f6", c: T.textMid },
    call: { icon: <Ico.call />, bg: T.greenBg, c: T.green },
    email: { icon: <Ico.email />, bg: T.orangeBg, c: T.orange },
  };
  const v = icons[type];
  return (
    <div style={{ width: 28, height: 28, borderRadius: "50%", background: v.bg, color: v.c, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {v.icon}
    </div>
  );
};

// ── KPI CARD ──
const KpiCard = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) => (
  <div style={{ background: T.card, borderRadius: 10, padding: "16px 20px", border: `1px solid ${T.border}`, flex: "1 1 180px", minWidth: 160 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <div style={{ background: `${T.main}12`, borderRadius: 8, padding: 8, color: T.main, display: "flex" }}>{icon}</div>
    </div>
    <div style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: -0.5 }}>{value}</div>
    <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: T.textMid, marginTop: 3 }}>{sub}</div>}
  </div>
);

// ── FORM FIELD ──
const Field = ({
  label, value, onChange, type = "text", options, required, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "email" | "tel" | "select" | "textarea";
  options?: string[];
  required?: boolean;
  placeholder?: string;
}) => {
  const base: React.CSSProperties = {
    width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${T.border}`,
    fontSize: 13, fontFamily: "inherit", color: T.text, background: T.cardAlt,
    outline: "none", boxSizing: "border-box",
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.textMid, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}{required && <span style={{ color: T.red }}> *</span>}
      </label>
      {type === "select" ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={{ ...base, cursor: "pointer" }}>
          {options?.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === "textarea" ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
          style={{ ...base, resize: "vertical" }} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={base} />
      )}
    </div>
  );
};

// ── EMPTY FORM STATE ──
const emptyForm = (): Omit<CRMClient, "id" | "activity" | "lat" | "lng"> => ({
  name: "", contact: "", phone: "", email: "",
  type: "Installateur", region: "", address: "", city: "",
  province: "QC", postalCode: "", country: "Canada",
  tier: "MED", orders: 0, spent: 0, lastOrder: "",
  status: "active", agentAssigned: "", paymentTerms: "Net 30", notes: "",
});

// ── MAP MOCK ──
// TODO: Replace this entire component with Mapbox GL JS
// Steps:
//   1. Install: npm install mapbox-gl
//   2. Add env var: VITE_MAPBOX_TOKEN=pk.your_token_here
//   3. Initialize: const map = new mapboxgl.Map({ container: mapRef.current, style: 'mapbox://styles/mapbox/dark-v11', center: [-96, 56], zoom: 3, accessToken: import.meta.env.VITE_MAPBOX_TOKEN })
//   4. Add markers for each client using: new mapboxgl.Marker(el).setLngLat([client.lng, client.lat]).setPopup(popup).addTo(map)
const MapMock = ({
  clients, onSelect, selected,
}: {
  clients: CRMClient[];
  onSelect: (c: CRMClient | null) => void;
  selected: CRMClient | null;
}) => {
  const { t } = useLanguage();
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; client: CRMClient } | null>(null);
  const W = 800, H = 420;

  const pinColor = (c: CRMClient) => {
    if (c.status === "inactive") return c.tier === "HIGH" ? T.red : T.silverDark;
    if (c.tier === "HIGH") return T.main;
    if (c.tier === "MED") return T.blue;
    return T.silver;
  };

  return (
    <div style={{ position: "relative", background: "#1a2332", borderRadius: 12, overflow: "hidden", border: `1px solid rgba(0,0,0,0.06)` }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        {/* Ocean background */}
        <rect width={W} height={H} fill="#1a2332" />

        {/* Canada land mass simplified */}
        <g opacity="0.18">
          {/* Quebec */}
          <ellipse cx={535} cy={185} rx={70} ry={90} fill="#4a6a8a" />
          {/* Ontario */}
          <ellipse cx={430} cy={220} rx={75} ry={70} fill="#4a6a8a" />
          {/* BC */}
          <ellipse cx={120} cy={230} rx={65} ry={75} fill="#4a6a8a" />
          {/* Prairies */}
          <rect x={185} y={160} width={200} height={130} rx={8} fill="#4a6a8a" />
          {/* Maritimes */}
          <ellipse cx={640} cy={250} rx={45} ry={40} fill="#4a6a8a" />
          {/* Northern territories */}
          <ellipse cx={380} cy={80} rx={200} ry={60} fill="#3a5a7a" opacity={0.5} />
        </g>

        {/* Grid lines */}
        {[1, 2, 3, 4, 5, 6].map(i => (
          <line key={`h${i}`} x1={0} y1={(H / 6) * i} x2={W} y2={(H / 6) * i} stroke="rgba(0,0,0,0.03)" strokeWidth={1} />
        ))}
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <line key={`v${i}`} x1={(W / 8) * i} y1={0} x2={(W / 8) * i} y2={H} stroke="rgba(0,0,0,0.03)" strokeWidth={1} />
        ))}

        {/* Province labels */}
        {[
          { label: "BC", cx: 120, cy: 240 },
          { label: "AB", cx: 225, cy: 220 },
          { label: "SK", cx: 295, cy: 215 },
          { label: "MB", cx: 355, cy: 215 },
          { label: "ON", cx: 430, cy: 225 },
          { label: "QC", cx: 535, cy: 200 },
          { label: "NB/NS", cx: 638, cy: 258 },
        ].map(p => (
          <text key={p.label} x={p.cx} y={p.cy} textAnchor="middle" fill="rgba(0,0,0,0.08)" fontSize={11} fontFamily="Outfit,sans-serif" fontWeight={600}>
            {p.label}
          </text>
        ))}

        {/* Watermark */}
        <text x={W / 2} y={H - 16} textAnchor="middle" fill="rgba(0,0,0,0.06)" fontSize={10} fontFamily="Outfit,sans-serif">
          MOCK MAP — À remplacer par Mapbox GL JS (VITE_MAPBOX_TOKEN)
        </text>

        {/* Client pins */}
        {clients.map(c => {
          const x = lngToX(c.lng, W);
          const y = latToY(c.lat, H);
          const color = pinColor(c);
          const isSelected = selected?.id === c.id;
          const isHov = hovered === c.id;

          return (
            <g
              key={c.id}
              transform={`translate(${x}, ${y})`}
              style={{ cursor: "pointer" }}
              onClick={() => onSelect(c)}
              onMouseEnter={(e) => {
                setHovered(c.id);
                const rect = (e.currentTarget.closest("svg") as SVGElement)?.getBoundingClientRect();
                const svgEl = e.currentTarget.closest("svg") as SVGSVGElement;
                const vb = svgEl?.viewBox.baseVal;
                const scaleX = rect ? rect.width / vb.width : 1;
                const scaleY = rect ? rect.height / vb.height : 1;
                setTooltip({ x: x * scaleX, y: y * scaleY, client: c });
              }}
              onMouseLeave={() => { setHovered(null); setTooltip(null); }}
            >
              {isSelected && (
                <circle r={14} fill="none" stroke={color} strokeWidth={2} opacity={0.4}>
                  <animate attributeName="r" values="14;20;14" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle r={isSelected || isHov ? 8 : 6} fill={color} stroke="#1a2332" strokeWidth={2} style={{ transition: "r 0.15s" }} />
              {(isSelected || isHov) && (
                <circle r={3} fill="#fff" />
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: "absolute",
          left: tooltip.x + 14,
          top: Math.max(8, tooltip.y - 50),
          background: "#0f172a",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 8,
          padding: "10px 14px",
          pointerEvents: "none",
          minWidth: 190,
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          zIndex: 10,
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#fff", marginBottom: 4 }}>{tooltip.client.name}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>{tooltip.client.city}, {tooltip.client.province}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 700, background: tooltip.client.tier === "HIGH" ? `${T.main}40` : "#ffffff18", color: tooltip.client.tier === "HIGH" ? "#818cf8" : "rgba(255,255,255,0.6)", padding: "2px 8px", borderRadius: 4 }}>
              {tooltip.client.tier}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, background: tooltip.client.status === "active" ? `${T.green}30` : "#ffffff10", color: tooltip.client.status === "active" ? T.green : T.textLight, padding: "2px 8px", borderRadius: 4 }}>
              {tooltip.client.status === "active" ? t("active", "Actif") : t("inactive", "Inactif")}
            </span>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{fmt(tooltip.client.spent)}</div>
        </div>
      )}

      {/* Legend */}
      <div style={{ position: "absolute", bottom: 12, left: 12, display: "flex", gap: 12, background: "rgba(0,0,0,0.5)", borderRadius: 6, padding: "6px 12px" }}>
        {[
          { color: T.main, label: t("crm.active_high", "Actif HIGH") },
          { color: T.blue, label: t("crm.active_med", "Actif MED") },
          { color: T.silver, label: t("crm.active_low", "Actif LOW") },
          { color: T.red, label: t("crm.inactive_high", "Inactif HIGH") },
          { color: T.silverDark, label: t("inactive", "Inactif") },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.55)" }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── CLIENT DETAIL PANEL ──
const ClientPanel = ({
  client, onClose, onEdit,
}: {
  client: CRMClient;
  onClose: () => void;
  onEdit: (c: CRMClient) => void;
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"info" | "activity">("info");

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: 440,
      background: T.card, borderLeft: `1px solid ${T.border}`,
      boxShadow: "-8px 0 40px rgba(0,0,0,0.12)", zIndex: 200,
      display: "flex", flexDirection: "column", overflow: "hidden",
      animation: "slideInRight 0.22s ease",
    }}>
      <style>{`@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

      {/* Header */}
      <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: T.text, marginBottom: 4 }}>{client.name}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <TypeBadge type={client.type} />
              <TierBadge tier={client.tier} />
              <Badge s={client.status} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn v="outline" sz="sm" icon={<Ico.edit />} onClick={() => onEdit(client)}>{t("edit", "Modifier")}</Btn>
            <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: T.textLight, display: "flex", padding: 4 }}>
              <Ico.close />
            </button>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: `1px solid ${T.border}` }}>
        {[
          { label: t("crm.orders", "Commandes"), value: client.orders },
          { label: t("crm.total_spent", "Total dépensé"), value: fmt(client.spent) },
          { label: t("crm.last_order", "Dernière cmd."), value: client.lastOrder ? new Date(client.lastOrder).toLocaleDateString("fr-CA", { day: "numeric", month: "short" }) : "—" },
        ].map((s, i) => (
          <div key={i} style={{ padding: "14px 16px", textAlign: "center", borderRight: i < 2 ? `1px solid ${T.border}` : "none" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>{s.value}</div>
            <div style={{ fontSize: 11, color: T.textLight }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
        {[["info", t("crm.information", "Informations")], ["activity", t("crm.activity", "Activité")]].map(([k, l]) => (
          <button key={k} onClick={() => setActiveTab(k as any)} style={{
            flex: 1, padding: "12px 16px", border: "none", background: "transparent",
            fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            color: activeTab === k ? T.main : T.textMid,
            borderBottom: activeTab === k ? `2px solid ${T.main}` : "2px solid transparent",
            transition: "all 0.15s",
          }}>
            {l}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {activeTab === "info" ? (
          <div>
            {/* Contact */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>{t("crm.contact", "Contact")}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ color: T.textLight, display: "flex", width: 18 }}><Ico.user /></div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{client.contact}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ color: T.textLight, display: "flex", width: 18 }}><Ico.phone /></div>
                  <span style={{ fontSize: 13, color: T.text }}>{client.phone}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ color: T.textLight, display: "flex", width: 18 }}><Ico.mail /></div>
                  <span style={{ fontSize: 13, color: T.text }}>{client.email}</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ color: T.textLight, display: "flex", width: 18, marginTop: 1 }}><Ico.pin /></div>
                  <div style={{ fontSize: 13, color: T.text }}>
                    <div>{client.address}</div>
                    <div>{client.city}, {client.province} {client.postalCode}</div>
                    <div>{client.country}</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: T.border, marginBottom: 20 }} />

            {/* Commercial info */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>{t("crm.commercial_info", "Informations commerciales")}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: t("crm.assigned_to", "Agent assigné"), value: client.agentAssigned },
                  { label: t("crm.payment_terms", "Termes de paiement"), value: client.paymentTerms },
                  { label: t("crm.tier_level", "Niveau (tier)"), value: client.tier },
                  { label: t("type", "Type"), value: client.type },
                  { label: t("crm.region", "Région"), value: client.region },
                  { label: t("status", "Statut"), value: client.status === "active" ? t("active", "Actif") : t("inactive", "Inactif") },
                ].map((f, i) => (
                  <div key={i} style={{ background: T.cardAlt, borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, color: T.textLight, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 3 }}>{f.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{f.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {client.notes && (
              <>
                <div style={{ height: 1, background: T.border, marginBottom: 20 }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>{t("notes", "Notes")}</div>
                  <div style={{ background: T.cardAlt, borderRadius: 8, padding: "12px 14px", fontSize: 13, color: T.text, lineHeight: 1.55 }}>
                    {client.notes}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
              {t("crm.activity_history", "Historique d'activité")}
            </div>
            <div style={{ position: "relative" }}>
              {client.activity.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 16, position: "relative" }}>
                  {i < client.activity.length - 1 && (
                    <div style={{ position: "absolute", left: 14, top: 28, bottom: -16, width: 1, background: T.border }} />
                  )}
                  <ActivityIcon type={a.type} />
                  <div style={{ flex: 1, paddingTop: 4 }}>
                    <div style={{ fontSize: 12, color: T.textLight, marginBottom: 3 }}>
                      {new Date(a.date).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                    <div style={{ fontSize: 13, color: T.text, lineHeight: 1.4 }}>{a.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── CLIENT FORM MODAL ──
const ClientFormModal = ({
  initial, onSave, onClose,
}: {
  initial?: CRMClient | null;
  onSave: (data: Omit<CRMClient, "id" | "activity" | "lat" | "lng">) => void;
  onClose: () => void;
}) => {
  const { t } = useLanguage();
  const [form, setForm] = useState<Omit<CRMClient, "id" | "activity" | "lat" | "lng">>(
    initial
      ? { name: initial.name, contact: initial.contact, phone: initial.phone, email: initial.email, type: initial.type, region: initial.region, address: initial.address, city: initial.city, province: initial.province, postalCode: initial.postalCode, country: initial.country, tier: initial.tier, orders: initial.orders, spent: initial.spent, lastOrder: initial.lastOrder, status: initial.status, agentAssigned: initial.agentAssigned, paymentTerms: initial.paymentTerms, notes: initial.notes }
      : emptyForm()
  );

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.name.trim() !== "" && form.contact.trim() !== "";

  const PROVINCES = ["QC", "ON", "BC", "AB", "SK", "MB", "NB", "NS", "PE", "NL", "NT", "YT", "NU"];
  const AGENTS = ["Philippe Dubois", "Nadia Khoury", "Tyler Morrison", "Julie Bergeron", "Ryan Cooper"];
  const TERMS = ["Net 15", "Net 30", "Net 45", "Net 60", "Comptant"];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(230,228,224,0.35)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.15s ease",
    }}>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
      <div style={{
        background: T.card, borderRadius: 14, width: "100%", maxWidth: 600,
        maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
        animation: "scaleIn 0.18s ease",
      }}>
        <style>{`@keyframes scaleIn{from{transform:scale(0.96);opacity:0}to{transform:scale(1);opacity:1}}`}</style>

        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>
            {initial ? t("crm.edit_client", "Modifier le client") : t("crm.add_client", "Ajouter un client")}
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: T.textLight, display: "flex" }}>
            <Ico.close />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.main, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>{t("crm.company", "Entreprise")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label={t("clients.company_name", "Nom de l'entreprise")} value={form.name} onChange={set("name")} required placeholder="Ex: Époxy Pro Montréal" />
            </div>
            <Field label="Type" value={form.type} onChange={set("type")} type="select" options={["Installateur", "Distributeur"]} />
            <Field label="Tier" value={form.tier} onChange={set("tier")} type="select" options={["HIGH", "MED", "LOW"]} />
          </div>

          <div style={{ height: 1, background: T.border, margin: "4px 0 18px" }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: T.main, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>{t("crm.main_contact", "Contact principal")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label={t("clients.contact_name", "Nom du contact")} value={form.contact} onChange={set("contact")} required placeholder="Jean-Pierre Tremblay" />
            </div>
            <Field label={t("phone", "Téléphone")} value={form.phone} onChange={set("phone")} type="tel" placeholder="514-555-0000" />
            <Field label={t("email", "Courriel")} value={form.email} onChange={set("email")} type="email" placeholder="contact@entreprise.ca" />
          </div>

          <div style={{ height: 1, background: T.border, margin: "4px 0 18px" }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: T.main, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
            {t("address", "Adresse")}
            {/* TODO: Replace text fields with Mapbox Geocoding API autocomplete */}
            {/* API: https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json?access_token=VITE_MAPBOX_TOKEN */}
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.textMid, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 }}>
              {t("crm.street_address", "Adresse (rue)")}
            </label>
            <AddressAutocomplete
              style={{
                width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${T.border}`,
                fontSize: 13, fontFamily: "inherit", color: T.text, background: T.cardAlt,
                outline: "none", boxSizing: "border-box" as const,
              }}
              value={form.address}
              onChange={set("address")}
              onSelect={s => {
                setForm(f => ({
                  ...f,
                  address: s.address,
                  city: s.city,
                  province: s.province,
                  postalCode: s.postal_code,
                  country: s.country === "United States" ? "États-Unis" : s.country,
                }));
              }}
              placeholder="8420 Rue Hochelaga"
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "0 12px" }}>
            <Field label={t("city", "Ville")} value={form.city} onChange={set("city")} placeholder="Montréal" />
            <Field label={t("province", "Province")} value={form.province} onChange={set("province")} type="select" options={PROVINCES} />
            <Field label={t("crm.postal_code", "Code postal")} value={form.postalCode} onChange={set("postalCode")} placeholder="H1L 2P5" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label={t("country", "Pays")} value={form.country} onChange={set("country")} placeholder="Canada" />
            <Field label={t("crm.region", "Région")} value={form.region} onChange={set("region")} placeholder="Montréal" />
          </div>

          <div style={{ height: 1, background: T.border, margin: "4px 0 18px" }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: T.main, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>{t("crm.commercial", "Commercial")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label={t("crm.assigned_to", "Agent assigné")} value={form.agentAssigned} onChange={set("agentAssigned")} type="select" options={["", ...AGENTS]} />
            <Field label={t("crm.payment_terms", "Termes de paiement")} value={form.paymentTerms} onChange={set("paymentTerms")} type="select" options={TERMS} />
            <Field label={t("status", "Statut")} value={form.status} onChange={set("status")} type="select" options={["active", "inactive"]} />
          </div>
          <Field label={t("crm.internal_notes", "Notes internes")} value={form.notes} onChange={set("notes")} type="textarea" placeholder={t("crm.notes_placeholder", "Notes sur le client, préférences, informations importantes...")} />
        </div>

        <div style={{ padding: "16px 24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn v="secondary" onClick={onClose}>{t("cancel", "Annuler")}</Btn>
          <Btn disabled={!valid} onClick={() => valid && onSave(form)} icon={<Ico.check />}>
            {initial ? t("save", "Sauvegarder") : t("crm.add_client", "Ajouter le client")}
          </Btn>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ══════════════════════════════════════════════════════════════
export const ClientsCRMPage = () => {
  const { t } = useLanguage();
  const [clients, setClients] = useState<CRMClient[]>(CLIENTS_CRM);
  const [view, setView] = useState<"list" | "map">("list");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterTier, setFilterTier] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null);
  const [editingClient, setEditingClient] = useState<CRMClient | null | "new">(null);

  const filtered = useMemo(() => {
    return clients.filter(c => {
      if (filterType !== "all" && c.type !== filterType) return false;
      if (filterTier !== "all" && c.tier !== filterTier) return false;
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (search) {
        const s = search.toLowerCase();
        return c.name.toLowerCase().includes(s) || c.contact.toLowerCase().includes(s) || c.region.toLowerCase().includes(s) || c.city.toLowerCase().includes(s);
      }
      return true;
    });
  }, [clients, filterType, filterTier, filterStatus, search]);

  const totalRevenue = clients.filter(c => c.status === "active").reduce((a, c) => a + c.spent, 0);
  const activeCount = clients.filter(c => c.status === "active").length;
  const avgValue = activeCount > 0 ? totalRevenue / activeCount : 0;
  const newThisMonth = clients.filter(c => c.lastOrder >= "2026-03-01").length;

  const handleSave = (data: Omit<CRMClient, "id" | "activity" | "lat" | "lng">) => {
    if (editingClient === "new") {
      const newClient: CRMClient = {
        ...data,
        id: `C${String(clients.length + 1).padStart(3, "0")}`,
        activity: [],
        lat: 45.5,
        lng: -73.5,
      };
      setClients(prev => [...prev, newClient]);
    } else if (editingClient) {
      setClients(prev => prev.map(c => c.id === editingClient.id ? { ...c, ...data } : c));
      if (selectedClient?.id === editingClient.id) {
        setSelectedClient(prev => prev ? { ...prev, ...data } : null);
      }
    }
    setEditingClient(null);
  };

  const TABLE_COLS = [
    {
      key: "name", label: t("crm.company", "Entreprise"),
      render: (r: CRMClient) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: `${T.main}14`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: T.main, flexShrink: 0 }}>
            {r.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{r.name}</div>
            <div style={{ fontSize: 11, color: T.textLight }}>{r.contact}</div>
          </div>
        </div>
      ),
    },
    { key: "type", label: t("type", "Type"), render: (r: CRMClient) => <TypeBadge type={r.type} /> },
    {
      key: "location", label: t("crm.location", "Localisation"),
      render: (r: CRMClient) => (
        <div>
          <div style={{ fontSize: 13, color: T.text }}>{r.city}</div>
          <div style={{ fontSize: 11, color: T.textLight }}>{r.province}</div>
        </div>
      ),
    },
    { key: "tier", label: "Tier", render: (r: CRMClient) => <TierBadge tier={r.tier} /> },
    { key: "orders", label: t("crm.orders_short", "Cmd."), align: "center" as const, render: (r: CRMClient) => <span style={{ fontWeight: 600 }}>{r.orders}</span> },
    { key: "spent", label: t("total", "Total"), align: "right" as const, render: (r: CRMClient) => <strong style={{ color: T.text }}>{fmt(r.spent)}</strong> },
    {
      key: "lastOrder", label: t("crm.last_order", "Dernière cmd."), align: "center" as const,
      render: (r: CRMClient) => (
        <span style={{ fontSize: 12, color: T.textMid }}>
          {r.lastOrder ? new Date(r.lastOrder).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" }) : "—"}
        </span>
      ),
    },
    { key: "agentAssigned", label: t("agent", "Agent"), render: (r: CRMClient) => <span style={{ fontSize: 12, color: T.textMid }}>{r.agentAssigned || "—"}</span> },
    { key: "status", label: t("status", "Statut"), render: (r: CRMClient) => <Badge s={r.status} /> },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: T.text }}>CRM Clients</h2>
          <p style={{ margin: 0, color: T.textMid, fontSize: 14 }}>
            {clients.length} {t("crm.clients_label", "clients")} · {activeCount} {t("crm.actifs", "actifs")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* View toggle */}
          <div style={{ display: "flex", background: T.silverLight, borderRadius: 6, padding: 2, gap: 2 }}>
            {[["list", <Ico.list />, "Liste"], ["map", <Ico.map />, "Carte"]].map(([k, icon, label]) => (
              <button key={k as string} onClick={() => setView(k as "list" | "map")} style={{
                display: "flex", alignItems: "center", gap: 5, padding: "5px 12px",
                border: "none", borderRadius: 5, cursor: "pointer", fontFamily: "inherit",
                fontSize: 12, fontWeight: 600,
                background: view === k ? T.main : "transparent",
                color: view === k ? "#fff" : T.textMid,
                transition: "all 0.15s",
              }}>
                {icon as React.ReactNode}
                {label as string}
              </button>
            ))}
          </div>
          <Btn icon={<Ico.plus />} onClick={() => setEditingClient("new")}>{t("crm.add_client", "Ajouter un client")}</Btn>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <KpiCard icon={<Ico.users />} label={t("crm.total_clients", "Total clients")} value={clients.length} sub={`${activeCount} ${t("crm.actifs", "actifs")}, ${clients.length - activeCount} ${t("crm.inactifs", "inactifs")}`} />
        <KpiCard icon={<Ico.dollar />} label={t("crm.cumulative_revenue", "Revenus cumulés (actifs)")} value={fmt(totalRevenue)} />
        <KpiCard icon={<Ico.fire />} label={t("crm.avg_value_client", "Valeur moyenne / client")} value={fmt(avgValue)} />
        <KpiCard icon={<Ico.check />} label={t("crm.active_this_month", "Actifs ce mois-ci")} value={newThisMonth} sub={t("crm.orders_march", "Commandes en mars 2026")} />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flexGrow: 1, minWidth: 200, maxWidth: 320 }}>
          <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.textLight }}>
            <Ico.search />
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("crm.search_client", "Chercher un client...")}
            style={{
              width: "100%", padding: "8px 10px 8px 34px", borderRadius: 6,
              border: `1px solid ${T.border}`, fontSize: 13, fontFamily: "inherit",
              color: T.text, background: T.card, boxSizing: "border-box", outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          {[["all", t("all", "Tous")], ["Installateur", t("crm.installers", "Installateurs")], ["Distributeur", t("crm.distributors", "Distributeurs")]].map(([k, v]) => (
            <Btn key={k} v={filterType === k ? "primary" : "secondary"} sz="sm" onClick={() => setFilterType(k)}>{v}</Btn>
          ))}
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          {[["all", `Tier: ${t("all", "Tous")}`], ["HIGH", "HIGH"], ["MED", "MED"], ["LOW", "LOW"]].map(([k, v]) => (
            <Btn key={k} v={filterTier === k ? "primary" : "secondary"} sz="sm" onClick={() => setFilterTier(k)}>{v}</Btn>
          ))}
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          {[["all", `${t("status", "Statut")}: ${t("all", "Tous")}`], ["active", t("crm.actifs", "Actifs")], ["inactive", t("crm.inactifs", "Inactifs")]].map(([k, v]) => (
            <Btn key={k} v={filterStatus === k ? "primary" : "secondary"} sz="sm" onClick={() => setFilterStatus(k)}>{v}</Btn>
          ))}
        </div>
      </div>

      {/* Main content */}
      {view === "list" ? (
        <div style={{ background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.textMid }}>
              {filtered.length} client{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {TABLE_COLS.map((c, i) => (
                    <th key={i} style={{
                      textAlign: c.align || "left", padding: "10px 16px",
                      borderBottom: `2px solid ${T.border}`, color: T.textLight,
                      fontWeight: 600, fontSize: 11, textTransform: "uppercase",
                      letterSpacing: 0.5, whiteSpace: "nowrap", background: T.cardAlt,
                    }}>
                      {c.label}
                    </th>
                  ))}
                  <th style={{ padding: "10px 16px", borderBottom: `2px solid ${T.border}`, background: T.cardAlt }} />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={TABLE_COLS.length + 1} style={{ textAlign: "center", padding: "40px 20px", color: T.textLight, fontSize: 14 }}>
                      {t("clients.no_clients", "Aucun client trouvé")}
                    </td>
                  </tr>
                ) : filtered.map((row, ri) => (
                  <tr
                    key={ri}
                    onClick={() => setSelectedClient(row)}
                    style={{ cursor: "pointer", transition: "background 0.1s", background: selectedClient?.id === row.id ? `${T.main}08` : "transparent" }}
                    onMouseOver={e => { if (selectedClient?.id !== row.id) e.currentTarget.style.background = "#f8f8fc"; }}
                    onMouseOut={e => { if (selectedClient?.id !== row.id) e.currentTarget.style.background = "transparent"; }}
                  >
                    {TABLE_COLS.map((c, ci) => (
                      <td key={ci} style={{ textAlign: c.align || "left", padding: "12px 16px", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>
                        {c.render ? c.render(row) : (row as any)[c.key]}
                      </td>
                    ))}
                    <td style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`, textAlign: "right" }}>
                      <button
                        onClick={e => { e.stopPropagation(); setEditingClient(row); }}
                        style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 5, padding: "4px 8px", cursor: "pointer", color: T.textMid, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}
                      >
                        <Ico.edit /> {t("edit", "Modifier")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
          <div>
            <MapMock clients={filtered} onSelect={setSelectedClient} selected={selectedClient} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 420, overflowY: "auto", paddingRight: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
              {filtered.length} client{filtered.length !== 1 ? "s" : ""}
            </div>
            {filtered.map(c => (
              <div
                key={c.id}
                onClick={() => setSelectedClient(c)}
                style={{
                  background: selectedClient?.id === c.id ? `${T.main}10` : T.card,
                  border: `1px solid ${selectedClient?.id === c.id ? T.main : T.border}`,
                  borderRadius: 8, padding: "12px 14px", cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseOver={e => { if (selectedClient?.id !== c.id) (e.currentTarget as HTMLDivElement).style.borderColor = T.silverDark; }}
                onMouseOut={e => { if (selectedClient?.id !== c.id) (e.currentTarget as HTMLDivElement).style.borderColor = T.border; }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, color: T.text, marginBottom: 4 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: T.textLight, marginBottom: 8 }}>{c.city}, {c.province}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <TierBadge tier={c.tier} />
                  <Badge s={c.status} />
                </div>
                <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: T.textMid }}>{fmt(c.spent)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Client detail panel */}
      {selectedClient && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 199 }}
            onClick={() => setSelectedClient(null)}
          />
          <ClientPanel
            client={selectedClient}
            onClose={() => setSelectedClient(null)}
            onEdit={c => setEditingClient(c)}
          />
        </>
      )}

      {/* Form modal */}
      {editingClient !== null && (
        <ClientFormModal
          initial={editingClient === "new" ? null : editingClient}
          onSave={handleSave}
          onClose={() => setEditingClient(null)}
        />
      )}
    </div>
  );
};

export default ClientsCRMPage;
