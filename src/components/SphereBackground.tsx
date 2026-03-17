import { useEffect, useRef } from "react";

type Props = {
  mode?: "light" | "dark";
  size?: number;
  opacity?: number;
  style?: React.CSSProperties;
};

/**
 * Animated 3D particle sphere rendered on Canvas.
 * - "light" mode: dark particles on light background (landing/login)
 * - "dark" mode: light particles on dark background (ERP shell)
 */
export default function SphereBackground({ mode = "dark", size = 520, opacity = 0.6, style }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = size, H = size, CX = W / 2, CY = H / 2, R = size * 0.4;

    const isLight = mode === "light";
    const dotColor = isLight ? "8,5,3" : "160,165,220";
    const lineColor = isLight ? "8,5,3" : "140,145,200";

    const particles: { phi: number; theta: number }[] = [];
    const N = Math.round(size * 0.6);
    for (let i = 0; i < N; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / N);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      particles.push({ phi, theta });
    }
    for (let i = 0; i < Math.round(size * 0.25); i++) {
      particles.push({ phi: Math.random() * Math.PI, theta: Math.random() * Math.PI * 2 });
    }

    let rot = 0;
    let mx = 0, my = 0;
    let animId = 0;

    const handleMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0) return;
      mx = (e.clientX - rect.left - rect.width / 2) / rect.width;
      my = (e.clientY - rect.top - rect.height / 2) / rect.height;
    };
    window.addEventListener("mousemove", handleMove);

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      rot += 0.0015 + mx * 0.004;
      const tiltY = my * 0.3;

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
        const alpha = 0.05 + p.depth * 0.45;
        const sz = 0.5 + p.depth * 1.5;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, sz, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${dotColor},${alpha})`;
        ctx.fill();
      }

      const frontPts = pts.filter(p => p.depth > 0.6);
      for (let i = 0; i < frontPts.length; i++) {
        for (let j = i + 1; j < frontPts.length; j++) {
          const dx = frontPts[i].sx - frontPts[j].sx;
          const dy = frontPts[i].sy - frontPts[j].sy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 24) {
            const alpha = (1 - dist / 24) * 0.05;
            ctx.beginPath();
            ctx.moveTo(frontPts[i].sx, frontPts[i].sy);
            ctx.lineTo(frontPts[j].sx, frontPts[j].sy);
            ctx.strokeStyle = `rgba(${lineColor},${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMove);
    };
  }, [mode, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{
        position: "absolute",
        width: size,
        height: size,
        opacity,
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}
