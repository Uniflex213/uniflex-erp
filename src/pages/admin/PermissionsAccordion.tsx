import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, AlertTriangle, Shield, ShieldAlert } from "lucide-react";
import { T } from "../../theme";
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  PERMISSION_KEYS,
  PERMISSION_DEPENDENCIES,
  PERMISSION_RISK,
  PERMISSION_DESCRIPTIONS,
  PERMISSION_GROUP_DESCRIPTIONS,
  RISK_COLORS,
  RISK_LABELS,
  PRESET_VENDEUR,
  PRESET_MANUF,
  PRESET_MAGASIN,
  PRESET_ADMIN,
  PRESET_TEAM_LEADER,
  isPermissionVisible,
  cleanOrphanPermissions,
  autoAddParentPermissions,
  PermissionKey,
  RiskLevel,
} from "../../lib/permissions";

type Props = {
  selected: string[];
  onChange: (keys: string[]) => void;
};

const RISK_ORDER: RiskLevel[] = ["safe", "moderate", "sensitive", "critical"];

function getMaxRisk(keys: PermissionKey[]): RiskLevel {
  let max = 0;
  for (const k of keys) {
    const idx = RISK_ORDER.indexOf(PERMISSION_RISK[k] || "safe");
    if (idx > max) max = idx;
  }
  return RISK_ORDER[max];
}

function RiskDot({ risk, size = 8 }: { risk: RiskLevel; size?: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: RISK_COLORS[risk],
        flexShrink: 0,
      }}
    />
  );
}

