import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { SampleStatus, SAMPLE_STATUS_COLORS, SAMPLE_STATUS_BG } from "../../sales/sampleTypes";
import { T } from "../../theme";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-CA", { year: "numeric", month: "short", day: "numeric" });

interface SampleRow {
  id: string;
  lead_company_name: string;
  agent_name: string;
  priority: string;
  status: SampleStatus;
  created_at: string;
  timer_expires_at?: string;
  items?: { product_name: string; quantity: number; format: string }[];
}

function TimerBadge({ expiresAt }: { expiresAt?: string }) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  const hours = Math.floor(diff / 3600000);
  const isExpired = diff <= 0;
  const isUrgent = !isExpired && hours < 12;

  if (isExpired) return (
    <span style={{ background: "#fee2e2", color: "#dc2626", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4 }}>Expiré</span>
  );
  if (isUrgent) return (
    <span style={{ background: "#fffbeb", color: "#d4a017", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4 }}>{hours}h restant</span>
  );
  const days = Math.floor(hours / 24);
  const remH = hours % 24;
  return (
    <span style={{ background: "#f3f4f6", color: "#6b7280", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4 }}>
      {days > 0 ? `${days}j ${remH}h` : `${hours}h`} restant
    </span>
  );
}

const ALL_STATUSES: SampleStatus[] = [
  "En attente d'approbation", "Approuvé", "En préparation",
  "Envoyé", "Livré", "Follow-up requis", "Follow-up complété", "Rejeté",
];

export default function ManufSamplesView() {
  const [samples, setSamples] = useState<SampleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SampleStatus | "all">("all");

  useEffect(() => {
    supabase
      .from("sample_requests")
      .select("id, lead_company_name, agent_name, priority, status, created_at, timer_expires_at, items:sample_items(product_name, quantity, format)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setSamples((data ?? []) as SampleRow[]);
        setLoading(false);
      });
  }, []);

  const filtered = samples.filter(s => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (s.lead_company_name ?? "").toLowerCase().includes(q) ||
        (s.items ?? []).some(it => it.product_name.toLowerCase().includes(q));
    }
    return true;
  });

  const counts = ALL_STATUSES.reduce((acc, st) => {
    acc[st] = samples.filter(s => s.status === st).length;
    return acc;
  }, {} as Record<SampleStatus, number>);

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: T.text }}>Échantillons</h1>
            <span style={{ background: "#fffbeb", color: T.accent, fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 5, border: `1px solid ${T.accent}33` }}>LECTURE SEULE</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: T.textMid }}>Toutes les demandes d'échantillons — vue lecture seule.</p>
        </div>
        <div style={{ background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: "8px 14px", fontSize: 13, fontWeight: 700, color: T.text }}>
          {samples.length} demande{samples.length !== 1 ? "s" : ""} total
        </div>
      </div>

      <div style={{ display: "flex", gap: 2, marginBottom: 14, flexWrap: "wrap", background: '#f5f4f0', borderRadius: 6, padding: 2, width: 'fit-content' }}>
        <button onClick={() => setStatusFilter("all")} style={{
          background: statusFilter === "all" ? '#fff' : 'transparent', color: statusFilter === "all" ? '#111' : '#999',
          border: 'none',
          borderRadius: 4, padding: "3px 8px", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          boxShadow: statusFilter === "all" ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
          transition: 'all 0.15s ease', lineHeight: 1.4,
        }}>Tous ({samples.length})</button>
        {ALL_STATUSES.map(st => counts[st] > 0 && (
          <button key={st} onClick={() => setStatusFilter(st)} style={{
            background: statusFilter === st ? '#fff' : 'transparent',
            color: statusFilter === st ? SAMPLE_STATUS_COLORS[st] : '#999',
            border: 'none',
            borderRadius: 4, padding: "3px 8px", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            boxShadow: statusFilter === st ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.15s ease', lineHeight: 1.4,
          }}>{st} ({counts[st]})</button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.card, borderRadius: 8, border: `1px solid ${T.border}`, padding: "0 12px", marginBottom: 16 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.textMid} strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par entreprise ou produit..."
          style={{ border: "none", outline: "none", fontSize: 13, color: T.text, fontFamily: "inherit", background: "transparent", flex: 1, padding: "9px 0" }} />
      </div>

      <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8f9fb" }}>
                {["Entreprise", "Agent", "Priorité", "Produits demandés", "Statut", "Timer 72h", "Date demande"].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: T.textMid, fontSize: 13 }}>Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: T.textMid, fontSize: 13 }}>Aucune demande trouvée.</td></tr>
              ) : filtered.map((s, i) => {
                const sc = SAMPLE_STATUS_COLORS[s.status] ?? T.textMid;
                const sbg = SAMPLE_STATUS_BG[s.status] ?? "#f3f4f6";
                const prioColor = s.priority === "Urgente" ? "#dc2626" : s.priority === "Normale" ? "#2563eb" : T.textMid;
                return (
                  <tr key={s.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, color: T.text, borderBottom: `1px solid ${T.border}` }}>{s.lead_company_name || "—"}</td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: T.textMid, borderBottom: `1px solid ${T.border}` }}>{s.agent_name || "—"}</td>
                    <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ color: prioColor, fontSize: 11, fontWeight: 700 }}>{s.priority}</span>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: T.textMid, borderBottom: `1px solid ${T.border}`, maxWidth: 220 }}>
                      {(s.items ?? []).map(it => `${it.product_name} (×${it.quantity} ${it.format})`).join(", ") || "—"}
                    </td>
                    <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ background: sbg, color: sc, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 5, whiteSpace: "nowrap" }}>{s.status}</span>
                    </td>
                    <td style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}` }}>
                      <TimerBadge expiresAt={s.timer_expires_at} />
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: T.textMid, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{fmtDate(s.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && (
          <div style={{ padding: "10px 16px", borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.textLight, background: "#f8f9fb" }}>
            {filtered.length} demande{filtered.length !== 1 ? "s" : ""} affichée{filtered.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
