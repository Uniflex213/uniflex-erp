import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { T } from "../../theme";
import { TeamMember } from "./teamTypes";
import { fmtCurrency, fmtPct } from "./teamUtils";

type Period = "month" | "quarter" | "year";

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending: { bg: "rgba(245,158,11,0.12)", color: T.orange },
  paid:    { bg: "rgba(34,197,94,0.12)",  color: T.green  },
  waiting: { bg: "rgba(99,102,241,0.12)",    color: T.main   },
};

const STATUS_LABELS: Record<string, string> = {
  pending: "À payer",
  paid:    "Payé",
  waiting: "En attente",
};

interface Props {
  members: TeamMember[];
}

interface CommissionConfig {
  member_id: string;
  commission_rate: number;
  payment_status?: "pending" | "paid" | "waiting";
}

export default function TeamCommissionsTab({ members }: Props) {
  const [period, setPeriod] = useState<Period>("month");
  const [configs, setConfigs] = useState<CommissionConfig[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch real commission configs from Supabase
  useEffect(() => {
    if (members.length === 0) return;
    const teamId = members[0]?.team_id;
    if (!teamId) return;

    setLoading(true);
    supabase
      .from("team_commission_configs")
      .select("member_id, commission_rate, payment_status")
      .eq("team_id", teamId)
      .then(({ data }) => {
        setConfigs((data as CommissionConfig[]) || []);
        setLoading(false);
      });
  }, [members]);

  const getRate = (memberId: string): number => {
    const cfg = configs.find(c => c.member_id === memberId);
    return cfg?.commission_rate ?? 0.05; // fallback 5%
  };

  const getStatus = (memberId: string): "pending" | "paid" | "waiting" => {
    const cfg = configs.find(c => c.member_id === memberId);
    return cfg?.payment_status ?? "pending";
  };

  const rows = members.map(m => {
    const gross_sales      = m.sales_mtd ?? 0;
    const commission_rate  = getRate(m.id);
    const gross_commission = gross_sales * commission_rate;
    const deductions       = 0; // future: deductions logic
    const net_commission   = gross_commission - deductions;
    const status           = getStatus(m.id);
    return { member: m, gross_sales, commission_rate, gross_commission, deductions, net_commission, status };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      gross_sales:      acc.gross_sales      + r.gross_sales,
      gross_commission: acc.gross_commission + r.gross_commission,
      deductions:       acc.deductions       + r.deductions,
      net_commission:   acc.net_commission   + r.net_commission,
    }),
    { gross_sales: 0, gross_commission: 0, deductions: 0, net_commission: 0 }
  );

  const sorted = [...rows].sort((a, b) => b.net_commission - a.net_commission);
  const maxCommission = sorted[0]?.net_commission ?? 1;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100 }}>
      {/* Period selector */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text }}>Commissions d'équipe</h3>
        <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: `1px solid ${T.border}` }}>
          {(
            [
              ["month",   "Ce mois"],
              ["quarter", "Ce trimestre"],
              ["year",    "Cette année"],
            ] as [Period, string][]
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setPeriod(k)}
              style={{
                padding: "6px 14px", border: "none", cursor: "pointer",
                background: period === k ? T.main : "transparent",
                color: period === k ? "#fff" : T.textLight,
                fontFamily: "inherit", fontSize: 11, fontWeight: 700,
                borderRight: k !== "year" ? `1px solid ${T.border}` : "none",
                transition: "background 0.15s",
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ color: T.textMid, fontSize: 13, textAlign: "center", padding: 32 }}>Chargement des taux...</div>
      ) : (
        <>
          {/* Commission table */}
          <div style={{ background: T.bgCard, borderRadius: 16, border: `1px solid ${T.border}`, overflow: "hidden", marginBottom: 24 }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: T.bg }}>
                    {["Membre", "Ventes brutes", "Taux", "Commission brute", "Déductions", "Commission nette", "Statut"].map(h => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 16px", textAlign: "left",
                          fontSize: 10, fontWeight: 800, color: T.textLight,
                          textTransform: "uppercase", letterSpacing: 0.4, whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const st = STATUS_COLORS[row.status];
                    return (
                      <tr key={row.member.id} style={{ borderTop: `1px solid ${T.border}` }}>
                        {/* Member */}
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ position: "relative", flexShrink: 0 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: "50%",
                                background: row.member.avatar_color, color: "#fff",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 11, fontWeight: 800,
                              }}>
                                {row.member.agent_initials}
                              </div>
                              <div style={{
                                position: "absolute", bottom: 0, right: 0,
                                width: 9, height: 9, borderRadius: "50%",
                                background: row.member.is_online ? T.green : "#9ca3af",
                                border: "1.5px solid #fff",
                              }} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: T.text }}>{row.member.agent_name}</div>
                              {row.member.role === "leader" && (
                                <div style={{ fontSize: 9, color: T.orange }}>👑 Chef</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 700, color: T.text }}>{fmtCurrency(row.gross_sales)}</td>
                        <td style={{ padding: "12px 16px", color: T.main, fontWeight: 700 }}>{fmtPct(row.commission_rate)}</td>
                        <td style={{ padding: "12px 16px" }}>{fmtCurrency(row.gross_commission)}</td>
                        <td style={{ padding: "12px 16px", color: T.red }}>
                          {row.deductions > 0 ? `-${fmtCurrency(row.deductions)}` : "—"}
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 800, color: T.main }}>{fmtCurrency(row.net_commission)}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "3px 8px",
                            borderRadius: 6, background: st.bg, color: st.color,
                          }}>
                            {STATUS_LABELS[row.status]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Totals row */}
                  <tr style={{ borderTop: `2px solid ${T.border}`, background: T.bg }}>
                    <td style={{ padding: "12px 16px", fontWeight: 900, fontSize: 13, color: T.text }}>TOTAL</td>
                    <td style={{ padding: "12px 16px", fontWeight: 900, color: T.text }}>{fmtCurrency(totals.gross_sales)}</td>
                    <td style={{ padding: "12px 16px", color: T.textMid }}>—</td>
                    <td style={{ padding: "12px 16px", fontWeight: 900, color: T.text }}>{fmtCurrency(totals.gross_commission)}</td>
                    <td style={{ padding: "12px 16px", color: T.red, fontWeight: 900 }}>
                      {totals.deductions > 0 ? `-${fmtCurrency(totals.deductions)}` : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 900, color: T.main, fontSize: 14 }}>{fmtCurrency(totals.net_commission)}</td>
                    <td style={{ padding: "12px 16px", color: T.textMid }}>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Ranking bar chart */}
          <div style={{ background: T.bgCard, borderRadius: 16, border: `1px solid ${T.border}`, padding: "20px 24px" }}>
            <h4 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 800, color: T.text }}>
              Classement des commissions
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sorted.map((row, idx) => (
                <div key={row.member.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: "50%", fontSize: 10, fontWeight: 800,
                    background: idx === 0 ? T.orange : idx === 1 ? "#9ca3af" : T.bgCard2,
                    color: idx < 2 ? "#fff" : T.textMid,
                    display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {idx + 1}
                  </span>
                  <div style={{ width: 110, fontSize: 11, fontWeight: 700, color: T.text }}>
                    {row.member.agent_name.split(" ")[0]}
                  </div>
                  <div style={{ flex: 1, height: 22, borderRadius: 4, background: "rgba(0,0,0,0.04)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 4,
                      width: `${maxCommission > 0 ? (row.net_commission / maxCommission) * 100 : 0}%`,
                      background: `linear-gradient(90deg, ${T.main}, #4f46e5)`,
                      display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8,
                      transition: "width 0.6s ease",
                    }}>
                      {row.net_commission > 0 && (
                        <span style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>
                          {fmtCurrency(row.net_commission)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.main, width: 70, textAlign: "right" }}>
                    {fmtPct(row.commission_rate)}
                  </div>
                </div>
              ))}
              {rows.length === 0 && (
                <div style={{ color: T.textMid, fontSize: 13, textAlign: "center", padding: 24 }}>
                  Aucun membre dans l'équipe.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
