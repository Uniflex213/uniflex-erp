import React, { useState, useEffect } from "react";
import { T } from "../../theme";
import { useCurrentAgent } from "../../hooks/useCurrentAgent";
import { CalendarEvent, DEFAULT_LABELS, EventLabel, REMINDER_OPTIONS, RECURRENCE_OPTIONS } from "./calendarTypes";
import { getLabelColor } from "./calendarUtils";

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: T.textLight, display: "block", marginBottom: 5 }}>
        {label} {required && <span style={{ color: T.red }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", height: 36, borderRadius: 8, border: `1px solid ${T.border}`,
  padding: "0 10px", fontSize: 13, fontFamily: "inherit", background: T.bgCard,
  boxSizing: "border-box", outline: "none",
};

interface Props {
  defaultDate?: Date;
  defaultHour?: number;
  editEvent?: CalendarEvent | null;
  customLabels?: EventLabel[];
  onSave: (event: Omit<CalendarEvent, "id" | "created_at" | "updated_at">) => void;
  onClose: () => void;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}
function nowTimeStr(offsetH = 0) {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + offsetH);
  return d.toTimeString().slice(0, 5);
}

export default function EventModal({ defaultDate, defaultHour, editEvent, customLabels = [], onSave, onClose }: Props) {
  const agent = useCurrentAgent();
  const allLabels = [...DEFAULT_LABELS, ...customLabels];
  const defaultDateStr = defaultDate ? defaultDate.toISOString().split("T")[0] : todayStr();
  const defaultStartTime = defaultHour !== undefined ? `${String(defaultHour).padStart(2, "0")}:00` : nowTimeStr(0);
  const defaultEndTime = defaultHour !== undefined ? `${String(defaultHour + 1).padStart(2, "0")}:00` : nowTimeStr(1);

  const [title, setTitle] = useState(editEvent?.title ?? "");
  const [startDate, setStartDate] = useState(editEvent ? editEvent.start_at.split("T")[0] : defaultDateStr);
  const [startTime, setStartTime] = useState(editEvent ? editEvent.start_at.slice(11, 16) : defaultStartTime);
  const [endDate, setEndDate] = useState(editEvent ? editEvent.end_at.split("T")[0] : defaultDateStr);
  const [endTime, setEndTime] = useState(editEvent ? editEvent.end_at.slice(11, 16) : defaultEndTime);
  const [allDay, setAllDay] = useState(editEvent?.all_day ?? false);
  const [label, setLabel] = useState(editEvent?.label ?? "bleu");
  const [location, setLocation] = useState(editEvent?.location ?? "");
  const [eventLink, setEventLink] = useState(editEvent?.event_link ?? "");
  const [description, setDescription] = useState(editEvent?.description ?? "");
  const [importance, setImportance] = useState<"Haute" | "Normale" | "Basse">(editEvent?.importance ?? "Normale");
  const [reminder, setReminder] = useState<number | null>(editEvent?.reminder_minutes ?? null);
  const [recurrence, setRecurrence] = useState(editEvent?.recurrence ?? "Aucune");
  const [recurrenceEnd, setRecurrenceEnd] = useState(editEvent?.recurrence_end ?? "");
  const [visibility, setVisibility] = useState<"public" | "private">(editEvent?.visibility ?? "public");
  const [syncGoogle, setSyncGoogle] = useState(editEvent?.sync_google ?? false);
  const [submitting, setSubmitting] = useState(false);

  const canSave = title.trim().length > 0;

  const handleSave = async () => {
    if (!canSave || submitting) return;
    setSubmitting(true);

    const startAt = allDay
      ? `${startDate}T00:00:00.000Z`
      : new Date(`${startDate}T${startTime}:00`).toISOString();
    const endAt = allDay
      ? `${endDate}T23:59:59.000Z`
      : new Date(`${endDate}T${endTime}:00`).toISOString();

    const color = getLabelColor(label, allLabels.find(l => l.key === label)?.color);

    onSave({
      title: title.trim(),
      description,
      start_at: startAt,
      end_at: endAt,
      all_day: allDay,
      label,
      label_color: color,
      location,
      event_link: eventLink,
      importance,
      lead_id: editEvent?.lead_id ?? null,
      lead_name: editEvent?.lead_name,
      client_id: editEvent?.client_id ?? null,
      client_name: editEvent?.client_name,
      reminder_minutes: reminder,
      recurrence,
      recurrence_end: recurrenceEnd || null,
      visibility,
      sync_google: syncGoogle,
      source: "uniflex",
      google_event_id: null,
      created_by: agent.name,
    });
    setSubmitting(false);
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", overflow: "auto" }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: T.bgCard, borderRadius: 16, width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}
      >
        <div style={{
          padding: "18px 24px", borderBottom: `1px solid ${T.border}`,
          background: `linear-gradient(135deg, ${T.main}08 0%, #fff 100%)`,
          borderRadius: "16px 16px 0 0",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text }}>
            {editEvent ? "Modifier l'événement" : "Nouvel événement"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: T.textLight }}>✕</button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, maxHeight: "calc(90vh - 130px)", overflowY: "auto" }}>
          <Field label="Titre" required>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Titre de l'événement"
              autoFocus
              style={{ ...inputStyle, fontSize: 14, fontWeight: 600, borderColor: title ? T.main : T.border }}
            />
          </Field>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: T.text }}>
              <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} style={{ width: 16, height: 16 }} />
              Journée entière
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Date de début" required>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
            </Field>
            {!allDay && (
              <Field label="Heure de début" required>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inputStyle} />
              </Field>
            )}
            <Field label="Date de fin" required>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
            </Field>
            {!allDay && (
              <Field label="Heure de fin" required>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={inputStyle} />
              </Field>
            )}
          </div>

          <Field label="Label de couleur">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {allLabels.map(l => (
                <button
                  key={l.key}
                  onClick={() => setLabel(l.key)}
                  title={l.name}
                  style={{
                    width: 26, height: 26, borderRadius: "50%", border: label === l.key ? `3px solid ${T.text}` : "2px solid transparent",
                    background: l.color, cursor: "pointer",
                    transform: label === l.key ? "scale(1.2)" : "scale(1)",
                    transition: "all 0.15s",
                    outline: label === l.key ? `2px solid ${l.color}` : "none",
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
            <div style={{ fontSize: 10, color: T.textLight, marginTop: 4 }}>
              Sélectionné : {allLabels.find(l => l.key === label)?.name}
            </div>
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Importance">
              <div style={{ display: "flex", gap: 6 }}>
                {(["Haute", "Normale", "Basse"] as const).map(imp => (
                  <button
                    key={imp}
                    onClick={() => setImportance(imp)}
                    style={{
                      flex: 1, padding: "7px 4px", borderRadius: 8, border: `1.5px solid ${importance === imp ? (imp === "Haute" ? T.red : imp === "Normale" ? T.main : T.textLight) : T.border}`,
                      background: importance === imp ? (imp === "Haute" ? "#fef2f2" : imp === "Normale" ? `${T.main}10` : T.bg) : "#fff",
                      color: importance === imp ? (imp === "Haute" ? T.red : imp === "Normale" ? T.main : T.textLight) : T.textLight,
                      cursor: "pointer", fontFamily: "inherit", fontSize: 10, fontWeight: 700,
                    }}
                  >
                    {imp === "Haute" ? "▲ Haute" : imp === "Normale" ? "— Normale" : "▼ Basse"}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Rappel">
              <select value={reminder ?? ""} onChange={e => setReminder(e.target.value === "" ? null : Number(e.target.value))} style={inputStyle}>
                {REMINDER_OPTIONS.map(r => (
                  <option key={r.label} value={r.value ?? ""}>{r.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Lieu">
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Adresse ou lieu" style={inputStyle} />
          </Field>

          <Field label="Lien (Zoom, Google Meet, document...)">
            <input value={eventLink} onChange={e => setEventLink(e.target.value)} placeholder="https://..." style={inputStyle} type="url" />
          </Field>

          <Field label="Description">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Détails, notes..."
              style={{
                width: "100%", height: 80, padding: 10, borderRadius: 8, border: `1px solid ${T.border}`,
                fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box",
              }}
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Récurrence">
              <select value={recurrence} onChange={e => setRecurrence(e.target.value)} style={inputStyle}>
                {RECURRENCE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            {recurrence !== "Aucune" && (
              <Field label="Fin de récurrence">
                <input type="date" value={recurrenceEnd} onChange={e => setRecurrenceEnd(e.target.value)} placeholder="Jamais" style={inputStyle} />
              </Field>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Visibilité">
              <select value={visibility} onChange={e => setVisibility(e.target.value as "public" | "private")} style={inputStyle}>
                <option value="public">Visible par tous</option>
                <option value="private">Privé</option>
              </select>
            </Field>
            <Field label="Synchronisation">
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", height: 36 }}>
                <input type="checkbox" checked={syncGoogle} onChange={e => setSyncGoogle(e.target.checked)} style={{ width: 16, height: 16 }} />
                <span style={{ fontSize: 13 }}>Sync Google Calendar</span>
              </label>
            </Field>
          </div>
        </div>

        <div style={{ padding: "14px 24px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 10, justifyContent: "flex-end", background: "#fafafa", borderRadius: "0 0 16px 16px" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || submitting}
            style={{
              padding: "10px 22px", borderRadius: 8, border: "none",
              background: canSave ? T.main : "#e5e7eb",
              color: canSave ? "#fff" : T.textLight,
              cursor: canSave ? "pointer" : "not-allowed",
              fontFamily: "inherit", fontSize: 13, fontWeight: 800,
            }}
          >
            {submitting ? "Enregistrement..." : editEvent ? "Enregistrer les modifications" : "Créer l'événement"}
          </button>
        </div>
      </div>
    </div>
  );
}
