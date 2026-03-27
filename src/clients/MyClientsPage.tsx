import React, { useState, useEffect, useMemo } from "react";
import { Client, TIER_COLORS, TIER_BG, TYPE_COLORS, TYPE_BG, EMPTY_CLIENT } from "./clientTypes";
import ClientForm from "./ClientForm";
import ClientDetailPage from "./ClientDetailPage";
import { supabase } from "../supabaseClient";
import { useApp } from "../AppContext";
import { useAuth } from "../contexts/AuthContext";
import { useCurrentAgent } from "../hooks/useCurrentAgent";
import { MOCK_PRICELISTS } from "../pricelist/pricelistTypes";
import { useLanguage } from "../i18n/LanguageContext";
import { T } from "../theme";


function KpiCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{
      background: T.card, borderRadius: 12, padding: "16px 18px",
      border: `1px solid ${T.border}`, flex: 1, minWidth: 120,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: accent || T.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.textMid, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

type SortKey = "company_name" | "tier" | "region" | "created_at" | "client_type";

export default function MyClientsPage() {
  const { navigate, leads, samples } = useApp();
  const { profile, realProfile } = useAuth();
  const { t } = useLanguage();
  const agent = useCurrentAgent();
  const ownerId = realProfile?.id ?? profile?.id ?? null;
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterTier, setFilterTier] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const loadClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("*, client_notes(*), client_credit_notes(*), client_disputes(*), client_pickup_tickets(*)")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false });
    if (!error && data) setClients(data as Client[]);
    setLoading(false);
  };

  useEffect(() => { loadClients(); }, []);

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const isInactive = (c: Client) => {
    const daysSince = Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000);
    return daysSince > 60;
  };

  const kpis = useMemo(() => {
    const active = clients.filter(c => !isInactive(c)).length;
    const inactive = clients.filter(isInactive).length;
    return { active, inactive, total: clients.length };
  }, [clients]);

  const regions = useMemo(() => {
    const r = new Set(clients.map(c => c.region).filter(Boolean));
    return Array.from(r).sort();
  }, [clients]);

  const filtered = useMemo(() => {
    let r = clients;
    if (search) {
      const s = search.toLowerCase();
      r = r.filter(c =>
        c.company_name.toLowerCase().includes(s) ||
        `${c.contact_first_name} ${c.contact_last_name}`.toLowerCase().includes(s) ||
        c.email.toLowerCase().includes(s) ||
        c.phone.includes(s)
      );
    }
    if (filterType) r = r.filter(c => c.client_type === filterType);
    if (filterTier) r = r.filter(c => c.tier === filterTier);
    if (filterRegion) r = r.filter(c => c.region === filterRegion);
    if (filterStatus === "Actif") r = r.filter(c => !isInactive(c));
    if (filterStatus === "Inactif") r = r.filter(isInactive);

    r = [...r].sort((a, b) => {
      let va: string | number = a[sortKey] || "";
      let vb: string | number = b[sortKey] || "";
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      return sortDir === "asc" ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1);
    });
    return r;
  }, [clients, search, filterType, filterTier, filterRegion, filterStatus, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
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

  if (selectedClient) {
    return (
      <ClientDetailPage
        client={selectedClient}
        onBack={() => setSelectedClient(null)}
        onUpdate={handleUpdate}
        pricelists={MOCK_PRICELISTS}
        navigate={navigate}
        crmActivities={leads.find(l => l.id === selectedClient.lead_id)?.activities || []}
        clientSamples={samples.filter(s => (s as any).client_id === selectedClient.id)}
      />
    );
  }

  const selectStyle: React.CSSProperties = {
    padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`,
    fontSize: 13, color: T.text, fontFamily: "inherit", background: T.bgCard, outline: "none", cursor: "pointer",
  };

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", color: T.text }}>
      <style>{`
        @keyframes breathe { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0.25)} 50%{box-shadow:0 0 0 8px rgba(99,102,241,0)} }
        .btn-breathe { animation: breathe 2.5s ease-in-out infinite; }
        .client-row:hover { background: rgba(99,102,241,0.03) !important; }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 900, color: T.text }}>{t("clients.title", "Mes Clients")}</h2>
          <p style={{ margin: 0, color: T.textMid, fontSize: 14 }}>
            <span style={{ fontWeight: 700, color: T.main }}>{kpis.active}</span> {t("clients.active_clients", "clients actifs")}
          </p>
        </div>
        <button
          className="btn-breathe"
          onClick={() => setShowForm(true)}
          style={{
            padding: "12px 24px", borderRadius: 10, border: "none",
            background: T.main, color: "#fff", fontSize: 13, fontWeight: 800,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          + {t("clients.new", "Nouveau client").toUpperCase()}
        </button>
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <KpiCard label={t("clients.active_clients", "Clients actifs")} value={kpis.active} accent={T.main} />
        <KpiCard label={t("clients.inactive_clients", "Clients inactifs")} value={kpis.inactive} sub={t("clients.60_days_no_order", "+60 jours sans commande")} accent={T.orange} />
        <KpiCard label={t("clients.total_clients", "Total clients")} value={kpis.total} accent={T.text} />
        <KpiCard label={t("clients.types", "Types")} value={new Set(clients.map(c => c.client_type)).size} sub={t("clients.different_types", "types différents")} />
        <KpiCard label={t("clients.regions", "Régions")} value={new Set(clients.map(c => c.region).filter(Boolean)).size} sub={t("clients.covered_regions", "régions couvertes")} />
        <KpiCard label="Tiers HIGH" value={clients.filter(c => c.tier === "HIGH").length} accent="#d4a017" />
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <input
          style={{ ...selectStyle, flex: 1, minWidth: 200 }}
          placeholder={t("clients.search_placeholder", "Rechercher par compagnie, contact, email, téléphone...")}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select style={selectStyle} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">{t("clients.all_types", "Tous les types")}</option>
          {["Installateur", "Distributeur", "Large Scale", "Contracteur", "Autre"].map(t => <option key={t}>{t}</option>)}
        </select>
        <select style={selectStyle} value={filterTier} onChange={e => setFilterTier(e.target.value)}>
          <option value="">{t("clients.all_tiers", "Tous les tiers")}</option>
          {["HIGH", "MED", "LOW"].map(t => <option key={t}>{t}</option>)}
        </select>
        <select style={selectStyle} value={filterRegion} onChange={e => setFilterRegion(e.target.value)}>
          <option value="">{t("clients.all_regions", "Toutes les régions")}</option>
          {regions.map(r => <option key={r}>{r}</option>)}
        </select>
        <select style={selectStyle} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">{t("clients.all_statuses", "Tous les statuts")}</option>
          <option value="Actif">{t("active", "Actif")}</option>
          <option value="Inactif">{t("inactive", "Inactif")}</option>
        </select>
        {(search || filterType || filterTier || filterRegion || filterStatus) && (
          <button onClick={() => { setSearch(""); setFilterType(""); setFilterTier(""); setFilterRegion(""); setFilterStatus(""); }}
            style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, color: T.textMid, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {t("reset", "Réinitialiser")}
          </button>
        )}
      </div>

      <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: T.bg }}>
              {[
                { key: "company_name" as SortKey, label: t("clients.company", "Compagnie") },
                { key: null, label: t("crm.contact", "Contact") },
                { key: "client_type" as SortKey, label: t("type", "Type") },
                { key: "region" as SortKey, label: t("crm.region", "Région") },
                { key: "tier" as SortKey, label: "Tier" },
                { key: null, label: t("clients.last_order", "Dernière commande") },
                { key: null, label: t("status", "Statut") },
              ].map(({ key, label }) => (
                <th
                  key={label}
                  onClick={() => key && toggleSort(key)}
                  style={{
                    padding: "12px 14px", textAlign: "left", fontWeight: 700, fontSize: 11,
                    color: key && sortKey === key ? T.main : T.textMid,
                    textTransform: "uppercase", letterSpacing: 0.4,
                    cursor: key ? "pointer" : "default", userSelect: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                  {key && sortKey === key && <span style={{ marginLeft: 4 }}>{sortDir === "asc" ? "↑" : "↓"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: T.textLight }}>{t("loading_dots", "Chargement...")}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: T.textLight }}>
                {clients.length === 0 ? t("clients.no_clients_yet", "Aucun client pour l'instant. Créez votre premier client !") : t("clients.no_results_filters", "Aucun résultat pour ces filtres.")}
              </td></tr>
            ) : filtered.map(c => {
              const inactive = isInactive(c);
              return (
                <tr
                  key={c.id}
                  className="client-row"
                  onClick={() => setSelectedClient(c)}
                  style={{ borderBottom: `1px solid ${T.border}`, cursor: "pointer", transition: "background 0.1s" }}
                >
                  <td style={{ padding: "13px 14px" }}>
                    <div style={{ fontWeight: 700, color: T.text }}>{c.company_name}</div>
                    <div style={{ fontSize: 11, color: T.textLight, marginTop: 2, fontFamily: "monospace" }}>{c.client_code}</div>
                    {c.is_converted_lead && <span style={{ fontSize: 10, fontWeight: 700, background: "rgba(99,102,241,0.1)", color: T.main, padding: "1px 6px", borderRadius: 8 }}>CRM</span>}
                  </td>
                  <td style={{ padding: "13px 14px" }}>
                    <div style={{ fontWeight: 600 }}>{c.contact_first_name} {c.contact_last_name}</div>
                    <div style={{ fontSize: 11, color: T.textLight }}>{c.email}</div>
                  </td>
                  <td style={{ padding: "13px 14px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 8, background: TYPE_BG[c.client_type], color: TYPE_COLORS[c.client_type] }}>
                      {c.client_type}
                    </span>
                  </td>
                  <td style={{ padding: "13px 14px", fontSize: 12, color: T.textMid }}>{c.region || "—"}</td>
                  <td style={{ padding: "13px 14px" }}>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 8, background: TIER_BG[c.tier], color: TIER_COLORS[c.tier] }}>
                      {c.tier}
                    </span>
                  </td>
                  <td style={{ padding: "13px 14px", fontSize: 12, color: T.textMid }}>—</td>
                  <td style={{ padding: "13px 14px" }}>
                    {inactive ? (
                      <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(245,158,11,0.12)", color: T.orange, padding: "3px 9px", borderRadius: 10 }}>
                        ⚠️ Inactif
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(34,197,94,0.12)", color: T.green, padding: "3px 9px", borderRadius: 10 }}>
                        Actif
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: T.textLight, textAlign: "right" }}>
        {filtered.length} {t("client", "client")}{filtered.length !== 1 ? "s" : ""} {t("clients.displayed", "affiché")}{filtered.length !== 1 ? "s" : ""}
      </div>

      {showForm && (
        <ClientForm
          initial={{ ...EMPTY_CLIENT, agent_id: agent.id, agent_name: agent.name }}
          pricelists={MOCK_PRICELISTS}
          clientCount={clients.length}
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
