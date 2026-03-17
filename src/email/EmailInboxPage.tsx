import React, { useState, useEffect, useCallback, useRef } from "react";
import DOMPurify from "dompurify";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { EmailMessage } from "./emailTypes";
import EmailComposeModal from "./EmailComposeModal";
import {
  RefreshCw, Pencil, Star, Trash2, Mail, Send, FileText,
  AlertTriangle, Reply, CornerUpLeft, Archive, MoreHorizontal,
  Search, ChevronDown, Circle, CheckCircle2, Folder, Inbox
} from "lucide-react";
import { T } from "../theme";

const FOLDER_ALIASES: Record<string, { label: string; icon: React.ElementType; order: number }> = {
  "inbox": { label: "Boîte de réception", icon: Inbox, order: 0 },
  "sent": { label: "Envoyés", icon: Send, order: 1 },
  "drafts": { label: "Brouillons", icon: FileText, order: 2 },
  "spam": { label: "Spam", icon: AlertTriangle, order: 3 },
  "junk": { label: "Spam", icon: AlertTriangle, order: 3 },
  "trash": { label: "Corbeille", icon: Trash2, order: 4 },
};

function resolveFolder(imapName: string): { name: string; label: string; icon: React.ElementType; order: number } | null {
  const lower = imapName.toLowerCase();
  const shortName = lower.replace(/^inbox\./, "");
  const match = FOLDER_ALIASES[shortName] || FOLDER_ALIASES[lower];
  if (match) return { name: imapName, label: match.label, icon: match.icon, order: match.order };
  return null;
}

const DEFAULT_FOLDERS = [
  { name: "INBOX", label: "Boîte de réception", icon: Inbox },
];

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "À l'instant";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (diff < 604800000) return d.toLocaleDateString("fr-CA", { weekday: "short" });
  return d.toLocaleDateString("fr-CA", { day: "numeric", month: "short" });
}

