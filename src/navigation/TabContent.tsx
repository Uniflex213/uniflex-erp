import React, { useRef, useEffect } from "react";
import { TabItem, useApp } from "../AppContext";
import ErrorBoundary from "../components/ErrorBoundary";

type Props = {
  tabs: TabItem[];
  activeTabIndex: number;
  renderPage: (pageKey: string, tabId: string) => React.ReactNode;
  isMobile?: boolean;
  onClickOutside?: () => void;
};

export default function TabContent({ tabs, activeTabIndex, renderPage, isMobile, onClickOutside }: Props) {
  const { saveScrollPosition } = useApp();
  const containerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrollRestoredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const activeTab = tabs[activeTabIndex];
    if (!activeTab) return;
    const container = containerRefs.current.get(activeTab.id);
    if (container && !scrollRestoredRef.current.has(activeTab.id)) {
      container.scrollTop = activeTab.scrollPos;
      scrollRestoredRef.current.add(activeTab.id);
    }
  }, [activeTabIndex, tabs]);

  const handleScroll = (tabId: string) => {
    const container = containerRefs.current.get(tabId);
    const activeTab = tabs[activeTabIndex];
    if (container && activeTab && activeTab.id === tabId && scrollRestoredRef.current.has(tabId)) {
      saveScrollPosition(container.scrollTop);
    }
  };

  return (
    <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
      {tabs.map((tab, index) => {
        const isActive = index === activeTabIndex;
        return (
          <div
            key={tab.id}
            ref={(el) => {
              if (el) containerRefs.current.set(tab.id, el);
              else containerRefs.current.delete(tab.id);
            }}
            onScroll={() => handleScroll(tab.id)}
            onClick={onClickOutside}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              overflow: "auto",
              padding: isMobile ? "12px 12px" : 24,
              paddingLeft: isMobile ? "calc(12px + var(--sal))" : 24,
              paddingRight: isMobile ? "calc(12px + var(--sar))" : 24,
              paddingBottom: isMobile ? "calc(72px + var(--sab))" : 24,
              background: "transparent",
              WebkitOverflowScrolling: "touch" as any,
              display: isActive ? "block" : "none",
              visibility: isActive ? "visible" : "hidden",
            }}
          >
            <div style={{ maxWidth: isMobile ? "100%" : 1400, margin: "0 auto" }}>
              <ErrorBoundary fallbackLabel={`Erreur dans l'onglet "${tab.label}"`}>
                {renderPage(tab.pageKey, tab.id)}
              </ErrorBoundary>
            </div>
          </div>
        );
      })}
    </div>
  );
}
