import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { T } from "../../theme";
import { useLanguage } from "../../i18n/LanguageContext";

interface Props {
  onSuccess: () => Promise<void>;
}

export default function StoreCodeEntry({ onSuccess }: Props) {
  const { profile } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async () => {
    if (!code.trim() || !profile) return;
    setLoading(true);
    setError("");

    const { data: store } = await supabase
      .from("stores")
      .select("store_code, store_name")
      .eq("store_code", code.toUpperCase().trim())
      .eq("is_active", true)
      .maybeSingle();

    if (!store) {
      setError(t("storecode.invalid"));
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        store_code: store.store_code,
        store_name: store.store_name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (updateError) {
      setError(t("storecode.update_error"));
      setLoading(false);
      return;
    }

    await onSuccess();
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: T.bg,
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{
        width: 420,
        maxWidth: "90vw",
        background: T.bgCard,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: "48px 36px",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={T.main} strokeWidth="2">
            <path d="M3 9l1-5h16l1 5" />
            <path d="M3 9c0 1.1.9 2 2 2s2-.9 2-2 .9 2 2 2 2-.9 2-2 .9 2 2 2 2-.9 2-2" />
            <rect x="5" y="11" width="14" height="10" rx="1" />
          </svg>
        </div>
        <h2 style={{ color: T.text, fontSize: 18, fontWeight: 800, marginBottom: 6, letterSpacing: "0.05em" }}>
          {t("storecode.title")}
        </h2>
        <p style={{ color: T.textMid, fontSize: 12, marginBottom: 28, lineHeight: 1.5 }}>
          {t("storecode.description")}
        </p>

        <input
          type="text"
          placeholder="ex: BSB, MTL01..."
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          style={{
            width: "100%",
            padding: "14px 16px",
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "inherit",
            letterSpacing: "0.12em",
            textAlign: "center",
            border: `1px solid ${error ? T.red : T.border}`,
            borderRadius: 10,
            background: T.bgInput,
            color: T.text,
            outline: "none",
            boxSizing: "border-box",
            marginBottom: 12,
          }}
          autoFocus
        />

        {error && (
          <p style={{ color: T.red, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !code.trim()}
          style={{
            width: "100%",
            padding: "14px 0",
            background: code.trim() ? T.main : T.border,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 800,
            fontFamily: "inherit",
            letterSpacing: "0.1em",
            cursor: code.trim() ? "pointer" : "not-allowed",
            opacity: loading ? 0.6 : 1,
            marginBottom: 20,
          }}
        >
          {loading ? t("storecode.verifying") : t("storecode.access")}
        </button>

        <p style={{ color: T.textLight, fontSize: 11, lineHeight: 1.5 }}>
          {t("storecode.no_code")}<br />
          {t("storecode.contact_admin")}
        </p>
      </div>
    </div>
  );
}
