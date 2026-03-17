import { useMemo } from "react";
import { CRMLead } from "../crmTypes";
import { SampleRequest } from "../sampleTypes";
import { T } from "./workstationTypes";

interface Props {
  leads: CRMLead[];
  samples: SampleRequest[];
}

export default function WidgetSamples({ leads, samples }: Props) {
  const now = new Date();

  const active = samples.filter(s => !["Follow-up complété", "Rejeté"].includes(s.status));
  const pending = samples.filter(s => s.status === "En attente d'approbation").length;
  const sent = samples.filter(s => s.status === "Envoyé").length;
  const followUpRequired = samples.filter(s =>
    s.status === "Follow-up requis" || (s.status === "Livré" && s.timer_expires_at && new Date(s.timer_expires_at) < now)
  ).length;

  return (
    <div style={{
      background: T.card, borderRadius: 16, border: `1.5px solid rgba(212,160,23,0.35)`,
      padding: "16px 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      paddingTop: 24,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#d4a017", textTransform: "uppercase", letterSpacing: 0.5 }}>📦 Mes Samples</div>
        </div>
        <div style={{ fontSize: 32, fontWeight: 900, color: "#d4a017", lineHeight: 1 }}>{active.length}</div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, background: "rgba(245,158,11,0.08)", borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ fontSize: 10, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>En attente</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: T.orange }}>{pending}</div>
        </div>
        <div style={{ flex: 1, background: "rgba(59,130,246,0.08)", borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ fontSize: 10, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Envoyés</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: T.blue }}>{sent}</div>
        </div>
        <div style={{ flex: 1, background: followUpRequired > 0 ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)", borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ fontSize: 10, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Follow-up</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: followUpRequired > 0 ? T.red : T.green, animation: followUpRequired > 0 ? "pulse 1.5s infinite" : "none" }}>{followUpRequired}</div>
        </div>
      </div>

      {active.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {active.slice(0, 3).map(s => {
            const statusColors: Record<string, string> = { "En attente d'approbation": T.orange, "Envoyé": T.blue, "Livré": T.green, "Follow-up requis": T.red };
            const color = statusColors[s.status] || T.textMid;
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, background: T.cardAlt }}>
                <div style={{ flex: 1, fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.company_name || "—"}</div>
                <span style={{ background: `${color}18`, color, borderRadius: 6, padding: "1px 6px", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{s.status}</span>
              </div>
            );
          })}
          {active.length > 3 && (
            <div style={{ fontSize: 11, color: T.textLight, textAlign: "center", paddingTop: 4 }}>+{active.length - 3} autres</div>
          )}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: T.textLight, textAlign: "center", padding: "12px 0" }}>Aucun sample actif</div>
      )}
    </div>
  );
}
