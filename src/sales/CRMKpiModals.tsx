import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { CRMLead, CRMReminder, STAGES, STAGE_COLORS, TEMP_COLORS } from "./crmTypes";
import { useTeamAgents } from "../hooks/useAgents";
import { useLanguage } from "../i18n/LanguageContext";
import { T } from "../theme";

const fmt = (n: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
const fmtShort = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M$` : n >= 1000 ? `${(n / 1000).toFixed(0)}k$` : `${n}$`;
const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

function ModalBase({ title, subtitle, onClose, children, color = T.main }: {
  title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; color?: string;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(230,228,224,0.35)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", zIndex: 10000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        animation: "kpiFadeIn 0.2s ease",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        @keyframes kpiFadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes kpiSlideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .kpi-modal-scroll::-webkit-scrollbar { width:6px; }
        .kpi-modal-scroll::-webkit-scrollbar-track { background:transparent; }
        .kpi-modal-scroll::-webkit-scrollbar-thumb { background:rgba(0,0,0,0.15); border-radius:3px; }
        .kpi-row-hover:hover { background: rgba(0,0,0,0.03) !important; cursor:pointer; }
        .kpi-lead-row:hover { background: rgba(0,0,0,0.04) !important; cursor:pointer; }
      `}</style>
      <div style={{
        background: "linear-gradient(145deg, rgba(240,238,234,0.75) 0%, rgba(225,223,218,0.7) 100%)",
        backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)",
        borderRadius: 20, width: "90%", maxWidth: 1000, maxHeight: "88vh",
        display: "flex", flexDirection: "column",
        boxShadow: "0 24px 80px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.6)",
        border: "1px solid rgba(255,255,255,0.4)",
        animation: "kpiSlideUp 0.25s ease",
        overflow: "hidden",
      }}>
        <div style={{
          padding: "20px 28px 18px", borderBottom: `1px solid ${T.border}`,
          background: `${color}08`, flexShrink: 0,
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.text }}>{title}</h2>
            {subtitle && <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textMid }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{
            background: "rgba(0,0,0,0.06)", border: "none", borderRadius: 8, width: 34, height: 34,
            fontSize: 18, cursor: "pointer", color: T.textMid, display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>×</button>
        </div>
        <div className="kpi-modal-scroll" style={{ flex: 1, overflowY: "auto", padding: "24px 28px 28px" }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

function Section({ title, children, mt = 24 }: { title: string; children: React.ReactNode; mt?: number }) {
  return (
    <div style={{ marginTop: mt }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>{title}</h3>
      {children}
    </div>
  );
}

function HBar({ value, max, color, height = 8 }: { value: number; max: number; color: string; height?: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ background: "rgba(0,0,0,0.07)", borderRadius: height, height, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: height, transition: "width 0.5s ease" }} />
    </div>
  );
}

function TableHeader({ cols }: { cols: string[] }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: `repeat(${cols.length}, 1fr)`,
      borderBottom: `2px solid ${T.border}`, paddingBottom: 8, marginBottom: 2,
    }}>
      {cols.map((c, i) => (
        <div key={i} style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, padding: "0 6px" }}>{c}</div>
      ))}
    </div>
  );
}

function Chip({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ background: bg, color, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{label}</span>
  );
}

export type KpiModalType =
  | "leads_actifs"
  | "valeur_pipeline"
  | "pipeline_pondere"
  | "leads_hot"
  | "taux_conversion"
  | "temps_closing"
  | "deals_fermes"
  | "reminders_retard";

