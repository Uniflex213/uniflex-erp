import React, { useState, useEffect } from "react";
import {
  Users, TrendingUp, ShoppingCart, Package, Calendar, FileText,
  BarChart2, Download,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { AdminProfile } from "./adminTypes";
import { T } from "../../theme";

const TABS = [
  { key: "overview", label: "Vue générale", icon: BarChart2 },
  { key: "crm", label: "CRM", icon: TrendingUp },
  { key: "orders", label: "Commandes", icon: ShoppingCart },
  { key: "clients", label: "Clients", icon: Users },
  { key: "tickets", label: "Tickets & Échantillons", icon: Package },
  { key: "compare", label: "Stats comparées", icon: BarChart2 },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface UserStats {
  leadsCount: number;
  ordersCount: number;
  clientsCount: number;
  ticketsCount: number;
  samplesCount: number;
  calendarCount: number;
  marginsCount: number;
  ordersTotal: number;
  leadsStages: Record<string, number>;
  recentOrders: { id: string; client: string; total: number; status: string; date: string }[];
  recentLeads: { id: string; company_name: string; stage: string; temperature: string; estimated_value: number }[];
  recentClients: { id: string; company_name: string; contact_first_name: string; contact_last_name: string; created_at: string }[];
  permissions: string[];
}

const EMPTY_STATS: UserStats = {
  leadsCount: 0, ordersCount: 0, clientsCount: 0, ticketsCount: 0,
  samplesCount: 0, calendarCount: 0, marginsCount: 0, ordersTotal: 0,
  leadsStages: {}, recentOrders: [], recentLeads: [], recentClients: [], permissions: [],
};

function KpiCard({ label, value, icon: Icon, color = T.main }: { label: string; value: number | string; icon: React.ElementType; color?: string }) {
  return (
    <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 140 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>{value}</div>
        <div style={{ fontSize: 11, color: T.mid, fontWeight: 500, marginTop: 1 }}>{label}</div>
      </div>
    </div>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const colors: Record<string, string> = {
    "Nouveau Lead": "#6b7280", "Contacté": "#2563eb", "Qualifié": "#d97706",
    "Proposition Envoyée": "#7c3aed", "Négociation": "#ea580c", "Gagné": "#059669", "Perdu": "#dc2626",
  };
  const c = colors[stage] || "#6b7280";
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: `${c}18`, color: c }}>{stage}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    pending: { label: "En attente", color: "#d97706" },
    approved: { label: "Approuvé", color: "#059669" },
    rejected: { label: "Rejeté", color: "#dc2626" },
    revision: { label: "Révision", color: "#7c3aed" },
  };
  const s = map[status] || { label: status, color: "#6b7280" };
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: `${s.color}18`, color: s.color }}>{s.label}</span>;
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
}

interface AllUsersStats {
  userId: string;
  name: string;
  role: string;
  leads: number;
  orders: number;
  clients: number;
  ordersTotal: number;
}

