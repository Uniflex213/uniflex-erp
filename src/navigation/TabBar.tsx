import { useState } from "react";
import { useApp } from "../AppContext";
import { useAuth } from "../contexts/AuthContext";
import { X, Plus, AlertTriangle, FilePlus } from "lucide-react";
import { T } from "../theme";

interface TabBarProps {
  pageLabels: Record<string, string>;
}

const DEFAULT_PAGE_BY_ROLE: Record<string, [string, string]> = {
  god_admin: ["dash_company", "Dashboard Compagnie"],
  admin: ["dash_company", "Dashboard Compagnie"],
  vendeur: ["dash_user", "Mon Dashboard"],
  magasin: ["pickup_tickets", "Pickup Tickets"],
  manuf: ["manuf_dashboard", "Tableau de bord SCI"],
};

export default function TabBar({ pageLabels }: TabBarProps) {
  const { tabs, activeTabIndex, switchTab, closeTab, page, pinCurrentPage, canPinCurrentPage, openTab } = useApp();
  const { profile } = useAuth();
  const [confirmClose, setConfirmClose] = useState<number | null>(null);

  const currentLabel = pageLabels[page] || page;
  const canPin = canPinCurrentPage();

  const handleNewTab = () => {
    const [key, label] = DEFAULT_PAGE_BY_ROLE[profile?.role ?? "vendeur"] ?? DEFAULT_PAGE_BY_ROLE.vendeur;
    openTab(key, label);
  };

  const handleCloseClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const tab = tabs[index];
    if (tab.isDirty) {
      setConfirmClose(index);
    } else {
      closeTab(index);
    }
  };

  const handleConfirmClose = () => {
    if (confirmClose !== null) {
      closeTab(confirmClose, true);
      setConfirmClose(null);
    }
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "6px 20px",
          background: "rgba(255,255,255,0.35)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(255,255,255,0.5)",
          minHeight: 42,
          position: "relative",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, overflow: "hidden" }}>
          {tabs.map((tab, index) => {
            const isActive = index === activeTabIndex;
            const label = pageLabels[tab.pageKey] || tab.label;

            return (
              <div
                key={tab.id}
                onClick={() => switchTab(index)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "0 14px",
                  height: 32,
                  background: isActive ? "#fff" : "transparent",
                  borderRadius: 100,
                  cursor: "pointer",
                  position: "relative",
                  transition: "all 0.15s ease",
                  border: isActive ? `1px solid ${T.border}` : "1px solid transparent",
                  boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.04)" : "none",
                }}
                onMouseOver={e => {
                  if (!isActive) e.currentTarget.style.background = "rgba(0,0,0,0.03)";
                }}
                onMouseOut={e => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                {tab.isDirty && (
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: T.orange,
                      flexShrink: 0,
                    }}
                  />
                )}
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "#111" : T.textMid,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: 140,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {label}
                </span>
                {tabs.length > 1 && (
                  <button
                    onClick={e => handleCloseClick(index, e)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 18,
                      height: 18,
                      borderRadius: 100,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      padding: 0,
                      color: isActive ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.2)",
                      transition: "all 0.15s",
                      minWidth: 18,
                      minHeight: 18,
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.background = "rgba(0,0,0,0.06)";
                      e.currentTarget.style.color = "#111";
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = isActive ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.2)";
                    }}
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
          {canPin && (
            <>
              <button
                onClick={handleNewTab}
                title="Nouvel onglet"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 30,
                  height: 30,
                  background: "transparent",
                  color: T.textMid,
                  border: `1px solid ${T.border}`,
                  borderRadius: 100,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = "#fff";
                  e.currentTarget.style.color = "#111";
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = T.textMid;
                }}
              >
                <FilePlus size={14} />
              </button>
              <button
                onClick={() => pinCurrentPage(currentLabel)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  padding: "6px 14px",
                  height: 30,
                  background: "#111",
                  color: "#fff",
                  border: "none",
                  borderRadius: 100,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  transition: "all 0.15s",
                  letterSpacing: "-0.01em",
                }}
                onMouseOver={e => (e.currentTarget.style.background = "#333")}
                onMouseOut={e => (e.currentTarget.style.background = "#111")}
              >
                <Plus size={13} />
                Epingler
              </button>
            </>
          )}

          <div
            style={{
              fontSize: 11,
              color: T.textMid,
              padding: "4px 10px",
              background: "rgba(0,0,0,0.03)",
              borderRadius: 100,
              fontWeight: 500,
            }}
          >
            {tabs.length}/10
          </div>
        </div>
      </div>

      {confirmClose !== null && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(230,228,224,0.35)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100000,
          }}
          onClick={() => setConfirmClose(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 24,
              maxWidth: 400,
              width: "90%",
              boxShadow: "0 16px 48px rgba(0,0,0,0.12)",
              border: `1px solid ${T.border}`,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ background: T.orangeBg, padding: 10, borderRadius: 10, border: `1px solid rgba(217,119,6,0.15)` }}>
                <AlertTriangle size={24} color={T.orange} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>Modifications non sauvegardees</div>
                <div style={{ fontSize: 13, color: T.textMid, marginTop: 4 }}>
                  Cet onglet contient des modifications non sauvegardees.
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmClose(null)}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  border: `1px solid ${T.border}`,
                  borderRadius: 100,
                  cursor: "pointer",
                  background: "#fff",
                  color: "#111",
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmClose}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  border: "none",
                  borderRadius: 100,
                  cursor: "pointer",
                  background: T.red,
                  color: "#fff",
                }}
              >
                Fermer quand meme
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
