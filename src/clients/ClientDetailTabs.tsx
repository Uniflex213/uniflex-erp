import React, { useState } from "react";
import {
  Client, ClientNote, CreditNote, ClientDispute, PickupTicket,
  CREDIT_NOTE_REASONS, DISPUTE_PRIORITIES, DisputePriority,
  DISPUTE_STATUS_COLORS, CREDIT_STATUS_COLORS,
} from "./clientTypes";
import { CRMActivity } from "../sales/crmTypes";
import { SampleRequest } from "../sales/sampleTypes";
import { PickupTicket as RealPickupTicket, STATUS_LABELS as PT_STATUS_LABELS, STATUS_COLORS as PT_STATUS_COLORS, BILLING_LABELS as PT_BILLING_LABELS, BILLING_COLORS as PT_BILLING_COLORS } from "../storeops/storeOpsTypes";
import { supabase } from "../supabaseClient";
import { T } from "../theme";
import { useCurrentAgent } from "../hooks/useCurrentAgent";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("fr-CA", { year: "numeric", month: "short", day: "numeric" });
const fmtDateTime = (iso: string) => new Date(iso).toLocaleDateString("fr-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text,
  fontFamily: "inherit", background: T.bgCard, outline: "none", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5, display: "block",
};

function TabBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px", borderRadius: 8, border: `1.5px solid ${T.main}`,
        background: T.main, color: "#fff", fontSize: 12, fontWeight: 700,
        cursor: "pointer", fontFamily: "inherit",
      }}
    >{children}</button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: T.textLight, fontSize: 14 }}>
      {text}
    </div>
  );
}

interface NotesTabProps {
  clientId: string;
  notes: ClientNote[];
  onAdd: (note: Omit<ClientNote, "id" | "created_at">) => void;
}

