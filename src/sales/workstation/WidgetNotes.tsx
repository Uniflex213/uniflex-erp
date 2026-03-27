import React, { useState, useEffect, useRef, useCallback } from "react";
import { T } from "./workstationTypes";
import { useUserPreferences } from "../../hooks/useUserPreferences";
import { useLanguage } from "../../i18n/LanguageContext";

export default function WidgetNotes() {
  const { t } = useLanguage();
  const { prefs, loaded, updatePref } = useUserPreferences();
  const [content, setContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load from Supabase prefs
  useEffect(() => {
    if (loaded && prefs.workstation_notes) setContent(prefs.workstation_notes);
  }, [loaded]);

  const save = useCallback((text: string) => {
    setSaveStatus("saving");
    updatePref('workstation_notes', text);
    setSaveStatus("saved");
  }, [updatePref]);

  useEffect(() => {
    if (!loaded) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveStatus("unsaved");
    debounceRef.current = setTimeout(() => save(content), 2000);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [content, save, loaded]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const next = content.substring(0, start) + "  " + content.substring(end);
      setContent(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  };

  const insertFormat = (before: string, after = before) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.substring(start, end);
    const next = content.substring(0, start) + before + selected + after + content.substring(end);
    setContent(next);
    requestAnimationFrame(() => {
      ta.selectionStart = start + before.length;
      ta.selectionEnd = end + before.length;
      ta.focus();
    });
  };

  return (
    <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: T.text }}>{t("ws.notes.title", "Mes notes & idées")}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {[
              { label: "B", action: () => insertFormat("**"), title: t("ws.notes.bold", "Gras") },
              { label: "I", action: () => insertFormat("_"), title: t("ws.notes.italic", "Italique") },
              { label: "•", action: () => insertFormat("\n• "), title: t("ws.notes.list", "Liste") },
            ].map(({ label, action, title }) => (
              <button
                key={label}
                title={title}
                onClick={action}
                style={{
                  width: 26, height: 26, border: `1px solid ${T.border}`, background: T.cardAlt,
                  borderRadius: 5, cursor: "pointer", fontSize: label === "B" ? 12 : 11,
                  fontWeight: label === "B" ? 900 : 600, fontStyle: label === "I" ? "italic" : "normal",
                  color: T.textMid, display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div style={{
            fontSize: 11, fontWeight: 700,
            color: saveStatus === "saved" ? T.green : saveStatus === "saving" ? T.orange : T.textLight,
          }}>
            {saveStatus === "saved" ? `✓ ${t("ws.notes.saved", "Sauvegardé")}` : saveStatus === "saving" ? t("ws.notes.saving", "Sauvegarde...") : t("ws.notes.unsaved", "Non sauvegardé")}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 10, color: T.textLight, marginBottom: 8, fontStyle: "italic" }}>
        {t("ws.notes.private", "Espace privé — visible uniquement par vous")}
      </div>

      <textarea
        ref={textareaRef}
        value={content}
        onChange={e => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("ws.notes.placeholder", "Vos notes, idées, numéros à rappeler, stratégies... Tout ce que vous voulez.")}
        style={{
          flex: 1,
          minHeight: 220,
          border: `1.5px solid ${T.border}`,
          borderRadius: 10,
          padding: "12px 14px",
          fontSize: 13,
          fontFamily: "'Outfit', sans-serif",
          lineHeight: 1.7,
          resize: "vertical",
          outline: "none",
          color: T.text,
          background: "#fafbff",
          transition: "border-color 0.2s",
        }}
        onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = T.main; }}
        onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = T.border; }}
      />
    </div>
  );
}
