import React, { useState, useEffect, useCallback } from "react";
import {
  SampleRequest, SampleStatus, SAMPLE_STATUS_COLORS, SAMPLE_STATUS_BG,
  FollowUpResult, FOLLOWUP_NEXT_STEPS, FOLLOWUP_NEUTRAL_REASONS, FOLLOWUP_NEGATIVE_REASONS,
} from "./sampleTypes";
import { CRMLead, CRMActivity, CRMReminder } from "./crmTypes";
import { supabase } from "../supabaseClient";
import { useApp } from "../AppContext";
import { useCurrentAgent } from "../hooks/useCurrentAgent";
import { T } from "../theme";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-CA", { year: "numeric", month: "short", day: "numeric" });

const fmtShort = (iso: string) =>
  new Date(`${iso}T00:00`).toLocaleDateString("fr-CA", { month: "short", day: "numeric" });

function useCountdown(expiresAt?: string) {
  const [text, setText] = useState("");
  const [urgency, setUrgency] = useState<"ok" | "warn" | "critical" | "expired">("ok");

  useEffect(() => {
    if (!expiresAt) { setText(""); return; }
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setText("EXPIRÉ"); setUrgency("expired"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setText(`${h}h ${m}m`);
      setUrgency(h < 6 ? "critical" : h < 24 ? "warn" : "ok");
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return { text, urgency };
}

const STATUS_SEQUENCE: SampleStatus[] = [
  "En attente d'approbation", "Approuvé", "En préparation", "Envoyé", "Livré", "Follow-up requis", "Follow-up complété",
];

const TRUCK_ICON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: "middle", marginRight: 3 }}>
    <rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);

interface Props {
  samples: SampleRequest[];
  lead: CRMLead;
  onSamplesChange: (samples: SampleRequest[]) => void;
  onAddActivity: (act: Partial<CRMActivity>) => void;
  onOpenAddActivity?: (prefill?: Partial<CRMActivity>) => void;
}

