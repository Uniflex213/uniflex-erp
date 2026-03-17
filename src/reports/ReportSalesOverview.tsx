import React, { useState, useEffect } from 'react';
import { Download, TrendingUp, ShoppingCart, DollarSign, BarChart3 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { T, fmt, fmtNum, getDateRanges, exportToCsv, exportToPdf } from './reportUtils';

export default function ReportSalesOverview() {
  const ranges = getDateRanges();
  const [rangeKey, setRangeKey] = useState('this_month');
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, prevRevenue: 0 });
  const [monthlyData, setMonthlyData] = useState<{ label: string; value: number }[]>([]);
  const [topOrders, setTopOrders] = useState<any[]>([]);

  const range = ranges.find(r => r.key === rangeKey) || ranges[0];

  useEffect(() => {
    loadData();
  }, [rangeKey]);

  const loadData = async () => {
    setLoading(true);
    const start = range.startDate.toISOString();
    const end = range.endDate.toISOString();

    const prevDuration = range.endDate.getTime() - range.startDate.getTime();
    const prevStart = new Date(range.startDate.getTime() - prevDuration).toISOString();

    const [ordersRes, prevRes, topRes] = await Promise.all([
      supabase.from('orders').select('id, total, created_at').gte('created_at', start).lte('created_at', end),
      supabase.from('orders').select('total').gte('created_at', prevStart).lt('created_at', start),
      supabase.from('orders').select('id, order_number, client_name, total, status, created_at').gte('created_at', start).lte('created_at', end).order('total', { ascending: false }).limit(10),
    ]);

    const orders = ordersRes.data || [];
    const prevOrders = prevRes.data || [];
    const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const prevRevenue = prevOrders.reduce((s, o) => s + (o.total || 0), 0);

    setKpis({ totalRevenue, totalOrders, avgOrderValue, prevRevenue });
    setTopOrders(topRes.data || []);

    const grouped: Record<string, number> = {};
    orders.forEach(o => {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      grouped[key] = (grouped[key] || 0) + (o.total || 0);
    });
    const sorted = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
    setMonthlyData(sorted.map(([k, v]) => ({ label: k, value: v })));

    setLoading(false);
  };

  const growth = kpis.prevRevenue > 0 ? ((kpis.totalRevenue - kpis.prevRevenue) / kpis.prevRevenue) * 100 : 0;
  const maxBar = Math.max(...monthlyData.map(d => d.value), 1);

  const handleExportCsv = () => {
    exportToCsv('rapport_ventes', ['Commande', 'Client', 'Total', 'Statut', 'Date'], topOrders.map(o => [o.order_number || o.id, o.client_name || '', fmt(o.total), o.status || '', new Date(o.created_at).toLocaleDateString('fr-CA')]));
  };

  const handleExportPdf = () => {
    exportToPdf('Rapport Ventes', ['Commande', 'Client', 'Total', 'Statut', 'Date'], topOrders.map(o => [o.order_number || o.id, o.client_name || '', fmt(o.total), o.status || '', new Date(o.created_at).toLocaleDateString('fr-CA')]));
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: T.textLight }}>Chargement...</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 2, background: '#f3f4f6', borderRadius: 8, padding: 3 }}>
          {ranges.map(r => (
            <button key={r.key} onClick={() => setRangeKey(r.key)} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', background: rangeKey === r.key ? T.main : 'transparent', color: rangeKey === r.key ? '#fff' : T.textMid }}>
              {r.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={handleExportCsv} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 6, border: `1px solid ${T.border}`, background: '#fff', color: T.textMid, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Download size={12} /> CSV
        </button>
        <button onClick={handleExportPdf} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 6, border: `1px solid ${T.border}`, background: '#fff', color: T.textMid, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Download size={12} /> PDF
        </button>
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { icon: <DollarSign size={18} />, label: 'Revenu total', value: fmt(kpis.totalRevenue), trend: growth !== 0 ? `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%` : null, up: growth > 0 },
          { icon: <ShoppingCart size={18} />, label: 'Commandes', value: fmtNum(kpis.totalOrders), trend: null, up: false },
          { icon: <BarChart3 size={18} />, label: 'Valeur moyenne', value: fmt(kpis.avgOrderValue), trend: null, up: false },
          { icon: <TrendingUp size={18} />, label: 'Periode precedente', value: fmt(kpis.prevRevenue), trend: null, up: false },
        ].map((kpi, i) => (
          <div key={i} style={{ flex: '1 1 200px', background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ background: `${T.main}12`, borderRadius: 8, padding: 8, color: T.main, display: 'flex' }}>{kpi.icon}</div>
              {kpi.trend && <span style={{ color: kpi.up ? T.green : T.red, fontSize: 12, fontWeight: 700 }}>{kpi.trend}</span>}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: T.text }}>{kpi.value}</div>
            <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ flex: '2 1 400px', background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>Revenu par mois</div>
          {monthlyData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: T.textLight, fontSize: 13 }}>Aucune donnee pour cette periode</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 180, padding: '8px 0' }}>
              {monthlyData.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: T.textMid }}>{d.value >= 1000 ? `${(d.value / 1000).toFixed(0)}K` : d.value}</span>
                  <div style={{ width: '100%', maxWidth: 40, height: `${Math.max((d.value / maxBar) * 100, 3)}%`, background: i === monthlyData.length - 1 ? T.main : `${T.main}55`, borderRadius: '4px 4px 0 0', transition: 'height 0.6s' }} />
                  <span style={{ fontSize: 10, color: T.textMid }}>{d.label.split('-')[1]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: '1 1 320px', background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>Top 10 commandes</div>
          {topOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: T.textLight, fontSize: 13 }}>Aucune commande</div>
          ) : (
            topOrders.map((o, i) => (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < topOrders.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{o.order_number || o.id.slice(0, 8)}</div>
                  <div style={{ fontSize: 11, color: T.textLight }}>{o.client_name}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.main }}>{fmt(o.total)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
