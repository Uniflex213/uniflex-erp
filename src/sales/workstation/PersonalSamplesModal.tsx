import React, { useState, useMemo } from "react";
import { SampleRequest } from "../sampleTypes";
import { T, fmt } from "./workstationTypes";
import { useCurrentAgent } from "../../hooks/useCurrentAgent";

const fmtDate = (iso?: string) => iso
  ? new Date(iso).toLocaleDateString("fr-CA", { month: "short", day: "numeric" })
  : "—";

function hoursSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
}

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
  mySamples: SampleRequest[];
  allSamples: SampleRequest[];
  onClose: () => void;
  onFollowUp?: (sample: SampleRequest) => void;
}

export default function PersonalSamplesModal({ mySamples, allSamples, onClose, onFollowUp }: Props) {
  const agent = useCurrentAgent();
  const [period, setPeriod] = useState<Period>("month");
  const now = new Date();

  const myFiltered = useMemo(() => filterByPeriod(mySamples, period), [mySamples, period]);
  const allFiltered = useMemo(() => filterByPeriod(allSamples, period), [allSamples, period]);

  const myApproved = myFiltered.filter(s => !["En attente d'approbation", "Rejeté"].includes(s.status));
  const myDelivered = myFiltered.filter(s => ["Livré", "Follow-up requis", "Follow-up complété"].includes(s.status));
  const myFUCompleted = myFiltered.filter(s => s.status === "Follow-up complété");
  const myPositifs = myFiltered.filter(s => s.follow_up_result === "Positif");
  const myNeutres = myFiltered.filter(s => s.follow_up_result === "Neutre");
  const myNegatifs = myFiltered.filter(s => s.follow_up_result === "Négatif");
  const myTotalFU = myPositifs.length + myNeutres.length + myNegatifs.length;

  const myConvRate = myDelivered.length > 0 ? Math.round((myPositifs.length / myDelivered.length) * 100) : 0;

  const myFUTimeArr = myFUCompleted.filter(s => s.delivered_at && s.follow_up_completed_at);
  const myAvgFUTime = myFUTimeArr.length > 0
    ? Math.round(myFUTimeArr.reduce((sum, s) =>
        sum + (new Date(s.follow_up_completed_at!).getTime() - new Date(s.delivered_at!).getTime()) / 3600000, 0)
      / myFUTimeArr.length)
    : 0;

  const teamFUTimeArr = allFiltered.filter(s => s.delivered_at && s.follow_up_completed_at && s.status === "Follow-up complété");
  const teamAvgFUTime = teamFUTimeArr.length > 0
    ? Math.round(teamFUTimeArr.reduce((sum, s) =>
        sum + (new Date(s.follow_up_completed_at!).getTime() - new Date(s.delivered_at!).getTime()) / 3600000, 0)
      / teamFUTimeArr.length)
    : 0;

  const teamDelivered = allFiltered.filter(s => ["Livré", "Follow-up requis", "Follow-up complété"].includes(s.status));
  const teamPositifs = allFiltered.filter(s => s.follow_up_result === "Positif");
  const teamConvRate = teamDelivered.length > 0 ? Math.round((teamPositifs.length / teamDelivered.length) * 100) : 0;

  const activeSamples = mySamples.filter(s => !["Follow-up complété", "Rejeté"].includes(s.status))
    .sort((a, b) => {
      const aExpired = a.timer_expires_at && new Date(a.timer_expires_at) < now;
      const bExpired = b.timer_expires_at && new Date(b.timer_expires_at) < now;
      if (aExpired && !bExpired) return -1;
      if (bExpired && !aExpired) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const productStats: Record<string, { demanded: number; positifs: number; negatifs: number }> = {};
  myFiltered.forEach(s => {
    s.items?.forEach(item => {
      if (!productStats[item.product_name]) productStats[item.product_name] = { demanded: 0, positifs: 0, negatifs: 0 };
      productStats[item.product_name].demanded++;
      if (s.follow_up_result === "Positif") productStats[item.product_name].positifs++;
      if (s.follow_up_result === "Négatif") productStats[item.product_name].negatifs++;
    });
  });
  const topProducts = Object.entries(productStats).sort((a, b) => b[1].demanded - a[1].demanded).slice(0, 6);

  const recentFU = myFUCompleted.sort((a, b) => new Date(b.follow_up_completed_at!).getTime() - new Date(a.follow_up_completed_at!).getTime()).slice(0, 10);

  const periodLabels: Record<Period, string> = { month: "Ce mois", quarter: "Ce trimestre", year: "Cette année" };

  const Cmp = ({ my, team, label, higherIsBetter = true }: { my: number; team: number; label: string; higherIsBetter?: boolean }) => {
    const better = higherIsBetter ? my >= team : my <= team;
    if (team === 0 || my === 0) return null;
    return (
      <div style={{ fontSize: 11, marginTop: 3 }}>
        <span style={{ color: better ? "#15803d" : "#ef4444", fontWeight: 700 }}>
          {better ? "✓" : "↓"} Vous : {label === "h" ? `${my}h` : `${my}%`}
        </span>
        <span style={{ color: T.textLight }}> — Équipe : {label === "h" ? `${team}h` : `${team}%`}</span>
      </div>
    );
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(230,228,224,0.35)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto", padding: "16px" }}>
      <div style={{ background: T.bgCard, borderRadius: 16, width: "100%", maxWidth: 820, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid rgba(0,0,0,0.07)`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(135deg, #fffbea 0%, #fff 100%)", borderRadius: "16px 16px 0 0" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: T.text }}>📦 Mes Analytics Samples</h2>
            <div style={{ fontSize: 11, color: T.textLight, marginTop: 2 }}>{agent.name}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {(["month", "quarter", "year"] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${period === p ? "#d4a017" : "rgba(0,0,0,0.1)"}`, background: period === p ? "#d4a017" : "#fff", color: period === p ? "#000" : T.textMid, cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: period === p ? 700 : 400 }}>
                {periodLabels[p]}
              </button>
            ))}
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#8e8e93", marginLeft: 6 }}>✕</button>
          </div>
        </div>

        <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 20, maxHeight: "calc(90vh - 80px)", overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {[
              { label: "Samples demandés", value: myFiltered.length, color: "#6366f1" },
              { label: "Approuvés", value: myApproved.length, color: "#0891b2" },
              { label: "Livrés", value: myDelivered.length, color: "#22c55e" },
              { label: "Follow-ups complétés", value: myFUCompleted.length, color: "#d4a017" },
              { label: "Taux de conversion", value: `${myConvRate}%`, color: myConvRate >= teamConvRate ? "#15803d" : "#ef4444", sub: <Cmp my={myConvRate} team={teamConvRate} label="%" /> },
              { label: "Temps moy. follow-up", value: myAvgFUTime > 0 ? `${myAvgFUTime}h` : "—", color: (myAvgFUTime > 0 && teamAvgFUTime > 0 && myAvgFUTime <= teamAvgFUTime) ? "#15803d" : "#636366", sub: <Cmp my={myAvgFUTime} team={teamAvgFUTime} label="h" higherIsBetter={false} /> },
            ].map((kpi, i) => (
              <div key={i} style={{ background: "#f6f7fb", borderRadius: 10, padding: "12px 14px", border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{kpi.label}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: kpi.color }}>{kpi.value}</div>
                {kpi.sub && kpi.sub}
              </div>
            ))}
          </div>

          {myTotalFU > 0 && (
            <div>
              <SectionTitle>Mes résultats</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { label: "Positifs", count: myPositifs.length, color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: "✅" },
                  { label: "Neutres", count: myNeutres.length, color: "#92400e", bg: "#fffbeb", border: "#fde68a", icon: "➖" },
                  { label: "Négatifs", count: myNegatifs.length, color: "#991b1b", bg: "#fef2f2", border: "#fecaca", icon: "❌" },
                ].map(({ label, count, color, bg, border, icon }) => (
                  <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 22 }}>{icon}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color, marginTop: 4 }}>{count}</div>
                    <div style={{ fontSize: 11, color, fontWeight: 600, marginTop: 2 }}>
                      {label} — {myTotalFU > 0 ? Math.round((count / myTotalFU) * 100) : 0}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <SectionTitle>Mes samples actifs</SectionTitle>
            {activeSamples.length === 0 ? (
              <div style={{ background: "#f6f7fb", borderRadius: 10, padding: "16px 20px", color: T.textLight, fontSize: 13, textAlign: "center" }}>
                Aucun sample actif
              </div>
            ) : (
              <div style={{ background: T.bgCard, borderRadius: 10, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f6f7fb", borderBottom: "2px solid rgba(0,0,0,0.07)" }}>
                      {["Lead", "Produit", "Statut", "ETA", "Timer 72h", "Action"].map(h => (
                        <th key={h} style={{ textAlign: h === "Action" ? "center" : "left", padding: "8px 12px", fontWeight: 700, color: T.textLight, fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeSamples.map((s, i) => {
                      const isExpired = s.timer_expires_at && new Date(s.timer_expires_at) < now;
                      const needsFU = s.status === "Follow-up requis" || (s.status === "Livré" && isExpired);
                      const timeLeft = s.timer_expires_at && !isExpired
                        ? `${Math.floor((new Date(s.timer_expires_at).getTime() - Date.now()) / 3600000)}h`
                        : null;
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", background: needsFU ? "rgba(239,68,68,0.04)" : "transparent" }}>
                          <td style={{ padding: "9px 12px", fontWeight: 600, color: "#6366f1" }}>{(s as any).lead_company_name || "—"}</td>
                          <td style={{ padding: "9px 12px", color: T.textMid, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {s.items?.map(i => i.product_name).join(", ") || "—"}
                          </td>
                          <td style={{ padding: "9px 12px" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 7px", background: "#f3f4f6", color: T.textMid }}>{s.status}</span>
                          </td>
                          <td style={{ padding: "9px 12px", color: T.textMid }}>{s.eta_delivery ? fmtDate(s.eta_delivery) : "—"}</td>
                          <td style={{ padding: "9px 12px" }}>
                            {isExpired ? (
                              <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 11, animation: "pulse 1.5s infinite" }}>EXPIRÉ</span>
                            ) : timeLeft ? (
                              <span style={{ color: T.textMid, fontSize: 11 }}>{timeLeft}</span>
                            ) : "—"}
                          </td>
                          <td style={{ padding: "9px 12px", textAlign: "center" }}>
                            {needsFU && onFollowUp && (
                              <button
                                onClick={() => onFollowUp(s)}
                                style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "#d4a017", color: "#000", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit", animation: "pulse 1.5s infinite" }}
                              >
                                Follow-up
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {topProducts.length > 0 && (
            <div>
              <SectionTitle>Mes samples par produit</SectionTitle>
              <div style={{ background: T.bgCard, borderRadius: 10, border: `1px solid ${T.border}`, padding: 16 }}>
                {topProducts.map(([name, stats], i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{name}</span>
                      <div style={{ display: "flex", gap: 8, fontSize: 11, fontWeight: 700 }}>
                        <span style={{ color: "#6366f1" }}>{stats.demanded}</span>
                        {stats.positifs > 0 && <span style={{ color: "#15803d" }}>✅{stats.positifs}</span>}
                        {stats.negatifs > 0 && <span style={{ color: "#991b1b" }}>❌{stats.negatifs}</span>}
                      </div>
                    </div>
                    <div style={{ height: 5, background: "#f3f4f6", borderRadius: 3 }}>
                      <div style={{ height: "100%", width: `${(stats.demanded / (topProducts[0]?.[1]?.demanded || 1)) * 100}%`, background: "#d4a017", borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentFU.length > 0 && (
            <div>
              <SectionTitle>Mon historique de follow-ups</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {recentFU.map((s, i) => {
                  const cfgMap: Record<string, { color: string; bg: string; border: string; icon: string }> = {
                    "Positif": { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: "✅" },
                    "Neutre": { color: "#92400e", bg: "#fffbeb", border: "#fde68a", icon: "➖" },
                    "Négatif": { color: "#991b1b", bg: "#fef2f2", border: "#fecaca", icon: "❌" },
                  };
                  const cfg = s.follow_up_result ? cfgMap[s.follow_up_result] : { color: T.textMid, bg: "#f6f7fb", border: "rgba(0,0,0,0.07)", icon: "—" };
                  return (
                    <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 14px", background: cfg.bg, borderRadius: 10, border: `1px solid ${cfg.border}` }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{cfg.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{(s as any).lead_company_name || "—"}</span>
                          <span style={{ fontSize: 10, color: T.textLight }}>{fmtDate(s.follow_up_completed_at)}</span>
                        </div>
                        <div style={{ fontSize: 11, color: T.textMid, marginTop: 2 }}>
                          {s.items?.map(i => i.product_name).join(", ")}
                          {s.follow_up_next_step || s.follow_up_reason ? ` — ${s.follow_up_next_step || s.follow_up_reason}` : ""}
                        </div>
                        {s.follow_up_notes && (
                          <div style={{ fontSize: 11, color: T.textMid, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                            {s.follow_up_notes.slice(0, 80)}{s.follow_up_notes.length > 80 ? "..." : ""}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 3, height: 14, background: "#d4a017", borderRadius: 2 }} />
      {children}
    </div>
  );
}
