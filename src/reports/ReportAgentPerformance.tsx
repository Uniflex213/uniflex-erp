import React, { useState, useEffect } from 'react';
import { Download, Users, TrendingUp, Target, Info } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { T, fmt, fmtNum, getDateRanges, exportToCsv, exportToPdf } from './reportUtils';

interface AgentData {
  id: string;
  name: string;
  totalSales: number;
  orderCount: number;
  clientCount: number;
  leadsWon: number;
  leadsTotal: number;
}

export default function ReportAgentPerformance() {
  const ranges = getDateRanges();
  const [rangeKey, setRangeKey] = useState('this_month');
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const range = ranges.find(r => r.key === rangeKey) || ranges[0];

  useEffect(() => { loadData(); }, [rangeKey]);

  const loadData = async () => {
    setLoading(true);
    const start = range.startDate.toISOString();
    const end = range.endDate.toISOString();

    const [profilesRes, ordersRes, clientsRes, leadsRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, role').in('role', ['vendeur', 'admin', 'god_admin']).eq('is_active', true),
      supabase.from('orders').select('owner_id, total').gte('created_at', start).lte('created_at', end),
      supabase.from('clients').select('id, agent_id'),
      supabase.from('crm_leads').select('assigned_agent_id, stage').eq('archived', false),
    ]);

    const profiles = profilesRes.data || [];
    const orders = ordersRes.data || [];
    const clients = clientsRes.data || [];
    const leads = leadsRes.data || [];

    const agentMap: Record<string, AgentData> = {};
    profiles.forEach(p => {
      agentMap[p.id] = {
        id: p.id,
        name: p.full_name || 'Inconnu',
        totalSales: 0,
        orderCount: 0,
        clientCount: 0,
        leadsWon: 0,
        leadsTotal: 0,
      };
    });

    orders.forEach(o => {
      if (o.owner_id && agentMap[o.owner_id]) {
        agentMap[o.owner_id].totalSales += o.total || 0;
        agentMap[o.owner_id].orderCount += 1;
      }
    });

    clients.forEach(c => {
      if (c.agent_id && agentMap[c.agent_id]) {
        agentMap[c.agent_id].clientCount += 1;
      }
    });

    leads.forEach(l => {
      if (l.assigned_agent_id && agentMap[l.assigned_agent_id]) {
        agentMap[l.assigned_agent_id].leadsTotal += 1;
        if (l.stage === 'Ferme Gagne') agentMap[l.assigned_agent_id].leadsWon += 1;
      }
    });

    setAgents(Object.values(agentMap).sort((a, b) => b.totalSales - a.totalSales));
    setLoading(false);
  };

  const maxSales = Math.max(...agents.map(a => a.totalSales), 1);
  const detail = selectedAgent ? agents.find(a => a.id === selectedAgent) : null;

  const handleExport = (type: 'csv' | 'pdf') => {
    const headers = ['Agent', 'Ventes', 'Commandes', 'Clients', 'Leads gagnes', 'Taux conversion'];
    const rows = agents.map(a => [a.name, fmt(a.totalSales), String(a.orderCount), String(a.clientCount), String(a.leadsWon), a.leadsTotal > 0 ? `${((a.leadsWon / a.leadsTotal) * 100).toFixed(1)}%` : '0%']);
    if (type === 'csv') exportToCsv('rapport_agents', headers, rows);
    else exportToPdf('Rapport Performance Agents', headers, rows);
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
        <button onClick={() => handleExport('csv')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 6, border: `1px solid ${T.border}`, background: '#fff', color: T.textMid, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}><Download size={12} /> CSV</button>
        <button onClick={() => handleExport('pdf')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 6, border: `1px solid ${T.border}`, background: '#fff', color: T.textMid, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}><Download size={12} /> PDF</button>
      </div>

      <div style={{ background: `${T.blue}08`, borderRadius: 10, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Info size={16} color={T.blue} />
        <span style={{ fontSize: 13, color: T.textMid }}>Systeme de calcul des commissions a venir -- les commissions seront calculees selon les regles de votre equipe.</span>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '2 1 500px', background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>Classement des agents</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['#', 'Agent', 'Ventes', 'Cmd', 'Clients', 'Conv.'].map(h => (
                    <th key={h} style={{ textAlign: h === 'Agent' ? 'left' : 'center', padding: '10px 12px', borderBottom: `2px solid ${T.border}`, color: T.textLight, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agents.map((a, i) => {
                  const conv = a.leadsTotal > 0 ? ((a.leadsWon / a.leadsTotal) * 100).toFixed(1) : '0';
                  return (
                    <tr
                      key={a.id}
                      onClick={() => setSelectedAgent(a.id === selectedAgent ? null : a.id)}
                      style={{ cursor: 'pointer', background: a.id === selectedAgent ? `${T.main}08` : 'transparent' }}
                      onMouseOver={e => { if (a.id !== selectedAgent) e.currentTarget.style.background = '#f8f8fc'; }}
                      onMouseOut={e => { if (a.id !== selectedAgent) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ textAlign: 'center', padding: '10px 12px', borderBottom: `1px solid ${T.border}`, fontWeight: 700, color: i < 3 ? ['#ffd700', '#c0c0c0', '#cd7f32'][i] : T.textLight }}>{i + 1}</td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid ${T.border}`, fontWeight: 600 }}>{a.name}</td>
                      <td style={{ textAlign: 'center', padding: '10px 12px', borderBottom: `1px solid ${T.border}`, fontWeight: 700, color: T.main }}>{fmt(a.totalSales)}</td>
                      <td style={{ textAlign: 'center', padding: '10px 12px', borderBottom: `1px solid ${T.border}` }}>{a.orderCount}</td>
                      <td style={{ textAlign: 'center', padding: '10px 12px', borderBottom: `1px solid ${T.border}` }}>{a.clientCount}</td>
                      <td style={{ textAlign: 'center', padding: '10px 12px', borderBottom: `1px solid ${T.border}`, fontWeight: 600, color: Number(conv) > 30 ? T.green : T.textMid }}>{conv}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ flex: '1 1 280px', background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>Comparaison des ventes</div>
          {agents.slice(0, 8).map((a, i) => (
            <div key={a.id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{a.name.split(' ')[0]}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.main }}>{fmt(a.totalSales)}</span>
              </div>
              <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4 }}>
                <div style={{ height: '100%', width: `${(a.totalSales / maxSales) * 100}%`, background: i < 3 ? T.main : `${T.main}77`, borderRadius: 4, transition: 'width 0.6s' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {detail && (
        <div style={{ background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: 20, marginTop: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>Detail: {detail.name}</div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {[
              { icon: <TrendingUp size={16} />, label: 'Ventes', value: fmt(detail.totalSales), color: T.main },
              { icon: <Target size={16} />, label: 'Commandes', value: fmtNum(detail.orderCount), color: T.blue },
              { icon: <Users size={16} />, label: 'Clients', value: fmtNum(detail.clientCount), color: T.green },
            ].map((item, i) => (
              <div key={i} style={{ flex: '1 1 150px', background: `${item.color}08`, borderRadius: 8, padding: 14, textAlign: 'center' }}>
                <div style={{ color: item.color, marginBottom: 6, display: 'flex', justifyContent: 'center' }}>{item.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>{item.value}</div>
                <div style={{ fontSize: 11, color: T.textLight }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
