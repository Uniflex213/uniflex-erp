import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { T } from '../theme';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import { useStaggerReveal } from '../hooks/useStaggerReveal';
import GlassCard from '../components/GlassCard';
import PeriodToggle from '../components/PeriodToggle';
import type { PeriodOption } from '../components/PeriodToggle';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const fmt = (n: number) => new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
const fmtShort = (n: number) => n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;

// ── Types ──
type KpiData = { grossYtd: number; salesMonth: number; activeOrders: number; clientsClosed: number; activeAgents: number };
type AgentSales = { id: string; name: string; initials: string; total: number; clients: number; vendeur_code?: string; color: string };
type ClosedClient = { name: string; agent: string; value: number; date: string };
type ContestData = { title: string; prize: string; endDate: string; standings: { name: string; pts: number; rank: number }[] } | null;

// Agent colors for the leaderboard
const AGENT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

// ── Animated KPI Card ──
function KpiCard({ label, value, isMonetary, index, reveal }: {
  label: string; value: number; isMonetary: boolean; index: number; reveal: (i: number) => React.CSSProperties;
}) {
  const animated = useAnimatedNumber(value, 1400);
  return (
    <div style={{
      background: T.glassCard, border: `1px solid ${T.glassCardBorder}`,
      borderRadius: 8, padding: '20px 24px', backdropFilter: T.glassBlur,
      ...reveal(index),
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: T.textLight, marginBottom: 8, fontFamily: "'Inter', system-ui, sans-serif" }}>
        {label}
      </div>
      <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1.5, color: T.text, lineHeight: 1, fontFamily: "'Inter', system-ui, sans-serif", fontVariantNumeric: 'tabular-nums' }}>
        {isMonetary ? fmt(animated) : animated.toLocaleString('fr-CA')}
      </div>
    </div>
  );
}

// ── Canada Mapbox Map ──
function CanadaMap({ agents }: { agents: AgentSales[] }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const warehouses: { name: string; lng: number; lat: number }[] = [
    { name: 'Boisbriand', lng: -73.84, lat: 45.61 },
    { name: 'Toronto', lng: -79.38, lat: 43.65 },
    { name: 'Vancouver', lng: -123.12, lat: 49.28 },
  ];

  const provinces: { code: string; name: string; lng: number; lat: number }[] = [
    { code: 'QC', name: 'Québec', lng: -71.21, lat: 46.81 },
    { code: 'ON', name: 'Ontario', lng: -85.32, lat: 51.25 },
    { code: 'BC', name: 'C.-B.', lng: -125.65, lat: 53.73 },
    { code: 'AB', name: 'Alberta', lng: -114.37, lat: 53.93 },
    { code: 'MB', name: 'Manitoba', lng: -98.81, lat: 53.76 },
    { code: 'SK', name: 'Saskatchewan', lng: -106.35, lat: 52.94 },
    { code: 'NB', name: 'N.-B.', lng: -66.46, lat: 46.56 },
    { code: 'NS', name: 'N.-É.', lng: -63.57, lat: 44.68 },
  ];

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-96, 56],
      zoom: 2.8,
      interactive: false,
      attributionControl: false,
    });

    map.on('load', () => {
      // Warehouse markers
      warehouses.forEach(w => {
        const el = document.createElement('div');
        el.style.cssText = `width:10px;height:10px;background:#111;border-radius:2px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);`;
        new mapboxgl.Marker({ element: el }).setLngLat([w.lng, w.lat])
          .setPopup(new mapboxgl.Popup({ offset: 8, closeButton: false }).setHTML(
            `<div style="font:600 11px Inter,sans-serif;color:#111;padding:2px 4px">▲ ${w.name}</div>`
          )).addTo(map);
      });

      // Province pulsing dots
      provinces.forEach((p, i) => {
        const color = AGENT_COLORS[i % AGENT_COLORS.length];
        const el = document.createElement('div');
        el.style.cssText = `width:12px;height:12px;border-radius:50%;background:${color};opacity:0.85;box-shadow:0 0 6px ${color};`;
        el.animate([
          { boxShadow: `0 0 4px ${color}`, transform: 'scale(1)' },
          { boxShadow: `0 0 12px ${color}`, transform: 'scale(1.3)' },
          { boxShadow: `0 0 4px ${color}`, transform: 'scale(1)' },
        ], { duration: 2000, iterations: Infinity, delay: i * 300 });
        new mapboxgl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map);
      });
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  if (!token) {
    return (
      <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textLight, fontSize: 12, background: T.glassMid, borderRadius: 8 }}>
        Map — VITE_MAPBOX_TOKEN manquant
      </div>
    );
  }

  return (
    <div ref={mapContainer} style={{ width: '100%', height: 220, borderRadius: 8, overflow: 'hidden' }} />
  );
}

