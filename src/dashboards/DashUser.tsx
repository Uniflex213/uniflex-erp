import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { Info } from 'lucide-react';
import { T } from '../theme';
import PeriodToggle from '../components/PeriodToggle';

const fmt = (n: number) => new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const WIDGET_DEFS = [
  { id: 'w_sales', title: 'Mes Ventes', default: true },
  { id: 'w_clients', title: 'Mes Clients', default: true },
  { id: 'w_commission', title: 'Mes Commissions', default: true },
  { id: 'w_ranking', title: 'Mon Classement', default: true },
  { id: 'w_orders', title: 'Mes Commandes Recentes', default: true },
  { id: 'w_goals', title: 'Objectifs', default: true },
  { id: 'w_contests', title: 'Concours', default: false },
  { id: 'w_notes', title: 'Notes personnelles', default: true },
];

export default function DashUser() {
  const { profile, user } = useAuth();
  const userId = user?.id;
  const { prefs, loaded: prefsLoaded, updatePref } = useUserPreferences();

  const defaultWidgetIds = WIDGET_DEFS.filter(w => w.default).map(w => w.id);
  const defaultWidgetOrder = WIDGET_DEFS.map(w => w.id);

  const [activeWidgets, setActiveWidgets] = useState<string[]>(defaultWidgetIds);
  const [widgetOrder, setWidgetOrder] = useState<string[]>(defaultWidgetOrder);
  const [showConfig, setShowConfig] = useState(false);
  const [salesP, setSalesP] = useState('monthly');
  const [personalNotes, setPersonalNotes] = useState('');

  // Sync from Supabase prefs once loaded
  useEffect(() => {
    if (!prefsLoaded) return;
    if (prefs.dashboard_widgets.length > 0) setActiveWidgets(prefs.dashboard_widgets);
    if (prefs.dashboard_widget_order.length > 0) setWidgetOrder(prefs.dashboard_widget_order);
    if (prefs.dashboard_sales_period) setSalesP(prefs.dashboard_sales_period);
    if (prefs.personal_notes) setPersonalNotes(prefs.personal_notes);
  }, [prefsLoaded]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);

  const [mySales, setMySales] = useState({ annual: 0, monthly: 0, weekly: 0 });
  const [salesChart, setSalesChart] = useState<{ label: string; value: number }[]>([]);
  const [myClients, setMyClients] = useState({ active: 0, closedMonth: 0 });
  const [closedList, setClosedList] = useState<{ name: string; value: number }[]>([]);
  const [myRank, setMyRank] = useState(0);
  const [totalAgents, setTotalAgents] = useState(0);
  const [rankList, setRankList] = useState<{ id: string; name: string; total: number }[]>([]);
  const [recentOrders, setRecentOrders] = useState<{ id: string; orderNum: string; client: string; date: string; total: number; status: string }[]>([]);
  const [goals, setGoals] = useState({ target: 0, current: 0 });
  const [contestData, setContestData] = useState<{ rank: number; pts: number; title: string; prize: string; endDate: string } | null>(null);

  useEffect(() => { if (userId) loadAll(); }, [userId]);

  const loadAll = async () => {
    setLoading(true);
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfWeek = new Date(now.getTime() - 7 * 86400000).toISOString();

    const [salesYtd, salesMonth, salesWeek, clientsRes, closedRes, ordersRank, profilesRes, myOrdersRes, goalsRes, contestRes] = await Promise.all([
      supabase.from('orders').select('total').eq('owner_id', userId!).gte('created_at', startOfYear),
      supabase.from('orders').select('total, created_at').eq('owner_id', userId!).gte('created_at', startOfMonth),
      supabase.from('orders').select('total').eq('owner_id', userId!).gte('created_at', startOfWeek),
      supabase.from('clients').select('id').eq('agent_id', userId!),
      supabase.from('crm_leads').select('company_name, estimated_value').eq('assigned_agent_id', userId!).eq('stage', 'Ferme Gagne').gte('closed_at', startOfMonth),
      supabase.from('orders').select('owner_id, total').gte('created_at', startOfMonth),
      supabase.from('profiles').select('id, full_name').in('role', ['vendeur', 'admin', 'god_admin']).eq('is_active', true),
      supabase.from('orders').select('id, order_number, client_name, total, status, created_at').eq('owner_id', userId!).order('created_at', { ascending: false }).limit(5),
      supabase.from('team_goals').select('target_value, current_value').eq('status', 'active').limit(1).maybeSingle(),
      supabase.from('contests').select('title, prize_description, end_date, contest_participants!inner(user_id, total_points)').eq('status', 'active').eq('contest_participants.user_id', userId!).limit(1).maybeSingle(),
    ]);

    const annual = (salesYtd.data || []).reduce((s, o) => s + (o.total || 0), 0);
    const monthly = (salesMonth.data || []).reduce((s, o) => s + (o.total || 0), 0);
    const weekly = (salesWeek.data || []).reduce((s, o) => s + (o.total || 0), 0);
    setMySales({ annual, monthly, weekly });

    const chartGrouped: Record<string, number> = {};
    (salesMonth.data || []).forEach(o => {
      const d = new Date(o.created_at);
      const key = `${d.getDate()}/${d.getMonth() + 1}`;
      chartGrouped[key] = (chartGrouped[key] || 0) + (o.total || 0);
    });
    setSalesChart(Object.entries(chartGrouped).slice(-10).map(([label, value]) => ({ label, value })));

    setMyClients({ active: (clientsRes.data || []).length, closedMonth: (closedRes.data || []).length });
    setClosedList((closedRes.data || []).map(c => ({ name: c.company_name || 'Inconnu', value: c.estimated_value || 0 })));

    const agentSales: Record<string, number> = {};
    (ordersRank.data || []).forEach(o => {
      if (o.owner_id) agentSales[o.owner_id] = (agentSales[o.owner_id] || 0) + (o.total || 0);
    });
    const profiles = profilesRes.data || [];
    const ranked = profiles.map(p => ({ id: p.id, name: p.full_name || 'Inconnu', total: agentSales[p.id] || 0 })).sort((a, b) => b.total - a.total);
    setRankList(ranked);
    setTotalAgents(ranked.length);
    setMyRank(ranked.findIndex(r => r.id === userId) + 1 || ranked.length);

    setRecentOrders((myOrdersRes.data || []).map(o => ({
      id: o.id,
      orderNum: o.order_number || o.id.slice(0, 8),
      client: o.client_name || '',
      date: new Date(o.created_at).toLocaleDateString('fr-CA'),
      total: o.total || 0,
      status: o.status || '',
    })));

    if (goalsRes.data) {
      setGoals({ target: goalsRes.data.target_value || 50000, current: monthly });
    } else {
      setGoals({ target: 50000, current: monthly });
    }

    if (contestRes.data) {
      const c = contestRes.data as any;
      const p = (c.contest_participants || [])[0];
      setContestData({
        title: c.title,
        prize: c.prize_description || '',
        endDate: new Date(c.end_date).toLocaleDateString('fr-CA'),
        pts: p?.total_points || 0,
        rank: 0,
      });
    }

    setLoading(false);
  };

  const toggle = (id: string) => {
    setActiveWidgets(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      updatePref('dashboard_widgets', next);
      return next;
    });
  };

  const updateSalesP = (p: string) => {
    setSalesP(p);
    updatePref('dashboard_sales_period', p);
  };

  const updateNotes = (v: string) => {
    setPersonalNotes(v);
    updatePref('personal_notes', v);
  };

  const handleDragStart = (id: string) => setDragId(id);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    setWidgetOrder(prev => {
      const arr = [...prev];
      const from = arr.indexOf(dragId);
      const to = arr.indexOf(targetId);
      if (from < 0 || to < 0) return prev;
      arr.splice(from, 1);
      arr.splice(to, 0, dragId);
      updatePref('dashboard_widget_order', arr);
      return arr;
    });
    setDragId(null);
  };

  const count = activeWidgets.length;
  const gridCols = count <= 2 ? '1fr '.repeat(count) : count <= 4 ? '1fr 1fr' : '1fr 1fr 1fr';
  const salesValue = mySales[salesP as keyof typeof mySales] || 0;
  const maxChart = Math.max(...salesChart.map(d => d.value), 1);
  const goalPct = goals.target > 0 ? Math.min((goals.current / goals.target) * 100, 100) : 0;
  const userName = profile?.full_name || 'Utilisateur';

  const renderWidget = (wid: string) => {
    const wrap = (content: React.ReactNode) => (
      <div style={{ background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: 20, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {content}
      </div>
    );

    switch (wid) {
      case 'w_sales': return wrap(<>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>Mes Ventes</div>
          <PeriodToggle value={salesP} onChange={updateSalesP} options={[{ key: 'annual', label: 'An.' }, { key: 'monthly', label: 'Mois' }, { key: 'weekly', label: 'Sem.' }]} />
        </div>
        <div style={{ fontSize: 32, fontWeight: 800, color: T.main, marginBottom: 4 }}>{fmt(salesValue)}</div>
        <div style={{ fontSize: 12, color: T.textLight, marginBottom: 16 }}>
          {salesP === 'annual' ? new Date().getFullYear() : salesP === 'monthly' ? new Date().toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' }) : 'Cette semaine'}
        </div>
        {salesChart.length > 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, padding: '8px 0' }}>
            {salesChart.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 600, color: T.textMid }}>{d.value >= 1000 ? `${(d.value / 1000).toFixed(0)}K` : d.value}</span>
                <div style={{ width: '100%', maxWidth: 30, height: `${Math.max((d.value / maxChart) * 100, 3)}%`, background: i === salesChart.length - 1 ? T.main : `${T.main}55`, borderRadius: '4px 4px 0 0' }} />
                <span style={{ fontSize: 9, color: T.textMid }}>{d.label}</span>
              </div>
            ))}
          </div>
        )}
      </>);

      case 'w_clients': return wrap(<>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>Mes Clients</div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1, background: `${T.main}08`, borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: T.main }}>{myClients.active}</div>
            <div style={{ fontSize: 11, color: T.textLight }}>Actifs</div>
          </div>
          <div style={{ flex: 1, background: T.greenBg, borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: T.green }}>{myClients.closedMonth}</div>
            <div style={{ fontSize: 11, color: T.textLight }}>Fermes ce mois</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: T.textMid, flex: 1 }}>
          {closedList.map((c, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${T.border}` }}>
              <span>{c.name}</span><span style={{ fontWeight: 700, color: T.main }}>{fmt(c.value)}</span>
            </div>
          ))}
        </div>
      </>);

      case 'w_commission': return wrap(<>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>Mes Commissions</div>
        <div style={{ background: `${T.main}06`, borderRadius: 10, padding: 20, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
            <Info size={18} color={T.main} />
            <span style={{ fontSize: 14, fontWeight: 700, color: T.main }}>A venir</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: T.textMid, lineHeight: 1.6 }}>
            Systeme de calcul des commissions a venir -- les commissions seront calculees selon les regles de votre equipe.
          </p>
        </div>
      </>);

      case 'w_ranking': return wrap(<>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>Mon Classement</div>
        <div style={{ textAlign: 'center', padding: '12px 0', marginBottom: 12 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: `linear-gradient(135deg,${T.main},${T.mainLight})`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 8 }}>#{myRank}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>sur {totalAgents} agents</div>
        </div>
        {rankList.slice(0, 6).map((a, i) => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${T.border}`, background: a.id === userId ? `${T.main}08` : 'transparent', borderRadius: 4, paddingLeft: a.id === userId ? 8 : 0 }}>
            <span style={{ width: 18, fontSize: 12, fontWeight: 700, color: i < 3 ? ['#ffd700', '#c0c0c0', '#cd7f32'][i] : T.textLight }}>{i + 1}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: a.id === userId ? 700 : 400 }}>{a.name}{a.id === userId ? ' (vous)' : ''}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.main }}>{fmt(a.total)}</span>
          </div>
        ))}
      </>);

      case 'w_orders': return wrap(<>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>Commandes Recentes</div>
        {recentOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: T.textLight, fontSize: 13 }}>Aucune commande</div>
        ) : (
          recentOrders.map((o, i) => (
            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < recentOrders.length - 1 ? `1px solid ${T.border}` : 'none' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{o.orderNum}</div>
                <div style={{ fontSize: 11, color: T.textLight }}>{o.client} {o.date && `\u00B7 ${o.date}`}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{fmt(o.total)}</div>
                <span style={{ fontSize: 10, fontWeight: 600, color: T.textMid }}>{o.status}</span>
              </div>
            </div>
          ))
        )}
      </>);

      case 'w_goals': {
        return wrap(<>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>Objectifs mensuels</div>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto' }}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke={T.silverLight} strokeWidth="10" />
                <circle cx="60" cy="60" r="52" fill="none" stroke={T.main} strokeWidth="10"
                  strokeDasharray={`${goalPct * 3.27} ${327 - goalPct * 3.27}`}
                  strokeDashoffset="82" strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease' }} />
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: T.main }}>{Math.round(goalPct)}%</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: T.textLight }}>Actuel</span><span style={{ fontWeight: 700 }}>{fmt(goals.current)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: T.textLight }}>Objectif</span><span style={{ fontWeight: 700 }}>{fmt(goals.target)}</span>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: T.textMid }}>Reste: {fmt(Math.max(goals.target - goals.current, 0))}</div>
        </>);
      }

      case 'w_contests': return wrap(<>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ color: '#ffd700', fontSize: 18 }}>&#9733;</span>
          <span style={{ fontWeight: 800, fontSize: 15 }}>Concours</span>
        </div>
        {contestData ? (
          <>
            <div style={{ background: `${T.main}08`, borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: T.textLight }}>Vos points</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: T.main }}>{contestData.pts.toLocaleString()}</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{contestData.title}</div>
            <div style={{ fontSize: 12, color: T.textMid }}>Prix: <strong>{contestData.prize}</strong></div>
            <div style={{ fontSize: 11, color: T.textLight, marginTop: 4 }}>Fin: {contestData.endDate}</div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 20, color: T.textLight, fontSize: 13 }}>Aucun concours actif</div>
        )}
      </>);

      case 'w_notes': return wrap(<>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 10 }}>Notes personnelles</div>
        <textarea
          value={personalNotes}
          onChange={e => updateNotes(e.target.value)}
          placeholder="Écrivez vos notes ici..."
          style={{
            flex: 1, width: '100%', minHeight: 120, border: `1px solid ${T.border}`, borderRadius: 8,
            padding: 12, fontSize: 13, fontFamily: 'inherit', resize: 'vertical',
            background: T.cardAlt, color: T.text, outline: 'none',
          }}
        />
      </>);

      default: return null;
    }
  };

  if (loading) {
    return (
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: T.text }}>Mon Dashboard</h2>
        <p style={{ margin: 0, color: T.textMid, fontSize: 14 }}>Chargement...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: T.text }}>Mon Dashboard</h2>
          <p style={{ margin: 0, color: T.textMid, fontSize: 14 }}>Bienvenue, {userName} -- vos chiffres personnels</p>
        </div>
        <button onClick={() => setShowConfig(!showConfig)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', padding: '8px 16px', fontSize: 13, background: T.silverLight, color: T.text }}>
          Configurer widgets
        </button>
      </div>

      {showConfig && (
        <div style={{ background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: 16, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Widgets affiches</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {WIDGET_DEFS.map(w => (
              <button key={w.id} onClick={() => toggle(w.id)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: `1.5px solid ${activeWidgets.includes(w.id) ? T.main : T.silverLight}`,
                background: activeWidgets.includes(w.id) ? `${T.main}10` : 'transparent',
                color: activeWidgets.includes(w.id) ? T.main : T.textMid, fontFamily: 'inherit', transition: 'all 0.15s',
              }}>
                {w.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 16 }}>
        {widgetOrder.filter(wid => activeWidgets.includes(wid)).map(wid => (
          <div
            key={wid}
            draggable
            onDragStart={() => handleDragStart(wid)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(wid)}
            style={{
              ...(count <= 2 ? { minHeight: 320 } : {}),
              opacity: dragId === wid ? 0.5 : 1,
              cursor: 'grab',
              transition: 'opacity 0.15s',
            }}
          >
            {renderWidget(wid)}
          </div>
        ))}
      </div>
    </div>
  );
}
