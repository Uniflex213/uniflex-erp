import React, { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "../AppContext";
import { useAuth } from "../contexts/AuthContext";
import { X, Search, LogOut } from "lucide-react";
import { T } from "../theme";
import { useLanguage } from "../i18n/LanguageContext";

type MenuItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  subs?: { key: string; label: string; icon: React.ReactNode; permission?: string }[];
  badge?: number;
  permission?: string;
};

type Props = {
  menu: MenuItem[];
  onLogout: () => void;
  pageLabels: Record<string, string>;
};

const ORB_SIZE = 54;
const SNAP_MARGIN = 16;

type Position = { x: number; y: number };
type Edge = "left" | "right" | "bottom" | "top";

function getStoredPosition(): Position | null {
  try {
    const stored = localStorage.getItem("orbPosition");
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function storePosition(pos: Position) {
  try {
    localStorage.setItem("orbPosition", JSON.stringify(pos));
  } catch {}
}

function snapToEdge(x: number, y: number, vw: number, vh: number): { pos: Position; edge: Edge } {
  const centerX = x + ORB_SIZE / 2;
  const centerY = y + ORB_SIZE / 2;
  const distLeft = centerX;
  const distRight = vw - centerX;
  const distTop = centerY;
  const distBottom = vh - centerY;
  const minDist = Math.min(distLeft, distRight, distTop, distBottom);

  if (minDist === distLeft) {
    return { pos: { x: SNAP_MARGIN, y: Math.max(SNAP_MARGIN, Math.min(y, vh - ORB_SIZE - SNAP_MARGIN)) }, edge: "left" };
  } else if (minDist === distRight) {
    return { pos: { x: vw - ORB_SIZE - SNAP_MARGIN, y: Math.max(SNAP_MARGIN, Math.min(y, vh - ORB_SIZE - SNAP_MARGIN)) }, edge: "right" };
  } else if (minDist === distTop) {
    return { pos: { x: Math.max(SNAP_MARGIN, Math.min(x, vw - ORB_SIZE - SNAP_MARGIN)), y: SNAP_MARGIN }, edge: "top" };
  } else {
    return { pos: { x: Math.max(SNAP_MARGIN, Math.min(x, vw - ORB_SIZE - SNAP_MARGIN)), y: vh - ORB_SIZE - SNAP_MARGIN }, edge: "bottom" };
  }
}

function NavIcon({ item, active, onClick, tooltip }: { item: { key: string; icon: React.ReactNode; label: string }; active?: boolean; onClick: () => void; tooltip: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: active ? "#111" : hovered ? "rgba(0,0,0,0.05)" : "transparent",
          color: active ? "#fff" : hovered ? "#111" : "#6b6b6b",
          transition: "all 0.15s ease",
          padding: 0,
          minWidth: 42,
          minHeight: 42,
        }}
      >
        {item.icon}
      </button>
      {hovered && (
        <div style={{
          position: "absolute",
          bottom: "calc(100% + 6px)",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#111",
          color: "#fff",
          fontSize: 10,
          fontWeight: 600,
          padding: "4px 10px",
          borderRadius: 100,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          zIndex: 10,
          letterSpacing: "-0.01em",
        }}>
          {tooltip}
        </div>
      )}
    </div>
  );
}

