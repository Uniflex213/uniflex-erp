import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { T } from "../../theme";
import { TeamMessage, TeamMember } from "./teamTypes";
import { timeAgo } from "./teamUtils";
import { useLanguage } from "../../i18n/LanguageContext";

const REACTIONS = ["👍", "🎉", "🔥", "❤️"];

function Avatar({ member, size = 32 }: { member: TeamMember; size?: number }) {
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: member.avatar_color, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.36, fontWeight: 800,
      }}>
        {member.agent_initials}
      </div>
      <div style={{
        position: "absolute", bottom: 0, right: 0,
        width: size * 0.28, height: size * 0.28, borderRadius: "50%",
        background: member.is_online ? T.green : "#9ca3af",
        border: "1.5px solid #fff",
      }} />
    </div>
  );
}

interface Props {
  teamId: string;
  currentMember: TeamMember;
  members: TeamMember[];
}

export default function TeamChatTab({ teamId, currentMember, members }: Props) {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const enrichMessages = useCallback((rawMessages: TeamMessage[]) => {
    return rawMessages.map(msg => ({
      ...msg,
      member: members.find(m => m.id === msg.member_id) ?? {
        id: msg.member_id,
        agent_name: t("team_chat.unknown", "Inconnu"),
        agent_initials: "?",
        avatar_color: "#9ca3af",
        is_online: false,
      } as TeamMember,
    }));
  }, [members]);

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from("team_messages")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: true })
      .limit(100);
    if (data) setMessages(enrichMessages(data as TeamMessage[]));
  }, [teamId, enrichMessages]);

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`team_chat_${teamId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "team_messages",
        filter: `team_id=eq.${teamId}`,
      }, payload => {
        const newMsg = payload.new as TeamMessage;
        setMessages(prev => [...prev, {
          ...newMsg,
          member: members.find(m => m.id === newMsg.member_id),
        }]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [teamId, loadMessages, members]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setInput("");

    const { data: msg } = await supabase
      .from("team_messages")
      .insert({
        team_id: teamId,
        member_id: currentMember.id,
        content,
        message_type: "text",
        is_system: false,
      })
      .select()
      .maybeSingle();

    if (msg) {
      setMessages(prev => [...prev, { ...msg as TeamMessage, member: currentMember }]);
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const addReaction = async (msgId: string, emoji: string) => {
    const existing = messages.find(m => m.id === msgId);
    if (!existing) return;

    const { error } = await supabase.from("team_message_reactions").upsert({
      message_id: msgId,
      member_id: currentMember.id,
      emoji,
    }, { onConflict: "message_id,member_id,emoji" });

    if (!error) {
      setMessages(prev => prev.map(m => {
        if (m.id !== msgId) return m;
        const existingReactions = m.reactions ?? [];
        const alreadyReacted = existingReactions.some(r => r.member_id === currentMember.id && r.emoji === emoji);
        if (alreadyReacted) return m;
        return { ...m, reactions: [...existingReactions, { id: `r_${Date.now()}`, message_id: msgId, member_id: currentMember.id, emoji, created_at: new Date().toISOString() }] };
      }));
    }
  };

  const groupedReactions = (msg: TeamMessage) => {
    const counts: Record<string, number> = {};
    (msg.reactions ?? []).forEach(r => { counts[r.emoji] = (counts[r.emoji] ?? 0) + 1; });
    return counts;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, overflow: "hidden" }}>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>

      <div style={{ flex: 1, overflow: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 4, minHeight: 0 }}>
        {messages.map((msg, idx) => {
          const isMe = msg.member_id === currentMember.id;
          const isSystem = msg.is_system;
          const prevMsg = idx > 0 ? messages[idx - 1] : null;
          const showAvatar = !isMe && (!prevMsg || prevMsg.member_id !== msg.member_id || prevMsg.is_system);
          const showName = showAvatar;
          const reactions = groupedReactions(msg);

          if (isSystem) {
            return (
              <div key={msg.id} style={{ textAlign: "center", padding: "6px 0" }}>
                <span style={{ fontSize: 11, color: T.textLight, background: T.bg, padding: "3px 12px", borderRadius: 99 }}>
                  {msg.content}
                </span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", marginBottom: 2 }}
              onMouseEnter={() => setHoveredMsg(msg.id)}
              onMouseLeave={() => setHoveredMsg(null)}
            >
              {showName && !isMe && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, marginLeft: 42 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{msg.member?.agent_name}</span>
                  <span style={{ fontSize: 9, color: T.textLight }}>{timeAgo(msg.created_at)}</span>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flexDirection: isMe ? "row-reverse" : "row" }}>
                {!isMe && (
                  <div style={{ width: 32, flexShrink: 0 }}>
                    {showAvatar && msg.member && <Avatar member={msg.member} size={32} />}
                  </div>
                )}
                <div style={{ position: "relative" }}>
                  <div style={{
                    maxWidth: 440, padding: "9px 13px", borderRadius: 14,
                    borderBottomRightRadius: isMe ? 4 : 14,
                    borderBottomLeftRadius: isMe ? 14 : 4,
                    background: isMe ? T.main : "#fff",
                    border: isMe ? "none" : `1px solid ${T.border}`,
                    color: isMe ? "#fff" : T.text,
                    fontSize: 13, lineHeight: 1.5,
                  }}>
                    {msg.content}
                    {isMe && (
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", marginTop: 3, textAlign: "right" }}>
                        {timeAgo(msg.created_at)}
                      </div>
                    )}
                  </div>
                  {Object.keys(reactions).length > 0 && (
                    <div style={{ display: "flex", gap: 4, marginTop: 4, justifyContent: isMe ? "flex-end" : "flex-start" }}>
                      {Object.entries(reactions).map(([emoji, count]) => (
                        <span
                          key={emoji}
                          style={{ fontSize: 11, background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 99, padding: "1px 6px", cursor: "pointer" }}
                          onClick={() => addReaction(msg.id, emoji)}
                        >
                          {emoji} {count}
                        </span>
                      ))}
                    </div>
                  )}

                  {hoveredMsg === msg.id && (
                    <div style={{
                      position: "absolute", top: -28, [isMe ? "right" : "left"]: 0,
                      display: "flex", gap: 2, background: T.bgCard, borderRadius: 99,
                      padding: "3px 6px", border: `1px solid ${T.border}`,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)", zIndex: 10,
                    }}>
                      {REACTIONS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => addReaction(msg.id, emoji)}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: "0 2px", transition: "transform 0.1s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.3)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{
        padding: "12px 20px", borderTop: `1px solid ${T.border}`, background: T.bgCard,
        display: "flex", gap: 10, alignItems: "center",
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder={t("team_chat.placeholder", "Écrivez un message... (@nom pour mentionner)")}
          style={{
            flex: 1, height: 42, borderRadius: 12, border: `1.5px solid ${T.border}`,
            padding: "0 14px", fontSize: 13, fontFamily: "inherit", outline: "none",
            background: T.bg,
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          style={{
            width: 42, height: 42, borderRadius: 12, border: "none",
            background: input.trim() ? T.main : "#e5e7eb",
            color: input.trim() ? "#fff" : T.textLight,
            cursor: input.trim() ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
            transition: "all 0.15s",
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
