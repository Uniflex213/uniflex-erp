import { useState, useMemo } from "react";
import { Upload as UploadIcon, Download as DownloadIcon } from "lucide-react";
import { CRMLead, Stage, CRMActivity } from "./crmTypes";
import { MOCK_LEADS, enrichLeads } from "./crmMockData";
import CRMKpiBar from "./CRMKpiBar";
import CRMFilterBar, { CRMFilters, DEFAULT_FILTERS } from "./CRMFilters";
import CRMKanban from "./CRMKanban";
import CRMListView from "./CRMListView";
import CRMLeadDetail from "./CRMLeadDetail";
import CRMNewLeadModal from "./CRMNewLeadModal";
import LiveNewsBanner from "./LiveNewsBanner";
import CRMImportModal from "./import/CRMImportModal";
import { useApp } from "../AppContext";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import { supabase } from "../supabaseClient";
import { T } from "../theme";
import { useStaggerReveal } from "../hooks/useStaggerReveal";

function applyFilters(leads: CRMLead[], f: CRMFilters): CRMLead[] {
  return leads.filter(lead => {
    if (f.search) {
      const q = f.search.toLowerCase();
      if (!lead.company_name.toLowerCase().includes(q) &&
          !`${lead.contact_first_name} ${lead.contact_last_name}`.toLowerCase().includes(q)) return false;
    }
    if (f.stage && lead.stage !== f.stage) return false;
    if (f.temperature && lead.temperature !== f.temperature) return false;
    if (f.agent && lead.assigned_agent_id !== f.agent) return false;
    if (f.region && lead.region !== f.region) return false;
    if (f.type && lead.type !== f.type) return false;
    if (f.dateFrom && new Date(lead.created_at) < new Date(f.dateFrom)) return false;
    if (f.dateTo && new Date(lead.created_at) > new Date(f.dateTo)) return false;
    if (f.valueMin && lead.estimated_value < parseFloat(f.valueMin)) return false;
    if (f.valueMax && lead.estimated_value > parseFloat(f.valueMax)) return false;
    return true;
  });
}

// ── Glass Button ──
function GlassButton({ children, onClick, primary, style: extraStyle }: {
  children: React.ReactNode; onClick: () => void; primary?: boolean; style?: React.CSSProperties;
}) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 6,
      background: primary ? T.main : T.glassCard,
      border: primary ? "none" : `1px solid ${T.glassCardBorder}`,
      borderRadius: 8, padding: primary ? "10px 22px" : "7px 14px",
      cursor: "pointer", fontSize: primary ? 14 : 13,
      fontWeight: primary ? 700 : 600, color: primary ? "#fff" : T.text,
      fontFamily: "Inter, system-ui, sans-serif",
      backdropFilter: primary ? undefined : T.glassBlur,
      transition: "all 0.2s ease",
      boxShadow: primary ? T.shadowGlow : "none",
      ...extraStyle,
    }}>
      {children}
    </button>
  );
}