export default function SamplesSection({ samples, lead, onSamplesChange, onAddActivity, onOpenAddActivity }: Props) {
  const { reloadSamples, navigate, updateLead } = useApp();
  const agent = useCurrentAgent();
  const [detailSample, setDetailSample] = useState<SampleRequest | null>(null);
  const [followUpSample, setFollowUpSample] = useState<SampleRequest | null>(null);

  const updateSample = useCallback((updated: SampleRequest, activityDescription?: string) => {
    onSamplesChange(samples.map(s => s.id === updated.id ? updated : s));
    if (activityDescription) {
      onAddActivity({
        type: "Note interne",
        title: activityDescription,
        description: activityDescription,
        activity_at: new Date().toISOString(),
      });
    }
  }, [samples, onSamplesChange, onAddActivity]);

  const handleFollowUpComplete = async (
    sample: SampleRequest,
    result: FollowUpResult,
    notes: string,
    nextStep: string,
    reason: string,
    createReminder: boolean,
    reminderDate: string,
    reminderTitle: string,
    createPricelist: boolean,
    createOrder: boolean,
    createAnotherSample: boolean,
  ) => {
    const now = new Date().toISOString();
    const resultIcon = result === "Positif" ? "✅" : result === "Neutre" ? "➖" : "❌";
    const actDesc = nextStep || reason;
    const activityTitle = `Follow-up sample complété — Résultat : ${result}`;
    const fullActivityDesc = `${resultIcon} ${activityTitle}${actDesc ? `\nDétail : ${actDesc}` : ""}\nNotes : ${notes}`;
    const companyName = sample.lead_company_name || lead.company_name;

    const updated: SampleRequest = {
      ...sample,
      status: "Follow-up complété",
      follow_up_completed_at: now,
      follow_up_notes: notes,
      follow_up_result: result,
      follow_up_next_step: nextStep,
      follow_up_reason: reason,
      follow_up_agent_name: agent.name,
      timer_expires_at: undefined,
      updated_at: now,
    };

    await Promise.all([
      supabase.from("sample_requests").update({
        status: "Follow-up complété",
        follow_up_completed_at: now,
        follow_up_notes: notes,
        follow_up_result: result,
        follow_up_next_step: nextStep,
        follow_up_reason: reason,
        follow_up_agent_name: agent.name,
        timer_expires_at: null,
        updated_at: now,
      }).eq("id", sample.id),

      supabase.from("sample_activities").insert([
        {
          sample_request_id: sample.id,
          type: "Follow-up complété",
          description: `${resultIcon} Follow-up sample — Résultat : ${result}${actDesc ? ` — ${actDesc}` : ""}\n${notes}`,
          actor_name: agent.name,
          created_at: now,
        },
        {
          sample_request_id: sample.id,
          type: "Notification admin",
          description: `📋 Follow-up complété pour ${companyName} par ${agent.name} — Résultat : ${result}${actDesc ? ` — ${actDesc}` : ""}`,
          actor_name: "Système",
          created_at: now,
        },
      ]),

      supabase.from("crm_activities").insert({
        lead_id: lead.id,
        type: "Note interne",
        title: activityTitle,
        description: fullActivityDesc,
        logged_by_name: agent.name,
        logged_by_initials: agent.initials,
        activity_at: now,
        created_at: now,
      }),

      ...(createReminder && reminderDate ? [
        supabase.from("crm_reminders").insert({
          lead_id: lead.id,
          title: reminderTitle || `Relance sample — ${sample.items?.map(i => i.product_name).join(", ")}`,
          reminder_at: new Date(`${reminderDate}T09:00:00`).toISOString(),
          completed: false,
          priority: "Moyenne",
          recurrence: "Aucune",
          notes: `Follow-up sample — ${result}`,
          assigned_agent_name: agent.name,
          created_at: now,
        }),
      ] : []),
    ]);

    const newActivity: CRMActivity = {
      id: `a${Date.now()}`,
      lead_id: lead.id,
      type: "Note interne",
      title: activityTitle,
      description: fullActivityDesc,
      logged_by_name: agent.name,
      logged_by_initials: agent.initials,
      activity_at: now,
      created_at: now,
    };

    let updatedLead = {
      ...lead,
      activities: [newActivity, ...(lead.activities || [])],
      last_activity_at: now,
    };

    if (createReminder && reminderDate) {
      const newReminder: CRMReminder = {
        id: `r${Date.now()}`,
        lead_id: lead.id,
        title: reminderTitle || `Relance sample — ${sample.items?.map(i => i.product_name).join(", ")}`,
        reminder_at: new Date(`${reminderDate}T09:00:00`).toISOString(),
        completed: false,
        priority: "Moyenne",
        recurrence: "Aucune",
        notes: `Follow-up sample — ${result}`,
        assigned_agent_name: agent.name,
        created_at: now,
      };
      updatedLead = { ...updatedLead, reminders: [newReminder, ...(lead.reminders || [])] };
    }

    updateLead(updatedLead);
    updateSample(updated, activityTitle);
    setFollowUpSample(null);
    await reloadSamples();

    if (createPricelist) {
      navigate("pricelist_generator", {
        companyName: lead.company_name,
        address: lead.address || "",
        clientType: lead.type || "",
        leadId: lead.id,
      });
    } else if (createOrder) {
      navigate("orders_new", {
        companyName: lead.company_name,
        leadId: lead.id,
      });
    } else if (createAnotherSample && onOpenAddActivity) {
      onOpenAddActivity({
        type: "Note interne",
        title: `Nouveau sample pour ${lead.company_name}`,
        description: "",
      });
    }
  };

  return (
    <div style={{ background: T.bgCard, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
      <div style={{
        padding: "14px 20px", borderBottom: `1px solid ${T.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "linear-gradient(135deg, #fffbea 0%, #fff 100%)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>📦</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Samples</span>
          <span style={{
            fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "2px 9px",
            background: samples.length > 0 ? T.gold : "#e5e7eb",
            color: samples.length > 0 ? "#fff" : T.textLight,
          }}>
            {samples.length}
          </span>
        </div>
      </div>

      {samples.length === 0 ? (
        <div style={{ padding: "40px 20px", textAlign: "center", color: T.textLight, fontSize: 13 }}>
          Aucun sample pour ce lead.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${T.border}`, background: T.bg }}>
                <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 700, color: T.textLight, whiteSpace: "nowrap" }}>#</th>
                <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 700, color: T.textLight, whiteSpace: "nowrap" }}>Date</th>
                <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 700, color: T.textLight }}>Produits</th>
                <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: T.textLight }}>Qté</th>
                <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: T.textLight }}>Statut</th>
                <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: T.textLight }}>ETA</th>
                <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: T.textLight }}>Timer 72h</th>
                <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: T.textLight }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {samples.map((sample, i) => (
                <SampleRow
                  key={sample.id}
                  sample={sample}
                  index={i + 1}
                  onViewDetail={() => setDetailSample(sample)}
                  onMarkFollowUp={() => setFollowUpSample(sample)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailSample && (
        <SampleDetailModal
          sample={detailSample}
          onClose={() => setDetailSample(null)}
        />
      )}

      {followUpSample && (
        <FollowUpModal
          sample={followUpSample}
          lead={lead}
          onClose={() => setFollowUpSample(null)}
          onConfirm={handleFollowUpComplete}
        />
      )}
    </div>
  );
}

function SampleRow({ sample, index, onViewDetail, onMarkFollowUp }: {
  sample: SampleRequest;
  index: number;
  onViewDetail: () => void;
  onMarkFollowUp: () => void;
}) {
  const showTimer = sample.status === "Livré" || sample.status === "Follow-up requis";
  const { text: timerText, urgency } = useCountdown(showTimer ? sample.timer_expires_at : undefined);

  const totalQty = sample.items?.reduce((s, i) => s + i.quantity, 0) || 0;
  const prodNames = sample.items?.map(i => i.product_name).join(", ") || "—";

  const timerColor = urgency === "expired" || urgency === "critical" ? T.red : urgency === "warn" ? T.orange : T.green;
  const isExpired = urgency === "expired";
  const isCritical = urgency === "critical";

  const now = new Date();
  let etaDisplay: React.ReactNode = "—";
  if (sample.eta_delivery) {
    const etaDate = new Date(`${sample.eta_delivery}T00:00`);
    const isToday = etaDate.toDateString() === now.toDateString();
    const isPast = etaDate < now && sample.status === "Envoyé";
    const daysDiff = Math.ceil((now.getTime() - etaDate.getTime()) / 86400000);
    if (isToday) {
      etaDisplay = <span style={{ color: T.orange, fontWeight: 700 }}>Aujourd'hui</span>;
    } else if (isPast) {
      etaDisplay = <span style={{ color: T.red, fontWeight: 700 }}>En retard de {daysDiff}j</span>;
    } else {
      etaDisplay = fmtShort(sample.eta_delivery);
    }
  }

  const needsFollowUp = sample.status === "Follow-up requis" || (sample.status === "Livré" && isExpired);

  const resultIcon = sample.follow_up_result === "Positif" ? "✅" :
    sample.follow_up_result === "Neutre" ? "➖" :
    sample.follow_up_result === "Négatif" ? "❌" : null;

  return (
    <tr style={{
      borderBottom: `1px solid ${T.border}`,
      background: needsFollowUp ? "rgba(239,68,68,0.04)" : "transparent",
    }}>
      <td style={{ padding: "11px 14px", color: T.textLight, fontWeight: 600, fontSize: 11 }}>#{index}</td>
      <td style={{ padding: "11px 14px", color: T.textMid, whiteSpace: "nowrap" }}>
        {fmtDate(sample.created_at)}
      </td>
      <td style={{ padding: "11px 14px", color: T.text, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {prodNames}
      </td>
      <td style={{ padding: "11px 14px", textAlign: "center", color: T.text, fontWeight: 600 }}>{totalQty}</td>
      <td style={{ padding: "11px 14px", textAlign: "center" }}>
        <StatusBadge status={sample.status} />
        {sample.tracking_number && sample.status === "Envoyé" && (
          <div style={{ fontSize: 10, color: T.blue, marginTop: 2 }}>
            {TRUCK_ICON}{sample.tracking_number}
          </div>
        )}
        {resultIcon && sample.status === "Follow-up complété" && (
          <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2 }}>{resultIcon} {sample.follow_up_result}</div>
        )}
      </td>
      <td style={{ padding: "11px 14px", textAlign: "center", fontSize: 12 }}>{etaDisplay}</td>
      <td style={{ padding: "11px 14px", textAlign: "center" }}>
        {timerText ? (
          <span style={{
            fontSize: 11, fontWeight: 700, color: timerColor,
            animation: isExpired || isCritical ? "pulse 1s infinite" : "none",
            display: "block",
          }}>
            {isExpired ? "EXPIRÉ — Follow-up!" : timerText}
          </span>
        ) : "—"}
      </td>
      <td style={{ padding: "11px 14px", textAlign: "center" }}>
        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
          <button
            onClick={onViewDetail}
            style={{
              padding: "5px 10px", borderRadius: 6, border: `1px solid ${T.main}`,
              background: "none", color: T.main, cursor: "pointer", fontSize: 11,
              fontWeight: 600, fontFamily: "inherit", whiteSpace: "nowrap",
            }}
          >
            Détails
          </button>
          {(sample.status === "Livré" || sample.status === "Follow-up requis") && (
            <button
              onClick={onMarkFollowUp}
              style={{
                padding: "5px 10px", borderRadius: 6, border: "none",
                background: T.gold, color: "#000", cursor: "pointer", fontSize: 11,
                fontWeight: 700, fontFamily: "inherit", whiteSpace: "nowrap",
                animation: needsFollowUp ? "pulse 1.5s infinite" : "none",
              }}
            >
              ✅ Follow-up
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: SampleStatus }) {
  const color = SAMPLE_STATUS_COLORS[status];
  const bg = SAMPLE_STATUS_BG[status];
  const isPending = status === "En attente d'approbation";
  const isFollowUpRequired = status === "Follow-up requis";
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "3px 8px",
      background: bg, color,
      border: isPending ? `1.5px dashed ${color}` : undefined,
      display: "inline-block",
      animation: isFollowUpRequired ? "pulse 1.5s infinite" : "none",
    }}>
      {status === "Envoyé" ? <>{TRUCK_ICON}{status}</> : status}
    </span>
  );
}

