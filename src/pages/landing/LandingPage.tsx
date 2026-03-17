import React, { useEffect, useRef, useState } from "react";
import { L } from "../../theme";
import { supabase } from "../../supabaseClient";

type Props = { onLogin: () => void };

// ── Sphere Canvas Animation ──
function SphereCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = 640, H = 640, CX = W / 2, CY = H / 2, R = 260;

    const particles: { phi: number; theta: number }[] = [];
    const N = 400;
    for (let i = 0; i < N; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / N);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      particles.push({ phi, theta });
    }
    for (let i = 0; i < 180; i++) {
      particles.push({ phi: Math.random() * Math.PI, theta: Math.random() * Math.PI * 2 });
    }

    let rot = 0;
    let mx = 0, my = 0;
    let animId = 0;

    const handleMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mx = (e.clientX - rect.left - rect.width / 2) / rect.width;
      my = (e.clientY - rect.top - rect.height / 2) / rect.height;
    };
    canvas.parentElement?.addEventListener("mousemove", handleMove);

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      rot += 0.002 + mx * 0.006;
      const tiltY = my * 0.35;

      const pts = particles.map(p => {
        const x = R * Math.sin(p.phi) * Math.cos(p.theta + rot);
        const y = R * Math.sin(p.phi) * Math.sin(p.theta + rot);
        const z = R * Math.cos(p.phi);
        const y2 = y * Math.cos(tiltY) - z * Math.sin(tiltY);
        const z2 = y * Math.sin(tiltY) + z * Math.cos(tiltY);
        const depth = (z2 + R) / (2 * R);
        return { sx: CX + x, sy: CY + y2, depth };
      }).sort((a, b) => a.depth - b.depth);

      for (const p of pts) {
        const alpha = 0.06 + p.depth * 0.5;
        const size = 0.6 + p.depth * 1.6;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(8,5,3,${alpha})`;
        ctx.fill();
      }

      const frontPts = pts.filter(p => p.depth > 0.6);
      for (let i = 0; i < frontPts.length; i++) {
        for (let j = i + 1; j < frontPts.length; j++) {
          const dx = frontPts[i].sx - frontPts[j].sx;
          const dy = frontPts[i].sy - frontPts[j].sy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 28) {
            const alpha = (1 - dist / 28) * 0.06;
            ctx.beginPath();
            ctx.moveTo(frontPts[i].sx, frontPts[i].sy);
            ctx.lineTo(frontPts[j].sx, frontPts[j].sy);
            ctx.strokeStyle = `rgba(8,5,3,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      ctx.beginPath();
      ctx.ellipse(CX, CY, R, R * Math.abs(Math.sin(tiltY + 0.1)), 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(8,5,3,0.03)";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      canvas.parentElement?.removeEventListener("mousemove", handleMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={640}
      style={{ position: "absolute", right: -80, top: "50%", transform: "translateY(-50%)", width: 640, height: 640, opacity: 0.9, pointerEvents: "none" }}
    />
  );
}

// ── Live Ticker Data from Supabase ──
type TickerItem = { big: string; label: string; brand: string };

function useLiveTickerData(): TickerItem[] {
  const [items, setItems] = useState<TickerItem[]>([
    { big: "...", label: "leads actifs", brand: "CRM" },
    { big: "...", label: "ce mois", brand: "Commandes" },
    { big: "...", label: "clients actifs", brand: "Réseau" },
    { big: "...", label: "produits", brand: "Catalogue" },
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [leadsRes, ordersRes, clientsRes, productsRes] = await Promise.all([
        supabase.from("crm_leads").select("id", { count: "exact", head: true }).eq("archived", false),
        supabase.from("crm_leads").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
        supabase.from("profiles").select("id", { count: "exact", head: true }).neq("role", "god_admin"),
        supabase.from("sale_products").select("id", { count: "exact", head: true }),
      ]);

      if (cancelled) return;

      const leads = leadsRes.count ?? 0;
      const orders = ordersRes.count ?? 0;
      const clients = clientsRes.count ?? 0;
      const products = productsRes.count ?? 0;

      // If RLS blocks unauthenticated access, all counts will be 0
      // Show real data when available, otherwise keep placeholder
      if (leads + orders + clients + products > 0) {
        setItems([
          { big: String(leads), label: "leads actifs", brand: "Pipeline" },
          { big: String(orders), label: "ce mois", brand: "Nouveaux leads" },
          { big: String(clients), label: "utilisateurs", brand: "Équipe" },
          { big: String(products), label: "produits", brand: "Catalogue" },
        ]);
      } else {
        setItems([
          { big: "CRM", label: "pipeline intégré", brand: "Ventes" },
          { big: "ERP", label: "gestion complète", brand: "Opérations" },
          { big: "SCI", label: "réseau consignment", brand: "Canada + USA" },
          { big: "24/7", label: "temps réel", brand: "Suivi" },
        ]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return items;
}

// ── Main Component ──
export default function LandingPage({ onLogin }: Props) {
  const [heroVisible, setHeroVisible] = useState(false);
  const tickerItems = useLiveTickerData();

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const fade = (delay: number) => ({
    opacity: heroVisible ? 1 : 0,
    transform: heroVisible ? "translateY(0)" : "translateY(16px)",
    transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  });

  return (
    <div style={{
      fontFamily: "'Inter', system-ui, sans-serif",
      background: L.bg,
      color: L.text,
      overflow: "hidden",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

      <style>{`
        @keyframes tickerScroll { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @media (max-width: 768px) {
          .landing-hero { padding: 32px 20px 28px !important; min-height: 320px !important; }
          .landing-hero-h1 { font-size: 36px !important; }
          .landing-sphere { display: none !important; }
        }
      `}</style>

      {/* ══ HERO ══ */}
      <div className="landing-hero" style={{ position: "relative", overflow: "hidden", padding: "80px 48px 60px", flex: 1, display: "flex", alignItems: "center", minHeight: 440 }}>
        <div className="landing-sphere"><SphereCanvas /></div>

        {/* Hero Content */}
        <div style={{ position: "relative", zIndex: 2, maxWidth: 540, ...fade(100) }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 11, fontWeight: 500, color: L.textMuted,
            letterSpacing: 0.8, textTransform: "uppercase" as const, marginBottom: 20,
          }}>
            <div style={{ width: 28, height: 1, background: L.textLight }} />
            Distribution époxy · Boisbriand QC
          </div>

          <h1 className="landing-hero-h1" style={{
            fontSize: 52, fontWeight: 800, letterSpacing: -2.6, lineHeight: 1,
            color: L.text, margin: 0,
          }}>
            La plateforme<br /><span style={{ color: L.textMuted }}>pour distribuer</span>
          </h1>

          <p style={{
            fontSize: 15, color: L.textMid, lineHeight: 1.7, maxWidth: 400,
            marginTop: 20, marginBottom: 32, letterSpacing: -0.15, fontWeight: 400,
          }}>
            Gérez vos ventes, inventaires et équipes en temps réel. Réseau SCI consignment, Canada + USA.
          </p>

          <div style={fade(350)}>
            <button onClick={onLogin} style={{
              fontSize: 13, fontWeight: 600, background: L.accent, color: L.accentText,
              border: "none", borderRadius: 100, padding: "12px 28px", cursor: "pointer",
              letterSpacing: -0.13, transition: "all 0.2s",
              boxShadow: "0 2px 8px rgba(8,5,3,0.12)",
            }}>
              Se connecter
            </button>
          </div>
        </div>
      </div>

      {/* ══ TICKER ══ */}
      <div style={{
        height: 40, display: "flex", alignItems: "center",
        background: L.bgAlt, borderTop: `1px solid ${L.borderLight}`,
        borderBottom: `1px solid ${L.borderLight}`, overflow: "hidden",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", whiteSpace: "nowrap" as const, animation: "tickerScroll 20s linear infinite" }}>
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 6, padding: "0 36px" }}>
              <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.5, color: L.text }}>{item.big}</span>
              <span style={{ fontSize: 10, fontWeight: 500, color: L.textMuted, letterSpacing: 0.5, textTransform: "uppercase" as const }}>{item.label}</span>
              <span style={{ color: L.borderHover, padding: "0 4px" }}>·</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: L.textLight, letterSpacing: 1, textTransform: "uppercase" as const }}>{item.brand}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══ FOOTER ══ */}
      <div style={{
        padding: "20px 48px", borderTop: `1px solid ${L.borderLight}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 11, color: L.textMuted, letterSpacing: 0.2 }}>
          Uniflex Distribution Inc. · Boisbriand, QC · © {new Date().getFullYear()}
        </div>
        <span style={{ fontSize: 10, color: L.textLight, letterSpacing: 0.4 }}>v2.0</span>
      </div>
    </div>
  );
}
