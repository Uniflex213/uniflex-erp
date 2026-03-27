import React, { useState, useEffect } from 'react';
import { Download, Users, UserPlus, MapPin } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { T, fmt, fmtNum, exportToCsv, exportToPdf } from './reportUtils';
import { useLanguage } from '../i18n/LanguageContext';

export default function ReportClientAnalytics() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [totalClients, setTotalClients] = useState(0);
  const [newClientsThisMonth, setNewClientsThisMonth] = useState(0);
  const [tierDistribution, setTierDistribution] = useState<{ tier: string; count: number }[]>([]);
  const [topClients, setTopClients] = useState<{ name: string; total: number; orders: number }[]>([]);
  const [funnel, setFunnel] = useState<{ stage: string; count: number }[]>([]);
  const [regionData, setRegionData] = useState<{ region: string; count: number }[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [clientsRes, leadsRes, ordersRes] = await Promise.all([
      supabase.from('clients').select('id, name, tier, region, created_at'),
      supabase.from('crm_leads').select('id, stage, region, created_at').eq('archived', false),
      supabase.from('orders').select('client_name, total'),
    ]);

    const clients = clientsRes.data || [];
    setTotalClients(clients.length);
    setNewClientsThisMonth(clients.filter(c => c.created_at >= startOfMonth).length);

    const tiers: Record<string, number> = {};
    clients.forEach(c => { const t = c.tier || 'Non defini'; tiers[t] = (tiers[t] || 0) + 1; });
    setTierDistribution(Object.entries(tiers).map(([tier, count]) => ({ tier, count })).sort((a, b) => b.count - a.count));

    const regions: Record<string, number> = {};
    clients.forEach(c => { const r = c.region || 'Inconnue'; regions[r] = (regions[r] || 0) + 1; });
    setRegionData(Object.entries(regions).map(([region, count]) => ({ region, count })).sort((a, b) => b.count - a.count));

    const stages: Record<string, number> = {};
    (leadsRes.data || []).forEach(l => { stages[l.stage] = (stages[l.stage] || 0) + 1; });
    const stageOrder = ['Nouveau', 'Contact', 'Qualifie', 'Proposition', 'Negociation', 'Ferme Gagne', 'Ferme Perdu'];
    setFunnel(stageOrder.filter(s => stages[s]).map(s => ({ stage: s, count: stages[s] || 0 })));

    const clientTotals: Record<string, { total: number; orders: number }> = {};
    (ordersRes.data || []).forEach(o => {
      const name = o.client_name || 'Inconnu';
      if (!clientTotals[name]) clientTotals[name] = { total: 0, orders: 0 };
      clientTotals[name].total += o.total || 0;
      clientTotals[name].orders += 1;
    });
    setTopClients(Object.entries(clientTotals).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.total - a.total).slice(0, 10));

    setLoading(false);
  };

  const maxFunnel = Math.max(...funnel.map(f => f.count), 1);
  const maxClientRevenue = Math.max(...topClients.map(c => c.total), 1);

  const handleExport = (type: 'csv' | 'pdf') => {
    const headers = ['Client', 'Commandes', 'Revenu total'];
    const rows = topClients.map(c => [c.name, String(c.orders), fmt(c.total)]);
    if (type === 'csv') exportToCsv('rapport_clients', headers, rows);
    else exportToPdf('Rapport Clients', headers, rows);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: T.textLight }}>{t("common.loading", "Chargement...")}</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 20 }}>
        <button onClick={() => handleExport('csv')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 6, border: `1px solid ${T.border}`, background: '#fff', color: T.textMid, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}><Download size={12} /> CSV</button>
        <button onClick={() => handleExport('pdf')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 6, border: `1px solid ${T.border}`, background: '#fff', color: T.textMid, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}><Download size={12} /> PDF</button>
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px', background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ background: `${T.main}12`, borderRadius: 8, padding: 8, color: T.main, display: 'flex' }}><Users size={18} /></div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: T.text }}>{fmtNum(totalClients)}</div>
          <div style={{ fontSize: 12, color: T.textLight }}>{t("report_clients.total_clients", "Total clients")}</div>
        </div>
        <div style={{ flex: '1 1 200px', background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ background: `${T.green}18`, borderRadius: 8, padding: 8, color: T.green, display: 'flex' }}><UserPlus size={18} /></div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: T.text }}>{newClientsThisMonth}</div>
          <div style={{ fontSize: 12, color: T.textLight }}>{t("report_clients.new_this_month", "Nouveaux ce mois")}</div>
        </div>
        <div style={{ flex: '1 1 200px', background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ background: `${T.blue}18`, borderRadius: 8, padding: 8, color: T.blue, display: 'flex' }}><MapPin size={18} /></div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: T.text }}>{regionData.length}</div>
          <div style={{ fontSize: 12, color: T.textLight }}>{t("report_clients.regions_covered", "Régions couvertes")}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ flex: '1 1 400px', background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>{t("report_clients.top_clients_by_revenue", "Top clients par revenu")}</div>
          {topClients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: T.textLight, fontSize: 13 }}>{t("common.no_data", "Aucune donnée")}</div>
          ) : (
            topClients.map(c => (
              <div key={c.name} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{c.name} <span style={{ fontSize: 11, color: T.textLight }}>({c.orders} cmd)</span></span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.main }}>{fmt(c.total)}</span>
                </div>
                <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4 }}>
                  <div style={{ height: '100%', width: `${(c.total / maxClientRevenue) * 100}%`, background: `linear-gradient(90deg, ${T.main}, ${T.main}aa)`, borderRadius: 4 }} />
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>{t("report_clients.crm_funnel", "Entonnoir CRM")}</div>
            {funnel.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: T.textLight, fontSize: 13 }}>{t("report_crm.no_leads", "Aucun lead")}</div>
            ) : (
              funnel.map((f, i) => (
                <div key={f.stage} style={{ marginBottom: i < funnel.length - 1 ? 10 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{f.stage}</span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{f.count}</span>
                  </div>
                  <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${(f.count / maxFunnel) * 100}%`, background: f.stage.includes('Gagne') ? T.green : f.stage.includes('Perdu') ? T.red : T.main, borderRadius: 3 }} />
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>{t("report_clients.distribution_by_region", "Distribution par région")}</div>
            {regionData.slice(0, 8).map((r, i) => (
              <div key={r.region} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < Math.min(regionData.length, 8) - 1 ? `1px solid ${T.border}` : 'none' }}>
                <span style={{ fontSize: 13, color: T.text }}>{r.region}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.main }}>{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
