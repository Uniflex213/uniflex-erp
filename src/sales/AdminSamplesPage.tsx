import React, { useState, useEffect } from "react";
import { SampleRequest, SampleStatus, SAMPLE_STATUS_COLORS, SAMPLE_STATUS_BG, TRANSPORTEURS } from "./sampleTypes";
import { supabase } from "../supabaseClient";
import { useApp } from "../AppContext";
import SendEmailModal from "../components/email/SendEmailModal";
import { tplSampleApproved, tplSampleDelivered } from "../lib/emailTemplates";
import { T } from "../theme";
import { sendNotification } from "../lib/notifications";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 0 }).format(n);

const fmtDate = (iso?: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-CA", { year: "numeric", month: "short", day: "numeric" });
};

const fmtShort = (s: string) =>
  new Date(`${s}T00:00`).toLocaleDateString("fr-CA", { month: "short", day: "numeric" });

const daysSince = (iso: string) =>
  Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

const TRUCK_ICON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: "middle", marginRight: 3 }}>
    <rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 5v4h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

function StatusBadge({ status }: { status: SampleStatus }) {
  const color = SAMPLE_STATUS_COLORS[status];
  const bg = SAMPLE_STATUS_BG[status];
  const isPending = status === "En attente d'approbation";
  const isFollowUp = status === "Follow-up requis";
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "3px 8px",
      background: bg, color,
      border: isPending ? `1.5px dashed ${color}` : undefined,
      display: "inline-block",
      animation: isFollowUp ? "pulse 1.5s infinite" : "none",
      whiteSpace: "nowrap",
    }}>
      {status === "Envoyé" ? <>{TRUCK_ICON}{status}</> : status}
    </span>
  );
}

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

const inpStyle: React.CSSProperties = {
  width: "100%", height: 38, borderRadius: 8, border: "1px solid rgba(0,0,0,0.15)",
  padding: "0 12px", fontSize: 13, fontFamily: "inherit", outline: "none",
  boxSizing: "border-box", color: T.text, background: T.bgCard,
};
const selStyle: React.CSSProperties = { ...inpStyle, cursor: "pointer" };
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 5 };

