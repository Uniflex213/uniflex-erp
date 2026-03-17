import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { T } from "../../theme";

interface Props {
  onSuccess: () => Promise<void>;
}

export default function StoreCodeEntry({ onSuccess }: Props) {
  const { profile } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      setError("Code magasin invalide. Vérifiez avec votre administrateur.");
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
      setError("Erreur lors de la mise à jour du profil.");
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
          ACCÈS MAGASIN
        </h2>
        <p style={{ color: T.textMid, fontSize: 12, marginBottom: 28, lineHeight: 1.5 }}>
          Entrez votre code magasin pour accéder aux données de votre point de vente.
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
          {loading ? "Vérification..." : "ACCÉDER AU MAGASIN"}
        </button>

        <p style={{ color: T.textLight, fontSize: 11, lineHeight: 1.5 }}>
          Vous n'avez pas de code ?<br />
          Contactez votre administrateur.
        </p>
      </div>
    </div>
  );
}
