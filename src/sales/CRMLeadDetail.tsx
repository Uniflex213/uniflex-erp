import React, { useState, useRef } from "react";
import {
  CRMLead, CRMActivity, CRMReminder,
  STAGE_COLORS, STAGE_BG,
  TEMP_COLORS, TEMP_BG, TEMP_LABEL, TYPE_COLORS, TYPE_BG,
  ActivityType, ACTIVITY_ICONS, Priority, Recurrence,
} from "./crmTypes";
import { SampleRequest } from "./sampleTypes";
import SampleRequestModal from "./SampleRequestModal";
import SamplesSection from "./SamplesSection";
import { PrefillData, useApp } from "../AppContext";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import ClientForm from "../clients/ClientForm";
import { Client, EMPTY_CLIENT } from "../clients/clientTypes";
import { MOCK_PRICELISTS } from "../pricelist/pricelistTypes";
import { T } from "../theme";
const fmtDateTime = (iso: string) => new Date(iso).toLocaleDateString("fr-CA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

interface Props {
  lead: CRMLead;
  onBack: () => void;
  onUpdate: (lead: CRMLead) => void;
  onNavigate?: (page: string, prefill?: PrefillData) => void;
  leadSamples?: SampleRequest[];
  onAddSample?: (sample: SampleRequest) => void;
}

export default function CRMLeadDetail({ lead, onBack, onUpdate, onNavigate, leadSamples = [], onAddSample }: Props) {
  const { profile, realProfile } = useAuth();
  const ownerId = realProfile?.id ?? profile?.id ?? null;
  const { addActivity: persistActivity, addReminder: persistReminder, updateReminder: persistUpdateReminder } = useApp();
  const agentName = profile?.full_name || "Agent";
  const agentInitials = agentName.split(" ").map((n: string) => n[0]).join("").toUpperCase();
  const [tab, setTab] = useState<"info" | "timeline" | "samples" | "reminders" | "files" | "notes">("timeline");
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [showSampleRequest, setShowSampleRequest] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [converting, setConverting] = useState(false);
  const [notes, setNotes] = useState(lead.notes);
  const [saveIndicator, setSaveIndicator] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleConvertToClient = async (data: Omit<Client, "id" | "created_at" | "updated_at">) => {
    setConverting(true);
    const now = new Date().toISOString();
    const { data: created, error } = await supabase
      .from("clients")
      .insert({ ...data, owner_id: ownerId, created_at: now, updated_at: now })
      .select()
      .maybeSingle();
    if (!error && created) {
      const clientId = (created as any).id;
      if (data.crm_history_transferred) {
        const notePromises = (lead.activities || []).map(act =>
          supabase.from("client_notes").insert({
            client_id: clientId,
            content: `[${act.type}] ${act.title || ""} ${act.description || ""}`.trim(),
            author_name: act.logged_by_name,
            is_from_crm: true,
            created_at: act.activity_at,
          })
        );
        await Promise.all(notePromises);
      }
      const updatedLead: CRMLead = {
        ...lead,
        is_converted: true,
        converted_to_client_id: clientId,
        stage: "Fermé Gagné",
        updated_at: now,
      };
      onUpdate(updatedLead);
      setShowConvertModal(false);
      onNavigate?.("my_clients");
    }
    setConverting(false);
  };
  const now = new Date();

  const activities = lead.activities || [];
  const reminders = lead.reminders || [];
  const files = lead.files || [];

  const overdueReminders = reminders.filter(r => !r.completed && new Date(r.reminder_at) < now);
  const todayReminders = reminders.filter(r => !r.completed && new Date(r.reminder_at).toDateString() === now.toDateString());
  const upcomingReminders = reminders.filter(r => !r.completed && new Date(r.reminder_at) > now && new Date(r.reminder_at).toDateString() !== now.toDateString());
  const completedReminders = reminders.filter(r => r.completed);

  const daysSinceCreation = daysBetween(lead.created_at, now.toISOString());
  const daysToTarget = lead.target_closing_date ? daysBetween(now.toISOString(), lead.target_closing_date) : null;

  const handleNotesChange = (val: string) => {
    setNotes(val);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      onUpdate({ ...lead, notes: val, updated_at: now.toISOString() });
      setSaveIndicator(true);
      setTimeout(() => setSaveIndicator(false), 2000);
    }, 2000);
  };

  const addActivity = async (act: Partial<CRMActivity>) => {
    await persistActivity({
      lead_id: lead.id,
      type: act.type || "Note interne",
      title: act.title || "",
      description: act.description || "",
      call_duration: act.call_duration ?? null,
      call_result: act.call_result ?? null,
      email_subject: act.email_subject ?? null,
      meeting_location: act.meeting_location ?? null,
      meeting_duration: act.meeting_duration ?? null,
      meeting_attendees: act.meeting_attendees ?? null,
      proposal_amount: act.proposal_amount ?? null,
      sample_products: act.sample_products ?? null,
      sample_qty: act.sample_qty ?? null,
      loss_reason: act.loss_reason ?? null,
      stage_from: act.stage_from ?? null,
      stage_to: act.stage_to ?? null,
      logged_by_name: act.logged_by_name || agentName,
      logged_by_initials: act.logged_by_initials || agentInitials,
      activity_at: act.activity_at || new Date().toISOString(),
    });
    setShowAddActivity(false);
  };

  const addReminder = async (rem: Partial<CRMReminder>) => {
    await persistReminder({
      lead_id: lead.id,
      title: rem.title || "",
      reminder_at: rem.reminder_at || new Date().toISOString(),
      priority: rem.priority || "Moyenne",
      recurrence: rem.recurrence || "Aucune",
      notes: rem.notes || "",
      completed: false,
      assigned_agent_name: rem.assigned_agent_name || agentName,
    });
    setShowAddReminder(false);
  };

  const completeReminder = async (remId: string) => {
    const rem = reminders.find(r => r.id === remId);
    if (!rem) return;
    await persistUpdateReminder({ ...rem, completed: true, completed_at: new Date().toISOString() });
  };

  const deleteReminder = async (remId: string) => {
    await supabase.from("crm_reminders").delete().eq("id", remId);
    onUpdate({ ...lead, reminders: reminders.filter(r => r.id !== remId) });
  };

  const displayedActivities = showAllActivities ? activities : activities.slice(0, 10);

  const probColor = lead.closing_probability >= 75 ? "#16a34a" : lead.closing_probability >= 50 ? T.green : lead.closing_probability >= 25 ? T.orange : T.red;

  return (
    <div style={{ background: T.bg, minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "16px 24px" }}>
        <button
          onClick={onBack}
          style={{
            background: "none", border: "none", cursor: "pointer", color: T.main,
            fontSize: 13, fontWeight: 600, padding: 0, display: "flex", alignItems: "center", gap: 6, marginBottom: 12, fontFamily: "inherit",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          Retour au pipeline
        </button>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: T.text, margin: "0 0 8px" }}>{lead.company_name}</h1>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <Badge text={lead.stage} bg={STAGE_BG[lead.stage]} color={STAGE_COLORS[lead.stage]} />
              <Badge text={TEMP_LABEL[lead.temperature]} bg={TEMP_BG[lead.temperature]} color={TEMP_COLORS[lead.temperature]} />
              <Badge text={lead.type} bg={TYPE_BG[lead.type as keyof typeof TYPE_BG]} color={TYPE_COLORS[lead.type as keyof typeof TYPE_COLORS]} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%", background: lead.assigned_agent_color,
                display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700,
              }}>
                {lead.assigned_agent_initials}
              </div>
              <span style={{ fontSize: 13, color: T.textMid }}>Assigné à <strong style={{ color: T.text }}>{lead.assigned_agent_name}</strong></span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ActionBtn label="📦 Demander un Sample" color="#d4a017" textColor="#000" onClick={() => setShowSampleRequest(true)} />
            {lead.stage === "Fermé Gagné" && !lead.is_converted && (
              <ActionBtn label="Convertir en client" color={T.green} onClick={() => setShowConvertModal(true)} />
            )}
            {lead.is_converted && (
              <span style={{ fontSize: 12, fontWeight: 700, background: "rgba(34,197,94,0.15)", color: T.green, padding: "8px 14px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6 }}>
                Converti en client
              </span>
            )}
            <ActionBtn label="Créer une pricelist" color={T.main} onClick={() => onNavigate?.("pricelist", {
              companyName: lead.company_name,
              address: lead.address,
              contactName: `${lead.contact_first_name} ${lead.contact_last_name}`,
              clientEmail: lead.email,
              clientPhone: lead.phone,
              destination: lead.region,
              leadId: lead.id,
            })} />
            <ActionBtn label="Passer une commande" color="#0891b2" onClick={() => onNavigate?.("orders", {
              companyName: lead.company_name,
              address: lead.address,
              contactName: `${lead.contact_first_name} ${lead.contact_last_name}`,
              clientEmail: lead.email,
              clientPhone: lead.phone,
              destination: lead.region,
              leadId: lead.id,
            })} />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 0, padding: "0 24px", background: T.card, borderBottom: `1px solid ${T.border}` }}>
        {(["info", "timeline", "samples", "reminders", "files", "notes"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "12px 18px", border: "none", background: "none", cursor: "pointer",
              fontSize: 13, fontWeight: tab === t ? 700 : 400,
              color: tab === t ? T.main : T.textMid,
              borderBottom: tab === t ? `2px solid ${T.main}` : "2px solid transparent",
              fontFamily: "inherit", transition: "all 0.15s",
            }}
          >
            {t === "info" ? "Informations" : t === "timeline" ? `Timeline (${activities.length})` : t === "samples" ? `Samples (${leadSamples.length})` : t === "reminders" ? `Reminders (${overdueReminders.length > 0 ? `🔴 ${overdueReminders.length} en retard` : reminders.filter(r => !r.completed).length})` : t === "files" ? `Fichiers (${files.length})` : "Notes"}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, padding: 24, overflow: "auto" }}>
        {tab === "info" && <InfoSection lead={lead} daysSinceCreation={daysSinceCreation} daysToTarget={daysToTarget} probColor={probColor} />}

        {tab === "samples" && (
          <SamplesSection
            samples={leadSamples}
            lead={lead}
            onSamplesChange={(updated) => {
              updated.forEach(s => {
                const existing = leadSamples.find(x => x.id === s.id);
                if (!existing && onAddSample) onAddSample(s);
              });
            }}
            onAddActivity={addActivity}
            onOpenAddActivity={(prefill) => { if (prefill) { setShowAddActivity(true); } }}
          />
        )}

        {tab === "timeline" && (
          <div style={{ maxWidth: 760 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text }}>Historique des activités</h3>
              <button
                onClick={() => setShowAddActivity(true)}
                style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: T.main, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}
              >
                + Ajouter une activité
              </button>
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 19, top: 0, bottom: 0, width: 2, background: "rgba(0,0,0,0.07)" }} />
              {displayedActivities.map(act => (
                <ActivityEntry key={act.id} activity={act} />
              ))}
              {!showAllActivities && activities.length > 10 && (
                <button
                  onClick={() => setShowAllActivities(true)}
                  style={{ marginLeft: 48, fontSize: 13, color: T.main, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
                >
                  Voir tout l'historique ({activities.length} activités)
                </button>
              )}
            </div>
          </div>
        )}

        {tab === "reminders" && (
          <div style={{ maxWidth: 680 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text }}>Reminders & Tâches</h3>
              <button
                onClick={() => setShowAddReminder(true)}
                style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: T.main, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}
              >
                + Nouveau rappel
              </button>
            </div>

            {overdueReminders.length > 0 && (
              <ReminderGroup title="En retard" reminders={overdueReminders} variant="overdue" onComplete={completeReminder} onDelete={deleteReminder} />
            )}
            {todayReminders.length > 0 && (
              <ReminderGroup title="Aujourd'hui" reminders={todayReminders} variant="today" onComplete={completeReminder} onDelete={deleteReminder} />
            )}
            {upcomingReminders.length > 0 && (
              <ReminderGroup title="À venir" reminders={upcomingReminders} variant="upcoming" onComplete={completeReminder} onDelete={deleteReminder} />
            )}
            {completedReminders.length > 0 && (
              <ReminderGroup title="Complétés" reminders={completedReminders} variant="completed" onComplete={completeReminder} onDelete={deleteReminder} />
            )}
            {reminders.length === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: T.textLight }}>Aucun rappel pour ce lead.</div>
            )}
          </div>
        )}

        {tab === "files" && (
          <div style={{ maxWidth: 680 }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: T.text }}>Fichiers & Documents</h3>
            <div style={{
              border: `2px dashed ${T.border}`, borderRadius: 12, padding: 40,
              textAlign: "center", color: T.textLight, marginBottom: 20,
              background: T.bg, cursor: "pointer",
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📎</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.textMid, marginBottom: 4 }}>Glisser les fichiers ici</div>
              <div style={{ fontSize: 12 }}>PDF, DOC, DOCX, XLS, XLSX, JPG, PNG — max 10 MB</div>
            </div>
            {files.length === 0 && <div style={{ textAlign: "center", color: T.textLight, fontSize: 13 }}>Aucun fichier attaché.</div>}
          </div>
        )}

        {tab === "notes" && (
          <div style={{ maxWidth: 680 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text }}>Notes rapides</h3>
              {saveIndicator && <span style={{ fontSize: 12, color: T.green, fontWeight: 600 }}>Sauvegardé ✓</span>}
            </div>
            <textarea
              value={notes}
              onChange={e => handleNotesChange(e.target.value)}
              placeholder="Notes générales sur ce lead..."
              style={{
                width: "100%", minHeight: 280, padding: 16, borderRadius: 10,
                border: `1px solid ${T.border}`, fontSize: 14, lineHeight: 1.6,
                resize: "vertical", fontFamily: "inherit", outline: "none",
                color: T.text, background: T.card,
                boxSizing: "border-box",
              }}
            />
            <div style={{ fontSize: 11, color: T.textLight, marginTop: 6 }}>
              Dernière modification: {fmtDateTime(lead.updated_at)}
            </div>
          </div>
        )}
      </div>

      {showAddActivity && <AddActivityModal onSave={addActivity} onClose={() => setShowAddActivity(false)} />}
      {showAddReminder && <AddReminderModal onSave={addReminder} onClose={() => setShowAddReminder(false)} />}
      {showSampleRequest && <SampleRequestModal lead={lead} onClose={() => setShowSampleRequest(false)} onSave={(req) => {
        const now2 = new Date().toISOString();
        const { items: reqItems, activities: _acts, ...requestData } = req as any;

        const tempId = `sr_${Date.now()}`;
        const localSample: SampleRequest = {
          id: tempId,
          lead_id: requestData.lead_id,
          lead_company_name: lead.company_name,
          agent_id: requestData.agent_id,
          agent_name: requestData.agent_name,
          reason: requestData.reason,
          priority: requestData.priority,
          delivery_address: requestData.delivery_address,
          notes_for_office: requestData.notes_for_office,
          status: requestData.status,
          approved_by: "",
          approval_notes: "",
          estimated_cost: 0,
          transporteur: "",
          tracking_number: "",
          rejection_reason: "",
          follow_up_notes: "",
          created_at: now2,
          updated_at: now2,
          items: reqItems || [],
          activities: [],
        };
        if (onAddSample) onAddSample(localSample);

        addActivity({
          type: "Note interne",
          title: `📦 Demande de sample envoyée au Head Office — ${reqItems?.map((i: any) => i.product_name).join(", ") || ""}`,
          description: `Demande de sample — Motif: ${requestData.reason} — Priorité: ${requestData.priority}`,
          activity_at: now2,
        });
        if (!lead.has_sample) onUpdate({ ...lead, has_sample: true });
        setShowSampleRequest(false);

        (async () => {
          try {
            const { data: inserted, error } = await supabase
              .from("sample_requests")
              .insert({
                lead_id: requestData.lead_id,
                lead_company_name: lead.company_name,
                agent_id: requestData.agent_id,
                agent_name: requestData.agent_name,
                reason: requestData.reason,
                priority: requestData.priority,
                delivery_address: requestData.delivery_address,
                notes_for_office: requestData.notes_for_office,
                status: requestData.status,
                vendeur_code: profile?.vendeur_code ?? null,
                owner_id: ownerId,
              })
              .select()
              .maybeSingle();
            if (error || !inserted) {
              console.error("Failed to insert sample_request", error);
              return;
            }
            if (reqItems && reqItems.length > 0) {
              await supabase.from("sample_items").insert(
                reqItems.map((it: any) => ({
                  sample_request_id: inserted.id,
                  product_name: it.product_name,
                  quantity: it.quantity,
                  format: it.format,
                  color_finish: it.color_finish || "",
                }))
              );
            }
            await supabase.from("sample_activities").insert({
              sample_request_id: inserted.id,
              type: "Demande envoyée",
              description: `Demande de sample par ${requestData.agent_name} — Motif: ${requestData.reason}`,
              actor_name: requestData.agent_name,
            });
          } catch (err) {
            console.error("Supabase sample insert error", err);
          }
        })();
      }} />}

      {showConvertModal && (
        <ClientForm
          isConversion
          initial={{
            ...EMPTY_CLIENT,
            company_name: lead.company_name,
            contact_first_name: lead.contact_first_name,
            contact_last_name: lead.contact_last_name,
            contact_title: lead.contact_title,
            email: lead.email,
            phone: lead.phone,
            website: lead.website,
            billing_address: lead.address,
            billing_city: lead.region,
            region: lead.region,
            source: "Converti depuis CRM",
            agent_id: lead.assigned_agent_id,
            agent_name: lead.assigned_agent_name,
            lead_id: lead.id,
            is_converted_lead: true,
            crm_history_transferred: true,
          }}
          pricelists={MOCK_PRICELISTS}
          onSave={handleConvertToClient}
          onCancel={() => setShowConvertModal(false)}
        />
      )}
    </div>
  );
}