export default function AdminUserStats({
  user,
  allUsers,
}: {
  user: AdminProfile;
  allUsers: AdminProfile[];
}) {
  const [tab, setTab] = useState<TabKey>("overview");
  const [stats, setStats] = useState<UserStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [compareStats, setCompareStats] = useState<AllUsersStats[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setStats(EMPTY_STATS);
    const uid = user.id;

    async function load() {
      const [
        leadsRes, ordersRes, clientsRes, ticketsRes,
        samplesRes, calRes, marginsRes, permsRes,
      ] = await Promise.all([
        supabase.from("crm_leads").select("id, company_name, stage, temperature, estimated_value").eq("owner_id", uid).order("created_at", { ascending: false }).limit(50),
        supabase.from("orders").select("id, client, total, status, date").eq("owner_id", uid).order("created_at", { ascending: false }).limit(50),
        supabase.from("clients").select("id, company_name, contact_first_name, contact_last_name, created_at").eq("owner_id", uid).order("created_at", { ascending: false }).limit(50),
        supabase.from("pickup_tickets").select("id", { count: "exact", head: true }).eq("owner_id", uid),
        supabase.from("sample_requests").select("id", { count: "exact", head: true }).eq("owner_id", uid),
        supabase.from("calendar_events").select("id", { count: "exact", head: true }).eq("owner_id", uid),
        supabase.from("margin_analyses").select("id", { count: "exact", head: true }).eq("owner_id", uid),
        supabase.from("user_permissions").select("permission_key").eq("user_id", uid),
      ]);

      const leads = (leadsRes.data || []) as { id: string; company_name: string; stage: string; temperature: string; estimated_value: number }[];
      const orders = (ordersRes.data || []) as { id: string; client: string; total: number; status: string; date: string }[];
      const clients = (clientsRes.data || []) as { id: string; company_name: string; contact_first_name: string; contact_last_name: string; created_at: string }[];

      const leadsStages: Record<string, number> = {};
      for (const l of leads) leadsStages[l.stage] = (leadsStages[l.stage] || 0) + 1;

      const ordersTotal = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);

      setStats({
        leadsCount: leads.length,
        ordersCount: orders.length,
        clientsCount: clients.length,
        ticketsCount: ticketsRes.count ?? 0,
        samplesCount: samplesRes.count ?? 0,
        calendarCount: calRes.count ?? 0,
        marginsCount: marginsRes.count ?? 0,
        ordersTotal,
        leadsStages,
        recentOrders: orders.slice(0, 10),
        recentLeads: leads.slice(0, 10),
        recentClients: clients.slice(0, 10),
        permissions: (permsRes.data || []).map((p: { permission_key: string }) => p.permission_key),
      });
      setLoading(false);
    }

    load();
  }, [user.id]);

  useEffect(() => {
    if (tab !== "compare") return;
    if (compareStats.length > 0) return;
    setCompareLoading(true);

    async function loadCompare() {
      const ids = allUsers.map(u => u.id);
      const [leadsRes, ordersRes, clientsRes] = await Promise.all([
        supabase.from("crm_leads").select("owner_id").in("owner_id", ids),
        supabase.from("orders").select("owner_id, total").in("owner_id", ids),
        supabase.from("clients").select("owner_id").in("owner_id", ids),
      ]);

      const leadsMap: Record<string, number> = {};
      for (const r of (leadsRes.data || [])) leadsMap[r.owner_id] = (leadsMap[r.owner_id] || 0) + 1;

      const ordersMap: Record<string, { count: number; total: number }> = {};
      for (const r of (ordersRes.data || [])) {
        if (!ordersMap[r.owner_id]) ordersMap[r.owner_id] = { count: 0, total: 0 };
        ordersMap[r.owner_id].count++;
        ordersMap[r.owner_id].total += Number(r.total) || 0;
      }

      const clientsMap: Record<string, number> = {};
      for (const r of (clientsRes.data || [])) clientsMap[r.owner_id] = (clientsMap[r.owner_id] || 0) + 1;

      setCompareStats(allUsers.map(u => ({
        userId: u.id,
        name: u.full_name,
        role: u.role,
        leads: leadsMap[u.id] || 0,
        orders: ordersMap[u.id]?.count || 0,
        clients: clientsMap[u.id] || 0,
        ordersTotal: ordersMap[u.id]?.total || 0,
      })).sort((a, b) => b.ordersTotal - a.ordersTotal));
      setCompareLoading(false);
    }

    loadCompare();
  }, [tab, allUsers, compareStats.length]);

  function exportCSV() {
    const rows = [
      ["Nom", "Leads", "Commandes", "CA Total", "Clients", "Tickets", "Échantillons"],
      [user.full_name, stats.leadsCount, stats.ordersCount, stats.ordersTotal.toFixed(2), stats.clientsCount, stats.ticketsCount, stats.samplesCount],
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stats_${user.full_name.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ padding: "16px 24px 0", borderBottom: `1px solid ${T.border}`, background: T.bgCard, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: "7px 14px", borderRadius: "8px 8px 0 0", border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
                  background: tab === t.key ? "#fff" : "transparent",
                  color: tab === t.key ? T.main : T.mid,
                  borderBottom: tab === t.key ? `2px solid ${T.main}` : "2px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={exportCSV}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", border: `1px solid ${T.border}`, borderRadius: 8, background: T.bgCard, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: T.mid }}
          >
            <Download size={13} />
            Exporter CSV
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 24, background: T.bg }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: T.mid, fontSize: 14 }}>Chargement...</div>
        ) : (
          <>
            {tab === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <KpiCard label="Leads CRM" value={stats.leadsCount} icon={TrendingUp} color={T.main} />
                  <KpiCard label="Commandes" value={stats.ordersCount} icon={ShoppingCart} color="#2563eb" />
                  <KpiCard label="CA Total" value={fmt(stats.ordersTotal)} icon={FileText} color="#059669" />
                  <KpiCard label="Clients" value={stats.clientsCount} icon={Users} color="#d97706" />
                  <KpiCard label="Tickets" value={stats.ticketsCount} icon={Package} color="#7c3aed" />
                  <KpiCard label="Évènements cal." value={stats.calendarCount} icon={Calendar} color="#ea580c" />
                </div>

                {stats.permissions.length > 0 && (
                  <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 12 }}>Permissions actives ({stats.permissions.length})</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {stats.permissions.map(p => (
                        <span key={p} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: `${T.main}12`, color: T.main, fontWeight: 600 }}>{p}</span>
                      ))}
                    </div>
                  </div>
                )}

                {Object.keys(stats.leadsStages).length > 0 && (
                  <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 12 }}>Pipeline CRM</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {Object.entries(stats.leadsStages).map(([stage, count]) => (
                        <div key={stage} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <StageBadge stage={stage} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "crm" && (
              <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, fontSize: 13, fontWeight: 700, color: T.text }}>
                  Leads CRM ({stats.leadsCount})
                </div>
                {stats.recentLeads.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: T.light, fontSize: 13 }}>Aucun lead</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: T.bg }}>
                        {["Entreprise", "Stade", "Température", "Valeur estimée"].map(h => (
                          <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: T.mid }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentLeads.map(l => (
                        <tr key={l.id} style={{ borderTop: `1px solid ${T.border}` }}>
                          <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: T.text }}>{l.company_name}</td>
                          <td style={{ padding: "10px 16px" }}><StageBadge stage={l.stage} /></td>
                          <td style={{ padding: "10px 16px", fontSize: 12, color: T.mid }}>{l.temperature}</td>
                          <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: T.text }}>{l.estimated_value > 0 ? fmt(l.estimated_value) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {tab === "orders" && (
              <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Commandes ({stats.ordersCount})</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.green }}>CA: {fmt(stats.ordersTotal)}</span>
                </div>
                {stats.recentOrders.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: T.light, fontSize: 13 }}>Aucune commande</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: T.bg }}>
                        {["Client", "Date", "Total", "Statut"].map(h => (
                          <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: T.mid }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentOrders.map(o => (
                        <tr key={o.id} style={{ borderTop: `1px solid ${T.border}` }}>
                          <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: T.text }}>{o.client}</td>
                          <td style={{ padding: "10px 16px", fontSize: 12, color: T.mid }}>{o.date}</td>
                          <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 700, color: T.text }}>{fmt(o.total)}</td>
                          <td style={{ padding: "10px 16px" }}><StatusBadge status={o.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {tab === "clients" && (
              <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, fontSize: 13, fontWeight: 700, color: T.text }}>
                  Clients ({stats.clientsCount})
                </div>
                {stats.recentClients.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: T.light, fontSize: 13 }}>Aucun client</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: T.bg }}>
                        {["Entreprise", "Contact", "Date d'ajout"].map(h => (
                          <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: T.mid }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentClients.map(c => (
                        <tr key={c.id} style={{ borderTop: `1px solid ${T.border}` }}>
                          <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: T.text }}>{c.company_name}</td>
                          <td style={{ padding: "10px 16px", fontSize: 12, color: T.mid }}>{[c.contact_first_name, c.contact_last_name].filter(Boolean).join(" ") || "—"}</td>
                          <td style={{ padding: "10px 16px", fontSize: 12, color: T.mid }}>{c.created_at?.split("T")[0] || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {tab === "tickets" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <KpiCard label="Tickets de cueillette" value={stats.ticketsCount} icon={Package} color="#7c3aed" />
                  <KpiCard label="Demandes d'échantillons" value={stats.samplesCount} icon={FileText} color="#ea580c" />
                  <KpiCard label="Analyses de marge" value={stats.marginsCount} icon={BarChart2} color={T.green} />
                </div>
                <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24, color: T.mid, fontSize: 13, textAlign: "center" }}>
                  Détail des tickets et échantillons disponible dans les modules respectifs.
                </div>
              </div>
            )}

            {tab === "compare" && (
              <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, fontSize: 13, fontWeight: 700, color: T.text }}>
                  Statistiques comparées — tous les utilisateurs
                </div>
                {compareLoading ? (
                  <div style={{ padding: 40, textAlign: "center", color: T.light, fontSize: 13 }}>Chargement...</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: T.bg }}>
                        {["Utilisateur", "Rôle", "Leads", "Commandes", "CA Total", "Clients"].map(h => (
                          <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: T.mid }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {compareStats.map((row, i) => {
                        const isCurrentUser = row.userId === user.id;
                        return (
                          <tr
                            key={row.userId}
                            style={{ borderTop: `1px solid ${T.border}`, background: isCurrentUser ? `${T.main}08` : i % 2 === 0 ? "#fff" : "#fafafa" }}
                          >
                            <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: isCurrentUser ? 700 : 500, color: isCurrentUser ? T.main : T.text }}>{row.name}</td>
                            <td style={{ padding: "10px 16px", fontSize: 12, color: T.mid }}>{row.role}</td>
                            <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: T.text }}>{row.leads}</td>
                            <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: T.text }}>{row.orders}</td>
                            <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 700, color: row.ordersTotal > 0 ? T.green : T.light }}>{row.ordersTotal > 0 ? fmt(row.ordersTotal) : "—"}</td>
                            <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: T.text }}>{row.clients}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
