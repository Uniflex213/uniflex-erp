import React, { useState } from "react";
import { useApp } from "../AppContext";
import {
  WidgetId, WidgetVisibility, DEFAULT_WIDGET_VISIBILITY,
  DEFAULT_WIDGET_ORDER, WIDGET_LABELS, WIDGET_ICONS, T,
} from "./workstation/workstationTypes";
import { useCurrentAgent } from "../hooks/useCurrentAgent";

import WidgetShell, { ExpandModal } from "./workstation/WidgetShell";
import WidgetMaJournee from "./workstation/WidgetMaJournee";
import WidgetPipeline from "./workstation/WidgetPipeline";
import WidgetKpis from "./workstation/WidgetKpis";
import WidgetActionsRapides from "./workstation/WidgetActionsRapides";
import WidgetNotes from "./workstation/WidgetNotes";
import WidgetActivite from "./workstation/WidgetActivite";
import WidgetDeals from "./workstation/WidgetDeals";
import WidgetClients from "./workstation/WidgetClients";
import WidgetSamples from "./workstation/WidgetSamples";
import WidgetCalendar from "./workstation/WidgetCalendar";
import WidgetScore from "./workstation/WidgetScore";

import {
  MaJourneeModal,
  PipelineModal,
  KpisModal,
  NotesModal,
  ActiviteModal,
  DealsModal,
  ClientsModal,
  SamplesModal,
  CalendarModal,
  ScoreModal,
} from "./workstation/WorkstationModals";

function loadVisibility(prefKey: string): WidgetVisibility {
  try {
    const s = localStorage.getItem(prefKey);
    if (s) return { ...DEFAULT_WIDGET_VISIBILITY, ...JSON.parse(s) };
  } catch {}
  return { ...DEFAULT_WIDGET_VISIBILITY };
}

function loadOrder(orderKey: string): WidgetId[] {
  try {
    const s = localStorage.getItem(orderKey);
    if (s) {
      const parsed: WidgetId[] = JSON.parse(s);
      const allIds = new Set(DEFAULT_WIDGET_ORDER);
      const valid = parsed.filter(id => allIds.has(id));
      const missing = DEFAULT_WIDGET_ORDER.filter(id => !valid.includes(id));
      return [...valid, ...missing];
    }
  } catch {}
  return [...DEFAULT_WIDGET_ORDER];
}

