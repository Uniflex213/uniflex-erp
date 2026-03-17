import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { CRMLead, CRMActivity, CRMReminder, Priority } from "../crmTypes";
import { T, mkId, isToday } from "./workstationTypes";
import { useCurrentAgent } from "../../hooks/useCurrentAgent";
import { useApp } from "../../AppContext";

interface Props {
  leads: CRMLead[];
  onNavigateNewLead: () => void;
  onNavigatePricelist: () => void;
  onNavigateOrders: () => void;
}

type ModalType = "appel" | "email" | "note" | "rappel" | null;

export default function WidgetActionsRapides({ leads, onNavigateNewLead, onNavigatePricelist, onNavigateOrders }: Props) {
  const agent = useCurrentAgent();
  const { addActivity: persistActivity, addReminder: persistReminder } = useApp();
  const [modal, setModal] = useState<ModalType>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const myLeads = useMemo(() =>
    leads.filter(l => l.assigned_agent_id === agent.id && l.stage !== "Fermé Perdu"),
    [leads, agent.id]
  );

  const todayCounts = useMemo(() => {
    const counts = { appel: 0, email: 0, note: 0, rappel: 0 };
    myLeads.forEach(lead => {
      (lead.activities || []).forEach(a => {
        if (!isToday(a.activity_at)) return;
        if (a.type === "Appel") counts.appel++;
        else if (a.type === "Email envoyé") counts.email++;
        else if (a.type === "Note interne") counts.note++;
      });
      (lead.reminders || []).forEach(r => {
        if (isToday(r.created_at)) counts.rappel++;
      });
    });
    return counts;
  }, [myLeads]);

  const showFlash = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2500);
  };

  const logActivity = async (leadId: string, activity: CRMActivity) => {
    await persistActivity({
      lead_id: leadId,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      call_duration: activity.call_duration ?? null,
      call_result: activity.call_result ?? null,
      email_subject: activity.email_subject ?? null,
      meeting_location: activity.meeting_location ?? null,
      meeting_duration: activity.meeting_duration ?? null,
      meeting_attendees: activity.meeting_attendees ?? null,
      proposal_amount: activity.proposal_amount ?? null,
      sample_products: activity.sample_products ?? null,
      sample_qty: activity.sample_qty ?? null,
      loss_reason: activity.loss_reason ?? null,
      stage_from: activity.stage_from ?? null,
      stage_to: activity.stage_to ?? null,
      logged_by_name: activity.logged_by_name,
      logged_by_initials: activity.logged_by_initials,
      activity_at: activity.activity_at,
    });
  };

  const addReminder = async (leadId: string, reminder: CRMReminder) => {
    await persistReminder({
      lead_id: leadId,
      title: reminder.title,
      reminder_at: reminder.reminder_at,
      priority: reminder.priority,
      recurrence: reminder.recurrence,
      notes: reminder.notes,
      completed: reminder.completed,
      assigned_agent_name: reminder.assigned_agent_name,
    });
  };

  const actions = [
    { id: "appel", icon: "📞", label: "Logger un appel", color: "#22c55e", count: todayCounts.appel },
    { id: "email", icon: "📧", label: "Logger un email", color: "#3b82f6", count: todayCounts.email },
    { id: "note", icon: "📝", label: "Nouvelle note", color: "#8b5cf6", count: todayCounts.note },
    { id: "rappel", icon: "📅", label: "Nouveau rappel", color: T.orange, count: todayCounts.rappel },
    { id: "lead", icon: "🆕", label: "Nouveau lead", color: T.main, count: null },
    { id: "pricelist", icon: "📄", label: "Pricelist", color: "#0891b2", count: null },
    { id: "orders", icon: "📦", label: "Commande", color: "#d97706", count: null },
  ] as const;

  const handleAction = (id: string) => {
    if (id === "appel") setModal("appel");
    else if (id === "email") setModal("email");
    else if (id === "note") setModal("note");
    else if (id === "rappel") setModal("rappel");
    else if (id === "lead") onNavigateNewLead();
    else if (id === "pricelist") onNavigatePricelist();
    else if (id === "orders") onNavigateOrders();
  };

  return (
    <>
      <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, padding: "16px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginRight: 4 }}>
            Actions rapides
          </div>
          {actions.map(a => (
            <button
              key={a.id}
              onClick={() => handleAction(a.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: `${a.color}12`, border: `1.5px solid ${a.color}33`,
                borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit", color: a.color,
                transition: "all 0.15s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = `${a.color}22`;
                (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = `${a.color}12`;
                (e.currentTarget as HTMLElement).style.transform = "none";
              }}
            >
              <span style={{ fontSize: 14 }}>{a.icon}</span>
              {a.label}
              {a.count !== null && a.count > 0 && (
                <span style={{
                  background: a.color, color: "#fff", borderRadius: 10,
                  fontSize: 10, fontWeight: 800, padding: "1px 6px", marginLeft: 2,
                }}>
                  {a.count}
                </span>
              )}
            </button>
          ))}
          {flash && (
            <div style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: T.green, display: "flex", alignItems: "center", gap: 4 }}>
              ✓ {flash}
            </div>
          )}
        </div>
      </div>

      {modal === "appel" && (
        <AppelModal
          leads={myLeads}
          onClose={() => setModal(null)}
          onSave={(leadId, data, andAnother) => {
            logActivity(leadId, {
              id: mkId(), lead_id: leadId, type: "Appel",
              title: `Appel — ${data.result}`,
              description: data.summary,
              call_duration: data.duration,
              call_result: data.result as any,
              logged_by_name: agent.name,
              logged_by_initials: agent.initials,
              activity_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            });
            if (!andAnother) setModal(null);
            showFlash("Appel enregistré");
          }}
        />
      )}

      {modal === "email" && (
        <EmailModal
          leads={myLeads}
          onClose={() => setModal(null)}
          onSave={(leadId, data, andAnother) => {
            logActivity(leadId, {
              id: mkId(), lead_id: leadId, type: "Email envoyé",
              title: data.subject || "Email envoyé",
              description: data.summary,
              email_subject: data.subject,
              logged_by_name: agent.name,
              logged_by_initials: agent.initials,
              activity_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            });
            if (!andAnother) setModal(null);
            showFlash("Email enregistré");
          }}
        />
      )}

      {modal === "note" && (
        <NoteModal
          leads={myLeads}
          onClose={() => setModal(null)}
          onSave={(leadId, data, andAnother) => {
            logActivity(leadId, {
              id: mkId(), lead_id: leadId, type: "Note interne",
              title: "Note interne",
              description: data.note,
              logged_by_name: agent.name,
              logged_by_initials: agent.initials,
              activity_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            });
            if (!andAnother) setModal(null);
            showFlash("Note enregistrée");
          }}
        />
      )}

      {modal === "rappel" && (
        <RappelModal
          leads={myLeads}
          onClose={() => setModal(null)}
          onSave={(leadId, data, andAnother) => {
            addReminder(leadId, {
              id: mkId(), lead_id: leadId,
              title: data.title,
              reminder_at: data.datetime,
              priority: data.priority as Priority,
              recurrence: "Aucune",
              notes: data.notes || "",
              completed: false,
              assigned_agent_name: agent.name,
              created_at: new Date().toISOString(),
            });
            if (!andAnother) setModal(null);
            showFlash("Rappel créé");
          }}
        />
      )}
    </>
  );
}