export function LeadsActifsModal({ leads, onClose, onSelectLead }: {
  leads: CRMLead[]; onClose: () => void; onSelectLead: (l: CRMLead) => void;
}) {
  const { t } = useLanguage();
  const agents = useTeamAgents();
  const activeLeads = leads.filter(l => l.stage !== "Fermé Gagné" && l.stage !== "Fermé Perdu" && !l.archived);
  const totalValue = activeLeads.reduce((s, l) => s + (l.estimated_value || 0), 0);
  const activeStages = STAGES.filter(s => s !== "Fermé Gagné" && s !== "Fermé Perdu");

  const byStage = activeStages.map(stage => {
    const sl = activeLeads.filter(l => l.stage === stage);
    const val = sl.reduce((s, l) => s + (l.estimated_value || 0), 0);
    return { stage, count: sl.length, value: val, pct: totalValue > 0 ? (val / totalValue) * 100 : 0 };
  });

  const byAgent = agents.map(a => {
    const al = activeLeads.filter(l => l.assigned_agent_id === a.id);
    const val = al.reduce((s, l) => s + (l.estimated_value || 0), 0);
    return { agent: a, count: al.length, value: val };
  }).filter(x => x.count > 0).sort((a, b) => b.count - a.count);

  const maxAgentCount = Math.max(...byAgent.map(a => a.count), 1);

  const hotLeads = activeLeads.filter(l => l.temperature === "Hot");
  const warmLeads = activeLeads.filter(l => l.temperature === "Warm");
  const coldLeads = activeLeads.filter(l => l.temperature === "Cold");

  const oldest = [...activeLeads]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(0, 5);

  return (
    <ModalBase title={t("crm.leads_active_detail", "Leads actifs — Détail")} subtitle={`${activeLeads.length} ${t("crm.leads_active_in_pipeline", "leads actifs dans le pipeline")}`} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 4 }}>
        {[
          { label: t("crm.total_active", "Total actifs"), value: activeLeads.length, color: T.main },
          { label: t("crm.total_value", "Valeur totale"), value: fmt(totalValue), color: T.main },
          { label: t("crm.avg_value", "Valeur moyenne"), value: fmt(activeLeads.length > 0 ? totalValue / activeLeads.length : 0), color: T.textMid },
        ].map((k, i) => (
          <div key={i} style={{ background: T.bg, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <Section title={t("crm.repartition_by_stage", "Répartition par étape")} mt={20}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {byStage.map(({ stage, count, value, pct }) => (
            <div key={stage} style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: STAGE_COLORS[stage] }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{stage}</span>
                  <Chip label={`${count} leads`} color={STAGE_COLORS[stage]} bg={`${STAGE_COLORS[stage]}18`} />
                </div>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: T.textMid }}>{fmt(value)}</span>
                  <span style={{ fontSize: 11, color: T.textLight }}>{pct.toFixed(1)}%</span>
                </div>
              </div>
              <HBar value={count} max={Math.max(...byStage.map(s => s.count), 1)} color={STAGE_COLORS[stage]} />
            </div>
          ))}
        </div>
      </Section>

      <Section title={t("crm.repartition_by_agent", "Répartition par agent")}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {byAgent.map(({ agent, count, value }) => (
            <div key={agent.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%", background: agent.color,
                display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>{agent.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{agent.name}</span>
                  <div style={{ display: "flex", gap: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: agent.color }}>{count} leads</span>
                    <span style={{ fontSize: 12, color: T.textMid }}>{fmt(value)}</span>
                  </div>
                </div>
                <HBar value={count} max={maxAgentCount} color={agent.color} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t("crm.repartition_by_temperature", "Répartition par température")}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { label: "🔥 Hot", leads: hotLeads, color: TEMP_COLORS.Hot },
            { label: "⚡ Warm", leads: warmLeads, color: TEMP_COLORS.Warm },
            { label: "❄️ Cold", leads: coldLeads, color: TEMP_COLORS.Cold },
          ].map(({ label, leads: tl, color }) => (
            <div key={label} style={{ background: T.bg, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 16, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color }}>{tl.length}</div>
              <div style={{ fontSize: 11, color: T.textLight, marginTop: 2 }}>{fmt(tl.reduce((s, l) => s + (l.estimated_value || 0), 0))}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t("crm.oldest_leads", "Leads les plus anciens dans le pipeline")}>
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
          <TableHeader cols={["Lead", t("crm.stage_detail", "Étape"), t("crm.total_value", "Valeur"), t("agent", "Agent"), t("crm.days_ago", "Jours")]} />
          {oldest.map(lead => {
            const days = daysSince(lead.created_at);
            return (
              <div key={lead.id} className="kpi-lead-row" style={{
                display: "grid", gridTemplateColumns: "repeat(5, 1fr)", padding: "10px 6px",
                borderBottom: `1px solid ${T.border}`, transition: "background 0.15s",
              }} onClick={() => { onClose(); onSelectLead(lead); }}>
                <div style={{ padding: "0 6px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{lead.company_name}</div>
                  <div style={{ fontSize: 11, color: T.textLight }}>{lead.contact_first_name} {lead.contact_last_name}</div>
                </div>
                <div style={{ padding: "0 6px", display: "flex", alignItems: "center" }}>
                  <Chip label={lead.stage} color={STAGE_COLORS[lead.stage]} bg={`${STAGE_COLORS[lead.stage]}18`} />
                </div>
                <div style={{ padding: "0 6px", display: "flex", alignItems: "center", fontSize: 13 }}>{fmt(lead.estimated_value)}</div>
                <div style={{ padding: "0 6px", display: "flex", alignItems: "center", fontSize: 12, color: T.textMid }}>{lead.assigned_agent_name}</div>
                <div style={{ padding: "0 6px", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: days > 30 ? T.red : T.text }}>{days}j</span>
                  {days > 30 && <span title="Lead en attente depuis plus de 30 jours">⚠️</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </ModalBase>
  );
}

export function ValeurPipelineModal({ leads, onClose, onSelectLead }: {
  leads: CRMLead[]; onClose: () => void; onSelectLead: (l: CRMLead) => void;
}) {
  const { t } = useLanguage();
  const agents = useTeamAgents();
  const activeLeads = leads.filter(l => l.stage !== "Fermé Gagné" && l.stage !== "Fermé Perdu" && !l.archived);
  const totalValue = activeLeads.reduce((s, l) => s + (l.estimated_value || 0), 0);
  const activeStages = STAGES.filter(s => s !== "Fermé Gagné" && s !== "Fermé Perdu");

  const byStage = activeStages.map(stage => {
    const sl = activeLeads.filter(l => l.stage === stage);
    const val = sl.reduce((s, l) => s + (l.estimated_value || 0), 0);
    return { stage, count: sl.length, value: val };
  });
  const maxStageVal = Math.max(...byStage.map(s => s.value), 1);

  const byAgent = agents.map(a => {
    const al = activeLeads.filter(l => l.assigned_agent_id === a.id);
    const val = al.reduce((s, l) => s + (l.estimated_value || 0), 0);
    const avg = al.length > 0 ? val / al.length : 0;
    return { agent: a, count: al.length, value: val, avg };
  }).filter(x => x.count > 0).sort((a, b) => b.value - a.value);

  const top10 = [...activeLeads].sort((a, b) => (b.estimated_value || 0) - (a.estimated_value || 0)).slice(0, 10);

  return (
    <ModalBase title={t("crm.pipeline_value_detail", "Valeur du pipeline — Détail")} subtitle={`${fmt(totalValue)} ${t("crm.opportunities_active", "en opportunités actives")}`} onClose={onClose} color={T.main}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { label: t("crm.total_value", "Valeur totale"), value: fmt(totalValue), color: T.main },
          { label: t("crm.nb_opportunities", "Nb opportunités"), value: activeLeads.length, color: T.main },
          { label: t("crm.avg_value", "Valeur moyenne"), value: fmt(activeLeads.length > 0 ? totalValue / activeLeads.length : 0), color: T.textMid },
        ].map((k, i) => (
          <div key={i} style={{ background: T.bg, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <Section title={t("crm.value_by_stage", "Valeur par étape")} mt={20}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {byStage.map(({ stage, count, value }) => (
            <div key={stage} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 130, fontSize: 12, fontWeight: 600, color: STAGE_COLORS[stage], textAlign: "right", flexShrink: 0 }}>{stage}</div>
              <div style={{ flex: 1 }}>
                <HBar value={value} max={maxStageVal} color={STAGE_COLORS[stage]} height={20} />
              </div>
              <div style={{ width: 100, fontSize: 12, color: T.text, fontWeight: 600, flexShrink: 0 }}>{fmtShort(value)}</div>
              <div style={{ width: 60, fontSize: 11, color: T.textLight, flexShrink: 0 }}>{count} leads</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t("crm.value_by_agent", "Valeur par agent")}>
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
          <TableHeader cols={[t("agent", "Agent"), t("crm.pipeline_value", "Valeur pipeline"), `Nb ${t("crm.leads_label", "leads")}`, t("crm.val_avg_per_lead", "Valeur moy/lead")]} />
          {byAgent.map(({ agent, count, value, avg }, i) => (
            <div key={agent.id} style={{
              display: "grid", gridTemplateColumns: "repeat(4, 1fr)", padding: "10px 6px",
              borderBottom: `1px solid ${T.border}`, background: i === 0 ? `${T.main}06` : "transparent",
              transition: "background 0.15s",
            }}>
              <div style={{ padding: "0 6px", display: "flex", alignItems: "center", gap: 8 }}>
                {i === 0 && <span style={{ fontSize: 14 }}>🏆</span>}
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: agent.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700 }}>{agent.initials}</div>
                <span style={{ fontSize: 13, fontWeight: i === 0 ? 700 : 400 }}>{agent.name}</span>
              </div>
              <div style={{ padding: "0 6px", display: "flex", alignItems: "center", fontWeight: 700, color: agent.color, fontSize: 13 }}>{fmt(value)}</div>
              <div style={{ padding: "0 6px", display: "flex", alignItems: "center", fontSize: 13 }}>{count}</div>
              <div style={{ padding: "0 6px", display: "flex", alignItems: "center", fontSize: 13, color: T.textMid }}>{fmt(avg)}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t("crm.top_10_deals", "Top 10 deals par valeur")}>
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
          <TableHeader cols={["Lead", t("crm.estimated_value_per_year", "Valeur estimée"), t("crm.stage_detail", "Étape"), "Temp.", t("agent", "Agent")]} />
          {top10.map(lead => (
            <div key={lead.id} className="kpi-lead-row" style={{
              display: "grid", gridTemplateColumns: "repeat(5, 1fr)", padding: "10px 6px",
              borderBottom: `1px solid ${T.border}`, transition: "background 0.15s",
            }} onClick={() => { onClose(); onSelectLead(lead); }}>
              <div style={{ padding: "0 6px" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{lead.company_name}</div>
                <div style={{ fontSize: 11, color: T.textLight }}>{lead.contact_first_name} {lead.contact_last_name}</div>
              </div>
              <div style={{ padding: "0 6px", display: "flex", alignItems: "center", fontWeight: 700, fontSize: 13, color: T.main }}>{fmt(lead.estimated_value)}</div>
              <div style={{ padding: "0 6px", display: "flex", alignItems: "center" }}>
                <Chip label={lead.stage} color={STAGE_COLORS[lead.stage]} bg={`${STAGE_COLORS[lead.stage]}18`} />
              </div>
              <div style={{ padding: "0 6px", display: "flex", alignItems: "center" }}>
                <span style={{ color: TEMP_COLORS[lead.temperature], fontWeight: 700, fontSize: 12 }}>
                  {lead.temperature === "Hot" ? "🔥" : lead.temperature === "Warm" ? "⚡" : "❄️"} {lead.temperature}
                </span>
              </div>
              <div style={{ padding: "0 6px", display: "flex", alignItems: "center", fontSize: 12, color: T.textMid }}>{lead.assigned_agent_name}</div>
            </div>
          ))}
        </div>
      </Section>
    </ModalBase>
  );
}

export function PipelinePondereModal({ leads, onClose, onSelectLead }: {
  leads: CRMLead[]; onClose: () => void; onSelectLead: (l: CRMLead) => void;
}) {
  const { t } = useLanguage();
  const activeLeads = leads.filter(l => l.stage !== "Fermé Gagné" && l.stage !== "Fermé Perdu" && !l.archived);
  const totalBrut = activeLeads.reduce((s, l) => s + (l.estimated_value || 0), 0);
  const totalPondere = activeLeads.reduce((s, l) => s + (l.estimated_value || 0) * (l.closing_probability || 0) / 100, 0);
  const pctPondere = totalBrut > 0 ? (totalPondere / totalBrut) * 100 : 0;

  const breakdown = [...activeLeads]
    .map(l => ({ lead: l, weighted: (l.estimated_value || 0) * (l.closing_probability || 0) / 100 }))
    .sort((a, b) => b.weighted - a.weighted);

  const probRanges = [
    { label: "0–25%", min: 0, max: 25, color: T.red },
    { label: "26–50%", min: 26, max: 50, color: T.orange },
    { label: "51–75%", min: 51, max: 75, color: T.blue },
    { label: "76–100%", min: 76, max: 100, color: T.green },
  ].map(r => ({
    ...r,
    count: activeLeads.filter(l => (l.closing_probability || 0) >= r.min && (l.closing_probability || 0) <= r.max).length,
  }));
  const maxProbCount = Math.max(...probRanges.map(r => r.count), 1);

  return (
    <ModalBase title={t("crm.pipeline_pondere_detail", "Pipeline pondéré — Détail")} subtitle={t("crm.weighted_pipeline_formula", "Σ (Valeur estimée × Probabilité %) pour chaque lead actif")} onClose={onClose} color="#0891b2">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { label: t("crm.pipeline_brut", "Pipeline brut"), value: fmt(totalBrut), color: T.main },
          { label: t("crm.pipeline_pondere", "Pipeline pondéré"), value: fmt(totalPondere), color: "#0891b2" },
          { label: t("crm.ratio_weighted_raw", "Ratio pondéré / brut"), value: `${pctPondere.toFixed(1)}%`, color: T.textMid },
        ].map((k, i) => (
          <div key={i} style={{ background: T.bg, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <Section title={t("crm.comparison_brut_vs_pondere", "Comparaison — Pipeline brut vs pondéré")} mt={20}>
        <div style={{ background: T.bg, borderRadius: 10, padding: 16 }}>
          <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{t("crm.pipeline_brut", "Pipeline brut")}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: T.main }}>{fmt(totalBrut)}</div>
              <div style={{ fontSize: 11, color: T.textLight }}>100%</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", color: T.textLight, fontSize: 20 }}>→</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{t("crm.pipeline_pondere", "Pipeline pondéré")}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#0891b2" }}>{fmt(totalPondere)}</div>
              <div style={{ fontSize: 11, color: T.textLight }}>{pctPondere.toFixed(1)}% du brut</div>
            </div>
          </div>
          <div style={{ background: "rgba(0,0,0,0.08)", borderRadius: 8, height: 16, overflow: "hidden" }}>
            <div style={{ width: `${pctPondere}%`, height: "100%", background: "linear-gradient(90deg, #0891b2, #6366f1)", borderRadius: 8, transition: "width 0.5s ease" }} />
          </div>
        </div>
      </Section>

      <Section title={t("crm.breakdown_by_lead", "Breakdown détaillé par lead")}>
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden", maxHeight: 300, overflowY: "auto" }}>
          <TableHeader cols={["Lead", t("crm.estimated_value_per_year", "Valeur estimée"), t("crm.closing_probability", "Probabilité"), t("crm.pipeline_pondere", "Valeur pondérée"), t("crm.stage_detail", "Étape")]} />
          {breakdown.map(({ lead, weighted }) => (
            <div key={lead.id} className="kpi-lead-row" style={{
              display: "grid", gridTemplateColumns: "repeat(5, 1fr)", padding: "9px 6px",
              borderBottom: `1px solid ${T.border}`, transition: "background 0.15s",
            }} onClick={() => { onClose(); onSelectLead(lead); }}>
              <div style={{ padding: "0 6px" }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{lead.company_name}</div>
              </div>
              <div style={{ padding: "0 6px", display: "flex", alignItems: "center", fontSize: 12 }}>{fmt(lead.estimated_value)}</div>
              <div style={{ padding: "0 6px", display: "flex", alignItems: "center", fontSize: 12, fontWeight: 700, color: lead.closing_probability >= 70 ? T.green : lead.closing_probability >= 40 ? T.orange : T.red }}>{lead.closing_probability}%</div>
              <div style={{ padding: "0 6px", display: "flex", alignItems: "center", fontWeight: 700, fontSize: 12, color: "#0891b2" }}>{fmt(weighted)}</div>
              <div style={{ padding: "0 6px", display: "flex", alignItems: "center" }}>
                <Chip label={lead.stage} color={STAGE_COLORS[lead.stage]} bg={`${STAGE_COLORS[lead.stage]}18`} />
              </div>
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", padding: "10px 6px", background: T.bg, fontWeight: 700 }}>
            <div style={{ padding: "0 6px", fontSize: 13 }}>TOTAL</div>
            <div style={{ padding: "0 6px", fontSize: 13, color: T.main }}>{fmt(totalBrut)}</div>
            <div style={{ padding: "0 6px" }} />
            <div style={{ padding: "0 6px", fontSize: 13, color: "#0891b2" }}>{fmt(totalPondere)}</div>
            <div style={{ padding: "0 6px" }} />
          </div>
        </div>
      </Section>

      <Section title={t("crm.distribution_probabilities", "Distribution des probabilités")}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {probRanges.map(r => (
            <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 70, fontSize: 12, fontWeight: 700, color: r.color, flexShrink: 0 }}>{r.label}</div>
              <div style={{ flex: 1 }}>
                <HBar value={r.count} max={maxProbCount} color={r.color} height={18} />
              </div>
              <div style={{ width: 80, fontSize: 12, fontWeight: 700, textAlign: "right", color: T.text, flexShrink: 0 }}>{r.count} lead{r.count !== 1 ? "s" : ""}</div>
            </div>
          ))}
        </div>
      </Section>
    </ModalBase>
  );
}

export function LeadsHotModal({ leads, onClose, onSelectLead }: {
  leads: CRMLead[]; onClose: () => void; onSelectLead: (l: CRMLead) => void;
}) {
  const { t } = useLanguage();
  const agents = useTeamAgents();
  const now = new Date();
  const hotLeads = leads.filter(l => l.temperature === "Hot" && l.stage !== "Fermé Gagné" && l.stage !== "Fermé Perdu" && !l.archived);
  const totalHotValue = hotLeads.reduce((s, l) => s + (l.estimated_value || 0), 0);

  const inactive = hotLeads.filter(l => daysSince(l.last_activity_at) >= 3);
  const active = hotLeads.filter(l => daysSince(l.last_activity_at) < 3);

  const byAgent = agents.map(a => {
    const al = hotLeads.filter(l => l.assigned_agent_id === a.id);
    const lastFollowUp = al.length > 0 ? al.reduce((latest, l) => new Date(l.last_activity_at) > new Date(latest) ? l.last_activity_at : latest, al[0].last_activity_at) : null;
    return { agent: a, count: al.length, value: al.reduce((s, l) => s + (l.estimated_value || 0), 0), lastFollowUp };
  }).filter(x => x.count > 0);

  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);
  const hotThisWeek = leads.filter(l => l.temperature === "Hot" && new Date(l.updated_at) >= weekAgo).length;
  const hotLastWeek = leads.filter(l => l.temperature === "Hot" && new Date(l.updated_at) >= twoWeeksAgo && new Date(l.updated_at) < weekAgo).length;

  return (
    <ModalBase title={t("crm.leads_hot_detail", "Leads Hot 🔥 — Détail")} subtitle={`${hotLeads.length} leads Hot · ${fmt(totalHotValue)} ${t("crm.total_value", "en valeur totale")}`} onClose={onClose} color={T.red}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: t("crm.total_hot", "Total Hot"), value: hotLeads.length, color: T.red },
          { label: t("crm.total_value", "Valeur totale"), value: fmt(totalHotValue), color: T.red },
          { label: t("crm.active_3d", "Actifs (3j)"), value: active.length, color: T.green },
          { label: t("crm.no_recent_activity", "Sans activité récente"), value: inactive.length, color: inactive.length > 0 ? T.orange : T.green },
        ].map((k, i) => (
          <div key={i} style={{ background: T.bg, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {inactive.length > 0 && (
        <div style={{ marginTop: 16, background: "rgba(245,158,11,0.08)", border: `1px solid ${T.orange}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 700, color: T.orange, fontSize: 13, marginBottom: 10 }}>
            ⚠️ {t("crm.waiting_attention", "Ces leads Hot nécessitent une attention immédiate — pas d'activité depuis 3+ jours")}
          </div>
          {inactive.map(lead => (
            <div key={lead.id} className="kpi-lead-row" style={{
              display: "flex", alignItems: "center", gap: 12, padding: "8px 10px",
              background: T.bgCard, borderRadius: 8, marginBottom: 6, transition: "background 0.15s",
            }} onClick={() => { onClose(); onSelectLead(lead); }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{lead.company_name}</div>
                <div style={{ fontSize: 11, color: T.textLight }}>{lead.stage} · {lead.assigned_agent_name}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.main }}>{fmt(lead.estimated_value)}</div>
              <div style={{ fontSize: 11, color: T.red, fontWeight: 700 }}>{daysSince(lead.last_activity_at)}j sans activité</div>
            </div>
          ))}
        </div>
      )}

      <Section title={t("crm.all_hot_leads", "Tous les leads Hot")} mt={20}>
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
          <TableHeader cols={["Lead", t("crm.total_value", "Valeur"), t("crm.stage_detail", "Étape"), t("agent", "Agent"), t("crm.last_activity", "Dernière activité")]} />
          {[...hotLeads].sort((a, b) => (b.estimated_value || 0) - (a.estimated_value || 0)).map(lead => (
            <div key={lead.id} className="kpi-lead-row" style={{
              display: "grid", gridTemplateColumns: "repeat(5, 1fr)", padding: "10px 6px",
              borderBottom: `1px solid ${T.border}`, transition: "background 0.15s",
            }} onClick={() => { onClose(); onSelectLead(lead); }}>
              <div style={{ padding: "0 6px" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{lead.company_name}</div>
                <div style={{ fontSize: 11, color: T.textLight }}>{lead.contact_first_name} {lead.contact_last_name}</div>
              </div>
              <div style={{ padding: "0 6px", display: "flex", alignItems: "center", fontWeight: 700, color: T.main, fontSize: 13 }}>{fmt(lead.estimated_value)}</div>
              <div style={{ padding: "0 6px", display: "flex", alignItems: "center" }}>
                <Chip label={lead.stage} color={STAGE_COLORS[lead.stage]} bg={`${STAGE_COLORS[lead.stage]}18`} />
              </div>
              <div style={{ padding: "0 6px", display: "flex", alignItems: "center", fontSize: 12, color: T.textMid }}>{lead.assigned_agent_name}</div>
              <div style={{ padding: "0 6px", display: "flex", alignItems: "center", fontSize: 11, color: daysSince(lead.last_activity_at) >= 3 ? T.orange : T.green }}>
                {daysSince(lead.last_activity_at) === 0 ? t("crm.today", "Aujourd'hui") : `${t("crm.days_ago", "Il y a")} ${daysSince(lead.last_activity_at)}j`}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t("crm.hot_leads_by_agent", "Leads Hot par agent")}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {byAgent.map(({ agent, count, value, lastFollowUp }) => (
            <div key={agent.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: T.bg, borderRadius: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: agent.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{agent.initials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{agent.name}</div>
                <div style={{ fontSize: 11, color: T.textLight }}>{t("crm.last_follow_up", "Dernier follow-up")}: {lastFollowUp ? `${t("crm.days_ago", "il y a")} ${daysSince(lastFollowUp)}j` : "—"}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: T.red }}>{count} Hot</div>
                <div style={{ fontSize: 11, color: T.textLight }}>{fmt(value)}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t("crm.evolution", "Évolution")}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: T.bg, borderRadius: 10, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{t("crm.this_week", "Cette semaine")}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: T.red }}>{hotThisWeek}</div>
          </div>
          <div style={{ background: T.bg, borderRadius: 10, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{t("crm.last_week", "Semaine dernière")}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: T.textMid }}>{hotLastWeek}</div>
            {hotThisWeek > hotLastWeek
              ? <div style={{ fontSize: 11, color: T.green, fontWeight: 700 }}>↑ +{hotThisWeek - hotLastWeek} {t("crm.vs_last_week", "vs la semaine dernière")}</div>
              : hotThisWeek < hotLastWeek
              ? <div style={{ fontSize: 11, color: T.red, fontWeight: 700 }}>↓ -{hotLastWeek - hotThisWeek} {t("crm.vs_last_week", "vs la semaine dernière")}</div>
              : <div style={{ fontSize: 11, color: T.textLight }}>= {t("crm.stable", "Stable")}</div>}
          </div>
        </div>
      </Section>
    </ModalBase>
  );
}

export function TauxConversionModal({ leads, onClose, onSelectLead }: {
  leads: CRMLead[]; onClose: () => void; onSelectLead: (l: CRMLead) => void;
}) {
  const { t } = useLanguage();
  const agents = useTeamAgents();
  const totalLeads = leads.length;
  const wonLeads = leads.filter(l => l.stage === "Fermé Gagné");
  const lostLeads = leads.filter(l => l.stage === "Fermé Perdu");
  const convRate = totalLeads > 0 ? (wonLeads.length / totalLeads) * 100 : 0;

  const funnelStages: Array<{ stage: string; count: number; color: string }> = [
    { stage: "Leads créés", count: totalLeads, color: "#6577a8" },
    ...STAGES.filter(s => s !== "Fermé Perdu").map(s => ({
      stage: s, count: leads.filter(l => l.stage === s || (STAGES.indexOf(l.stage as typeof STAGES[number]) > STAGES.indexOf(s as typeof STAGES[number]))).length,
      color: STAGE_COLORS[s],
    })),
  ];
  const funnelMax = funnelStages[0]?.count || 1;

  const byAgent = agents.map(a => {
    const al = leads.filter(l => l.assigned_agent_id === a.id);
    const won = al.filter(l => l.stage === "Fermé Gagné").length;
    const lost = al.filter(l => l.stage === "Fermé Perdu").length;
    const rate = al.length > 0 ? (won / al.length) * 100 : 0;
    return { agent: a, total: al.length, won, lost, rate };
  }).filter(x => x.total > 0).sort((a, b) => b.rate - a.rate);

  const bySource = ["Référence", "Site web", "Cold call", "Salon / événement", "Réseau", "Pub en ligne", "Autre"].map(src => {
    const sl = leads.filter(l => l.source === src);
    const won = sl.filter(l => l.stage === "Fermé Gagné").length;
    const rate = sl.length > 0 ? (won / sl.length) * 100 : 0;
    return { source: src, total: sl.length, won, rate };
  }).filter(x => x.total > 0).sort((a, b) => b.rate - a.rate);

  const byType = ["Installateur", "Distributeur", "Large Scale"].map(type => {
    const tl = leads.filter(l => l.type === type);
    const won = tl.filter(l => l.stage === "Fermé Gagné").length;
    const rate = tl.length > 0 ? (won / tl.length) * 100 : 0;
    return { type, total: tl.length, won, rate };
  }).filter(x => x.total > 0);

  const lossReasons = lostLeads.flatMap(l => (l.activities || []).filter(a => a.type === "Raison de perte").map(a => a.loss_reason || "Autre"));
  const lossReasonCounts: Record<string, number> = {};
  lossReasons.forEach(r => { if (r) lossReasonCounts[r] = (lossReasonCounts[r] || 0) + 1; });
  const sortedLossReasons = Object.entries(lossReasonCounts).sort((a, b) => b[1] - a[1]);
  const maxLoss = Math.max(...Object.values(lossReasonCounts), 1);

  return (
    <ModalBase title={t("crm.conversion_rate_detail", "Taux de conversion — Détail")} subtitle={`${convRate.toFixed(1)}% ${t("crm.global_rate", "de taux global")} · ${wonLeads.length} ${t("crm.won_total", "gagnés")} / ${totalLeads} total`} onClose={onClose} color={T.green}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: t("crm.total_leads", "Total leads"), value: totalLeads, color: T.main },
          { label: t("crm.closed_won", "Fermés Gagnés"), value: wonLeads.length, color: T.green },
          { label: t("crm.closed_lost", "Fermés Perdus"), value: lostLeads.length, color: T.red },
          { label: t("crm.conversion_rate", "Taux conversion"), value: `${convRate.toFixed(1)}%`, color: convRate > 30 ? T.green : convRate >= 15 ? T.orange : T.red },
        ].map((k, i) => (
          <div key={i} style={{ background: T.bg, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <Section title={t("crm.full_funnel", "Funnel complet")} mt={20}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {funnelStages.map((fs, i) => {
            const prevCount = i > 0 ? funnelStages[i - 1].count : fs.count;
            const dropPct = prevCount > 0 && i > 0 ? ((prevCount - fs.count) / prevCount) * 100 : 0;
            const isBottleneck = dropPct > 40;
            return (
              <div key={fs.stage} style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 120, fontSize: 11, fontWeight: 600, color: fs.color, textAlign: "right", flexShrink: 0 }}>{fs.stage}</div>
                  <div style={{ flex: 1, background: "rgba(0,0,0,0.06)", borderRadius: 6, height: 28, overflow: "hidden" }}>
                    <div style={{ width: `${(fs.count / funnelMax) * 100}%`, height: "100%", background: fs.color, borderRadius: 6, display: "flex", alignItems: "center", paddingLeft: 10, transition: "width 0.5s ease" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>{fs.count}</span>
                    </div>
                  </div>
                  <div style={{ width: 100, fontSize: 11, textAlign: "right", flexShrink: 0 }}>
                    {i > 0 && dropPct > 0 && (
                      <span style={{ color: isBottleneck ? T.red : T.textLight, fontWeight: isBottleneck ? 700 : 400 }}>
                        {isBottleneck ? "⚠️ " : ""}-{dropPct.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title={t("crm.conversion_by_agent", "Conversion par agent")}>
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
          <TableHeader cols={[t("agent", "Agent"), t("crm.total_leads", "Total leads"), t("crm.won_total", "Gagnés"), t("crm.lost_label", "Perdus"), t("crm.rate_pct", "Taux %")]} />
          {byAgent.map(({ agent, total, won, lost, rate }, i) => (
            <div key={agent.id} style={{
              display: "grid", gridTemplateColumns: "repeat(5, 1fr)", padding: "10px 6px",
              borderBottom: `1px solid ${T.border}`,
              background: i === 0 ? "rgba(34,197,94,0.06)" : i === byAgent.length - 1 && byAgent.length > 1 ? "rgba(245,158,11,0.06)" : "transparent",
            }}>
              <div style={{ padding: "0 6px", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: agent.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700 }}>{agent.initials}</div>
                <span style={{ fontSize: 13 }}>{agent.name}</span>
              </div>
              <div style={{ padding: "0 6px", display: "flex", alignItems: "center", fontSize: 13 }}>{total}</div>
              <div style={{ padding: "0 6px", display: "flex", alignItems: "center", fontSize: 13, color: T.green, fontWeight: 700 }}>{won}</div>
              <div style={{ padding: "0 6px", display: "flex", alignItems: "center", fontSize: 13, color: T.red }}>{lost}</div>
              <div style={{ padding: "0 6px", display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: rate > 30 ? T.green : rate >= 15 ? T.orange : T.red }}>{rate.toFixed(1)}%</span>
                {i === 0 && <span style={{ marginLeft: 4, fontSize: 12 }}>🏆</span>}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>{t("crm.by_source", "Par source")}</h3>
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
            <TableHeader cols={[t("crm.source", "Source"), "Leads", t("crm.won_total", "Gagnés"), t("crm.rate_label", "Taux")]} />
            {bySource.map(({ source, total, won, rate }) => (
              <div key={source} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", padding: "8px 6px", borderBottom: `1px solid ${T.border}`, fontSize: 12 }}>
                <div style={{ padding: "0 6px" }}>{source}</div>
                <div style={{ padding: "0 6px" }}>{total}</div>
                <div style={{ padding: "0 6px", color: T.green, fontWeight: 700 }}>{won}</div>
                <div style={{ padding: "0 6px", fontWeight: 700, color: rate > 30 ? T.green : rate >= 15 ? T.orange : T.red }}>{rate.toFixed(0)}%</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>{t("crm.by_client_type", "Par type de client")}</h3>
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
            <TableHeader cols={[t("type", "Type"), "Leads", t("crm.won_total", "Gagnés"), t("crm.rate_label", "Taux")]} />
            {byType.map(({ type, total, won, rate }) => (
              <div key={type} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", padding: "8px 6px", borderBottom: `1px solid ${T.border}`, fontSize: 12 }}>
                <div style={{ padding: "0 6px" }}>{type}</div>
                <div style={{ padding: "0 6px" }}>{total}</div>
                <div style={{ padding: "0 6px", color: T.green, fontWeight: 700 }}>{won}</div>
                <div style={{ padding: "0 6px", fontWeight: 700, color: rate > 30 ? T.green : rate >= 15 ? T.orange : T.red }}>{rate.toFixed(0)}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {sortedLossReasons.length > 0 && (
        <Section title={t("crm.loss_reasons", "Raisons de perte")}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sortedLossReasons.map(([reason, count]) => (
              <div key={reason} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 160, fontSize: 12, color: T.textMid, flexShrink: 0 }}>{reason}</div>
                <div style={{ flex: 1 }}><HBar value={count} max={maxLoss} color={T.red} /></div>
                <div style={{ width: 30, fontSize: 12, fontWeight: 700, textAlign: "right", flexShrink: 0 }}>{count}</div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </ModalBase>
  );
}

export function TempsClosingModal({ leads, onClose, onSelectLead }: {
  leads: CRMLead[]; onClose: () => void; onSelectLead: (l: CRMLead) => void;
}) {
  const { t } = useLanguage();
  const agents = useTeamAgents();
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 86400000);
  const recentlyWon = leads.filter(l => l.stage === "Fermé Gagné" && l.closed_at && new Date(l.closed_at) >= sixMonthsAgo);

  const withDays = recentlyWon.map(l => ({
    lead: l,
    days: Math.round((new Date(l.closed_at!).getTime() - new Date(l.created_at).getTime()) / 86400000),
  })).sort((a, b) => a.days - b.days);

  const avgDays = withDays.length > 0 ? Math.round(withDays.reduce((s, l) => s + l.days, 0) / withDays.length) : 0;

  const byAgent = agents.map(a => {
    const al = withDays.filter(x => x.lead.assigned_agent_id === a.id);
    const avg = al.length > 0 ? Math.round(al.reduce((s, x) => s + x.days, 0) / al.length) : 0;
    return { agent: a, count: al.length, avgDays: avg };
  }).filter(x => x.count > 0).sort((a, b) => a.avgDays - b.avgDays);

  const maxAgentDays = Math.max(...byAgent.map(a => a.avgDays), 1);
  const fastest5 = withDays.slice(0, 5);
  const slowest5 = [...withDays].reverse().slice(0, 5);

  const stageAvgDays = STAGES.filter(s => s !== "Fermé Gagné" && s !== "Fermé Perdu").map(stage => {
    const inStage = leads.filter(l => l.stage === stage && !l.archived);
    const avgInStage = inStage.length > 0
      ? Math.round(inStage.reduce((s, l) => s + daysSince(l.created_at), 0) / inStage.length)
      : 0;
    return { stage, avgDays: avgInStage, count: inStage.length };
  });
  const maxStageDays = Math.max(...stageAvgDays.map(s => s.avgDays), 1);

  return (
    <ModalBase title={t("crm.velocity_detail", "Vélocité du pipeline — Détail")} subtitle={`${avgDays > 0 ? avgDays + ` ${t("crm.days_avg", "jours en moyenne")}` : t("crm.no_data_yet", "Pas encore de données")} · ${t("crm.based_on_6_months", "Basé sur les 6 derniers mois")}`} onClose={onClose} color={T.textMid}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { label: t("crm.temps_closing_avg", "Temps moyen closing"), value: avgDays > 0 ? `${avgDays}j` : "—", color: T.main },
          { label: t("crm.deals_analyzed", "Deals analysés"), value: recentlyWon.length, color: T.main },
          { label: t("crm.fastest", "Le plus rapide"), value: withDays.length > 0 ? `${withDays[0].days}j` : "—", color: T.green },
        ].map((k, i) => (
          <div key={i} style={{ background: T.bg, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <Section title={t("crm.time_per_stage", "Temps par étape (leads actifs)")} mt={20}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {stageAvgDays.map(({ stage, avgDays: avg, count }) => (
            <div key={stage} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 140, fontSize: 11, fontWeight: 600, color: STAGE_COLORS[stage], textAlign: "right", flexShrink: 0 }}>{stage}</div>
              <div style={{ flex: 1 }}><HBar value={avg} max={maxStageDays} color={STAGE_COLORS[stage]} height={18} /></div>
              <div style={{ width: 60, fontSize: 12, fontWeight: 700, color: avg > avgDays * 1.5 ? T.orange : T.text, flexShrink: 0 }}>{avg > 0 ? `${avg}j` : "—"}</div>
              <div style={{ width: 60, fontSize: 11, color: T.textLight, flexShrink: 0 }}>{count} leads</div>
            </div>
          ))}
        </div>
      </Section>

      {byAgent.length > 0 && (
        <Section title={t("crm.avg_time_by_agent", "Temps moyen par agent")}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {byAgent.map(({ agent, count, avgDays: avg }, i) => (
              <div key={agent.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 14px", background: i === 0 ? "rgba(34,197,94,0.06)" : T.bg, borderRadius: 8, border: i === 0 ? `1px solid ${T.green}22` : "none" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: agent.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{agent.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{agent.name}</span>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      {i === 0 && <span style={{ fontSize: 11, color: T.green, fontWeight: 700 }}>⚡ {t("crm.fastest", "Le plus rapide")}</span>}
                      <span style={{ fontSize: 13, fontWeight: 700, color: agent.color }}>{avg}j</span>
                      <span style={{ fontSize: 11, color: T.textLight }}>{count} deals</span>
                    </div>
                  </div>
                  <HBar value={avg} max={maxAgentDays} color={agent.color} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {fastest5.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>{t("crm.5_fastest_deals", "5 Deals les plus rapides")} ⚡</h3>
            {fastest5.map(({ lead, days }) => (
              <div key={lead.id} className="kpi-lead-row" style={{ padding: "8px 10px", borderRadius: 8, background: T.bg, marginBottom: 6, transition: "background 0.15s", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                onClick={() => { onClose(); onSelectLead(lead); }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{lead.company_name}</div>
                  <div style={{ fontSize: 11, color: T.textLight }}>{lead.assigned_agent_name}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.green }}>{days}j</div>
              </div>
            ))}
          </div>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>{t("crm.5_slowest_deals", "5 Deals les plus lents")} 🐢</h3>
            {slowest5.map(({ lead, days }) => (
              <div key={lead.id} className="kpi-lead-row" style={{ padding: "8px 10px", borderRadius: 8, background: T.bg, marginBottom: 6, transition: "background 0.15s", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                onClick={() => { onClose(); onSelectLead(lead); }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{lead.company_name}</div>
                  <div style={{ fontSize: 11, color: T.textLight }}>{lead.assigned_agent_name}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.orange }}>{days}j</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ModalBase>
  );
}

export function DealsFermesModal({ leads, onClose, onSelectLead }: {
  leads: CRMLead[]; onClose: () => void; onSelectLead: (l: CRMLead) => void;
}) {
  const { t } = useLanguage();
  const agents = useTeamAgents();
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dealsThisMonth = leads.filter(l => l.stage === "Fermé Gagné" && l.closed_at && new Date(l.closed_at) >= thisMonthStart);
  const totalValue = dealsThisMonth.reduce((s, l) => s + (l.estimated_value || 0), 0);

  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const dealsLastMonth = leads.filter(l => l.stage === "Fermé Gagné" && l.closed_at && new Date(l.closed_at) >= lastMonthStart && new Date(l.closed_at) <= lastMonthEnd);

  const byAgent = agents.map(a => {
    const al = dealsThisMonth.filter(l => l.assigned_agent_id === a.id);
    return { agent: a, count: al.length, value: al.reduce((s, l) => s + (l.estimated_value || 0), 0), avg: al.length > 0 ? al.reduce((s, l) => s + (l.estimated_value || 0), 0) / al.length : 0 };
  }).filter(x => x.count > 0).sort((a, b) => b.value - a.value);

  const months6: Array<{ label: string; count: number; value: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const mDeals = leads.filter(l => l.stage === "Fermé Gagné" && l.closed_at && new Date(l.closed_at) >= mStart && new Date(l.closed_at) <= mEnd);
    months6.push({
      label: mStart.toLocaleString("fr-CA", { month: "short" }),
      count: mDeals.length,
      value: mDeals.reduce((s, l) => s + (l.estimated_value || 0), 0),
    });
  }
  const maxMonthCount = Math.max(...months6.map(m => m.count), 1);

  const podiumEmojis = ["🥇", "🥈", "🥉"];

  return (
    <ModalBase title={t("crm.deals_closed_month_detail", "Deals fermés ce mois — Détail")} subtitle={`${dealsThisMonth.length} deals · ${fmt(totalValue)} · vs ${dealsLastMonth.length} ${t("crm.last_month", "le mois dernier")}`} onClose={onClose} color={T.green}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: t("crm.deals_this_month", "Deals ce mois"), value: dealsThisMonth.length, color: T.green },
          { label: t("crm.total_value", "Valeur totale"), value: fmt(totalValue), color: T.green },
          { label: t("crm.avg_value", "Valeur moyenne"), value: dealsThisMonth.length > 0 ? fmt(totalValue / dealsThisMonth.length) : "—", color: T.textMid },
          { label: t("crm.vs_last_month", "vs mois dernier"), value: dealsThisMonth.length - dealsLastMonth.length >= 0 ? `+${dealsThisMonth.length - dealsLastMonth.length}` : `${dealsThisMonth.length - dealsLastMonth.length}`, color: dealsThisMonth.length >= dealsLastMonth.length ? T.green : T.red },
        ].map((k, i) => (
          <div key={i} style={{ background: T.bg, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <Section title={t("crm.comparison_6_months", "Comparaison 6 derniers mois")} mt={20}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 120, padding: "0 4px" }}>
          {months6.map((m, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.main }}>{m.count}</div>
              <div style={{
                width: "100%", borderRadius: "4px 4px 0 0",
                background: i === months6.length - 1 ? T.green : T.main,
                height: `${(m.count / maxMonthCount) * 80}px`,
                minHeight: m.count > 0 ? 8 : 0,
                transition: "height 0.5s ease",
              }} />
              <div style={{ fontSize: 10, color: T.textLight, textAlign: "center" }}>{m.label}</div>
            </div>
          ))}
        </div>
      </Section>

      {byAgent.length > 0 && (
        <Section title={t("crm.agent_performance_month", "Performance par agent ce mois")}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {byAgent.map(({ agent, count, value, avg }, i) => (
              <div key={agent.id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10,
                background: i < 3 ? `${agent.color}10` : T.bg,
                border: i < 3 ? `1px solid ${agent.color}30` : "none",
              }}>
                <div style={{ fontSize: 20, flexShrink: 0 }}>{podiumEmojis[i] || (i + 1)}</div>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: agent.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{agent.initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{agent.name}</div>
                  <div style={{ fontSize: 11, color: T.textLight }}>{t("crm.avg_value_short", "Valeur moy")}: {fmt(avg)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: agent.color }}>{count} deals</div>
                  <div style={{ fontSize: 12, color: T.textMid }}>{fmt(value)}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {dealsThisMonth.length > 0 && (
        <Section title={t("crm.closed_deals_list", "Liste des deals fermés ce mois")}>
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
            <TableHeader cols={["Lead", t("crm.value_label", "Valeur"), t("agent", "Agent"), t("crm.closing_date", "Date closing"), t("crm.pipeline_duration", "Durée pipeline")]} />
            {[...dealsThisMonth].sort((a, b) => (b.estimated_value || 0) - (a.estimated_value || 0)).map(lead => (
              <div key={lead.id} className="kpi-lead-row" style={{
                display: "grid", gridTemplateColumns: "repeat(5, 1fr)", padding: "10px 6px",
                borderBottom: `1px solid ${T.border}`, transition: "background 0.15s",
              }} onClick={() => { onClose(); onSelectLead(lead); }}>
                <div style={{ padding: "0 6px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{lead.company_name}</div>
                  <div style={{ fontSize: 11, color: T.textLight }}>{lead.contact_first_name} {lead.contact_last_name}</div>
                </div>
                <div style={{ padding: "0 6px", display: "flex", alignItems: "center", fontWeight: 700, color: T.green, fontSize: 13 }}>{fmt(lead.estimated_value)}</div>
                <div style={{ padding: "0 6px", display: "flex", alignItems: "center", fontSize: 12, color: T.textMid }}>{lead.assigned_agent_name}</div>
                <div style={{ padding: "0 6px", display: "flex", alignItems: "center", fontSize: 12 }}>
                  {lead.closed_at ? new Date(lead.closed_at).toLocaleDateString("fr-CA") : "—"}
                </div>
                <div style={{ padding: "0 6px", display: "flex", alignItems: "center", fontSize: 12, color: T.textMid }}>
                  {lead.closed_at ? `${Math.round((new Date(lead.closed_at).getTime() - new Date(lead.created_at).getTime()) / 86400000)}j` : "—"}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </ModalBase>
  );
}

export function RemindersRetardModal({ leads, onClose, onSelectLead }: {
  leads: CRMLead[]; onClose: () => void; onSelectLead: (l: CRMLead) => void;
}) {
  const { t } = useLanguage();
  const agents = useTeamAgents();
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const allReminders: Array<CRMReminder & { leadName: string; leadObj: CRMLead }> = leads.flatMap(l =>
    (l.reminders || []).map(r => ({ ...r, leadName: l.company_name, leadObj: l }))
  );

  const overdue = allReminders
    .filter(r => !r.completed && new Date(r.reminder_at) < now)
    .sort((a, b) => new Date(a.reminder_at).getTime() - new Date(b.reminder_at).getTime());

  const todayPending = allReminders
    .filter(r => !r.completed && new Date(r.reminder_at) >= now && new Date(r.reminder_at) <= todayEnd)
    .sort((a, b) => new Date(a.reminder_at).getTime() - new Date(b.reminder_at).getTime());

  const byAgent = agents.map(a => {
    const agentLeads = leads.filter(l => l.assigned_agent_id === a.id);
    const agentOverdue = agentLeads.flatMap(l => (l.reminders || []).filter(r => !r.completed && new Date(r.reminder_at) < now));
    const oldest = agentOverdue.length > 0 ? Math.max(...agentOverdue.map(r => Math.floor((now.getTime() - new Date(r.reminder_at).getTime()) / 86400000))) : 0;
    return { agent: a, count: agentOverdue.length, oldest };
  }).filter(x => x.count > 0).sort((a, b) => b.count - a.count);

  const priorityColor: Record<string, string> = { Haute: T.red, Moyenne: T.orange, Basse: T.textMid };

  return (
    <ModalBase title={t("crm.reminders_overdue_detail", "Reminders en retard — Détail")} subtitle={`${overdue.length} reminder${overdue.length !== 1 ? "s" : ""} ${t("crm.overdue_label", "en retard")} — ${t("crm.action_required_now", "Action requise immédiatement")}`} onClose={onClose} color={T.red}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { label: t("crm.overdue", "En retard"), value: overdue.length, color: overdue.length > 0 ? T.red : T.green },
          { label: t("crm.high_priority_overdue", "Haute priorité en retard"), value: overdue.filter(r => r.priority === "Haute").length, color: T.red },
          { label: t("crm.reminders_today", "Reminders aujourd'hui"), value: todayPending.length, color: T.orange },
        ].map((k, i) => (
          <div key={i} style={{ background: T.bg, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {overdue.length > 0 ? (
        <Section title={t("crm.all_overdue_reminders", "Tous les reminders en retard (triés par retard décroissant)")} mt={20}>
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
            <TableHeader cols={["Lead", t("crm.reminder_label", "Rappel"), t("crm.planned_date", "Date prévue"), t("crm.delay_label", "Retard"), t("agent", "Agent"), t("crm.priority_label", "Priorité")]} />
            {overdue.map(r => {
              const daysLate = Math.floor((now.getTime() - new Date(r.reminder_at).getTime()) / 86400000);
              return (
                <div key={r.id} className="kpi-lead-row" style={{
                  display: "grid", gridTemplateColumns: "repeat(6, 1fr)", padding: "10px 6px",
                  borderBottom: `1px solid ${T.border}`,
                  background: r.priority === "Haute" ? "rgba(239,68,68,0.04)" : "transparent",
                  transition: "background 0.15s",
                }} onClick={() => { onClose(); onSelectLead(r.leadObj); }}>
                  <div style={{ padding: "0 6px" }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{r.leadName}</div>
                  </div>
                  <div style={{ padding: "0 6px", display: "flex", alignItems: "center", fontSize: 12, color: T.text }}>{r.title}</div>
                  <div style={{ padding: "0 6px", display: "flex", alignItems: "center", fontSize: 12, color: T.textMid }}>
                    {new Date(r.reminder_at).toLocaleDateString("fr-CA")}
                  </div>
                  <div style={{ padding: "0 6px", display: "flex", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.red }}>{daysLate}j</span>
                  </div>
                  <div style={{ padding: "0 6px", display: "flex", alignItems: "center", fontSize: 11, color: T.textMid }}>{r.assigned_agent_name}</div>
                  <div style={{ padding: "0 6px", display: "flex", alignItems: "center" }}>
                    <Chip label={r.priority} color={priorityColor[r.priority]} bg={`${priorityColor[r.priority]}18`} />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      ) : (
        <div style={{ marginTop: 20, background: "rgba(34,197,94,0.08)", border: `1px solid ${T.green}`, borderRadius: 10, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
          <div style={{ fontWeight: 700, color: T.green }}>{t("crm.all_up_to_date_no_reminders", "Tout est à jour ! Aucun reminder en retard.")}</div>
        </div>
      )}

      {byAgent.length > 0 && (
        <Section title={t("crm.overdue_by_agent", "En retard par agent")}>
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
            <TableHeader cols={[t("agent", "Agent"), t("crm.overdue", "En retard"), t("crm.oldest_days", "Plus ancien (jours)")]} />
            {byAgent.map(({ agent, count, oldest }) => (
              <div key={agent.id} style={{
                display: "grid", gridTemplateColumns: "repeat(3, 1fr)", padding: "10px 6px",
                borderBottom: `1px solid ${T.border}`,
              }}>
                <div style={{ padding: "0 6px", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: agent.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700 }}>{agent.initials}</div>
                  <span style={{ fontSize: 13 }}>{agent.name}</span>
                </div>
                <div style={{ padding: "0 6px", display: "flex", alignItems: "center", fontWeight: 700, color: T.red, fontSize: 14 }}>{count}</div>
                <div style={{ padding: "0 6px", display: "flex", alignItems: "center", fontSize: 13, color: oldest > 7 ? T.red : T.orange }}>{oldest}j</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {todayPending.length > 0 && (
        <Section title={t("crm.reminders_today_todo", "Reminders du jour — À faire aujourd'hui")}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {todayPending.map(r => (
              <div key={r.id} className="kpi-lead-row" style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                background: "rgba(245,158,11,0.06)", borderRadius: 8, border: "1px solid rgba(245,158,11,0.2)",
                transition: "background 0.15s",
              }} onClick={() => { onClose(); onSelectLead(r.leadObj); }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.leadName}</div>
                  <div style={{ fontSize: 12, color: T.textMid }}>{r.title}</div>
                </div>
                <div style={{ fontSize: 12, color: T.orange, fontWeight: 600 }}>
                  {new Date(r.reminder_at).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div style={{ fontSize: 12, color: T.textMid }}>{r.assigned_agent_name}</div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </ModalBase>
  );
}

export function StageDetailModal({ stage, leads, onClose, onSelectLead }: {
  stage: string; leads: CRMLead[]; onClose: () => void; onSelectLead: (l: CRMLead) => void;
}) {
  const { t } = useLanguage();
  const stageLeads = leads.filter(l => l.stage === stage);
  const totalValue = stageLeads.reduce((s, l) => s + (l.estimated_value || 0), 0);
  const avgDays = stageLeads.length > 0
    ? Math.round(stageLeads.reduce((s, l) => s + daysSince(l.created_at), 0) / stageLeads.length)
    : 0;
  const stageColor = (STAGE_COLORS as Record<string, string>)[stage] || T.main;

  const sorted = [...stageLeads].sort((a, b) => (b.estimated_value || 0) - (a.estimated_value || 0));

  return (
    <ModalBase title={`${stage} — ${t("crm.detail", "Détail")}`} subtitle={`${stageLeads.length} leads · ${fmt(totalValue)} · ${avgDays}j ${t("crm.avg_in_stage", "en moyenne dans cette étape")}`} onClose={onClose} color={stageColor}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: t("crm.nb_leads", "Nb leads"), value: stageLeads.length, color: stageColor },
          { label: t("crm.total_value", "Valeur totale"), value: fmt(totalValue), color: stageColor },
          { label: t("crm.avg_value", "Valeur moy."), value: stageLeads.length > 0 ? fmt(totalValue / stageLeads.length) : "—", color: T.textMid },
          { label: t("crm.avg_days_in_stage", "Jours moy. dans étape"), value: avgDays > 0 ? `${avgDays}j` : "—", color: T.textMid },
        ].map((k, i) => (
          <div key={i} style={{ background: T.bg, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
        <TableHeader cols={["Lead", t("crm.value_label", "Valeur"), "Temp.", t("agent", "Agent"), t("crm.since_days", "Depuis (j)"), t("crm.activities_label", "Activités")]} />
        {sorted.map(lead => {
          const days = daysSince(lead.created_at);
          const actCount = (lead.activities || []).length;
          return (
            <div key={lead.id} className="kpi-lead-row" style={{
              display: "grid", gridTemplateColumns: "repeat(6, 1fr)", padding: "10px 6px",
              borderBottom: `1px solid ${T.border}`, transition: "background 0.15s",
            }} onClick={() => { onClose(); onSelectLead(lead); }}>
              <div style={{ padding: "0 6px" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{lead.company_name}</div>
                <div style={{ fontSize: 11, color: T.textLight }}>{lead.contact_first_name} {lead.contact_last_name}</div>
              </div>
              <div style={{ padding: "0 6px", display: "flex", alignItems: "center", fontWeight: 700, fontSize: 13, color: T.main }}>{fmt(lead.estimated_value)}</div>
              <div style={{ padding: "0 6px", display: "flex", alignItems: "center" }}>
                <span style={{ color: TEMP_COLORS[lead.temperature], fontWeight: 700, fontSize: 12 }}>
                  {lead.temperature === "Hot" ? "🔥" : lead.temperature === "Warm" ? "⚡" : "❄️"} {lead.temperature}
                </span>
              </div>
              <div style={{ padding: "0 6px", display: "flex", alignItems: "center", fontSize: 12, color: T.textMid }}>{lead.assigned_agent_name}</div>
              <div style={{ padding: "0 6px", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: days > 30 ? T.red : T.text }}>{days}j</span>
                {days > 30 && <span>⚠️</span>}
              </div>
              <div style={{ padding: "0 6px", display: "flex", alignItems: "center", fontSize: 12, color: T.textMid }}>{actCount}</div>
            </div>
          );
        })}
        {stageLeads.length === 0 && (
          <div style={{ padding: "24px", textAlign: "center", color: T.textLight, fontSize: 13 }}>{t("crm.no_lead_in_stage", "Aucun lead dans cette étape")}</div>
        )}
      </div>
    </ModalBase>
  );
}