function fmtDateFull(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("fr-CA", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
}

function getAvatarColor(name: string): string {
  const colors = ["#2563eb", "#059669", "#d97706", "#dc2626", "#0891b2", "#7c3aed"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return colors[hash % colors.length];
}

interface Props {
  userEmail?: string;
}

export default function EmailInboxPage({ userEmail: propEmail }: Props) {
  const { user } = useAuth();
  const [smtpEmail, setSmtpEmail] = useState<string | undefined>(propEmail);

  useEffect(() => {
    if (propEmail || !user) return;
    supabase.from("user_smtp_configs").select("from_email").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data?.from_email) setSmtpEmail(data.from_email);
    });
  }, [user, propEmail]);

  const userEmail = smtpEmail;
  const [folders, setFolders] = useState<Array<{ name: string; label: string; icon: React.ElementType }>>(DEFAULT_FOLDERS);
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [activeFolder, setActiveFolder] = useState("INBOX");
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [filteredEmails, setFilteredEmails] = useState<EmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingBody, setLoadingBody] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeData, setComposeData] = useState<{ to?: string; subject?: string; body?: string }>({});
  const [search, setSearch] = useState("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const hasFetchedRef = useRef<Record<string, boolean>>({});

  const fetchFolders = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-inbox`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ action: "list_folders" }),
      });
      const data = await res.json();
      if (data.folders) {
        const resolved: Array<{ name: string; label: string; icon: React.ElementType; order: number }> = [];
        const custom: string[] = [];
        const seenOrders = new Set<number>();
        for (const f of data.folders as string[]) {
          const mapped = resolveFolder(f);
          if (mapped && !seenOrders.has(mapped.order)) {
            seenOrders.add(mapped.order);
            resolved.push(mapped);
          } else if (!mapped && f.toLowerCase() !== "inbox") {
            custom.push(f);
          }
        }
        resolved.sort((a, b) => a.order - b.order);
        if (!seenOrders.has(0)) resolved.unshift({ name: "INBOX", label: "Boîte de réception", icon: Inbox, order: 0 });
        setFolders(resolved);
        setCustomFolders(custom);
      }
    } catch {}
  }, []);

  const fetchEmails = useCallback(async (folder: string, force = false) => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("Session expirée."); return; }
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-inbox`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ mailbox: folder, force_refresh: force }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erreur"); return; }
      const list: EmailMessage[] = data.emails ?? [];
      setEmails(list);
      hasFetchedRef.current[folder] = true;
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    if (!hasFetchedRef.current[activeFolder]) {
      fetchEmails(activeFolder);
    }
  }, [activeFolder, fetchEmails]);

  useEffect(() => {
    let result = emails;
    if (showUnreadOnly) result = result.filter(e => !e.is_read);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.subject?.toLowerCase().includes(q) ||
        e.from_name?.toLowerCase().includes(q) ||
        e.from_address?.toLowerCase().includes(q)
      );
    }
    setFilteredEmails(result);
  }, [emails, search, showUnreadOnly]);

  const fetchBody = async (email: EmailMessage) => {
    if (email.body_html || email.body_text) return;
    setLoadingBody(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-inbox`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ mailbox: email.mailbox, uid: email.uid }),
      });
      const data = await res.json();
      if (data.email) {
        const updated = { ...email, body_html: data.email.body_html, body_text: data.email.body_text };
        setSelectedEmail(updated);
        setEmails(prev => prev.map(e => e.uid === email.uid ? updated : e));
      }
    } finally {
      setLoadingBody(false);
    }
  };

  const selectEmail = (email: EmailMessage) => {
    setSelectedEmail(email);
    if (!email.is_read) markRead(email.uid, true);
    fetchBody(email);
  };

  const markRead = async (uid: number, read: boolean) => {
    setEmails(prev => prev.map(e => e.uid === uid ? { ...e, is_read: read } : e));
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-inbox-action`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}`, "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY },
      body: JSON.stringify({ action: read ? "mark_read" : "mark_unread", uid, mailbox: activeFolder }),
    });
  };

  const toggleStar = async (email: EmailMessage, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStarred = !email.is_starred;
    setEmails(prev => prev.map(em => em.uid === email.uid ? { ...em, is_starred: newStarred } : em));
    if (selectedEmail?.uid === email.uid) setSelectedEmail(em => em ? { ...em, is_starred: newStarred } : null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-inbox-action`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}`, "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY },
      body: JSON.stringify({ action: newStarred ? "star" : "unstar", uid: email.uid, mailbox: activeFolder }),
    });
  };

  const isTrashFolder = /^(inbox\.)?trash$/i.test(activeFolder);

  const deleteEmail = async (email: EmailMessage) => {
    setEmails(prev => prev.filter(e => e.uid !== email.uid));
    if (selectedEmail?.uid === email.uid) setSelectedEmail(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-inbox-action`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}`, "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY },
      body: JSON.stringify({ action: "delete", uid: email.uid, mailbox: activeFolder }),
    });
    if (!isTrashFolder) {
      for (const f of allFolders) {
        if (/^(inbox\.)?trash$/i.test(f.name)) hasFetchedRef.current[f.name] = false;
      }
    }
  };

  const handleFolderChange = (folder: string) => {
    setActiveFolder(folder);
    setSelectedEmail(null);
    setEmails([]);
    setSearch("");
    hasFetchedRef.current[folder] = false;
  };

  const allFolders = [...folders, ...customFolders.map(f => ({ name: f, label: f.replace(/^INBOX\./i, ""), icon: Folder }))];
  const unreadCount = emails.filter(e => !e.is_read).length;

  const replyToEmail = (email: EmailMessage) => {
    setComposeData({
      to: email.from_address,
      subject: `Re: ${email.subject}`,
      body: `\n\n---\nDe : ${email.from_name || email.from_address}\nDate : ${fmtDateFull(email.received_at)}\n\n${email.body_text ?? ""}`,
    });
    setShowCompose(true);
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 112px)", background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ width: 220, background: T.sidebar, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "18px 14px 14px" }}>
          <button
            onClick={() => { setComposeData({}); setShowCompose(true); }}
            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "11px 16px", background: T.main, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            <Pencil size={14} /> Nouveau message
          </button>
        </div>
        <div style={{ padding: "0 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {allFolders.map(f => {
            const Icon = f.icon;
            const isActive = activeFolder === f.name;
            const cnt = f.name === "INBOX" ? unreadCount : 0;
            return (
              <button
                key={f.name}
                onClick={() => handleFolderChange(f.name)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", background: isActive ? T.mainBg : "transparent", color: isActive ? T.main : T.textMid, cursor: "pointer", fontFamily: "inherit", width: "100%", textAlign: "left", transition: "all 0.12s" }}
              >
                <Icon size={16} />
                <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, flex: 1 }}>{f.label}</span>
                {cnt > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 800, background: T.main, color: "#fff", borderRadius: 10, padding: "1px 7px" }}>{cnt}</span>
                )}
              </button>
            );
          })}
        </div>
        {userEmail && (
          <div style={{ marginTop: "auto", padding: "14px 16px", borderTop: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 10, color: T.textLight, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Connecté</div>
            <div style={{ fontSize: 11, color: T.textMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</div>
          </div>
        )}
      </div>

      <div style={{ width: 340, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{allFolders.find(f => f.name === activeFolder)?.label ?? activeFolder}</div>
              <div style={{ fontSize: 11, color: T.textMid }}>{unreadCount > 0 ? `${unreadCount} non lu${unreadCount > 1 ? "s" : ""}` : `${emails.length} message${emails.length !== 1 ? "s" : ""}`}</div>
            </div>
            <button onClick={() => fetchEmails(activeFolder, true)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMid, padding: 5, borderRadius: 6, display: "flex" }}>
              <RefreshCw size={14} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            </button>
            <button onClick={() => setShowUnreadOnly(!showUnreadOnly)} style={{ background: showUnreadOnly ? T.mainBg : "none", border: "none", cursor: "pointer", color: showUnreadOnly ? T.main : T.textMid, padding: "5px 10px", borderRadius: 6, display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}>
              {showUnreadOnly ? <CheckCircle2 size={13} /> : <Circle size={13} />} Non lus
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.bg, borderRadius: 8, padding: "7px 12px" }}>
            <Search size={13} color={T.textLight} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." style={{ border: "none", background: "transparent", outline: "none", fontSize: 12, fontFamily: "inherit", flex: 1, color: T.text }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: T.textLight, fontSize: 13 }}>Chargement...</div>
          ) : error ? (
            <div style={{ margin: 12, background: T.redBg, borderRadius: 8, padding: "12px 14px", fontSize: 12, color: T.red }}>{error}</div>
          ) : filteredEmails.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: T.textLight, fontSize: 13 }}>
              <Mail size={36} style={{ opacity: 0.2, marginBottom: 10, display: "block", margin: "0 auto 10px" }} />
              Aucun message
            </div>
          ) : filteredEmails.map(email => {
            const isSelected = selectedEmail?.uid === email.uid;
            const color = getAvatarColor(email.from_name || email.from_address);
            return (
              <div
                key={email.uid}
                onClick={() => selectEmail(email)}
                style={{ padding: "12px 14px", cursor: "pointer", borderBottom: `1px solid ${T.border}`, background: isSelected ? T.mainBg : email.is_read ? "transparent" : T.unreadBg, position: "relative", transition: "background 0.1s" }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ position: "relative", flexShrink: 0, marginTop: 2 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 800 }}>
                      {getInitials(email.from_name || email.from_address)}
                    </div>
                    {!email.is_read && <div style={{ position: "absolute", top: -2, right: -2, width: 9, height: 9, borderRadius: "50%", background: T.main, border: "2px solid #fff" }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: email.is_read ? 500 : 700, color: T.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {email.from_name || email.from_address || "Inconnu"}
                      </span>
                      <span style={{ fontSize: 10, color: T.textLight, flexShrink: 0 }}>{fmtDate(email.received_at)}</span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: email.is_read ? 500 : 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
                      {email.subject || "(Sans objet)"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 4 }}>
                  <button
                    onClick={e => toggleStar(email, e)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 3, color: email.is_starred ? "#f59e0b" : T.textLight, opacity: 0.7 }}
                  >
                    <Star size={12} fill={email.is_starred ? "#f59e0b" : "none"} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {!selectedEmail ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: T.textLight }}>
            <Mail size={56} style={{ opacity: 0.12, marginBottom: 16 }} />
            <div style={{ fontSize: 16, fontWeight: 700, opacity: 0.4 }}>Sélectionnez un message</div>
            <div style={{ fontSize: 13, opacity: 0.3, marginTop: 6 }}>Cliquez sur un email dans la liste</div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "14px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedEmail.subject || "(Sans objet)"}
                </div>
              </div>
              <button onClick={() => toggleStar(selectedEmail, { stopPropagation: () => {} } as React.MouseEvent)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: selectedEmail.is_starred ? "#f59e0b" : T.textLight, display: "flex" }}>
                <Star size={17} fill={selectedEmail.is_starred ? "#f59e0b" : "none"} />
              </button>
              <button
                onClick={() => replyToEmail(selectedEmail)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", border: `1px solid ${T.border}`, borderRadius: 8, background: T.bgCard, color: T.text, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                <Reply size={14} /> Répondre
              </button>
              <button onClick={() => deleteEmail(selectedEmail)} title={isTrashFolder ? "Supprimer définitivement" : "Déplacer vers la corbeille"} style={{ background: isTrashFolder ? T.redBg : "none", border: `1px solid ${isTrashFolder ? "#fca5a5" : T.border}`, borderRadius: 8, cursor: "pointer", color: isTrashFolder ? T.red : T.textLight, padding: "8px 10px", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>
                <Trash2 size={14} />{isTrashFolder ? " Supprimer" : ""}
              </button>
            </div>

            <div style={{ padding: "18px 24px", borderBottom: `1px solid ${T.border}`, flexShrink: 0, background: T.bg }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: getAvatarColor(selectedEmail.from_name || selectedEmail.from_address), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 800, flexShrink: 0 }}>
                  {getInitials(selectedEmail.from_name || selectedEmail.from_address)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{selectedEmail.from_name || selectedEmail.from_address}</div>
                  <div style={{ fontSize: 12, color: T.textMid }}>&lt;{selectedEmail.from_address}&gt;</div>
                  <div style={{ fontSize: 11, color: T.textLight, marginTop: 2 }}>
                    À : {Array.isArray(selectedEmail.to_addresses) ? selectedEmail.to_addresses.map((a: { address?: string } | string) => typeof a === "string" ? a : a.address).join(", ") : "—"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: T.textMid }}>{fmtDateFull(selectedEmail.received_at)}</div>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
              {loadingBody ? (
                <div style={{ textAlign: "center", padding: 60, color: T.textLight }}>
                  <div style={{ width: 28, height: 28, border: `3px solid ${T.border}`, borderTopColor: T.main, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                  Chargement du message...
                </div>
              ) : selectedEmail.body_html ? (
                <div
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedEmail.body_html) }}
                  style={{ fontSize: 14, lineHeight: 1.75, color: T.text, maxWidth: "100%", overflowWrap: "break-word" }}
                />
              ) : selectedEmail.body_text ? (
                <pre style={{ fontSize: 14, lineHeight: 1.75, color: T.text, fontFamily: "inherit", whiteSpace: "pre-wrap", margin: 0 }}>
                  {selectedEmail.body_text}
                </pre>
              ) : (
                <div style={{ textAlign: "center", padding: 60, color: T.textLight, fontSize: 14 }}>Message vide</div>
              )}
            </div>

            <div style={{ padding: "16px 24px", borderTop: `1px solid ${T.border}`, background: T.bg, flexShrink: 0, display: "flex", gap: 10 }}>
              <button
                onClick={() => replyToEmail(selectedEmail)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", border: `1px solid ${T.border}`, borderRadius: 9, background: T.bgCard, color: T.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                <CornerUpLeft size={15} /> Répondre
              </button>
              <button
                onClick={() => {
                  setComposeData({
                    subject: `Tr: ${selectedEmail.subject}`,
                    body: `\n\n---\nDe : ${selectedEmail.from_name || selectedEmail.from_address}\nDate : ${fmtDateFull(selectedEmail.received_at)}\n\n${selectedEmail.body_text ?? ""}`,
                  });
                  setShowCompose(true);
                }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", border: `1px solid ${T.border}`, borderRadius: 9, background: T.bgCard, color: T.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                <Archive size={15} /> Transférer
              </button>
            </div>
          </div>
        )}
      </div>

      <EmailComposeModal
        isOpen={showCompose}
        onClose={() => setShowCompose(false)}
        initial={composeData}
        fromEmail={userEmail}
      />

      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}