function InfoSection({ lead, daysSinceCreation, daysToTarget, probColor }: {
  lead: CRMLead; daysSinceCreation: number; daysToTarget: number | null; probColor: string;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 900 }}>
      <Card title="Coordonnées">
        <InfoRow label="Compagnie" value={lead.company_name} />
        <InfoRow label="Contact" value={`${lead.contact_first_name} ${lead.contact_last_name}`} />
        {lead.contact_title && <InfoRow label="Poste" value={lead.contact_title} />}
        <InfoRow label="Téléphone" value={lead.phone ? <a href={`tel:${lead.phone}`} style={{ color: "#111" }}>{lead.phone}</a> : "—"} />
        <InfoRow label="Email" value={lead.email ? <a href={`mailto:${lead.email}`} style={{ color: "#111" }}>{lead.email}</a> : "—"} />
        {lead.website && <InfoRow label="Site web" value={<a href={`https://${lead.website}`} target="_blank" rel="noreferrer" style={{ color: "#111" }}>{lead.website}</a>} />}
        {lead.address && <InfoRow label="Adresse" value={lead.address} />}
        <InfoRow label="Région" value={lead.region || "—"} />
        {lead.postal_code && <InfoRow label="Code postal" value={lead.postal_code} />}
      </Card>

      <Card title="Détails du lead">
        <InfoRow label="Type" value={<span style={{ color: TYPE_COLORS[lead.type as keyof typeof TYPE_COLORS], fontWeight: 600 }}>{lead.type}</span>} />
        <InfoRow label="Source" value={lead.source} />
        <InfoRow label="Valeur estimée/an" value={<strong style={{ color: "#111" }}>{new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 0 }).format(lead.estimated_value)}</strong>} />
        {lead.monthly_volume > 0 && <InfoRow label="Volume mensuel" value={`${lead.monthly_volume} gallons`} />}
        {lead.products_interest?.length > 0 && (
          <InfoRow label="Produits d'intérêt" value={
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {lead.products_interest.map(p => (
                <span key={p} style={{ fontSize: 11, padding: "2px 7px", borderRadius: 5, background: "rgba(99,102,241,0.08)", color: "#111" }}>{p}</span>
              ))}
            </div>
          } />
        )}
        <InfoRow label="Probabilité" value={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 6, background: "rgba(0,0,0,0.04)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${lead.closing_probability}%`, height: "100%", background: probColor, borderRadius: 3, transition: "width 0.4s" }} />
            </div>
            <strong style={{ color: probColor }}>{lead.closing_probability}%</strong>
          </div>
        } />
        <InfoRow label="Créé le" value={new Date(lead.created_at).toLocaleDateString("fr-CA")} />
        {lead.target_closing_date && <InfoRow label="Date cible" value={
          <span style={{ color: daysToTarget !== null && daysToTarget < 0 ? "#ef4444" : "#1c1c1e" }}>
            {new Date(lead.target_closing_date).toLocaleDateString("fr-CA")}
            {daysToTarget !== null && daysToTarget < 0 && ` (Dépassé de ${Math.abs(daysToTarget)}j)`}
            {daysToTarget !== null && daysToTarget >= 0 && ` (dans ${daysToTarget}j)`}
          </span>
        } />}
        <InfoRow label="Dans le pipeline" value={<span style={{ color: "#8e8e93" }}>{daysSinceCreation} jours</span>} />
      </Card>

      <Card title="Objectifs & Progression" style={{ gridColumn: "1 / -1" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: "#8e8e93", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Objectif revenu annuel</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>{new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 0 }).format(lead.annual_revenue_goal)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#8e8e93", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Volume mensuel cible</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>{lead.monthly_volume_goal} gal</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#8e8e93", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Probabilité de closing</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: probColor }}>{lead.closing_probability}%</div>
              <div style={{ flex: 1 }}>
                <div style={{ height: 10, background: "rgba(0,0,0,0.04)", borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ width: `${lead.closing_probability}%`, height: "100%", background: probColor, borderRadius: 5, transition: "width 0.4s" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Card({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: T.bgCard, borderRadius: 12, padding: 20, border: `1px solid ${T.border}`, ...style }}>
      <h4 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700, color: "#8e8e93", textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</h4>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "7px 0", borderBottom: "1px solid rgba(0,0,0,0.04)", gap: 12 }}>
      <span style={{ fontSize: 12, color: "#8e8e93", flexShrink: 0, paddingTop: 2 }}>{label}</span>
      <span style={{ fontSize: 13, color: "#111", textAlign: "right", wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}

function Badge({ text, bg, color }: { text: string; bg: string; color: string }) {
  return (
    <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 8, background: bg, color }}>{text}</span>
  );
}