export default function AdminSamplesPage() {
  const { reloadSamples: ctxReloadSamples } = useApp();
  const [samples, setSamples] = useState<SampleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "inprogress" | "delivered" | "completed" | "history" | "analytics">("pending");
  const [filterAgent, setFilterAgent] = useState("");
  const [filterStatus, setFilterStatus] = useState<SampleStatus | "">("");
  const [search, setSearch] = useState("");

  const [approveModal, setApproveModal] = useState<SampleRequest | null>(null);
  const [shipModal, setShipModal] = useState<SampleRequest | null>(null);
  const [rejectModal, setRejectModal] = useState<SampleRequest | null>(null);
  const [deliverModal, setDeliverModal] = useState<SampleRequest | null>(null);
  const [detailModal, setDetailModal] = useState<SampleRequest | null>(null);
  const [sampleEmailModal, setSampleEmailModal] = useState<{ subject: string; html: string; text: string } | null>(null);

  useEffect(() => {
    loadSamples();
  }, []);

  const loadSamples = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sample_requests")
        .select("*, sample_items(*), sample_activities(*)")
        .order("created_at", { ascending: false });
      if (!error && data) {
        setSamples(data.map((s: any) => ({
          ...s,
          items: s.sample_items || [],
          activities: s.sample_activities || [],
        })));
      }
    } finally {
      setLoading(false);
    }
  };

  const updateSample = async (id: string, updates: Partial<SampleRequest>, actDesc?: string) => {
    const { updated_at: _, items: __, activities: ___, sample_items: ____, sample_activities: _____, ...rest } = updates as any;
    const now = new Date().toISOString();
    await supabase.from("sample_requests").update({ ...rest, updated_at: now }).eq("id", id);
    if (actDesc) {
      await supabase.from("sample_activities").insert({
        sample_request_id: id,
        type: actDesc.split(" ")[0] || "update",
        description: actDesc,
        actor_name: "Admin",
        created_at: now,
      });
    }
    await loadSamples();
    await ctxReloadSamples();
  };

  const handleApprove = async (sample: SampleRequest, eta: string, notes: string, cost: number) => {
    const now = new Date().toISOString();
    await updateSample(sample.id, {
      status: "Approuvé",
      approved_by: "Admin",
      approved_at: now,
      approval_notes: notes,
      estimated_cost: cost,
      eta_delivery: eta || undefined,
    }, `✅ Sample approuvé par Admin${notes ? ` — ${notes}` : ""}`);
    // Notify the sales agent who requested the sample
    if (sample.agent_id) {
      sendNotification(sample.agent_id, "sample", `Sample approuvé : ${(sample as any).client_name || ""}`, notes || undefined, "sample", sample.id);
    }
    setApproveModal(null);
    const tpl = tplSampleApproved(sample as unknown as Record<string, unknown>);
    setSampleEmailModal({ subject: tpl.subject, html: tpl.html, text: tpl.text });
  };

  const handleSetInPrep = async (sample: SampleRequest) => {
    await updateSample(sample.id, { status: "En préparation" }, "📦 Sample mis en préparation par Admin");
  };

  const handleShip = async (sample: SampleRequest, transporteur: string, tracking: string, eta: string, notes: string) => {
    const now = new Date().toISOString();
    await updateSample(sample.id, {
      status: "Envoyé",
      transporteur,
      tracking_number: tracking,
      eta_delivery: eta || undefined,
      shipped_at: now,
    }, `🚚 Sample expédié — ${transporteur}${tracking ? ` — Tracking: ${tracking}` : ""}${eta ? ` — ETA: ${eta}` : ""}`);
    setShipModal(null);
  };

  const handleDeliver = async (sample: SampleRequest) => {
    const now = new Date().toISOString();
    const timerExpiry = new Date(Date.now() + 72 * 3600 * 1000).toISOString();
    await updateSample(sample.id, {
      status: "Livré",
      delivered_at: now,
      timer_expires_at: timerExpiry,
    }, "📬 Sample marqué comme livré — Timer 72h activé");
    setDeliverModal(null);
    const tpl = tplSampleDelivered(sample as unknown as Record<string, unknown>, "Admin");
    setSampleEmailModal({ subject: tpl.subject, html: tpl.html, text: tpl.text });
  };

  const handleReject = async (sample: SampleRequest, reason: string) => {
    await updateSample(sample.id, {
      status: "Rejeté",
      rejection_reason: reason,
    }, `❌ Demande de sample rejetée — Raison: ${reason}`);
    setRejectModal(null);
  };

  const pendingSamples = samples.filter(s => s.status === "En attente d'approbation");
  const inProgressSamples = samples.filter(s => ["Approuvé", "En préparation", "Envoyé"].includes(s.status));
  const deliveredSamples = samples.filter(s => ["Livré", "Follow-up requis"].includes(s.status));
  const completedSamples = samples.filter(s => s.status === "Follow-up complété")
    .sort((a, b) => new Date(b.follow_up_completed_at || b.updated_at || b.created_at).getTime() - new Date(a.follow_up_completed_at || a.updated_at || a.created_at).getTime());

  const now = new Date();
  const thisMonth = now.getMonth();
  const approvedThisMonth = samples.filter(s => s.approved_at && new Date(s.approved_at).getMonth() === thisMonth).length;
  const awaitingFollowUp = samples.filter(s => s.status === "Follow-up requis").length;
  const costThisMonth = samples
    .filter(s => new Date(s.created_at).getMonth() === thisMonth)
    .reduce((sum, s) => sum + (s.estimated_cost || 0), 0);
  const closedAfterSample = samples.filter(s => s.status === "Follow-up complété").length;
  const conversionRate = samples.length > 0 ? Math.round((closedAfterSample / samples.length) * 100) : 0;

  const historyFiltered = samples.filter(s => {
    if (filterAgent && !s.agent_name.toLowerCase().includes(filterAgent.toLowerCase())) return false;
    if (filterStatus && s.status !== filterStatus) return false;
    if (search && !s.lead_company_name.toLowerCase().includes(search.toLowerCase()) && !s.agent_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const tabs = [
    { key: "pending", label: "À traiter", count: pendingSamples.length, pulse: pendingSamples.length > 0 },
    { key: "inprogress", label: "En cours", count: inProgressSamples.length },
    { key: "delivered", label: "Livrés / Suivi", count: deliveredSamples.length },
    { key: "completed", label: "Complétés", count: completedSamples.length },
    { key: "history", label: "Historique" },
    { key: "analytics", label: "Analytics" },
  ] as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg, overflow: "hidden" }}>
      <div style={{ background: T.bgCard, borderBottom: `1px solid ${T.border}`, padding: "18px 24px 0", flexShrink: 0 }}>
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>📦</span> Samples Management
          </h1>
          <p style={{ fontSize: 13, color: T.textLight, margin: 0 }}>
            {samples.length} demande{samples.length !== 1 ? "s" : ""} au total
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 16 }}>
          {[
            { label: "En attente", value: pendingSamples.length, color: T.gold, pulse: pendingSamples.length > 0 },
            { label: "Approuvés ce mois", value: approvedThisMonth, color: T.green },
            { label: "En cours", value: inProgressSamples.length, color: "#0891b2" },
            { label: "Suivi requis", value: awaitingFollowUp, color: T.red, pulse: awaitingFollowUp > 0 },
            { label: "Coût ce mois", value: fmt(costThisMonth), color: T.main },
            { label: "Taux conversion", value: `${conversionRate}%`, color: T.green },
          ].map((kpi, i) => (
            <div key={i} style={{
              background: T.bg, borderRadius: 10, padding: "12px 14px",
              border: kpi.pulse ? `2px solid ${kpi.color}` : `1px solid ${T.border}`,
              position: "relative",
            }}>
              {kpi.pulse && <span style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: kpi.color, animation: "pulse 1.5s infinite" }} />}
              <div style={{ fontSize: 10, fontWeight: 600, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{kpi.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 0, borderTop: `1px solid ${T.border}` }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "12px 18px", border: "none", background: "none", cursor: "pointer",
                fontSize: 13, fontWeight: tab === t.key ? 700 : 400,
                color: tab === t.key ? T.main : T.textMid,
                borderBottom: tab === t.key ? `2px solid ${T.main}` : "2px solid transparent",
                fontFamily: "inherit", transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {t.label}
              {"count" in t && t.count !== undefined && t.count > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "1px 6px",
                  background: t.pulse ? T.red : T.main, color: "#fff",
                  animation: t.pulse ? "pulse 1.5s infinite" : "none",
                }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: T.textLight }}>Chargement...</div>
        ) : (
          <>
            {tab === "pending" && (
              <AdminSampleTable
                samples={pendingSamples.sort((a, b) => {
                  if (a.priority === "Urgente" && b.priority !== "Urgente") return -1;
                  if (b.priority === "Urgente" && a.priority !== "Urgente") return 1;
                  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                })}
                mode="pending"
                onApprove={setApproveModal}
                onShip={setShipModal}
                onDeliver={setDeliverModal}
                onReject={setRejectModal}
                onViewDetail={setDetailModal}
                onSetInPrep={handleSetInPrep}
              />
            )}
            {tab === "inprogress" && (
              <AdminSampleTable
                samples={inProgressSamples}
                mode="inprogress"
                onApprove={setApproveModal}
                onShip={setShipModal}
                onDeliver={setDeliverModal}
                onReject={setRejectModal}
                onViewDetail={setDetailModal}
                onSetInPrep={handleSetInPrep}
              />
            )}
            {tab === "delivered" && (
              <AdminSampleTable
                samples={deliveredSamples.sort((a, b) => {
                  const aExpired = a.timer_expires_at && new Date(a.timer_expires_at) < now;
                  const bExpired = b.timer_expires_at && new Date(b.timer_expires_at) < now;
                  if (aExpired && !bExpired) return -1;
                  if (bExpired && !aExpired) return 1;
                  return 0;
                })}
                mode="delivered"
                onApprove={setApproveModal}
                onShip={setShipModal}
                onDeliver={setDeliverModal}
                onReject={setRejectModal}
                onViewDetail={setDetailModal}
                onSetInPrep={handleSetInPrep}
              />
            )}
            {tab === "completed" && (
              <CompletedTab samples={completedSamples} onViewDetail={setDetailModal} />
            )}
            {tab === "history" && (
              <div>
                <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher lead ou agent..."
                    style={{ ...inpStyle, width: 240 }}
                  />
                  <input
                    value={filterAgent}
                    onChange={e => setFilterAgent(e.target.value)}
                    placeholder="Filtrer par agent..."
                    style={{ ...inpStyle, width: 200 }}
                  />
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as SampleStatus | "")} style={{ ...selStyle, width: 200 }}>
                    <option value="">Tous les statuts</option>
                    {(["En attente d'approbation", "Approuvé", "En préparation", "Envoyé", "Livré", "Follow-up requis", "Follow-up complété", "Rejeté"] as SampleStatus[]).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <AdminSampleTable
                  samples={historyFiltered}
                  mode="history"
                  onApprove={setApproveModal}
                  onShip={setShipModal}
                  onDeliver={setDeliverModal}
                  onReject={setRejectModal}
                  onViewDetail={setDetailModal}
                  onSetInPrep={handleSetInPrep}
                />
              </div>
            )}
            {tab === "analytics" && <AnalyticsTab samples={samples} />}
          </>
        )}
      </div>

      {approveModal && (
        <ApproveModal
          sample={approveModal}
          onClose={() => setApproveModal(null)}
          onConfirm={handleApprove}
        />
      )}
      {shipModal && (
        <ShipModal
          sample={shipModal}
          onClose={() => setShipModal(null)}
          onConfirm={handleShip}
        />
      )}
      {deliverModal && (
        <ConfirmModal
          title="Marquer comme livré"
          message={`Confirmer la livraison du sample pour ${deliverModal.lead_company_name || "ce lead"} ? Le timer 72h de follow-up démarrera immédiatement.`}
          confirmLabel="Confirmer la livraison"
          confirmColor={T.green}
          onClose={() => setDeliverModal(null)}
          onConfirm={() => handleDeliver(deliverModal)}
        />
      )}
      {rejectModal && (
        <RejectModal
          sample={rejectModal}
          onClose={() => setRejectModal(null)}
          onConfirm={handleReject}
        />
      )}
      {detailModal && (
        <SampleDetailModal sample={detailModal} onClose={() => setDetailModal(null)} />
      )}
      {sampleEmailModal && (
        <SendEmailModal
          isOpen={true}
          onClose={() => setSampleEmailModal(null)}
          smtpConfigKey="samples"
          to=""
          subject={sampleEmailModal.subject}
          htmlBody={sampleEmailModal.html}
          textBody={sampleEmailModal.text}
          templateKey="sample_notification"
          referenceType="sample_request"
        />
      )}
    </div>
  );
}

