import React, { useState } from "react";
import { CRMLead, STAGE_COLORS, TEMP_COLORS, TEMP_LABEL } from "./crmTypes";
import { T } from "../theme";
const fmt = (n: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

type SortKey = "company_name" | "stage" | "temperature" | "estimated_value" | "last_activity_at" | "assigned_agent_name" | "region";

interface Props {
  leads: CRMLead[];
  onLeadClick: (lead: CRMLead) => void;
}

const PAGE_SIZE = 25;

export default function CRMListView({ leads, onLeadClick }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("last_activity_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  };

  const sorted = [...leads].sort((a, b) => {
    let av: string | number = a[sortKey] as string | number ?? "";
    let bv: string | number = b[sortKey] as string | number ?? "";
    if (typeof av === "string") av = av.toLowerCase();
    if (typeof bv === "string") bv = bv.toLowerCase();
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const thStyle = (key: SortKey): React.CSSProperties => ({
    padding: "10px 14px", fontSize: 11, fontWeight: 700, color: T.textLight,
    textTransform: "uppercase" as const, letterSpacing: 0.5, textAlign: "left",
    cursor: "pointer", whiteSpace: "nowrap", userSelect: "none",
    borderBottom: `2px solid ${sortKey === key ? T.main : "rgba(0,0,0,0.07)"}`,
    background: sortKey === key ? "rgba(99,102,241,0.04)" : "transparent",
  });

  const now = new Date();

  return (
    <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: T.bg }}>
              {([
                ["company_name", "Compagnie"],
                ["contact", "Contact"],
                ["phone", "Téléphone"],
                ["email", "Email"],
                ["stage", "Étape"],
                ["temperature", "Temp."],
                ["estimated_value", "Valeur estimée"],
                ["last_activity_at", "Dernière activité"],
                ["next_action", "Prochaine action"],
                ["assigned_agent_name", "Agent"],
                ["region", "Région"],
              ] as [SortKey | string, string][]).map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => ["company_name","stage","temperature","estimated_value","last_activity_at","assigned_agent_name","region"].includes(key) ? handleSort(key as SortKey) : null}
                  style={thStyle(key as SortKey)}
                >
                  {label}
                  {sortKey === key && <span style={{ marginLeft: 4 }}>{sortDir === "asc" ? "↑" : "↓"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((lead, i) => {
              const nextReminder = lead.reminders?.find(r => !r.completed && new Date(r.reminder_at) > now);
              const overdueReminder = lead.reminders?.some(r => !r.completed && new Date(r.reminder_at) < now);
              const daysAgo = Math.floor((Date.now() - new Date(lead.last_activity_at).getTime()) / 86400000);

              return (
                <tr
                  key={lead.id}
                  onClick={() => onLeadClick(lead)}
                  style={{
                    background: i % 2 === 0 ? "#fff" : T.bg,
                    cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = "rgba(99,102,241,0.04)")}
                  onMouseOut={e => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : T.bg)}
                >
                  <td style={{ padding: "11px 14px", fontWeight: 600, color: T.text, whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {overdueReminder && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", display: "inline-block", flexShrink: 0, animation: "pulse 1.5s infinite" }} />}
                      {lead.company_name}
                    </div>
                  </td>
                  <td style={{ padding: "11px 14px", color: T.textMid, whiteSpace: "nowrap" }}>
                    {lead.contact_first_name} {lead.contact_last_name}
                  </td>
                  <td style={{ padding: "11px 14px", color: T.textMid, whiteSpace: "nowrap" }}>
                    {lead.phone ? <a href={`tel:${lead.phone}`} style={{ color: T.main, textDecoration: "none" }}>{lead.phone}</a> : "—"}
                  </td>
                  <td style={{ padding: "11px 14px", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {lead.email ? <a href={`mailto:${lead.email}`} style={{ color: T.main, textDecoration: "none" }}>{lead.email}</a> : "—"}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, borderRadius: 6, padding: "3px 8px",
                      background: `${STAGE_COLORS[lead.stage]}18`, color: STAGE_COLORS[lead.stage], whiteSpace: "nowrap",
                    }}>
                      {lead.stage}
                    </span>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: TEMP_COLORS[lead.temperature] }}>
                      {TEMP_LABEL[lead.temperature]}
                    </span>
                  </td>
                  <td style={{ padding: "11px 14px", fontWeight: 700, color: T.main, whiteSpace: "nowrap" }}>
                    {fmt(lead.estimated_value)}
                  </td>
                  <td style={{ padding: "11px 14px", whiteSpace: "nowrap", color: daysAgo > 14 ? "#ef4444" : daysAgo > 7 ? "#f59e0b" : T.textMid }}>
                    {daysAgo > 14 ? "⚠️ " : ""}{daysAgo}j
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: 12, color: T.textLight, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {nextReminder ? nextReminder.title : <em>Aucune</em>}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: "50%", background: lead.assigned_agent_color,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 9, fontWeight: 700, flexShrink: 0,
                      }}>
                        {lead.assigned_agent_initials}
                      </div>
                      <span style={{ fontSize: 12, color: T.textMid, whiteSpace: "nowrap" }}>
                        {lead.assigned_agent_name.split(" ")[0]}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "11px 14px", color: T.textMid, whiteSpace: "nowrap" }}>
                    {lead.region}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: `1px solid ${T.border}` }}>
          <span style={{ fontSize: 12, color: T.textLight }}>
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} sur {sorted.length} leads
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <PageBtn label="‹" disabled={page === 1} onClick={() => setPage(p => p - 1)} />
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <PageBtn key={p} label={p.toString()} active={p === page} onClick={() => setPage(p)} />
            ))}
            <PageBtn label="›" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} />
          </div>
        </div>
      )}
    </div>
  );
}

function PageBtn({ label, onClick, disabled, active }: { label: string; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 32, height: 32, borderRadius: 6, border: `1px solid ${active ? T.main : "rgba(0,0,0,0.12)"}`,
        background: active ? T.main : "#fff", color: active ? "#fff" : disabled ? "#ccc" : T.text,
        cursor: disabled ? "not-allowed" : "pointer", fontSize: 13, fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );
}
