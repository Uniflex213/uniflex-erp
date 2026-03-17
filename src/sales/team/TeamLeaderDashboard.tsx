import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { T } from "../../theme";
import { Team, TeamMember } from "./teamTypes";
import TeamGoalsTab from "./TeamGoalsTab";
import TeamPricesPage from "./TeamPricesPage";
import TeamBeneficePage from "./TeamBeneficePage";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2 }).format(n);

const fmtPct = (n: number) => `${n.toFixed(1)} %`;

interface MemberRow {
  id: string;
  full_name: string;
  seller_code: string | null;
  role: string;
  team_id: string | null;
}

interface CommissionConfig {
  id: string;
  team_id: string;
  member_id: string;
  commission_rate: number;
}

interface OrderRow {
  id: string;
  vendeur_code: string | null;
  subtotal_after_discount: number | null;
  subtotal: number | null;
  created_at: string;
}

interface MemberStats {
  member: MemberRow;
  salesMTD: number;
  orderCount: number;
  commissionRate: number;
  commissionDue: number;
}

type TabKey = "apercu" | "commissions" | "activite" | "objectifs" | "team_prices" | "benefice";

const TABS: { key: TabKey; label: string }[] = [
  { key: "apercu", label: "Aperçu" },
  { key: "commissions", label: "Commissions" },
  { key: "activite", label: "Activité" },
  { key: "objectifs", label: "Objectifs" },
  { key: "team_prices", label: "Team Prices" },
  { key: "benefice", label: "Bénéfice" },
];

const inputStyle: React.CSSProperties = {
  padding: "6px 10px",
  border: `1px solid ${T.border}`,
  borderRadius: 6,
  fontSize: 13,
  fontFamily: "inherit",
  color: T.text,
  background: T.bgInput,
  outline: "none",
  width: 80,
  boxSizing: "border-box",
  textAlign: "right",
};