function ModalWrapper({ title, onClose, children, onSave, onSaveAndAdd, saveLabel = "Enregistrer" }: {
  title: string; onClose: () => void; children: React.ReactNode;
  onSave: () => void; onSaveAndAdd?: () => void; saveLabel?: string;
}) {
  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: T.card, borderRadius: 16, width: "min(90vw, 480px)", padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{title}</div>
          <button onClick={onClose} style={{ border: "none", background: T.cardAlt, borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16 }}>×</button>
        </div>
        {children}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onSave} style={{ flex: 1, background: T.main, color: "#fff", border: "none", borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {saveLabel}
            </button>
            <button onClick={onClose} style={{ padding: "11px 20px", background: T.cardAlt, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Annuler
            </button>
          </div>
          {onSaveAndAdd && (
            <button
              onClick={onSaveAndAdd}
              style={{ width: "100%", background: "transparent", color: T.main, border: `1.5px dashed ${T.main}55`, borderRadius: 10, padding: "9px 0", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              + Enregistrer et en ajouter un autre
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function LeadSelect({ leads, value, onChange }: { leads: CRMLead[]; value: string; onChange: (id: string) => void }) {
  const iStyle = { width: "100%", border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", outline: "none", background: T.card };
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Lead</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ ...iStyle, cursor: "pointer" }}>
        <option value="">Sélectionner un lead...</option>
        {leads.map(l => <option key={l.id} value={l.id}>{l.company_name}</option>)}
      </select>
    </div>
  );
}

function AppelModal({ leads, onClose, onSave }: { leads: CRMLead[]; onClose: () => void; onSave: (leadId: string, data: any, andAnother?: boolean) => void }) {
  const [leadId, setLeadId] = useState("");
  const [duration, setDuration] = useState(10);
  const [result, setResult] = useState("Positif");
  const [summary, setSummary] = useState("");

  const reset = () => { setLeadId(""); setDuration(10); setResult("Positif"); setSummary(""); };
  const isValid = !!leadId;
  const iStyle = { width: "100%", border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", outline: "none" };

  return (
    <ModalWrapper
      title="📞 Logger un appel"
      onClose={onClose}
      onSave={() => isValid && onSave(leadId, { duration, result, summary })}
      onSaveAndAdd={() => { if (!isValid) return; onSave(leadId, { duration, result, summary }, true); reset(); }}
    >
      <LeadSelect leads={leads} value={leadId} onChange={setLeadId} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Durée (min)</label>
          <input type="number" value={duration} min={1} onChange={e => setDuration(parseInt(e.target.value) || 0)} style={iStyle} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Résultat</label>
          <select value={result} onChange={e => setResult(e.target.value)} style={{ ...iStyle, cursor: "pointer" }}>
            <option>Positif</option>
            <option>Neutre</option>
            <option>Négatif</option>
          </select>
        </div>
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Résumé</label>
        <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={3} placeholder="Points clés de la conversation..." style={{ ...iStyle, resize: "vertical", lineHeight: 1.5 }} />
      </div>
    </ModalWrapper>
  );
}

function EmailModal({ leads, onClose, onSave }: { leads: CRMLead[]; onClose: () => void; onSave: (leadId: string, data: any, andAnother?: boolean) => void }) {
  const [leadId, setLeadId] = useState("");
  const [subject, setSubject] = useState("");
  const [summary, setSummary] = useState("");

  const reset = () => { setLeadId(""); setSubject(""); setSummary(""); };
  const isValid = !!leadId;
  const iStyle = { width: "100%", border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", outline: "none" };

  return (
    <ModalWrapper
      title="📧 Logger un email"
      onClose={onClose}
      onSave={() => isValid && onSave(leadId, { subject, summary })}
      onSaveAndAdd={() => { if (!isValid) return; onSave(leadId, { subject, summary }, true); reset(); }}
    >
      <LeadSelect leads={leads} value={leadId} onChange={setLeadId} />
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Objet</label>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Objet de l'email" style={iStyle} />
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Résumé</label>
        <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={3} placeholder="Contenu principal de l'email..." style={{ ...iStyle, resize: "vertical", lineHeight: 1.5 }} />
      </div>
    </ModalWrapper>
  );
}

function NoteModal({ leads, onClose, onSave }: { leads: CRMLead[]; onClose: () => void; onSave: (leadId: string, data: any, andAnother?: boolean) => void }) {
  const [leadId, setLeadId] = useState("");
  const [note, setNote] = useState("");

  const reset = () => { setLeadId(""); setNote(""); };
  const isValid = !!leadId;
  const iStyle = { width: "100%", border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", outline: "none" };

  return (
    <ModalWrapper
      title="📝 Nouvelle note"
      onClose={onClose}
      onSave={() => isValid && onSave(leadId, { note })}
      onSaveAndAdd={() => { if (!isValid) return; onSave(leadId, { note }, true); reset(); }}
    >
      <LeadSelect leads={leads} value={leadId} onChange={setLeadId} />
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Note</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={5} placeholder="Votre note..." style={{ ...iStyle, resize: "vertical", lineHeight: 1.5 }} />
      </div>
    </ModalWrapper>
  );
}

function RappelModal({ leads, onClose, onSave }: { leads: CRMLead[]; onClose: () => void; onSave: (leadId: string, data: any, andAnother?: boolean) => void }) {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDt = tomorrow.toISOString().slice(0, 16);
  const [leadId, setLeadId] = useState("");
  const [title, setTitle] = useState("");
  const [datetime, setDatetime] = useState(defaultDt);
  const [priority, setPriority] = useState("Moyenne");
  const [notes, setNotes] = useState("");

  const reset = () => { setLeadId(""); setTitle(""); setDatetime(defaultDt); setPriority("Moyenne"); setNotes(""); };
  const isValid = !!leadId && !!title;
  const iStyle = { width: "100%", border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", outline: "none" };

  return (
    <ModalWrapper
      title="📅 Nouveau rappel"
      onClose={onClose}
      onSave={() => isValid && onSave(leadId, { title, datetime, priority, notes })}
      onSaveAndAdd={() => { if (!isValid) return; onSave(leadId, { title, datetime, priority, notes }, true); reset(); }}
    >
      <LeadSelect leads={leads} value={leadId} onChange={setLeadId} />
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Titre</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Relance offre de prix" style={iStyle} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Date / heure</label>
          <input type="datetime-local" value={datetime} onChange={e => setDatetime(e.target.value)} style={iStyle} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Priorité</label>
          <select value={priority} onChange={e => setPriority(e.target.value)} style={{ ...iStyle, cursor: "pointer" }}>
            <option>Haute</option>
            <option>Moyenne</option>
            <option>Basse</option>
          </select>
        </div>
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Contexte optionnel..." style={{ ...iStyle, resize: "vertical", lineHeight: 1.5 }} />
      </div>
    </ModalWrapper>
  );
}