export function NotesTab({ clientId, notes, onAdd }: NotesTabProps) {
  const agent = useCurrentAgent();
  const [content, setContent] = useState("");

  const handleAdd = () => {
    if (!content.trim()) return;
    onAdd({ client_id: clientId, content: content.trim(), author_name: agent.name, is_from_crm: false });
    setContent("");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Notes ({notes.length})</h3>
      </div>
      <div style={{ marginBottom: 16 }}>
        <textarea
          style={{ ...inputStyle, minHeight: 80, resize: "vertical", marginBottom: 10 }}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Ajouter une note..."
        />
        <button
          onClick={handleAdd}
          disabled={!content.trim()}
          style={{
            padding: "9px 20px", borderRadius: 8, border: "none", background: content.trim() ? T.main : "#d1d5db",
            color: "#fff", fontSize: 13, fontWeight: 700, cursor: content.trim() ? "pointer" : "not-allowed", fontFamily: "inherit",
          }}
        >
          + Ajouter
        </button>
      </div>
      {notes.length === 0 ? <EmptyState text="Aucune note pour l'instant." /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...notes].sort((a, b) => b.created_at.localeCompare(a.created_at)).map(n => (
            <div key={n.id} style={{
              background: n.is_from_crm ? "rgba(99,102,241,0.04)" : T.bg,
              borderRadius: 10, padding: "12px 14px",
              border: `1px solid ${n.is_from_crm ? "rgba(99,102,241,0.12)" : T.border}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{n.author_name}</span>
                  {n.is_from_crm && (
                    <span style={{ fontSize: 10, fontWeight: 700, background: "rgba(99,102,241,0.12)", color: T.main, padding: "2px 7px", borderRadius: 10 }}>
                      Importé du CRM
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 11, color: T.textLight }}>{fmtDateTime(n.created_at)}</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: T.text, lineHeight: 1.6 }}>{n.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface CreditNotesTabProps {
  clientId: string;
  creditNotes: CreditNote[];
  onAdd: (cn: Omit<CreditNote, "id" | "created_at" | "updated_at">) => void;
  showForm?: boolean;
  onCloseForm?: () => void;
}

export function CreditNotesTab({ clientId, creditNotes, onAdd, showForm: externalShow, onCloseForm }: CreditNotesTabProps) {
  const agent = useCurrentAgent();
  const [showForm, setShowForm] = useState(externalShow || false);
  const [form, setForm] = useState({ order_id: "", reason: "", reason_other: "", amount: "", description: "" });

  React.useEffect(() => { if (externalShow) setShowForm(true); }, [externalShow]);

  const handleSubmit = () => {
    if (!form.reason || !form.amount) return;
    onAdd({
      client_id: clientId, order_id: form.order_id, reason: form.reason,
      reason_other: form.reason_other, amount: parseFloat(form.amount),
      description: form.description, status: "En attente", created_by: agent.name,
    });
    setForm({ order_id: "", reason: "", reason_other: "", amount: "", description: "" });
    setShowForm(false);
    onCloseForm?.();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Notes de crédit ({creditNotes.length})</h3>
        {!showForm && <TabBtn onClick={() => setShowForm(true)}>+ Nouvelle note de crédit</TabBtn>}
      </div>

      {showForm && (
        <div style={{ background: T.bg, borderRadius: 12, padding: 18, marginBottom: 20, border: `1px solid ${T.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: T.text }}>Nouvelle note de crédit</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Commande associée (optionnel)</label>
              <input style={inputStyle} value={form.order_id} onChange={e => setForm(p => ({ ...p, order_id: e.target.value }))} placeholder="ORD-2026-001" />
            </div>
            <div>
              <label style={labelStyle}>Montant ($)</label>
              <input style={inputStyle} type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Raison</label>
              <select style={inputStyle} value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}>
                <option value="">Sélectionner...</option>
                {CREDIT_NOTE_REASONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            {form.reason === "Autre" && (
              <div style={{ gridColumn: "1 / -1" }}>
                <input style={inputStyle} value={form.reason_other} onChange={e => setForm(p => ({ ...p, reason_other: e.target.value }))} placeholder="Précisez la raison..." />
              </div>
            )}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Description détaillée</label>
              <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end" }}>
            <button onClick={() => { setShowForm(false); onCloseForm?.(); }} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, color: T.text, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
            <button onClick={handleSubmit} disabled={!form.reason || !form.amount} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: form.reason && form.amount ? T.orange : "#d1d5db", color: "#fff", fontSize: 13, fontWeight: 700, cursor: form.reason && form.amount ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
              Soumettre pour approbation
            </button>
          </div>
        </div>
      )}

      {creditNotes.length === 0 ? <EmptyState text="Aucune note de crédit." /> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: T.bg }}>
              {["#", "Date", "Raison", "Montant", "Statut", "Commande"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 11, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {creditNotes.map((cn, i) => (
              <tr key={cn.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={{ padding: "11px 12px", color: T.textMid, fontFamily: "monospace", fontSize: 11 }}>NC-{String(i + 1).padStart(3, "0")}</td>
                <td style={{ padding: "11px 12px" }}>{fmtDate(cn.created_at)}</td>
                <td style={{ padding: "11px 12px" }}>{cn.reason}{cn.reason_other ? ` — ${cn.reason_other}` : ""}</td>
                <td style={{ padding: "11px 12px", fontWeight: 700 }}>{cn.amount.toLocaleString("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 })}</td>
                <td style={{ padding: "11px 12px" }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 10,
                    background: `${CREDIT_STATUS_COLORS[cn.status]}22`,
                    color: CREDIT_STATUS_COLORS[cn.status],
                  }}>{cn.status}</span>
                </td>
                <td style={{ padding: "11px 12px", color: T.textMid, fontSize: 12 }}>{cn.order_id || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

interface DisputesTabProps {
  clientId: string;
  disputes: ClientDispute[];
  onAdd: (d: Omit<ClientDispute, "id" | "created_at" | "updated_at" | "dispute_messages">) => void;
  showForm?: boolean;
  onCloseForm?: () => void;
}

function DisputeDetailModal({ dispute, onClose }: { dispute: ClientDispute; onClose: () => void }) {
  const agent = useCurrentAgent();
  const [messages, setMessages] = useState<import("./clientTypes").DisputeMessage[]>(dispute.dispute_messages || []);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

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
      author_name: agent.name,
      content: newMsg.trim(),
      is_admin: false,
      created_at: new Date().toISOString(),
    }).select().maybeSingle();
    if (!error && data) setMessages(prev => [...prev, data]);
    setNewMsg("");
    setSending(false);
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(230,228,224,0.35)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", zIndex: 9999 }} onClick={onClose} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 520, maxHeight: "80vh", background: T.bgCard, borderRadius: 16, display: "flex", flexDirection: "column", zIndex: 10000, boxShadow: "0 24px 80px rgba(0,0,0,0.22)", fontFamily: "'Outfit', sans-serif", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px 14px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: T.text, marginBottom: 4 }}>{dispute.subject}</div>
              <div style={{ fontSize: 12, color: T.textMid }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8, background: `${DISPUTE_STATUS_COLORS[dispute.status]}22`, color: DISPUTE_STATUS_COLORS[dispute.status], marginRight: 8 }}>{dispute.status}</span>
                Priorité : <span style={{ fontWeight: 700, color: dispute.priority === "Haute" ? T.red : dispute.priority === "Moyenne" ? T.orange : T.textMid }}>{dispute.priority}</span>
                {dispute.order_id && <span style={{ marginLeft: 12 }}>Commande : {dispute.order_id}</span>}
              </div>
              {dispute.credit_note_id && (
                <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: T.green, display: "flex", alignItems: "center", gap: 4 }}>
                  Note de crédit associée
                </div>
              )}
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: T.textMid, padding: 4 }}>x</button>
          </div>
          {dispute.description && (
            <p style={{ margin: "10px 0 0", fontSize: 13, color: T.textMid, lineHeight: 1.5 }}>{dispute.description}</p>
          )}
          {dispute.resolution && (
            <div style={{ marginTop: 10, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: T.green }}>
              <strong>Résolution :</strong> {dispute.resolution}
            </div>
          )}
        </div>
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px 24px", minHeight: 180, maxHeight: 320 }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: T.textLight, fontSize: 13 }}>Aucun message. Démarrez la conversation.</div>
          ) : messages.map(m => (
            <div key={m.id} style={{ marginBottom: 12, display: "flex", flexDirection: "column", alignItems: m.is_admin ? "flex-start" : "flex-end" }}>
              <div style={{
                maxWidth: "80%", padding: "10px 14px", borderRadius: 12,
                background: m.is_admin ? T.bg : "rgba(99,102,241,0.08)",
                border: `1px solid ${m.is_admin ? T.border : "rgba(99,102,241,0.15)"}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, gap: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: m.is_admin ? T.red : T.main }}>
                    {m.author_name} {m.is_admin ? "(Admin)" : ""}
                  </span>
                  <span style={{ fontSize: 10, color: T.textLight, whiteSpace: "nowrap" }}>{fmtDateTime(m.created_at)}</span>
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
              placeholder="Écrire un message..."
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            />
            <button
              onClick={handleSend}
              disabled={!newMsg.trim() || sending}
              style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: newMsg.trim() ? T.main : "#d1d5db", color: "#fff", fontSize: 13, fontWeight: 700, cursor: newMsg.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}
            >
              Envoyer
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export function DisputesTab({ clientId, disputes, onAdd, showForm: externalShow, onCloseForm }: DisputesTabProps) {
  const agent = useCurrentAgent();
  const [showForm, setShowForm] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<ClientDispute | null>(null);
  const [form, setForm] = useState({ order_id: "", subject: "", priority: "Moyenne" as DisputePriority, description: "" });

  React.useEffect(() => { if (externalShow) setShowForm(true); }, [externalShow]);

  const handleSubmit = () => {
    if (!form.subject.trim()) return;
    onAdd({
      client_id: clientId, order_id: form.order_id, subject: form.subject,
      priority: form.priority, description: form.description,
      status: "Ouverte", resolution: "", created_by: agent.name,
    });
    setForm({ order_id: "", subject: "", priority: "Moyenne", description: "" });
    setShowForm(false);
    onCloseForm?.();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Disputes ({disputes.length})</h3>
        {!showForm && <TabBtn onClick={() => setShowForm(true)}>+ Ouvrir une dispute</TabBtn>}
      </div>

      {showForm && (
        <div style={{ background: T.bg, borderRadius: 12, padding: 18, marginBottom: 20, border: `1px solid ${T.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: T.text }}>Nouvelle dispute</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Sujet *</label>
              <input style={inputStyle} value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Ex: Produit reçu endommagé" />
            </div>
            <div>
              <label style={labelStyle}>Commande associée (optionnel)</label>
              <input style={inputStyle} value={form.order_id} onChange={e => setForm(p => ({ ...p, order_id: e.target.value }))} placeholder="ORD-2026-001" />
            </div>
            <div>
              <label style={labelStyle}>Priorité</label>
              <div style={{ display: "flex", gap: 8 }}>
                {DISPUTE_PRIORITIES.map(p => (
                  <button key={p} type="button" onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                    style={{
                      flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      background: form.priority === p ? (p === "Haute" ? T.red : p === "Moyenne" ? T.orange : T.textMid) : T.bg,
                      color: form.priority === p ? "#fff" : T.textMid,
                      border: `1px solid ${T.border}`,
                    }}
                  >{p}</button>
                ))}
              </div>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Description</label>
              <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end" }}>
            <button onClick={() => { setShowForm(false); onCloseForm?.(); }} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, color: T.text, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
            <button onClick={handleSubmit} disabled={!form.subject.trim()} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: form.subject.trim() ? T.red : "#d1d5db", color: "#fff", fontSize: 13, fontWeight: 700, cursor: form.subject.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
              Ouvrir la dispute
            </button>
          </div>
        </div>
      )}

      {disputes.length === 0 ? <EmptyState text="Aucune dispute." /> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: T.bg }}>
              {["#", "Date", "Sujet", "Priorité", "Statut", "Note crédit", "Commande"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 11, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {disputes.map((d, i) => (
              <tr key={d.id} style={{ borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}
                onClick={() => setSelectedDispute(d)}
                onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "rgba(99,102,241,0.025)"}
                onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ""}
              >
                <td style={{ padding: "11px 12px", color: T.textMid, fontFamily: "monospace", fontSize: 11 }}>DSP-{String(i + 1).padStart(3, "0")}</td>
                <td style={{ padding: "11px 12px" }}>{fmtDate(d.created_at)}</td>
                <td style={{ padding: "11px 12px", fontWeight: 600 }}>{d.subject}</td>
                <td style={{ padding: "11px 12px" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: d.priority === "Haute" ? T.red : d.priority === "Moyenne" ? T.orange : T.textMid }}>
                    {d.priority}
                  </span>
                </td>
                <td style={{ padding: "11px 12px" }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 10,
                    background: `${DISPUTE_STATUS_COLORS[d.status]}22`,
                    color: DISPUTE_STATUS_COLORS[d.status],
                  }}>{d.status}</span>
                </td>
                <td style={{ padding: "11px 12px" }}>
                  {d.credit_note_id ? (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8, background: "rgba(34,197,94,0.12)", color: T.green }}>NC liée</span>
                  ) : (
                    <span style={{ fontSize: 11, color: T.textLight }}>—</span>
                  )}
                </td>
                <td style={{ padding: "11px 12px", color: T.textMid, fontSize: 12 }}>{d.order_id || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedDispute && (
        <DisputeDetailModal dispute={selectedDispute} onClose={() => setSelectedDispute(null)} />
      )}
    </div>
  );
}

interface PickupTabProps {
  realTickets?: RealPickupTicket[];
}

export function PickupTab({ realTickets = [] }: PickupTabProps) {
  const fmtCAD = (n: number) => n.toLocaleString("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Pickup Tickets ({realTickets.length})</h3>
      </div>
      {realTickets.length === 0 ? <EmptyState text="Aucun pickup ticket." /> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: T.bg }}>
              {["# Ticket", "Date", "Articles", "Total", "Statut", "Facturation", "Notes"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 11, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {realTickets.map(t => {
              const sc = PT_STATUS_COLORS[t.status] || { bg: T.bg, color: T.textMid };
              const bc = PT_BILLING_COLORS[t.billing_status] || { bg: T.bg, color: T.textMid };
              return (
                <tr key={t.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: "11px 12px", fontFamily: "monospace", fontSize: 12, color: T.main, fontWeight: 700 }}>{t.ticket_number}</td>
                  <td style={{ padding: "11px 12px" }}>{fmtDate(t.created_at)}</td>
                  <td style={{ padding: "11px 12px", color: T.textMid, fontSize: 12 }}>{t.total_qty || (t.items?.length || 0)} article{(t.total_qty || t.items?.length || 0) !== 1 ? "s" : ""}</td>
                  <td style={{ padding: "11px 12px", fontWeight: 700 }}>{fmtCAD(t.total_value || 0)}</td>
                  <td style={{ padding: "11px 12px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 10, background: sc.bg, color: sc.color }}>
                      {PT_STATUS_LABELS[t.status] || t.status}
                    </span>
                  </td>
                  <td style={{ padding: "11px 12px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 10, background: bc.bg, color: bc.color }}>
                      {PT_BILLING_LABELS[t.billing_status] || t.billing_status}
                    </span>
                  </td>
                  <td style={{ padding: "11px 12px", color: T.textMid, fontSize: 12, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.notes || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

interface CRMHistoryTabProps {
  activities: CRMActivity[];
  samples: SampleRequest[];
}

const ACTIVITY_ICONS: Record<string, string> = {
  "Appel": "📞", "Email envoyé": "📧", "Email reçu": "📧",
  "Rencontre / Visite": "🤝", "Pricelist envoyée": "📄",
  "Proposition / Soumission": "📋", "Échantillon envoyé": "📦",
  "Note interne": "💬", "Changement d'étape": "🔄",
  "Lead créé": "✨", "Raison de perte": "❌",
};

export function CRMHistoryTab({ activities, samples }: CRMHistoryTabProps) {
  if (activities.length === 0 && samples.length === 0) {
    return <EmptyState text="Aucun historique CRM disponible. Ce client n'a pas été converti depuis un lead, ou l'historique n'a pas été transféré." />;
  }

  return (
    <div>
      <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 10, padding: "10px 14px", marginBottom: 18, fontSize: 12, color: T.main, fontWeight: 600 }}>
        Historique archivé de la phase de prospection CRM — lecture seule
      </div>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 17, top: 0, bottom: 0, width: 2, background: "rgba(0,0,0,0.07)" }} />
        {activities.map(act => (
          <div key={act.id} style={{ display: "flex", gap: 16, marginBottom: 16, position: "relative" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: T.bg, border: `2px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, zIndex: 1 }}>
              {ACTIVITY_ICONS[act.type] || "📝"}
            </div>
            <div style={{ flex: 1, background: T.bg, borderRadius: 10, padding: "10px 14px", border: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{act.title || act.type}</span>
                <span style={{ fontSize: 11, color: T.textLight }}>{fmtDateTime(act.activity_at)}</span>
              </div>
              {act.description && <p style={{ margin: 0, fontSize: 12, color: T.textMid, lineHeight: 1.5 }}>{act.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SamplesTabClientProps {
  samples: SampleRequest[];
}

export function SamplesTabClient({ samples }: SamplesTabClientProps) {
  if (samples.length === 0) return <EmptyState text="Aucun sample pour ce client." />;

  return (
    <div>
      <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>Samples ({samples.length})</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: T.bg }}>
            {["Date", "Produits", "Statut", "Résultat FU", "Notes"].map(h => (
              <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 11, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {samples.map(s => (
            <tr key={s.id} style={{ borderBottom: `1px solid ${T.border}` }}>
              <td style={{ padding: "11px 12px" }}>{fmtDate(s.created_at)}</td>
              <td style={{ padding: "11px 12px", color: T.textMid, fontSize: 12 }}>
                {s.items?.map(i => i.product_name).join(", ") || "—"}
              </td>
              <td style={{ padding: "11px 12px" }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 10, background: "rgba(59,130,246,0.12)", color: T.blue }}>
                  {s.status}
                </span>
              </td>
              <td style={{ padding: "11px 12px" }}>
                {s.follow_up_result ? (
                  <span style={{ fontSize: 11, fontWeight: 700 }}>
                    {s.follow_up_result === "Positif" ? "✅" : s.follow_up_result === "Neutre" ? "➖" : "❌"} {s.follow_up_result}
                  </span>
                ) : "—"}
              </td>
              <td style={{ padding: "11px 12px", color: T.textMid, fontSize: 12, maxWidth: 200 }}>
                {s.follow_up_notes || s.notes_for_office || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
