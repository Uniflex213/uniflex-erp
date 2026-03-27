import React, { useState } from "react";
import { T } from "../../theme";
import { Team, TeamMember, TeamActivityItem } from "./teamTypes";
import { fmtCurrency, fmtPct, timeAgo } from "./teamUtils";
import { useLanguage } from "../../i18n/LanguageContext";

function Avatar({ member, size = 36 }: { member: TeamMember; size?: number }) {
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: member.avatar_color, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.35, fontWeight: 800,
      }}>
        {member.agent_initials}
      </div>
      <div style={{
        position: "absolute", bottom: 1, right: 1,
        width: size * 0.28, height: size * 0.28, borderRadius: "50%",
        background: member.is_online ? T.green : "#9ca3af",
        border: "1.5px solid #fff",
      }} />
    </div>
  );
}

function KpiCard({ label, value, sub, trend, color }: {
  label: string; value: string; sub?: string; trend?: string; color?: string;
}) {
  return (
    <div style={{
      background: T.bgCard, borderRadius: 14, padding: "16px 18px",
      border: `1px solid ${T.border}`, flex: 1, minWidth: 140,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: color ?? T.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.textLight, marginTop: 4 }}>{sub}</div>}
      {trend && (
        <div style={{ fontSize: 10, color: trend.startsWith("+") ? T.green : T.red, fontWeight: 700, marginTop: 4 }}>
          {trend}
        </div>
      )}
    </div>
  );
}

type Period = "month" | "week" | "today";

interface Props {
  team: Team;
  members: TeamMember[];
  activity: TeamActivityItem[];
}

export default function TeamOverviewTab({ team, members, activity }: Props) {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<Period>("month");

  const totalSales = members.reduce((s, m) => s + (m.sales_mtd ?? 0), 0);
  const totalLeads = members.reduce((s, m) => s + (m.leads_active ?? 0), 0);
  const totalDeals = members.reduce((s, m) => s + (m.deals_closed ?? 0), 0);
  const avgConversion = members.length ? members.reduce((s, m) => s + (m.conversion_rate ?? 0), 0) / members.length : 0;
  const totalCommission = members.reduce((s, m) => s + (m.commission_mtd ?? 0), 0);
  const targetPct = team.monthly_target > 0 ? Math.min(1, totalSales / team.monthly_target) : 0;

  const sorted = [...members].sort((a, b) => (b.sales_mtd ?? 0) - (a.sales_mtd ?? 0));

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 24, maxWidth: 1100 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <KpiCard label={t("team_overview.total_sales_mtd", "Ventes totales (MTD)")} value={fmtCurrency(totalSales)} trend="+14%" color={T.main} />
        <KpiCard label={t("team_overview.active_leads", "Leads actifs")} value={String(totalLeads)} sub={t("team_overview.in_pipeline", "dans le pipeline")} />
        <KpiCard label={t("team_overview.deals_closed_month", "Deals fermés (ce mois)")} value={`${totalDeals} deals`} sub={fmtCurrency(totalSales * 0.6)} />
        <KpiCard label={t("team_overview.conversion_rate", "Taux de conversion")} value={fmtPct(avgConversion)} trend="+2.3%" />
        <KpiCard label={t("team_overview.total_commission", "Commission totale")} value={fmtCurrency(totalCommission)} color={T.gold} />
      </div>

      {team.monthly_target > 0 && (
        <div style={{ background: T.bgCard, borderRadius: 14, padding: "16px 20px", border: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{t("team_overview.monthly_target", "Objectif mensuel")}</div>
              <div style={{ fontSize: 11, color: T.textLight }}>{fmtCurrency(totalSales)} / {fmtCurrency(team.monthly_target)}</div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: targetPct >= 1 ? T.green : T.main }}>
              {Math.round(targetPct * 100)}%
            </div>
          </div>
          <div style={{ height: 10, borderRadius: 99, background: "rgba(0,0,0,0.04)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 99, width: `${Math.round(targetPct * 100)}%`,
              background: targetPct >= 1 ? T.green : `linear-gradient(90deg, ${T.main}, #4f46e5)`,
              transition: "width 0.6s ease",
            }} />
          </div>
        </div>
      )}

      <div style={{ background: T.bgCard, borderRadius: 16, border: `1px solid ${T.border}`, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: T.text }}>{t("team_overview.leaderboard", "Leaderboard")}</h3>
          <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: `1px solid ${T.border}` }}>
            {([["month", t("team_overview.this_month", "Ce mois")], ["week", t("team_overview.this_week", "Cette semaine")], ["today", t("team_overview.today", "Aujourd'hui")]] as [Period, string][]).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setPeriod(k)}
                style={{
                  padding: "5px 12px", border: "none", cursor: "pointer",
                  background: period === k ? T.main : "#fff",
                  color: period === k ? "#fff" : T.textLight,
                  fontFamily: "inherit", fontSize: 11, fontWeight: 700,
                  borderRight: k !== "today" ? `1px solid ${T.border}` : "none",
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div>
          {sorted.map((member, idx) => (
            <div
              key={member.id}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 20px", borderBottom: idx < sorted.length - 1 ? `1px solid ${T.border}` : "none",
                background: idx === 0 ? "#fefce8" : "transparent",
              }}
            >
              <div style={{ width: 28, textAlign: "center", fontSize: idx < 3 ? 18 : 13, fontWeight: 900, color: idx < 3 ? undefined : T.textLight }}>
                {idx < 3 ? medals[idx] : `#${idx + 1}`}
              </div>
              <Avatar member={member} size={40} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{member.agent_name}</span>
                  {member.role === "leader" && <span style={{ fontSize: 10 }}>👑</span>}
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 99,
                    background: member.is_online ? "#dcfce7" : "#f3f4f6",
                    color: member.is_online ? T.green : T.textLight,
                  }}>
                    {member.is_online ? t("team_overview.online", "En ligne") : t("team_overview.offline", "Hors ligne")}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: T.textLight }}>{member.region}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: T.main }}>{fmtCurrency(member.sales_mtd ?? 0)}</div>
                <div style={{ fontSize: 10, color: T.textLight }}>{member.deals_closed} deals · {fmtCurrency(member.commission_mtd ?? 0)} comm.</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: T.bgCard, borderRadius: 16, border: `1px solid ${T.border}`, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}` }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: T.text }}>{t("team_overview.recent_activity", "Activité récente")}</h3>
        </div>
        <div>
          {activity.map((item, idx) => (
            <div
              key={item.id}
              style={{
                display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 20px",
                borderBottom: idx < activity.length - 1 ? `1px solid ${T.border}` : "none",
                background: item.type === "deal_closed" ? "#f0fdf4" : "transparent",
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: item.avatar_color, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 800, flexShrink: 0,
              }}>
                {item.member_initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: T.text, lineHeight: 1.5 }}>
                  {item.type === "deal_closed" && <span style={{ marginRight: 4 }}>🎉</span>}
                  {item.description}
                </div>
                <div style={{ fontSize: 10, color: T.textLight, marginTop: 2 }}>{timeAgo(item.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
