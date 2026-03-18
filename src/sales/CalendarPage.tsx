import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import {
  CalendarView, CalendarEvent, CalendarFilters, EventLabel, DEFAULT_LABELS,
} from "./calendar/calendarTypes";
import {
  fmtMonthYear, addMonths, addWeeks, addDays,
  startOfWeek, isSameDay, filterEvents,
} from "./calendar/calendarUtils";
import CalendarSidebar from "./calendar/CalendarSidebar";
import MonthView from "./calendar/MonthView";
import WeekView from "./calendar/WeekView";
import AgendaView from "./calendar/AgendaView";
import EventModal from "./calendar/EventModal";
import EventDetailModal from "./calendar/EventDetailModal";
import { T } from "../theme";

const VIEWS: { key: CalendarView; label: string }[] = [
  { key: "month", label: "Mois" },
  { key: "week", label: "Semaine" },
  { key: "day", label: "Jour" },
  { key: "agenda", label: "Agenda" },
];

function GoogleConnectModal({ onConnect, onClose }: { onConnect: () => void; onClose: () => void }) {
  const [step, setStep] = useState<"prompt" | "connecting" | "done">("prompt");

  const handleConnect = () => {
    setStep("connecting");
    setTimeout(() => {
      setStep("done");
      setTimeout(() => { onConnect(); onClose(); }, 1000);
    }, 2000);
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(230,228,224,0.85)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={step === "prompt" ? onClose : undefined}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: T.bgCard, borderRadius: 16, padding: "32px", maxWidth: 380, width: "100%", textAlign: "center", boxShadow: "0 24px 80px rgba(0,0,0,0.2)" }}
      >
        {step === "prompt" && (
          <>
            <div style={{ fontSize: 36, marginBottom: 14 }}>
              <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M44.5 20H24v8.5h11.7C34.3 33.1 29.7 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l6.1-6.1C34.5 5.9 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-7.7 19.7-20 0-1.3-.1-2.7-.2-4z"/>
                <path fill="#34A853" d="M6.3 14.7l6.8 5C15 16 19.2 13 24 13c3.1 0 5.8 1.1 7.9 3l6.1-6.1C34.5 5.9 29.6 4 24 4c-7.8 0-14.5 4.3-17.7 10.7z"/>
                <path fill="#FBBC05" d="M24 44c5.5 0 10.4-1.9 14.2-5l-6.6-5.4C29.7 35.4 27 36.3 24 36.3c-5.6 0-10.4-3.5-12.2-8.5l-6.9 5.3C8.2 39.5 15.5 44 24 44z"/>
                <path fill="#EA4335" d="M44.5 20H24v8.5h11.7c-.8 2.1-2.2 3.9-4 5.1l6.6 5.4C42 35.9 44.7 30.4 44.7 24c0-1.3-.1-2.7-.2-4z"/>
              </svg>
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 800, color: T.text }}>Connecter Google Calendar</h3>
            <p style={{ fontSize: 13, color: T.textLight, margin: "0 0 20px", lineHeight: 1.5 }}>
              Synchronisez vos événements Google Calendar avec la plateforme Uniflex pour une vue unifiée de votre agenda.
            </p>
            <button
              onClick={handleConnect}
              style={{
                width: "100%", padding: "12px", borderRadius: 10, border: "none",
                background: "#4285F4", color: "#fff", fontSize: 14, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Autoriser l'accès Google Calendar
            </button>
            <button
              onClick={onClose}
              style={{ marginTop: 10, width: "100%", padding: "10px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.bgCard, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}
            >
              Annuler
            </button>
          </>
        )}
        {step === "connecting" && (
          <>
            <div style={{ fontSize: 40, marginBottom: 14 }}>⏳</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: T.text }}>Connexion à Google Calendar...</h3>
            <p style={{ fontSize: 13, color: T.textLight }}>Authentification en cours, veuillez patienter.</p>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                border: `3px solid ${T.bg}`, borderTop: `3px solid #4285F4`,
                animation: "spin 0.8s linear infinite",
              }} />
            </div>
          </>
        )}
        {step === "done" && (
          <>
            <div style={{ fontSize: 40, marginBottom: 14 }}>✅</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "#16a34a" }}>Google Calendar connecté !</h3>
            <p style={{ fontSize: 13, color: T.textLight }}>Vos événements Google seront affichés sur votre calendrier.</p>
          </>
        )}
      </div>
    </div>
  );
}

