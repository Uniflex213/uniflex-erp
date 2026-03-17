import React, { useRef, useCallback } from "react";

interface GlassCardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  padding?: number | string;
  borderRadius?: number;
  noBorder?: boolean;
}

export default function GlassCard({
  children,
  style,
  className,
  onClick,
  padding,
  borderRadius = 16,
  noBorder,
}: GlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Direct DOM mutation on mousemove — avoids React re-renders (up to 60/s)
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    card.style.background = `radial-gradient(600px circle at ${x}px ${y}px, rgba(255,255,255,0.65), rgba(220,218,214,0.55) 60%, rgba(200,198,194,0.5) 100%)`;
    card.style.border = noBorder ? "none" : "1px solid rgba(255,255,255,0.55)";
    card.style.boxShadow = "0 4px 24px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.6)";

    if (highlightRef.current) {
      highlightRef.current.style.backgroundImage = `radial-gradient(300px circle at ${x}px ${y}px, rgba(255,255,255,0.25), transparent 60%)`;
      highlightRef.current.style.display = "block";
    }
  }, [noBorder]);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.background = "linear-gradient(145deg, rgba(235,233,228,0.6) 0%, rgba(215,213,208,0.55) 100%)";
    card.style.border = noBorder ? "none" : "1px solid rgba(255,255,255,0.35)";
    card.style.boxShadow = "0 2px 12px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.5)";

    if (highlightRef.current) {
      highlightRef.current.style.display = "none";
    }
  }, [noBorder]);

  return (
    <div
      ref={cardRef}
      className={className}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: "relative",
        borderRadius,
        background: "linear-gradient(145deg, rgba(235,233,228,0.6) 0%, rgba(215,213,208,0.55) 100%)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: noBorder ? "none" : "1px solid rgba(255,255,255,0.35)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.5)",
        padding: padding ?? 20,
        overflow: "hidden",
        transition: "box-shadow 0.3s ease, border-color 0.3s ease",
        ...style,
      }}
    >
      {/* Edge highlight overlay — toggled via ref, no re-render */}
      <div ref={highlightRef} style={{
        position: "absolute", inset: 0, borderRadius,
        pointerEvents: "none",
        display: "none",
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
