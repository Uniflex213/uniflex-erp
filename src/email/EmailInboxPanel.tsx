import React, { useState, useEffect, useCallback, useRef } from "react";
import DOMPurify from "dompurify";
import { supabase } from "../supabaseClient";
import { EmailMessage } from "./emailTypes";
import EmailComposeModal from "./EmailComposeModal";
import {
  X, RefreshCw, Pencil, Star, Trash2, ArrowLeft,
  Mail, Send, FileText, AlertTriangle, Maximize2,
  Reply, CornerUpLeft, ChevronLeft, FolderPlus, Search,
  Inbox, Archive, Folder
} from "lucide-react";
import { T } from "../theme";

const PANEL_W = 860;

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
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (diff < 604800000) return d.toLocaleDateString("fr-CA", { weekday: "short" });
  return d.toLocaleDateString("fr-CA", { day: "numeric", month: "short" });
}

function fmtDateFull(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("fr-CA", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
}

function getAvatarColor(name: string): string {
  const colors = ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return colors[hash % colors.length];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenFullPage: () => void;
  userEmail?: string;
  onUnreadChange?: (count: number) => void;
}

export default function EmailInboxPanel({ isOpen, onClose, onOpenFullPage, userEmail, onUnreadChange }: Props) {
  const [folders, setFolders] = useState<Array<{ name: string; label: string; icon: React.ElementType }>>(DEFAULT_FOLDERS);
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [activeFolder, setActiveFolder] = useState("INBOX");
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingBody, setLoadingBody] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeData, setComposeData] = useState<{ to?: string; subject?: string; body?: string }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
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
        const inboxEntry = { name: "INBOX", label: "Boîte de réception", icon: Inbox, order: 0 };
        if (!seenOrders.has(0)) resolved.unshift(inboxEntry);
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
      if (!res.ok) { setError(data.error ?? "Erreur de chargement"); return; }
      const list: EmailMessage[] = data.emails ?? [];
      setEmails(list);
      hasFetchedRef.current[folder] = true;
      if (folder === "INBOX") {
        const unread = list.filter(e => !e.is_read).length;
        onUnreadChange?.(unread);
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [onUnreadChange]);

  const searchEmails = useCallback(async () => {
    if (!searchQuery.trim()) {
      fetchEmails(activeFolder);
      return;
    }
    setSearching(true);
    setError(null);
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
        body: JSON.stringify({ action: "search", mailbox: activeFolder, search_query: searchQuery }),
      });
      const data = await res.json();
      if (data.emails) setEmails(data.emails);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, activeFolder, fetchEmails]);

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    setError(null);
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
        body: JSON.stringify({ action: "create_folder", folder_name: newFolderName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewFolderName("");
        setShowNewFolder(false);
        await fetchFolders();
      } else {
        setError(data.error || "Erreur lors de la creation du dossier");
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setCreatingFolder(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFolders();
      if (!hasFetchedRef.current[activeFolder]) {
        fetchEmails(activeFolder);
      }
    }
  }, [isOpen, activeFolder, fetchEmails, fetchFolders]);

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

  const selectEmail = async (email: EmailMessage) => {
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

  const toggleStar = async (email: EmailMessage) => {
    const newStarred = !email.is_starred;
    setEmails(prev => prev.map(e => e.uid === email.uid ? { ...e, is_starred: newStarred } : e));
    if (selectedEmail?.uid === email.uid) setSelectedEmail(e => e ? { ...e, is_starred: newStarred } : null);
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
    setSearchQuery("");
    hasFetchedRef.current[folder] = false;
  };

  const unreadCount = emails.filter(e => !e.is_read).length;
  const allFolders = [...folders, ...customFolders.map(f => ({ name: f, label: f.replace(/^INBOX\./i, ""), icon: Folder }))];

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9000, opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "all" : "none", transition: "opacity 0.25s ease" }}
        onClick={onClose}
      />
      <div
        style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: PANEL_W, background: T.card, zIndex: 9001, display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(0,0,0,0.18)", transform: isOpen ? "translateX(0)" : `translateX(${PANEL_W}px)`, transition: "transform 0.3s cubic-bezier(0.32,0.72,0,1)", fontFamily: "'Outfit', sans-serif" }}
      >
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10, background: T.bgCard, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: T.mainBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Mail size={15} color={T.main} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>Boîte de réception</div>
            <div style={{ fontSize: 11, color: T.textMid }}>{unreadCount > 0 ? `${unreadCount} non lu${unreadCount > 1 ? "s" : ""}` : "Tout lu"}</div>
          </div>
          <button onClick={() => setShowCompose(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: T.main, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            <Pencil size={13} /> Composer
          </button>
          <button onClick={() => fetchEmails(activeFolder, true)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMid, padding: 6, borderRadius: 6, display: "flex", alignItems: "center" }} title="Actualiser">
            <RefreshCw size={15} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          </button>
          <button onClick={onOpenFullPage} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMid, padding: 6, borderRadius: 6, display: "flex", alignItems: "center" }} title="Plein écran">
            <Maximize2 size={15} />
          </button>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMid, padding: 6, borderRadius: 6, display: "flex", alignItems: "center" }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <div style={{ width: 260, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", background: T.sidebar, overflow: "hidden" }}>
            <div style={{ padding: "10px 8px 6px", display: "flex", flexDirection: "column", gap: 2 }}>
              {allFolders.map(f => {
                const Icon = f.icon;
                const isActive = activeFolder === f.name;
                const cnt = f.name === "INBOX" ? unreadCount : 0;
                return (
                  <button
                    key={f.name}
                    onClick={() => handleFolderChange(f.name)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, border: "none", background: isActive ? T.mainBg : "transparent", color: isActive ? T.main : T.textMid, cursor: "pointer", fontFamily: "inherit", width: "100%", textAlign: "left", transition: "all 0.12s" }}
                  >
                    <Icon size={15} />
                    <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, flex: 1 }}>{f.label}</span>
                    {cnt > 0 && <span style={{ fontSize: 10, fontWeight: 800, background: T.main, color: "#fff", borderRadius: 10, padding: "1px 6px", minWidth: 18, textAlign: "center" }}>{cnt}</span>}
                  </button>
                );
              })}
              <button
                onClick={() => setShowNewFolder(true)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, border: `1px dashed ${T.border}`, background: "transparent", color: T.textLight, cursor: "pointer", fontFamily: "inherit", width: "100%", textAlign: "left", marginTop: 4 }}
              >
                <FolderPlus size={15} />
                <span style={{ fontSize: 12 }}>Nouveau dossier</span>
              </button>
            </div>

            <div style={{ padding: "8px 8px 6px", borderTop: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: T.bgCard, borderRadius: 8, padding: "6px 10px", border: `1px solid ${T.border}` }}>
                <Search size={13} color={T.textLight} />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && searchEmails()}
                  placeholder="Rechercher..."
                  style={{ border: "none", background: "transparent", outline: "none", fontSize: 12, fontFamily: "inherit", flex: 1, color: T.text }}
                />
                {searching && <RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} color={T.textLight} />}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", borderTop: `1px solid ${T.border}`, paddingTop: 4 }}>
              {loading ? (
                <div style={{ padding: 24, textAlign: "center", color: T.textLight, fontSize: 12 }}>Chargement...</div>
              ) : error ? (
                <div style={{ padding: "12px 14px", color: T.red, fontSize: 12, background: T.redBg, margin: 8, borderRadius: 8 }}>{error}</div>
              ) : emails.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: T.textLight, fontSize: 12 }}>Aucun message</div>
              ) : (
                emails.map(email => {
                  const isSelected = selectedEmail?.uid === email.uid;
                  const color = getAvatarColor(email.from_name || email.from_address);
                  return (
                    <div
                      key={email.uid}
                      onClick={() => selectEmail(email)}
                      style={{ padding: "10px 12px", cursor: "pointer", borderBottom: `1px solid ${T.border}`, background: isSelected ? T.mainBg : email.is_read ? "transparent" : T.unreadBg, position: "relative", transition: "background 0.1s" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                          {getInitials(email.from_name || email.from_address)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: email.is_read ? 500 : 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {email.from_name || email.from_address || "Expéditeur inconnu"}
                          </div>
                        </div>
                        <div style={{ fontSize: 10, color: T.textLight, flexShrink: 0 }}>{fmtDate(email.received_at)}</div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: email.is_read ? 500 : 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingLeft: 36 }}>
                        {email.subject || "(Sans objet)"}
                      </div>
                      {!email.is_read && <div style={{ position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)", width: 6, height: 6, borderRadius: "50%", background: T.main }} />}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {!selectedEmail ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: T.textLight }}>
                <Mail size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
                <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.5 }}>Sélectionnez un message</div>
              </div>
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ padding: "12px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => setSelectedEmail(null)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMid, padding: 4, borderRadius: 6, display: "flex" }}>
                    <ChevronLeft size={18} />
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {selectedEmail.subject || "(Sans objet)"}
                    </div>
                  </div>
                  <button onClick={() => toggleStar(selectedEmail)} style={{ background: "none", border: "none", cursor: "pointer", padding: 5, borderRadius: 6, color: selectedEmail.is_starred ? "#f59e0b" : T.textLight, display: "flex" }}>
                    <Star size={15} fill={selectedEmail.is_starred ? "#f59e0b" : "none"} />
                  </button>
                  <button
                    onClick={() => { setComposeData({ to: selectedEmail.from_address, subject: `Re: ${selectedEmail.subject}`, body: `\n\n---\nDe : ${selectedEmail.from_name || selectedEmail.from_address}\nDate : ${fmtDateFull(selectedEmail.received_at)}\n\n${selectedEmail.body_text ?? ""}` }); setShowCompose(true); }}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: `1px solid ${T.border}`, borderRadius: 7, background: T.bgCard, color: T.text, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    <Reply size={13} /> Répondre
                  </button>
                  <button onClick={() => deleteEmail(selectedEmail)} title={isTrashFolder ? "Supprimer définitivement" : "Déplacer vers la corbeille"} style={{ background: isTrashFolder ? T.redBg : "none", border: isTrashFolder ? "1px solid #fca5a5" : "none", cursor: "pointer", color: isTrashFolder ? T.red : T.textLight, padding: 5, borderRadius: 6, display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}>
                    <Trash2 size={15} />{isTrashFolder ? " Supprimer" : ""}
                  </button>
                </div>

                <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: getAvatarColor(selectedEmail.from_name || selectedEmail.from_address), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
                      {getInitials(selectedEmail.from_name || selectedEmail.from_address)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{selectedEmail.from_name || selectedEmail.from_address}</div>
                      <div style={{ fontSize: 11, color: T.textMid }}>{selectedEmail.from_address}</div>
                      <div style={{ fontSize: 11, color: T.textLight, marginTop: 2 }}>
                        À : {Array.isArray(selectedEmail.to_addresses) ? selectedEmail.to_addresses.map(a => a.address || (a as unknown as string)).join(", ") : "—"}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: T.textLight, flexShrink: 0 }}>{fmtDateFull(selectedEmail.received_at)}</div>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
                  {loadingBody ? (
                    <div style={{ textAlign: "center", padding: 40, color: T.textLight, fontSize: 13 }}>Chargement du message...</div>
                  ) : selectedEmail.body_html ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedEmail.body_html) }}
                      style={{ fontSize: 13, lineHeight: 1.7, color: T.text, maxWidth: "100%", overflowWrap: "break-word" }}
                    />
                  ) : selectedEmail.body_text ? (
                    <pre style={{ fontSize: 13, lineHeight: 1.7, color: T.text, fontFamily: "inherit", whiteSpace: "pre-wrap", margin: 0 }}>
                      {selectedEmail.body_text}
                    </pre>
                  ) : (
                    <div style={{ textAlign: "center", padding: 40, color: T.textLight, fontSize: 13 }}>Message vide</div>
                  )}
                </div>

                <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, background: T.bg, flexShrink: 0 }}>
                  <button
                    onClick={() => { setComposeData({ to: selectedEmail.from_address, subject: `Re: ${selectedEmail.subject}`, body: `\n\n---\nDe : ${selectedEmail.from_name || selectedEmail.from_address}\nDate : ${fmtDateFull(selectedEmail.received_at)}\n\n${selectedEmail.body_text ?? ""}` }); setShowCompose(true); }}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", border: `1px solid ${T.border}`, borderRadius: 8, background: T.bgCard, color: T.text, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    <CornerUpLeft size={14} /> Répondre à {selectedEmail.from_name || selectedEmail.from_address}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showNewFolder && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowNewFolder(false)}>
          <div style={{ background: T.bgCard, borderRadius: 12, padding: 24, width: 340, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: T.text }}>Nouveau dossier</div>
            <input
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="Nom du dossier"
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: "inherit", marginBottom: 16, boxSizing: "border-box" }}
              autoFocus
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowNewFolder(false)} style={{ padding: "8px 16px", border: `1px solid ${T.border}`, borderRadius: 8, background: T.bgCard, color: T.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
              <button onClick={createFolder} disabled={creatingFolder || !newFolderName.trim()} style={{ padding: "8px 16px", border: "none", borderRadius: 8, background: T.main, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: creatingFolder || !newFolderName.trim() ? 0.6 : 1 }}>
                {creatingFolder ? "Création..." : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}

      <EmailComposeModal
        isOpen={showCompose}
        onClose={() => setShowCompose(false)}
        initial={composeData}
        fromEmail={userEmail}
      />

      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </>
  );
}
