import React from "react";
import { Conversation, ROLE_COLORS, ROLE_LABELS, getInitials } from "./messagingTypes";
import { T } from "../theme";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (conv: Conversation) => void;
  onNewConversation: () => void;
  loading: boolean;
  currentUserId: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "maintenant";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}j`;
  return new Date(iso).toLocaleDateString("fr-CA", { month: "short", day: "numeric" });
}

export default function ConversationList({ conversations, activeId, onSelect, onNewConversation, loading, currentUserId }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg }}>
      <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: T.text, letterSpacing: -0.3 }}>Messages</span>
        <button
          onClick={onNewConversation}
          title="Nouvelle conversation"
          style={{ width: 30, height: 30, borderRadius: 8, background: T.main, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: "center", color: T.textMid, fontSize: 13 }}>Chargement...</div>
        ) : conversations.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.textMid} strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: T.textMid, lineHeight: 1.5 }}>Aucune conversation.<br/>Commencez à écrire!</p>
          </div>
        ) : (
          conversations.map(conv => {
            const other = conv.other_user;
            const isActive = conv.id === activeId;
            const unread = conv.unread_count ?? 0;
            const lastMsg = conv.last_message;
            const roleC = ROLE_COLORS[other?.role ?? ""] ?? { bg: "#374151", color: "#9ca3af" };

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                style={{
                  width: "100%", textAlign: "left", background: isActive ? T.active : "transparent",
                  border: "none", borderBottom: `1px solid ${T.border}`, cursor: "pointer",
                  padding: "12px 14px", display: "flex", alignItems: "center", gap: 10,
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = T.hover; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  {other?.avatar_url ? (
                    <img src={other.avatar_url} alt="" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: isActive ? "rgba(0,0,0,0.15)" : roleC.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: isActive ? "#fff" : roleC.color }}>
                      {getInitials(other?.full_name ?? "?")}
                    </div>
                  )}
                  {unread > 0 && (
                    <span style={{ position: "absolute", top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 8, background: "#ef4444", fontSize: 10, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", border: "2px solid #fff" }}>
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: unread > 0 ? 700 : 500, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>
                      {other?.full_name ?? "Utilisateur"}
                    </span>
                    {lastMsg && (
                      <span style={{ fontSize: 10, color: isActive ? "rgba(255,255,255,0.7)" : T.textMid, flexShrink: 0, marginLeft: 6 }}>
                        {timeAgo(lastMsg.created_at)}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: isActive ? "rgba(255,255,255,0.65)" : T.textMid, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {lastMsg ? (lastMsg.sender_id === currentUserId ? "Vous: " : "") + lastMsg.content : (
                      <span style={{ fontStyle: "italic", opacity: 0.6 }}>{ROLE_LABELS[other?.role ?? ""] ?? ""}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
