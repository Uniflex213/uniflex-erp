import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { T } from '../theme';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import { useStaggerReveal } from '../hooks/useStaggerReveal';
import GlassCard from '../components/GlassCard';
import PeriodToggle from '../components/PeriodToggle';
import type { PeriodOption } from '../components/PeriodToggle';

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

// ── Canada + Northern US Flat Vector Map ──
function CanadaMap({ agents }: { agents: AgentSales[] }) {
  // Simplified SVG path data for Canada mainland + major features
  const canadaPath = `M 52,118 L 54,112 58,108 62,105 60,100 58,94 60,88 64,84 66,80 70,76 74,73
    78,70 82,68 86,66 92,64 98,62 104,60 110,58 116,56 122,54 128,52 134,50
    140,48 146,47 152,46 158,46 164,46 170,47 176,48 182,50 188,50 194,48
    200,46 206,44 212,42 218,40 224,38 230,36 236,35 242,34 248,34 254,34
    260,34 266,35 272,36 278,38 284,40 290,42 296,44 302,46 308,48 314,50
    320,50 326,48 332,46 336,44 340,42 344,42 348,44 352,48 356,52 358,56
    360,60 362,64 366,66 370,64 374,62 378,60 382,58 386,56 390,56 394,58
    396,62 398,68 400,74 402,80 404,86 406,92 404,98 400,102 396,106
    392,110 388,114 386,118 388,122 392,124 396,126 400,128 404,130
    408,134 410,138 412,142 414,146 416,148 418,150 420,154 418,158
    414,160 410,162 406,164 402,166 400,170 398,174 394,176 390,174
    386,172 382,170 378,168 374,170 370,174 368,178 366,180 362,178
    358,176 354,178 350,182 346,186 342,188 338,186 334,184 330,186
    326,188 322,190 318,192 314,194 310,192 306,190 302,192 298,196
    294,198 290,196 286,194 282,192 278,190 274,188 270,190 266,192
    262,190 258,188 254,186 250,188 246,190 242,188 238,186 234,188
    230,190 226,188 222,186 218,184 214,182 210,180 206,178 202,176
    198,174 194,172 190,170 186,172 182,174 178,176 174,178 170,180
    166,182 162,180 158,178 154,176 150,174 146,172 142,170 138,168
    134,170 130,172 126,174 122,172 118,170 114,168 110,166 106,164
    102,162 98,160 94,158 90,156 86,154 82,152 78,150 74,148 70,146
    66,144 62,142 58,140 56,136 54,132 52,128 52,124 52,118 Z`;

  // Simplified US northern portion (visible below Canada)
  const usPath = `M 52,168 L 56,166 60,164 64,162 68,160 72,158 76,156 80,154 84,152
    88,154 92,158 96,160 100,162 104,164 108,166 112,168 116,170
    120,172 124,174 128,176 132,174 136,172 140,170 144,172 148,174
    152,176 156,178 160,180 164,182 168,184 172,182 176,180 180,178
    184,176 188,174 192,172 196,174 200,176 204,178 208,180 212,182
    216,184 220,186 224,188 228,190 232,188 236,186 240,188 244,190
    248,192 252,190 256,188 260,190 264,192 268,194 272,196 276,198
    280,200 284,202 288,204 292,206 296,208 300,206 304,204 308,202
    312,200 316,198 320,200 324,202 328,204 332,206 336,204 340,202
    344,200 348,202 352,204 356,206 360,208 364,210 368,212 372,214
    376,216 380,218 384,220 388,222 392,224 396,226 400,228
    400,240 52,240 Z`;

  // Canadian Arctic islands (simplified)
  const arcticIslands = [
    `M 220,20 L 230,18 240,20 248,24 250,30 246,34 238,36 228,34 222,28 220,20 Z`,
    `M 260,16 L 270,14 280,16 286,22 284,28 276,30 266,28 260,22 260,16 Z`,
    `M 300,22 L 310,18 322,20 328,26 326,32 318,36 308,34 300,28 300,22 Z`,
    `M 340,30 L 348,26 358,28 364,34 362,40 354,44 344,42 340,36 340,30 Z`,
    `M 180,28 L 190,24 200,26 206,32 204,38 196,40 186,38 180,32 180,28 Z`,
    `M 280,8 L 292,6 304,10 308,16 304,22 294,24 282,20 278,14 280,8 Z`,
  ];

  // Vancouver Island
  const vanIsland = `M 42,130 L 46,124 50,120 54,122 56,128 54,134 50,140 46,142 42,138 42,130 Z`;

  // Maritimes detail shapes
  const novaScotia = `M 404,168 L 410,164 416,166 420,170 424,174 422,178 418,180 412,178 408,174 404,168 Z`;
  const pei = `M 400,160 L 406,158 412,160 410,164 404,162 400,160 Z`;
  const newfoundland = `M 420,140 L 428,136 436,138 440,144 438,150 432,154 424,152 420,146 420,140 Z`;

  const provinces: { code: string; x: number; y: number }[] = [
    { code: 'QC', x: 370, y: 158 },
    { code: 'ON', x: 310, y: 172 },
    { code: 'BC', x: 68, y: 120 },
    { code: 'AB', x: 108, y: 112 },
    { code: 'MB', x: 210, y: 148 },
    { code: 'SK', x: 160, y: 130 },
    { code: 'NB', x: 396, y: 166 },
    { code: 'NS', x: 416, y: 172 },
  ];

  const warehouses = [
    { name: 'Boisbriand', x: 372, y: 168 },
    { name: 'Toronto', x: 316, y: 182 },
    { name: 'Vancouver', x: 56, y: 134 },
  ];

  return (
    <svg viewBox="0 0 460 250" style={{ width: '100%', height: 'auto' }}>
      <defs>
        <style>{`
          @keyframes mapPulse {
            0%, 100% { r: 3; opacity: 0.4; }
            50% { r: 8; opacity: 0; }
          }
        `}</style>
      </defs>

      {/* US shape — very subtle background */}
      <path d={usPath} fill="#e5e7eb" stroke="#d1d5db" strokeWidth={0.5} opacity={0.5} />

      {/* Canada mainland */}
      <path d={canadaPath} fill="#e8eaed" stroke="#c9cdd2" strokeWidth={0.6} />

      {/* Arctic islands */}
      {arcticIslands.map((d, i) => (
        <path key={`arctic-${i}`} d={d} fill="#ebedef" stroke="#c9cdd2" strokeWidth={0.4} />
      ))}

      {/* Vancouver Island */}
      <path d={vanIsland} fill="#e8eaed" stroke="#c9cdd2" strokeWidth={0.5} />

      {/* Maritimes */}
      <path d={novaScotia} fill="#e8eaed" stroke="#c9cdd2" strokeWidth={0.5} />
      <path d={pei} fill="#e8eaed" stroke="#c9cdd2" strokeWidth={0.4} />
      <path d={newfoundland} fill="#e8eaed" stroke="#c9cdd2" strokeWidth={0.5} />

      {/* Dashed connection lines between warehouses */}
      <line x1={warehouses[0].x} y1={warehouses[0].y} x2={warehouses[1].x} y2={warehouses[1].y}
        stroke="#111" strokeWidth={0.8} opacity={0.12} strokeDasharray="4 3" />
      <line x1={warehouses[1].x} y1={warehouses[1].y} x2={warehouses[2].x} y2={warehouses[2].y}
        stroke="#111" strokeWidth={0.8} opacity={0.12} strokeDasharray="4 3" />

      {/* Province dots with pulse animation */}
      {provinces.map((p, i) => {
        const color = AGENT_COLORS[i % AGENT_COLORS.length];
        return (
          <g key={p.code}>
            {/* Pulse ring */}
            <circle cx={p.x} cy={p.y} r={3} fill="none" stroke={color} strokeWidth={1.2}
              opacity={0.4} style={{ animation: `mapPulse 2.8s ease-in-out ${i * 0.35}s infinite` }} />
            {/* Solid dot */}
            <circle cx={p.x} cy={p.y} r={3.5} fill={color} opacity={0.9} />
            <circle cx={p.x} cy={p.y} r={1.5} fill="#fff" opacity={0.6} />
            {/* Label */}
            <text x={p.x} y={p.y - 8} textAnchor="middle" fill="#111" fontSize={6.5}
              fontFamily="Inter, system-ui, sans-serif" fontWeight={700} opacity={0.55}
              letterSpacing={0.5}>{p.code}</text>
          </g>
        );
      })}

      {/* Warehouse square markers */}
      {warehouses.map(w => (
        <g key={w.name}>
          <rect x={w.x - 4} y={w.y - 4} width={8} height={8} rx={2} fill="#111" opacity={0.85} />
          <rect x={w.x - 2.5} y={w.y - 2.5} width={5} height={5} rx={1} fill="#fff" />
          <text x={w.x} y={w.y + 15} textAnchor="middle" fill="#111" fontSize={7}
            fontFamily="Inter, system-ui, sans-serif" fontWeight={600} opacity={0.55}>
            {w.name}
          </text>
        </g>
      ))}
    </svg>
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