export default function FloatingNavOrb({ menu, onLogout, pageLabels: _pageLabels }: Props) {
  const { navigate, page } = useApp();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const initials = profile?.full_name ? profile.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() : "??";

  const [position, setPosition] = useState<Position>(() => {
    const stored = getStoredPosition();
    if (stored) return stored;
    return { x: (window.innerWidth - ORB_SIZE) / 2, y: window.innerHeight - ORB_SIZE - SNAP_MARGIN };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [edge, setEdge] = useState<Edge>("bottom");

  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const hasDraggedRef = useRef(false);
  const orbRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => {
        const { pos } = snapToEdge(prev.x, prev.y, window.innerWidth, window.innerHeight);
        return pos;
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node) && !orbRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    hasDraggedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [position]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasDraggedRef.current = true;
    }
    const newX = dragStartRef.current.posX + dx;
    const newY = dragStartRef.current.posY + dy;
    setPosition({
      x: Math.max(0, Math.min(newX, window.innerWidth - ORB_SIZE)),
      y: Math.max(0, Math.min(newY, window.innerHeight - ORB_SIZE)),
    });
  }, [isDragging]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    if (!hasDraggedRef.current) {
      setMenuOpen(prev => !prev);
    } else {
      const { pos, edge: newEdge } = snapToEdge(position.x, position.y, window.innerWidth, window.innerHeight);
      setPosition(pos);
      setEdge(newEdge);
      storePosition(pos);
    }
    dragStartRef.current = null;
  }, [isDragging, position]);

  const handleNavigation = (key: string) => {
    navigate(key);
    setMenuOpen(false);
    setSearchQuery("");
    setExpandedGroup(null);
  };

  const flatItems = menu.flatMap(item => {
    if (item.subs) return item.subs.map(sub => ({ ...sub, parentLabel: item.label }));
    return [{ ...item, parentLabel: undefined }];
  });

  const searchResults = searchQuery.trim()
    ? flatItems.filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : null;

  const getMenuPosition = () => {
    const menuWidth = 320;
    const menuHeight = 480;
    let x = position.x;
    let y = position.y;

    if (edge === "left") {
      x = position.x + ORB_SIZE + 12;
      y = Math.max(12, Math.min(position.y - menuHeight / 2 + ORB_SIZE / 2, window.innerHeight - menuHeight - 12));
    } else if (edge === "right") {
      x = position.x - menuWidth - 12;
      y = Math.max(12, Math.min(position.y - menuHeight / 2 + ORB_SIZE / 2, window.innerHeight - menuHeight - 12));
    } else if (edge === "top") {
      x = Math.max(12, Math.min(position.x - menuWidth / 2 + ORB_SIZE / 2, window.innerWidth - menuWidth - 12));
      y = position.y + ORB_SIZE + 12;
    } else {
      x = Math.max(12, Math.min(position.x - menuWidth / 2 + ORB_SIZE / 2, window.innerWidth - menuWidth - 12));
      y = position.y - menuHeight - 12;
    }
    return { x, y };
  };

  const menuPos = getMenuPosition();

  return (
    <>
      <style>{`
        @keyframes orbFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        @keyframes ccSlideIn {
          from { opacity: 0; transform: scale(0.96) translateY(4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      <div
        ref={orbRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          width: ORB_SIZE,
          height: ORB_SIZE,
          borderRadius: 16,
          background: "transparent",
          cursor: isDragging ? "grabbing" : "grab",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "none",
          animation: isDragging ? "none" : "orbFloat 3s ease-in-out infinite",
          transition: isDragging ? "none" : "left 0.3s ease-out, top 0.3s ease-out",
          transform: isDragging ? "scale(1.06)" : "scale(1)",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        <img
          src="/uniflex-icon.png"
          alt="Uniflex"
          style={{
            width: ORB_SIZE,
            height: ORB_SIZE,
            objectFit: "contain",
            pointerEvents: "none",
            filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.35))",
          }}
        />
      </div>

      {menuOpen && (
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            left: menuPos.x,
            top: menuPos.y,
            width: 320,
            maxHeight: 480,
            background: "linear-gradient(145deg, rgba(240,238,234,0.75) 0%, rgba(220,218,214,0.7) 100%)",
            backdropFilter: "blur(32px)",
            WebkitBackdropFilter: "blur(32px)",
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.4)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)",
            zIndex: 99998,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            animation: "ccSlideIn 0.18s ease-out",
          }}
        >
          <div style={{ padding: "12px 12px 8px", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.5)", borderRadius: 100, padding: "8px 14px" }}>
              <Search size={14} color="#a0a0a0" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t("nav.search_placeholder")}
                autoFocus
                style={{ border: "none", background: "transparent", outline: "none", fontSize: 12, width: "100%", fontFamily: "inherit", color: "#111", letterSpacing: "-0.01em" }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, minWidth: "auto", minHeight: "auto" }}>
                  <X size={12} color="#a0a0a0" />
                </button>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "4px 12px 12px" }}>
            {searchResults ? (
              searchResults.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "#a0a0a0", fontSize: 12 }}>{t("nav.no_result")}</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
                  {searchResults.map(item => (
                    <NavIcon
                      key={item.key}
                      item={item}
                      active={page === item.key}
                      onClick={() => handleNavigation(item.key)}
                      tooltip={item.label}
                    />
                  ))}
                </div>
              )
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {(() => {
                  const result: ({ type: "singles"; items: typeof menu } | { type: "dropdown"; item: typeof menu[0] })[] = [];
                  for (const item of menu) {
                    const hasSubs = item.subs && item.subs.length > 0;
                    if (!hasSubs) {
                      const last = result[result.length - 1];
                      if (last && last.type === "singles") {
                        last.items.push(item);
                      } else {
                        result.push({ type: "singles", items: [item] });
                      }
                    } else {
                      result.push({ type: "dropdown", item });
                    }
                  }
                  return result.map((group, gi) => {
                    if (group.type === "singles") {
                      return (
                        <div key={`g-${gi}`} style={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "center" }}>
                          {group.items.map(item => (
                            <NavIcon
                              key={item.key}
                              item={item}
                              active={page === item.key}
                              onClick={() => handleNavigation(item.key)}
                              tooltip={item.label}
                            />
                          ))}
                        </div>
                      );
                    }
                    const item = group.item;
                    const isExpanded = expandedGroup === item.key;
                    return (
                      <div
                        key={item.key}
                        style={{
                          background: isExpanded ? "#f5f4f0" : "transparent",
                          borderRadius: 12,
                          padding: isExpanded ? 10 : 6,
                          transition: "all 0.15s ease",
                        }}
                      >
                        <button
                          onClick={() => setExpandedGroup(isExpanded ? null : item.key)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            width: "100%",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "4px 6px",
                            borderRadius: 8,
                            color: isExpanded ? "#111" : "#6b6b6b",
                            minHeight: 30,
                            minWidth: "auto",
                            transition: "color 0.15s",
                          }}
                        >
                          <span style={{ display: "flex", color: isExpanded ? "#111" : "#a0a0a0" }}>{item.icon}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "-0.01em" }}>{item.label}</span>
                          <svg
                            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            style={{ marginLeft: "auto", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>

                        {isExpanded && (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, marginTop: 6, justifyItems: "center" }}>
                            {item.subs!.map(sub => (
                              <NavIcon
                                key={sub.key}
                                item={sub}
                                active={page === sub.key}
                                onClick={() => handleNavigation(sub.key)}
                                tooltip={sub.label}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>

          <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 100, background: "#111", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0, overflow: "hidden" }}>
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: 32, height: 32, objectFit: "cover" }} /> : initials}
            </div>
            <div style={{ flex: 1, fontSize: 12, color: "#6b6b6b", fontWeight: 500 }}>
              {profile?.full_name || t("nav.user_fallback")}
            </div>
            <button
              onClick={() => { setMenuOpen(false); onLogout(); }}
              style={{ background: "transparent", border: "1px solid rgba(0,0,0,0.08)", cursor: "pointer", width: 34, height: 34, borderRadius: 100, color: "#a0a0a0", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", minWidth: 34, minHeight: 34 }}
              onMouseOver={e => { e.currentTarget.style.background = "rgba(220,38,38,0.06)"; e.currentTarget.style.color = "#dc2626"; e.currentTarget.style.borderColor = "rgba(220,38,38,0.15)"; }}
              onMouseOut={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#a0a0a0"; e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)"; }}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
