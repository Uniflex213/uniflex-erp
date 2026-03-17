import { useApp } from "../AppContext";
import { AlertCircle, X } from "lucide-react";
import { T } from "../theme";

export default function TabOverflowToast() {
  const { tabOverflowToast, dismissToast } = useApp();

  if (!tabOverflowToast.show) return null;

  return (
    <>
      <style>{`
        @keyframes toastSlideIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          background: T.bgCard,
          borderRadius: 12,
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
          zIndex: 99997,
          animation: "toastSlideIn 0.3s ease-out",
          border: `1px solid rgba(245,158,11,0.2)`,
        }}
      >
        <AlertCircle size={20} color={T.orange} />
        <span style={{ fontSize: 14, fontWeight: 500, color: T.text }}>
          {tabOverflowToast.message}
        </span>
        <button
          onClick={dismissToast}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            marginLeft: 8,
            display: "flex",
            color: T.orange,
          }}
        >
          <X size={16} />
        </button>
      </div>
    </>
  );
}