function ActionBtn({ label, color, textColor = "#fff", onClick }: { label: string; color: string; textColor?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "9px 16px", borderRadius: 8, border: "none", background: color, color: textColor,
      cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
    }}>
      {label}
    </button>
  );
}

function ActivityEntry({ activity }: { activity: CRMActivity }) {
  const isAutomatic = activity.type === "Changement d'étape" || activity.type === "Lead créé";
  return (
    <div style={{ display: "flex", gap: 16, marginBottom: 16, position: "relative" }}>
      <div style={{
        width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
        background: isAutomatic ? "#f3f4f6" : "rgba(99,102,241,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, zIndex: 1, border: "2px solid #fff",
        boxShadow: "0 0 0 2px rgba(0,0,0,0.06)",
      }}>
        {ACTIVITY_ICONS[activity.type as ActivityType]}
      </div>
      <div style={{
        flex: 1, background: isAutomatic ? "#f9fafb" : "#fff",
        borderRadius: 10, padding: "12px 14px", border: "1px solid rgba(0,0,0,0.06)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: isAutomatic ? "#8e8e93" : "#1c1c1e" }}>{activity.title || activity.type}</span>
          <span style={{ fontSize: 11, color: "#8e8e93", whiteSpace: "nowrap", marginLeft: 8 }}>
            {new Date(activity.activity_at).toLocaleDateString("fr-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        {activity.description && (
          <div style={{ fontSize: 12, color: T.textMid, lineHeight: 1.5, marginBottom: 6 }}>{activity.description}</div>
        )}
        {activity.call_result && (
          <span style={{
            fontSize: 11, padding: "2px 8px", borderRadius: 5, fontWeight: 600,
            background: activity.call_result === "Positif" ? "rgba(34,197,94,0.12)" : activity.call_result === "Négatif" ? "rgba(239,68,68,0.12)" : "rgba(0,0,0,0.06)",
            color: activity.call_result === "Positif" ? "#16a34a" : activity.call_result === "Négatif" ? "#ef4444" : "#636366",
            marginRight: 6,
          }}>
            {activity.call_result === "Positif" ? "✅" : activity.call_result === "Négatif" ? "❌" : "➖"} {activity.call_result}
          </span>
        )}
        {activity.call_duration && <span style={{ fontSize: 11, color: "#8e8e93" }}>{activity.call_duration} min · </span>}
        <span style={{ fontSize: 11, color: "#8e8e93" }}>par {activity.logged_by_name}</span>
      </div>
    </div>
  );
}

function ReminderGroup({ title, reminders, variant, onComplete, onDelete }: {
  title: string;
  reminders: CRMReminder[];
  variant: "overdue" | "today" | "upcoming" | "completed";
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const bgMap = { overdue: "rgba(239,68,68,0.06)", today: "rgba(245,158,11,0.06)", upcoming: "#fff", completed: "#f9fafb" };
  const colorMap = { overdue: "#ef4444", today: "#d97706", upcoming: "#1c1c1e", completed: "#8e8e93" };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: colorMap[variant], textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>{title}</div>
      {reminders.map(r => {
        const daysLate = variant === "overdue" ? Math.floor((Date.now() - new Date(r.reminder_at).getTime()) / 86400000) : 0;
        const priorityColor: Record<Priority, string> = { Haute: "#ef4444", Moyenne: "#f59e0b", Basse: "#8e8e93" };

        return (
          <div key={r.id} style={{
            display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px",
            background: bgMap[variant], borderRadius: 10, marginBottom: 8,
            border: `1px solid ${variant === "overdue" ? "rgba(239,68,68,0.2)" : variant === "today" ? "rgba(245,158,11,0.2)" : "rgba(0,0,0,0.07)"}`,
            opacity: variant === "completed" ? 0.65 : 1,
          }}>
            {!r.completed && (
              <button onClick={() => onComplete(r.id)} style={{
                width: 20, height: 20, borderRadius: 4, border: `2px solid ${priorityColor[r.priority]}`,
                background: "none", cursor: "pointer", flexShrink: 0, marginTop: 2,
              }} />
            )}
            {r.completed && <span style={{ color: "#22c55e", fontSize: 18, flexShrink: 0 }}>✓</span>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: variant === "completed" ? "#8e8e93" : "#1c1c1e", textDecoration: r.completed ? "line-through" : "none" }}>{r.title}</div>
              <div style={{ fontSize: 11, color: "#8e8e93", marginTop: 2 }}>
                {variant === "overdue" ? <span style={{ color: "#ef4444", fontWeight: 600 }}>En retard de {daysLate}j</span> : new Date(r.reminder_at).toLocaleDateString("fr-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                {" · "}{r.recurrence !== "Aucune" ? `🔄 ${r.recurrence}` : ""}{r.notes && ` · ${r.notes}`}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: `${priorityColor[r.priority]}18`, color: priorityColor[r.priority] }}>
                {r.priority}
              </span>
              <button onClick={() => onDelete(r.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8e8e93", fontSize: 14, padding: 2 }}>✕</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AddActivityModal({ onSave, onClose }: { onSave: (act: Partial<CRMActivity>) => void; onClose: () => void }) {
  const { profile } = useAuth();
  const actAgentName = profile?.full_name || "Agent";
  const actAgentInitials = actAgentName.split(" ").map((n: string) => n[0]).join("").toUpperCase();
  const [type, setType] = useState<ActivityType>("Appel");
  const [description, setDescription] = useState("");
  const [callDuration, setCallDuration] = useState("");
  const [callResult, setCallResult] = useState<"Positif" | "Neutre" | "Négatif">("Positif");
  const [emailSubject, setEmailSubject] = useState("");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [meetingDuration, setMeetingDuration] = useState("");
  const [meetingAttendees, setMeetingAttendees] = useState("");
  const [proposalAmount, setProposalAmount] = useState("");
  const [lossReason, setLossReason] = useState("");
  const [activityAt, setActivityAt] = useState(new Date().toISOString().slice(0, 16));

  const types: ActivityType[] = ["Appel", "Email envoyé", "Email reçu", "Rencontre / Visite", "Pricelist envoyée", "Proposition / Soumission", "Échantillon envoyé", "Note interne", "Raison de perte"];

  const handleSave = () => {
    onSave({
      type,
      title: type,
      description,
      call_duration: callDuration ? parseInt(callDuration) : undefined,
      call_result: type === "Appel" ? callResult : undefined,
      email_subject: emailSubject || undefined,
      meeting_location: meetingLocation || undefined,
      meeting_duration: meetingDuration ? parseInt(meetingDuration) : undefined,
      meeting_attendees: meetingAttendees || undefined,
      proposal_amount: proposalAmount ? parseFloat(proposalAmount) : undefined,
      loss_reason: lossReason || undefined,
      activity_at: new Date(activityAt).toISOString(),
      logged_by_name: actAgentName,
      logged_by_initials: actAgentInitials,
    });
  };

  return (
    <Modal title="Ajouter une activité" onClose={onClose} onSave={handleSave}>
      <Field label="Type d'activité">
        <select value={type} onChange={e => setType(e.target.value as ActivityType)} style={selStyle}>
          {types.map(t => <option key={t} value={t}>{ACTIVITY_ICONS[t]} {t}</option>)}
        </select>
      </Field>

      {type === "Appel" && (
        <>
          <Field label="Durée (minutes)">
            <input type="number" value={callDuration} onChange={e => setCallDuration(e.target.value)} style={inpStyle} />
          </Field>
          <Field label="Résultat">
            <div style={{ display: "flex", gap: 12 }}>
              {(["Positif", "Neutre", "Négatif"] as const).map(r => (
                <label key={r} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                  <input type="radio" checked={callResult === r} onChange={() => setCallResult(r)} />
                  {r === "Positif" ? "✅" : r === "Négatif" ? "❌" : "➖"} {r}
                </label>
              ))}
            </div>
          </Field>
        </>
      )}

      {(type === "Email envoyé" || type === "Email reçu") && (
        <Field label="Objet">
          <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} style={inpStyle} />
        </Field>
      )}

      {type === "Rencontre / Visite" && (
        <>
          <Field label="Lieu">
            <input value={meetingLocation} onChange={e => setMeetingLocation(e.target.value)} style={inpStyle} />
          </Field>
          <Field label="Durée (minutes)">
            <input type="number" value={meetingDuration} onChange={e => setMeetingDuration(e.target.value)} style={inpStyle} />
          </Field>
          <Field label="Personnes présentes">
            <input value={meetingAttendees} onChange={e => setMeetingAttendees(e.target.value)} style={inpStyle} />
          </Field>
        </>
      )}

      {type === "Proposition / Soumission" && (
        <Field label="Montant proposé ($)">
          <input type="number" value={proposalAmount} onChange={e => setProposalAmount(e.target.value)} style={inpStyle} />
        </Field>
      )}

      {type === "Raison de perte" && (
        <Field label="Raison">
          <select value={lossReason} onChange={e => setLossReason(e.target.value)} style={selStyle}>
            {["Prix trop élevé", "Compétiteur choisi", "Pas de budget", "Timing pas bon", "Pas de réponse", "Mauvais fit produit", "Autre"].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
      )}

      <Field label="Description / Résumé">
        <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ ...inpStyle, height: 90, resize: "vertical", paddingTop: 10 }} />
      </Field>

      <Field label="Date et heure">
        <input type="datetime-local" value={activityAt} onChange={e => setActivityAt(e.target.value)} style={inpStyle} />
      </Field>
    </Modal>
  );
}

function AddReminderModal({ onSave, onClose }: { onSave: (rem: Partial<CRMReminder>) => void; onClose: () => void }) {
  const { profile } = useAuth();
  const [title, setTitle] = useState("");
  const [reminderAt, setReminderAt] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  const [priority, setPriority] = useState<Priority>("Moyenne");
  const [recurrence, setRecurrence] = useState<Recurrence>("Aucune");
  const [notes, setNotes] = useState("");

  const handleSave = () => {
    if (!title) return;
    onSave({ title, reminder_at: new Date(reminderAt).toISOString(), priority, recurrence, notes, assigned_agent_name: profile?.full_name || "Agent" });
  };

  return (
    <Modal title="Nouveau rappel" onClose={onClose} onSave={handleSave}>
      <Field label="Titre *">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Rappel de suivi..." style={inpStyle} required />
      </Field>
      <Field label="Date et heure *">
        <input type="datetime-local" value={reminderAt} onChange={e => setReminderAt(e.target.value)} style={inpStyle} />
      </Field>
      <Field label="Priorité">
        <div style={{ display: "flex", gap: 12 }}>
          {(["Haute", "Moyenne", "Basse"] as const).map(p => {
            const c = { Haute: "#ef4444", Moyenne: "#f59e0b", Basse: "#8e8e93" }[p];
            return (
              <label key={p} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                <input type="radio" checked={priority === p} onChange={() => setPriority(p)} />
                <span style={{ color: c, fontWeight: 600 }}>{p}</span>
              </label>
            );
          })}
        </div>
      </Field>
      <Field label="Récurrence">
        <select value={recurrence} onChange={e => setRecurrence(e.target.value as Recurrence)} style={selStyle}>
          {(["Aucune", "Quotidien", "Chaque 2 jours", "Hebdomadaire", "Bi-hebdomadaire", "Mensuel"] as const).map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </Field>
      <Field label="Notes additionnelles">
        <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ ...inpStyle, height: 70, resize: "vertical", paddingTop: 10 }} />
      </Field>
    </Modal>
  );
}

function Modal({ title, onClose, onSave, children }: { title: string; onClose: () => void; onSave: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: T.bgCard, borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(0,0,0,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#8e8e93" }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(0,0,0,0.07)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #ddd", background: T.bgCard, cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}>Annuler</button>
          <button onClick={onSave} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#111", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 700 }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inpStyle: React.CSSProperties = {
  width: "100%", height: 38, borderRadius: 8, border: "1px solid rgba(0,0,0,0.15)",
  padding: "0 12px", fontSize: 13, fontFamily: "inherit", outline: "none",
  boxSizing: "border-box", color: "#111",
};
const selStyle: React.CSSProperties = { ...inpStyle, cursor: "pointer", background: T.bgCard };
