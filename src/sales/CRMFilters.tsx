import React from "react";
import { REGIONS, Stage, Temperature, LeadType } from "./crmTypes";
import { useTeamAgents } from "../hooks/useAgents";
import { useLanguage } from "../i18n/LanguageContext";
import { T } from "../theme";

export interface CRMFilters {
  search: string;
  stage: string;
  temperature: string;
  agent: string;
  region: string;
  type: string;
  dateFrom: string;
  dateTo: string;
  valueMin: string;
  valueMax: string;
}

export const DEFAULT_FILTERS: CRMFilters = {
  search: "", stage: "", temperature: "", agent: "", region: "",
  type: "", dateFrom: "", dateTo: "", valueMin: "", valueMax: "",
};

interface Props {
  filters: CRMFilters;
  onChange: (f: CRMFilters) => void;
  view: "board" | "list";
  onViewChange: (v: "board" | "list") => void;
  totalCount?: number;
  filteredCount?: number;
}

const selectStyle: React.CSSProperties = {
  height: 36, borderRadius: 8, border: `1px solid ${T.border}`,
  background: T.card, color: T.text, fontSize: 13, padding: "0 10px",
  outline: "none", cursor: "pointer", fontFamily: "inherit",
};

const inputStyle: React.CSSProperties = {
  ...selectStyle, padding: "0 12px 0 32px",
};

const stages: Stage[] = ["Nouveau Lead", "Premier Contact", "Qualification", "Proposition Envoyée", "Négociation", "Fermé Gagné", "Fermé Perdu"];
const temps: Temperature[] = ["Hot", "Warm", "Cold"];
const types: LeadType[] = ["Installateur", "Distributeur", "Large Scale"];
const tempLabels: Record<Temperature, string> = { Hot: "🔥 Hot", Warm: "⚡ Warm", Cold: "❄️ Cold" };

