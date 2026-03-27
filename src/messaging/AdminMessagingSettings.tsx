import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { MessagingRule, ALL_ROLES, ROLE_LABELS, ROLE_COLORS } from "./messagingTypes";
import { T } from "../theme";
import { useLanguage } from "../i18n/LanguageContext";

interface ToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

function Toggle({ value, onChange, disabled }: ToggleProps) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      style={{
        width: 40, height: 22, borderRadius: 11, border: "none", cursor: disabled ? "default" : "pointer",
        background: value ? T.main : "#d1d5db", position: "relative", transition: "background 0.2s", flexShrink: 0, opacity: disabled ? 0.4 : 1,
      }}
    >
      <span style={{
        position: "absolute", top: 2, left: value ? 20 : 2, width: 18, height: 18,
        borderRadius: "50%", background: T.bgCard, transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

export default function AdminMessagingSettings() {
  const { t } = useLanguage();
  const [rules, setRules] = useState<MessagingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    const { data } = await supabase.from("messaging_rules").select("*").order("source_role").order("target_role");
    setRules((data as MessagingRule[]) ?? []);
    setLoading(false);
  };

  const getRule = (src: string, tgt: string): MessagingRule | undefined =>
    rules.find(r => r.source_role === src && r.target_role === tgt);

  const handleToggle = async (source_role: string, target_role: string, newValue: boolean) => {
    const key = `${source_role}_${target_role}`;
    setSaving(key);
    const existing = getRule(source_role, target_role);

    if (existing) {
      await supabase.from("messaging_rules").update({ can_message: newValue }).eq("id", existing.id);
      setRules(prev => prev.map(r => r.id === existing.id ? { ...r, can_message: newValue } : r));
    } else {
      const { data } = await supabase.from("messaging_rules").insert({ source_role, target_role, can_message: newValue }).select("*").single();
      if (data) setRules(prev => [...prev, data as MessagingRule]);
    }
    setSaving(null);
  };

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto", fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.text }}>{t("msgadmin.title")}</h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: T.textMid }}>
          {t("msgadmin.description")}
        </p>
      </div>

      <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, background: "#f8f9fb", display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.main} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{t("msgadmin.permissions_matrix")}</span>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: T.textMid, fontSize: 13 }}>{t("loading_dots")}</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${T.border}`, background: "#f8f9fb" }}>
                    {t("msgadmin.sender_receiver")}
                  </th>
                  {ALL_ROLES.map(role => {
                    const rc = ROLE_COLORS[role];
                    return (
                      <th key={role} style={{ padding: "10px 16px", textAlign: "center", fontSize: 11, fontWeight: 700, borderBottom: `1px solid ${T.border}`, background: "#f8f9fb", minWidth: 110 }}>
                        <span style={{ display: "inline-block", background: rc.bg, color: rc.color, borderRadius: 5, padding: "3px 9px", fontSize: 11, fontWeight: 700 }}>
                          {ROLE_LABELS[role]}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {ALL_ROLES.map((srcRole, ri) => {
                  const rc = ROLE_COLORS[srcRole];
                  return (
                    <tr key={srcRole} style={{ background: ri % 2 === 0 ? "#fff" : "#fafbfc" }}>
                      <td style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}` }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: rc.bg, color: rc.color, borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>
                          {ROLE_LABELS[srcRole]}
                        </span>
                      </td>
                      {ALL_ROLES.map(tgtRole => {
                        const rule = getRule(srcRole, tgtRole);
                        const enabled = rule?.can_message ?? false;
                        const key = `${srcRole}_${tgtRole}`;
                        return (
                          <td key={tgtRole} style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}`, textAlign: "center" }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                              <Toggle
                                value={enabled}
                                onChange={(v) => handleToggle(srcRole, tgtRole, v)}
                                disabled={saving === key}
                              />
                              <span style={{ fontSize: 10, color: enabled ? T.green : T.textLight, fontWeight: 600 }}>
                                {saving === key ? "..." : enabled ? t("msgadmin.allowed") : t("msgadmin.blocked")}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, background: "#f8f9fb", display: "flex", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.textMid }}>
            <span style={{ width: 20, height: 12, borderRadius: 6, background: T.main, display: "inline-block" }} />
            {t("msgadmin.can_send")}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.textMid }}>
            <span style={{ width: 20, height: 12, borderRadius: 6, background: "#d1d5db", display: "inline-block" }} />
            {t("msgadmin.blocked")}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: "12px 16px", background: "#eff6ff", borderRadius: 10, border: "1px solid #bfdbfe", fontSize: 13, color: "#1d4ed8" }}>
        <strong>Note :</strong> {t("msgadmin.note")}
      </div>
    </div>
  );
}
