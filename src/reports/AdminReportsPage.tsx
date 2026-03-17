import React, { useState } from 'react';
import { BarChart3, Package, Users, UserCheck, DollarSign, GitBranch } from 'lucide-react';
import ReportSalesOverview from './ReportSalesOverview';
import ReportProductAnalytics from './ReportProductAnalytics';
import ReportClientAnalytics from './ReportClientAnalytics';
import ReportAgentPerformance from './ReportAgentPerformance';
import ReportFinancial from './ReportFinancial';
import ReportCRMPipeline from './ReportCRMPipeline';
import { T } from "../theme";

const TABS = [
  { key: 'sales', label: 'Ventes', icon: <BarChart3 size={14} /> },
  { key: 'products', label: 'Produits', icon: <Package size={14} /> },
  { key: 'clients', label: 'Clients', icon: <Users size={14} /> },
  { key: 'agents', label: 'Agents', icon: <UserCheck size={14} /> },
  { key: 'financial', label: 'Financier', icon: <DollarSign size={14} /> },
  { key: 'pipeline', label: 'CRM Pipeline', icon: <GitBranch size={14} /> },
];

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState('sales');

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: T.text }}>Rapports & Analytics</h2>
        <p style={{ margin: 0, color: T.textMid, fontSize: 14 }}>Analysez la performance globale de votre entreprise</p>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
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
              background: activeTab === tab.key ? T.main : T.card,
              color: activeTab === tab.key ? '#fff' : T.textMid,
              borderBottom: activeTab === tab.key ? 'none' : `1px solid ${T.border}`,
            }}
          >
            {tab.icon}
            {tab.label}
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
