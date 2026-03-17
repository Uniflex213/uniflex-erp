import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { LOG_COLORS, ACTION_LABELS } from "../../lib/activityLogger";
import { T } from "../../theme";

interface LogRow {
  id: string;
  user_id: string;
  action: string;
  module: string;
  entity_type?: string;
  entity_id?: string;
  entity_name?: string;
  details: Record<string, unknown>;
  created_at: string;
  profile?: { full_name: string; role: string };
}

const MODULE_FILTERS = [
  { key: "all", label: "Tous" },
  ...Object.entries(LOG_COLORS).map(([k, v]) => ({ key: k, label: v.label })),
];

const PAGE_SIZE = 50;

export default function ActivityLogbook() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("profiles").select("id, full_name").then(({ data }) => {
      if (data) setUsers(data);
    });
  }, []);

  const fetchLogs = useCallback(async (reset = false) => {
    setLoading(true);
    const currentPage = reset ? 0 : page;
    let query = supabase
      .from("activity_logs")
      .select("*, profile:profiles(full_name, role)")
      .not("action", "in", '("login","logout")')
      .order("created_at", { ascending: false })
      .range(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE - 1);

    if (moduleFilter !== "all") query = query.eq("module", moduleFilter);
    if (userFilter !== "all") query = query.eq("user_id", userFilter);
    if (search.trim()) query = query.ilike("entity_name", `%${search.trim()}%`);

    const { data } = await query;
    const rows = (data ?? []) as LogRow[];
    if (reset) {
      setLogs(rows);
      setPage(0);
    } else {
      setLogs(prev => [...prev, ...rows]);
    }
    setHasMore(rows.length === PAGE_SIZE);
    setLoading(false);
  }, [moduleFilter, userFilter, search, page]);

  useEffect(() => { fetchLogs(true); }, [moduleFilter, userFilter, search]);

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric" })
      + " " + d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
  };

  const getModuleStyle = (module: string) => LOG_COLORS[module] ?? { bg: "#f1f5f9", color: T.textMid, label: module };

  const getRoleLabel = (role: string) => {
    const map: Record<string, string> = { god_admin: "God Admin", admin: "Admin", vendeur: "Vendeur", manuf: "Manuf", magasin: "Magasin" };
    return map[role] ?? role;
  };

  const todayCount = logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length;
  const moduleBreakdown = Object.entries(
    logs.reduce<Record<string, number>>((acc, l) => { acc[l.module] = (acc[l.module] ?? 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: T.main, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>
            </svg>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.text }}>Logbook Compagnie</h1>
            <p style={{ margin: 0, fontSize: 13, color: T.textLight }}>Toutes les actions — connexions exclues</p>
          </div>
        </div>
      </div>

      {/* KPI bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: "12px 20px", flex: "1 1 140px" }}>
          <div style={{ fontSize: 11, color: T.textLight, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Aujourd'hui</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: T.main }}>{todayCount}</div>
        </div>
        <div style={{ background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: "12px 20px", flex: "1 1 140px" }}>
          <div style={{ fontSize: 11, color: T.textLight, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Chargés</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: T.text }}>{logs.length}</div>
        </div>
        {moduleBreakdown.slice(0, 3).map(([mod, count]) => {
          const style = getModuleStyle(mod);
          return (
            <div key={mod} style={{ background: style.bg, borderRadius: 10, border: `1px solid ${T.border}`, padding: "12px 20px", flex: "1 1 120px", cursor: "pointer" }}
              onClick={() => setModuleFilter(mod === moduleFilter ? "all" : mod)}>
              <div style={{ fontSize: 11, color: style.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{style.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: style.color }}>{count}</div>
            </div>
          );
        })}
      </div>

      {/* Filtres */}
      <div style={{ background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: "14px 16px", marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par entité..."
          style={{ flex: "1 1 200px", padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, outline: "none", fontFamily: "inherit" }}
        />
        <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
          {MODULE_FILTERS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
        <select value={userFilter} onChange={e => setUserFilter(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
          <option value="all">Tous les utilisateurs</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
        <button onClick={() => { setModuleFilter("all"); setUserFilter("all"); setSearch(""); }}
          style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", fontSize: 13, cursor: "pointer", color: T.textMid, fontFamily: "inherit" }}>
          Réinitialiser
        </button>
      </div>

      {/* Légende couleurs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {Object.entries(LOG_COLORS).map(([key, val]) => (
          <button key={key} onClick={() => setModuleFilter(moduleFilter === key ? "all" : key)}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, border: `1.5px solid ${moduleFilter === key ? val.color : "transparent"}`, background: val.bg, cursor: "pointer", fontSize: 11, fontWeight: 600, color: val.color }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: val.color }} />
            {val.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 140px 100px 120px 36px", gap: 0, padding: "10px 16px", background: "#f8f9fc", borderBottom: `1px solid ${T.border}`, fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5 }}>
          <span>Horodatage</span>
          <span>Action</span>
          <span>Utilisateur</span>
          <span>Module</span>
          <span>Entité</span>
          <span></span>
        </div>

        {loading && logs.length === 0 && (
          <div style={{ padding: "40px 16px", textAlign: "center", color: T.textLight, fontSize: 13 }}>Chargement...</div>
        )}

        {!loading && logs.length === 0 && (
          <div style={{ padding: "40px 16px", textAlign: "center", color: T.textLight, fontSize: 13 }}>Aucune action trouvée</div>
        )}

        {logs.map((log, i) => {
          const mod = getModuleStyle(log.module);
          const isExpanded = expanded === log.id;
          const actionLabel = ACTION_LABELS[log.action] ?? log.action;
          return (
            <React.Fragment key={log.id}>
              <div
                style={{
                  display: "grid", gridTemplateColumns: "160px 1fr 140px 100px 120px 36px",
                  gap: 0, padding: "10px 16px",
                  borderBottom: i < logs.length - 1 ? `1px solid ${T.border}` : "none",
                  background: isExpanded ? `${mod.bg}60` : "transparent",
                  transition: "background 0.15s",
                  alignItems: "center",
                  cursor: "pointer",
                }}
                onClick={() => setExpanded(isExpanded ? null : log.id)}
                onMouseOver={e => { if (!isExpanded) e.currentTarget.style.background = "#f8f9fc"; }}
                onMouseOut={e => { if (!isExpanded) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontSize: 11, color: T.textMid, fontVariantNumeric: "tabular-nums" }}>{fmt(log.created_at)}</span>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 3, height: 24, borderRadius: 2, background: mod.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{actionLabel}</span>
                </div>

                <span style={{ fontSize: 12, color: T.textMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {log.profile?.full_name ?? "—"}
                </span>

                <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 20, background: mod.bg, color: mod.color, fontSize: 10, fontWeight: 700 }}>
                  {mod.label}
                </span>

                <span style={{ fontSize: 12, color: T.textMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {log.entity_name ?? "—"}
                </span>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: T.textLight }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {isExpanded
                      ? <polyline points="18 15 12 9 6 15"/>
                      : <polyline points="6 9 12 15 18 9"/>}
                  </svg>
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: "12px 16px 16px 36px", background: `${mod.bg}40`, borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 12 }}>
                    <div><span style={{ color: T.textLight }}>Action brute : </span><code style={{ background: "rgba(0,0,0,0.05)", padding: "1px 6px", borderRadius: 4 }}>{log.action}</code></div>
                    {log.entity_type && <div><span style={{ color: T.textLight }}>Type : </span><strong>{log.entity_type}</strong></div>}
                    {log.entity_id && <div><span style={{ color: T.textLight }}>ID : </span><code style={{ background: "rgba(0,0,0,0.05)", padding: "1px 6px", borderRadius: 4 }}>{log.entity_id}</code></div>}
                    {log.profile?.role && <div><span style={{ color: T.textLight }}>Rôle : </span><strong>{getRoleLabel(log.profile.role)}</strong></div>}
                    {Object.keys(log.details ?? {}).filter(k => !["entity_type","entity_id","entity_name"].includes(k)).map(k => (
                      <div key={k}><span style={{ color: T.textLight }}>{k} : </span><strong>{String(log.details[k])}</strong></div>
                    ))}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}

        {hasMore && !loading && (
          <div style={{ padding: "12px 16px", textAlign: "center", borderTop: `1px solid ${T.border}` }}>
            <button
              onClick={() => { setPage(p => p + 1); fetchLogs(false); }}
              style={{ padding: "8px 24px", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", fontSize: 13, cursor: "pointer", color: T.textMid, fontFamily: "inherit" }}>
              Charger plus
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
