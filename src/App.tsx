import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { OrdersProvider } from "./orders/OrdersContext";
import { AppProvider, useApp, PrefillData } from "./AppContext";
import FloatingNavOrb from "./navigation/FloatingNavOrb";
import TabBar from "./navigation/TabBar";
import TabContent from "./navigation/TabContent";
import TabOverflowToast from "./navigation/TabOverflowToast";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SimulationProvider } from "./contexts/SimulationContext";
import SimulationBanner from "./components/simulation/SimulationBanner";
import { useSimulation } from "./contexts/SimulationContext";
import { supabase } from "./supabaseClient";
import { T } from "./theme";
import SphereBackground from "./components/SphereBackground";
import NotificationDropdown from "./components/NotificationDropdown";
import { useLanguage } from "./i18n/LanguageContext";

// Lazy-loaded pages (code-splitting)
const ProductsPage = React.lazy(() => import("./ProductsPage"));
const ClientsCRMPage = React.lazy(() => import("./ClientsCRMPage"));
const OrdersController = React.lazy(() => import("./orders/OrdersController"));
const PricelistGeneratorPage = React.lazy(() => import("./pricelist/PricelistGeneratorPage"));
const MarginCalculatorPage = React.lazy(() => import("./margin/MarginCalculatorPage"));
const CRMPipelineTeamPage = React.lazy(() => import("./sales/CRMPipelineTeamPage"));
const PersonalWorkstationPage = React.lazy(() => import("./sales/PersonalWorkstationPage"));
const CalendarPage = React.lazy(() => import("./sales/CalendarPage"));
const MyTeamPage = React.lazy(() => import("./sales/MyTeamPage"));
const AdminSamplesPage = React.lazy(() => import("./sales/AdminSamplesPage"));
const MyClientsPage = React.lazy(() => import("./clients/MyClientsPage"));
const AdminClientsPage = React.lazy(() => import("./clients/AdminClientsPage"));
const AdminTeamsPage = React.lazy(() => import("./sales/team/AdminTeamsPage"));
const PickupTicketsPage = React.lazy(() => import("./storeops/PickupTicketsPage"));
const InventaireStorePage = React.lazy(() => import("./storeops/InventaireStorePage"));
const ToInvoicePage = React.lazy(() => import("./storeops/ToInvoicePage"));
const BeneficeMagasinPage = React.lazy(() => import("./storeops/benefice/BeneficeMagasinPage"));
const StorePricesPage = React.lazy(() => import("./storeops/StorePricesPage"));
const UserManagement = React.lazy(() => import("./pages/admin/UserManagement"));
const AdminDashboard = React.lazy(() => import("./pages/admin/AdminDashboard"));
const UserSettings = React.lazy(() => import("./pages/settings/UserSettings"));
const LandingPage = React.lazy(() => import("./pages/landing/LandingPage"));
const LoginPage = React.lazy(() => import("./pages/auth/LoginPage"));
const StoreCodeEntry = React.lazy(() => import("./pages/auth/StoreCodeEntry"));
const StoresManagementPage = React.lazy(() => import("./pages/admin/StoresManagementPage"));
const MessagingPanel = React.lazy(() => import("./messaging/MessagingPanel"));
const AdminMessagingSettings = React.lazy(() => import("./messaging/AdminMessagingSettings"));
const ManufDashboard = React.lazy(() => import("./pages/manuf/ManufDashboard"));
const ManufInventoryView = React.lazy(() => import("./pages/manuf/ManufInventoryView"));
const ManufOrdersView = React.lazy(() => import("./pages/manuf/ManufOrdersView"));
const ManufSamplesView = React.lazy(() => import("./pages/manuf/ManufSamplesView"));
const ManufReportsView = React.lazy(() => import("./pages/manuf/ManufReportsView"));
const EmailSettingsPage = React.lazy(() => import("./pages/admin/EmailSettingsPage"));
const EmailInboxPanel = React.lazy(() => import("./email/EmailInboxPanel"));
const EmailInboxPage = React.lazy(() => import("./email/EmailInboxPage"));
const DashCompany = React.lazy(() => import("./dashboards/DashCompany"));
const DashUser = React.lazy(() => import("./dashboards/DashUser"));
const ContestAdminPage = React.lazy(() => import("./contests/ContestAdminPage"));
const AdminReportsPage = React.lazy(() => import("./reports/AdminReportsPage"));
const ActivityLogbook = React.lazy(() => import("./pages/admin/ActivityLogbook"));
const DisputesPage = React.lazy(() => import("./pages/disputes/DisputesPage"));
const TeamLeaderDashboard = React.lazy(() => import("./sales/team/TeamLeaderDashboard"));
const TeamPricesPage = React.lazy(() => import("./sales/team/TeamPricesPage"));
const TeamBeneficePage = React.lazy(() => import("./sales/team/TeamBeneficePage"));
const CommissionCalculeePage = React.lazy(() => import("./sales/CommissionCalculeePage"));

