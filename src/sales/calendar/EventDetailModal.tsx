import React, { useState } from "react";
import { T } from "../../theme";
import { CalendarEvent, DEFAULT_LABELS, EventLabel, REMINDER_OPTIONS } from "./calendarTypes";
import { MONTHS_FR, DAYS_FR, getLabelColor } from "./calendarUtils";

function formatEventDate(event: CalendarEvent): string {
  const start = new Date(event.start_at);
  const end = new Date(event.end_at);
  const dayFr = DAYS_FR[(start.getDay() + 6) % 7];
  const dateStr = `${dayFr} ${start.getDate()} ${MONTHS_FR[start.getMonth()]} ${start.getFullYear()}`;
  if (event.all_day) {
    const isSameDay = start.toDateString() === end.toDateString();
    if (isSameDay) return `${dateStr} — Journée entière`;
    const endStr = `${end.getDate()} ${MONTHS_FR[end.getMonth()]}`;
    return `Du ${start.getDate()} ${MONTHS_FR[start.getMonth()]} au ${endStr} — Journée entière`;
  }
  const startTime = start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const endTime = end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${dateStr}, ${startTime} → ${endTime}`;
}

function getReminderLabel(minutes?: number | null): string {
  if (minutes === null || minutes === undefined) return "Aucun";
  return REMINDER_OPTIONS.find(r => r.value === minutes)?.label ?? `${minutes} min avant`;
}

interface Props {
  event: CalendarEvent;
  customLabels?: EventLabel[];
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function EventDetailModal({ event, customLabels = [], onEdit, onDuplicate, onDelete, onClose }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const allLabels = [...DEFAULT_LABELS, ...customLabels];
  const color = getLabelColor(event.label, event.label_color);
  const labelName = allLabels.find(l => l.key === event.label)?.name ?? event.label;
  const isGoogle = event.source === "google";
  const isCRM = event.source === "crm_reminder";

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", overflow: "auto" }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: T.bgCard, borderRadius: 16, width: "100%", maxWidth: 520, boxShadow: "0 24px 80px rgba(0,0,0,0.2)" }}
      >
        <div style={{
          padding: "18px 20px 14px",
          background: `${color}12`,
          borderRadius: "16px 16px 0 0",
          borderBottom: `3px solid ${color}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                <div style={{
                  fontSize: 9, fontWeight: 800, background: color, color: "#fff",
                  borderRadius: 4, padding: "2px 8px", textTransform: "uppercase", letterSpacing: 0.5,
                }}>
                  {labelName}
                </div>
                {event.importance === "Haute" && (
                  <div style={{ fontSize: 9, fontWeight: 800, background: T.red, color: "#fff", borderRadius: 4, padding: "2px 8px" }}>
                    ▲ URGENT
                  </div>
                )}
                {isGoogle && (
                  <div style={{ fontSize: 9, fontWeight: 800, background: "#ea4335", color: "#fff", borderRadius: 4, padding: "2px 8px" }}>
                    G GOOGLE
                  </div>
                )}
                {isCRM && (
                  <div style={{ fontSize: 9, fontWeight: 800, background: T.main, color: "#fff", borderRadius: 4, padding: "2px 8px" }}>
                    CRM
                  </div>
                )}
              </div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text, lineHeight: 1.2 }}>
                {event.title}
              </h2>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: T.textLight, padding: "0 0 0 12px", flexShrink: 0 }}>
              ✕
            </button>
          </div>
        </div>

        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14, maxHeight: "60vh", overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 15, flexShrink: 0 }}>🗓</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{formatEventDate(event)}</div>
              {event.recurrence !== "Aucune" && (
                <div style={{ fontSize: 11, color: T.textLight, marginTop: 2 }}>
                  Récurrence : {event.recurrence}
                  {event.recurrence_end ? ` jusqu'au ${new Date(event.recurrence_end).toLocaleDateString("fr-FR")}` : " (sans fin)"}
                </div>
              )}
            </div>
          </div>

          {event.location && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>📍</span>
              <div>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(event.location)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 13, color: T.main, fontWeight: 500, textDecoration: "none" }}
                >
                  {event.location}
                </a>
                <div style={{ fontSize: 10, color: T.textLight }}>Ouvrir dans Google Maps</div>
              </div>
            </div>
          )}

          {event.event_link && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 15 }}>🔗</span>
              <a
                href={event.event_link}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: 13, color: "#fff", background: T.main, fontWeight: 700,
                  padding: "6px 14px", borderRadius: 8, textDecoration: "none",
                  display: "inline-block",
                }}
              >
                Ouvrir le lien
              </a>
            </div>
          )}

          {event.description && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>📝</span>
              <div style={{ fontSize: 13, color: T.textMid, lineHeight: 1.6, whiteSpace: "pre-line" }}>
                {event.description}
              </div>
            </div>
          )}

          {event.lead_name && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 15 }}>👤</span>
              <div style={{ fontSize: 13, color: T.main, fontWeight: 600 }}>
                Lead : {event.lead_name}
              </div>
            </div>
          )}

          {event.client_name && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 15 }}>🏢</span>
              <div style={{ fontSize: 13, color: T.main, fontWeight: 600 }}>
                Client : {event.client_name}
              </div>
            </div>
          )}

          {event.reminder_minutes !== null && event.reminder_minutes !== undefined && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 15 }}>🔔</span>
              <div style={{ fontSize: 13, color: T.textMid }}>
                Rappel : {getReminderLabel(event.reminder_minutes)}
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 15 }}>👁</span>
            <div style={{ fontSize: 13, color: T.textMid }}>
              {event.visibility === "public" ? "Visible par tous" : "Privé"}
            </div>
          </div>
        </div>

        <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, background: "#fafafa", borderRadius: "0 0 16px 16px" }}>
          {confirmDelete ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
              <span style={{ fontSize: 12, color: T.red, fontWeight: 600 }}>Supprimer cet événement ?</span>
              <button
                onClick={onDelete}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: T.red, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}
              >
                Confirmer
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}
              >
                Annuler
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              {!isGoogle && !isCRM && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${T.red}40`, background: T.bgCard, color: T.red, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600 }}
                >
                  Supprimer
                </button>
              )}
              {!isGoogle && (
                <button
                  onClick={onDuplicate}
                  style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}
                >
                  Dupliquer
                </button>
              )}
              {!isGoogle && !isCRM && (
                <button
                  onClick={onEdit}
                  style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: T.main, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}
                >
                  Modifier
                </button>
              )}
              {isGoogle && (
                <div style={{ fontSize: 11, color: T.textLight, padding: "8px 0" }}>
                  Événement Google Calendar — lecture seule
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
