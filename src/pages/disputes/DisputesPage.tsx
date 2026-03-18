import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { ClientDispute, DisputeStatus, DisputePriority, DISPUTE_STATUS_COLORS, DISPUTE_PRIORITIES } from "../../clients/clientTypes";
import { log } from "../../lib/activityLogger";
import { T } from "../../theme";
import { sendNotification } from "../../lib/notifications";

const PRIORITY_COLORS: Record<DisputePriority, { bg: string; color: string }> = {
  Haute:   { bg: T.redBg,    color: T.red },
  Moyenne: { bg: T.orangeBg, color: T.orange },
  Basse:   { bg: "#f1f5f9",  color: T.textMid },
};

const STATUS_OPTIONS: DisputeStatus[] = ["Ouverte", "En cours", "Résolue", "Fermée"];

interface DisputeRow extends ClientDispute {
  client_name?: string;
  client_id?: string;
  order_ref?: string;
  invoice_ref?: string;
}

interface NewDisputeForm {
  subject: string;
  description: string;
  priority: DisputePriority;
  client_id: string;
  order_ref: string;
  invoice_ref: string;
  amount_disputed: string;
}

export default function DisputesPage() {
  const { profile, can } = useAuth();
  const canViewAll = can("disputes.view_all");
  const canCreate  = can("disputes.create");
  const canManage  = can("disputes.manage");

  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<DisputeStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<DisputePriority | "all">("all");
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<DisputeRow | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [form, setForm] = useState<NewDisputeForm>({
    subject: "", description: "", priority: "Moyenne",
    client_id: "", order_ref: "", invoice_ref: "", amount_disputed: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("clients").select("id, company_name").order("company_name").then(({ data }) => {
      if (data) setClients(data);
    });
  }, []);

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("client_disputes")
      .select(`*, client:clients(id, company_name), dispute_messages:dispute_messages(*)`)
      .order("created_at", { ascending: false });

    if (!canViewAll && profile?.id) {
      query = query.eq("created_by", profile.id);
    }

    const { data } = await query;
    setDisputes((data ?? []).map((d: Record<string, unknown>) => ({
      ...d,
      client_name: (d.client as Record<string, unknown>)?.company_name as string | undefined,
      client_id: (d.client as Record<string, unknown>)?.id as string | undefined,
    })) as DisputeRow[]);
    setLoading(false);
  }, [canViewAll, profile?.id]);

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);

  const filtered = disputes.filter(d => {
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    if (priorityFilter !== "all" && d.priority !== priorityFilter) return false;
    if (search && !d.subject.toLowerCase().includes(search.toLowerCase()) &&
        !d.client_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const kpis = {
    open:     disputes.filter(d => d.status === "Ouverte").length,
    inprog:   disputes.filter(d => d.status === "En cours").length,
    resolved: disputes.filter(d => d.status === "Résolue").length,
    high:     disputes.filter(d => d.priority === "Haute").length,
  };

  const handleCreate = async () => {
    if (!form.subject.trim() || !form.client_id || !profile) return;
    setSaving(true);
    const { data, error } = await supabase.from("client_disputes").insert({
      subject: form.subject,
      description: form.description,
      priority: form.priority,
      status: "Ouverte" as DisputeStatus,
      client_id: form.client_id,
      order_ref: form.order_ref || null,
      invoice_ref: form.invoice_ref || null,
      amount_disputed: form.amount_disputed ? parseFloat(form.amount_disputed) : null,
      created_by: profile.id,
    }).select().single();

    if (!error && data) {
      const clientName = clients.find(c => c.id === form.client_id)?.company_name ?? "";
      await log.disputeOpened(supabase, profile.id, data.id, clientName, form.subject);
      // Notify admins of new dispute
      const { data: admins } = await supabase.from("profiles").select("id").in("role", ["god_admin", "admin"]);
      (admins ?? []).forEach((a: { id: string }) => {
        if (a.id !== profile.id) {
          sendNotification(a.id, "dispute", `Nouvelle dispute : ${form.subject}`, clientName, "dispute", data.id);
        }
      });
      setForm({ subject: "", description: "", priority: "Moyenne", client_id: "", order_ref: "", invoice_ref: "", amount_disputed: "" });
      setShowNew(false);
      fetchDisputes();
    }
    setSaving(false);
  };

  const handleStatusChange = async (dispute: DisputeRow, newStatus: DisputeStatus) => {
    if (!profile) return;
    await supabase.from("client_disputes").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", dispute.id);
    if (newStatus === "Résolue") await log.disputeResolved(supabase, profile.id, dispute.id, dispute.client_name ?? "");
    if (newStatus === "Fermée")  await log.disputeClosed(supabase, profile.id, dispute.id, dispute.client_name ?? "");
    if (newStatus !== "Résolue" && newStatus !== "Fermée") await log.disputeUpdated(supabase, profile.id, dispute.id, dispute.client_name ?? "");
    fetchDisputes();
    if (selected?.id === dispute.id) setSelected({ ...selected, status: newStatus });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selected || !profile) return;
    await supabase.from("dispute_messages").insert({
      dispute_id: selected.id,
      sender_id: profile.id,
      content: newMessage.trim(),
    });
    setNewMessage("");
    fetchDisputes();
  };

  const fmt = (iso: string) => new Date(iso).toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric" });
  const fmtCad = (n?: number) => n != null ? `${n.toLocaleString("fr-CA", { minimumFractionDigits: 2 })} $` : "—";

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* En-tête */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#be185d", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.text }}>Disputes & Litiges</h1>
            <p style={{ margin: 0, fontSize: 13, color: T.textLight }}>Suivi des conflits clients, paiements en litige et résolutions</p>
          </div>
        </div>
        {canCreate && (
          <button onClick={() => setShowNew(true)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 8, background: T.main, color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nouvelle dispute
          </button>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Ouvertes", value: kpis.open, color: T.red, bg: T.redBg },
          { label: "En cours", value: kpis.inprog, color: T.orange, bg: T.orangeBg },
          { label: "Résolues", value: kpis.resolved, color: T.green, bg: T.greenBg },
          { label: "Priorité haute", value: kpis.high, color: "#be185d", bg: "#fce7f3" },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, borderRadius: 10, padding: "14px 20px", flex: "1 1 140px", border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: k.color, textTransform: "uppercase", letterSpacing: 0.5 }}>{k.label}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
          style={{ flex: "1 1 180px", padding: "7px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, outline: "none", fontFamily: "inherit" }}/>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as DisputeStatus | "all")}
          style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
          <option value="all">Tous les statuts</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as DisputePriority | "all")}
          style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
          <option value="all">Toutes priorités</option>
          {DISPUTE_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Liste disputes */}
      <div style={{ display: "flex", gap: 16 }}>
        {/* Colonne liste */}
        <div style={{ flex: selected ? "0 0 380px" : "1", minWidth: 0 }}>
          <div style={{ background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, overflow: "hidden" }}>
            {loading && <div style={{ padding: "32px 16px", textAlign: "center", color: T.textLight, fontSize: 13 }}>Chargement...</div>}
            {!loading && filtered.length === 0 && <div style={{ padding: "32px 16px", textAlign: "center", color: T.textLight, fontSize: 13 }}>Aucune dispute</div>}
            {filtered.map((d, i) => {
              const statusColor = DISPUTE_STATUS_COLORS[d.status] ?? "#8e8e93";
              const priorityStyle = PRIORITY_COLORS[d.priority];
              const isSelected = selected?.id === d.id;
              return (
                <div key={d.id} onClick={() => setSelected(isSelected ? null : d)}
                  style={{ padding: "14px 16px", borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : "none", cursor: "pointer", background: isSelected ? `${T.main}08` : "transparent", borderLeft: isSelected ? `3px solid ${T.main}` : "3px solid transparent", transition: "all 0.15s" }}
                  onMouseOver={e => { if (!isSelected) e.currentTarget.style.background = "#f8f9fc"; }}
                  onMouseOut={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: T.text, flex: 1, paddingRight: 8 }}>{d.subject}</div>
                    <span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 12, background: priorityStyle.bg, color: priorityStyle.color, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{d.priority}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: T.textMid }}>{d.client_name ?? "—"}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {d.amount_disputed != null && <span style={{ fontSize: 11, fontWeight: 700, color: T.red }}>{fmtCad(d.amount_disputed)}</span>}
                      <span style={{ fontSize: 11, color: statusColor, fontWeight: 600 }}>{d.status}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: T.textLight, marginTop: 4 }}>{fmt(d.created_at)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panneau détail */}
        {selected && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, overflow: "hidden" }}>
              {/* Header détail */}
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 4 }}>{selected.subject}</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: T.textMid }}>Client : <strong>{selected.client_name ?? "—"}</strong></span>
                    {selected.order_ref && <span style={{ fontSize: 12, color: T.textMid }}>Commande : <strong style={{ color: T.main }}>{selected.order_ref}</strong></span>}
                    {selected.invoice_ref && <span style={{ fontSize: 12, color: T.textMid }}>Facture : <strong style={{ color: T.red }}>{selected.invoice_ref}</strong></span>}
                    {selected.amount_disputed != null && <span style={{ fontSize: 12, color: T.red, fontWeight: 700 }}>{fmtCad(selected.amount_disputed)}</span>}
                  </div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textLight, padding: 4 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Statut + actions */}
              {(canManage || can("disputes.resolve")) && (
                <div style={{ padding: "12px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, color: T.textMid, alignSelf: "center" }}>Statut :</span>
                  {STATUS_OPTIONS.map(s => (
                    <button key={s} onClick={() => handleStatusChange(selected, s)}
                      style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${selected.status === s ? DISPUTE_STATUS_COLORS[s] : T.border}`, background: selected.status === s ? `${DISPUTE_STATUS_COLORS[s]}18` : "transparent", color: selected.status === s ? DISPUTE_STATUS_COLORS[s] : T.textMid, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Description */}
              {selected.description && (
                <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, fontSize: 13, color: T.text, lineHeight: 1.6 }}>
                  {selected.description}
                </div>
              )}

              {/* Messages */}
              <div style={{ padding: "14px 20px", maxHeight: 260, overflowY: "auto" }}>
                {(!selected.dispute_messages || selected.dispute_messages.length === 0) && (
                  <div style={{ textAlign: "center", color: T.textLight, fontSize: 13, padding: "16px 0" }}>Aucun message</div>
                )}
                {(selected.dispute_messages ?? []).map(m => (
                  <div key={m.id} style={{ marginBottom: 12, padding: "10px 14px", background: m.sender_id === profile?.id ? `${T.main}10` : "#f8f9fc", borderRadius: 8, borderLeft: `3px solid ${m.sender_id === profile?.id ? T.main : T.border}` }}>
                    <div style={{ fontSize: 12, color: T.textLight, marginBottom: 4 }}>{fmt(m.created_at)}</div>
                    <div style={{ fontSize: 13, color: T.text }}>{m.content}</div>
                  </div>
                ))}
              </div>

              {/* Champ message */}
              {can("disputes.edit") && (
                <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 10 }}>
                  <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                    placeholder="Ajouter une note ou message..."
                    style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, outline: "none", fontFamily: "inherit" }}/>
                  <button onClick={handleSendMessage} style={{ padding: "8px 16px", borderRadius: 8, background: T.main, color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    Envoyer
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal nouvelle dispute */}
      {showNew && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ background: T.card, borderRadius: 12, padding: 28, width: 520, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Nouvelle dispute</h3>
              <button onClick={() => setShowNew(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textLight }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            {[
              { label: "Sujet *", field: "subject", type: "text", placeholder: "Ex: Facture non payée - Commande #123" },
              { label: "Référence commande", field: "order_ref", type: "text", placeholder: "ORD-2026-001" },
              { label: "Référence facture", field: "invoice_ref", type: "text", placeholder: "INV-2026-001" },
              { label: "Montant en litige ($)", field: "amount_disputed", type: "number", placeholder: "0.00" },
            ].map(({ label, field, type, placeholder }) => (
              <div key={field} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 4 }}>{label}</label>
                <input type={type} value={(form as Record<string, string>)[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} placeholder={placeholder}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}/>
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 4 }}>Client *</label>
              <select value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: "inherit", cursor: "pointer", boxSizing: "border-box" }}>
                <option value="">Sélectionner un client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 4 }}>Priorité</label>
              <div style={{ display: "flex", gap: 8 }}>
                {DISPUTE_PRIORITIES.map(p => (
                  <button key={p} onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                    style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1.5px solid ${form.priority === p ? PRIORITY_COLORS[p].color : T.border}`, background: form.priority === p ? PRIORITY_COLORS[p].bg : "transparent", color: form.priority === p ? PRIORITY_COLORS[p].color : T.textMid, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 4 }}>Description</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Décrivez le problème..."
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }}/>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowNew(false)} style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
              <button onClick={handleCreate} disabled={saving || !form.subject.trim() || !form.client_id}
                style={{ padding: "10px 20px", borderRadius: 8, background: T.main, color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: saving ? "wait" : "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Création..." : "Créer la dispute"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