function FollowUpModal({ sample, lead, onClose, onConfirm }: {
  sample: SampleRequest;
  lead: CRMLead;
  onClose: () => void;
  onConfirm: (
    sample: SampleRequest,
    result: FollowUpResult,
    notes: string,
    nextStep: string,
    reason: string,
    createReminder: boolean,
    reminderDate: string,
    reminderTitle: string,
    createPricelist: boolean,
    createOrder: boolean,
    createAnotherSample: boolean,
  ) => void;
}) {
  const [result, setResult] = useState<FollowUpResult | null>(null);
  const [notes, setNotes] = useState("");
  const [nextStep, setNextStep] = useState(FOLLOWUP_NEXT_STEPS[0]);
  const [nextStepOther, setNextStepOther] = useState("");
  const [neutralReason, setNeutralReason] = useState(FOLLOWUP_NEUTRAL_REASONS[0]);
  const [neutralReasonOther, setNeutralReasonOther] = useState("");
  const [negativeReason, setNegativeReason] = useState(FOLLOWUP_NEGATIVE_REASONS[0]);
  const [negativeReasonOther, setNegativeReasonOther] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [createReminder, setCreateReminder] = useState(false);
  const [reminderTitle, setReminderTitle] = useState("");
  const [createPricelist, setCreatePricelist] = useState(false);
  const [createOrder, setCreateOrder] = useState(false);
  const [createAnotherSample, setCreateAnotherSample] = useState(false);

  const prodNames = sample.items?.map(i => i.product_name).join(", ") || "Sample";
  const deliveredDate = sample.delivered_at ? fmtDate(sample.delivered_at) : "—";

  const canSubmit = result !== null && notes.trim().length >= 10;

  const getEffectiveReason = () => {
    if (result === "Positif") return nextStep === "Autre" ? nextStepOther : nextStep;
    if (result === "Neutre") return neutralReason === "Autre" ? neutralReasonOther : neutralReason;
    if (result === "Négatif") return negativeReason === "Autre" ? negativeReasonOther : negativeReason;
    return "";
  };

  const resultConfig: Record<FollowUpResult, { color: string; bg: string; border: string; label: string }> = {
    "Positif": { color: "#15803d", bg: result === "Positif" ? "#dcfce7" : "#f9fafb", border: result === "Positif" ? "2px solid #16a34a" : "2px solid #e5e7eb", label: "✅ POSITIF" },
    "Neutre": { color: "#92400e", bg: result === "Neutre" ? "#fff7ed" : "#f9fafb", border: result === "Neutre" ? "2px solid #f59e0b" : "2px solid #e5e7eb", label: "➖ NEUTRE" },
    "Négatif": { color: "#991b1b", bg: result === "Négatif" ? "#fef2f2" : "#f9fafb", border: result === "Négatif" ? "2px solid #ef4444" : "2px solid #e5e7eb", label: "❌ NÉGATIF" },
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto", padding: "16px" }}>
      <div style={{ background: T.bgCard, borderRadius: 16, width: "100%", maxWidth: 620, boxShadow: "0 24px 80px rgba(0,0,0,0.3)" }}>
        <div style={{
          padding: "18px 24px", borderBottom: `1px solid ${T.border}`,
          background: "linear-gradient(135deg, #fffbea 0%, #fff 100%)", borderRadius: "16px 16px 0 0",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: T.text }}>Follow-up Sample — {lead.company_name}</h2>
              <div style={{ fontSize: 11, color: T.textLight, marginTop: 3 }}>
                Produits : {prodNames} · Livré le {deliveredDate}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#8e8e93", padding: 0 }}>✕</button>
          </div>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20, maxHeight: "calc(90vh - 140px)", overflowY: "auto" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 10 }}>
              Étape 1 — Résultat du follow-up <span style={{ color: T.red }}>*</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {(["Positif", "Neutre", "Négatif"] as FollowUpResult[]).map(r => {
                const cfg = resultConfig[r];
                const isSelected = result === r;
                const isGrayed = result !== null && result !== r;
                return (
                  <button
                    key={r}
                    onClick={() => setResult(r)}
                    style={{
                      padding: "14px 10px",
                      borderRadius: 10,
                      border: isSelected ? cfg.border : "2px solid #e5e7eb",
                      background: isSelected ? cfg.bg : isGrayed ? "#f3f4f6" : "#f9fafb",
                      color: isSelected ? cfg.color : isGrayed ? "#9ca3af" : T.textMid,
                      cursor: "pointer", fontFamily: "inherit",
                      fontWeight: 800, fontSize: 13,
                      transition: "all 0.15s",
                      opacity: isGrayed ? 0.5 : 1,
                    }}
                  >
                    {cfg.label}
                    <div style={{ fontSize: 9, fontWeight: 400, marginTop: 4, lineHeight: 1.4 }}>
                      {r === "Positif" ? "Intéressé / veut commander" : r === "Neutre" ? "Hésite / besoin de temps" : "Pas intéressé / va ailleurs"}
                    </div>
                  </button>
                );
              })}
            </div>

            {result === "Positif" && (
              <div style={{ marginTop: 12, background: "#f0fdf4", borderRadius: 8, padding: "12px 14px", border: "1px solid #bbf7d0" }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#15803d", display: "block", marginBottom: 6 }}>Prochaine étape estimée</label>
                <select
                  value={nextStep}
                  onChange={e => setNextStep(e.target.value)}
                  style={{ width: "100%", height: 36, borderRadius: 8, border: "1px solid #bbf7d0", padding: "0 10px", fontSize: 13, fontFamily: "inherit", background: T.bgCard }}
                >
                  {FOLLOWUP_NEXT_STEPS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {nextStep === "Autre" && (
                  <input
                    value={nextStepOther}
                    onChange={e => setNextStepOther(e.target.value)}
                    placeholder="Précisez..."
                    style={{ width: "100%", height: 36, borderRadius: 8, border: "1px solid #bbf7d0", padding: "0 10px", fontSize: 13, fontFamily: "inherit", marginTop: 8, boxSizing: "border-box" }}
                  />
                )}
              </div>
            )}

            {result === "Neutre" && (
              <div style={{ marginTop: 12, background: "#fffbeb", borderRadius: 8, padding: "12px 14px", border: "1px solid #fde68a" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#92400e", display: "block", marginBottom: 6 }}>Raison</label>
                    <select
                      value={neutralReason}
                      onChange={e => setNeutralReason(e.target.value)}
                      style={{ width: "100%", height: 36, borderRadius: 8, border: "1px solid #fde68a", padding: "0 10px", fontSize: 12, fontFamily: "inherit", background: T.bgCard, boxSizing: "border-box" }}
                    >
                      {FOLLOWUP_NEUTRAL_REASONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {neutralReason === "Autre" && (
                      <input
                        value={neutralReasonOther}
                        onChange={e => setNeutralReasonOther(e.target.value)}
                        placeholder="Précisez..."
                        style={{ width: "100%", height: 36, borderRadius: 8, border: "1px solid #fde68a", padding: "0 10px", fontSize: 12, fontFamily: "inherit", marginTop: 8, boxSizing: "border-box" }}
                      />
                    )}
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#92400e", display: "block", marginBottom: 6 }}>Date de relance suggérée</label>
                    <input
                      type="date"
                      value={reminderDate}
                      onChange={e => { setReminderDate(e.target.value); if (e.target.value) setCreateReminder(true); }}
                      style={{ width: "100%", height: 36, borderRadius: 8, border: "1px solid #fde68a", padding: "0 10px", fontSize: 13, fontFamily: "inherit", background: T.bgCard, boxSizing: "border-box" }}
                    />
                  </div>
                </div>
              </div>
            )}

            {result === "Négatif" && (
              <div style={{ marginTop: 12, background: "#fef2f2", borderRadius: 8, padding: "12px 14px", border: "1px solid #fecaca" }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#991b1b", display: "block", marginBottom: 6 }}>Raison du refus</label>
                <select
                  value={negativeReason}
                  onChange={e => setNegativeReason(e.target.value)}
                  style={{ width: "100%", height: 36, borderRadius: 8, border: "1px solid #fecaca", padding: "0 10px", fontSize: 13, fontFamily: "inherit", background: T.bgCard }}
                >
                  {FOLLOWUP_NEGATIVE_REASONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {negativeReason === "Autre" && (
                  <input
                    value={negativeReasonOther}
                    onChange={e => setNegativeReasonOther(e.target.value)}
                    placeholder="Précisez..."
                    style={{ width: "100%", height: 36, borderRadius: 8, border: "1px solid #fecaca", padding: "0 10px", fontSize: 13, fontFamily: "inherit", marginTop: 8, boxSizing: "border-box" }}
                  />
                )}
              </div>
            )}
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>
                Étape 2 — Notes détaillées <span style={{ color: T.red }}>*</span>
              </div>
              <span style={{ fontSize: 11, color: notes.length >= 10 ? T.green : T.textLight }}>
                {notes.length} caractères {notes.length < 10 ? `(min. 10)` : "✓"}
              </span>
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Décrivez les retours du client, ses commentaires sur le produit, la qualité, l'application, et tout détail pertinent pour le Head Office..."
              style={{
                width: "100%", height: 110, padding: 12, borderRadius: 8,
                border: `1.5px solid ${notes.length >= 10 ? "#22c55e" : "rgba(0,0,0,0.15)"}`,
                fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none",
                boxSizing: "border-box", lineHeight: 1.5,
                transition: "border-color 0.2s",
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 10 }}>
              Étape 3 — Actions de suivi (optionnel)
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { key: "reminder", label: "📅 Créer un rappel de suivi", checked: createReminder, onChange: (v: boolean) => setCreateReminder(v), extra: createReminder && (
                  <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <input
                      type="date"
                      value={reminderDate}
                      onChange={e => setReminderDate(e.target.value)}
                      style={{ height: 34, borderRadius: 8, border: `1px solid ${T.border}`, padding: "0 10px", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }}
                    />
                    <input
                      value={reminderTitle}
                      onChange={e => setReminderTitle(e.target.value)}
                      placeholder="Titre du rappel..."
                      style={{ height: 34, borderRadius: 8, border: `1px solid ${T.border}`, padding: "0 10px", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box" }}
                    />
                  </div>
                )},
                { key: "pricelist", label: "📄 Proposer une pricelist", checked: createPricelist, onChange: (v: boolean) => setCreatePricelist(v), extra: null },
                { key: "order", label: "📦 Passer une commande", checked: createOrder, onChange: (v: boolean) => setCreateOrder(v), extra: null },
                { key: "sample", label: "📦 Demander un autre sample", checked: createAnotherSample, onChange: (v: boolean) => setCreateAnotherSample(v), extra: null },
              ].map(({ key, label, checked, onChange, extra }) => (
                <div key={key} style={{ padding: "10px 12px", background: checked ? "rgba(99,102,241,0.04)" : T.bg, borderRadius: 8, border: `1px solid ${checked ? "rgba(99,102,241,0.2)" : T.border}`, transition: "all 0.15s" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, color: T.text }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => onChange(e.target.checked)}
                      style={{ width: 16, height: 16, cursor: "pointer" }}
                    />
                    {label}
                  </label>
                  {extra}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: "16px 24px", borderTop: `1px solid ${T.border}`, background: "#fafafa", borderRadius: "0 0 16px 16px" }}>
          {!canSubmit && (
            <div style={{ fontSize: 11, color: T.textLight, textAlign: "right", marginBottom: 8 }}>
              {!result && !notes.trim() ? "Sélectionnez un résultat et ajoutez des notes (min. 10 car.)" :
               !result ? "Sélectionnez un résultat (Positif / Neutre / Négatif)" :
               `Notes trop courtes — encore ${10 - notes.trim().length} caractère${10 - notes.trim().length > 1 ? "s" : ""} minimum`}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
              Annuler
            </button>
            <button
              onClick={() => {
                if (!result || !canSubmit) return;
                onConfirm(
                  sample, result, notes, getEffectiveReason(), getEffectiveReason(),
                  createReminder, reminderDate, reminderTitle,
                  createPricelist, createOrder, createAnotherSample,
                );
              }}
              disabled={!canSubmit}
              style={{
                padding: "10px 22px", borderRadius: 8, border: "none",
                background: canSubmit ? (result === "Positif" ? "#16a34a" : result === "Neutre" ? T.orange : result === "Négatif" ? T.red : T.gold) : "#e5e7eb",
                color: canSubmit ? "#fff" : "#9ca3af",
                cursor: canSubmit ? "pointer" : "not-allowed",
                fontFamily: "inherit", fontSize: 13, fontWeight: 800,
                transition: "all 0.2s",
              }}
            >
              SOUMETTRE LE FOLLOW-UP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SampleDetailModal({ sample, onClose }: { sample: SampleRequest; onClose: () => void }) {
  const steps: SampleStatus[] = ["En attente d'approbation", "Approuvé", "En préparation", "Envoyé", "Livré", "Follow-up requis", "Follow-up complété"];
  const currentIdx = steps.indexOf(sample.status);

  const resultColors: Record<string, { bg: string; border: string; color: string; icon: string }> = {
    "Positif": { bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d", icon: "✅" },
    "Neutre": { bg: "#fffbeb", border: "#fde68a", color: "#92400e", icon: "➖" },
    "Négatif": { bg: "#fef2f2", border: "#fecaca", color: "#991b1b", icon: "❌" },
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto", padding: "16px" }}>
      <div style={{ background: T.bgCard, borderRadius: 16, width: "100%", maxWidth: 680, boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(135deg, #fffbea 0%, #fff 100%)", borderRadius: "16px 16px 0 0" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: T.text }}>📦 Détails du sample</h2>
            <div style={{ fontSize: 11, color: T.textLight, marginTop: 2 }}>Créé le {fmtDate(sample.created_at)}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#8e8e93" }}>✕</button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20, maxHeight: "calc(90vh - 120px)", overflowY: "auto" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Timeline</div>
            <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", paddingBottom: 4 }}>
              {steps.map((step, i) => {
                if (step === "Rejeté") return null;
                const done = i <= currentIdx;
                const active = i === currentIdx;
                return (
                  <React.Fragment key={step}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 80 }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: done ? T.gold : "#e5e7eb", border: active ? `3px solid ${T.gold}` : "2px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", color: done ? "#fff" : T.textLight, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {done ? "✓" : i + 1}
                      </div>
                      <div style={{ fontSize: 9, color: done ? T.gold : T.textLight, fontWeight: done ? 700 : 400, textAlign: "center", marginTop: 4, maxWidth: 72, lineHeight: 1.2 }}>{step}</div>
                    </div>
                    {i < steps.length - 2 && (
                      <div style={{ flex: 1, height: 2, background: i < currentIdx ? T.gold : "#e5e7eb", minWidth: 16 }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <DetailField label="Motif" value={sample.reason} />
            <DetailField label="Priorité" value={sample.priority} />
            <DetailField label="Agent" value={sample.agent_name} />
            <DetailField label="Statut" value={<StatusBadge status={sample.status} />} />
            <DetailField label="Adresse de livraison" value={sample.delivery_address} col2 />
            {sample.notes_for_office && <DetailField label="Notes pour le bureau" value={sample.notes_for_office} col2 />}
          </div>

          {sample.items && sample.items.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Produits</div>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${T.border}` }}>
                    <th style={{ textAlign: "left", padding: "7px 10px", fontWeight: 700, color: T.textLight }}>Produit</th>
                    <th style={{ textAlign: "center", padding: "7px 10px", fontWeight: 700, color: T.textLight }}>Qté</th>
                    <th style={{ textAlign: "left", padding: "7px 10px", fontWeight: 700, color: T.textLight }}>Format</th>
                    <th style={{ textAlign: "left", padding: "7px 10px", fontWeight: 700, color: T.textLight }}>Couleur</th>
                  </tr>
                </thead>
                <tbody>
                  {sample.items.map((it, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: "9px 10px", color: T.text, fontWeight: 600 }}>{it.product_name}</td>
                      <td style={{ padding: "9px 10px", textAlign: "center", color: T.text }}>{it.quantity}</td>
                      <td style={{ padding: "9px 10px", color: T.textMid }}>{it.format}</td>
                      <td style={{ padding: "9px 10px", color: T.textMid }}>{it.color_finish || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(sample.transporteur || sample.tracking_number || sample.eta_delivery) && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Expédition</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {sample.transporteur && <DetailField label="Transporteur" value={sample.transporteur} />}
                {sample.tracking_number && <DetailField label="Tracking" value={<span style={{ color: T.blue, fontWeight: 600 }}>{sample.tracking_number}</span>} />}
                {sample.eta_delivery && <DetailField label="ETA" value={fmtShort(sample.eta_delivery)} />}
              </div>
            </div>
          )}

          {sample.follow_up_result && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Résultat du follow-up</div>
              {(() => {
                const cfg = resultColors[sample.follow_up_result];
                return (
                  <div style={{ padding: "14px 16px", background: cfg.bg, borderRadius: 10, border: `1px solid ${cfg.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 16 }}>{cfg.icon}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: cfg.color }}>{sample.follow_up_result}</span>
                      {sample.follow_up_completed_at && (
                        <span style={{ fontSize: 11, color: T.textLight, marginLeft: "auto" }}>
                          {fmtDate(sample.follow_up_completed_at)} · {sample.follow_up_agent_name || sample.agent_name}
                        </span>
                      )}
                    </div>
                    {(sample.follow_up_next_step || sample.follow_up_reason) && (
                      <div style={{ fontSize: 12, color: cfg.color, fontWeight: 600, marginBottom: 8 }}>
                        {sample.follow_up_result === "Positif" ? "Prochaine étape" : "Raison"} : {sample.follow_up_next_step || sample.follow_up_reason}
                      </div>
                    )}
                    {sample.follow_up_notes && (
                      <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6, whiteSpace: "pre-line" }}>
                        {sample.follow_up_notes}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {sample.activities && sample.activities.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Historique</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sample.activities.map((act, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.gold, marginTop: 4, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: T.text }}>{act.description}</div>
                      <div style={{ fontSize: 10, color: T.textLight, marginTop: 2 }}>{fmtDate(act.created_at)} — {act.actor_name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: "14px 24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 22px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value, col2 }: { label: string; value: React.ReactNode; col2?: boolean }) {
  return (
    <div style={{ gridColumn: col2 ? "1 / -1" : undefined }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: T.text }}>{value || "—"}</div>
    </div>
  );
}
