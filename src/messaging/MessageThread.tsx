import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { Message, UserProfile, getInitials, ROLE_COLORS, ROLE_LABELS } from "./messagingTypes";
import { T } from "../theme";
import { useLanguage } from "../i18n/LanguageContext";

interface Props {
  conversationId: string;
  currentUser: UserProfile;
  otherUser: UserProfile;
  onMarkRead: () => void;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("fr-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function groupByDate(msgs: Message[]): { date: string; messages: Message[] }[] {
  const groups: Record<string, Message[]> = {};
  for (const m of msgs) {
    const key = new Date(m.created_at).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  }
  return Object.entries(groups).map(([date, messages]) => ({ date, messages }));
}

function fmtDateHeader(dateStr: string, todayLabel: string, yesterdayLabel: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return todayLabel;
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return yesterdayLabel;
  return d.toLocaleDateString("fr-CA", { weekday: "long", month: "long", day: "numeric" });
}

export default function MessageThread({ conversationId, currentUser, otherUser, onMarkRead }: Props) {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setMessages([]);

    supabase
      .from("messages")
      .select("*, sender:profiles!sender_id(id, full_name, role, avatar_url)")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!cancel) {
          setMessages((data as Message[]) ?? []);
          setLoading(false);
        }
      });

    const sub = supabase
      .channel(`messages:${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, async (payload) => {
        const row = payload.new as Message;
        const { data: sender } = await supabase.from("profiles").select("id, full_name, role, avatar_url").eq("id", row.sender_id).maybeSingle();
        setMessages(prev => [...prev, { ...row, sender: sender ?? undefined }]);
        if (row.sender_id !== currentUser.id) onMarkRead();
      })
      .subscribe();

    return () => {
      cancel = true;
      supabase.removeChannel(sub);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    onMarkRead();
  }, [conversationId]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    try {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: currentUser.id,
        content: text,
      });
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const roleC = ROLE_COLORS[otherUser.role] ?? { bg: "#1e2130", color: "#9ca3af" };
  const groups = groupByDate(messages);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg }}>
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10, background: "#16192a", flexShrink: 0 }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: roleC.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: roleC.color, flexShrink: 0 }}>
          {otherUser.avatar_url ? (
            <img src={otherUser.avatar_url} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }} />
          ) : getInitials(otherUser.full_name)}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{otherUser.full_name}</div>
          <div style={{ fontSize: 11, color: T.textMid }}>{ROLE_LABELS[otherUser.role] ?? otherUser.role}{otherUser.job_title ? ` · ${otherUser.job_title}` : ""}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 2 }}>
        {loading ? (
          <div style={{ margin: "auto", color: T.textMid, fontSize: 13 }}>{t("loading_dots")}</div>
        ) : messages.length === 0 ? (
          <div style={{ margin: "auto", textAlign: "center", color: T.textMid, fontSize: 13 }}>
            <div style={{ marginBottom: 8, opacity: 0.5 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            </div>
            {t("msg.start_conversation")} {otherUser.full_name.split(" ")[0]}
          </div>
        ) : (
          groups.map(group => (
            <React.Fragment key={group.date}>
              <div style={{ textAlign: "center", margin: "12px 0 8px" }}>
                <span style={{ fontSize: 11, color: T.textMid, background: "rgba(0,0,0,0.04)", padding: "3px 10px", borderRadius: 10 }}>
                  {fmtDateHeader(group.date, t("msg.today"), t("msg.yesterday"))}
                </span>
              </div>
              {group.messages.map((msg, i) => {
                const isMine = msg.sender_id === currentUser.id;
                const prevMsg = group.messages[i - 1];
                const isGrouped = prevMsg && prevMsg.sender_id === msg.sender_id && new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 300000;

                return (
                  <div key={msg.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", marginTop: isGrouped ? 2 : 8 }}>
                    {!isMine && !isGrouped && (
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: roleC.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: roleC.color, flexShrink: 0, marginRight: 6, alignSelf: "flex-end" }}>
                        {getInitials(otherUser.full_name)}
                      </div>
                    )}
                    {!isMine && isGrouped && <div style={{ width: 32, flexShrink: 0 }} />}
                    <div style={{ maxWidth: "70%" }}>
                      <div style={{
                        background: isMine ? T.bubble : T.bubbleOther,
                        color: T.text, padding: "9px 13px", borderRadius: isMine ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                        fontSize: 13, lineHeight: 1.5, wordBreak: "break-word",
                      }}>
                        {msg.content}
                      </div>
                      {!isGrouped && (
                        <div style={{ fontSize: 10, color: T.textMid, marginTop: 3, textAlign: isMine ? "right" : "left", paddingLeft: isMine ? 0 : 4 }}>
                          {fmtTime(msg.created_at)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "12px 14px", borderTop: `1px solid ${T.border}`, background: "#16192a", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Écrire à ${otherUser.full_name.split(" ")[0]}...`}
            rows={1}
            style={{
              flex: 1, background: T.input, border: `1px solid ${T.inputBorder}`, borderRadius: 10,
              padding: "9px 12px", fontSize: 13, color: T.text, fontFamily: "inherit", outline: "none",
              resize: "none", lineHeight: 1.5, maxHeight: 120, overflowY: "auto",
            }}
            onInput={e => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            style={{
              width: 36, height: 36, borderRadius: 9, background: input.trim() ? T.bubble : "rgba(0,0,0,0.06)",
              border: "none", cursor: input.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center",
              color: input.trim() ? "#fff" : T.textMid, transition: "all 0.15s", flexShrink: 0,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
        <div style={{ fontSize: 10, color: T.textMid, marginTop: 5 }}>{t("msg.enter_to_send")}</div>
      </div>
    </div>
  );
}
