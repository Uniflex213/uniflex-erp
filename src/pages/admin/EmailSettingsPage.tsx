import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { Eye, EyeOff, Send, CheckCircle, AlertCircle } from "lucide-react";
import { T } from "../../theme";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const CONFIG_LABELS: Record<string, string> = {
  creation_utilisateur: "Création d'utilisateur",
  commandes: "Confirmations de commandes",
  factures: "Facturation SCI",
  samples: "Échantillons",
  pickups: "Pickup Tickets",
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("fr-CA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

interface SmtpConfig {
  id: string;
  config_key: string;
  from_email: string;
  from_name: string;
  is_active: boolean;
}

interface EmailLog {
  id: string;
  created_at: string;
  smtp_config_key: string;
  template_key: string;
  to_addresses: string[];
  reference_type: string;
  success: boolean;
}

interface EditForm {
  config_key: string;
  from_email: string;
  from_name: string;
  smtp_password: string;
  is_active: boolean;
}

export default function EmailSettingsPage() {
  const { session } = useAuth();
  const [configs, setConfigs] = useState<SmtpConfig[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(0);
  const [filterKey, setFilterKey] = useState("");
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [editModal, setEditModal] = useState<SmtpConfig | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ config_key: "", from_email: "", from_name: "", smtp_password: "", is_active: true });
  const [showPw, setShowPw] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMsg, setConfigMsg] = useState("");
  const [configError, setConfigError] = useState("");
  const [testStates, setTestStates] = useState<Record<string, { email: string; sending: boolean; result: { ok: boolean; msg: string } | null }>>({});
  const PER_PAGE = 20;

  useEffect(() => {
    supabase.from("email_smtp_configs").select("id, config_key, from_email, from_name, is_active").order("config_key").then(({ data }) => {
      setConfigs((data ?? []) as SmtpConfig[]);
      setLoadingConfigs(false);
    });
  }, []);

  useEffect(() => {
    setLoadingLogs(true);
    const from = logsPage * PER_PAGE;
    let q = supabase.from("email_send_logs").select("id, created_at, smtp_config_key, template_key, to_addresses, reference_type, success", { count: "exact" }).order("created_at", { ascending: false }).range(from, from + PER_PAGE - 1);
    if (filterKey) q = q.eq("smtp_config_key", filterKey);
    q.then(({ data, count }) => {
      setLogs((data ?? []) as EmailLog[]);
      setLogsTotal(count ?? 0);
      setLoadingLogs(false);
    });
  }, [logsPage, filterKey]);

  const openEdit = (cfg: SmtpConfig) => {
    setEditForm({ config_key: cfg.config_key, from_email: cfg.from_email, from_name: cfg.from_name, smtp_password: "", is_active: cfg.is_active });
    setConfigMsg("");
    setConfigError("");
    setShowPw(false);
    setEditModal(cfg);
  };

  const saveConfig = async () => {
    if (!editModal) return;
    setSavingConfig(true);
    setConfigError("");
    const updates: Record<string, unknown> = {
      from_email: editForm.from_email,
      from_name: editForm.from_name,
      is_active: editForm.is_active,
      updated_at: new Date().toISOString(),
    };
    if (editForm.smtp_password) updates.smtp_password = editForm.smtp_password;
    const { error } = await supabase.from("email_smtp_configs").update(updates).eq("id", editModal.id);
    if (error) {
      setConfigError(error.message);
    } else {
      setConfigs(prev => prev.map(c => c.id === editModal.id ? { ...c, from_email: editForm.from_email, from_name: editForm.from_name, is_active: editForm.is_active } : c));
      setConfigMsg("Configuration sauvegardée");
      setTimeout(() => { setEditModal(null); setConfigMsg(""); }, 1500);
    }
    setSavingConfig(false);
  };

  const getTest = (key: string) => testStates[key] || { email: "", sending: false, result: null };
  const setTestField = (key: string, patch: Partial<{ email: string; sending: boolean; result: { ok: boolean; msg: string } | null }>) =>
    setTestStates(prev => ({ ...prev, [key]: { ...getTest(key), ...patch } }));

  const sendTestEmail = async (configKey: string) => {
    const t = getTest(configKey);
    if (!t.email.trim()) return;
    setTestField(configKey, { sending: true, result: null });
    try {
      const token = session?.access_token;
      if (!token) throw new Error("Session expirée.");
      const res = await fetch(`${SUPABASE_URL}/functions/v1/test-smtp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ config_key: configKey, to_email: t.email.trim().toLowerCase() }),
      });
      let d: Record<string, unknown>;
      try { d = await res.json(); } catch { d = { error: `Réponse invalide (HTTP ${res.status})` }; }
      if (!res.ok || d.success === false) {
        setTestField(configKey, { sending: false, result: { ok: false, msg: (d.error as string) || `Erreur HTTP ${res.status}` } });
      } else {
        setTestField(configKey, { sending: false, result: { ok: true, msg: (d.message as string) || `Email de test envoyé à ${t.email.trim()}` } });
      }
    } catch (e) {
      setTestField(configKey, { sending: false, result: { ok: false, msg: e instanceof Error ? e.message : "Erreur réseau" } });
    }
  };

  const iStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: "inherit", outline: "none", background: T.bgCard, boxSizing: "border-box" };

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: T.text, margin: "0 0 6px" }}>Paramètres email</h1>
        <p style={{ margin: 0, fontSize: 13, color: T.textMid }}>Gérez les configurations SMTP système et consultez les journaux d'envoi.</p>
      </div>

      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: T.text, margin: "0 0 14px" }}>Configurations SMTP système</h2>
        {loadingConfigs ? (
          <div style={{ padding: 32, textAlign: "center", color: T.textLight, fontSize: 13 }}>Chargement...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {Object.keys(CONFIG_LABELS).map(key => {
              const cfg = configs.find(c => c.config_key === key);
              return (
                <div key={key} style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: "18px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.main, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{key}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{CONFIG_LABELS[key]}</div>
                    </div>
                    {cfg && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 5, background: cfg.is_active ? T.greenBg : T.bg, color: cfg.is_active ? T.green : T.textLight }}>
                        {cfg.is_active ? "Actif" : "Inactif"}
                      </span>
                    )}
                  </div>
                  {cfg ? (
                    <>
                      <div style={{ fontSize: 12, color: T.textMid, marginBottom: 4 }}><strong style={{ color: T.text }}>De :</strong> {cfg.from_name || "—"}</div>
                      <div style={{ fontSize: 12, color: T.textMid, marginBottom: 14 }}><strong style={{ color: T.text }}>Email :</strong> {cfg.from_email || "—"}</div>
                      <button onClick={() => openEdit(cfg)} style={{ width: "100%", padding: "8px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, color: T.text, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                        Modifier
                      </button>
                      {(() => {
                        const t = getTest(key);
                        return (
                          <div style={{ marginTop: 12, borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: T.textMid, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>Tester l'envoi</div>
                            {!cfg.from_email ? (
                              <div style={{ fontSize: 11, color: T.textLight, fontStyle: "italic" }}>Configurez l'adresse email d'abord via "Modifier"</div>
                            ) : (
                              <>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <input
                                    type="email"
                                    value={t.email}
                                    onChange={e => setTestField(key, { email: e.target.value, result: null })}
                                    placeholder="email@test.com"
                                    style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 12, fontFamily: "inherit", outline: "none", background: T.bgCard, boxSizing: "border-box" }}
                                  />
                                  <button
                                    onClick={() => sendTestEmail(key)}
                                    disabled={t.sending || !t.email.trim()}
                                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "7px 12px", borderRadius: 6, border: "none", background: t.sending ? "#9ca3af" : T.main, color: "#fff", fontSize: 11, fontWeight: 600, cursor: t.sending ? "not-allowed" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                                  >
                                    <Send size={11} />
                                    {t.sending ? "..." : "Test"}
                                  </button>
                                </div>
                                {t.result && (
                                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, fontSize: 11, color: t.result.ok ? T.green : T.red }}>
                                    {t.result.ok ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                    {t.result.msg}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: T.textLight, fontStyle: "italic" }}>Non configuré</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: T.text, margin: 0 }}>Journaux d'envoi</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select value={filterKey} onChange={e => { setFilterKey(e.target.value); setLogsPage(0); }} style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12, fontFamily: "inherit", outline: "none", background: T.bgCard, cursor: "pointer" }}>
              <option value="">Tous les modules</option>
              {Object.entries(CONFIG_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8f9fb" }}>
                  {["Date", "Module", "Template", "Destinataire", "Référence", "Statut"].map(h => (
                    <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingLogs ? (
                  <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: T.textLight, fontSize: 13 }}>Chargement...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: T.textLight, fontSize: 13 }}>Aucun journal trouvé.</td></tr>
                ) : logs.map((log, i) => (
                  <tr key={log.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: T.textMid, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{fmtDate(log.created_at)}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>
                      <span style={{ background: `${T.main}12`, color: T.main, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4 }}>
                        {log.smtp_config_key ?? "—"}
                      </span>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: T.textMid, borderBottom: `1px solid ${T.border}` }}>{log.template_key ?? "—"}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: T.text, borderBottom: `1px solid ${T.border}` }}>
                      {Array.isArray(log.to_addresses) ? log.to_addresses.join(", ") : "—"}
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: T.textMid, borderBottom: `1px solid ${T.border}` }}>{log.reference_type ?? "—"}</td>
                    <td style={{ padding: "11px 14px", borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: log.success ? T.greenBg : T.redBg, color: log.success ? T.green : T.red }}>
                        {log.success ? "Envoyé" : "Échec"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loadingLogs && (
            <div style={{ padding: "10px 16px", borderTop: `1px solid ${T.border}`, background: "#f8f9fb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: T.textLight }}>{logsTotal} entrée{logsTotal !== 1 ? "s" : ""} au total</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button disabled={logsPage === 0} onClick={() => setLogsPage(p => p - 1)} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, fontSize: 12, cursor: logsPage === 0 ? "not-allowed" : "pointer", opacity: logsPage === 0 ? 0.5 : 1, fontFamily: "inherit" }}>Précédent</button>
                <button disabled={(logsPage + 1) * PER_PAGE >= logsTotal} onClick={() => setLogsPage(p => p + 1)} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Suivant</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {editModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9600, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: T.card, borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 24px 60px rgba(0,0,0,0.2)", fontFamily: "'Outfit', sans-serif" }}>
            <div style={{ padding: "18px 22px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>Modifier la config SMTP</div>
                <div style={{ fontSize: 11, color: T.textMid }}>{CONFIG_LABELS[editModal.config_key] ?? editModal.config_key}</div>
              </div>
              <button onClick={() => setEditModal(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: T.textMid }}>✕</button>
            </div>
            <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: "#f0f4ff", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#1e40af" }}>
                Serveur : smtp.hostinger.com · Port : 465 · SSL
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 5 }}>Adresse d'envoi *</label>
                <input value={editForm.from_email} onChange={e => setEditForm(p => ({ ...p, from_email: e.target.value }))} type="email" style={iStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 5 }}>Nom affiché</label>
                <input value={editForm.from_name} onChange={e => setEditForm(p => ({ ...p, from_name: e.target.value }))} style={iStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 5 }}>Mot de passe SMTP</label>
                <div style={{ position: "relative" }}>
                  <input type={showPw ? "text" : "password"} value={editForm.smtp_password} onChange={e => setEditForm(p => ({ ...p, smtp_password: e.target.value }))} placeholder="Laisser vide pour ne pas modifier" style={{ ...iStyle, paddingRight: 36 }} />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.textMid }}>
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={editForm.is_active} onChange={e => setEditForm(p => ({ ...p, is_active: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer" }} />
                <span style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>Configuration active</span>
              </label>
              {configError && <div style={{ fontSize: 12, color: T.red, fontWeight: 600 }}>{configError}</div>}
              {configMsg && <div style={{ fontSize: 12, color: T.green, fontWeight: 600 }}>{configMsg}</div>}
            </div>
            <div style={{ padding: "14px 22px", borderTop: `1px solid ${T.border}`, background: "#f8f9fb", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setEditModal(null)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
              <button onClick={saveConfig} disabled={savingConfig || !editForm.from_email} style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: savingConfig || !editForm.from_email ? "#9ca3af" : T.main, color: "#fff", fontSize: 13, fontWeight: 700, cursor: savingConfig || !editForm.from_email ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                {savingConfig ? "Sauvegarde..." : "Sauvegarder"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