export default function TeamLeaderDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("apercu");
  const [resolvedTeamId, setResolvedTeamId] = useState<string | null>(profile?.team_id ?? null);
  const [teamObj, setTeamObj] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Only use profile.team_id — set explicitly when user joins via team code
  useEffect(() => {
    const tid = profile?.team_id ?? null;
    setResolvedTeamId(tid);

    if (tid) {
      const load = async () => {
        const [{ data: team }, { data: members }] = await Promise.all([
          supabase.from("teams").select("*").eq("id", tid).maybeSingle(),
          supabase.from("team_members").select("*").eq("team_id", tid).is("removed_at", null),
        ]);
        if (team) setTeamObj(team as Team);
        if (members) setTeamMembers(members as TeamMember[]);
      };
      load();
    } else {
      setTeamObj(null);
      setTeamMembers([]);
    }
  }, [profile?.team_id]);

  const teamId = resolvedTeamId;

  return (
    <div style={{ background: T.bg, minHeight: "100%", padding: "24px 28px", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: "0 0 4px" }}>Tableau de bord — Chef d'équipe</h1>
        <div style={{ fontSize: 13, color: T.textMid }}>Gérez votre équipe, commissions et performance</div>
      </div>

      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${T.border}`, marginBottom: 24, overflowX: "auto" }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === t.key ? `2px solid ${T.main}` : "2px solid transparent",
              marginBottom: -1,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: activeTab === t.key ? 700 : 500,
              color: activeTab === t.key ? T.main : T.textMid,
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "apercu" && <ApercuTab teamId={teamId} />}
      {activeTab === "commissions" && <CommissionsTab teamId={teamId} />}
      {activeTab === "activite" && <ActiviteTab teamId={teamId} />}
      {activeTab === "objectifs" && teamObj && (
        <TeamGoalsTab team={teamObj} members={teamMembers} isLeader={true} />
      )}
      {activeTab === "objectifs" && !teamObj && (
        <div style={{ color: T.textMid, fontSize: 14, padding: 24 }}>Chargement de l'équipe...</div>
      )}
      {activeTab === "team_prices" && <TeamPricesPage />}
      {activeTab === "benefice" && <TeamBeneficePage />}
    </div>
  );
}

function ActiviteTab({ teamId }: { teamId: string | null }) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [orders, setOrders] = useState<{ id: string; vendeur_code: string | null; subtotal_after_discount: number | null; subtotal: number | null; created_at: string; client_name?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) { setLoading(false); return; }
    const load = async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [{ data: mems }, { data: ords }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, seller_code, role, team_id").eq("team_id", teamId),
        supabase.from("orders").select("id, vendeur_code, subtotal_after_discount, subtotal, created_at, client_name")
          .gte("created_at", startOfMonth.toISOString())
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      if (mems) setMembers(mems as MemberRow[]);
      if (ords) {
        const codes = new Set((mems ?? []).map((m: any) => m.seller_code).filter(Boolean));
        setOrders((ords as any[]).filter(o => o.vendeur_code && codes.has(o.vendeur_code)));
      }
      setLoading(false);
    };
    load();
  }, [teamId]);

  if (!teamId) return <div style={{ color: T.textMid, fontSize: 14, padding: 24 }}>Vous n'êtes pas assigné à une équipe.</div>;
  if (loading) return <div style={{ color: T.textMid, fontSize: 14, padding: 24, textAlign: "center" }}>Chargement...</div>;

  const memberByCode: Record<string, MemberRow> = {};
  for (const m of members) { if (m.seller_code) memberByCode[m.seller_code] = m; }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const ordersToday = orders.filter(o => new Date(o.created_at) >= today).length;
  const ordersWeek = orders.filter(o => new Date(o.created_at) >= weekAgo).length;
  const ordersMonth = orders.length;

  const kpis = [
    { label: "Aujourd'hui", value: String(ordersToday), icon: "📅" },
    { label: "Cette semaine", value: String(ordersWeek), icon: "📊" },
    { label: "Ce mois", value: String(ordersMonth), icon: "📈" },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        {kpis.map(k => (
          <div key={k.label} style={{ flex: "1 1 160px", background: T.bgCard, borderRadius: 12, padding: "16px 18px", border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>{k.icon}</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: T.text }}>{k.value}</div>
              <div style={{ fontSize: 10, color: T.textMid, fontWeight: 600 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: T.bgCard, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}` }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>Commandes récentes de l'équipe</span>
        </div>
        {orders.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: T.textMid, fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            Aucune commande ce mois-ci
          </div>
        ) : (
          <div style={{ maxHeight: 500, overflowY: "auto" }}>
            {orders.map(o => {
              const m = memberByCode[o.vendeur_code ?? ""];
              const initials = m ? m.full_name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() : "??";
              const amount = Number(o.subtotal_after_discount) || Number(o.subtotal) || 0;
              const date = new Date(o.created_at);
              const isToday = date >= today;
              return (
                <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderTop: `1px solid ${T.border}` }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: T.main, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                      {m?.full_name ?? o.vendeur_code}
                      {o.client_name && <span style={{ color: T.textMid, fontWeight: 400 }}> → {o.client_name}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: T.textMid }}>
                      {date.toLocaleDateString("fr-CA")} à {date.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: T.green, whiteSpace: "nowrap" }}>
                    {fmt(amount)}
                  </div>
                  {isToday && (
                    <span style={{ fontSize: 9, fontWeight: 800, background: `${T.main}15`, color: T.main, padding: "2px 6px", borderRadius: 4 }}>
                      AUJOURD'HUI
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ApercuTab({ teamId }: { teamId: string | null }) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [stats, setStats] = useState<MemberStats[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!teamId) { setLoading(false); return; }
    setLoading(true);
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [membersRes, ordersRes, configsRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, seller_code, role, team_id").eq("team_id", teamId),
        supabase.from("orders").select("id, vendeur_code, subtotal_after_discount, subtotal, created_at")
          .gte("created_at", startOfMonth.toISOString()),
        supabase.from("team_commission_configs").select("id, team_id, member_id, commission_rate").eq("team_id", teamId),
      ]);

      const memberList = (membersRes.data || []) as MemberRow[];
      const orders = (ordersRes.data || []) as OrderRow[];
      const configs = (configsRes.data || []) as CommissionConfig[];

      const memberStats: MemberStats[] = memberList.map(m => {
        const sellerCode = m.seller_code ?? "";
        const memberOrders = sellerCode
          ? orders.filter(o => o.vendeur_code === sellerCode)
          : [];
        const salesMTD = memberOrders.reduce((sum, o) => sum + (Number(o.subtotal_after_discount) || Number(o.subtotal) || 0), 0);
        const orderCount = memberOrders.length;
        const config = configs.find(c => c.member_id === m.id);
        const commissionRate = config?.commission_rate ?? 0.05;
        const commissionDue = salesMTD * commissionRate;
        return { member: m, salesMTD, orderCount, commissionRate, commissionDue };
      });

      setMembers(memberList);
      setStats(memberStats);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => { load(); }, [load]);

  if (!teamId) {
    return <div style={{ color: T.textMid, fontSize: 14, padding: 24 }}>Vous n'êtes pas assigné à une équipe.</div>;
  }

  if (loading) {
    return <div style={{ color: T.textMid, fontSize: 14, padding: 24, textAlign: "center" }}>Chargement...</div>;
  }

  const totalSales = stats.reduce((s, r) => s + r.salesMTD, 0);
  const totalCommissions = stats.reduce((s, r) => s + r.commissionDue, 0);
  const totalOrders = stats.reduce((s, r) => s + r.orderCount, 0);
  const maxSales = Math.max(...stats.map(r => r.salesMTD), 1);

  const sortedByRank = [...stats].sort((a, b) => b.salesMTD - a.salesMTD);

  const kpis = [
    { label: "Ventes totales MTD", value: fmt(totalSales), color: T.main, bg: `${T.main}15` },
    { label: "Commissions dues", value: fmt(totalCommissions), color: T.green, bg: T.greenBg },
    { label: "Nb membres", value: String(members.length), color: T.cyan, bg: T.cyanBg },
    { label: "Nb commandes", value: String(totalOrders), color: T.orange, bg: T.orangeBg },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
        {kpis.map(k => (
          <div key={k.label} style={{ flex: "1 1 200px", background: T.bgCard, borderRadius: 12, padding: "18px 20px", border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: T.bgCard, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden", marginBottom: 24 }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}` }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>Membres de l'équipe — MTD</span>
        </div>
        {stats.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: T.textMid, fontSize: 13 }}>Aucun membre dans cette équipe.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: T.bg }}>
                  {["Rang", "Membre", "Code vendeur", "Ventes MTD", "Commission due", "Rôle"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 800, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedByRank.map((row, i) => {
                  const initials = row.member.full_name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
                  const avatarColors = ["#6366f1", "#16a34a", "#ea580c", "#0891b2", "#7c3aed", "#dc2626", "#0d9488"];
                  const avatarColor = avatarColors[i % avatarColors.length];
                  return (
                    <tr key={row.member.id} style={{ borderTop: `1px solid ${T.border}` }}>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          width: 24, height: 24, borderRadius: "50%",
                          background: i === 0 ? T.orange : i === 1 ? T.textMid : T.bgCard2,
                          color: i < 2 ? "#fff" : T.textMid,
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 800,
                        }}>
                          {i + 1}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%", background: avatarColor,
                            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 800, flexShrink: 0,
                          }}>{initials}</div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{row.member.full_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {row.member.seller_code ? (
                          <span style={{ background: `${T.main}15`, color: T.main, padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>
                            {row.member.seller_code}
                          </span>
                        ) : <span style={{ color: T.textLight, fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{fmt(row.salesMTD)}</span>
                          <div style={{ height: 5, borderRadius: 3, background: T.border, width: 120 }}>
                            <div style={{
                              height: "100%", borderRadius: 3,
                              width: `${(row.salesMTD / maxSales) * 100}%`,
                              background: `linear-gradient(90deg, ${T.main}, #4f46e5)`,
                            }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: T.green, fontSize: 13 }}>{fmt(row.commissionDue)}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          background: row.member.role === "leader" ? T.orangeBg : T.blueBg,
                          color: row.member.role === "leader" ? T.orange : T.blue,
                          padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800, textTransform: "uppercase",
                        }}>
                          {row.member.role === "leader" ? "Chef" : "Membre"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CommissionsTab({ teamId }: { teamId: string | null }) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [configs, setConfigs] = useState<CommissionConfig[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [rates, setRates] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [globalRate, setGlobalRate] = useState("5");
  const [loading, setLoading] = useState(true);
  const [applyingAll, setApplyingAll] = useState(false);

  const load = useCallback(async () => {
    if (!teamId) { setLoading(false); return; }
    setLoading(true);
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [membersRes, configsRes, ordersRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, seller_code, role, team_id").eq("team_id", teamId),
        supabase.from("team_commission_configs").select("id, team_id, member_id, commission_rate").eq("team_id", teamId),
        supabase.from("orders").select("id, vendeur_code, subtotal_after_discount, subtotal, created_at")
          .gte("created_at", startOfMonth.toISOString()),
      ]);

      const memberList = (membersRes.data || []) as MemberRow[];
      const configList = (configsRes.data || []) as CommissionConfig[];
      const orderList = (ordersRes.data || []) as OrderRow[];

      setMembers(memberList);
      setConfigs(configList);
      setOrders(orderList);

      const initialRates: Record<string, string> = {};
      for (const m of memberList) {
        const cfg = configList.find(c => c.member_id === m.id);
        initialRates[m.id] = cfg ? String((cfg.commission_rate * 100).toFixed(1)) : "5.0";
      }
      setRates(initialRates);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => { load(); }, [load]);

  const getMemberSales = (m: MemberRow) => {
    const code = m.seller_code ?? "";
    if (!code) return 0;
    return orders
      .filter(o => o.vendeur_code === code)
      .reduce((s, o) => s + (Number(o.subtotal_after_discount) || Number(o.subtotal) || 0), 0);
  };

  const handleSave = async (memberId: string) => {
    if (!teamId) return;
    const rateVal = parseFloat(rates[memberId] || "0") / 100;
    setSaving(prev => ({ ...prev, [memberId]: true }));
    await supabase.from("team_commission_configs").upsert(
      { team_id: teamId, member_id: memberId, commission_rate: rateVal },
      { onConflict: "team_id,member_id" }
    );
    setSaving(prev => ({ ...prev, [memberId]: false }));
    setSaved(prev => ({ ...prev, [memberId]: true }));
    setTimeout(() => setSaved(prev => ({ ...prev, [memberId]: false })), 2000);
  };

  const handleApplyAll = async () => {
    if (!teamId) return;
    const rateVal = parseFloat(globalRate || "0") / 100;
    if (isNaN(rateVal) || rateVal < 0) return;
    setApplyingAll(true);

    const newRates: Record<string, string> = {};
    for (const m of members) newRates[m.id] = globalRate;
    setRates(newRates);

    const upserts = members.map(m => ({ team_id: teamId, member_id: m.id, commission_rate: rateVal }));
    await supabase.from("team_commission_configs").upsert(upserts, { onConflict: "team_id,member_id" });
    setApplyingAll(false);
  };

  if (!teamId) {
    return <div style={{ color: T.textMid, fontSize: 14, padding: 24 }}>Vous n'êtes pas assigné à une équipe.</div>;
  }

  if (loading) {
    return <div style={{ color: T.textMid, fontSize: 14, padding: 24, textAlign: "center" }}>Chargement...</div>;
  }

  const totalSales = members.reduce((s, m) => s + getMemberSales(m), 0);
  const totalCommissions = members.reduce((m_sum, m) => {
    const sales = getMemberSales(m);
    const rate = parseFloat(rates[m.id] || "0") / 100;
    return m_sum + sales * rate;
  }, 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Appliquer à tous :</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={globalRate}
            onChange={e => setGlobalRate(e.target.value)}
            style={{ ...inputStyle, width: 70 }}
          />
          <span style={{ fontSize: 13, color: T.textMid }}>%</span>
          <button
            onClick={handleApplyAll}
            disabled={applyingAll}
            style={{
              background: T.main, color: "#fff", border: "none", borderRadius: 8,
              padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit", opacity: applyingAll ? 0.6 : 1,
            }}
          >
            {applyingAll ? "Application..." : "Appliquer à tous"}
          </button>
        </div>
      </div>

      <div style={{ background: T.bgCard, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: T.bg }}>
                {["Vendeur", "Code", "Ventes MTD", "Taux %", "Commission brute", ""].map(h => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 10, fontWeight: 800, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map(m => {
                const sales = getMemberSales(m);
                const rate = parseFloat(rates[m.id] || "0") / 100;
                const commission = sales * rate;
                const initials = m.full_name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <tr key={m.id} style={{ borderTop: `1px solid ${T.border}` }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: "50%", background: T.main,
                          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 800, flexShrink: 0,
                        }}>{initials}</div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{m.full_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {m.seller_code ? (
                        <span style={{ background: `${T.main}15`, color: T.main, padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>
                          {m.seller_code}
                        </span>
                      ) : <span style={{ color: T.textLight }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: T.text, fontSize: 13 }}>{fmt(sales)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={rates[m.id] ?? "5.0"}
                          onChange={e => setRates(prev => ({ ...prev, [m.id]: e.target.value }))}
                          style={inputStyle}
                        />
                        <span style={{ fontSize: 12, color: T.textMid }}>%</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: T.green, fontSize: 13 }}>{fmt(commission)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <button
                        onClick={() => handleSave(m.id)}
                        disabled={saving[m.id]}
                        style={{
                          background: saved[m.id] ? T.green : T.main,
                          color: "#fff", border: "none", borderRadius: 7,
                          padding: "6px 14px", fontSize: 12, fontWeight: 700,
                          cursor: saving[m.id] ? "default" : "pointer",
                          fontFamily: "inherit", opacity: saving[m.id] ? 0.6 : 1,
                          display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
                        }}
                      >
                        {saved[m.id] ? (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                            Sauvegardé
                          </>
                        ) : saving[m.id] ? "Sauvegarde..." : "Sauvegarder"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: `2px solid ${T.border}`, background: T.bg }}>
                <td colSpan={2} style={{ padding: "12px 16px", fontWeight: 900, color: T.text, fontSize: 13 }}>TOTAL</td>
                <td style={{ padding: "12px 16px", fontWeight: 900, color: T.text, fontSize: 13 }}>{fmt(totalSales)}</td>
                <td style={{ padding: "12px 16px", color: T.textMid, fontSize: 13 }}>—</td>
                <td style={{ padding: "12px 16px", fontWeight: 900, color: T.green, fontSize: 14 }}>{fmt(totalCommissions)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: "12px 16px", background: T.blueBg, borderRadius: 10, fontSize: 12, color: T.textMid, lineHeight: 1.6 }}>
        Les taux sont sauvegardés dans <strong>team_commission_configs</strong> et utilisés pour le calcul du bénéfice d'équipe.
      </div>
    </div>
  );
}