// Loading fallback for lazy-loaded pages
const PageLoader = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, color: T.textMid }}>
    <div style={{ textAlign: "center" }}>
      <div style={{ width: 28, height: 28, border: `2px solid ${T.border}`, borderTop: `2px solid ${T.main}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
      <span style={{ fontSize: 11, letterSpacing: "0.04em" }}>Loading...</span>
    </div>
  </div>
);

const I = {
  logo:()=><img src="/icons/icon-96x96.png" alt="Uniflex" width="28" height="28" style={{borderRadius:6}} />,
  dash:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  order:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  box:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  users:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  agent:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
  chart:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  shield:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  msg:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  gear:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  bell:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  search:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  chev:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
  chevR:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
  out:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  up:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>,
  dn:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
  dollar:()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  trophy:()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 22V9m4 13V9"/><rect x="6" y="2" width="12" height="7" rx="1"/></svg>,
  fire:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 12c2-2.96 0-7-1-8 0 3.038-1.773 4.741-3 6-1.226 1.26-2 3.24-2 5a6 6 0 1012 0c0-1.532-1.056-3.94-2-5-1.786 3-2 2-4 2z"/></svg>,
  star:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  drag:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>,
  sample:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/><polygon points="12 2 15 8 12 6 9 8 12 2" fill="currentColor" stroke="none"/></svg>,
  eye:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  tag:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  cube:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  eyeOff:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  plus:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  edit:()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  building:()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><path d="M9 22v-4h6v4"/></svg>,
  user:()=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  salesperf:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
  pipeline:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><line x1="9" y1="6" x2="15" y2="6"/><line x1="6" y1="9" x2="6" y2="15"/><line x1="9" y1="18" x2="15" y2="18"/><line x1="18" y1="9" x2="18" y2="15"/></svg>,
  workstation:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  calendar:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  myteam:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  myclients:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/></svg>,
  store:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l1-5h16l1 5"/><path d="M3 9c0 1.1.9 2 2 2s2-.9 2-2 .9 2 2 2 2-.9 2-2 .9 2 2 2 2-.9 2-2"/><rect x="5" y="11" width="14" height="10" rx="1"/><line x1="9" y1="21" x2="9" y2="15"/><line x1="15" y1="21" x2="15" y2="15"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
  ticketIcon:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 9a2 2 0 012-2h16a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 000-4V9z"/><line x1="12" y1="7" x2="12" y2="17" strokeDasharray="2 2"/></svg>,
  invoiceIcon:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  profitIcon:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><path d="M9 11h6"/><path d="M9 14h4"/></svg>,
  priceTag:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  mail:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
};

type MenuItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  subs?: { key: string; label: string; icon: React.ReactNode; permission?: string }[];
  badge?: number;
  permission?: string;
};

function buildMenu(t: (k: string, fb?: string) => string): MenuItem[] {
  return [
    {key:"dashboards",label:t("nav.dashboards","Dashboards"),icon:<I.dash/>,subs:[
      {key:"dash_company",label:t("nav.dashboard_company"),icon:<I.building/>,permission:"dashboard.company.view"},
      {key:"dash_user",label:t("nav.dashboard_personal"),icon:<I.user/>,permission:"dashboard.personal.view"},
    ]},
    {key:"ventes",label:t("nav.sales_tools"),icon:<I.tag/>,subs:[
      {key:"products",label:t("nav.products"),icon:<I.cube/>,permission:"ventes.products.view"},
      {key:"pricelist",label:t("nav.pricelist"),icon:<I.tag/>,permission:"ventes.pricelist.view"},
      {key:"margin_calculator",label:t("nav.margin_calculator","Margin Calculator"),icon:<I.dollar/>,permission:"ventes.margin_calculator.view"},
    ]},
    {key:"sales_performance",label:t("nav.sales_performance","Sales Performance"),icon:<I.salesperf/>,subs:[
      {key:"orders",label:t("nav.orders"),icon:<I.order/>,permission:"ventes.orders.view_own"},
      {key:"crm_pipeline_team",label:t("nav.crm"),icon:<I.pipeline/>,permission:"performance.pipeline_team.view"},
      {key:"personal_workstation",label:t("nav.workstation","Personal Workstation"),icon:<I.workstation/>,permission:"performance.workstation.view"},
      {key:"calendar",label:t("nav.calendar"),icon:<I.calendar/>,permission:"performance.calendar.view"},
      {key:"my_team",label:t("nav.my_team","My Team"),icon:<I.myteam/>,permission:"performance.my_team.view"},
      {key:"my_clients",label:t("nav.my_clients"),icon:<I.myclients/>,permission:"performance.my_clients.view"},
      {key:"admin_samples",label:t("nav.samples"),icon:<I.sample/>,permission:"ventes.samples.view_own"},
      {key:"commission_calculee",label:t("nav.commissions","Commissions"),icon:<I.chart/>,permission:"performance.commission.view"},
      {key:"team_leader_dashboard",label:t("nav.team_lead"),icon:<I.myteam/>,permission:"performance.team_leader.manage"},
      {key:"team_prices",label:t("nav.team_prices","Team Prices"),icon:<I.tag/>,permission:"performance.team_prices.view"},
      {key:"team_benefice",label:t("nav.team_profit"),icon:<I.profitIcon/>,permission:"performance.team_benefice.view"},
    ]},
    {key:"store_ops",label:t("nav.store_ops","Store OPS"),icon:<I.store/>,subs:[
      {key:"pickup_tickets",label:t("nav.pickup_tickets"),icon:<I.ticketIcon/>,permission:"storeops.pickup_tickets.view"},
      {key:"inventaire_store",label:t("nav.store_inventory"),icon:<I.box/>,permission:"storeops.inventory.view"},
      {key:"store_prices",label:t("nav.store_prices"),icon:<I.priceTag/>,permission:"storeops.prices.view"},
      {key:"benefice_magasin",label:t("nav.store_profit","Store Profit"),icon:<I.profitIcon/>,permission:"storeops.benefice.view"},
    ]},
    {key:"disputes",label:t("nav.disputes"),icon:<I.shield/>,permission:"disputes.view_own"},
    {key:"admin_orders",label:t("nav.admin_orders","Orders (Admin)"),icon:<I.order/>,permission:"ventes.orders.view_all"},
    {key:"to_invoice",label:t("nav.to_invoice"),icon:<I.invoiceIcon/>,permission:"storeops.to_invoice.view"},
    {key:"admin_samples",label:t("nav.admin_samples","Samples (Admin)"),icon:<I.sample/>,permission:"ventes.samples.view_all"},
    {key:"admin_clients",label:t("nav.admin_clients","Clients (Admin)"),icon:<I.users/>,permission:"performance.my_clients.manage"},
    {key:"admin_teams",label:t("nav.team_management"),icon:<I.myteam/>,permission:"admin.teams.view"},
    {key:"admin_contests",label:t("nav.contests"),icon:<I.trophy/>,permission:"admin.users.view"},
    {key:"admin_reports",label:t("nav.reports"),icon:<I.chart/>,permission:"reports.sales_analytics.view"},
    {key:"manuf_section",label:t("nav.manufacturer"),icon:<I.building/>,permission:"storeops.inventory.view",subs:[
      {key:"manuf_dashboard",label:t("nav.manuf_dashboard","Dashboard SCI"),icon:<I.dash/>,permission:"storeops.inventory.view"},
      {key:"manuf_inventory",label:t("nav.store_inventory"),icon:<I.box/>,permission:"storeops.inventory.view"},
      {key:"manuf_orders",label:t("nav.orders"),icon:<I.order/>,permission:"ventes.orders.view_all"},
      {key:"to_invoice",label:t("nav.to_invoice"),icon:<I.invoiceIcon/>,permission:"storeops.to_invoice.view"},
      {key:"manuf_samples",label:t("nav.samples"),icon:<I.sample/>,permission:"ventes.samples.view_all"},
      {key:"manuf_reports",label:t("nav.sci_reports"),icon:<I.chart/>,permission:"reports.financial.view"},
    ]},
    {key:"admin_section",label:t("nav.administration","Administration"),icon:<I.shield/>,permission:"admin.users.view",subs:[
      {key:"admin_users",label:t("nav.user_management"),icon:<I.users/>,permission:"admin.users.view"},
      {key:"admin_stores",label:t("nav.store_management"),icon:<I.store/>,permission:"admin.stores.view"},
      {key:"admin_dashboard",label:t("nav.admin_dashboard","Admin Dashboard"),icon:<I.dash/>,permission:"admin.users.view"},
      {key:"admin_logbook",label:t("nav.logbook"),icon:<I.chart/>,permission:"admin.logbook.view"},
      {key:"admin_messaging",label:t("nav.messaging_rules"),icon:<I.msg/>,permission:"admin.users.view"},
      {key:"admin_email_settings",label:t("nav.email_settings"),icon:<I.mail/>,permission:"admin.users.view"},
    ]},
    {key:"settings",label:t("nav.settings"),icon:<I.gear/>},
  ];
}

const OrdersVendeur = () => <OrdersController isAdmin={false} />;
const OrdersAdmin = () => <OrdersController isAdmin={true} />;

const PAGES: Record<string, React.FC> = {
  dash_company: DashCompany,
  dash_user: DashUser,
  products: ProductsPage,
  orders: OrdersVendeur,
  admin_orders: OrdersAdmin,
  admin_samples: AdminSamplesPage,
  pricelist: PricelistGeneratorPage,
  margin_calculator: MarginCalculatorPage,
  crm_pipeline_team: CRMPipelineTeamPage,
  personal_workstation: PersonalWorkstationPage,
  calendar: CalendarPage,
  my_team: MyTeamPage,
  my_clients: MyClientsPage,
  admin_clients: AdminClientsPage,
  admin_teams: () => <AdminTeamsPage isAdmin={true} />,
  pickup_tickets: PickupTicketsPage,
  inventaire_store: InventaireStorePage,
  store_prices: StorePricesPage,
  to_invoice: ToInvoicePage,
  benefice_magasin: BeneficeMagasinPage,
  clients: ClientsCRMPage,
  admin_contests: ContestAdminPage,
  admin_reports: AdminReportsPage,
  disputes: DisputesPage,
  admin_logbook: ActivityLogbook,
  admin_users: UserManagement,
  admin_stores: StoresManagementPage,
  admin_dashboard: AdminDashboard,
  admin_messaging: AdminMessagingSettings,
  admin_email_settings: EmailSettingsPage,
  manuf_dashboard: ManufDashboard,
  manuf_inventory: ManufInventoryView,
  manuf_orders: ManufOrdersView,
  manuf_samples: ManufSamplesView,
  manuf_reports: ManufReportsView,
  settings: UserSettings,
  email_inbox: EmailInboxPage,
  team_leader_dashboard: TeamLeaderDashboard,
  team_prices: TeamPricesPage,
  team_benefice: TeamBeneficePage,
  commission_calculee: CommissionCalculeePage,
};

// Permission required to render each page (pages not listed = accessible to all authenticated users)
const PAGE_PERMISSIONS: Partial<Record<string, string>> = {
  dash_company: "dashboard.company.view",
  dash_user: "dashboard.personal.view",
  products: "ventes.products.view",
  orders: "ventes.orders.view_own",
  admin_orders: "ventes.orders.view_all",
  admin_samples: "ventes.samples.view_all",
  pricelist: "ventes.pricelist.view",
  margin_calculator: "ventes.margin_calculator.view",
  crm_pipeline_team: "performance.pipeline_team.view",
  personal_workstation: "performance.workstation.view",
  calendar: "performance.calendar.view",
  my_team: "performance.my_team.view",
  my_clients: "performance.my_clients.view",
  admin_clients: "performance.my_clients.manage",
  admin_teams: "admin.teams.view",
  pickup_tickets: "storeops.pickup_tickets.view",
  inventaire_store: "storeops.inventory.view",
  store_prices: "storeops.prices.view",
  to_invoice: "storeops.to_invoice.view",
  benefice_magasin: "storeops.benefice.view",
  admin_stores: "admin.stores.view",
  admin_contests: "admin.settings.view",
  admin_reports: "reports.financial.view",
  disputes: "disputes.view_own",
  admin_logbook: "admin.logbook.view",
  admin_users: "admin.users.view",
  admin_dashboard: "dashboard.company.view",
  admin_messaging: "admin.settings.view",
  admin_email_settings: "admin.settings.view",
  manuf_dashboard: "dashboard.company.view",
  manuf_inventory: "storeops.inventory.view",
  manuf_orders: "ventes.orders.view_all",
  manuf_samples: "ventes.samples.view_all",
  manuf_reports: "reports.financial.view",
  team_leader_dashboard: "performance.team_leader.manage",
  team_prices: "performance.team_prices.view",
  team_benefice: "performance.team_benefice.view",
  commission_calculee: "performance.commission.view",
};

const PAGE_LABELS: Record<string, string> = {
  dash_company: "Dashboard Compagnie",
  dash_user: "Dashboard Personnel",
  products: "Produits",
  orders: "Commandes",
  admin_orders: "Commandes (Admin)",
  admin_samples: "Samples (Admin)",
  pricelist: "Pricelist Generator",
  margin_calculator: "Margin Calculator",
  crm_pipeline_team: "CRM Pipeline Team",
  personal_workstation: "Personal Workstation",
  calendar: "Calendar",
  my_team: "My Team",
  my_clients: "My Clients",
  admin_clients: "Clients (Admin)",
  admin_teams: "Gestion d'equipes",
  pickup_tickets: "Pickup Tickets",
  inventaire_store: "Inventaire",
  store_prices: "Store Prices",
  to_invoice: "To Invoice",
  benefice_magasin: "Benefice Magasin",
  clients: "Clients",
  admin_contests: "Concours",
  admin_reports: "Rapports & Analytics",
  disputes: "Disputes & Litiges",
  admin_logbook: "Logbook Compagnie",
  admin_users: "Gestion des utilisateurs",
  admin_stores: "Gestion Magasins",
  admin_dashboard: "Admin Dashboard",
  admin_messaging: "Regles de messagerie",
  admin_email_settings: "Parametres email",
  manuf_dashboard: "Dashboard SCI",
  manuf_inventory: "Inventaire (SCI)",
  manuf_orders: "Commandes (SCI)",
  manuf_samples: "Echantillons (SCI)",
  manuf_reports: "Rapports (SCI)",
  settings: "Parametres",
  email_inbox: "Boite de reception",
  team_leader_dashboard: "Chef d'Équipe",
  team_prices: "Team Prices",
  team_benefice: "Bénéfice Équipe",
  commission_calculee: "Commissions",
};

function AppRoot() {
  const { session, profile, loading, signOut, suspendedError, reloadProfile } = useAuth();
  const [view, setView] = useState<"landing" | "login">(() => {
    const hash = window.location.hash;
    return hash === "#/login" ? "login" : "landing";
  });

  useEffect(() => {
    const onHash = () => {
      setView(window.location.hash === "#/login" ? "login" : "landing");
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const goToLogin = () => {
    window.location.hash = "#/login";
    setView("login");
  };
  const goToLanding = () => {
    window.location.hash = "#/";
    setView("landing");
  };

  if (loading) {
    return (
      <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#fafaf9",fontFamily:"'Inter', system-ui, sans-serif"}}>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
        <div style={{textAlign:"center"}}>
          <div style={{margin:"0 auto 20px"}}>
            <img src="/icons/icon-96x96.png" alt="Uniflex" width="44" height="44" style={{borderRadius:12}} />
          </div>
          <div style={{width:20,height:20,border:"2px solid #e5e5e5",borderTop:"2px solid #111",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}/>
          <div style={{color:"#a0a0a0",fontSize:12,letterSpacing:"0.02em",fontWeight:500}}>Chargement</div>
        </div>
      </div>
    );
  }

  if (!session || !profile) {
    return (
      <>
        <Suspense fallback={<PageLoader />}>
        {view === "login" ? (
          <LoginPage onBack={goToLanding} />
        ) : (
          <LandingPage onLogin={goToLogin} />
        )}
        </Suspense>
        {suspendedError&&(
          <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:T.red,color:"#fff",padding:"12px 24px",borderRadius:10,fontSize:13,fontWeight:600,zIndex:9999,boxShadow:"0 8px 24px rgba(0,0,0,0.3)"}}>
            {suspendedError}
          </div>
        )}
      </>
    );
  }

  // Magasin users without a store_code must pick one before entering the app
  if (profile.role === "magasin" && !profile.store_code) {
    return <Suspense fallback={<PageLoader />}><StoreCodeEntry onSuccess={reloadProfile} /></Suspense>;
  }

  return (
    <AppProvider>
      {(page, navigate) => <AppShell page={page} navigate={navigate} onLogout={signOut} />}
    </AppProvider>
  );
}

export default function App() {
  return (
    <SimulationProvider>
      <AuthProvider>
        <AppRoot />
      </AuthProvider>
    </SimulationProvider>
  );
}

function AppShell({ page, onLogout }: { page: string; navigate: (key: string, prefill?: PrefillData) => void; onLogout: () => void }) {
  const { navigate, tabs, activeTabIndex } = useApp();
  const { profile, can, user } = useAuth();
  const { isSimulating } = useSimulation();
  const { t, lang, setLang } = useLanguage();
  const MENU = React.useMemo(() => buildMenu(t), [t]);
  const [showNotif, setShowNotif] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const [msgUnread, setMsgUnread] = useState(0);
  const [showEmailInbox, setShowEmailInbox] = useState(false);
  const [emailUnread, setEmailUnread] = useState(0);
  const [userSmtpEmail, setUserSmtpEmail] = useState<string | undefined>();
  const [notifUnread, setNotifUnread] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMenuIndex, setMobileMenuIndex] = useState(0);
  const [logoSpin, setLogoSpin] = useState(false);

  // Fetch unread notification count + realtime subscription
  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setNotifUnread(count ?? 0);
    };
    fetchCount();
    const channel = supabase
      .channel("notif-badge-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        fetchCount();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth < 769);
  React.useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 769);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  useEffect(() => {
    if (!profile) return;
    supabase.from("user_smtp_configs").select("from_email").eq("user_id", profile.id).maybeSingle().then(({ data }) => {
      if (data?.from_email) setUserSmtpEmail(data.from_email);
    });
  }, [profile?.id]);
  const manufRedirected = useRef(false);

  useEffect(() => {
    if (profile?.role === "manuf" && !manufRedirected.current && page === "dash_company") {
      manufRedirected.current = true;
      navigate("manuf_dashboard");
    }
  }, [profile?.role, page]);

  const filteredMenu: MenuItem[] = MENU.map(item => {
    if (item.subs) {
      const visibleSubs = item.subs.filter(s => !s.permission || can(s.permission));
      if (visibleSubs.length === 0) return null;
      return { ...item, subs: visibleSubs };
    }
    if (item.permission && !can(item.permission)) return null;
    return item;
  }).filter((item): item is MenuItem => item !== null);

  const mobileNavItems = React.useMemo(() => {
    const items: { key: string; icon: React.ReactNode; label: string }[] = [];
    const seen = new Set<string>();
    for (const item of filteredMenu) {
      if (item.subs) {
        for (const sub of item.subs) {
          if (!seen.has(sub.key)) { seen.add(sub.key); items.push({ key: sub.key, icon: sub.icon || item.icon, label: sub.label }); }
        }
      } else if (item.key && PAGES[item.key] && !seen.has(item.key)) {
        seen.add(item.key); items.push({ key: item.key, icon: item.icon, label: item.label });
      }
    }
    return items;
  }, [filteredMenu]);

  const defaultPage = (() => {
    const role = profile?.role;
    if (role === "magasin") return "pickup_tickets";
    if (role === "manuf") return "manuf_dashboard";
    if (role === "admin" || role === "god_admin") return "dash_company";
    return "dash_user";
  })();

  const renderPage = useCallback((pageKey: string) => {
    const requiredPerm = PAGE_PERMISSIONS[pageKey];
    if (requiredPerm && !can(requiredPerm)) {
      const FallbackComponent = PAGES[defaultPage] || DashUser;
      return <Suspense fallback={<PageLoader />}><FallbackComponent /></Suspense>;
    }
    const PageComponent = PAGES[pageKey] || PAGES[defaultPage] || DashUser;
    return <Suspense fallback={<PageLoader />}><PageComponent /></Suspense>;
  }, [can, defaultPage]);

  return (
    <OrdersProvider>
    <div style={{
      display:"flex", flexDirection:"column",
      height:"100dvh",
      fontFamily:"'Inter', system-ui, sans-serif",
      overflow:"hidden",
      background:T.bg,
      position:"relative",
      paddingTop: isSimulating ? 44 : 0,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <SphereBackground mode="light" size={800} opacity={0.18} style={{ right: -200, top: -120, zIndex: 0 }} />
      <SphereBackground mode="light" size={500} opacity={0.12} style={{ left: -180, bottom: -100, zIndex: 0 }} />
      <SimulationBanner />

      <header style={{
        height: isMobile ? `calc(48px + var(--sat))` : T.headerH,
        paddingTop: isMobile ? "var(--sat)" : 0,
        background:"rgba(255,255,255,0.45)",
        backdropFilter:"blur(24px)",
        WebkitBackdropFilter:"blur(24px)",
        borderBottom:"1px solid rgba(255,255,255,0.6)",
        display:"flex", alignItems:"center",
        justifyContent:"space-between",
        padding: isMobile ? "0 12px" : "0 20px",
        paddingLeft: isMobile ? `calc(12px + var(--sal))` : 20,
        paddingRight: isMobile ? `calc(12px + var(--sar))` : 20,
        flexShrink:0,
        position:"relative",
        zIndex:10,
      }}>
        <div style={{display:"flex",alignItems:"center",gap: isMobile ? 8 : 16}}>
          <div style={{display:"flex",alignItems:"center",gap: isMobile ? 6 : 10}}>
            <img src="/icons/icon-96x96.png" alt="Uniflex" style={{width: isMobile ? 24 : 28, height: isMobile ? 24 : 28, borderRadius:7}} />
            <span style={{fontSize: isMobile ? 13 : 14,fontWeight:700,letterSpacing:"-0.02em",color:"#111"}}>Uniflex</span>
          </div>
          {!isMobile && (
            <>
              <div style={{width:1,height:18,background:T.border}}/>
              <div style={{display:"flex",alignItems:"center",gap:8,background:"#fff",border:`1px solid ${T.border}`,borderRadius:100,padding:"6px 14px",width:220,transition:"border-color 0.2s"}}>
                <I.search/>
                <input placeholder={t("search_placeholder")} style={{border:"none",background:"transparent",outline:"none",fontSize:12,width:"100%",fontFamily:"'Inter', sans-serif",color:T.text,letterSpacing:"-0.01em"}}/>
              </div>
            </>
          )}
        </div>

        <div style={{display:"flex",alignItems:"center",gap: isMobile ? 4 : 12}}>
          {isMobile && (
            <button style={{background:"none",border:"none",cursor:"pointer",color:T.textMid,padding:8,display:"flex",alignItems:"center",borderRadius:8}}>
              <I.search/>
            </button>
          )}
          <button
            onClick={() => setShowEmailInbox(true)}
            title={t("nav.inbox")}
            style={{position:"relative",background:"none",border:"1px solid transparent",cursor:"pointer",color:T.textMid,padding: isMobile ? 8 : 7,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:6,transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.background=T.bgHover;e.currentTarget.style.color=T.text}}
            onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color=T.textMid}}
          >
            <I.mail/>
            {emailUnread>0&&<span style={{position:"absolute",top:2,right:2,minWidth:14,height:14,borderRadius:7,background:T.red,fontSize:9,fontWeight:800,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 2px",border:`1.5px solid ${T.bg}`}}>{emailUnread>9?"9+":emailUnread}</span>}
          </button>
          <button
            onClick={() => setShowMessaging(true)}
            title={t("nav.messaging")}
            style={{position:"relative",background:"none",border:"1px solid transparent",cursor:"pointer",color:T.textMid,padding: isMobile ? 8 : 7,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:6,transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.background=T.bgHover;e.currentTarget.style.color=T.text}}
            onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color=T.textMid}}
          >
            <I.msg/>
            {msgUnread>0&&<span style={{position:"absolute",top:2,right:2,minWidth:14,height:14,borderRadius:7,background:T.red,fontSize:9,fontWeight:800,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 2px",border:`1.5px solid ${T.bg}`}}>{msgUnread>9?"9+":msgUnread}</span>}
          </button>
          <div style={{position:"relative"}}>
            <button onClick={()=>setShowNotif(!showNotif)} style={{background:"none",border:"1px solid transparent",cursor:"pointer",color:T.textMid,padding: isMobile ? 8 : 7,position:"relative",display:"flex",alignItems:"center",borderRadius:6,transition:"all 0.15s"}}
              onMouseEnter={e=>{e.currentTarget.style.background=T.bgHover;e.currentTarget.style.color=T.text}}
              onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color=T.textMid}}
            >
              <I.bell/>
              {notifUnread>0&&<span style={{position:"absolute",top:2,right:2,minWidth:14,height:14,borderRadius:7,background:T.red,fontSize:9,fontWeight:800,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 2px",border:`1.5px solid ${T.bg}`}}>{notifUnread>9?"9+":notifUnread}</span>}
            </button>
            <NotificationDropdown open={showNotif} onClose={()=>setShowNotif(false)} isMobile={isMobile} onNavigate={(refType, refId) => {
              if (refType === "lead") navigate("crm_pipeline_team");
              else if (refType === "order") navigate("admin_orders");
              else if (refType === "sample") navigate("admin_samples");
              else if (refType === "dispute") navigate("disputes");
              else if (refType === "conversation") setShowMessaging(true);
            }}/>
          </div>
          {!isMobile && (
            <>
              <div style={{width:1,height:18,background:T.border}}/>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:28,height:28,borderRadius:100,background:"#111",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600}}>{(profile?.full_name||"U")[0].toUpperCase()}</div>
                <div style={{fontSize:12,color:T.textMid,letterSpacing:"-0.01em"}}><strong style={{color:T.text,fontWeight:600}}>{profile?.full_name?.split(" ")[0]||t("user")}</strong></div>
                <button
                  onClick={() => setLang(lang === "fr" ? "en" : "fr")}
                  style={{
                    background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 6,
                    padding: "3px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                    color: T.textMid, fontFamily: "inherit", letterSpacing: 0.5,
                    transition: "all 0.15s",
                  }}
                  title={t("settings.language")}
                >
                  {lang === "fr" ? "EN" : "FR"}
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {!isMobile && <TabBar pageLabels={PAGE_LABELS} />}

      <TabContent
        tabs={tabs}
        activeTabIndex={activeTabIndex}
        renderPage={renderPage}
        isMobile={isMobile}
        onClickOutside={showNotif ? () => setShowNotif(false) : undefined}
      />

      {!isMobile && <FloatingNavOrb menu={filteredMenu} onLogout={onLogout} pageLabels={PAGE_LABELS} />}
      {!isMobile && <TabOverflowToast />}

      {/* ── MOBILE: Floating Logo Nav ── */}
      {isMobile && (
        <>
          {/* Backdrop overlay when menu is open */}
          {mobileMenuOpen && (
            <div
              onClick={() => setMobileMenuOpen(false)}
              style={{
                position:"fixed", inset:0, zIndex:998,
                background:"rgba(0,0,0,0.4)",
                backdropFilter:"blur(6px)",
                WebkitBackdropFilter:"blur(6px)",
                transition:"opacity 0.2s",
              }}
            />
          )}

          {/* Carousel menu above the logo button */}
          {mobileMenuOpen && (
            <div style={{
              position:"fixed",
              bottom: `calc(88px + var(--sab))`,
              left:0, right:0,
              zIndex:1001,
              display:"flex",
              alignItems:"center",
              justifyContent:"center",
              gap:12,
              padding:"0 20px",
            }}>
              {/* Left arrow */}
              <button
                onClick={() => setMobileMenuIndex(i => (i - 1 + mobileNavItems.length) % mobileNavItems.length)}
                style={{
                  width:44, height:44, borderRadius:"50%",
                  background:"rgba(255,255,255,0.15)",
                  backdropFilter:"blur(12px)",
                  WebkitBackdropFilter:"blur(12px)",
                  border:"1px solid rgba(255,255,255,0.2)",
                  color:"#fff", fontSize:20, fontWeight:600,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  cursor:"pointer", flexShrink:0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>

              {/* Current item display */}
              <button
                onClick={() => {
                  const item = mobileNavItems[mobileMenuIndex];
                  navigate(item.key);
                  setLogoSpin(true);
                  setMobileMenuOpen(false);
                }}
                style={{
                  display:"flex", flexDirection:"column", alignItems:"center", gap:8,
                  background:"rgba(255,255,255,0.12)",
                  backdropFilter:"blur(16px)",
                  WebkitBackdropFilter:"blur(16px)",
                  border:"1px solid rgba(255,255,255,0.2)",
                  borderRadius:20, padding:"16px 32px",
                  cursor:"pointer", minWidth:160,
                  transition:"all 0.2s ease",
                }}
              >
                <div style={{
                  width:48, height:48, borderRadius:"50%",
                  background: page === mobileNavItems[mobileMenuIndex]?.key ? "#fff" : "rgba(255,255,255,0.15)",
                  color: page === mobileNavItems[mobileMenuIndex]?.key ? "#111" : "#fff",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  transition:"all 0.2s ease",
                }}>
                  {mobileNavItems[mobileMenuIndex]?.icon}
                </div>
                <span style={{
                  color:"#fff", fontSize:13, fontWeight:600,
                  letterSpacing:"-0.01em", textAlign:"center",
                  whiteSpace:"nowrap",
                }}>
                  {mobileNavItems[mobileMenuIndex]?.label || PAGE_LABELS[mobileNavItems[mobileMenuIndex]?.key] || mobileNavItems[mobileMenuIndex]?.key}
                </span>
                {page === mobileNavItems[mobileMenuIndex]?.key && (
                  <span style={{ fontSize:10, color:"rgba(255,255,255,0.5)", fontWeight:500 }}>actif</span>
                )}
              </button>

              {/* Right arrow */}
              <button
                onClick={() => setMobileMenuIndex(i => (i + 1) % mobileNavItems.length)}
                style={{
                  width:44, height:44, borderRadius:"50%",
                  background:"rgba(255,255,255,0.15)",
                  backdropFilter:"blur(12px)",
                  WebkitBackdropFilter:"blur(12px)",
                  border:"1px solid rgba(255,255,255,0.2)",
                  color:"#fff", fontSize:20, fontWeight:600,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  cursor:"pointer", flexShrink:0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          )}

          {/* Dot indicators */}
          {mobileMenuOpen && (
            <div style={{
              position:"fixed",
              bottom: `calc(72px + var(--sab))`,
              left:0, right:0,
              zIndex:1001,
              display:"flex", justifyContent:"center", gap:6,
            }}>
              {mobileNavItems.map((_, i) => (
                <div key={i} style={{
                  width: i === mobileMenuIndex ? 16 : 6, height:6, borderRadius:3,
                  background: i === mobileMenuIndex ? "#fff" : "rgba(255,255,255,0.3)",
                  transition:"all 0.2s ease",
                }} />
              ))}
            </div>
          )}

          {/* Floating logo button */}
          <button
            onClick={() => {
              if (mobileMenuOpen) {
                const item = mobileNavItems[mobileMenuIndex];
                navigate(item.key);
                setLogoSpin(true);
                setMobileMenuOpen(false);
              } else {
                setMobileMenuIndex(mobileNavItems.findIndex(i => i.key === page) >= 0 ? mobileNavItems.findIndex(i => i.key === page) : 0);
                setMobileMenuOpen(true);
              }
            }}
            onAnimationEnd={() => setLogoSpin(false)}
            style={{
              position:"fixed",
              bottom: `calc(16px + var(--sab))`,
              left:"50%",
              transform:"translateX(-50%)",
              zIndex:1002,
              width:56, height:56,
              borderRadius:"50%",
              background:"#111",
              border:"2px solid rgba(255,255,255,0.15)",
              boxShadow: mobileMenuOpen
                ? "0 0 0 4px rgba(17,17,17,0.15), 0 8px 32px rgba(0,0,0,0.4)"
                : "0 4px 20px rgba(0,0,0,0.3)",
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer",
              animation: logoSpin ? "logoSpin 0.4s ease-in-out" : "none",
              transition:"box-shadow 0.2s ease",
            }}
          >
            <img src="/icons/icon-96x96.png" alt="Uniflex" style={{ width:32, height:32, borderRadius:6 }} />
          </button>

          {/* Hidden FloatingNavOrb for menu data */}
          <div style={{position:"fixed",bottom:-200,right:-200,opacity:0,pointerEvents:"none"}}>
            <FloatingNavOrb menu={filteredMenu} onLogout={onLogout} pageLabels={PAGE_LABELS} />
          </div>
        </>
      )}

      {profile && (
        <MessagingPanel
          isOpen={showMessaging}
          onClose={() => setShowMessaging(false)}
          currentUser={{ id: profile.id, full_name: profile.full_name, email: profile.email, role: profile.role, avatar_url: profile.avatar_url, job_title: profile.job_title, team_id: profile.team_id }}
          onUnreadChange={setMsgUnread}
        />
      )}
      <EmailInboxPanel
        isOpen={showEmailInbox}
        onClose={() => setShowEmailInbox(false)}
        onOpenFullPage={() => { setShowEmailInbox(false); navigate("email_inbox"); }}
        userEmail={userSmtpEmail}
        onUnreadChange={setEmailUnread}
      />
    </div>
    </OrdersProvider>
  );
}
