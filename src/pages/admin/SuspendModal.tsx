import React, { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { logActivity } from "../../lib/activityLogger";
import { useAuth } from "../../contexts/AuthContext";
import { AdminProfile } from "./adminTypes";
import { T } from "../../theme";

type Props = {
  target: AdminProfile;
  onClose: () => void;
  onDone: () => void;
};

export default function SuspendModal({ target, onClose, onDone }: Props) {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<"indefinite" | "date">("indefinite");
  const [untilDate, setUntilDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isSuspended = target.is_suspended;

  const submit = async () => {
    if (!isSuspended && !reason.trim()) { setError("Une raison est requise."); return; }
    setSubmitting(true);
    setError("");
    try {
      if (isSuspended) {
        await supabase.from("profiles").update({ is_suspended: false, suspended_until: null, suspension_reason: null }).eq("id", target.id);
        if (user) await logActivity(supabase, user.id, "user_unsuspended", "admin", { target_id: target.id });
      } else {
        await supabase.from("profiles").update({ is_suspended: true, suspension_reason: reason, suspended_until: duration === "date" ? untilDate : null }).eq("id", target.id);
        if (user) await logActivity(supabase, user.id, "user_suspended", "admin", { target_id: target.id, reason });
      }
      onDone();
    } catch {
      setError("Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: T.bgCard, borderRadius: 16, width: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>
            {isSuspended ? "Lever la suspension" : "Suspendre l'utilisateur"}
          </h2>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer" }}><X size={18} /></button>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", gap: 12, padding: 14, background: "#fef3c7", borderRadius: 10, marginBottom: 20 }}>
            <AlertTriangle size={20} color="#d97706" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#92400e" }}>{target.full_name}</div>
              <div style={{ fontSize: 12, color: "#b45309" }}>{target.email}</div>
            </div>
          </div>

          {!isSuspended && (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.mid, display: "block", marginBottom: 6 }}>Raison *</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 14, resize: "vertical", boxSizing: "border-box" }} placeholder="Décrivez la raison..." />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.mid, display: "block", marginBottom: 8 }}>Durée</label>
                <div style={{ display: "flex", gap: 12 }}>
                  {(["indefinite", "date"] as const).map((d) => (
                    <label key={d} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                      <input type="radio" value={d} checked={duration === d} onChange={() => setDuration(d)} />
                      {d === "indefinite" ? "Indéfini" : "Jusqu'à une date"}
                    </label>
                  ))}
                </div>
                {duration === "date" && (
                  <input type="date" value={untilDate} onChange={(e) => setUntilDate(e.target.value)} min={new Date().toISOString().split("T")[0]} style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 14, width: "100%", boxSizing: "border-box" }} />
                )}
              </div>
            </>
          )}

          {isSuspended && (
            <p style={{ fontSize: 13, color: T.mid }}>
              Cet utilisateur est actuellement suspendu.{target.suspension_reason ? ` Raison: "${target.suspension_reason}"` : ""} Confirmer pour lever la suspension?
            </p>
          )}

          {error && <p style={{ color: T.red, fontSize: 12, marginTop: 8 }}>{error}</p>}
        </div>

        <div style={{ padding: "0 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, fontSize: 14, cursor: "pointer" }}>Annuler</button>
          <button onClick={submit} disabled={submitting} style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: isSuspended ? T.green : T.red, color: "#fff", fontSize: 14, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "..." : isSuspended ? "Lever la suspension" : "Suspendre"}
          </button>
        </div>
      </div>
    </div>
  );
}