function crmReminderToEvent(reminder: {
  id: string; title: string; reminder_at: string;
  notes: string; assigned_agent_name: string; lead_id?: string; lead_name?: string;
}): CalendarEvent {
  const start = new Date(reminder.reminder_at);
  const end = new Date(start.getTime() + 30 * 60000);
  return {
    id: `crm_${reminder.id}`,
    title: reminder.title,
    description: reminder.notes || "",
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    all_day: false,
    label: "crm",
    label_color: T.main,
    location: "",
    event_link: "",
    importance: "Normale",
    lead_id: reminder.lead_id ?? null,
    lead_name: reminder.lead_name,
    reminder_minutes: null,
    recurrence: "Aucune",
    visibility: "public",
    sync_google: false,
    source: "crm_reminder",
    google_event_id: null,
    created_by: reminder.assigned_agent_name,
    created_at: reminder.reminder_at,
    updated_at: reminder.reminder_at,
  };
}

const MOCK_GOOGLE_EVENTS: Omit<CalendarEvent, "id" | "created_at" | "updated_at">[] = [
  {
    title: "Réunion d'équipe Google",
    description: "Weekly team sync",
    start_at: (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d.toISOString(); })(),
    end_at: (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(11, 0, 0, 0); return d.toISOString(); })(),
    all_day: false,
    label: "bleu",
    label_color: "#4285F4",
    location: "Google Meet",
    event_link: "https://meet.google.com/abc-defg-hij",
    importance: "Normale",
    lead_id: null,
    reminder_minutes: 15,
    recurrence: "Aucune",
    visibility: "public",
    sync_google: true,
    source: "google",
    google_event_id: "google_evt_1",
    created_by: "Google Calendar",
  },
];

