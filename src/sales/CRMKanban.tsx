import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  CRMLead, Stage, STAGES, STAGE_COLORS, STAGE_BG,
  TEMP_COLORS, TEMP_BG, TEMP_LABEL, TYPE_COLORS, TYPE_BG,
} from "./crmTypes";
import { SampleRequest, SampleStatus, SAMPLE_STATUS_COLORS, SAMPLE_STATUS_BG } from "./sampleTypes";
import { StageDetailModal } from "./CRMKpiModals";
import { useTeamAgents } from "../hooks/useAgents";
import { useLanguage } from "../i18n/LanguageContext";
import { T } from "../theme";
const fmt = (n: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

interface ContextMenu {
  leadId: string;
  x: number;
  y: number;
  sub: null | "temperature" | "move" | "assign";
}

interface Props {
  leads: CRMLead[];
  samples?: SampleRequest[];
  onLeadClick: (lead: CRMLead) => void;
  onStageChange: (leadId: string, newStage: Stage) => void;
  onLeadUpdate: (lead: CRMLead) => void;
  onLeadDelete: (leadId: string) => void;
}

function getLeadSampleStatus(leadId: string, samples: SampleRequest[]): SampleStatus | null {
  const leadSamples = samples.filter(s => s.lead_id === leadId);
  if (leadSamples.length === 0) return null;
  const priority: SampleStatus[] = [
    "Follow-up requis",
    "En attente d'approbation",
    "En préparation",
    "Approuvé",
    "Envoyé",
    "Livré",
    "Follow-up complété",
    "Rejeté",
  ];
  for (const status of priority) {
    if (leadSamples.some(s => s.status === status)) return status;
  }
  return leadSamples[0].status;
}

export default function CRMKanban({ leads, samples = [], onLeadClick, onStageChange, onLeadUpdate, onLeadDelete }: Props) {
  const { t } = useLanguage();
  const agentsList = useTeamAgents();
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<Stage | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [stageModal, setStageModal] = useState<Stage | null>(null);
  const dragRef = useRef<string | null>(null);

  const byStage = (stage: Stage) => leads.filter(l => l.stage === stage);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    dragRef.current = leadId;
    setDragging(leadId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDragging(null);
    setDragOver(null);
    dragRef.current = null;
  };

  const handleDrop = (e: React.DragEvent, stage: Stage) => {
    e.preventDefault();
    const id = dragRef.current;
    if (id) {
      const lead = leads.find(l => l.id === id);
      if (lead && lead.stage !== stage) onStageChange(id, stage);
    }
    setDragging(null);
    setDragOver(null);
  };

  const openContext = (e: React.MouseEvent, leadId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ leadId, x: e.clientX, y: e.clientY, sub: null });
  };

  const closeContext = () => setContextMenu(null);

  const ctxLead = contextMenu ? leads.find(l => l.id === contextMenu.leadId) : null;

  return (
    <div
      style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, flex: 1 }}
      onClick={() => { closeContext(); }}
    >
      {STAGES.map(stage => {
        const stageLeads = byStage(stage);
        const stageValue = stageLeads.reduce((s, l) => s + (l.estimated_value || 0), 0);
        const isOver = dragOver === stage;

        return (
          <div
            key={stage}
            style={{
              minWidth: 240, width: 240, flexShrink: 0, display: "flex", flexDirection: "column",
              background: isOver ? STAGE_BG[stage] : "rgba(0,0,0,0.06)",
              borderRadius: 12, border: isOver ? `2px solid ${STAGE_COLORS[stage]}` : "2px solid transparent",
              transition: "border 0.15s, background 0.15s",
              maxHeight: "calc(100vh - 240px)",
            }}
            onDragOver={e => { e.preventDefault(); setDragOver(stage); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => handleDrop(e, stage)}
          >
            <div
              onClick={() => setStageModal(stage)}
              style={{
                padding: "12px 14px 10px",
                borderBottom: `2px solid ${STAGE_COLORS[stage]}`,
                borderRadius: "10px 10px 0 0",
                background: `${STAGE_COLORS[stage]}18`,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseOver={e => (e.currentTarget.style.background = `${STAGE_COLORS[stage]}28`)}
              onMouseOut={e => (e.currentTarget.style.background = `${STAGE_COLORS[stage]}18`)}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: STAGE_COLORS[stage], textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {stage}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{
                    background: STAGE_COLORS[stage], color: "#fff",
                    borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 700,
                  }}>
                    {stageLeads.length}
                  </span>
                  <span style={{ fontSize: 10, color: STAGE_COLORS[stage], opacity: 0.6 }}>→</span>
                </div>
              </div>
              {stageLeads.length > 0 && (
                <div style={{ fontSize: 11, color: STAGE_COLORS[stage], fontWeight: 600, opacity: 0.8 }}>
                  {fmt(stageValue)}
                </div>
              )}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px 8px" }}>
              {stageLeads.map(lead => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  sampleStatus={getLeadSampleStatus(lead.id, samples)}
                  isDragging={dragging === lead.id}
                  onClick={() => onLeadClick(lead)}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onContextMenu={openContext}
                  onDotsClick={openContext}
                />
              ))}
              {stageLeads.length === 0 && (
                <div style={{ textAlign: "center", padding: "24px 8px", color: "rgba(255,255,255,0.25)", fontSize: 12 }}>
                  {t("crm.drag_lead_here", "Glisser un lead ici")}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {contextMenu && ctxLead && createPortal(
        <>
        <div onClick={closeContext} style={{ position: "fixed", inset: 0, zIndex: 9998 }} />
        <div
          style={{
            position: "fixed", left: contextMenu.x, top: contextMenu.y,
            background: T.bgCard, borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            border: "1px solid rgba(0,0,0,0.08)", zIndex: 9999, minWidth: 200,
            overflow: "hidden",
          }}
          onClick={e => e.stopPropagation()}
        >
          {contextMenu.sub === null && (
            <>
              <CtxItem label={`🌡️ ${t("crm.change_temperature", "Changer température")}`} onClick={() => setContextMenu(c => c ? { ...c, sub: "temperature" } : null)} hasArrow />
              <CtxItem label={`➜ ${t("crm.move_to", "Déplacer vers")}`} onClick={() => setContextMenu(c => c ? { ...c, sub: "move" } : null)} hasArrow />
              <CtxItem label={`👤 ${t("crm.assign_to", "Assigner à")}`} onClick={() => setContextMenu(c => c ? { ...c, sub: "assign" } : null)} hasArrow />
              <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "4px 0" }} />
              <CtxItem label={`🗄️ ${t("crm.archive_lead", "Archiver le lead")}`} onClick={() => { onLeadUpdate({ ...ctxLead, archived: true }); closeContext(); }} />
              <CtxItem label={`🗑️ ${t("crm.delete_lead", "Supprimer le lead")}`} color="#ef4444" onClick={() => { setDeleteConfirm(ctxLead.id); closeContext(); }} />
            </>
          )}
          {contextMenu.sub === "temperature" && (
            <>
              <CtxBack onClick={() => setContextMenu(c => c ? { ...c, sub: null } : null)} />
              {(["Hot", "Warm", "Cold"] as const).map(tp => (
                <CtxItem key={tp} label={`${TEMP_LABEL[tp]}`}
                  onClick={() => { onLeadUpdate({ ...ctxLead, temperature: tp }); closeContext(); }}
                  active={ctxLead.temperature === tp}
                />
              ))}
            </>
          )}
          {contextMenu.sub === "move" && (
            <>
              <CtxBack onClick={() => setContextMenu(c => c ? { ...c, sub: null } : null)} />
              {STAGES.map(s => (
                <CtxItem key={s} label={s}
                  onClick={() => { onStageChange(ctxLead.id, s); closeContext(); }}
                  active={ctxLead.stage === s}
                />
              ))}
            </>
          )}
          {contextMenu.sub === "assign" && (
            <>
              <CtxBack onClick={() => setContextMenu(c => c ? { ...c, sub: null } : null)} />
              {agentsList.map(a => (
                <CtxItem key={a.id} label={a.name}
                  onClick={() => { onLeadUpdate({ ...ctxLead, assigned_agent_id: a.id, assigned_agent_name: a.name, assigned_agent_initials: a.initials, assigned_agent_color: a.color }); closeContext(); }}
                  active={ctxLead.assigned_agent_id === a.id}
                />
              ))}
            </>
          )}
        </div>
        </>,
        document.body
      )}

      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(230,228,224,0.35)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: T.bgCard, borderRadius: 16, padding: 28, maxWidth: 380, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: T.text }}>{t("crm.delete_lead_confirm", "Supprimer ce lead?")}</div>
            <div style={{ fontSize: 14, color: T.textMid, marginBottom: 24 }}>{t("crm.delete_irreversible", "Cette action est irréversible.")}</div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #ddd", background: T.bgCard, cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}>{t("cancel", "Annuler")}</button>
              <button onClick={() => { onLeadDelete(deleteConfirm); setDeleteConfirm(null); }} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: T.red, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 700 }}>{t("delete", "Supprimer")}</button>
            </div>
          </div>
        </div>
      )}

      {stageModal && (
        <StageDetailModal
          stage={stageModal}
          leads={leads}
          onClose={() => setStageModal(null)}
          onSelectLead={lead => { setStageModal(null); onLeadClick(lead); }}
        />
      )}
    </div>
  );
}

