import { useState } from "react";
import { CRMLead, CRMReminder } from "./crmTypes";
import { SampleRequest } from "./sampleTypes";
import SamplesTeamAnalyticsModal from "./SamplesTeamAnalyticsModal";
import {
  LeadsActifsModal,
  ValeurPipelineModal,
  PipelinePondereModal,
  LeadsHotModal,
  TauxConversionModal,
  TempsClosingModal,
  DealsFermesModal,
  RemindersRetardModal,
  KpiModalType,
} from "./CRMKpiModals";
import { useLanguage } from "../i18n/LanguageContext";
import { T } from "../theme";
const fmt = (n: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

interface Props {
  leads: CRMLead[];
  samples?: SampleRequest[];
  onSelectLead?: (lead: CRMLead) => void;
}

function KpiCard({
  label, value, sub, color, icon, pulse, tooltip, tooltipContent, onClick,
}: {
  label: string; value: string; sub: string; color: string; icon?: string;
  pulse?: boolean; tooltip?: boolean; tooltipContent?: React.ReactNode; onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [showTip, setShowTip] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => { setHovered(true); if (tooltip) setShowTip(true); }}
      onMouseLeave={() => { setHovered(false); if (tooltip) setShowTip(false); }}
      style={{
        background: T.card,
        borderRadius: 12,
        padding: "14px 18px",
        minWidth: 150,
        flexShrink: 0,
        border: `1px solid ${hovered ? color + "44" : T.border}`,
        boxShadow: hovered
          ? `0 6px 20px rgba(0,0,0,0.12), 0 0 0 1px ${color}22`
          : "0 1px 4px rgba(0,0,0,0.06)",
        position: "relative",
        cursor: onClick ? "pointer" : tooltip ? "help" : "default",
        transform: hovered && onClick ? "scale(1.02)" : "scale(1)",
        transition: "all 0.2s ease",
        userSelect: "none",
      }}
    >
      {pulse && (
        <span style={{
          position: "absolute", top: 10, right: 10,
          width: 10, height: 10, borderRadius: "50%", background: T.red,
          animation: "pulse 1.5s infinite",
          display: "inline-block",
        }} />
      )}
      {onClick && hovered && !pulse && (
        <span style={{
          position: "absolute", top: 8, right: 10,
          fontSize: 12, color: color, opacity: 0.7, fontWeight: 700,
          transition: "opacity 0.2s",
        }}>→</span>
      )}
      <div style={{ fontSize: 10, fontWeight: 600, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1.1, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: T.textLight }}>
        {sub}
      </div>
      {tooltip && showTip && tooltipContent && (
        <div style={{
          position: "absolute", bottom: "110%", left: "50%", transform: "translateX(-50%)",
          background: "#111", color: "#fff", borderRadius: 10, padding: "10px 14px",
          fontSize: 11, whiteSpace: "nowrap", zIndex: 999,
          boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
          lineHeight: 1.6,
          pointerEvents: "none",
        }}>
          {tooltipContent}
          <div style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "6px solid #111" }} />
        </div>
      )}
    </div>
  );
}

