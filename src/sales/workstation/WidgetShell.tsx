import { useState, useRef } from "react";
import { T, WidgetId, WIDGET_LABELS, WIDGET_ICONS } from "./workstationTypes";

interface WidgetShellProps {
  id: WidgetId;
  children: React.ReactNode;
  onExpand: () => void;
  isDragging?: boolean;
  onDragStart: (e: React.DragEvent, id: WidgetId) => void;
  onDragOver: (e: React.DragEvent, id: WidgetId) => void;
  onDragEnd: () => void;
  dragOverId?: WidgetId | null;
}

export default function WidgetShell({
  id, children, onExpand, isDragging = false,
  onDragStart, onDragOver, onDragEnd, dragOverId,
}: WidgetShellProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, id)}
      onDragOver={e => onDragOver(e, id)}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        opacity: isDragging ? 0.4 : 1,
        transition: "opacity 0.2s, transform 0.2s",
        transform: dragOverId === id ? "scale(1.01)" : "scale(1)",
        cursor: "default",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: 14,
          zIndex: 20,
          cursor: "grab",
          borderRadius: "16px 16px 0 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          opacity: hovered ? 1 : 0.3,
          transition: "opacity 0.2s",
          background: hovered ? "rgba(99,102,241,0.04)" : "transparent",
        }}
        title="Maintenir pour déplacer le widget"
      >
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: T.textLight }} />
        ))}
      </div>

      <button
        onClick={e => { e.stopPropagation(); onExpand(); }}
        title="Voir en détail"
        style={{
          position: "absolute",
          top: 16, right: 20,
          zIndex: 20,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 15,
          color: hovered ? T.main : T.textLight,
          transition: "color 0.2s, transform 0.2s",
          transform: hovered ? "scale(1.15)" : "scale(1)",
          lineHeight: 1,
          padding: "2px 4px",
          borderRadius: 4,
          fontWeight: 700,
        }}
      >
        ↗
      </button>

      {dragOverId === id && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: 16,
          border: `2px dashed ${T.main}`, pointerEvents: "none", zIndex: 10,
          background: `${T.main}06`,
        }} />
      )}

      {children}
    </div>
  );
}

interface ExpandModalProps {
  title: string;
  icon?: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
  height?: string;
}

export function ExpandModal({ title, icon, onClose, children, width = "92%", height = "88vh" }: ExpandModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        animation: "expandModalBg 0.2s ease",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKeyDown}
    >
      <style>{`
        @keyframes expandModalBg { from { opacity:0 } to { opacity:1 } }
        @keyframes expandModalIn { from { opacity:0; transform:scale(0.95) } to { opacity:1; transform:scale(1) } }
        .expand-modal-scroll::-webkit-scrollbar { width: 6px; }
        .expand-modal-scroll::-webkit-scrollbar-track { background: transparent; }
        .expand-modal-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 3px; }
        .ws-tab-btn:hover { background: rgba(99,102,241,0.08) !important; }
        .ws-row-hover:hover { background: rgba(99,102,241,0.04) !important; cursor: pointer; }
        .ws-action-btn:hover { opacity: 0.85 !important; }
      `}</style>
      <div style={{
        background: T.bgCard,
        borderRadius: 20,
        width, maxWidth: 1200,
        height,
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 32px 80px rgba(0,0,0,0.3)",
        animation: "expandModalIn 0.25s ease",
        overflow: "hidden",
      }}>
        <div style={{
          padding: "20px 28px 16px",
          borderBottom: `1px solid rgba(0,0,0,0.08)`,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: `${T.main}06`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {icon && <span style={{ fontSize: 22 }}>{icon}</span>}
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.text }}>{title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(0,0,0,0.07)", border: "none", borderRadius: 10,
              width: 36, height: 36, fontSize: 20, cursor: "pointer",
              color: T.textMid, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >×</button>
        </div>
        <div
          ref={scrollRef}
          className="expand-modal-scroll"
          style={{ flex: 1, overflowY: "auto", padding: "24px 28px 28px" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