// ── Pixel Grid Transition ──
function PixelGridOverlay({ show, onDone }: { show: boolean; onDone: () => void }) {
  const [pixels, setPixels] = useState<{ x: number; y: number; delay: number; blue: boolean }[]>([]);

  useEffect(() => {
    if (show) {
      const grid: typeof pixels = [];
      for (let x = 0; x < 30; x++) {
        for (let y = 0; y < 30; y++) {
          grid.push({ x, y, delay: Math.random() * 300, blue: Math.random() > 0.85 });
        }
      }
      setPixels(grid);
      const t = setTimeout(onDone, 800);
      return () => clearTimeout(t);
    }
  }, [show]);

  if (!show) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(30, 1fr)', gridTemplateRows: 'repeat(30, 1fr)', gap: 1, zIndex: 10, borderRadius: 8, overflow: 'hidden' }}>
      {pixels.map((p, i) => (
        <div key={i} style={{
          background: p.blue ? T.main : '#333',
          opacity: 0,
          animation: `pixelIn 0.3s ease ${p.delay}ms forwards`,
        }} />
      ))}
    </div>
  );
}

// ── Sales Bar Chart (SVG pure) ──
function SalesChart({ data, period }: { data: { label: string; value: number }[]; period: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  if (data.length === 0) return <div style={{ textAlign: 'center', padding: 32, color: T.textLight, fontSize: 13 }}>Aucune donnée pour cette période</div>;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 160, padding: '8px 0' }}>
      {data.map((d, i) => {
        const h = Math.max((d.value / max) * 100, 3);
        const isLast = i === data.length - 1;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: T.textMid, fontFamily: "'Inter', system-ui, sans-serif" }}>
              {d.value >= 1000 ? fmtShort(d.value) : d.value}
            </span>
            <div style={{
              width: '100%', maxWidth: 32, height: `${h}%`,
              background: isLast ? T.main : `${T.main}44`,
              borderRadius: '3px 3px 0 0',
              transition: 'height 0.8s cubic-bezier(0.34,1.56,0.64,1)',
              boxShadow: isLast ? T.shadowGlow : 'none',
            }} />
            <span style={{ fontSize: 9, color: T.textLight, fontFamily: "'Inter', system-ui, sans-serif" }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}


// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function DashCompany() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KpiData>({ grossYtd: 0, salesMonth: 0, activeOrders: 0, clientsClosed: 0, activeAgents: 0 });
  const [salesData, setSalesData] = useState<{ label: string; value: number }[]>([]);
  const [salesPeriod, setSalesPeriod] = useState('monthly');
  const [leaderPeriod, setLeaderPeriod] = useState('monthly');
  const [leaders, setLeaders] = useState<AgentSales[]>([]);
  const [productSales, setProductSales] = useState<{ name: string; value: number }[]>([]);
  const [prodPeriod, setProdPeriod] = useState('monthly');
  const [closedClients, setClosedClients] = useState<ClosedClient[]>([]);
  const [contest, setContest] = useState<ContestData>(null);
  const [flashNews, setFlashNews] = useState<string[]>([]);
  const [flashIdx, setFlashIdx] = useState(0);

  const periodOpts: PeriodOption[] = [{ key: 'annual', label: 'Annuel' }, { key: 'monthly', label: 'Mensuel' }, { key: 'weekly', label: 'Hebdo' }];
  const salesPeriodOpts: PeriodOption[] = [...periodOpts, { key: 'daily', label: 'Quotidien' }];

  const reveal = useStaggerReveal(12, 50);
  const rankColors = ['#111', '#6b6b6b', '#a0a0a0'];

  const initialLoadDone = useRef(false);
  useEffect(() => { loadAll().then(() => { initialLoadDone.current = true; }); }, []);
  useEffect(() => { if (flashNews.length > 0) { const t = setInterval(() => setFlashIdx(i => (i + 1) % flashNews.length), 4000); return () => clearInterval(t); } }, [flashNews.length]);
  // Skip initial trigger — loadAll already fetches these on mount
  useEffect(() => { if (initialLoadDone.current) loadSalesChart(); }, [salesPeriod]);
  useEffect(() => { if (initialLoadDone.current) loadLeaderboard(); }, [leaderPeriod]);
  useEffect(() => { if (initialLoadDone.current) loadProductSales(); }, [prodPeriod]);

  // ── Data Loading (unchanged logic) ──
  const loadAll = async () => {
    setLoading(true);
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [ordersYtdRes, ordersMonthRes, activeOrdersRes, closedLeadsRes, agentsRes, contestRes, logsRes] = await Promise.all([
      supabase.from('orders').select('total').gte('created_at', startOfYear),
      supabase.from('orders').select('total').gte('created_at', startOfMonth),
      supabase.from('orders').select('id, status').not('status', 'in', '("completed","rejected","cancelled")'),
      supabase.from('crm_leads').select('company_name, assigned_agent_name, estimated_value, closed_at').eq('stage', 'Ferme Gagne').gte('closed_at', startOfMonth),
      supabase.from('profiles').select('id').eq('role', 'vendeur').eq('is_active', true),
      supabase.from('contests').select('title, prize_description, end_date, status, contest_participants(user_id, total_points, profile:profiles(full_name))').eq('status', 'active').limit(1).maybeSingle(),
      supabase.from('activity_logs').select('action, entity_type, details, created_at').order('created_at', { ascending: false }).limit(10),
    ]);

    const grossYtd = (ordersYtdRes.data || []).reduce((s, o) => s + (o.total || 0), 0);
    const salesMonth = (ordersMonthRes.data || []).reduce((s, o) => s + (o.total || 0), 0);
    const activeOrders = (activeOrdersRes.data || []).length;
    const closed = closedLeadsRes.data || [];
    const clientsClosed = closed.length;
    const activeAgents = (agentsRes.data || []).length;

    setKpis({ grossYtd, salesMonth, activeOrders, clientsClosed, activeAgents });
    setClosedClients(closed.map(c => ({
      name: c.company_name || 'Inconnu',
      agent: c.assigned_agent_name || '',
      value: c.estimated_value || 0,
      date: c.closed_at ? new Date(c.closed_at).toLocaleDateString('fr-CA') : '',
    })));

    if (contestRes.data) {
      const c = contestRes.data as any;
      const participants = (c.contest_participants || [])
        .sort((a: any, b: any) => (b.total_points || 0) - (a.total_points || 0))
        .slice(0, 5)
        .map((p: any, i: number) => ({ name: p.profile?.full_name || 'Inconnu', pts: p.total_points || 0, rank: i + 1 }));
      setContest({ title: c.title, prize: c.prize_description || '', endDate: new Date(c.end_date).toLocaleDateString('fr-CA'), standings: participants });
    }

    const news = (logsRes.data || []).map((l: any) => {
      const d = l.details || {};
      return `${d.user_name || ''} ${l.action} ${l.entity_type || ''} ${d.description || ''}`.trim();
    }).filter((n: string) => n.length > 5);
    setFlashNews(news.length > 0 ? news : ['Bienvenue sur le dashboard Uniflex']);

    await Promise.all([loadSalesChart(), loadLeaderboard(), loadProductSales()]);
    setLoading(false);
  };

  const loadSalesChart = async () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
    const { data } = await supabase.from('orders').select('total, created_at').gte('created_at', startOfYear);
    if (!data) return;
    const grouped: Record<string, number> = {};
    data.forEach(o => {
      const d = new Date(o.created_at);
      let key = '';
      if (salesPeriod === 'annual') key = String(d.getFullYear());
      else if (salesPeriod === 'monthly') key = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
      else if (salesPeriod === 'weekly') key = `S${Math.ceil(((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7)}`;
      else key = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][d.getDay() === 0 ? 6 : d.getDay() - 1];
      grouped[key] = (grouped[key] || 0) + (o.total || 0);
    });
    if (salesPeriod === 'daily') {
      const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
      setSalesData(days.map(d => ({ label: d, value: grouped[d] || 0 })));
    } else {
      setSalesData(Object.entries(grouped).map(([label, value]) => ({ label, value })));
    }
  };

  const loadLeaderboard = async () => {
    const now = new Date();
    let start: string;
    if (leaderPeriod === 'annual') start = new Date(now.getFullYear(), 0, 1).toISOString();
    else if (leaderPeriod === 'monthly') start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    else start = new Date(now.getTime() - 7 * 86400000).toISOString();

    const { data: orders } = await supabase.from('orders').select('owner_id, total').gte('created_at', start);
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, vendeur_code').in('role', ['vendeur', 'admin', 'god_admin']).eq('is_active', true);
    if (!orders || !profiles) return;

    const map: Record<string, number> = {};
    orders.forEach(o => { if (o.owner_id) map[o.owner_id] = (map[o.owner_id] || 0) + (o.total || 0); });

    const result: AgentSales[] = profiles.map((p, i) => ({
      id: p.id,
      name: p.full_name || 'Inconnu',
      initials: (p.full_name || '??').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
      total: map[p.id] || 0,
      clients: 0,
      vendeur_code: (p as any).vendeur_code || undefined,
      color: AGENT_COLORS[i % AGENT_COLORS.length],
    })).sort((a, b) => b.total - a.total);

    setLeaders(result);
  };

  const loadProductSales = async () => {
    const now = new Date();
    let start: string;
    if (prodPeriod === 'annual') start = new Date(now.getFullYear(), 0, 1).toISOString();
    else if (prodPeriod === 'monthly') start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    else start = new Date(now.getTime() - 7 * 86400000).toISOString();

    const { data } = await supabase.from('orders').select('products').gte('created_at', start);
    if (!data) return;
    const pmap: Record<string, number> = {};
    data.forEach(o => {
      const items = o.products || [];
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          const name = item.name || item.product_name || item.p || 'Inconnu';
          const revenue = (item.quantity || item.q || 0) * (item.price || item.unit_price || item.pr || 0);
          pmap[name] = (pmap[name] || 0) + revenue;
        });
      }
    });
    setProductSales(Object.entries(pmap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));
  };

  const maxProd = Math.max(...productSales.map(p => p.value), 1);
  const animatedGrossYtd = useAnimatedNumber(kpis.grossYtd, 1800);

  // ── Loading Skeleton ──
  if (loading) {
    return (
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: T.textLight, marginBottom: 6 }}>
          Dashboard Compagnie
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ flex: '1 1 180px', background: T.glassCard, borderRadius: 8, border: `1px solid ${T.glassCardBorder}`, padding: 20, minHeight: 90 }}>
              <div style={{ height: 10, background: T.glassMid, borderRadius: 3, width: '60%', marginBottom: 12 }} />
              <div style={{ height: 24, background: T.glassMid, borderRadius: 3, width: '40%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Main Render ──
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 1400, margin: '0 auto' }}>
      {/* ── HEADER ── */}
      <div style={{ marginBottom: 24, ...reveal(0) }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: T.textLight, marginBottom: 4 }}>
          Dashboard Compagnie
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: T.text, letterSpacing: -1 }}>
            Uniflex Distribution
          </h2>
          <span style={{ fontSize: 12, color: T.textMid }}>
            [{new Date().toLocaleDateString('fr-CA')}]
          </span>
        </div>
      </div>

      {/* ── TOP SECTION: Stats + Map ── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>

        {/* Left: Big Counter + Top Agents */}
        <div style={{ flex: '0 0 340px', display: 'flex', flexDirection: 'column', gap: 16, ...reveal(1) }}>
          {/* Big animated counter */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: T.textLight, marginBottom: 8 }}>
              Ventes totales YTD
            </div>
            <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: -2, color: T.text, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {fmt(animatedGrossYtd)}
            </div>
            <div style={{ fontSize: 12, color: T.textMid, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
              ~{fmtShort(Math.round(kpis.salesMonth / Math.max(new Date().getDate(), 1)))}/jour
            </div>
          </div>

          {/* Top Agents list */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: T.textLight, marginBottom: 8 }}>
              Top vendeurs
            </div>
            {leaders.slice(0, 5).map((a, i) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 12 }}>
                <span style={{ color: a.color, fontSize: 10 }}>■</span>
                <span style={{ color: a.color, minWidth: 24 }}>{a.initials}</span>
                <span style={{ color: T.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                <span style={{ color: T.text, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(a.total)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Canada Map */}
        <div style={{ flex: 1, minWidth: 300, ...reveal(2) }}>
          <CanadaMap agents={leaders} />
        </div>
      </div>

      {/* ── KPI ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: 16 }}>
        <KpiCard label="Ventes ce mois" value={kpis.salesMonth} isMonetary index={3} reveal={reveal} />
        <KpiCard label="Commandes actives" value={kpis.activeOrders} isMonetary={false} index={4} reveal={reveal} />
        <KpiCard label="Clients fermés" value={kpis.clientsClosed} isMonetary={false} index={5} reveal={reveal} />
        <KpiCard label="Agents actifs" value={kpis.activeAgents} isMonetary={false} index={6} reveal={reveal} />
      </div>

      {/* ── STATS GRID (3 columns) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 8, marginBottom: 16 }}>

        {/* COL 1: Sales Chart + Products */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <GlassCard style={{ padding: 16, ...reveal(7) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>Ventes</div>
              <PeriodToggle value={salesPeriod} onChange={setSalesPeriod} options={salesPeriodOpts} />
            </div>
            <SalesChart data={salesData} period={salesPeriod} />
          </GlassCard>

          <GlassCard style={{ padding: 16, ...reveal(8) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>Produits top</div>
              <PeriodToggle value={prodPeriod} onChange={setProdPeriod} options={periodOpts} />
            </div>
            {productSales.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: T.textLight, fontSize: 12 }}>Aucune donnée</div>
            ) : (
              productSales.slice(0, 5).map(p => (
                <div key={p.name} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{p.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.main }}>{fmt(p.value)}</span>
                  </div>
                  <div style={{ height: 4, background: T.glassMid, borderRadius: 2 }}>
                    <div style={{
                      height: '100%', width: `${(p.value / maxProd) * 100}%`,
                      background: T.gradientMain, borderRadius: 2,
                      transition: 'width 0.8s ease',
                    }} />
                  </div>
                </div>
              ))
            )}
          </GlassCard>
        </div>

        {/* COL 2: Leaderboard + Closed Clients */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <GlassCard style={{ padding: 16, ...reveal(9) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#d97706', fontSize: 16 }}>★</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: T.text }}>Leaderboard</span>
              </div>
              <PeriodToggle value={leaderPeriod} onChange={setLeaderPeriod} options={periodOpts} />
            </div>
            {leaders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: T.textLight, fontSize: 12 }}>Aucun agent</div>
            ) : (
              leaders.slice(0, 8).map((a, i) => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                  borderBottom: i < Math.min(leaders.length, 8) - 1 ? `1px solid ${T.border}` : 'none',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: i < 3 ? rankColors[i] : T.glassMid,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800, color: i < 3 ? '#000' : T.textMid, flexShrink: 0,
                  }}>{i + 1}</div>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: `${a.color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: a.color, flexShrink: 0,
                  }}>{a.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.name}
                      {a.vendeur_code && <span style={{ fontSize: 9, marginLeft: 6, padding: '1px 5px', borderRadius: 8, background: T.mainGlow, color: T.mainLight }}>{a.vendeur_code}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: T.main }}>{fmt(a.total)}</div>
                </div>
              ))
            )}
          </GlassCard>

          <GlassCard style={{ padding: 16, ...reveal(10) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.green }} />
              <span style={{ fontWeight: 700, fontSize: 13, color: T.text }}>Clients fermés ce mois</span>
              <span style={{ background: T.greenBg, color: T.green, padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{closedClients.length}</span>
            </div>
            {closedClients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 16, color: T.textLight, fontSize: 12 }}>Aucun client fermé ce mois</div>
            ) : (
              closedClients.slice(0, 4).map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < closedClients.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: T.textLight }}>par {c.agent} {c.date && `· ${c.date}`}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.main }}>{fmt(c.value)}</div>
                </div>
              ))
            )}
          </GlassCard>
        </div>

        {/* COL 3: Contest + Flash News */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <GlassCard style={{
            padding: 16,
            background: T.gradientCard,
            ...reveal(11),
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ color: '#d97706', fontSize: 16 }}>★</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: T.text }}>Concours actif</span>
            </div>
            {contest ? (
              <>
                <div style={{ fontSize: 11, color: T.textMid, marginBottom: 12 }}>{contest.title}</div>
                <div style={{ background: T.glassMid, borderRadius: 6, padding: 10, marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: T.textMid, marginBottom: 3 }}>Prix</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#d97706' }}>{contest.prize}</div>
                  <div style={{ fontSize: 10, color: T.textLight, marginTop: 3 }}>Fin: {contest.endDate}</div>
                </div>
                {contest.standings.map((s, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                    borderBottom: i < 4 ? `1px solid ${T.border}` : 'none',
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: i < 3 ? rankColors[i] : T.glassMid,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 800, color: i < 3 ? '#000' : T.textMid,
                    }}>{s.rank}</div>
                    <div style={{ flex: 1, fontSize: 12, fontWeight: i === 0 ? 700 : 400, color: T.text }}>{s.name}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? '#d97706' : T.text }}>{s.pts.toLocaleString()} pts</div>
                  </div>
                ))}
              </>
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: T.textLight, fontSize: 12 }}>Aucun concours actif</div>
            )}
          </GlassCard>

          {/* Flash News Ticker */}
          {flashNews.length > 0 && (
            <GlassCard style={{
              padding: '0 16px', height: 40, display: 'flex', alignItems: 'center',
              overflow: 'hidden', position: 'relative',
            }}>
              <div style={{
                background: T.red, color: '#fff', fontWeight: 800, fontSize: 9,
                padding: '3px 8px', borderRadius: 3, marginRight: 12, flexShrink: 0,
                textTransform: 'uppercase', letterSpacing: 1,
                animation: 'pulseGlow 2s ease-in-out infinite',
              }}>EN DIRECT</div>
              <div style={{ flex: 1, overflow: 'hidden', position: 'relative', height: 40, display: 'flex', alignItems: 'center' }}>
                <div key={flashIdx} style={{ color: T.text, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', animation: 'slideIn 0.5s ease' }}>
                  {flashNews[flashIdx]}
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
