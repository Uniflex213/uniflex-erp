import React, { useState, useRef } from "react";
import { SaleProductImage } from "../sales/productTypes";

export default function ProductCarousel({ images }: { images: SaleProductImage[] }) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    if (images.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIdx(prev => (prev + 1) % images.length);
    }, 3000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: "0 8px 8px 0" }}>
      {images.map((img, i) => (
        <div
          key={img.id}
          style={{
            position: "absolute", inset: 0,
            opacity: i === idx ? 1 : 0,
            transition: "opacity 0.8s ease",
          }}
        >
          <img src={img.image_url} alt="Exemple projet" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
        </div>
      ))}
      {images.length > 1 && (
        <div style={{ position: "absolute", bottom: 6, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 5, zIndex: 2 }}>
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              style={{
                width: i === idx ? 16 : 6, height: 6, borderRadius: 3,
                background: i === idx ? "#fff" : "rgba(255,255,255,0.5)",
                border: "none", cursor: "pointer", padding: 0,
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>
      )}
      <div style={{
        position: "absolute", top: 6, right: 6,
        background: "rgba(0,0,0,0.45)", borderRadius: 4,
        padding: "2px 6px", fontSize: 10, color: "#fff", fontWeight: 600,
      }}>
        Exemples
      </div>
    </div>
  );
}
