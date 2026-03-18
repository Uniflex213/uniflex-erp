import React, { useState, useEffect, useMemo } from "react";
import {
  Client, TIER_COLORS, TIER_BG, TYPE_COLORS, TYPE_BG,
  DISPUTE_STATUS_COLORS, CREDIT_STATUS_COLORS, CLIENT_TYPES, CLIENT_TIERS,
} from "./clientTypes";
import ClientDetailPage from "./ClientDetailPage";
import ClientForm from "./ClientForm";
import { supabase } from "../supabaseClient";
import { useApp } from "../AppContext";
import { useAuth } from "../contexts/AuthContext";
import { MOCK_PRICELISTS } from "../pricelist/pricelistTypes";
import { useAgents } from "../hooks/useAgents";
import { useTeams } from "./agentTeamData";
import { T } from "../theme";

const fmtDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString("fr-CA", { month: "short", day: "numeric", year: "numeric" }) : "—";

type AdminTab = "clients" | "disputes" | "credit_notes";
type ViewMode = "grouped" | "flat";

interface DeleteConfirm { clientId: string; companyName: string; step: 1 | 2 }
interface ReassignModal { client: Client }

function KpiCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{ background: T.card, borderRadius: 12, padding: "15px 18px", border: `1px solid ${T.border}`, flex: 1, minWidth: 110 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 7 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: accent || T.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: T.textMid, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function downloadCSV(clients: Client[]) {
  const headers = ["Code","Compagnie","Contact","Email","Téléphone","Type","Tier","Région","Agent","Conditions paiement","Devise","Source","Créé le","Notes"];
  const rows = clients.map(c => [
    c.client_code, c.company_name,
    `${c.contact_first_name} ${c.contact_last_name}`,
    c.email, c.phone, c.client_type, c.tier, c.region,
    c.agent_name, c.payment_terms, c.currency, c.source,
    fmtDate(c.created_at), (c.notes || "").replace(/,/g, " ").replace(/\n/g, " "),
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `clients_uniflex_${new Date().toISOString().split("T")[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function AdminClientsPage() {
  const { navigate } = useApp();
  const { profile, realProfile } = useAuth();
  const ALL_AGENTS = useAgents();
  const SALES_TEAMS = useTeams();
  const ownerId = realProfile?.id ?? profile?.id ?? null;
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [tab, setTab] = useState<AdminTab>("clients");
  const [viewMode, setViewMode] = useState<ViewMode>("grouped");
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);
  const [reassignModal, setReassignModal] = useState<ReassignModal | null>(null);
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [filterAgent, setFilterAgent] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterTier, setFilterTier] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [sortKey, setSortKey] = useState<keyof Client>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("*, client_notes(*), client_credit_notes(*), client_disputes(*), client_pickup_tickets(*)")
      .order("created_at", { ascending: false });
    if (!error && data) setClients(data as Client[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const isInactive = (c: Client) => Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000) > 60;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const kpis = useMemo(() => {
    const active = clients.filter(c => !isInactive(c)).length;
    const inactive = clients.filter(isInactive).length;
    const newThisMonth = clients.filter(c => c.created_at >= monthStart).length;
    const teamBreakdown = SALES_TEAMS.map(t => ({
      name: t.name, count: clients.filter(c => t.agents.includes(c.agent_id)).length
    }));
    return { total: clients.length, active, inactive, newThisMonth, teamBreakdown };
  }, [clients]);

  const allDisputes = useMemo(() => clients.flatMap(c =>
    (c.client_disputes || []).map(d => ({ ...d, company_name: c.company_name, agent_name: c.agent_name, client_id: c.id }))
  ), [clients]);

  const allCreditNotes = useMemo(() => clients.flatMap(c =>
    (c.client_credit_notes || []).map(cn => ({ ...cn, company_name: c.company_name, agent_name: c.agent_name, client_id: c.id }))
  ), [clients]);

  const getTeamForAgent = (agentId: string) => SALES_TEAMS.find(t => t.agents.includes(agentId)) || SALES_TEAMS[SALES_TEAMS.length - 1];

  const filtered = useMemo(() => {
    let r = clients;
    if (search) {
      const s = search.toLowerCase();
      r = r.filter(c => c.company_name.toLowerCase().includes(s) || `${c.contact_first_name} ${c.contact_last_name}`.toLowerCase().includes(s) || c.email.toLowerCase().includes(s) || c.client_code.toLowerCase().includes(s));
    }
    if (filterTeam) r = r.filter(c => getTeamForAgent(c.agent_id)?.id === filterTeam);
    if (filterAgent) r = r.filter(c => c.agent_id === filterAgent);
    if (filterRegion) r = r.filter(c => c.region.toLowerCase().includes(filterRegion.toLowerCase()));
    if (filterType) r = r.filter(c => c.client_type === filterType);
    if (filterTier) r = r.filter(c => c.tier === filterTier);
    if (filterStatus === "Actif") r = r.filter(c => !isInactive(c));
    if (filterStatus === "Inactif") r = r.filter(isInactive);
    if (filterDateFrom) r = r.filter(c => c.created_at >= filterDateFrom);
    if (filterDateTo) r = r.filter(c => c.created_at <= filterDateTo + "T23:59:59");
    return [...r].sort((a, b) => {
      const va = String(a[sortKey] || "").toLowerCase();
      const vb = String(b[sortKey] || "").toLowerCase();
      return sortDir === "asc" ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1);
    });
  }, [clients, search, filterTeam, filterAgent, filterRegion, filterType, filterTier, filterStatus, filterDateFrom, filterDateTo, sortKey, sortDir]);

  const groupedByTeam = useMemo(() => {
    return SALES_TEAMS.map(team => ({
      team,
      clients: filtered.filter(c => team.agents.includes(c.agent_id)),
    })).filter(g => g.clients.length > 0);
  }, [filtered]);

  const toggleTeam = (teamId: string) => {
    setCollapsedTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId); else next.add(teamId);
      return next;
    });
  };

  const resetFilters = () => {
    setSearch(""); setFilterTeam(""); setFilterAgent(""); setFilterRegion("");
    setFilterType(""); setFilterTier(""); setFilterStatus(""); setFilterDateFrom(""); setFilterDateTo("");
  };

  const handleCreate = async (data: Omit<Client, "id" | "created_at" | "updated_at">) => {
    const now = new Date().toISOString();
    const { data: created, error } = await supabase.from("clients").insert({ ...data, created_at: now, updated_at: now, owner_id: ownerId }).select().maybeSingle();
    if (!error && created) setClients(prev => [created as Client, ...prev]);
    setShowForm(false);
  };

  const handleUpdate = (updated: Client) => {
    setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
    if (selectedClient?.id === updated.id) setSelectedClient(updated);
  };

  const handleDelete = async (clientId: string) => {
    await supabase.from("clients").delete().eq("id", clientId);
    setClients(prev => prev.filter(c => c.id !== clientId));
    setDeleteConfirm(null);
    if (selectedClient?.id === clientId) setSelectedClient(null);
  };

  const handleReassign = async (client: Client, newAgentId: string) => {
    const agent = ALL_AGENTS.find(a => a.id === newAgentId);
    if (!agent) return;
    const now = new Date().toISOString();
    const { error } = await supabase.from("clients").update({ agent_id: agent.id, agent_name: agent.name, updated_at: now }).eq("id", client.id);
    if (!error) {
      const updated = { ...client, agent_id: agent.id, agent_name: agent.name, updated_at: now };
      setClients(prev => prev.map(c => c.id === client.id ? updated : c));
    }
    setReassignModal(null);
  };

  const handleUpdateDispute = async (disputeId: string, fields: object) => {
    await supabase.from("client_disputes").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", disputeId);
    load();
  };

  const handleUpdateCreditNote = async (cnId: string, status: string) => {
    await supabase.from("client_credit_notes").update({ status, updated_at: new Date().toISOString() }).eq("id", cnId);
    load();
  };

  const selectStyle: React.CSSProperties = {
    padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`,
    fontSize: 13, color: T.text, fontFamily: "inherit", background: T.bgCard, outline: "none", cursor: "pointer",
  };

  const hasFilters = search || filterTeam || filterAgent || filterRegion || filterType || filterTier || filterStatus || filterDateFrom || filterDateTo;

  if (selectedClient) {
    return (
      <div>
        <ClientDetailPage
          client={selectedClient}
          onBack={() => setSelectedClient(null)}
          onUpdate={handleUpdate}
          pricelists={MOCK_PRICELISTS}
          navigate={navigate}
          isAdmin
          onDeleteClient={(id) => setDeleteConfirm({ clientId: id, companyName: selectedClient.company_name, step: 1 })}
          onReassignClient={(client) => setReassignModal({ client })}
        />
        {deleteConfirm && (
          <DeleteModal
            confirm={deleteConfirm}
            onChange={setDeleteConfirm}
            onConfirm={() => handleDelete(deleteConfirm.clientId)}
          />
        )}
        {reassignModal && (
          <ReassignModalComp
            client={reassignModal.client}
            onReassign={handleReassign}
            onClose={() => setReassignModal(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", color: T.text }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <h2 style={{ margin: "0 0 5px", fontSize: 24, fontWeight: 900 }}>Répertoire Clients — Administration</h2>
          <p style={{ margin: 0, color: T.textMid, fontSize: 14 }}>
            <strong style={{ color: T.main }}>{kpis.total}</strong> clients total sur la plateforme
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => downloadCSV(filtered)} style={{ padding: "9px 16px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: T.bgCard, color: T.textMid, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Exporter CSV
          </button>
          <button onClick={load} style={{ padding: "9px 16px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: T.bgCard, color: T.text, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Actualiser
          </button>
          <button onClick={() => setShowForm(true)} style={{ padding: "11px 22px", borderRadius: 10, border: "none", background: T.main, color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
            + AJOUTER UN CLIENT
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <KpiCard label="Total clients" value={kpis.total} accent={T.main} />
        <KpiCard label="Clients actifs" value={kpis.active} accent={T.green} />
        <KpiCard label="Clients inactifs" value={kpis.inactive} accent={T.orange} sub="+60j sans commande" />
        <KpiCard label="Nouveaux ce mois" value={kpis.newThisMonth} accent={T.blue} />
        <KpiCard label="Disputes ouvertes" value={allDisputes.filter(d => d.status === "Ouverte").length} accent={T.red} />
        <KpiCard label="Notes crédit en attente" value={allCreditNotes.filter(cn => cn.status === "En attente").length} accent={T.gold} />
      </div>

      <div style={{ background: T.card, borderRadius: 12, padding: "10px 14px", marginBottom: 18, border: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
          Clients par équipe
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {SALES_TEAMS.map(t => {
            const count = clients.filter(c => t.agents.includes(c.agent_id)).length;
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setFilterTeam(filterTeam === t.id ? "" : t.id)}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: t.color }} />
                <span style={{ fontSize: 13, fontWeight: filterTeam === t.id ? 800 : 500, color: filterTeam === t.id ? T.main : T.textMid }}>
                  {t.name} — <strong style={{ color: T.text }}>{count}</strong>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 0, padding: "0 2px", marginBottom: 0, background: T.card, borderRadius: "12px 12px 0 0", borderBottom: `1px solid ${T.border}`, borderTop: `1px solid ${T.border}`, borderLeft: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}` }}>
        {([["clients", `Clients (${kpis.total})`], ["disputes", `Disputes (${allDisputes.filter(d => d.status !== "Fermée").length > 0 ? "🔴 " + allDisputes.length : allDisputes.length})`], ["credit_notes", `Notes crédit (${allCreditNotes.filter(cn => cn.status === "En attente").length > 0 ? "🟡 " + allCreditNotes.length : allCreditNotes.length})`]] as [AdminTab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "12px 20px", border: "none", background: "none", cursor: "pointer",
            fontSize: 13, fontWeight: tab === t ? 700 : 400,
            color: tab === t ? T.main : T.textMid,
            borderBottom: tab === t ? `2px solid ${T.main}` : "2px solid transparent",
            fontFamily: "inherit",
          }}>{label}</button>
        ))}
      </div>

      {tab === "clients" && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderTop: "none", borderRadius: "0 0 12px 12px" }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input style={{ ...selectStyle, flex: "2 1 200px", minWidth: 180 }} placeholder="Rechercher par nom, email, code client..." value={search} onChange={e => setSearch(e.target.value)} />
            <select style={{ ...selectStyle, flex: "1 1 140px" }} value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
              <option value="">Toutes les équipes</option>
              {SALES_TEAMS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select style={{ ...selectStyle, flex: "1 1 140px" }} value={filterAgent} onChange={e => setFilterAgent(e.target.value)}>
              <option value="">Tous les agents</option>
              {ALL_AGENTS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <input style={{ ...selectStyle, flex: "1 1 110px" }} placeholder="Région..." value={filterRegion} onChange={e => setFilterRegion(e.target.value)} />
            <select style={{ ...selectStyle, flex: "1 1 120px" }} value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">Tous types</option>
              {CLIENT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <select style={{ ...selectStyle, flex: "0 1 100px" }} value={filterTier} onChange={e => setFilterTier(e.target.value)}>
              <option value="">Tiers</option>
              {CLIENT_TIERS.map(t => <option key={t}>{t}</option>)}
            </select>
            <select style={{ ...selectStyle, flex: "0 1 100px" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Statut</option>
              <option>Actif</option>
              <option>Inactif</option>
            </select>
            <input type="date" style={{ ...selectStyle, flex: "0 1 130px" }} value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} title="Date de création — depuis" />
            <input type="date" style={{ ...selectStyle, flex: "0 1 130px" }} value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} title="Date de création — jusqu'à" />
            {hasFilters && (
              <button onClick={resetFilters} style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, color: T.textMid, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Réinitialiser
              </button>
            )}

            <div style={{ marginLeft: "auto", display: "flex", gap: 2, background: '#f5f4f0', borderRadius: 6, padding: 2 }}>
              <button onClick={() => setViewMode("grouped")} style={{ padding: "3px 8px", borderRadius: 4, border: 'none', background: viewMode === "grouped" ? '#fff' : 'transparent', color: viewMode === "grouped" ? '#111' : '#999', fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", boxShadow: viewMode === "grouped" ? '0 1px 2px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.15s ease', lineHeight: 1.4 }}>
                Groupé
              </button>
              <button onClick={() => setViewMode("flat")} style={{ padding: "3px 8px", borderRadius: 4, border: 'none', background: viewMode === "flat" ? '#fff' : 'transparent', color: viewMode === "flat" ? '#111' : '#999', fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", boxShadow: viewMode === "flat" ? '0 1px 2px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.15s ease', lineHeight: 1.4 }}>
                Liste
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 48, color: T.textLight }}>Chargement...</div>
          ) : viewMode === "grouped" ? (
            <div>
              {groupedByTeam.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: T.textLight }}>Aucun client pour ces filtres.</div>
              ) : groupedByTeam.map(({ team, clients: teamClients }) => {
                const collapsed = collapsedTeams.has(team.id);
                return (
                  <div key={team.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <div
                      onClick={() => toggleTeam(team.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
                        cursor: "pointer", background: collapsed ? T.bg : `${team.color}08`,
                        borderLeft: `4px solid ${team.color}`,
                        transition: "background 0.15s",
                      }}
                    >
                      <span style={{ fontSize: 14, color: T.textMid, transition: "transform 0.2s", display: "inline-block", transform: collapsed ? "rotate(-90deg)" : "rotate(0)" }}>▼</span>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 800, fontSize: 14, color: T.text }}>{team.name}</span>
                        {team.chef !== "—" && <span style={{ fontSize: 12, color: T.textMid, marginLeft: 12 }}>Chef : {team.chef}</span>}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: team.color }}>
                        {teamClients.length} client{teamClients.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {!collapsed && (
                      <ClientTable
                        clients={teamClients}
                        onSelect={setSelectedClient}
                        onReassign={(c) => setReassignModal({ client: c })}
                        onDelete={(c) => setDeleteConfirm({ clientId: c.id, companyName: c.company_name, step: 1 })}
                        isAdmin
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <ClientTable
              clients={filtered}
              onSelect={setSelectedClient}
              onReassign={(c) => setReassignModal({ client: c })}
              onDelete={(c) => setDeleteConfirm({ clientId: c.id, companyName: c.company_name, step: 1 })}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={(k) => { if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortKey(k as keyof Client); setSortDir("asc"); } }}
              isAdmin
            />
          )}

          <div style={{ padding: "10px 16px", borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.textLight, textAlign: "right" }}>
            {filtered.length} client{filtered.length !== 1 ? "s" : ""} affiché{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {tab === "disputes" && <DisputesPanel disputes={allDisputes} onUpdate={handleUpdateDispute} onSelectClient={(id) => setSelectedClient(clients.find(c => c.id === id) || null)} />}
      {tab === "credit_notes" && <CreditNotesPanel creditNotes={allCreditNotes} onUpdate={handleUpdateCreditNote} onSelectClient={(id) => setSelectedClient(clients.find(c => c.id === id) || null)} />}

      {showForm && (
        <ClientForm
          initial={{} as any}
          pricelists={MOCK_PRICELISTS}
          clientCount={clients.length}
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
          isAdmin
        />
      )}

      {deleteConfirm && !selectedClient && (
        <DeleteModal
          confirm={deleteConfirm}
          onChange={setDeleteConfirm}
          onConfirm={() => handleDelete(deleteConfirm.clientId)}
        />
      )}

      {reassignModal && !selectedClient && (
        <ReassignModalComp
          client={reassignModal.client}
          onReassign={handleReassign}
          onClose={() => setReassignModal(null)}
        />
      )}
    </div>
  );
}

function ClientTable({
  clients, onSelect, onReassign, onDelete, sortKey, sortDir, onSort, isAdmin,
}: {
  clients: Client[];
  onSelect: (c: Client) => void;
  onReassign?: (c: Client) => void;
  onDelete?: (c: Client) => void;
  sortKey?: keyof Client;
  sortDir?: "asc" | "desc";
  onSort?: (k: string) => void;
  isAdmin?: boolean;
}) {
  const isInactive = (c: Client) => Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000) > 60;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ background: T.bg }}>
          {[
            { key: "company_name", label: "Compagnie" },
            { key: null, label: "Contact" },
            { key: "client_type", label: "Type" },
            { key: "tier", label: "Tier" },
            { key: "agent_name", label: "Agent" },
            { key: "region", label: "Région" },
            { key: "source", label: "Source" },
            { key: "created_at", label: "Créé le" },
            { key: null, label: "Statut" },
            ...(isAdmin ? [{ key: null, label: "Actions" }] : []),
          ].map(({ key, label }) => (
            <th
              key={label}
              onClick={() => key && onSort?.(key)}
              style={{
                padding: "10px 14px", textAlign: "left", fontWeight: 700, fontSize: 10,
                color: key && sortKey === key ? T.main : T.textMid,
                textTransform: "uppercase", letterSpacing: 0.4,
                cursor: key ? "pointer" : "default", userSelect: "none", whiteSpace: "nowrap",
              }}
            >
              {label} {key && sortKey === key && (sortDir === "asc" ? "↑" : "↓")}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {clients.length === 0 ? (
          <tr><td colSpan={10} style={{ textAlign: "center", padding: 28, color: T.textLight }}>Aucun client.</td></tr>
        ) : clients.map(c => (
          <tr key={c.id}
            style={{ borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "rgba(99,102,241,0.025)"}
            onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ""}
          >
            <td style={{ padding: "12px 14px" }} onClick={() => onSelect(c)}>
              <div style={{ fontWeight: 700 }}>{c.company_name}</div>
              <code style={{ fontSize: 10, color: T.textLight, fontFamily: "monospace" }}>{c.client_code}</code>
              {c.is_converted_lead && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, background: "rgba(99,102,241,0.1)", color: T.main, padding: "1px 5px", borderRadius: 6 }}>CRM</span>}
            </td>
            <td style={{ padding: "12px 14px", fontSize: 12, color: T.textMid }} onClick={() => onSelect(c)}>{c.contact_first_name} {c.contact_last_name}</td>
            <td style={{ padding: "12px 14px" }} onClick={() => onSelect(c)}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8, background: TYPE_BG[c.client_type], color: TYPE_COLORS[c.client_type] }}>{c.client_type}</span>
            </td>
            <td style={{ padding: "12px 14px" }} onClick={() => onSelect(c)}>
              <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 8, background: TIER_BG[c.tier], color: TIER_COLORS[c.tier] }}>{c.tier}</span>
            </td>
            <td style={{ padding: "12px 14px", fontSize: 12, color: T.textMid }} onClick={() => onSelect(c)}>{c.agent_name}</td>
            <td style={{ padding: "12px 14px", fontSize: 12, color: T.textMid }} onClick={() => onSelect(c)}>{c.region || "—"}</td>
            <td style={{ padding: "12px 14px", fontSize: 12, color: T.textMid }} onClick={() => onSelect(c)}>{c.source}</td>
            <td style={{ padding: "12px 14px", fontSize: 12, color: T.textMid }} onClick={() => onSelect(c)}>{fmtDate(c.created_at)}</td>
            <td style={{ padding: "12px 14px" }} onClick={() => onSelect(c)}>
              {isInactive(c) ? (
                <span style={{ fontSize: 10, fontWeight: 700, background: "rgba(245,158,11,0.12)", color: T.orange, padding: "2px 8px", borderRadius: 10 }}>Inactif</span>
              ) : (
                <span style={{ fontSize: 10, fontWeight: 700, background: "rgba(34,197,94,0.12)", color: T.green, padding: "2px 8px", borderRadius: 10 }}>Actif</span>
              )}
            </td>
            {isAdmin && (
              <td style={{ padding: "12px 14px" }}>
                <div style={{ display: "flex", gap: 5 }}>
                  <button onClick={e => { e.stopPropagation(); onReassign?.(c); }} style={{ padding: "4px 9px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.bgCard, color: T.textMid, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                    Réassigner
                  </button>
                  <button onClick={e => { e.stopPropagation(); onDelete?.(c); }} style={{ padding: "4px 9px", borderRadius: 6, border: `1px solid ${T.red}33`, background: `${T.red}08`, color: T.red, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    Supprimer
                  </button>
                </div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ResolveDisputeModal({ dispute, onClose, onResolve }: { dispute: any; onClose: () => void; onResolve: (disputeId: string, resolution: string, creditNote?: { amount: number; reason: string }) => void }) {
  const [resolution, setResolution] = useState("");
  const [createCreditNote, setCreateCreditNote] = useState(false);
  const [cnAmount, setCnAmount] = useState("");
  const [cnReason, setCnReason] = useState(dispute.subject || "");

  const handleSubmit = () => {
    if (!resolution.trim()) return;
    onResolve(
      dispute.id,
      resolution,
      createCreditNote && cnAmount ? { amount: parseFloat(cnAmount), reason: cnReason } : undefined,
    );
    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text,
    fontFamily: "inherit", background: T.bgCard, outline: "none", boxSizing: "border-box",
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999 }} onClick={onClose} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 480, background: T.bgCard, borderRadius: 16, padding: 28, zIndex: 10000, boxShadow: "0 24px 80px rgba(0,0,0,0.22)", fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: T.text, marginBottom: 6 }}>Résoudre la dispute</div>
        <p style={{ fontSize: 13, color: T.textMid, marginBottom: 18 }}>
          <strong>{dispute.company_name}</strong> — {dispute.subject}
        </p>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, display: "block" }}>Résolution *</label>
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
            value={resolution}
            onChange={e => setResolution(e.target.value)}
            placeholder="Décrivez la résolution..."
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: T.text }}>
            <input
              type="checkbox"
              checked={createCreditNote}
              onChange={e => setCreateCreditNote(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: T.main }}
            />
            Créer une note de crédit associée
          </label>
        </div>
        {createCreditNote && (
          <div style={{ background: T.bg, borderRadius: 10, padding: 14, marginBottom: 14, border: `1px solid ${T.border}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display: "block" }}>Montant ($)</label>
                <input style={inputStyle} type="number" min="0" step="0.01" value={cnAmount} onChange={e => setCnAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display: "block" }}>Raison</label>
                <input style={inputStyle} value={cnReason} onChange={e => setCnReason(e.target.value)} />
              </div>
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgCard, color: T.text, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
          <button
            onClick={handleSubmit}
            disabled={!resolution.trim() || (createCreditNote && !cnAmount)}
            style={{ padding: "10px 20px", borderRadius: 9, border: "none", background: resolution.trim() && (!createCreditNote || cnAmount) ? T.green : "#d1d5db", color: "#fff", fontSize: 13, fontWeight: 700, cursor: resolution.trim() && (!createCreditNote || cnAmount) ? "pointer" : "not-allowed", fontFamily: "inherit" }}
          >
            {createCreditNote ? "Résoudre + Créer note de crédit" : "Résoudre"}
          </button>
        </div>
      </div>
    </>
  );
}

function AdminDisputeMessagesModal({ dispute, onClose }: { dispute: any; onClose: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const fmtDT = (iso: string) => new Date(iso).toLocaleDateString("fr-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  React.useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("dispute_messages")
        .select("*")
        .eq("dispute_id", dispute.id)
        .order("created_at", { ascending: true });
      if (data) setMessages(data);
    };
    load();
  }, [dispute.id]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!newMsg.trim() || sending) return;
    setSending(true);
    const { data, error } = await supabase.from("dispute_messages").insert({
      dispute_id: dispute.id,
      author_name: "Admin",
      content: newMsg.trim(),
      is_admin: true,
      created_at: new Date().toISOString(),
    }).select().maybeSingle();
    if (!error && data) setMessages(prev => [...prev, data]);
    setNewMsg("");
    setSending(false);
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999 }} onClick={onClose} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 520, maxHeight: "80vh", background: T.bgCard, borderRadius: 16, display: "flex", flexDirection: "column", zIndex: 10000, boxShadow: "0 24px 80px rgba(0,0,0,0.22)", fontFamily: "'Outfit', sans-serif", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px 14px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: T.text, marginBottom: 4 }}>{dispute.subject}</div>
              <div style={{ fontSize: 12, color: T.textMid }}>
                {dispute.company_name} — {dispute.agent_name}
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8, background: `${DISPUTE_STATUS_COLORS[dispute.status as keyof typeof DISPUTE_STATUS_COLORS]}22`, color: DISPUTE_STATUS_COLORS[dispute.status as keyof typeof DISPUTE_STATUS_COLORS], marginLeft: 8 }}>{dispute.status}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: T.textMid, padding: 4 }}>x</button>
          </div>
        </div>
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px 24px", minHeight: 180, maxHeight: 320 }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: T.textLight, fontSize: 13 }}>Aucun message.</div>
          ) : messages.map((m: any) => (
            <div key={m.id} style={{ marginBottom: 12, display: "flex", flexDirection: "column", alignItems: m.is_admin ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "80%", padding: "10px 14px", borderRadius: 12,
                background: m.is_admin ? "rgba(239,68,68,0.06)" : T.bg,
                border: `1px solid ${m.is_admin ? "rgba(239,68,68,0.15)" : T.border}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, gap: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: m.is_admin ? T.red : T.main }}>
                    {m.author_name} {m.is_admin ? "(Admin)" : ""}
                  </span>
                  <span style={{ fontSize: 10, color: T.textLight, whiteSpace: "nowrap" }}>{fmtDT(m.created_at)}</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: T.text, lineHeight: 1.5 }}>{m.content}</p>
              </div>
            </div>
          ))}
        </div>
        {dispute.status !== "Fermée" && (
          <div style={{ padding: "12px 24px 16px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8 }}>
            <input
              style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 13, fontFamily: "inherit", outline: "none", color: T.text }}
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              placeholder="Répondre en tant qu'admin..."
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            />
            <button
              onClick={handleSend}
              disabled={!newMsg.trim() || sending}
              style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: newMsg.trim() ? T.red : "#d1d5db", color: "#fff", fontSize: 13, fontWeight: 700, cursor: newMsg.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}
            >
              Envoyer
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function DisputesPanel({ disputes, onUpdate, onSelectClient }: { disputes: any[]; onUpdate: (id: string, fields: object) => void; onSelectClient: (id: string) => void }) {
  const [resolveDispute, setResolveDispute] = useState<any | null>(null);
  const [messageDispute, setMessageDispute] = useState<any | null>(null);

  const handleResolve = async (disputeId: string, resolution: string, creditNote?: { amount: number; reason: string }) => {
    const updates: Record<string, unknown> = { status: "Résolue", resolution };

    if (creditNote) {
      const dispute = disputes.find(d => d.id === disputeId);
      if (dispute) {
        const now = new Date().toISOString();
        const { data: cn } = await supabase.from("client_credit_notes").insert({
          client_id: dispute.client_id,
          order_id: dispute.order_id || "",
          reason: "Dispute résolue",
          reason_other: creditNote.reason,
          amount: creditNote.amount,
          description: `Note de crédit issue de la dispute: ${dispute.subject}. Résolution: ${resolution}`,
          status: "Approuvée",
          created_by: "Admin",
          created_at: now,
          updated_at: now,
        }).select("id").maybeSingle();
        if (cn) updates.credit_note_id = cn.id;
      }
    }

    onUpdate(disputeId, updates);
  };

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
      {disputes.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: T.textLight }}>Aucune dispute.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: T.bg }}>
              {["Client", "Agent", "Sujet", "Priorité", "Statut", "Note crédit", "Date", "Actions"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, fontSize: 10, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {disputes.map((d: any) => (
              <tr key={d.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={{ padding: "11px 14px" }}>
                  <button onClick={() => onSelectClient(d.client_id)} style={{ background: "none", border: "none", cursor: "pointer", color: T.main, fontWeight: 700, fontSize: 13, fontFamily: "inherit", padding: 0 }}>{d.company_name}</button>
                </td>
                <td style={{ padding: "11px 14px", fontSize: 12, color: T.textMid }}>{d.agent_name}</td>
                <td style={{ padding: "11px 14px", fontWeight: 600 }}>{d.subject}</td>
                <td style={{ padding: "11px 14px" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: d.priority === "Haute" ? T.red : d.priority === "Moyenne" ? T.orange : T.textMid }}>{d.priority}</span>
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: `${DISPUTE_STATUS_COLORS[d.status as keyof typeof DISPUTE_STATUS_COLORS]}22`, color: DISPUTE_STATUS_COLORS[d.status as keyof typeof DISPUTE_STATUS_COLORS] }}>{d.status}</span>
                </td>
                <td style={{ padding: "11px 14px" }}>
                  {d.credit_note_id ? (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "rgba(34,197,94,0.12)", color: T.green }}>NC liée</span>
                  ) : (
                    <span style={{ fontSize: 11, color: T.textLight }}>—</span>
                  )}
                </td>
                <td style={{ padding: "11px 14px", fontSize: 12, color: T.textMid }}>{fmtDate(d.created_at)}</td>
                <td style={{ padding: "11px 14px" }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    <button onClick={() => setMessageDispute(d)} style={{ padding: "4px 9px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.bgCard, color: T.main, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Messages</button>
                    {d.status === "Ouverte" && <button onClick={() => onUpdate(d.id, { status: "En cours" })} style={{ padding: "4px 9px", borderRadius: 6, border: "none", background: T.orange, color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Prendre en charge</button>}
                    {d.status === "En cours" && <button onClick={() => setResolveDispute(d)} style={{ padding: "4px 9px", borderRadius: 6, border: "none", background: T.green, color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Résoudre</button>}
                    {d.status === "Résolue" && <button onClick={() => onUpdate(d.id, { status: "Fermée" })} style={{ padding: "4px 9px", borderRadius: 6, border: "none", background: T.textMid, color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Fermer</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {resolveDispute && (
        <ResolveDisputeModal
          dispute={resolveDispute}
          onClose={() => setResolveDispute(null)}
          onResolve={handleResolve}
        />
      )}
      {messageDispute && (
        <AdminDisputeMessagesModal
          dispute={messageDispute}
          onClose={() => setMessageDispute(null)}
        />
      )}
    </div>
  );
}

function CreditNotesPanel({ creditNotes, onUpdate, onSelectClient }: { creditNotes: any[]; onUpdate: (id: string, status: string) => void; onSelectClient: (id: string) => void }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
      {creditNotes.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: T.textLight }}>Aucune note de crédit.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: T.bg }}>
              {["Client", "Agent", "Raison", "Montant", "Statut", "Date", "Actions"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, fontSize: 10, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {creditNotes.map((cn: any) => (
              <tr key={cn.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={{ padding: "11px 14px" }}>
                  <button onClick={() => onSelectClient(cn.client_id)} style={{ background: "none", border: "none", cursor: "pointer", color: T.main, fontWeight: 700, fontSize: 13, fontFamily: "inherit", padding: 0 }}>{cn.company_name}</button>
                </td>
                <td style={{ padding: "11px 14px", fontSize: 12, color: T.textMid }}>{cn.agent_name}</td>
                <td style={{ padding: "11px 14px" }}>{cn.reason}</td>
                <td style={{ padding: "11px 14px", fontWeight: 700 }}>{Number(cn.amount || 0).toLocaleString("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 })}</td>
                <td style={{ padding: "11px 14px" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: `${CREDIT_STATUS_COLORS[cn.status as keyof typeof CREDIT_STATUS_COLORS]}22`, color: CREDIT_STATUS_COLORS[cn.status as keyof typeof CREDIT_STATUS_COLORS] }}>{cn.status}</span>
                </td>
                <td style={{ padding: "11px 14px", fontSize: 12, color: T.textMid }}>{fmtDate(cn.created_at)}</td>
                <td style={{ padding: "11px 14px" }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    {cn.status === "En attente" && (
                      <>
                        <button onClick={() => onUpdate(cn.id, "Approuvée")} style={{ padding: "4px 9px", borderRadius: 6, border: "none", background: T.green, color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Approuver</button>
                        <button onClick={() => onUpdate(cn.id, "Rejetée")} style={{ padding: "4px 9px", borderRadius: 6, border: "none", background: T.red, color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Rejeter</button>
                      </>
                    )}
                    {cn.status === "Approuvée" && <button onClick={() => onUpdate(cn.id, "Appliquée")} style={{ padding: "4px 9px", borderRadius: 6, border: "none", background: T.blue, color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Appliquer</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function DeleteModal({ confirm, onChange, onConfirm }: { confirm: DeleteConfirm; onChange: (c: DeleteConfirm | null) => void; onConfirm: () => void }) {
  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999 }} onClick={() => onChange(null)} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 420, background: T.bgCard, borderRadius: 16, padding: 28, zIndex: 10000, boxShadow: "0 24px 80px rgba(0,0,0,0.22)", fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: T.text, marginBottom: 10 }}>
          {confirm.step === 1 ? "Supprimer ce client ?" : "Confirmation finale"}
        </div>
        <p style={{ fontSize: 14, color: T.textMid, marginBottom: 20, lineHeight: 1.5 }}>
          {confirm.step === 1
            ? `Vous êtes sur le point de supprimer "${confirm.companyName}". Toutes les données (notes, disputes, notes de crédit) seront supprimées. Cette action est irréversible.`
            : `Confirmez-vous la suppression définitive de "${confirm.companyName}" ? Cette action ne peut pas être annulée.`}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => onChange(null)} style={{ padding: "10px 20px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgCard, color: T.text, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
          {confirm.step === 1 ? (
            <button onClick={() => onChange({ ...confirm, step: 2 })} style={{ padding: "10px 20px", borderRadius: 9, border: "none", background: T.orange, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Continuer</button>
          ) : (
            <button onClick={onConfirm} style={{ padding: "10px 20px", borderRadius: 9, border: "none", background: T.red, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Supprimer définitivement</button>
          )}
        </div>
      </div>
    </>
  );
}

function ReassignModalComp({ client, onReassign, onClose }: { client: Client; onReassign: (client: Client, agentId: string) => void; onClose: () => void }) {
  const ALL_AGENTS = useAgents();
  const SALES_TEAMS = useTeams();
  const [selectedAgent, setSelectedAgent] = useState(client.agent_id);
  const selectedAgentData = ALL_AGENTS.find(a => a.id === selectedAgent);
  const team = selectedAgentData ? SALES_TEAMS.find(t => t.agents.includes(selectedAgent)) : null;

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999 }} onClick={onClose} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 420, background: T.bgCard, borderRadius: 16, padding: 28, zIndex: 10000, boxShadow: "0 24px 80px rgba(0,0,0,0.22)", fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: T.text, marginBottom: 6 }}>Réassigner le client</div>
        <p style={{ fontSize: 13, color: T.textMid, marginBottom: 18 }}>Client : <strong>{client.company_name}</strong></p>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, display: "block" }}>Nouvel agent assigné</label>
          <select
            value={selectedAgent}
            onChange={e => setSelectedAgent(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 13, fontFamily: "inherit", outline: "none", cursor: "pointer" }}
          >
            {ALL_AGENTS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {team && <div style={{ marginTop: 8, fontSize: 12, color: T.textMid }}>Équipe : {team.name}</div>}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgCard, color: T.text, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
          <button onClick={() => onReassign(client, selectedAgent)} disabled={selectedAgent === client.agent_id} style={{ padding: "10px 20px", borderRadius: 9, border: "none", background: selectedAgent !== client.agent_id ? T.main : "#d1d5db", color: "#fff", fontSize: 13, fontWeight: 700, cursor: selectedAgent !== client.agent_id ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
            Confirmer la réassignation
          </button>
        </div>
      </div>
    </>
  );
}