export default function CRMPipelineTeamPage() {
  const { leads, setLeads, navigate, samples, addSample, reloadLeads, addLead, updateLead, deleteLead, addActivity: persistActivity } = useApp();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const agentName = profile?.full_name || "Agent";
  const agentInitials = agentName.split(" ").map(n => n[0]).join("").toUpperCase();
  const [filters, setFilters] = useState<CRMFilters>(DEFAULT_FILTERS);
  const [view, setView] = useState<"board" | "list">("board");
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const reveal = useStaggerReveal(6, 60);

  const handleExport = async () => {
    const { data } = await supabase
      .from("crm_leads")
      .select("company_name,contact_first_name,contact_last_name,phone,email,region,type,stage,source,estimated_value,created_at")
      .eq("archived", false)
      .order("created_at", { ascending: false });
    if (!data) return;
    const headers = [t("crm.company", "Entreprise"), t("crm.first_name", "Prénom"), t("crm.last_name", "Nom"), t("phone", "Téléphone"), t("email", "Email"), t("crm.region", "Région"), t("type", "Type"), t("crm.stage_detail", "Étape"), t("crm.source", "Source"), t("crm.estimated_value_per_year", "Valeur estimée"), t("crm.created_at", "Date création")];
    const rows = data.map((r: any) => [
      r.company_name, r.contact_first_name, r.contact_last_name,
      r.phone, r.email, r.region, r.type, r.stage, r.source,
      r.estimated_value, new Date(r.created_at).toLocaleDateString("fr-CA"),
    ].map(v => `"${String(v ?? "").replace(/"/g, '""')}"`));
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crm_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLeads = useMemo(() => applyFilters(leads, filters), [leads, filters]);

  const handleStageChange = async (leadId: string, newStage: Stage) => {
    const now = new Date().toISOString();
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    const oldStage = lead.stage;
    const updated: CRMLead = {
      ...lead,
      stage: newStage,
      last_activity_at: now,
      closed_at: newStage === "Fermé Gagné" || newStage === "Fermé Perdu" ? now : lead.closed_at,
      updated_at: now,
    };
    await updateLead(updated);
    await persistActivity({
      lead_id: leadId,
      type: "Changement d'étape",
      title: `${t("crm.moved_to", "Déplacé vers")} ${newStage}`,
      description: `${t("crm.lead_moved_from", "Lead déplacé de")} "${oldStage}" ${t("crm.to", "vers")} "${newStage}".`,
      stage_from: oldStage,
      stage_to: newStage,
      logged_by_name: agentName,
      logged_by_initials: agentInitials,
      activity_at: now,
    });
    if (selectedLead?.id === leadId) {
      setSelectedLead(prev => prev ? { ...prev, stage: newStage } : null);
    }
  };

  const handleLeadUpdate = async (updated: CRMLead) => {
    await updateLead(updated);
    if (selectedLead?.id === updated.id) setSelectedLead(updated);
  };

  const handleLeadDelete = async (leadId: string) => {
    await deleteLead(leadId);
    if (selectedLead?.id === leadId) setSelectedLead(null);
  };

  const handleNewLead = async (data: Omit<CRMLead, "id" | "created_at" | "updated_at">) => {
    const result = await addLead({ ...data, vendeur_code: profile?.vendeur_code ?? null });
    if (!result) {
      console.error("Supabase insert failed — addLead returned null");
      return;
    }
    setShowNewLead(false);
  };

  if (selectedLead) {
    const currentLead = leads.find((l: CRMLead) => l.id === selectedLead.id) || selectedLead;
    const leadSamples = samples.filter(s => s.lead_id === currentLead.id);
    return (
      <div style={{ height: "100%", overflow: "auto" }}>
        <CRMLeadDetail
          lead={currentLead}
          onBack={() => setSelectedLead(null)}
          onUpdate={handleLeadUpdate}
          onNavigate={navigate}
          leadSamples={leadSamples}
          onAddSample={addSample}
        />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        @keyframes breatheGlow {
          0%, 100% { box-shadow: ${T.shadowGlow}; }
          50% { box-shadow: 0 0 28px rgba(99,102,241,0.4), 0 0 0 4px rgba(99,102,241,0.1); }
        }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{
        background: T.glassCard, borderBottom: `1px solid ${T.glassCardBorder}`,
        padding: "18px 24px 14px", flexShrink: 0, backdropFilter: T.glassBlur,
        ...reveal(0),
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: T.textLight, marginBottom: 4 }}>
              Sales Pipeline
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: T.text, margin: "0 0 4px", letterSpacing: -0.5 }}>
              CRM Pipeline Team
            </h1>
            <p style={{ fontSize: 12, color: T.textMid, margin: 0 }}>
              {t("crm.shared_view", "Vue partagée")} — {filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""} {filters !== DEFAULT_FILTERS ? t("crm.filtered", "(filtrés)") : t("crm.total_label", "au total")}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, ...reveal(1) }}>
            <GlassButton onClick={() => setShowImport(true)}>
              <UploadIcon size={14} color={T.main} />
              {t("import", "Importer")}
            </GlassButton>
            <GlassButton onClick={handleExport}>
              <DownloadIcon size={14} color={T.textMid} />
              {t("export", "Exporter")}
            </GlassButton>
            <GlassButton onClick={() => setShowNewLead(true)} primary style={{ animation: "breatheGlow 2.5s ease-in-out infinite" }}>
              + {t("crm.new_lead", "Nouveau lead")}
            </GlassButton>
          </div>
        </div>

        <div style={reveal(2)}>
          <CRMKpiBar leads={leads} samples={samples} onSelectLead={setSelectedLead} />
        </div>
      </div>

      <div style={reveal(3)}>
        <LiveNewsBanner leads={leads} samples={samples} onNavigate={navigate} />
      </div>

      {/* ── FILTERS ── */}
      <div style={{
        background: T.glassCard, borderBottom: `1px solid ${T.glassCardBorder}`,
        padding: "10px 24px", flexShrink: 0, backdropFilter: T.glassBlur,
        ...reveal(4),
      }}>
        <CRMFilterBar filters={filters} onChange={setFilters} view={view} onViewChange={setView} totalCount={leads.length} filteredCount={filteredLeads.length} />
      </div>

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px 24px", ...reveal(5) }}>
        {view === "board" ? (
          <CRMKanban
            leads={filteredLeads.filter(l => !l.archived)}
            samples={samples}
            onLeadClick={setSelectedLead}
            onStageChange={handleStageChange}
            onLeadUpdate={handleLeadUpdate}
            onLeadDelete={handleLeadDelete}
          />
        ) : (
          <CRMListView
            leads={filteredLeads.filter(l => !l.archived)}
            onLeadClick={setSelectedLead}
          />
        )}
      </div>

      {showNewLead && (
        <CRMNewLeadModal
          onSave={handleNewLead}
          onClose={() => setShowNewLead(false)}
          isAdmin={true}
        />
      )}

      {showImport && (
        <CRMImportModal
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          onImported={(count) => {
            setShowImport(false);
            reloadLeads();
          }}
        />
      )}
    </div>
  );
}
