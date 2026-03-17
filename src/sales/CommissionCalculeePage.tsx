import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { T } from "../theme";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
  }).format(n);

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function monthLabel(offset: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - offset);
  return d.toLocaleDateString("fr-CA", { month: "short", year: "2-digit" });
}

type Order = {
  id: string;
  created_at: string;
  client_name: string | null;
  total_amount: number;
  vendeur_code: string | null;
};

type MemberRow = {
  id: string;
  full_name: string;
  vendeur_code: string | null;
  commission_rate: number;
  sales_mtd: number;
  commission_mtd: number;
};

type MonthBar = { label: string; amount: number };

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: T.bgCard,
        borderRadius: 14,
        border: `1px solid ${T.border}`,
        padding: "18px 22px",
        flex: 1,
        minWidth: 160,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: T.textMid,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{ fontSize: 26, fontWeight: 900, color: color || T.text, lineHeight: 1 }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: T.textMid, marginTop: 6 }}>{sub}</div>
      )}
    </div>
  );
}

// ── Bar chart (div-based) ──────────────────────────────────────────────────────
function BarChart({ bars }: { bars: MonthBar[] }) {
  const max = Math.max(...bars.map((b) => b.amount), 1);
  return (
    <div
      style={{
        background: T.bgCard,
        borderRadius: 14,
        border: `1px solid ${T.border}`,
        padding: "20px 24px",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: T.textMid,
          marginBottom: 16,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        Commissions — 6 derniers mois
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 120 }}>
        {bars.map((b) => (
          <div
            key={b.label}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: T.textMid,
                fontWeight: 700,
                marginBottom: 2,
              }}
            >
              {b.amount > 0 ? fmt(b.amount) : ""}
            </div>
            <div
              style={{
                width: "100%",
                borderRadius: "4px 4px 0 0",
                background:
                  b === bars[bars.length - 1]
                    ? T.main
                    : "rgba(99,102,241,0.35)",
                height: `${Math.max((b.amount / max) * 100, 2)}%`,
                transition: "height 0.4s ease",
              }}
            />
            <div style={{ fontSize: 9, color: T.textLight, marginTop: 2 }}>{b.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Vendeur view ───────────────────────────────────────────────────────────────
function VendeurView() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [commissionRate, setCommissionRate] = useState(0.05);
  const [bars, setBars] = useState<MonthBar[]>([]);
  const [loading, setLoading] = useState(true);

  const vendeurCode = (profile as Record<string, unknown>)?.vendeur_code as string | null
    ?? profile?.seller_code ?? null;

  const load = useCallback(async () => {
    if (!profile || !vendeurCode) { setLoading(false); return; }

    const now = new Date();
    const som = startOfMonth(now);

    // Fetch commission rate
    const { data: cfg } = await supabase
      .from("team_commission_configs")
      .select("commission_rate")
      .eq("user_id", profile.id)
      .maybeSingle();

    const rate =
      cfg?.commission_rate ??
      ((profile as Record<string, unknown>).commission_rate as number | null) ??
      0.05;
    setCommissionRate(rate);

    // Fetch this month's orders
    const { data: monthOrders } = await supabase
      .from("orders")
      .select("id, created_at, client_name, total_amount, vendeur_code")
      .eq("vendeur_code", vendeurCode)
      .gte("created_at", som.toISOString())
      .order("created_at", { ascending: false });

    setOrders(monthOrders ?? []);

    // Fetch last 6 months for chart
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const { data: allOrders } = await supabase
      .from("orders")
      .select("created_at, total_amount")
      .eq("vendeur_code", vendeurCode)
      .gte("created_at", sixMonthsAgo.toISOString());

    const barData: MonthBar[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const y = d.getFullYear();
      const m = d.getMonth();
      const total = (allOrders ?? [])
        .filter((o) => {
          const od = new Date(o.created_at);
          return od.getFullYear() === y && od.getMonth() === m;
        })
        .reduce((sum, o) => sum + (o.total_amount ?? 0), 0);
      barData.push({ label: monthLabel(i), amount: total * rate });
    }
    setBars(barData);
    setLoading(false);
  }, [profile, vendeurCode]);

  useEffect(() => { load(); }, [load]);

  const totalSales = orders.reduce((s, o) => s + (o.total_amount ?? 0), 0);
  const totalComm = totalSales * commissionRate;

  if (loading) {
    return (
      <div style={{ padding: 40, color: T.textMid, fontSize: 14 }}>
        Chargement des commissions…
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{ fontSize: 22, fontWeight: 900, color: T.text, margin: 0 }}
        >
          Mes Commissions
          {vendeurCode && (
            <code
              style={{
                marginLeft: 12,
                fontSize: 14,
                color: T.main,
                background: "rgba(99,102,241,0.08)",
                padding: "3px 10px",
                borderRadius: 6,
                letterSpacing: 1.5,
              }}
            >
              {vendeurCode}
            </code>
          )}
        </h1>
        <div style={{ fontSize: 12, color: T.textMid, marginTop: 4 }}>
          {new Date().toLocaleDateString("fr-CA", {
            month: "long",
            year: "numeric",
          })}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        <KpiCard label="Ventes ce mois" value={fmt(totalSales)} sub={`${orders.length} commande(s)`} />
        <KpiCard label="Taux commission" value={fmtPct(commissionRate)} color={T.blue} />
        <KpiCard label="Commission brute" value={fmt(totalComm)} color={T.main} />
        <KpiCard
          label="Commission nette"
          value={fmt(totalComm)}
          sub="Avant déductions"
          color={T.green}
        />
      </div>

      {/* Bar chart */}
      <div style={{ marginBottom: 24 }}>
        <BarChart bars={bars} />
      </div>

      {/* Orders table */}
      <div
        style={{
          background: T.bgCard,
          borderRadius: 14,
          border: `1px solid ${T.border}`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 20px",
            borderBottom: `1px solid ${T.border}`,
            fontSize: 13,
            fontWeight: 700,
            color: T.text,
          }}
        >
          Commandes du mois
        </div>
        {orders.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: T.textMid, fontSize: 13 }}>
            Aucune commande ce mois.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: T.bg }}>
                {["Date", "Client", "Montant", "Commission générée"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 16px",
                      textAlign: "left",
                      fontSize: 10,
                      fontWeight: 800,
                      color: T.textLight,
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  style={{ borderTop: `1px solid ${T.border}` }}
                >
                  <td style={{ padding: "11px 16px", color: T.textMid }}>
                    {new Date(o.created_at).toLocaleDateString("fr-CA")}
                  </td>
                  <td style={{ padding: "11px 16px", fontWeight: 600, color: T.text }}>
                    {o.client_name || "—"}
                  </td>
                  <td style={{ padding: "11px 16px", fontWeight: 700 }}>
                    {fmt(o.total_amount ?? 0)}
                  </td>
                  <td
                    style={{
                      padding: "11px 16px",
                      fontWeight: 800,
                      color: T.main,
                    }}
                  >
                    {fmt((o.total_amount ?? 0) * commissionRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Admin / Chef view ──────────────────────────────────────────────────────────
function AdminView() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;

    // Fetch team members
    let membersQuery = supabase
      .from("profiles")
      .select("id, full_name, vendeur_code, seller_code, commission_rate, team_id")
      .in("role", ["vendeur", "admin"]);

    if (profile.role !== "god_admin") {
      membersQuery = membersQuery.eq("team_id", profile.team_id ?? "");
    }

    const { data: profilesList } = await membersQuery;

    const now = new Date();
    const som = startOfMonth(now);

    const rows: MemberRow[] = await Promise.all(
      (profilesList ?? []).map(async (p) => {
        const code =
          (p as Record<string, unknown>).vendeur_code as string | null ??
          (p as Record<string, unknown>).seller_code as string | null;

        let sales = 0;
        if (code) {
          const { data: orders } = await supabase
            .from("orders")
            .select("total_amount")
            .eq("vendeur_code", code)
            .gte("created_at", som.toISOString());
          sales = (orders ?? []).reduce(
            (s, o) => s + (o.total_amount ?? 0),
            0
          );
        }

        const rate =
          ((p as Record<string, unknown>).commission_rate as number | null) ?? 0.05;

        return {
          id: p.id,
          full_name: p.full_name,
          vendeur_code: code,
          commission_rate: rate,
          sales_mtd: sales,
          commission_mtd: sales * rate,
        };
      })
    );

    setMembers(rows.sort((a, b) => b.commission_mtd - a.commission_mtd));
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    const header = ["Vendeur", "Code", "Ventes MTD", "Taux", "Commission MTD"];
    const rows = members.map((m) => [
      m.full_name,
      m.vendeur_code ?? "",
      m.sales_mtd.toFixed(2),
      fmtPct(m.commission_rate),
      m.commission_mtd.toFixed(2),
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commissions_${new Date().toISOString().slice(0, 7)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalSales = members.reduce((s, m) => s + m.sales_mtd, 0);
  const totalComm = members.reduce((s, m) => s + m.commission_mtd, 0);

  if (loading) {
    return (
      <div style={{ padding: 40, color: T.textMid, fontSize: 14 }}>
        Chargement des commissions d'équipe…
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: T.text, margin: 0 }}>
            Commissions — Équipe
          </h1>
          <div style={{ fontSize: 12, color: T.textMid, marginTop: 4 }}>
            {new Date().toLocaleDateString("fr-CA", {
              month: "long",
              year: "numeric",
            })}
          </div>
        </div>
        <button
          onClick={exportCsv}
          style={{
            padding: "9px 18px",
            borderRadius: 8,
            border: `1px solid ${T.main}`,
            background: "rgba(99,102,241,0.08)",
            color: T.main,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Exporter CSV
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        <KpiCard
          label="Membres actifs"
          value={String(members.length)}
          sub="vendeurs / admins"
        />
        <KpiCard
          label="Ventes totales MTD"
          value={fmt(totalSales)}
          color={T.text}
        />
        <KpiCard
          label="Commissions totales MTD"
          value={fmt(totalComm)}
          color={T.main}
        />
      </div>

      {/* Table */}
      <div
        style={{
          background: T.bgCard,
          borderRadius: 14,
          border: `1px solid ${T.border}`,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: T.bg }}>
              {["Vendeur", "Code", "Ventes MTD", "Taux", "Commission MTD"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 16px",
                      textAlign: "left",
                      fontSize: 10,
                      fontWeight: 800,
                      color: T.textLight,
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                    }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: 32,
                    textAlign: "center",
                    color: T.textMid,
                    fontSize: 13,
                  }}
                >
                  Aucun membre trouvé.
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.id} style={{ borderTop: `1px solid ${T.border}` }}>
                  <td style={{ padding: "11px 16px", fontWeight: 700, color: T.text }}>
                    {m.full_name}
                  </td>
                  <td style={{ padding: "11px 16px" }}>
                    {m.vendeur_code ? (
                      <code
                        style={{
                          fontSize: 12,
                          color: T.main,
                          background: "rgba(99,102,241,0.08)",
                          padding: "2px 8px",
                          borderRadius: 5,
                          letterSpacing: 1,
                        }}
                      >
                        {m.vendeur_code}
                      </code>
                    ) : (
                      <span style={{ color: T.textLight, fontSize: 11 }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "11px 16px", fontWeight: 600 }}>
                    {fmt(m.sales_mtd)}
                  </td>
                  <td style={{ padding: "11px 16px", color: T.textMid }}>
                    {fmtPct(m.commission_rate)}
                  </td>
                  <td
                    style={{
                      padding: "11px 16px",
                      fontWeight: 900,
                      color: T.main,
                      fontSize: 14,
                    }}
                  >
                    {fmt(m.commission_mtd)}
                  </td>
                </tr>
              ))
            )}
            {members.length > 0 && (
              <tr
                style={{
                  borderTop: `2px solid ${T.border}`,
                  background: T.bg,
                }}
              >
                <td
                  colSpan={2}
                  style={{
                    padding: "12px 16px",
                    fontWeight: 900,
                    fontSize: 13,
                    color: T.text,
                  }}
                >
                  TOTAL
                </td>
                <td
                  style={{
                    padding: "12px 16px",
                    fontWeight: 900,
                    color: T.text,
                  }}
                >
                  {fmt(totalSales)}
                </td>
                <td style={{ padding: "12px 16px" }}>—</td>
                <td
                  style={{
                    padding: "12px 16px",
                    fontWeight: 900,
                    color: T.main,
                    fontSize: 15,
                  }}
                >
                  {fmt(totalComm)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function CommissionCalculeePage() {
  const { profile, permissions } = useAuth();

  if (!profile) {
    return (
      <div style={{ padding: 40, color: T.textMid, fontSize: 14 }}>
        Chargement…
      </div>
    );
  }

  const isAdmin =
    profile.role === "god_admin" ||
    profile.role === "admin" ||
    permissions.includes("performance.team_leader.manage");

  return isAdmin ? <AdminView /> : <VendeurView />;
}