export default function CRMKpiBar({ leads, samples = [], onSelectLead }: Props) {
  const { t } = useLanguage();
  const [activeModal, setActiveModal] = useState<KpiModalType | "samples" | null>(null);

  const activeLeads = leads.filter(l => l.stage !== "Fermé Gagné" && l.stage !== "Fermé Perdu" && !l.archived);
  const pipelineValue = activeLeads.reduce((s, l) => s + (l.estimated_value || 0), 0);
  const weightedPipeline = activeLeads.reduce((s, l) => s + (l.estimated_value || 0) * (l.closing_probability || 0) / 100, 0);
  const hotLeads = activeLeads.filter(l => l.temperature === "Hot").length;

  const totalLeads = leads.length;
  const wonLeads = leads.filter(l => l.stage === "Fermé Gagné").length;
  const convRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;
  const convColor = convRate > 30 ? T.green : convRate >= 15 ? T.orange : T.red;

  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 86400000);
  const recentlyWon = leads.filter(l => l.stage === "Fermé Gagné" && l.closed_at && new Date(l.closed_at) >= sixMonthsAgo);
  const avgClosingDays = recentlyWon.length > 0
    ? Math.round(recentlyWon.reduce((s, l) => {
        const created = new Date(l.created_at).getTime();
        const closed = new Date(l.closed_at!).getTime();
        return s + (closed - created) / 86400000;
      }, 0) / recentlyWon.length)
    : 0;

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dealsThisMonth = leads.filter(l => l.stage === "Fermé Gagné" && l.closed_at && new Date(l.closed_at) >= thisMonthStart);
  const dealsThisMonthValue = dealsThisMonth.reduce((s, l) => s + (l.estimated_value || 0), 0);

  const allReminders: CRMReminder[] = leads.flatMap(l => l.reminders || []);
  const overdueReminders = allReminders.filter(r => !r.completed && new Date(r.reminder_at) < now).length;

  const activeSamples = samples.filter(s => !["Follow-up complété", "Rejeté"].includes(s.status));
  const samplesEnAttente = samples.filter(s => s.status === "En attente d'approbation").length;
  const samplesEnvoyes = samples.filter(s => s.status === "Envoyé").length;
  const samplesFollowUpRequired = samples.filter(s => {
    if (s.status === "Follow-up requis") return true;
    if (s.status === "Livré" && s.timer_expires_at && new Date(s.timer_expires_at) < now) return true;
    return false;
  }).length;

  const handleSelectLead = (lead: CRMLead) => {
    if (onSelectLead) onSelectLead(lead);
  };

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.4); }
        }
      `}</style>
      <div style={{ overflowX: "auto", paddingBottom: 2 }}>
        <div style={{ display: "flex", gap: 12, minWidth: "max-content" }}>
          <KpiCard
            label={t("crm.leads_active", "Leads actifs")}
            value={activeLeads.length.toString()}
            sub={`${leads.filter(l => l.stage !== "Fermé Gagné" && l.stage !== "Fermé Perdu").length} ${t("crm.in_pipeline", "dans le pipeline")}`}
            color={T.main}
            icon="◎"
            onClick={() => setActiveModal("leads_actifs")}
          />
          <KpiCard
            label={t("crm.pipeline_value", "Valeur du pipeline")}
            value={fmt(pipelineValue)}
            sub={`${activeLeads.length} ${t("crm.opportunities_active", "opportunités actives")}`}
            color={T.main}
            icon="💼"
            onClick={() => setActiveModal("valeur_pipeline")}
          />
          <KpiCard
            label={t("crm.pipeline_pondere", "Pipeline pondéré")}
            value={fmt(weightedPipeline)}
            sub={t("crm.probable_revenue", "Revenu probable")}
            color="#0891b2"
            icon="⚖️"
            tooltip
            tooltipContent={
              <>
                <strong>{t("crm.pipeline_pondere", "Pipeline pondéré")}</strong><br />
                {t("crm.weighted_pipeline_formula", "Σ (Valeur estimée × Probabilité %)")}<br />
                {t("crm.probable_revenue", "Revenu probable")}
              </>
            }
            onClick={() => setActiveModal("pipeline_pondere")}
          />
          <KpiCard
            label={`${t("crm.hot_leads", "Leads Hot")} 🔥`}
            value={hotLeads.toString()}
            sub={`sur ${activeLeads.length} ${t("crm.leads_active", "leads actifs")}`}
            color={T.red}
            icon="🔥"
            onClick={() => setActiveModal("leads_hot")}
          />
          <KpiCard
            label={t("crm.conversion_rate", "Taux de conversion")}
            value={`${convRate.toFixed(1)}%`}
            sub={`${wonLeads} ${t("crm.won_total", "gagnés")} / ${totalLeads} total`}
            color={convColor}
            icon="🎯"
            onClick={() => setActiveModal("taux_conversion")}
          />
          <KpiCard
            label={t("crm.temps_closing_avg", "Temps moyen closing")}
            value={avgClosingDays > 0 ? `${avgClosingDays}j` : "—"}
            sub={t("crm.last_6_months", "6 derniers mois")}
            color={T.textMid}
            icon="⏱️"
            onClick={() => setActiveModal("temps_closing")}
          />
          <KpiCard
            label={t("crm.deals_closed_month", "Deals fermés ce mois")}
            value={dealsThisMonth.length.toString()}
            sub={dealsThisMonth.length > 0 ? fmt(dealsThisMonthValue) : t("crm.none_yet", "Aucun encore")}
            color={T.green}
            icon="✅"
            onClick={() => setActiveModal("deals_fermes")}
          />
          <KpiCard
            label={t("crm.reminders_overdue", "Reminders en retard")}
            value={overdueReminders.toString()}
            sub={overdueReminders > 0 ? t("crm.action_required", "Action requise!") : t("crm.all_up_to_date", "Tout est à jour")}
            color={overdueReminders > 0 ? T.red : T.green}
            icon="🔔"
            pulse={overdueReminders > 0}
            onClick={() => setActiveModal("reminders_retard")}
          />

          <SamplesKpiCard
            activeSamples={activeSamples.length}
            samplesEnAttente={samplesEnAttente}
            samplesEnvoyes={samplesEnvoyes}
            samplesFollowUpRequired={samplesFollowUpRequired}
            onClick={() => setActiveModal("samples")}
          />
        </div>
      </div>

      {activeModal === "leads_actifs" && (
        <LeadsActifsModal leads={leads} onClose={() => setActiveModal(null)} onSelectLead={handleSelectLead} />
      )}
      {activeModal === "valeur_pipeline" && (
        <ValeurPipelineModal leads={leads} onClose={() => setActiveModal(null)} onSelectLead={handleSelectLead} />
      )}
      {activeModal === "pipeline_pondere" && (
        <PipelinePondereModal leads={leads} onClose={() => setActiveModal(null)} onSelectLead={handleSelectLead} />
      )}
      {activeModal === "leads_hot" && (
        <LeadsHotModal leads={leads} onClose={() => setActiveModal(null)} onSelectLead={handleSelectLead} />
      )}
      {activeModal === "taux_conversion" && (
        <TauxConversionModal leads={leads} onClose={() => setActiveModal(null)} onSelectLead={handleSelectLead} />
      )}
      {activeModal === "temps_closing" && (
        <TempsClosingModal leads={leads} onClose={() => setActiveModal(null)} onSelectLead={handleSelectLead} />
      )}
      {activeModal === "deals_fermes" && (
        <DealsFermesModal leads={leads} onClose={() => setActiveModal(null)} onSelectLead={handleSelectLead} />
      )}
      {activeModal === "reminders_retard" && (
        <RemindersRetardModal leads={leads} onClose={() => setActiveModal(null)} onSelectLead={handleSelectLead} />
      )}
      {activeModal === "samples" && (
        <SamplesTeamAnalyticsModal
          samples={samples}
          leads={leads}
          onClose={() => setActiveModal(null)}
        />
      )}
    </>
  );
}

function SamplesKpiCard({ activeSamples, samplesEnAttente, samplesEnvoyes, samplesFollowUpRequired, onClick }: {
  activeSamples: number; samplesEnAttente: number; samplesEnvoyes: number; samplesFollowUpRequired: number; onClick: () => void;
}) {
  const { t } = useLanguage();
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: T.card,
        borderRadius: 12,
        padding: "14px 18px",
        minWidth: 170,
        flexShrink: 0,
        border: `1.5px solid ${samplesFollowUpRequired > 0 ? T.gold : hovered ? T.gold + "88" : "rgba(212,160,23,0.35)"}`,
        boxShadow: hovered
          ? `0 6px 20px rgba(0,0,0,0.12), 0 0 0 2px rgba(212,160,23,0.2)`
          : samplesFollowUpRequired > 0 ? `0 0 0 2px rgba(212,160,23,0.15), 0 2px 8px rgba(0,0,0,0.08)` : "0 1px 4px rgba(0,0,0,0.06)",
        position: "relative",
        cursor: "pointer",
        transform: hovered ? "scale(1.02)" : "scale(1)",
        transition: "all 0.2s ease",
        userSelect: "none",
      }}
    >
      {samplesFollowUpRequired > 0 && (
        <span style={{
          position: "absolute", top: 10, right: 10,
          width: 10, height: 10, borderRadius: "50%", background: "#ef4444",
          animation: "pulse 1.5s infinite",
          display: "inline-block",
        }} />
      )}
      {hovered && !samplesFollowUpRequired && (
        <span style={{ position: "absolute", top: 8, right: 10, fontSize: 12, color: T.gold, opacity: 0.7, fontWeight: 700 }}>→</span>
      )}
      <div style={{ fontSize: 10, fontWeight: 600, color: T.gold, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
        📦 {t("crm.samples_circulation", "Samples en circulation")}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: T.gold, lineHeight: 1.1, marginBottom: 4 }}>
        {activeSamples}
      </div>
      <div style={{ fontSize: 11 }}>
        <span style={{ color: "#8e8e93" }}>{samplesEnAttente} {t("crm.waiting_label", "attente")}</span>
        <span style={{ color: "#8e8e93" }}> · {samplesEnvoyes} {t("crm.sent_label", "envoyés")}</span>
        {samplesFollowUpRequired > 0 && (
          <span style={{ color: "#ef4444", fontWeight: 700, animation: "pulse 1.5s infinite" }}> · {samplesFollowUpRequired} FU {t("crm.required_label", "requis")}</span>
        )}
      </div>
    </div>
  );
}