export default function PermissionsAccordion({ selected, onChange }: Props) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const sel = selected as PermissionKey[];

  const toggle = (group: string) =>
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));

  const handleCheck = (key: PermissionKey, checked: boolean) => {
    if (checked) {
      let updated = [...sel, key];
      updated = autoAddParentPermissions(key, updated);
      onChange([...new Set(updated)]);
    } else {
      let updated = sel.filter((k) => k !== key);
      updated = cleanOrphanPermissions(updated);
      onChange(updated);
    }
  };

  const toggleGroup = (keys: PermissionKey[]) => {
    const visibleKeys = keys.filter((k) => isPermissionVisible(k, sel));
    const allOn = visibleKeys.every((k) => sel.includes(k));
    if (allOn) {
      let updated = sel.filter((k) => !keys.includes(k));
      updated = cleanOrphanPermissions(updated);
      onChange(updated);
    } else {
      let updated = [...new Set([...sel, ...keys])];
      onChange(updated);
    }
  };

  const applyPreset = (preset: PermissionKey[]) => {
    onChange([...preset]);
  };

  // Count risk levels in current selection
  const riskCounts = useMemo(() => {
    const counts: Record<RiskLevel, number> = { safe: 0, moderate: 0, sensitive: 0, critical: 0 };
    for (const k of sel) {
      const risk = PERMISSION_RISK[k as PermissionKey];
      if (risk) counts[risk]++;
    }
    return counts;
  }, [sel]);

  const presets = [
    { label: "Vendeur", preset: PRESET_VENDEUR, desc: `${PRESET_VENDEUR.length} perms` },
    { label: "Chef Équipe", preset: PRESET_TEAM_LEADER, desc: `${PRESET_TEAM_LEADER.length} perms` },
    { label: "Manuf", preset: PRESET_MANUF, desc: `${PRESET_MANUF.length} perms` },
    { label: "Magasin", preset: PRESET_MAGASIN, desc: `${PRESET_MAGASIN.length} perms` },
    { label: "Admin", preset: PRESET_ADMIN, desc: `${PRESET_ADMIN.length} perms` },
  ];

  return (
    <div>
      {/* Warning banners */}
      {riskCounts.critical > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", marginBottom: 12 }}>
          <ShieldAlert size={16} color="#ef4444" />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#ef4444" }}>
            {riskCounts.critical} permission{riskCounts.critical > 1 ? "s" : ""} critique{riskCounts.critical > 1 ? "s" : ""} sélectionnée{riskCounts.critical > 1 ? "s" : ""} — vérifiez attentivement
          </span>
        </div>
      )}
      {riskCounts.sensitive > 0 && riskCounts.critical === 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.25)", marginBottom: 12 }}>
          <AlertTriangle size={16} color="#f97316" />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#f97316" }}>
            {riskCounts.sensitive} permission{riskCounts.sensitive > 1 ? "s" : ""} sensible{riskCounts.sensitive > 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Header: count + presets */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Shield size={16} color={T.textMid} />
          <span style={{ fontSize: 13, color: T.textMid, fontWeight: 500 }}>
            <span style={{ color: "#111", fontWeight: 700 }}>{selected.length}</span> / {PERMISSION_KEYS.length} permissions
          </span>
          {/* Mini risk summary */}
          <div style={{ display: "flex", gap: 6, marginLeft: 4 }}>
            {(["safe", "moderate", "sensitive", "critical"] as RiskLevel[]).map((r) =>
              riskCounts[r] > 0 ? (
                <span key={r} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: RISK_COLORS[r], fontWeight: 600 }}>
                  <RiskDot risk={r} size={6} /> {riskCounts[r]}
                </span>
              ) : null
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {presets.map(({ label, preset, desc }) => {
            const maxRisk = getMaxRisk(preset);
            return (
              <button
                key={label}
                type="button"
                onClick={() => applyPreset(preset)}
                title={desc}
                style={{
                  fontSize: 11,
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: `1px solid ${T.border}`,
                  background: "rgba(0,0,0,0.03)",
                  color: T.text,
                  cursor: "pointer",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {label}
                <span style={{ fontSize: 9, color: T.textMid, fontWeight: 400 }}>({preset.length})</span>
                {maxRisk === "critical" && <span style={{ color: "#ef4444", fontSize: 10 }}>!</span>}
              </button>
            );
          })}
          <button type="button" onClick={() => onChange([])} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)", color: "#ef4444", cursor: "pointer", fontWeight: 600 }}>
            Effacer
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, marginBottom: 10, padding: "6px 10px", background: "rgba(0,0,0,0.02)", borderRadius: 6, border: `1px solid ${T.border}` }}>
        {(["safe", "moderate", "sensitive", "critical"] as RiskLevel[]).map((r) => (
          <div key={r} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: T.textMid }}>
            <RiskDot risk={r} size={7} />
            <span>{RISK_LABELS[r]}</span>
          </div>
        ))}
      </div>

      {/* Groups */}
      <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
        {Object.entries(PERMISSION_GROUPS).map(([group, keys], gi) => {
          const visibleKeys = keys.filter((k) => isPermissionVisible(k, sel));
          const parentKeys = keys.filter((k) => !PERMISSION_DEPENDENCIES[k]);
          const displayKeys =
            visibleKeys.length === 0 && parentKeys.length > 0
              ? parentKeys
              : visibleKeys.length > 0
              ? visibleKeys
              : parentKeys;

          if (displayKeys.length === 0) return null;

          const isOpen = openGroups[group] ?? false;
          const checkedCount = displayKeys.filter((k) => sel.includes(k)).length;
          const allChecked = displayKeys.length > 0 && checkedCount === displayKeys.length;
          const someChecked = checkedCount > 0 && !allChecked;
          const groupMaxRisk = getMaxRisk(keys);
          const checkedRisks = displayKeys.filter((k) => sel.includes(k));
          const hasCriticalChecked = checkedRisks.some((k) => PERMISSION_RISK[k] === "critical");
          const hasSensitiveChecked = checkedRisks.some((k) => PERMISSION_RISK[k] === "sensitive");
          const isAdminGroup = group.startsWith("Admin");

          return (
            <div key={group} style={{ borderTop: gi === 0 ? "none" : `1px solid ${T.border}` }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  background: hasCriticalChecked ? "rgba(239,68,68,0.04)" : hasSensitiveChecked ? "rgba(249,115,22,0.03)" : isOpen ? "rgba(0,0,0,0.03)" : "transparent",
                  cursor: "pointer",
                  userSelect: "none",
                }}
                onClick={() => toggle(group)}
              >
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = someChecked; }}
                  onChange={() => toggleGroup(keys)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ cursor: "pointer", accentColor: T.main }}
                />
                <RiskDot risk={groupMaxRisk} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{group}</div>
                  {PERMISSION_GROUP_DESCRIPTIONS[group] && (
                    <div style={{ fontSize: 10, color: T.textMid, marginTop: 1 }}>{PERMISSION_GROUP_DESCRIPTIONS[group]}</div>
                  )}
                </div>
                <span style={{ fontSize: 11, color: checkedCount > 0 ? T.main : T.textMid, fontWeight: checkedCount > 0 ? 700 : 400, marginRight: 4 }}>
                  {checkedCount}/{displayKeys.length}
                </span>
                {isOpen ? <ChevronDown size={14} color={T.textMid} /> : <ChevronRight size={14} color={T.textMid} />}
              </div>
              {isOpen && (
                <div style={{ padding: "4px 14px 14px 14px", background: isAdminGroup ? "rgba(239,68,68,0.02)" : "rgba(255,255,255,0.01)" }}>
                  {displayKeys.map((k) => {
                    const isChild = !!PERMISSION_DEPENDENCIES[k];
                    const risk = PERMISSION_RISK[k] || "safe";
                    const isChecked = sel.includes(k);
                    return (
                      <label
                        key={k}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          cursor: "pointer",
                          padding: "8px 8px 8px 4px",
                          marginLeft: isChild ? 24 : 0,
                          borderLeft: isChild ? `2px solid ${T.border}` : "none",
                          paddingLeft: isChild ? 12 : 4,
                          borderRadius: 6,
                          background: isChecked && (risk === "critical" || risk === "sensitive") ? `${RISK_COLORS[risk]}08` : "transparent",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleCheck(k, e.target.checked)}
                          style={{ cursor: "pointer", marginTop: 2, accentColor: T.main }}
                        />
                        <RiskDot risk={risk} size={8} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: T.text, lineHeight: 1.3 }}>
                            {PERMISSION_LABELS[k]}
                            {(risk === "critical") && (
                              <span style={{ fontSize: 9, fontWeight: 700, color: RISK_COLORS.critical, marginLeft: 6, padding: "1px 5px", borderRadius: 3, background: "rgba(239,68,68,0.1)", verticalAlign: "middle" }}>
                                CRITIQUE
                              </span>
                            )}
                            {(risk === "sensitive") && (
                              <span style={{ fontSize: 9, fontWeight: 700, color: RISK_COLORS.sensitive, marginLeft: 6, padding: "1px 5px", borderRadius: 3, background: "rgba(249,115,22,0.1)", verticalAlign: "middle" }}>
                                SENSIBLE
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 10, color: T.textMid, marginTop: 2, lineHeight: 1.4 }}>
                            {PERMISSION_DESCRIPTIONS[k]}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
