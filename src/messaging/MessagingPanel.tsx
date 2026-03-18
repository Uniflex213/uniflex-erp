import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { Conversation, UserProfile, MessagingRule } from "./messagingTypes";
import ConversationList from "./ConversationList";
import MessageThread from "./MessageThread";
import NewConversationModal from "./NewConversationModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUnreadChange: (count: number) => void;
}

const PANEL_W = 740;

export default function MessagingPanel({ isOpen, onClose, currentUser, onUnreadChange }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewConv, setShowNewConv] = useState(false);
  const [allowedRoles, setAllowedRoles] = useState<string[]>([]);

  const activeConv = conversations.find(c => c.id === activeConvId) ?? null;

  const fetchConversations = useCallback(async () => {
    const { data: cpData } = await supabase
      .from("conversation_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", currentUser.id);

    if (!cpData?.length) { setConversations([]); setLoading(false); return; }

    const convIds = cpData.map(cp => cp.conversation_id);

    const { data: convData } = await supabase
      .from("conversations")
      .select("*")
      .in("id", convIds)
      .order("last_message_at", { ascending: false });

    if (!convData?.length) { setConversations([]); setLoading(false); return; }

    // Batch fetch all participants, profiles, and last messages (fixes N+1)
    const { data: allParticipants } = await supabase
      .from("conversation_participants")
      .select("conversation_id, user_id, last_read_at")
      .in("conversation_id", convIds);

    const otherUserIds = [...new Set(
      (allParticipants ?? []).filter(p => p.user_id !== currentUser.id).map(p => p.user_id)
    )];
    const { data: profilesData } = otherUserIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, role, avatar_url, job_title, team_id").in("id", otherUserIds)
      : { data: [] };
    const profilesMap = new Map((profilesData ?? []).map(p => [p.id, p]));

    // Fetch last message per conversation in one query (get recent messages, pick last per conv)
    const { data: recentMessages } = await supabase
      .from("messages")
      .select("*")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false })
      .limit(convIds.length * 2);

    const lastMessageMap = new Map<string, typeof recentMessages extends (infer T)[] | null ? T : never>();
    (recentMessages ?? []).forEach(msg => {
      if (!lastMessageMap.has(msg.conversation_id)) lastMessageMap.set(msg.conversation_id, msg);
    });

    const enriched: Conversation[] = convData.map((conv) => {
      const convParticipants = (allParticipants ?? []).filter(p => p.conversation_id === conv.id);
      const otherParticipant = convParticipants.find(p => p.user_id !== currentUser.id);
      const otherUser: UserProfile | null = otherParticipant ? profilesMap.get(otherParticipant.user_id) ?? null : null;
      const lastMessage = lastMessageMap.get(conv.id) ?? null;
      const myParticipant = cpData.find(cp => cp.conversation_id === conv.id);
      let unread_count = 0;
      if (myParticipant && lastMessage && lastMessage.sender_id !== currentUser.id) {
        // Approximate unread count from recent messages
        unread_count = (recentMessages ?? []).filter(m =>
          m.conversation_id === conv.id &&
          m.sender_id !== currentUser.id &&
          m.created_at > myParticipant.last_read_at
        ).length;
      }
      return { ...conv, other_user: otherUser, last_message: lastMessage, unread_count };
    });

    setConversations(enriched);
    setLoading(false);

    const total = enriched.reduce((a, c) => a + (c.unread_count ?? 0), 0);
    onUnreadChange(total);
  }, [currentUser.id]);

  useEffect(() => {
    if (!isOpen) return;
    fetchConversations();

    const sub = supabase
      .channel("messaging_updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => fetchConversations())
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => fetchConversations())
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [isOpen, fetchConversations]);

  useEffect(() => {
    supabase
      .from("messaging_rules")
      .select("target_role")
      .eq("source_role", currentUser.role)
      .eq("can_message", true)
      .then(({ data }) => {
        setAllowedRoles(data?.map(r => r.target_role) ?? []);
      });
  }, [currentUser.role]);

  const markRead = useCallback(async (convId: string) => {
    await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", convId)
      .eq("user_id", currentUser.id);

    setConversations(prev =>
      prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c)
    );
    const total = conversations.reduce((a, c) => a + (c.id === convId ? 0 : (c.unread_count ?? 0)), 0);
    onUnreadChange(total);
  }, [currentUser.id, conversations]);

  const handleStartConversation = async (targetUserId: string) => {
    const { data: existing } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", currentUser.id);

    if (existing?.length) {
      const existingConvIds = existing.map(e => e.conversation_id);
      const { data: targetParticipations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", targetUserId)
        .in("conversation_id", existingConvIds);

      if (targetParticipations?.length) {
        const convId = targetParticipations[0].conversation_id;
        setActiveConvId(convId);
        setShowNewConv(false);
        return;
      }
    }

    const { data: newConv } = await supabase
      .from("conversations")
      .insert({ last_message_at: new Date().toISOString() })
      .select("id")
      .single();

    if (!newConv) return;

    await supabase.from("conversation_participants").insert([
      { conversation_id: newConv.id, user_id: currentUser.id },
      { conversation_id: newConv.id, user_id: targetUserId },
    ]);

    await fetchConversations();
    setActiveConvId(newConv.id);
    setShowNewConv(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(230,228,224,0.85)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", zIndex: 9400, backdropFilter: "blur(2px)" }} />

      <div style={{
        position: "fixed", top: 0, right: 0, height: "100vh", width: PANEL_W,
        maxWidth: "100vw", background: "#fff", zIndex: 9450, display: "flex",
        flexDirection: "column", boxShadow: "-12px 0 60px rgba(0,0,0,0.12)",
        animation: "panelSlideIn 0.25s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <div style={{ height: 56, background: "#fff", borderBottom: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", padding: "0 16px", gap: 10, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#111" }}>Messagerie</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b6b6b", display: "flex", padding: 6, borderRadius: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <div style={{ width: 220, flexShrink: 0, borderRight: "1px solid rgba(0,0,0,0.04)" }}>
            <ConversationList
              conversations={conversations}
              activeId={activeConvId}
              onSelect={conv => { setActiveConvId(conv.id); markRead(conv.id); }}
              onNewConversation={() => setShowNewConv(true)}
              loading={loading}
              currentUserId={currentUser.id}
            />
          </div>

          <div style={{ flex: 1, overflow: "hidden" }}>
            {activeConv?.other_user ? (
              <MessageThread
                conversationId={activeConv.id}
                currentUser={currentUser}
                otherUser={activeConv.other_user}
                onMarkRead={() => markRead(activeConv.id)}
              />
            ) : (
              <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#9ca3af", gap: 12 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.3"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                <div style={{ textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#6b6b6b", opacity: 0.6 }}>Sélectionnez une conversation</p>
                  <p style={{ margin: "6px 0 0", fontSize: 12, opacity: 0.4 }}>ou créez-en une nouvelle</p>
                </div>
                <button
                  onClick={() => setShowNewConv(true)}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "#111", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 6 }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Nouvelle conversation
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showNewConv && (
        <NewConversationModal
          currentUser={currentUser}
          allowedRoles={allowedRoles}
          onStart={handleStartConversation}
          onClose={() => setShowNewConv(false)}
        />
      )}

      <style>{`
        @keyframes panelSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