function LeadCard({ lead, sampleStatus, isDragging, onClick, onDragStart, onDragEnd, onContextMenu, onDotsClick }: {
  lead: CRMLead;
  sampleStatus: SampleStatus | null;
  isDragging: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  onDotsClick: (e: React.MouseEvent, id: string) => void;
}) {
  const { t } = useLanguage();
  const days = daysSince(lead.last_activity_at);
  const now = new Date();
  const overdueReminder = lead.reminders?.some(r => !r.completed && new Date(r.reminder_at) < now);
  const hasSample = sampleStatus !== null;
  const sampleColor = sampleStatus ? SAMPLE_STATUS_COLORS[sampleStatus] : "#d4a017";
  const sampleBg = sampleStatus ? SAMPLE_STATUS_BG[sampleStatus] : "rgba(212,160,23,0.15)";
  const isFollowUpRequired = sampleStatus === "Follow-up requis";

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, lead.id)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onContextMenu={e => onContextMenu(e, lead.id)}
      style={{
        background: isDragging
          ? "rgba(99,102,241,0.08)"
          : hasSample
            ? "linear-gradient(135deg, #fffbea 0%, #fef3c7 40%, #fffdf5 100%)"
            : "#ffffff",
        borderRadius: 10,
        padding: "12px 12px 10px",
        marginBottom: 8,
        border: hasSample ? `1.5px solid ${sampleColor}` : "1px solid rgba(0,0,0,0.08)",
        boxShadow: isDragging
          ? "0 8px 24px rgba(99,102,241,0.18)"
          : hasSample
            ? `0 0 0 2px ${sampleBg}, 0 2px 8px ${sampleBg}`
            : "0 1px 3px rgba(0,0,0,0.06)",
        cursor: "grab",
        opacity: isDragging ? 0.6 : 1,
        transform: isDragging ? "rotate(2deg)" : "none",
        transition: "box-shadow 0.15s, transform 0.15s, opacity 0.15s",
        position: "relative",
        userSelect: "none",
      }}
    >
      {overdueReminder && (
        <span style={{
          position: "absolute", top: 8, right: 30, width: 8, height: 8, borderRadius: "50%",
          background: T.red, display: "inline-block", animation: "pulse 1.5s infinite",
        }} />
      )}

      {hasSample && (
        <span style={{
          position: "absolute", top: 8, left: 8,
          background: sampleColor, color: "#fff", borderRadius: 6, padding: "2px 6px",
          fontSize: 10, fontWeight: 700,
          animation: isFollowUpRequired ? "pulse 1.5s infinite" : "none",
        }}>
          📦 {sampleStatus}
        </span>
      )}

      <button
        onClick={e => { e.stopPropagation(); onDotsClick(e, lead.id); }}
        style={{
          position: "absolute", top: 6, right: 6, background: "none", border: "none",
          cursor: "pointer", color: T.textLight, fontSize: 14, padding: "2px 4px",
          borderRadius: 4, lineHeight: 1,
        }}
      >
        ···
      </button>

      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 3, paddingRight: 20, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {lead.company_name}
      </div>

      <div style={{ fontSize: 12, color: T.textMid, marginBottom: 6 }}>
        {lead.contact_first_name} {lead.contact_last_name}
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: T.main, marginBottom: 8 }}>
        ~{fmt(lead.estimated_value)} {t("crm.per_year", "/ an")}
      </div>

      <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{
          fontSize: 10, fontWeight: 600, borderRadius: 6, padding: "2px 7px",
          background: TYPE_BG[lead.type as keyof typeof TYPE_BG],
          color: TYPE_COLORS[lead.type as keyof typeof TYPE_COLORS],
        }}>
          {lead.type}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600, borderRadius: 6, padding: "2px 7px",
          background: TEMP_BG[lead.temperature as keyof typeof TEMP_BG],
          color: TEMP_COLORS[lead.temperature as keyof typeof TEMP_COLORS],
        }}>
          {TEMP_LABEL[lead.temperature as keyof typeof TEMP_LABEL]}
        </span>
        <span style={{ fontSize: 10, color: "#8e8e93", padding: "2px 5px" }}>
          {lead.closing_probability}%
        </span>
      </div>

      <div style={{ fontSize: 11, color: T.textLight, marginBottom: 10, lineHeight: 1.4 }}>
        {lead.reminders?.find(r => !r.completed && new Date(r.reminder_at) > new Date())
          ? `${t("crm.next_action", "Prochaine action")}: ${lead.reminders.find(r => !r.completed && new Date(r.reminder_at) > new Date())!.title}`
          : <em>{t("crm.no_action_planned", "Aucune action planifiée")}</em>
        }
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 11,
            color: days > 14 ? T.red : days > 7 ? T.orange : T.textLight,
            fontWeight: days > 7 ? 600 : 400,
          }}>
            {days > 14 ? "⚠️ " : ""}{t("crm.days_ago", `il y a ${days}j`)}
          </span>
          {(lead.activities || []).length > 0 && (
            <span title={`${(lead.activities || []).length} ${t("crm.view_all_history", "activités")}`} style={{
              fontSize: 10, color: T.textLight, background: "rgba(0,0,0,0.06)",
              borderRadius: 10, padding: "1px 6px", fontWeight: 600,
            }}>
              ◎ {(lead.activities || []).length}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {lead.vendeur_code && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: "1px 5px",
              borderRadius: 4, background: "rgba(99,102,241,0.08)",
              color: "#111", fontFamily: "monospace", letterSpacing: 0.2,
            }}>
              {lead.vendeur_code}
            </span>
          )}
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: lead.assigned_agent_color,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 10, fontWeight: 700,
            flexShrink: 0,
          }}>
            {lead.assigned_agent_initials}
          </div>
        </div>
      </div>
    </div>
  );
}

function CtxItem({ label, onClick, hasArrow, active, color }: {
  label: string; onClick: () => void; hasArrow?: boolean; active?: boolean; color?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        width: "100%", padding: "9px 14px", border: "none", background: active ? "rgba(99,102,241,0.08)" : "transparent",
        cursor: "pointer", fontSize: 13, color: color || (active ? "#111" : "#1c1c1e"),
        fontFamily: "inherit", textAlign: "left", fontWeight: active ? 600 : 400,
        transition: "background 0.1s",
      }}
      onMouseOver={e => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
      onMouseOut={e => (e.currentTarget.style.background = active ? "rgba(99,102,241,0.08)" : "transparent")}
    >
      {label}
      {hasArrow && <span style={{ color: "#8e8e93" }}>›</span>}
    </button>
  );
}

function CtxBack({ onClick }: { onClick: () => void }) {
  const { t } = useLanguage();
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        width: "100%", padding: "9px 14px", border: "none",
        background: "transparent", cursor: "pointer", fontSize: 12,
        color: "#8e8e93", fontFamily: "inherit", borderBottom: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      ‹ {t("back", "Retour")}
    </button>
  );
}
