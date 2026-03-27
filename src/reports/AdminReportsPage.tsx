import React, { useState } from 'react';
import { BarChart3, Package, Users, UserCheck, DollarSign, GitBranch } from 'lucide-react';
import ReportSalesOverview from './ReportSalesOverview';
import ReportProductAnalytics from './ReportProductAnalytics';
import ReportClientAnalytics from './ReportClientAnalytics';
import ReportAgentPerformance from './ReportAgentPerformance';
import ReportFinancial from './ReportFinancial';
import ReportCRMPipeline from './ReportCRMPipeline';
import { T } from "../theme";
import { useLanguage } from '../i18n/LanguageContext';

const TAB_KEYS = ['sales', 'products', 'clients', 'agents', 'financial', 'pipeline'] as const;
const TAB_ICONS: Record<string, React.ReactNode> = {
  sales: <BarChart3 size={14} />,
  products: <Package size={14} />,
  clients: <Users size={14} />,
  agents: <UserCheck size={14} />,
  financial: <DollarSign size={14} />,
  pipeline: <GitBranch size={14} />,
};

export default function AdminReportsPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('sales');

  const TAB_LABELS: Record<string, string> = {
    sales: t("reports.tab_sales", "Ventes"),
    products: t("reports.tab_products", "Produits"),
    clients: t("reports.tab_clients", "Clients"),
    agents: t("reports.tab_agents", "Agents"),
    financial: t("reports.tab_financial", "Financier"),
    pipeline: "CRM Pipeline",
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: T.text }}>{t("reports.title", "Rapports & Analytics")}</h2>
        <p style={{ margin: 0, color: T.textMid, fontSize: 14 }}>{t("reports.subtitle", "Analysez la performance globale de votre entreprise")}</p>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {TAB_KEYS.map(key => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
              background: activeTab === key ? T.main : T.card,
              color: activeTab === key ? '#fff' : T.textMid,
              borderBottom: activeTab === key ? 'none' : `1px solid ${T.border}`,
            }}
          >
            {TAB_ICONS[key]}
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>

      {activeTab === 'sales' && <ReportSalesOverview />}
      {activeTab === 'products' && <ReportProductAnalytics />}
      {activeTab === 'clients' && <ReportClientAnalytics />}
      {activeTab === 'agents' && <ReportAgentPerformance />}
      {activeTab === 'financial' && <ReportFinancial />}
      {activeTab === 'pipeline' && <ReportCRMPipeline />}
    </div>
  );
}