type AdminTableMode = "pending" | "inprogress" | "delivered" | "history";

function CompletedTab({ samples, onViewDetail }: { samples: SampleRequest[]; onViewDetail: (s: SampleRequest) => void }) {
  const [searchCompleted, setSearchCompleted] = React.useState("");
  const [filterResultCompleted, setFilterResultCompleted] = React.useState<"" | "Positif" | "Neutre" | "Négatif">("");

  const positif = samples.filter(s => s.follow_up_result === "Positif").length;
  const neutre = samples.filter(s => s.follow_up_result === "Neutre").length;
  const negatif = samples.filter(s => s.follow_up_result === "Négatif").length;

  const filtered = samples.filter(s => {
    if (filterResultCompleted && s.follow_up_result !== filterResultCompleted) return false;
    if (searchCompleted) {
      const q = searchCompleted.toLowerCase();
      if (!s.lead_company_name?.toLowerCase().includes(q) && !s.agent_name?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Positif", count: positif, color: "#15803d", bg: "#dcfce7", icon: "✅" },
          { label: "Neutre", count: neutre, color: "#92400e", bg: "#fff7ed", icon: "➖" },
          { label: "Négatif", count: negatif, color: "#991b1b", bg: "#fef2f2", icon: "❌" },
        ].map(kpi => (
          <button
            key={kpi.label}
            onClick={() => setFilterResultCompleted(prev => prev === kpi.label as any ? "" : kpi.label as any)}
            style={{
              background: filterResultCompleted === kpi.label ? kpi.bg : "#fff",
              borderRadius: 10, padding: "14px 16px", cursor: "pointer",
              border: `${filterResultCompleted === kpi.label ? 2 : 1}px solid ${filterResultCompleted === kpi.label ? kpi.color : T.border}`,
              textAlign: "left", fontFamily: "inherit",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
              {kpi.icon} {kpi.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color }}>{kpi.count}</div>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          value={searchCompleted}
          onChange={e => setSearchCompleted(e.target.value)}
          placeholder="Rechercher lead ou agent..."
          style={{ ...inpStyle, width: 240 }}
        />
        <select
          value={filterResultCompleted}
          onChange={e => setFilterResultCompleted(e.target.value as any)}
          style={{ ...selStyle, width: 180 }}
        >
          <option value="">Tous les résultats</option>
          <option value="Positif">✅ Positif</option>
          <option value="Neutre">➖ Neutre</option>
          <option value="Négatif">❌ Négatif</option>
        </select>
        {(searchCompleted || filterResultCompleted) && (
          <button
            onClick={() => { setSearchCompleted(""); setFilterResultCompleted(""); }}
            style={{ padding: "0 14px", height: 38, borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, cursor: "pointer", fontSize: 12, color: T.textMid, fontFamily: "inherit" }}
          >
            Réinitialiser
          </button>
        )}
      </div>
      {filtered.length === 0 ? (
        <div style={{ background: T.bgCard, borderRadius: 12, padding: 40, border: `1px solid ${T.border}`, textAlign: "center", color: T.textLight, fontSize: 13 }}>
          Aucun follow-up complété dans cette catégorie.
        </div>
      ) : (
        <div style={{ background: T.bgCard, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: T.bg, borderBottom: `2px solid ${T.border}` }}>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 700, color: T.textLight }}>#</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 700, color: T.textLight }}>Demande</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 700, color: T.textLight }}>Lead / Cie</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 700, color: T.textLight }}>Agent</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 700, color: T.textLight }}>Produits</th>
                  <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: T.textLight }}>FU complété le</th>
                  <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: T.textLight }}>Résultat</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 700, color: T.textLight }}>Notes / Prochaine étape</th>
                  <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: T.textLight }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const prodNames = s.items?.map(it => it.product_name).join(", ") || "—";
                  const result = s.follow_up_result;
                  const resultColor = result === "Positif" ? "#15803d" : result === "Neutre" ? "#92400e" : result === "Négatif" ? "#991b1b" : T.textLight;
                  const resultBg = result === "Positif" ? "#dcfce7" : result === "Neutre" ? "#fff7ed" : result === "Négatif" ? "#fef2f2" : T.bg;
                  const resultIcon = result === "Positif" ? "✅" : result === "Neutre" ? "➖" : result === "Négatif" ? "❌" : "—";
                  const noteText = s.follow_up_next_step || s.follow_up_reason || s.follow_up_notes || "—";
                  return (
                    <tr key={s.id} style={{ borderTop: `1px solid ${T.border}` }}>
                      <td style={{ padding: "11px 14px", color: T.textLight, fontWeight: 600, fontSize: 11 }}>#{i + 1}</td>
                      <td style={{ padding: "11px 14px", color: T.textMid, fontSize: 11, whiteSpace: "nowrap" }}>{fmtDate(s.created_at)}</td>
                      <td style={{ padding: "11px 14px", color: T.text, fontWeight: 600, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.lead_company_name || `Lead #${s.lead_id.slice(0, 8)}`}
                      </td>
                      <td style={{ padding: "11px 14px", color: T.textMid, whiteSpace: "nowrap" }}>{s.agent_name}</td>
                      <td style={{ padding: "11px 14px", color: T.text, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prodNames}</td>
                      <td style={{ padding: "11px 14px", textAlign: "center", color: T.textMid, fontSize: 11, whiteSpace: "nowrap" }}>
                        {fmtDate(s.follow_up_completed_at)}
                      </td>
                      <td style={{ padding: "11px 14px", textAlign: "center" }}>
                        {result ? (
                          <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "3px 8px", background: resultBg, color: resultColor, whiteSpace: "nowrap" }}>
                            {resultIcon} {result}
                          </span>
                        ) : <span style={{ color: T.textLight }}>—</span>}
                      </td>
                      <td style={{ padding: "11px 14px", color: T.textMid, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11 }}>
                        {noteText}
                      </td>
                      <td style={{ padding: "11px 14px", textAlign: "center" }}>
                        <ActionBtn label="Voir" color={T.main} outline onClick={() => onViewDetail(s)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminSampleTable({ samples, mode, onApprove, onShip, onDeliver, onReject, onViewDetail, onSetInPrep }: {
  samples: SampleRequest[];
  mode: AdminTableMode;
  onApprove: (s: SampleRequest) => void;
  onShip: (s: SampleRequest) => void;
  onDeliver: (s: SampleRequest) => void;
  onReject: (s: SampleRequest) => void;
  onViewDetail: (s: SampleRequest) => void;
  onSetInPrep: (s: SampleRequest) => void;
}) {
  if (samples.length === 0) {
    return (
      <div style={{ background: T.bgCard, borderRadius: 12, padding: 40, border: `1px solid ${T.border}`, textAlign: "center", color: T.textLight, fontSize: 13 }}>
        Aucun sample dans cette catégorie.
      </div>
    );
  }

  return (
    <div style={{ background: T.bgCard, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: T.bg, borderBottom: `2px solid ${T.border}` }}>
              <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 700, color: T.textLight }}>#</th>
              <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 700, color: T.textLight }}>Date</th>
              <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 700, color: T.textLight }}>Lead</th>
              <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 700, color: T.textLight }}>Agent</th>
              <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 700, color: T.textLight }}>Produits</th>
              <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: T.textLight }}>Priorité</th>
              <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: T.textLight }}>Statut</th>
              {(mode === "inprogress" || mode === "history") && (
                <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: T.textLight }}>ETA</th>
              )}
              {mode === "history" && (
                <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: T.textLight }}>Résultat FU</th>
              )}
              {(mode === "delivered") && (
                <>
                  <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: T.textLight }}>Livré le</th>
                  <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: T.textLight }}>Timer 72h</th>
                </>
              )}
              <th style={{ textAlign: "center", padding: "10px 14px", fontWeight: 700, color: T.textLight }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {samples.map((sample, i) => (
              <AdminSampleRow
                key={sample.id}
                sample={sample}
                index={i + 1}
                mode={mode}
                onApprove={() => onApprove(sample)}
                onShip={() => onShip(sample)}
                onDeliver={() => onDeliver(sample)}
                onReject={() => onReject(sample)}
                onViewDetail={() => onViewDetail(sample)}
                onSetInPrep={() => onSetInPrep(sample)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminSampleRow({ sample, index, mode, onApprove, onShip, onDeliver, onReject, onViewDetail, onSetInPrep }: {
  sample: SampleRequest;
  index: number;
  mode: AdminTableMode;
  onApprove: () => void;
  onShip: () => void;
  onDeliver: () => void;
  onReject: () => void;
  onViewDetail: () => void;
  onSetInPrep: () => void;
}) {
  const showTimer = sample.status === "Livré" || sample.status === "Follow-up requis";
  const { text: timerText, urgency } = useCountdown(showTimer ? sample.timer_expires_at : undefined);
  const timerColor = urgency === "expired" || urgency === "critical" ? T.red : urgency === "warn" ? T.orange : T.green;

  const isUrgent = sample.priority === "Urgente";
  const waitingDays = daysSince(sample.created_at);
  const isOldPending = sample.status === "En attente d'approbation" && waitingDays >= 2;

  const prodNames = sample.items?.map(i => i.product_name).join(", ") || "—";

  const priorityColors: Record<string, string> = {
    "Urgente": T.red, "Normale": T.orange, "Basse": T.green,
  };

  const now = new Date();
  const isEtaLate = sample.eta_delivery && new Date(`${sample.eta_delivery}T00:00`) < now && sample.status === "Envoyé";

  return (
    <tr style={{
      borderTop: `1px solid ${T.border}`,
      background: isUrgent ? "rgba(239,68,68,0.04)" : undefined,
    }}>
      <td style={{ padding: "11px 14px", color: T.textLight, fontWeight: 600, fontSize: 11 }}>#{index}</td>
      <td style={{ padding: "11px 14px", color: T.textMid, fontSize: 11, whiteSpace: "nowrap" }}>
        {fmtDate(sample.created_at)}
        {isOldPending && (
          <div style={{ fontSize: 10, color: T.orange, fontWeight: 700, marginTop: 2 }}>
            En attente depuis {waitingDays}j
          </div>
        )}
      </td>
      <td style={{ padding: "11px 14px", color: T.text, fontWeight: 600, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {sample.lead_company_name || `Lead #${sample.lead_id.slice(0, 8)}`}
      </td>
      <td style={{ padding: "11px 14px", color: T.textMid, whiteSpace: "nowrap" }}>
        {sample.agent_name}
      </td>
      <td style={{ padding: "11px 14px", color: T.text, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {prodNames}
      </td>
      <td style={{ padding: "11px 14px", textAlign: "center" }}>
        <span style={{
          fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "3px 8px",
          background: `${priorityColors[sample.priority]}18`,
          color: priorityColors[sample.priority],
          border: isUrgent ? `1.5px solid ${T.red}` : undefined,
          animation: isUrgent ? "pulse 1.5s infinite" : "none",
        }}>
          {sample.priority}
        </span>
      </td>
      <td style={{ padding: "11px 14px", textAlign: "center" }}>
        <StatusBadge status={sample.status} />
        {sample.tracking_number && <div style={{ fontSize: 10, color: T.blue, marginTop: 2 }}>{TRUCK_ICON}{sample.tracking_number}</div>}
      </td>
      {(mode === "inprogress" || mode === "history") && (
        <td style={{ padding: "11px 14px", textAlign: "center", fontSize: 12 }}>
          {sample.eta_delivery ? (
            <span style={{ color: isEtaLate ? T.red : T.text, fontWeight: isEtaLate ? 700 : 400 }}>
              {isEtaLate ? `En retard` : fmtShort(sample.eta_delivery)}
            </span>
          ) : "—"}
        </td>
      )}
      {mode === "delivered" && (
        <>
          <td style={{ padding: "11px 14px", textAlign: "center", color: T.textMid, fontSize: 11 }}>
            {fmtDate(sample.delivered_at)}
          </td>
          <td style={{ padding: "11px 14px", textAlign: "center" }}>
            {timerText ? (
              <span style={{ fontSize: 11, fontWeight: 700, color: timerColor, animation: urgency === "expired" || urgency === "critical" ? "pulse 1s infinite" : "none" }}>
                {urgency === "expired" ? "EXPIRÉ" : timerText}
              </span>
            ) : "—"}
          </td>
        </>
      )}
      {mode === "history" && (
        <td style={{ padding: "11px 14px", textAlign: "center" }}>
          {sample.follow_up_result ? (
            <div>
              <span style={{
                fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "3px 8px",
                background: sample.follow_up_result === "Positif" ? "#dcfce7" : sample.follow_up_result === "Neutre" ? "#fff7ed" : "#fef2f2",
                color: sample.follow_up_result === "Positif" ? "#15803d" : sample.follow_up_result === "Neutre" ? "#92400e" : "#991b1b",
              }}>
                {sample.follow_up_result === "Positif" ? "✅" : sample.follow_up_result === "Neutre" ? "➖" : "❌"} {sample.follow_up_result}
              </span>
              {(sample.follow_up_next_step || sample.follow_up_reason) && (
                <div style={{ fontSize: 9, color: T.textLight, marginTop: 3, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {sample.follow_up_next_step || sample.follow_up_reason}
                </div>
              )}
            </div>
          ) : "—"}
        </td>
      )}
      <td style={{ padding: "11px 14px" }}>
        <div style={{ display: "flex", gap: 5, justifyContent: "center", flexWrap: "wrap" }}>
          <ActionBtn label="Voir" color={T.main} outline onClick={onViewDetail} />
          {sample.status === "En attente d'approbation" && (
            <>
              <ActionBtn label="Approuver" color={T.green} onClick={onApprove} />
              <ActionBtn label="Rejeter" color={T.red} onClick={onReject} />
            </>
          )}
          {sample.status === "Approuvé" && (
            <>
              <ActionBtn label="En préparation" color="#0891b2" onClick={onSetInPrep} />
              <ActionBtn label="Expédier" color={T.main} onClick={onShip} />
            </>
          )}
          {sample.status === "En préparation" && (
            <ActionBtn label="Expédier" color={T.main} onClick={onShip} />
          )}
          {sample.status === "Envoyé" && (
            <ActionBtn label="Livré" color={T.green} onClick={onDeliver} />
          )}
        </div>
      </td>
    </tr>
  );
}

function ActionBtn({ label, color, outline, onClick }: { label: string; color: string; outline?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 10px", borderRadius: 6,
        border: outline ? `1px solid ${color}` : "none",
        background: outline ? "none" : color,
        color: outline ? color : "#fff",
        cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function ApproveModal({ sample, onClose, onConfirm }: {
  sample: SampleRequest;
  onClose: () => void;
  onConfirm: (s: SampleRequest, eta: string, notes: string, cost: number) => void;
}) {
  const [eta, setEta] = useState(sample.eta_delivery || "");
  const [notes, setNotes] = useState("");
  const [cost, setCost] = useState("0");
  return (
    <Modal title="✅ Approuver le sample" onClose={onClose}>
      <SampleSummary sample={sample} />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>ETA de livraison *</label>
          <input type="date" value={eta} onChange={e => setEta(e.target.value)} style={inpStyle} />
        </div>
        <div>
          <label style={labelStyle}>Coût estimé du sample (CAD)</label>
          <input type="number" min={0} value={cost} onChange={e => setCost(e.target.value)} style={inpStyle} />
        </div>
        <div>
          <label style={labelStyle}>Notes pour l'agent (optionnel)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ ...inpStyle, height: 80, paddingTop: 10, resize: "vertical" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Annuler</button>
        <button
          onClick={() => eta && onConfirm(sample, eta, notes, parseFloat(cost) || 0)}
          disabled={!eta}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: eta ? T.green : "#ccc", color: eta ? "#fff" : "#999", cursor: eta ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}
        >
          Confirmer l'approbation
        </button>
      </div>
    </Modal>
  );
}

function ShipModal({ sample, onClose, onConfirm }: {
  sample: SampleRequest;
  onClose: () => void;
  onConfirm: (s: SampleRequest, transporteur: string, tracking: string, eta: string, notes: string) => void;
}) {
  const [transporteur, setTransporteur] = useState(TRANSPORTEURS[0]);
  const [tracking, setTracking] = useState("");
  const [eta, setEta] = useState(sample.eta_delivery || "");
  const [notes, setNotes] = useState("");
  return (
    <Modal title="🚚 Expédier le sample" onClose={onClose}>
      <SampleSummary sample={sample} />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>Transporteur *</label>
          <select value={transporteur} onChange={e => setTransporteur(e.target.value)} style={selStyle}>
            {TRANSPORTEURS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Numéro de tracking</label>
          <input value={tracking} onChange={e => setTracking(e.target.value)} placeholder="1Z999AA10123456784" style={inpStyle} />
        </div>
        <div>
          <label style={labelStyle}>ETA mise à jour</label>
          <input type="date" value={eta} onChange={e => setEta(e.target.value)} style={inpStyle} />
        </div>
        <div>
          <label style={labelStyle}>Notes (optionnel)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ ...inpStyle, height: 70, paddingTop: 10, resize: "vertical" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Annuler</button>
        <button
          onClick={() => onConfirm(sample, transporteur, tracking, eta, notes)}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: T.main, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}
        >
          Confirmer l'expédition
        </button>
      </div>
    </Modal>
  );
}

function RejectModal({ sample, onClose, onConfirm }: {
  sample: SampleRequest;
  onClose: () => void;
  onConfirm: (s: SampleRequest, reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Modal title="❌ Rejeter la demande" onClose={onClose}>
      <SampleSummary sample={sample} />
      <div>
        <label style={labelStyle}>Raison du rejet *</label>
        <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Expliquez pourquoi la demande est rejetée..." style={{ ...inpStyle, height: 100, paddingTop: 10, resize: "vertical" }} />
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Annuler</button>
        <button
          onClick={() => reason.trim() && onConfirm(sample, reason)}
          disabled={!reason.trim()}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: reason.trim() ? T.red : "#ccc", color: reason.trim() ? "#fff" : "#999", cursor: reason.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}
        >
          Confirmer le rejet
        </button>
      </div>
    </Modal>
  );
}

function ConfirmModal({ title, message, confirmLabel, confirmColor, onClose, onConfirm }: {
  title: string; message: string; confirmLabel: string; confirmColor: string;
  onClose: () => void; onConfirm: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p style={{ fontSize: 14, color: T.text, margin: "0 0 20px", lineHeight: 1.6 }}>{message}</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Annuler</button>
        <button onClick={onConfirm} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: confirmColor, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto", padding: "16px" }}>
      <div style={{ background: T.bgCard, borderRadius: 16, width: "100%", maxWidth: 560, boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#8e8e93" }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function SampleSummary({ sample }: { sample: SampleRequest }) {
  return (
    <div style={{ padding: "10px 14px", background: "rgba(212,160,23,0.08)", borderRadius: 8, border: "1px solid rgba(212,160,23,0.2)", marginBottom: 4 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>
        {sample.lead_company_name || `Lead #${sample.lead_id.slice(0, 8)}`}
      </div>
      <div style={{ fontSize: 12, color: T.textMid }}>
        Agent: {sample.agent_name} · {sample.items?.length || 0} produit{(sample.items?.length || 0) !== 1 ? "s" : ""} · Priorité: {sample.priority}
      </div>
      {sample.items && sample.items.length > 0 && (
        <div style={{ fontSize: 12, color: T.text, marginTop: 4 }}>
          {sample.items.map(i => `${i.product_name} (${i.quantity})`).join(", ")}
        </div>
      )}
    </div>
  );
}

function SampleDetailModal({ sample, onClose }: { sample: SampleRequest; onClose: () => void }) {
  const steps: SampleStatus[] = ["En attente d'approbation", "Approuvé", "En préparation", "Envoyé", "Livré", "Follow-up requis", "Follow-up complété"];
  const currentIdx = steps.indexOf(sample.status);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto", padding: "16px" }}>
      <div style={{ background: T.bgCard, borderRadius: 16, width: "100%", maxWidth: 680, boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(135deg, #fffbea 0%, #fff 100%)", borderRadius: "16px 16px 0 0" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: T.text }}>📦 Détails du sample</h2>
            <div style={{ fontSize: 11, color: T.textLight, marginTop: 2 }}>{sample.lead_company_name || "Lead"} — {fmtDate(sample.created_at)}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#8e8e93" }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20, maxHeight: "calc(90vh - 120px)", overflowY: "auto" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Timeline</div>
            <div style={{ display: "flex", alignItems: "center", overflowX: "auto", paddingBottom: 4 }}>
              {steps.map((step, i) => {
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
                    {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: i < currentIdx ? T.gold : "#e5e7eb", minWidth: 12 }} />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <DField label="Lead" value={sample.lead_company_name} />
            <DField label="Agent" value={sample.agent_name} />
            <DField label="Motif" value={sample.reason} />
            <DField label="Priorité" value={sample.priority} />
            <DField label="Statut" value={<StatusBadge status={sample.status} />} />
            <DField label="Adresse" value={sample.delivery_address} />
            {sample.notes_for_office && <DField label="Notes bureau" value={sample.notes_for_office} col2 />}
            {sample.approval_notes && <DField label="Notes admin" value={sample.approval_notes} col2 />}
            {sample.rejection_reason && <DField label="Raison rejet" value={<span style={{ color: T.red }}>{sample.rejection_reason}</span>} col2 />}
          </div>
          {sample.items && sample.items.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Produits</div>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead><tr style={{ borderBottom: `2px solid ${T.border}` }}>
                  <th style={{ textAlign: "left", padding: "7px 10px", fontWeight: 700, color: T.textLight }}>Produit</th>
                  <th style={{ textAlign: "center", padding: "7px 10px", fontWeight: 700, color: T.textLight }}>Qté</th>
                  <th style={{ textAlign: "left", padding: "7px 10px", fontWeight: 700, color: T.textLight }}>Format</th>
                  <th style={{ textAlign: "left", padding: "7px 10px", fontWeight: 700, color: T.textLight }}>Couleur</th>
                </tr></thead>
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
                {sample.transporteur && <DField label="Transporteur" value={sample.transporteur} />}
                {sample.tracking_number && <DField label="Tracking" value={<span style={{ color: T.blue, fontWeight: 600 }}>{sample.tracking_number}</span>} />}
                {sample.eta_delivery && <DField label="ETA" value={fmtShort(sample.eta_delivery)} />}
              </div>
            </div>
          )}
          {sample.follow_up_result && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Résultat du follow-up</div>
              {(() => {
                const cfgMap: Record<string, { bg: string; border: string; color: string; icon: string }> = {
                  "Positif": { bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d", icon: "✅" },
                  "Neutre": { bg: "#fffbeb", border: "#fde68a", color: "#92400e", icon: "➖" },
                  "Négatif": { bg: "#fef2f2", border: "#fecaca", color: "#991b1b", icon: "❌" },
                };
                const cfg = cfgMap[sample.follow_up_result] || { bg: "#f3f4f6", border: "#e5e7eb", color: T.textMid, icon: "—" };
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
                      <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6, whiteSpace: "pre-line", fontStyle: "italic", borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 8, marginTop: 4 }}>
                        "{sample.follow_up_notes}"
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
          {sample.activities && sample.activities.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Historique admin</div>
              {sample.activities.map((act, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.gold, marginTop: 4, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: T.text }}>{act.description}</div>
                    <div style={{ fontSize: 10, color: T.textLight }}>{fmtDate(act.created_at)} — {act.actor_name}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding: "14px 24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 22px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

function DField({ label, value, col2 }: { label: string; value: React.ReactNode; col2?: boolean }) {
  return (
    <div style={{ gridColumn: col2 ? "1 / -1" : undefined }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: T.text }}>{value || "—"}</div>
    </div>
  );
}

function AnalyticsTab({ samples }: { samples: SampleRequest[] }) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: d.toLocaleDateString("fr-CA", { month: "short" }), month: d.getMonth(), year: d.getFullYear() };
  });

  const byMonth = months.map(m => ({
    ...m,
    count: samples.filter(s => {
      const d = new Date(s.created_at);
      return d.getMonth() === m.month && d.getFullYear() === m.year;
    }).length,
  }));

  const maxCount = Math.max(...byMonth.map(m => m.count), 1);

  const byReason: Record<string, number> = {};
  const byProduct: Record<string, number> = {};
  samples.forEach(s => {
    byReason[s.reason] = (byReason[s.reason] || 0) + 1;
    s.items?.forEach(i => { byProduct[i.product_name] = (byProduct[i.product_name] || 0) + 1; });
  });

  const totalCost = samples.reduce((sum, s) => sum + (s.estimated_cost || 0), 0);
  const completedFollowUps = samples.filter(s => s.status === "Follow-up complété").length;

  const positifs = samples.filter(s => s.follow_up_result === "Positif").length;
  const neutres = samples.filter(s => s.follow_up_result === "Neutre").length;
  const negatifs = samples.filter(s => s.follow_up_result === "Négatif").length;
  const totalFU = positifs + neutres + negatifs;

  const negativeReasonCounts: Record<string, number> = {};
  samples.filter(s => s.follow_up_result === "Négatif" && s.follow_up_reason).forEach(s => {
    const r = s.follow_up_reason!;
    negativeReasonCounts[r] = (negativeReasonCounts[r] || 0) + 1;
  });
  const topNegativeReasons = Object.entries(negativeReasonCounts).sort((a, b) => b[1] - a[1]);
  const convRate = samples.length > 0 ? Math.round((completedFollowUps / samples.length) * 100) : 0;

  const funnelSteps = [
    { label: "Demandé", count: samples.length },
    { label: "Approuvé", count: samples.filter(s => !["En attente d'approbation", "Rejeté"].includes(s.status)).length },
    { label: "Envoyé", count: samples.filter(s => ["Envoyé", "Livré", "Follow-up requis", "Follow-up complété"].includes(s.status)).length },
    { label: "Livré", count: samples.filter(s => ["Livré", "Follow-up requis", "Follow-up complété"].includes(s.status)).length },
    { label: "Follow-up", count: samples.filter(s => ["Follow-up requis", "Follow-up complété"].includes(s.status)).length },
    { label: "Complété", count: completedFollowUps },
  ];

  const topProducts = Object.entries(byProduct).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topReasons = Object.entries(byReason).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1100 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          { label: "Total samples", value: samples.length, color: T.main },
          { label: "Coût total", value: fmt(totalCost), color: T.gold },
          { label: "Taux de conversion", value: `${convRate}%`, color: T.green },
          { label: "Follow-ups complétés", value: completedFollowUps, color: "#0891b2" },
        ].map((kpi, i) => (
          <div key={i} style={{ background: T.bgCard, borderRadius: 12, padding: "16px 20px", border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: T.bgCard, borderRadius: 12, padding: "20px", border: `1px solid ${T.border}` }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: T.text }}>Samples par mois</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 140 }}>
            {byMonth.map((m, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textMid }}>{m.count || ""}</div>
                <div style={{ width: "100%", height: `${(m.count / maxCount) * 100}%`, minHeight: m.count > 0 ? 8 : 2, background: m.count > 0 ? T.gold : "#e5e7eb", borderRadius: 4 }} />
                <div style={{ fontSize: 10, color: T.textLight }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: T.bgCard, borderRadius: 12, padding: "20px", border: `1px solid ${T.border}` }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: T.text }}>Funnel samples</h3>
          {funnelSteps.map((step, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: T.textMid }}>{step.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{step.count}</span>
              </div>
              <div style={{ height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${samples.length > 0 ? (step.count / samples.length) * 100 : 0}%`, background: T.gold, borderRadius: 4, transition: "width 0.5s" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {totalFU > 0 && (
        <div style={{ background: T.bgCard, borderRadius: 12, padding: "20px", border: `1px solid ${T.border}` }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: T.text }}>Résultats des follow-ups</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Positifs", count: positifs, color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", icon: "✅" },
              { label: "Neutres", count: neutres, color: "#92400e", bg: "#fffbeb", border: "#fde68a", icon: "➖" },
              { label: "Négatifs", count: negatifs, color: "#991b1b", bg: "#fef2f2", border: "#fecaca", icon: "❌" },
            ].map(({ label, count, color, bg, border, icon }) => (
              <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color }}>{count}</div>
                <div style={{ fontSize: 11, color, fontWeight: 600 }}>{label} — {totalFU > 0 ? Math.round((count / totalFU) * 100) : 0}%</div>
              </div>
            ))}
          </div>
          {topNegativeReasons.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Raisons des refus</div>
              {topNegativeReasons.map(([reason, count], i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: T.text }}>{reason}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#991b1b" }}>{count}</span>
                  </div>
                  <div style={{ height: 5, background: "#f3f4f6", borderRadius: 3 }}>
                    <div style={{ height: "100%", width: `${(count / negatifs) * 100}%`, background: "#ef4444", borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: T.bgCard, borderRadius: 12, padding: "20px", border: `1px solid ${T.border}` }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: T.text }}>Produits les plus demandés</h3>
          {topProducts.length === 0 ? (
            <div style={{ color: T.textLight, fontSize: 13 }}>Aucune donnée</div>
          ) : topProducts.map(([name, count], i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>{name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.main }}>{count}</span>
              </div>
              <div style={{ height: 6, background: "#f3f4f6", borderRadius: 3 }}>
                <div style={{ height: "100%", width: `${(count / (topProducts[0]?.[1] || 1)) * 100}%`, background: T.main, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: T.bgCard, borderRadius: 12, padding: "20px", border: `1px solid ${T.border}` }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: T.text }}>Motifs de demande</h3>
          {topReasons.length === 0 ? (
            <div style={{ color: T.textLight, fontSize: 13 }}>Aucune donnée</div>
          ) : topReasons.map(([reason, count], i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: T.text }}>{reason}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.textMid }}>{count}</span>
              </div>
              <div style={{ height: 6, background: "#f3f4f6", borderRadius: 3 }}>
                <div style={{ height: "100%", width: `${(count / (topReasons[0]?.[1] || 1)) * 100}%`, background: T.gold, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
