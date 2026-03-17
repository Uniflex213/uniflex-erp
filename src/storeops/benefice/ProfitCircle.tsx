import React, { useEffect, useState, useRef } from "react";
import { T, fmt, fmtPct } from "./beneficeTypes";

interface Props {
  profit: number;
  revenue: number;
  cost: number;
  expenses: number;
  opacity: number;
  scale: number;
}

export default function ProfitCircle({ profit, revenue, cost, expenses, opacity, scale }: Props) {
  const [animatedProfit, setAnimatedProfit] = useState(0);
  const [dashOffset, setDashOffset] = useState(283);
  const animRef = useRef<number>(0);

  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const fillPct = Math.min(Math.max(margin / 100, 0), 1);

  useEffect(() => {
    const start = performance.now();
    const duration = 1800;
    const from = 0;
    const to = profit;
    const fromDash = 283;
    const toDash = 283 - (283 * fillPct);

    const animate = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setAnimatedProfit(from + (to - from) * ease);
      setDashOffset(fromDash + (toDash - fromDash) * ease);
      if (t < 1) animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [profit, fillPct]);

  const circleColor = profit >= 0 ? T.green : T.red;
  const glowColor = profit >= 0 ? "rgba(22,163,74,0.25)" : "rgba(220,38,38,0.25)";

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      opacity, transform: `scale(${scale})`, transition: "opacity 0.1s, transform 0.1s",
      pointerEvents: opacity < 0.1 ? "none" : "auto",
    }}>
      <div style={{ position: "relative", width: 280, height: 280 }}>
        <svg width="280" height="280" viewBox="0 0 100 100" style={{ filter: `drop-shadow(0 0 30px ${glowColor})` }}>
          <circle cx="50" cy="50" r="45" fill="none" stroke={T.border} strokeWidth="3" />
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke={circleColor}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="283"
            strokeDashoffset={dashOffset}
            transform="rotate(-90 50 50)"
            style={{ transition: "stroke 0.3s" }}
          />
        </svg>

        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>Benefice Net</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: circleColor, lineHeight: 1, letterSpacing: -1 }}>
            {fmt(animatedProfit)}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: circleColor, marginTop: 4 }}>
            {fmtPct(margin)} marge
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, marginTop: 24 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.8 }}>Revenus</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginTop: 2 }}>{fmt(revenue)}</div>
        </div>
        <div style={{ width: 1, background: T.border }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.8 }}>Couts</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.red, marginTop: 2 }}>{fmt(cost)}</div>
        </div>
        <div style={{ width: 1, background: T.border }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.8 }}>Depenses</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.orange, marginTop: 2 }}>{fmt(expenses)}</div>
        </div>
      </div>
    </div>
  );
}