export default function PersonalWorkstationPage() {
  const agent = useCurrentAgent();
  const { leads, navigate, samples } = useApp();
  const PREF_KEY = `uniflex_workstation_widgets_${agent.id}`;
  const ORDER_KEY = `uniflex_workstation_order_${agent.id}`;
  const mySamples = samples.filter(s => s.agent_id === agent.id);
  const [visibility, setVisibility] = useState<WidgetVisibility>(() => loadVisibility(PREF_KEY));
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(() => loadOrder(ORDER_KEY));
  const [showPersonalize, setShowPersonalize] = useState(false);
  const [expandedWidget, setExpandedWidget] = useState<WidgetId | null>(null);

  const [dragId, setDragId] = useState<WidgetId | null>(null);
  const [dragOverId, setDragOverId] = useState<WidgetId | null>(null);

  const handleOpenLead = (_leadId: string) => { navigate("crm_pipeline"); };

  const toggleWidget = (id: WidgetId) => {
    setVisibility(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(PREF_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, id: WidgetId) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, id: WidgetId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== dragId) setDragOverId(id);
  };

  const handleDragEnd = () => {
    if (dragId && dragOverId && dragId !== dragOverId) {
      const next = [...widgetOrder];
      const fromIdx = next.indexOf(dragId);
      const toIdx = next.indexOf(dragOverId);
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, dragId);
      setWidgetOrder(next);
      try { localStorage.setItem(ORDER_KEY, JSON.stringify(next)); } catch {}
    }
    setDragId(null);
    setDragOverId(null);
  };

  const shellProps = (id: WidgetId) => ({
    id,
    onExpand: () => setExpandedWidget(id),
    isDragging: dragId === id,
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragEnd: handleDragEnd,
    dragOverId,
  });

  const visibleOrder = widgetOrder.filter(id => visibility[id]);

  const renderWidget = (id: WidgetId) => {
    switch (id) {
      case "maJournee":
        return <WidgetMaJournee leads={leads} onOpenLead={handleOpenLead} />;
      case "pipeline":
        return <WidgetPipeline leads={leads} onOpenLead={handleOpenLead} onNavigatePipeline={() => navigate("crm_pipeline")} />;
      case "kpis":
        return <WidgetKpis leads={leads} samples={mySamples} allSamples={samples} />;
      case "actionsRapides":
        return (
          <WidgetActionsRapides
            leads={leads}
            onNavigateNewLead={() => navigate("crm_pipeline")}
            onNavigatePricelist={() => navigate("pricelist_generator")}
            onNavigateOrders={() => navigate("orders")}
          />
        );
      case "notes":
        return <WidgetNotes />;
      case "activite":
        return <WidgetActivite leads={leads} onOpenLead={handleOpenLead} />;
      case "deals":
        return <WidgetDeals leads={leads} onOpenLead={handleOpenLead} />;
      case "clients":
        return <WidgetClients leads={leads} onOpenLead={handleOpenLead} />;
      case "samples":
        return <WidgetSamples leads={leads} samples={mySamples} />;
      case "calendar":
        return <WidgetCalendar leads={leads} />;
      case "score":
        return <WidgetScore leads={leads} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", color: T.text }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h2 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 900, color: T.text }}>
            Personal Workstation
          </h2>
          <p style={{ margin: 0, color: T.textMid, fontSize: 14 }}>
            Votre espace de travail personnel —{" "}
            <span style={{ fontWeight: 700, color: T.main }}>{agent.name}</span>
          </p>
        </div>
        <button
          onClick={() => setShowPersonalize(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: T.bgCard, border: `1.5px solid ${T.border}`,
            borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit", color: T.text,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          Personnaliser les widgets
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {visibleOrder.map(id => {
          const content = renderWidget(id);
          if (!content) return null;
          return (
            <WidgetShell key={id} {...shellProps(id)}>
              {content}
            </WidgetShell>
          );
        })}
      </div>

      {expandedWidget === "maJournee" && (
        <MaJourneeModal leads={leads} onClose={() => setExpandedWidget(null)} onOpenLead={id => { setExpandedWidget(null); handleOpenLead(id); }} />
      )}
      {expandedWidget === "pipeline" && (
        <PipelineModal leads={leads} onClose={() => setExpandedWidget(null)} onOpenLead={id => { setExpandedWidget(null); handleOpenLead(id); }} />
      )}
      {expandedWidget === "kpis" && (
        <KpisModal leads={leads} onClose={() => setExpandedWidget(null)} />
      )}
      {expandedWidget === "notes" && (
        <NotesModal onClose={() => setExpandedWidget(null)} />
      )}
      {expandedWidget === "activite" && (
        <ActiviteModal leads={leads} onClose={() => setExpandedWidget(null)} onOpenLead={id => { setExpandedWidget(null); handleOpenLead(id); }} />
      )}
      {expandedWidget === "deals" && (
        <DealsModal leads={leads} onClose={() => setExpandedWidget(null)} onOpenLead={id => { setExpandedWidget(null); handleOpenLead(id); }} />
      )}
      {expandedWidget === "clients" && (
        <ClientsModal leads={leads} onClose={() => setExpandedWidget(null)} onOpenLead={id => { setExpandedWidget(null); handleOpenLead(id); }} />
      )}
      {expandedWidget === "samples" && (
        <SamplesModal samples={mySamples} leads={leads} onClose={() => setExpandedWidget(null)} />
      )}
      {expandedWidget === "calendar" && (
        <CalendarModal leads={leads} onClose={() => setExpandedWidget(null)} />
      )}
      {expandedWidget === "score" && (
        <ScoreModal leads={leads} onClose={() => setExpandedWidget(null)} />
      )}
      {expandedWidget === "actionsRapides" && (
        <ExpandModal title="Actions rapides" icon={WIDGET_ICONS["actionsRapides"]} onClose={() => setExpandedWidget(null)}>
          <WidgetActionsRapides
            leads={leads}
            onNavigateNewLead={() => { setExpandedWidget(null); navigate("crm_pipeline"); }}
            onNavigatePricelist={() => { setExpandedWidget(null); navigate("pricelist_generator"); }}
            onNavigateOrders={() => { setExpandedWidget(null); navigate("orders"); }}
          />
        </ExpandModal>
      )}

      {showPersonalize && (
        <PersonalizePanel
          visibility={visibility}
          widgetOrder={widgetOrder}
          onToggle={toggleWidget}
          onClose={() => setShowPersonalize(false)}
        />
      )}
    </div>
  );
}

function PersonalizePanel({
  visibility, widgetOrder, onToggle, onClose,
}: {
  visibility: WidgetVisibility;
  widgetOrder: WidgetId[];
  onToggle: (id: WidgetId) => void;
  onClose: () => void;
}) {
  const activeCount = Object.values(visibility).filter(Boolean).length;

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 9999 }}
        onClick={onClose}
      />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 340,
        background: T.bgCard, boxShadow: "-4px 0 32px rgba(0,0,0,0.15)",
        zIndex: 10000, display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Personnaliser</div>
              <div style={{ fontSize: 12, color: T.textMid, marginTop: 2 }}>
                {activeCount}/{widgetOrder.length} widgets actifs
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ border: "none", background: T.cardAlt, borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", color: T.text }}
            >
              ×
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          <div style={{ fontSize: 12, color: T.textMid, marginBottom: 18, lineHeight: 1.6 }}>
            Activez ou désactivez les widgets. Glissez-déposez pour réorganiser votre espace.
          </div>

          {widgetOrder.map((id, idx) => {
            const isOn = visibility[id];
            return (
              <div
                key={id}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "12px 14px", marginBottom: 8,
                  background: isOn ? `${T.main}08` : T.cardAlt,
                  border: `1.5px solid ${isOn ? `${T.main}22` : T.border}`,
                  borderRadius: 10, transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>{WIDGET_ICONS[id]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                    {WIDGET_LABELS[id]}
                  </div>
                  <div style={{ fontSize: 10, color: T.textLight, marginTop: 2 }}>
                    Widget {idx + 1}
                  </div>
                </div>
                <button
                  onClick={() => onToggle(id)}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                    background: isOn ? T.main : "#d1d5db",
                    position: "relative", transition: "background 0.2s", padding: 0, flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: "absolute", top: 3, left: isOn ? 23 : 3, width: 18, height: 18,
                    borderRadius: "50%", background: T.bgCard, transition: "left 0.2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }} />
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ padding: "16px 24px", borderTop: `1px solid ${T.border}` }}>
          <button
            onClick={onClose}
            style={{
              width: "100%", background: T.main, color: "#fff", border: "none",
              borderRadius: 10, padding: "12px 0", fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </>
  );
}
