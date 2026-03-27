import React, { useEffect, useState } from "react";
import { ChangeLogEntry, fetchChangeLogs, CHANGE_TYPE_LABELS, CHANGE_TYPE_COLORS, ChangeType } from "./changeLogUtils";
import { T } from "../theme";
import { useLanguage } from "../i18n/LanguageContext";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("fr-CA", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

interface Props {
  entityType: string;
  entityId: string;
  refreshKey?: number;
}

export default function ChangeLogPanel({ entityType, entityId, refreshKey = 0 }: Props) {
  const [logs, setLogs] = useState<ChangeLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    setLoading(true);
    fetchChangeLogs(entityType, entityId).then(data => {
      setLogs(data);
      setLoading(false);
    });
  }, [entityType, entityId, refreshKey]);

  if (loading) {
    return (
      <div style={{ padding: "32px 0", textAlign: "center", color: T.textLight, fontSize: 13 }}>
        {t("changelog.loading")}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center", color: T.textLight, fontSize: 14 }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 10, opacity: 0.4 }}>
          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
        <div>{t("changelog.no_history")}</div>
      </div>
    );
  }

  const grouped = logs.reduce<Record<string, ChangeLogEntry[]>>((acc, log) => {
    const day = log.changed_at.slice(0, 10);
    if (!acc[day]) acc[day] = [];
    acc[day].push(log);
    return acc;
  }, {});

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      {Object.entries(grouped).map(([day, entries]) => (
        <div key={day} style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase",
            letterSpacing: 0.8, marginBottom: 10, paddingBottom: 6,
            borderBottom: `1px solid ${T.border}`,
          }}>
            {new Date(day + "T12:00:00").toLocaleDateString("fr-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {entries.map(log => {
              const typeColors = CHANGE_TYPE_COLORS[log.change_type as ChangeType] || CHANGE_TYPE_COLORS.field_edit;
              const typeLabel = CHANGE_TYPE_LABELS[log.change_type as ChangeType] || log.change_type;
              return (
                <div key={log.id} style={{
                  background: T.card, borderRadius: 10, padding: "12px 16px",
                  border: `1px solid ${T.border}`, display: "flex", gap: 14, alignItems: "flex-start",
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%", background: typeColors.color,
                    marginTop: 5, flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
                        background: typeColors.bg, color: typeColors.color,
                      }}>
                        {typeLabel}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                        {log.field_name}
                      </span>
                    </div>
                    {(log.old_value || log.new_value) && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        {log.old_value && (
                          <span style={{ fontSize: 12, background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: 4, fontFamily: "monospace", textDecoration: "line-through" }}>
                            {log.old_value}
                          </span>
                        )}
                        {log.old_value && log.new_value && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.textLight} strokeWidth="2">
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                        )}
                        {log.new_value && (
                          <span style={{ fontSize: 12, background: "#d1fae5", color: "#065f46", padding: "2px 8px", borderRadius: 4, fontFamily: "monospace" }}>
                            {log.new_value}
                          </span>
                        )}
                      </div>
                    )}
                    {log.note && (
                      <div style={{ fontSize: 12, color: T.textMid, fontStyle: "italic", marginBottom: 4 }}>
                        {log.note}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: T.textLight }}>
                      {log.changed_by} · {fmtDate(log.changed_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