export default function CRMFilterBar({ filters, onChange, view, onViewChange, totalCount, filteredCount }: Props) {
  const { t } = useLanguage();
  const agents = useTeamAgents();
  const set = (key: keyof CRMFilters, val: string) => onChange({ ...filters, [key]: val });

  const FILTER_LABELS: Partial<Record<keyof CRMFilters, (val: string) => string>> = {
    stage: v => `${t("crm.stage_detail", "Étape")}: ${v}`,
    temperature: v => `Temp: ${tempLabels[v as Temperature] || v}`,
    agent: v => `${t("agent", "Agent")}: ${agents.find(a => a.id === v)?.name || v}`,
    region: v => `${t("crm.region", "Région")}: ${v}`,
    type: v => `${t("type", "Type")}: ${v}`,
    dateFrom: v => `${t("crm.creation_from", "Depuis")}: ${v}`,
    dateTo: v => `${t("crm.creation_until", "Jusqu'à")}: ${v}`,
    valueMin: v => `Val. min: ${v}$`,
    valueMax: v => `Val. max: ${v}$`,
    search: v => `${t("crm.search_filter", "Recherche")}: "${v}"`,
  };

  const activeChips = Object.entries(filters)
    .filter(([, v]) => v !== "")
    .map(([key, val]) => ({
      key: key as keyof CRMFilters,
      label: FILTER_LABELS[key as keyof CRMFilters]?.(val) || `${key}: ${val}`,
    }));

  const hasActive = activeChips.length > 0;
  const showingFiltered = hasActive && typeof totalCount === "number" && typeof filteredCount === "number";

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.textLight, fontSize: 13, pointerEvents: "none" }}>🔍</span>
          <input
            value={filters.search}
            onChange={e => set("search", e.target.value)}
            placeholder={t("crm.company_or_contact", "Compagnie ou contact...")}
            style={{ ...inputStyle, width: 200 }}
          />
        </div>

        <select value={filters.stage} onChange={e => set("stage", e.target.value)} style={selectStyle}>
          <option value="">{t("crm.stage_all", "Étape: Toutes")}</option>
          {stages.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={filters.temperature} onChange={e => set("temperature", e.target.value)} style={selectStyle}>
          <option value="">{t("crm.temperature_all", "Température: Toutes")}</option>
          {temps.map(tp => <option key={tp} value={tp}>{tempLabels[tp]}</option>)}
        </select>

        <select value={filters.agent} onChange={e => set("agent", e.target.value)} style={selectStyle}>
          <option value="">{t("crm.agent_all", "Agent: Tous")}</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        <select value={filters.region} onChange={e => set("region", e.target.value)} style={selectStyle}>
          <option value="">{t("crm.region_all", "Région: Toutes")}</option>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <select value={filters.type} onChange={e => set("type", e.target.value)} style={selectStyle}>
          <option value="">{t("crm.type_all", "Type: Tous")}</option>
          {types.map(tp => <option key={tp} value={tp}>{tp}</option>)}
        </select>

        <input
          type="date" value={filters.dateFrom} onChange={e => set("dateFrom", e.target.value)}
          title={t("crm.creation_from", "Création: Depuis")}
          style={{ ...selectStyle, padding: "0 8px", fontSize: 12 }}
        />
        <input
          type="date" value={filters.dateTo} onChange={e => set("dateTo", e.target.value)}
          title={t("crm.creation_until", "Création: Jusqu'à")}
          style={{ ...selectStyle, padding: "0 8px", fontSize: 12 }}
        />

        <input
          type="number" placeholder={t("crm.val_min", "Val. min $")} value={filters.valueMin}
          onChange={e => set("valueMin", e.target.value)}
          style={{ ...inputStyle, width: 90, padding: "0 8px" }}
        />
        <input
          type="number" placeholder={t("crm.val_max", "Val. max $")} value={filters.valueMax}
          onChange={e => set("valueMax", e.target.value)}
          style={{ ...inputStyle, width: 90, padding: "0 8px" }}
        />

        {hasActive && (
          <button
            onClick={() => onChange(DEFAULT_FILTERS)}
            style={{
              height: 36, borderRadius: 8, border: `1px solid ${T.red}`,
              background: "rgba(239,68,68,0.08)", color: T.red,
              fontSize: 13, padding: "0 12px", cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            ✕ {t("crm.reset_filters", "Réinitialiser")}
            <span style={{ background: T.red, color: "#fff", borderRadius: 10, padding: "0 6px", fontSize: 11, fontWeight: 700 }}>
              {activeChips.length}
            </span>
          </button>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 4, background: T.bg, borderRadius: 8, padding: 3, border: `1px solid ${T.border}` }}>
          {(["board", "list"] as const).map(v => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              title={v === "board" ? t("crm.kanban_view", "Vue Kanban") : t("crm.list_view", "Vue Liste")}
              style={{
                height: 30, width: 36, borderRadius: 6, border: "none", cursor: "pointer",
                background: view === v ? T.main : "transparent",
                color: view === v ? "#fff" : T.textLight,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s", fontSize: 14,
              }}
            >
              {v === "board"
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              }
            </button>
          ))}
        </div>
      </div>

      {(hasActive || showingFiltered) && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {showingFiltered && (
            <span style={{ fontSize: 12, color: T.textLight, fontWeight: 500 }}>
              {t("crm.results_count", "Résultats")} : <strong style={{ color: T.main }}>{filteredCount}</strong> lead{filteredCount !== 1 ? "s" : ""} sur {totalCount}
            </span>
          )}
          {activeChips.map(({ key, label }) => (
            <span
              key={key}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                background: `${T.main}12`, color: T.main, borderRadius: 20,
                padding: "3px 10px 3px 10px", fontSize: 12, fontWeight: 600,
                border: `1px solid ${T.main}30`,
              }}
            >
              {label}
              <button
                onClick={() => set(key, "")}
                style={{
                  background: "none", border: "none", cursor: "pointer", color: T.main,
                  padding: 0, fontSize: 14, lineHeight: 1, display: "flex", alignItems: "center",
                  opacity: 0.6,
                }}
                title={`${t("crm.remove_filter", "Retirer")} ${label}`}
              >×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
