import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { SampleRequest } from "./sampleTypes";
import { CRMLead } from "./crmTypes";
import { T } from "../theme";

const fmtDate = (iso?: string) => iso
  ? new Date(iso).toLocaleDateString("fr-CA", { month: "short", day: "numeric" })
  : "—";

const fmtC = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 0 }).format(n);

type Period = "month" | "quarter" | "year";

function filterByPeriod(samples: SampleRequest[], period: Period): SampleRequest[] {
  const now = new Date();
  const start = period === "month"
    ? new Date(now.getFullYear(), now.getMonth(), 1)
    : period === "quarter"
    ? new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    : new Date(now.getFullYear(), 0, 1);
  return samples.filter(s => new Date(s.created_at) >= start);
}

interface Props {
  samples: SampleRequest[];
  leads: CRMLead[];
  onClose: () => void;
  onLeadClick?: (leadId: string) => void;
}

export default function SamplesTeamAnalyticsModal({ samples, leads, onClose, onLeadClick }: Props) {
  const [period, setPeriod] = useState<Period>("month");
  const [sortBy, setSortBy] = useState<string>("samples");
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  const filtered = useMemo(() => filterByPeriod(samples, period), [samples, period]);

  const approved = filtered.filter(s => !["En attente d'approbation", "Rejeté"].includes(s.status));
  const sent = filtered.filter(s => ["Envoyé", "Livré", "Follow-up requis", "Follow-up complété"].includes(s.status));
  const delivered = filtered.filter(s => ["Livré", "Follow-up requis", "Follow-up complété"].includes(s.status));
  const fuCompleted = filtered.filter(s => s.status === "Follow-up complété");
  const rejected = filtered.filter(s => s.status === "Rejeté");

  const positifs = filtered.filter(s => s.follow_up_result === "Positif");
  const neutres = filtered.filter(s => s.follow_up_result === "Neutre");
  const negatifs = filtered.filter(s => s.follow_up_result === "Négatif");
  const totalFU = positifs.length + neutres.length + negatifs.length;

  const approvalRate = filtered.length > 0 ? Math.round((approved.length / filtered.length) * 100) : 0;
  const convRate = delivered.length > 0 ? Math.round((positifs.length / delivered.length) * 100) : 0;
  const totalCost = filtered.reduce((s, r) => s + (r.estimated_cost || 0), 0);

  const avgFUTime = fuCompleted.filter(s => s.delivered_at && s.follow_up_completed_at).length > 0
    ? Math.round(fuCompleted.filter(s => s.delivered_at && s.follow_up_completed_at).reduce((sum, s) => {
        return sum + (new Date(s.follow_up_completed_at!).getTime() - new Date(s.delivered_at!).getTime()) / 3600000;
      }, 0) / fuCompleted.filter(s => s.delivered_at && s.follow_up_completed_at).length)
    : 0;

  const agentIds = [...new Set(filtered.map(s => s.agent_id))];
  const agentStats = agentIds.map(id => {
    const agentSamples = filtered.filter(s => s.agent_id === id);
    const agentFU = agentSamples.filter(s => s.status === "Follow-up complété");
    const agentPos = agentSamples.filter(s => s.follow_up_result === "Positif");
    const agentNeg = agentSamples.filter(s => s.follow_up_result === "Négatif");
    const agentFUTime = agentFU.filter(s => s.delivered_at && s.follow_up_completed_at).length > 0
      ? Math.round(agentFU.filter(s => s.delivered_at && s.follow_up_completed_at).reduce((sum, s) =>
          sum + (new Date(s.follow_up_completed_at!).getTime() - new Date(s.delivered_at!).getTime()) / 3600000, 0)
        / agentFU.filter(s => s.delivered_at && s.follow_up_completed_at).length)
      : 0;
    return {
      name: agentSamples[0]?.agent_name || id,
      samples: agentSamples.length,
      approved: agentSamples.filter(s => !["En attente d'approbation", "Rejeté"].includes(s.status)).length,
      delivered: agentSamples.filter(s => ["Livré", "Follow-up requis", "Follow-up complété"].includes(s.status)).length,
      positifs: agentPos.length,
      negatifs: agentNeg.length,
      convRate: agentSamples.filter(s => ["Livré", "Follow-up requis", "Follow-up complété"].includes(s.status)).length > 0
        ? Math.round((agentPos.length / agentSamples.filter(s => ["Livré", "Follow-up requis", "Follow-up complété"].includes(s.status)).length) * 100)
        : 0,
      avgFUTime: agentFUTime,
    };
  }).sort((a, b) => {
    const key = sortBy as keyof typeof a;
    const av = a[key] as number;
    const bv = b[key] as number;
    return (av - bv) * sortDir;
  });

  const bestConvAgent = [...agentStats].sort((a, b) => b.convRate - a.convRate)[0];

  const productStats: Record<string, { demanded: number; positifs: number; negatifs: number }> = {};
  filtered.forEach(s => {
    s.items?.forEach(item => {
      if (!productStats[item.product_name]) productStats[item.product_name] = { demanded: 0, positifs: 0, negatifs: 0 };
      productStats[item.product_name].demanded++;
      if (s.follow_up_result === "Positif") productStats[item.product_name].positifs++;
      if (s.follow_up_result === "Négatif") productStats[item.product_name].negatifs++;
    });
  });
  const topProducts = Object.entries(productStats).sort((a, b) => b[1].demanded - a[1].demanded).slice(0, 8);

  const negativeReasonCounts: Record<string, number> = {};
  negatifs.forEach(s => { if (s.follow_up_reason) negativeReasonCounts[s.follow_up_reason] = (negativeReasonCounts[s.follow_up_reason] || 0) + 1; });
  const topNegReasons = Object.entries(negativeReasonCounts).sort((a, b) => b[1] - a[1]);

  const recentSamples = [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);

  const funnelSteps = [
    { label: "Demandés", count: filtered.length },
    { label: "Approuvés", count: approved.length },
    { label: "Envoyés", count: sent.length },
    { label: "Livrés", count: delivered.length },
    { label: "Follow-up +", count: positifs.length },
    { label: "Commandés", count: positifs.filter(s => s.follow_up_next_step === "Prêt à commander").length },
  ];

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === 1 ? -1 : 1);
    else { setSortBy(col); setSortDir(-1); }
  };

  const SortHdr = ({ col, label }: { col: string; label: string }) => (
    <th
      onClick={() => toggleSort(col)}
      style={{ textAlign: "center", padding: "8px 12px", fontWeight: 700, color: sortBy === col ? T.main : T.textLight, cursor: "pointer", whiteSpace: "nowrap", fontSize: 11 }}
    >
      {label} {sortBy === col ? (sortDir === -1 ? "↓" : "↑") : ""}
    </th>
  );

  const periodLabels: Record<Period, string> = { month: "Ce mois", quarter: "Ce trimestre", year: "Cette année" };

  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(230,228,224,0.85)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto", padding: "16px" }}>
      <div style={{ background: T.bgCard, borderRadius: 16, width: "100%", maxWidth: 1000, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(135deg, #fffbea 0%, #fff 100%)", borderRadius: "16px 16px 0 0" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text }}>📦 Samples d'équipe — Vue d'ensemble</h2>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {(["month", "quarter", "year"] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${period === p ? T.gold : T.border}`, background: period === p ? T.gold : "#fff", color: period === p ? "#000" : T.textMid, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: period === p ? 700 : 400 }}>
                {periodLabels[p]}
              </button>
            ))}
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#8e8e93", marginLeft: 8 }}>✕</button>
          </div>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 22, maxHeight: "calc(90vh - 80px)", overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
            {[
              { label: "Demandés", value: filtered.length, color: T.main },
              { label: "Approuvés", value: approved.length, color: "#0891b2" },
              { label: "Livrés", value: delivered.length, color: "#22c55e" },
              { label: "Follow-ups", value: fuCompleted.length, color: T.gold },
              { label: "Rejetés", value: rejected.length, color: T.red },
              { label: "Taux approbation", value: `${approvalRate}%`, color: "#0891b2" },
              { label: "Taux conversion", value: `${convRate}%`, color: T.green },
              { label: "Coût total", value: fmtC(totalCost), color: T.gold },
              { label: "Temps moy. FU", value: avgFUTime > 0 ? `${avgFUTime}h` : "—", color: T.textMid },
              { label: "Résultats obtenus", value: totalFU, color: T.main },
            ].map((kpi, i) => (
              <div key={i} style={{ background: T.bg, borderRadius: 10, padding: "10px 14px", border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{kpi.label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {totalFU > 0 && (
            <div>
              <SectionTitle>Répartition des résultats de follow-up</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {[
                  { label: "Positifs", count: positifs.length, color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: "✅" },
                  { label: "Neutres", count: neutres.length, color: "#92400e", bg: "#fffbeb", border: "#fde68a", icon: "➖" },
                  { label: "Négatifs", count: negatifs.length, color: "#991b1b", bg: "#fef2f2", border: "#fecaca", icon: "❌" },
                ].map(({ label, count, color, bg, border, icon }) => (
                  <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "16px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color }}>{count}</div>
                    <div style={{ fontSize: 12, color, fontWeight: 600, marginTop: 2 }}>
                      {label} — {totalFU > 0 ? Math.round((count / totalFU) * 100) : 0}%
                    </div>
                    <div style={{ marginTop: 8, height: 6, background: "rgba(0,0,0,0.08)", borderRadius: 4 }}>
                      <div style={{ height: "100%", width: `${totalFU > 0 ? (count / totalFU) * 100 : 0}%`, background: color, borderRadius: 4, transition: "width 0.4s" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <SectionTitle>Samples par agent</SectionTitle>
            <div style={{ background: T.bgCard, borderRadius: 10, border: `1px solid ${T.border}`, overflow: "hidden" }}>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: T.bg, borderBottom: `2px solid ${T.border}` }}>
                    <th style={{ textAlign: "left", padding: "8px 14px", fontWeight: 700, color: T.textLight, fontSize: 11 }}>Agent</th>
                    <SortHdr col="samples" label="Demandés" />
                    <SortHdr col="approved" label="Approuvés" />
                    <SortHdr col="delivered" label="Livrés" />
                    <SortHdr col="positifs" label="FU Positifs" />
                    <SortHdr col="negatifs" label="FU Négatifs" />
                    <SortHdr col="convRate" label="Taux conv." />
                    <SortHdr col="avgFUTime" label="Timer moy." />
                  </tr>
                </thead>
                <tbody>
                  {agentStats.map((ag, i) => {
                    const isBest = bestConvAgent && ag.name === bestConvAgent.name && ag.convRate > 0;
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, background: isBest ? "rgba(212,160,23,0.06)" : "transparent" }}>
                        <td style={{ padding: "10px 14px", fontWeight: 700, color: T.text }}>
                          {isBest && <span style={{ color: T.gold, marginRight: 4 }}>★</span>}
                          {ag.name}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center", color: T.textMid }}>{ag.samples}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center", color: T.textMid }}>{ag.approved}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center", color: T.textMid }}>{ag.delivered}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center", color: "#15803d", fontWeight: 700 }}>{ag.positifs}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center", color: "#991b1b" }}>{ag.negatifs}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          <span style={{ fontWeight: 700, color: ag.convRate >= 50 ? "#15803d" : ag.convRate >= 25 ? T.gold : T.red }}>{ag.convRate}%</span>
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center", color: T.textMid }}>{ag.avgFUTime > 0 ? `${ag.avgFUTime}h` : "—"}</td>
                      </tr>
                    );
                  })}
                  {agentStats.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: 20, textAlign: "center", color: T.textLight }}>Aucune donnée</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <SectionTitle>Samples par produit</SectionTitle>
              <div style={{ background: T.bgCard, borderRadius: 10, border: `1px solid ${T.border}`, padding: 16 }}>
                {topProducts.length === 0 ? (
                  <div style={{ color: T.textLight, fontSize: 13 }}>Aucune donnée</div>
                ) : topProducts.map(([name, stats], i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{name}</span>
                      <div style={{ display: "flex", gap: 8, fontSize: 11, fontWeight: 700 }}>
                        <span style={{ color: T.main }}>{stats.demanded}</span>
                        {stats.positifs > 0 && <span style={{ color: "#15803d" }}>✅{stats.positifs}</span>}
                        {stats.negatifs > 0 && <span style={{ color: "#991b1b" }}>❌{stats.negatifs}</span>}
                      </div>
                    </div>
                    <div style={{ height: 5, background: "#f3f4f6", borderRadius: 3 }}>
                      <div style={{ height: "100%", width: `${(stats.demanded / (topProducts[0]?.[1]?.demanded || 1)) * 100}%`, background: T.gold, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <SectionTitle>Raisons des résultats négatifs</SectionTitle>
              <div style={{ background: T.bgCard, borderRadius: 10, border: `1px solid ${T.border}`, padding: 16 }}>
                {topNegReasons.length === 0 ? (
                  <div style={{ color: T.textLight, fontSize: 13 }}>Aucun résultat négatif</div>
                ) : topNegReasons.map(([reason, count], i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: T.text }}>{reason}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#991b1b" }}>{count}</span>
                    </div>
                    <div style={{ height: 5, background: "#f3f4f6", borderRadius: 3 }}>
                      <div style={{ height: "100%", width: `${negatifs.length > 0 ? (count / negatifs.length) * 100 : 0}%`, background: "#ef4444", borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <SectionTitle>Funnel des samples</SectionTitle>
            <div style={{ background: T.bgCard, borderRadius: 10, border: `1px solid ${T.border}`, padding: "16px 20px" }}>
              <div style={{ display: "flex", gap: 0, alignItems: "center", overflowX: "auto" }}>
                {funnelSteps.map((step, i) => {
                  const pct = filtered.length > 0 ? Math.round((step.count / filtered.length) * 100) : 0;
                  const isLast = i === funnelSteps.length - 1;
                  return (
                    <React.Fragment key={i}>
                      <div style={{ textAlign: "center", minWidth: 100 }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: T.main }}>{step.count}</div>
                        <div style={{ fontSize: 11, color: T.textMid, marginBottom: 6 }}>{step.label}</div>
                        <div style={{ width: 56, height: 8, background: T.gold, borderRadius: 4, margin: "0 auto", opacity: 0.4 + (pct / 100) * 0.6 }} />
                        <div style={{ fontSize: 10, color: T.textLight, marginTop: 4 }}>{pct}%</div>
                      </div>
                      {!isLast && <div style={{ color: T.textLight, fontSize: 16, padding: "0 6px", flexShrink: 0 }}>→</div>}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <SectionTitle>Samples récents</SectionTitle>
            <div style={{ background: T.bgCard, borderRadius: 10, border: `1px solid ${T.border}`, overflow: "hidden" }}>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: T.bg, borderBottom: `2px solid ${T.border}` }}>
                    <th style={{ textAlign: "left", padding: "8px 14px", fontWeight: 700, color: T.textLight, fontSize: 11 }}>Lead</th>
                    <th style={{ textAlign: "left", padding: "8px 14px", fontWeight: 700, color: T.textLight, fontSize: 11 }}>Agent</th>
                    <th style={{ textAlign: "left", padding: "8px 14px", fontWeight: 700, color: T.textLight, fontSize: 11 }}>Produit</th>
                    <th style={{ textAlign: "center", padding: "8px 14px", fontWeight: 700, color: T.textLight, fontSize: 11 }}>Statut</th>
                    <th style={{ textAlign: "center", padding: "8px 14px", fontWeight: 700, color: T.textLight, fontSize: 11 }}>Résultat FU</th>
                    <th style={{ textAlign: "center", padding: "8px 14px", fontWeight: 700, color: T.textLight, fontSize: 11 }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSamples.map((s, i) => {
                    const lead = leads.find(l => l.id === s.lead_id);
                    return (
                      <tr
                        key={i}
                        style={{ borderBottom: `1px solid ${T.border}`, cursor: lead ? "pointer" : "default" }}
                        onClick={() => lead && onLeadClick && onLeadClick(lead.id)}
                      >
                        <td style={{ padding: "9px 14px", fontWeight: 600, color: T.main }}>{(s as any).lead_company_name || lead?.company_name || "—"}</td>
                        <td style={{ padding: "9px 14px", color: T.textMid }}>{s.agent_name}</td>
                        <td style={{ padding: "9px 14px", color: T.text, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.items?.map(i => i.product_name).join(", ") || "—"}
                        </td>
                        <td style={{ padding: "9px 14px", textAlign: "center" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 7px", background: "#f3f4f6", color: T.textMid }}>{s.status}</span>
                        </td>
                        <td style={{ padding: "9px 14px", textAlign: "center" }}>
                          {s.follow_up_result ? (
                            <span style={{
                              fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 7px",
                              background: s.follow_up_result === "Positif" ? "#dcfce7" : s.follow_up_result === "Neutre" ? "#fff7ed" : "#fef2f2",
                              color: s.follow_up_result === "Positif" ? "#15803d" : s.follow_up_result === "Neutre" ? "#92400e" : "#991b1b",
                            }}>
                              {s.follow_up_result === "Positif" ? "✅" : s.follow_up_result === "Neutre" ? "➖" : "❌"} {s.follow_up_result}
                            </span>
                          ) : "—"}
                        </td>
                        <td style={{ padding: "9px 14px", textAlign: "center", color: T.textLight }}>{fmtDate(s.created_at)}</td>
                      </tr>
                    );
                  })}
                  {recentSamples.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: T.textLight }}>Aucun sample</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 3, height: 16, background: T.gold, borderRadius: 2 }} />
      {children}
    </div>
  );
}