export default function CalendarPage() {
  const { profile, realProfile } = useAuth();
  const ownerId = realProfile?.id ?? profile?.id ?? null;
  const [view, setView] = useState<CalendarView>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [crmEvents, setCrmEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>();
  const [defaultHour, setDefaultHour] = useState<number | undefined>();
  const [customLabels] = useState<EventLabel[]>([]);
  const [filters, setFilters] = useState<CalendarFilters>({
    labels: {},
    showGoogle: true,
    showCRM: true,
    showUniflexCal: true,
  });

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("calendar_events")
        .select("*")
        .order("start_at", { ascending: true });
      if (ownerId) q = q.eq("owner_id", ownerId);
      const { data, error } = await q;
      if (!error && data) setEvents(data as CalendarEvent[]);

      const { data: reminders } = await supabase
        .from("crm_reminders")
        .select("id, title, reminder_at, notes, assigned_agent_name, lead_id, completed")
        .eq("completed", false)
        .order("reminder_at", { ascending: true });
      if (reminders) {
        const evts = reminders.map((r: {
          id: string; title: string; reminder_at: string;
          notes: string; assigned_agent_name: string; lead_id?: string;
        }) => crmReminderToEvent(r));
        setCrmEvents(evts);
      }
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const allEvents: CalendarEvent[] = [
    ...events,
    ...crmEvents,
    ...(googleConnected ? MOCK_GOOGLE_EVENTS.map((ev, i) => ({ ...ev, id: `g_${i}`, created_at: ev.start_at, updated_at: ev.start_at })) : []),
  ];

  const visibleEvents = filterEvents(allEvents, filters);

  const navigatePrev = () => {
    if (view === "month") setCurrentDate(d => addMonths(d, -1));
    else if (view === "week") setCurrentDate(d => addWeeks(d, -1));
    else if (view === "day") setCurrentDate(d => addDays(d, -1));
    else setCurrentDate(d => addMonths(d, -1));
  };
  const navigateNext = () => {
    if (view === "month") setCurrentDate(d => addMonths(d, 1));
    else if (view === "week") setCurrentDate(d => addWeeks(d, 1));
    else if (view === "day") setCurrentDate(d => addDays(d, 1));
    else setCurrentDate(d => addMonths(d, 1));
  };

  const getHeaderTitle = () => {
    if (view === "month" || view === "agenda") return fmtMonthYear(currentDate);
    if (view === "day") {
      const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
      return `${days[currentDate.getDay()]} ${currentDate.getDate()} ${fmtMonthYear(currentDate)}`;
    }
    const weekStart = startOfWeek(currentDate);
    const weekEnd = addDays(weekStart, 6);
    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `${weekStart.getDate()} – ${weekEnd.getDate()} ${fmtMonthYear(weekStart)}`;
    }
    return `${weekStart.getDate()} ${fmtMonthYear(weekStart)} – ${weekEnd.getDate()} ${fmtMonthYear(weekEnd)}`;
  };

  const handleDayClick = (date: Date) => {
    if (view === "month") {
      if (!isSameDay(date, currentDate)) {
        setCurrentDate(date);
        setSelectedDate(date);
      } else {
        setDefaultDate(date);
        setDefaultHour(undefined);
        setEditEvent(null);
        setShowEventModal(true);
      }
    } else {
      setCurrentDate(date);
      setSelectedDate(date);
      setView("day");
    }
  };

  const handleSlotClick = (date: Date, hour?: number) => {
    setDefaultDate(date);
    setDefaultHour(hour);
    setEditEvent(null);
    setShowEventModal(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setDetailEvent(event);
  };

  const handleSaveEvent = async (eventData: Omit<CalendarEvent, "id" | "created_at" | "updated_at">) => {
    if (editEvent) {
      const { data, error } = await supabase
        .from("calendar_events")
        .update({ ...eventData, updated_at: new Date().toISOString() })
        .eq("id", editEvent.id)
        .select()
        .maybeSingle();
      if (!error && data) {
        setEvents(prev => prev.map(e => e.id === editEvent.id ? data as CalendarEvent : e));
      }
    } else {
      const { data, error } = await supabase
        .from("calendar_events")
        .insert({ ...eventData, owner_id: ownerId })
        .select()
        .maybeSingle();
      if (!error && data) {
        setEvents(prev => [...prev, data as CalendarEvent]);
      }
    }
    setShowEventModal(false);
    setEditEvent(null);
  };

  const handleDeleteEvent = async () => {
    if (!detailEvent || detailEvent.source !== "uniflex") return;
    await supabase.from("calendar_events").delete().eq("id", detailEvent.id);
    setEvents(prev => prev.filter(e => e.id !== detailEvent.id));
    setDetailEvent(null);
  };

  const handleDuplicateEvent = () => {
    if (!detailEvent) return;
    const start = new Date(detailEvent.start_at);
    const end = new Date(detailEvent.end_at);
    start.setDate(start.getDate() + 1);
    end.setDate(end.getDate() + 1);
    setEditEvent(null);
    setDefaultDate(start);
    setShowEventModal(true);
    setDetailEvent(null);
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setCurrentDate(date);
    if (view === "month") setView("day");
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: T.bg, fontFamily: "system-ui, -apple-system, sans-serif", overflow: "hidden" }}>
      <style>{`
        @keyframes breathe { 0%, 100% { box-shadow: 0 0 0 0 ${T.main}40; } 50% { box-shadow: 0 0 0 8px ${T.main}00; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div style={{
        padding: "12px 20px", background: T.bgCard, borderBottom: `1px solid ${T.border}`,
        display: "flex", alignItems: "center", gap: 12, flexShrink: 0, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={navigatePrev}
            style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ‹
          </button>
          <button
            onClick={navigateNext}
            style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ›
          </button>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text, minWidth: 180 }}>
            {getHeaderTitle()}
          </h1>
        </div>

        <button
          onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }}
          style={{
            padding: "6px 14px", borderRadius: 8, border: `1px solid ${T.border}`,
            background: T.bgCard, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: T.text,
          }}
        >
          Aujourd'hui
        </button>

        <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", border: `1px solid ${T.border}`, flexShrink: 0 }}>
          {VIEWS.map(v => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              style={{
                padding: "6px 14px", border: "none", cursor: "pointer",
                background: view === v.key ? T.main : "#fff",
                color: view === v.key ? "#fff" : T.text,
                fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                borderRight: v.key !== "agenda" ? `1px solid ${T.border}` : "none",
                transition: "all 0.15s",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {googleConnected ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 14 }}>✅</span> Google Calendar connecté
              </div>
              <button
                onClick={() => setGoogleConnected(false)}
                style={{ fontSize: 11, color: T.textLight, background: "none", border: `1px solid ${T.border}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit" }}
              >
                Déconnecter
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowGoogleModal(true)}
              style={{
                padding: "7px 14px", borderRadius: 10, border: `1px solid ${T.border}`,
                background: T.bgCard, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: T.text,
                display: "flex", alignItems: "center", gap: 7,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M44.5 20H24v8.5h11.7C34.3 33.1 29.7 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l6.1-6.1C34.5 5.9 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-7.7 19.7-20 0-1.3-.1-2.7-.2-4z"/>
              </svg>
              Connecter Google Calendar
            </button>
          )}

          <button
            onClick={() => { setEditEvent(null); setDefaultDate(new Date()); setDefaultHour(undefined); setShowEventModal(true); }}
            style={{
              padding: "8px 18px", borderRadius: 10, border: "none",
              background: T.main, color: "#fff", cursor: "pointer",
              fontFamily: "inherit", fontSize: 13, fontWeight: 800,
              animation: "breathe 2.5s ease-in-out infinite",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          >
            + NOUVEL ÉVÉNEMENT
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <CalendarSidebar
          currentDate={currentDate}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          filters={filters}
          onFiltersChange={setFilters}
          googleConnected={googleConnected}
          customLabels={customLabels}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(v => !v)}
        />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: T.bgCard }}>
          {loading && (
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${T.main}, transparent)`, animation: "spin 1.5s linear infinite", zIndex: 10 }} />
          )}

          {view === "month" && (
            <MonthView
              currentDate={currentDate}
              events={visibleEvents}
              onDayClick={handleDayClick}
              onEventClick={handleEventClick}
            />
          )}

          {view === "week" && (
            <WeekView
              currentDate={currentDate}
              events={visibleEvents}
              onSlotClick={handleSlotClick}
              onEventClick={handleEventClick}
            />
          )}

          {view === "day" && (
            <WeekView
              currentDate={currentDate}
              events={visibleEvents}
              onSlotClick={handleSlotClick}
              onEventClick={handleEventClick}
              singleDay
            />
          )}

          {view === "agenda" && (
            <AgendaView
              events={visibleEvents}
              onEventClick={handleEventClick}
            />
          )}
        </div>
      </div>

      {showGoogleModal && (
        <GoogleConnectModal
          onConnect={() => setGoogleConnected(true)}
          onClose={() => setShowGoogleModal(false)}
        />
      )}

      {showEventModal && (
        <EventModal
          defaultDate={defaultDate}
          defaultHour={defaultHour}
          editEvent={editEvent}
          customLabels={customLabels}
          onSave={handleSaveEvent}
          onClose={() => { setShowEventModal(false); setEditEvent(null); }}
        />
      )}

      {detailEvent && (
        <EventDetailModal
          event={detailEvent}
          customLabels={customLabels}
          onEdit={() => {
            setEditEvent(detailEvent);
            setDetailEvent(null);
            setShowEventModal(true);
          }}
          onDuplicate={handleDuplicateEvent}
          onDelete={handleDeleteEvent}
          onClose={() => setDetailEvent(null)}
        />
      )}
    </div>
  );
}
