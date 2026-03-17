import React, { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { T } from "../theme";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  read: boolean;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  isMobile?: boolean;
  onNavigate?: (refType: string, refId: string) => void;
};

export default function NotificationDropdown({ open, onClose, isMobile, onNavigate }: Props) {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifs(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!open || !user) return;
    fetchNotifs();

    const channel = supabase
      .channel("notifs-" + user.id)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifs((prev) => [payload.new as Notification, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [open, user, fetchNotifs]);

  const unreadCount = notifs.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClick = (n: Notification) => {
    if (!n.read) markRead(n.id);
    if (n.reference_type && n.reference_id && onNavigate) {
      onNavigate(n.reference_type, n.reference_id);
      onClose();
    }
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "maintenant";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}j`;
    return new Date(iso).toLocaleDateString("fr-CA");
  };

  const typeIcon: Record<string, string> = {
    lead: "🎯",
    order: "📦",
    sample: "🧪",
    dispute: "⚠️",
    message: "💬",
    info: "ℹ️",
  };

  if (!open) return null;

  return (
    <div
      ref={dropdownRef}
      style={{
        position: "absolute",
        top: 44,
        right: 0,
        width: isMobile ? "calc(100vw - 24px)" : 380,
        maxHeight: "70vh",
        background: T.bgCard,
        borderRadius: 12,
        border: `1px solid ${T.border}`,
        boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
        zIndex: 100,
        overflow: "hidden",
        backdropFilter: "blur(20px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: T.text,
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          Notifications{unreadCount > 0 && ` (${unreadCount})`}
        </span>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              background: "none",
              border: "none",
              color: T.main,
              fontSize: 10,
              cursor: "pointer",
              fontFamily: "'Inter', system-ui, sans-serif",
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            Tout marquer lu
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ overflowY: "auto", flex: 1 }}>
        {loading ? (
          <div style={{ padding: "24px 16px", textAlign: "center", color: T.textLight, fontSize: 12 }}>
            Chargement...
          </div>
        ) : notifs.length === 0 ? (
          <div style={{ padding: "24px 16px", textAlign: "center", color: T.textLight, fontSize: 12 }}>
            Aucune notification
          </div>
        ) : (
          notifs.map((n) => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              style={{
                padding: "10px 14px",
                borderBottom: `1px solid ${T.border}`,
                cursor: n.reference_type ? "pointer" : "default",
                background: n.read ? "transparent" : "rgba(99,102,241,0.06)",
                transition: "background 0.15s",
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
              onMouseEnter={(e) => {
                if (n.reference_type) e.currentTarget.style.background = T.bgHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = n.read ? "transparent" : "rgba(99,102,241,0.06)";
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>
                {typeIcon[n.type] || typeIcon.info}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: n.read ? 500 : 700,
                    color: T.text,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    lineHeight: 1.4,
                  }}
                >
                  {n.title}
                </div>
                {n.message && (
                  <div
                    style={{
                      fontSize: 11,
                      color: T.textMid,
                      marginTop: 2,
                      lineHeight: 1.3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {n.message}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: T.textLight, fontFamily: "'Inter', system-ui, sans-serif" }}>
                  {timeAgo(n.created_at)}
                </span>
                {!n.read && (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: T.main,
                    }}
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
