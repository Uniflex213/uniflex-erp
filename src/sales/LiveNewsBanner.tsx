import React, { useState, useEffect, useRef, useMemo } from "react";
import { CRMLead, CRMReminder } from "./crmTypes";
import { SampleRequest } from "./sampleTypes";

interface NewsItem {
  text: string;
  category: "samples" | "leads" | "deals" | "reminders" | "objectives" | "info";
  priority: number;
  leadId?: string;
  page?: string;
}

interface Props {
  leads: CRMLead[];
  samples: SampleRequest[];
  onNavigate?: (page: string) => void;
}

const CATEGORY_COLORS: Record<NewsItem["category"], string> = {
  samples: "#d4a017",
  deals: "#22c55e",
  leads: "#60a5fa",
  reminders: "#f59e0b",
  objectives: "#a78bfa",
  info: "#9ca3af",
};

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function hoursSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
}

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 0 }).format(n);

export default function LiveNewsBanner({ leads, samples, onNavigate }: Props) {
  const [paused, setPaused] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);

  const now = new Date();

  const messages = useMemo<NewsItem[]>(() => {
    const items: NewsItem[] = [];

    const followUpExpired = samples.filter(s =>
      (s.status === "Follow-up requis") ||
      (s.status === "Livré" && s.timer_expires_at && new Date(s.timer_expires_at) < now)
    );
    if (followUpExpired.length > 0) {
      const urgent = followUpExpired[0];
      const urgentLead = leads.find(l => l.id === urgent.lead_id);
      items.push({
        text: `⚠️ ${followUpExpired.length} sample${followUpExpired.length > 1 ? "s" : ""} en attente de follow-up${urgentLead ? ` — Plus urgent : ${urgentLead.company_name}` : ""}`,
        category: "samples",
        priority: 1,
        leadId: urgent.lead_id,
        page: "admin_samples",
      });
    }

    const pendingSince24h = samples.filter(s =>
      s.status === "En attente d'approbation" && hoursSince(s.created_at) >= 24
    );
    if (pendingSince24h.length > 0) {
      const s = pendingSince24h[0];
      const h = hoursSince(s.created_at);
      const lead = leads.find(l => l.id === s.lead_id);
      items.push({
        text: `📦 Demande de sample en attente depuis ${h}h${lead ? ` pour ${lead.company_name}` : ""}`,
        category: "samples",
        priority: 2,
        leadId: s.lead_id,
        page: "admin_samples",
      });
    }

    const deliveredToday = samples.filter(s => {
      if (!s.delivered_at) return false;
      const d = new Date(s.delivered_at);
      return d.toDateString() === now.toDateString();
    });
    if (deliveredToday.length > 0) {
      const s = deliveredToday[0];
      const lead = leads.find(l => l.id === s.lead_id);
      items.push({
        text: `📬 Sample livré pour ${lead?.company_name || "un client"} — Timer 72h activé`,
        category: "samples",
        priority: 8,
        leadId: s.lead_id,
      });
    }

    const recentlyClosedLeads = leads.filter(l =>
      l.stage === "Fermé Gagné" && l.closed_at && daysSince(l.closed_at) <= 7
    );
    recentlyClosedLeads.forEach(l => {
      items.push({
        text: `🎉 ${l.assigned_agent_name} a closé ${l.company_name} pour ${fmt(l.estimated_value || 0)} !`,
        category: "deals",
        priority: 2,
        leadId: l.id,
      });
    });

    const longNegotiation = leads.filter(l =>
      l.stage === "Négociation" && daysSince(l.last_activity_at) > 10
    );
    if (longNegotiation.length > 0) {
      const l = longNegotiation[0];
      items.push({
        text: `⏰ Deal ${l.company_name} en négociation depuis ${daysSince(l.last_activity_at)}j — à accélérer`,
        category: "deals",
        priority: 5,
        leadId: l.id,
      });
    }

    const inactiveLeads = leads.filter(l =>
      !["Fermé Gagné", "Fermé Perdu"].includes(l.stage) &&
      !l.archived &&
      daysSince(l.last_activity_at) > 14
    );
    if (inactiveLeads.length > 0) {
      items.push({
        text: `⚠️ ${inactiveLeads.length} lead${inactiveLeads.length > 1 ? "s" : ""} inactif${inactiveLeads.length > 1 ? "s" : ""} depuis plus de 14 jours — risque de perte`,
        category: "leads",
        priority: 3,
        page: "crm_pipeline",
      });
    }

    const hotInactive = leads.filter(l =>
      l.temperature === "Hot" &&
      !["Fermé Gagné", "Fermé Perdu"].includes(l.stage) &&
      daysSince(l.last_activity_at) >= 3
    );
    if (hotInactive.length > 0) {
      const l = hotInactive[0];
      items.push({
        text: `🔥 Lead Hot ${l.company_name} sans contact depuis ${daysSince(l.last_activity_at)}j`,
        category: "leads",
        priority: 5,
        leadId: l.id,
      });
    }

    const allReminders: CRMReminder[] = leads.flatMap(l => l.reminders || []);
    const overdueReminders = allReminders.filter(r => !r.completed && new Date(r.reminder_at) < now);
    if (overdueReminders.length > 0) {
      items.push({
        text: `🔔 ${overdueReminders.length} rappel${overdueReminders.length > 1 ? "s" : ""} en retard dans l'équipe`,
        category: "reminders",
        priority: 4,
        page: "crm_pipeline",
      });
    }

    const activeLeads = leads.filter(l => !["Fermé Gagné", "Fermé Perdu"].includes(l.stage) && !l.archived);
    const pipelineValue = activeLeads.reduce((s, l) => s + (l.estimated_value || 0), 0);
    const hotCount = activeLeads.filter(l => l.temperature === "Hot").length;

    if (items.length === 0) {
      items.push({
        text: `💪 Aucun follow-up en retard — l'équipe est à jour !`,
        category: "info",
        priority: 99,
      });
    }

    items.push({
      text: `📊 ${activeLeads.length} leads actifs dans le pipeline — valeur totale : ${fmt(pipelineValue)}`,
      category: "info",
      priority: 10,
      page: "crm_pipeline",
    });

    if (hotCount > 0) {
      items.push({
        text: `🔥 ${hotCount} lead${hotCount > 1 ? "s" : ""} Hot en négociation — à closer !`,
        category: "leads",
        priority: 7,
        page: "crm_pipeline",
      });
    }

    return items.sort((a, b) => a.priority - b.priority);
  }, [leads, samples]);

  const tickerText = messages.map(m => `  ·  ${m.text}`).join("    ⬥");

  return (
    <div
      style={{
        height: 40,
        background: "#ffffff",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 12px",
        borderRight: "1px solid rgba(0,0,0,0.06)",
        zIndex: 2,
        background: "#ffffff",
        height: "100%",
      }}>
        <span style={{
          background: "#ef4444",
          color: "#fff",
          fontSize: 10,
          fontWeight: 800,
          padding: "2px 7px",
          borderRadius: 4,
          letterSpacing: 0.5,
          animation: "pulse 2s infinite",
        }}>
          ⚡ LIVE
        </span>
      </div>

      <div style={{ flex: 1, overflow: "hidden", height: "100%", display: "flex", alignItems: "center" }}>
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
        `}</style>
        <div
          ref={tickerRef}
          style={{
            display: "inline-block",
            whiteSpace: "nowrap",
            animation: `marquee ${Math.max(30, tickerText.length * 0.08)}s linear infinite`,
            animationPlayState: paused ? "paused" : "running",
            cursor: "pointer",
          }}
        >
          {messages.map((msg, i) => (
            <span
              key={i}
              onClick={() => {
                if (msg.page && onNavigate) onNavigate(msg.page);
              }}
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: msg.category === "info" ? "rgba(0,0,0,0.45)" : "#111",
                marginRight: 32,
                cursor: msg.page ? "pointer" : "default",
              }}
            >
              <span style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: CATEGORY_COLORS[msg.category],
                marginRight: 8,
                verticalAlign: "middle",
                marginBottom: 1,
              }} />
              {msg.text}
              <span style={{ color: "rgba(0,0,0,0.15)", marginLeft: 32 }}>⬥</span>
            </span>
          ))}
        </div>
      </div>

      <div style={{
        position: "absolute",
        left: 90,
        top: 0,
        bottom: 0,
        width: 40,
        background: "linear-gradient(to right, #ffffff, transparent)",
        pointerEvents: "none",
        zIndex: 1,
      }} />
      <div style={{
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        width: 40,
        background: "linear-gradient(to left, #ffffff, transparent)",
        pointerEvents: "none",
        zIndex: 1,
      }} />
    </div>
  );
}
