import React, { useMemo } from "react";
import { CRMLead, STAGES, Stage, STAGE_COLORS, TEMP_COLORS } from "../crmTypes";
import { T, fmt } from "./workstationTypes";
import { useCurrentAgent } from "../../hooks/useCurrentAgent";
import { useLanguage } from "../../i18n/LanguageContext";

interface Props {
  leads: CRMLead[];
  onOpenLead: (leadId: string) => void;
  onNavigatePipeline: () => void;
}

const ACTIVE_STAGES: Stage[] = ["Nouveau Lead", "Premier Contact", "Qualification", "Proposition Envoyée", "Négociation"];

export default function WidgetPipeline({ leads, onOpenLead, onNavigatePipeline }: Props) {
  const { t } = useLanguage();
  const agent = useCurrentAgent();
  const myLeads = useMemo(() => leads.filter(l => l.assigned_agent_id === agent.id), [leads, agent.id]);

  const byStage = useMemo(() => {
    const map: Record<string, CRMLead[]> = {};
    ACTIVE_STAGES.forEach(s => { map[s] = []; });
    myLeads.forEach(l => {
      if (ACTIVE_STAGES.includes(l.stage as Stage)) {
        map[l.stage] = [...(map[l.stage] || []), l];
      }
    });
    return map;
  }, [myLeads]);

  const totalPipelineValue = myLeads
    .filter(l => ACTIVE_STAGES.includes(l.stage as Stage))
    .reduce((s, l) => s + l.estimated_value, 0);

  return (
    <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: T.text }}>{t("ws.pipeline.title", "Mon Pipeline")}</div>
          <div style={{ fontSize: 12, color: T.textMid, marginTop: 2 }}>
            {myLeads.filter(l => ACTIVE_STAGES.includes(l.stage as Stage)).length} {t("ws.pipeline.active_leads", "leads actifs")} · {fmt(totalPipelineValue)}
          </div>
        </div>
        <button
          onClick={onNavigatePipeline}
          style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", color: T.main, fontFamily: "inherit" }}
        >
          {t("ws.pipeline.view_all", "Voir tout →")}
        </button>
      </div>

      <div style={{ overflowX: "auto", paddingBottom: 4 }}>
        <div style={{ display: "flex", gap: 8, minWidth: "max-content" }}>
          {ACTIVE_STAGES.map(stage => {
            const stageLeads = byStage[stage] || [];
            const stageValue = stageLeads.reduce((s, l) => s + l.estimated_value, 0);
            const color = STAGE_COLORS[stage];
            return (
              <div key={stage} style={{ width: 160, flexShrink: 0 }}>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "6px 8px", background: `${color}18`, borderRadius: "8px 8px 0 0",
                  borderBottom: `2px solid ${color}`,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: 0.3 }}>
                    {stage.replace("Proposition Envoyée", "Prop. Envoyée")}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.textMid }}>
                    {stageLeads.length}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: T.textMid, padding: "4px 8px 6px", fontWeight: 600 }}>
                  {fmt(stageValue)}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 220, overflowY: "auto" }}>
                  {stageLeads.length === 0 && (
                    <div style={{ fontSize: 11, color: T.textLight, fontStyle: "italic", padding: "6px 8px" }}>{t("ws.pipeline.empty", "Vide")}</div>
                  )}
                  {stageLeads.map(lead => (
                    <div
                      key={lead.id}
                      onClick={() => onOpenLead(lead.id)}
                      style={{
                        background: T.cardAlt, borderRadius: 7, padding: "7px 8px",
                        cursor: "pointer", border: `1px solid ${T.border}`,
                        transition: "transform 0.1s, box-shadow 0.1s",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                        (e.currentTarget as HTMLElement).style.boxShadow = "0 3px 8px rgba(0,0,0,0.1)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.transform = "none";
                        (e.currentTarget as HTMLElement).style.boxShadow = "none";
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 3, lineHeight: 1.2 }}>
                        {lead.company_name}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: T.main }}>{fmt(lead.estimated_value)}</span>
                        <span style={{
                          fontSize: 9, fontWeight: 800,
                          color: TEMP_COLORS[lead.temperature],
                          background: `${TEMP_COLORS[lead.temperature]}18`,
                          padding: "1px 5px", borderRadius: 3,
                        }}>
                          {lead.temperature}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
