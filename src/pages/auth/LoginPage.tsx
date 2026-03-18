import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import { L } from "../../theme";
import TotpCodeInput from "../../components/auth/TotpCodeInput";
import SphereBackground from "../../components/SphereBackground";
import { COUNTRIES, PROVINCES } from "../../lib/vendeurCodeUtils";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const reqInputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 10,
  border: `1px solid ${L.border}`, fontSize: 13, color: L.text,
  background: "#fff", boxSizing: "border-box", outline: "none", fontFamily: "inherit",
  transition: "border-color 0.2s",
};

type Step = "vendeur_code" | "totp" | "enrollment_required";
type Props = { onBack: () => void };

export default function LoginPage({ onBack }: Props) {
  const [step, setStep] = useState<Step>("vendeur_code");
  const [vendeurCode, setVendeurCode] = useState("");
  const [totpValues, setTotpValues] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [fallbackEmail, setFallbackEmail] = useState("");
  const [fallbackSent, setFallbackSent] = useState(false);
  const [fallbackOtp, setFallbackOtp] = useState(["", "", "", "", "", ""]);

  const [showRequest, setShowRequest] = useState(false);
  const [reqForm, setReqForm] = useState({ full_name: "", email: "", phone: "", company: "", role_requested: "", message: "", store_code_requested: "", country: "CA", province: "QC", city: "" });
  const [reqLoading, setReqLoading] = useState(false);
  const [reqSuccess, setReqSuccess] = useState(false);
  const [reqError, setReqError] = useState("");

  const formatVendeurCode = (raw: string) => {
    const chars = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    let formatted = "";
    for (let i = 0; i < chars.length && i < 8; i++) {
      if (i === 2 || i === 5) formatted += ".";
      formatted += chars[i];
    }
    return formatted;
  };

  const handleNext = () => {
    const code = vendeurCode.trim().toUpperCase();
    if (!code) { setError("Entrez votre code utilisateur."); return; }
    setError("");
    setVendeurCode(code);
    setStep("totp");
  };

  const handleTotpComplete = async (code: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/totp-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
        body: JSON.stringify({ vendeur_code: vendeurCode, totp_code: code }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "totp_not_enrolled") {
          setStep("enrollment_required");
          setLoading(false);
          return;
        }
        setError(data.error || "Erreur de connexion");
        setTotpValues(["", "", "", "", "", ""]);
        setLoading(false);
        return;
      }

      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion.");
      setTotpValues(["", "", "", "", "", ""]);
      setLoading(false);
    }
  };

  const handleSendFallbackOtp = async () => {
    if (!fallbackEmail.trim()) { setError("Entrez votre courriel."); return; }
    setLoading(true); setError("");
    const { error: e } = await supabase.auth.signInWithOtp({ email: fallbackEmail.trim() });
    if (e) { setError("Erreur d'envoi. Vérifiez votre courriel."); }
    else { setFallbackSent(true); }
    setLoading(false);
  };

  const handleFallbackOtpComplete = async (code: string) => {
    setLoading(true); setError("");
    const { error: e } = await supabase.auth.verifyOtp({ email: fallbackEmail.trim(), token: code, type: "email" });
    if (e) { setError("Code incorrect ou expiré."); setFallbackOtp(["", "", "", "", "", ""]); }
    setLoading(false);
  };

  const submitRequest = async () => {
    if (!reqForm.full_name.trim() || !reqForm.email.trim()) { setReqError("Nom et courriel requis."); return; }
    setReqLoading(true); setReqError("");
    const { error: e } = await supabase.from("account_requests").insert({ ...reqForm, status: "pending" });
    if (e) setReqError("Erreur. Réessayez.");
    else setReqSuccess(true);
    setReqLoading(false);
  };

  // ── Shared styles ──
  const cardStyle: React.CSSProperties = {
    background: L.card,
    borderRadius: 20,
    padding: 32,
    border: `1px solid ${L.cardBorder}`,
    boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "14px 16px", borderRadius: 12,
    border: `1.5px solid ${L.border}`, fontSize: 20,
    fontWeight: 700, fontFamily: "'Inter', system-ui, sans-serif",
    color: L.text, background: L.bg,
    boxSizing: "border-box", outline: "none", letterSpacing: 3,
    transition: "border-color 0.2s ease", textAlign: "center" as const,
  };

  const btnPrimary: React.CSSProperties = {
    width: "100%", padding: "14px", borderRadius: 12,
    background: L.accent, color: L.accentText, border: "none",
    fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
    transition: "all 0.2s ease", letterSpacing: -0.14,
  };

  const linkBtn: React.CSSProperties = {
    fontSize: 12, color: L.textMuted, background: "none", border: "none",
    cursor: "pointer", fontFamily: "inherit", transition: "color 0.2s",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: L.bg,
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Inter', system-ui, sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <style>{`
        @keyframes loginFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes stepSlide {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .login-input:focus { border-color: ${L.text} !important; }
        .login-link:hover { color: ${L.text} !important; }
      `}</style>

      {/* Sphere */}
      <SphereBackground mode="light" size={700} opacity={0.85} style={{ right: -120, top: "50%", transform: "translateY(-50%)" }} />

      {/* Back button */}
      <div style={{ position: "relative", zIndex: 10, padding: "20px 40px" }}>
        <button
          className="login-link"
          onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: L.textMuted, fontSize: 13, fontWeight: 500, fontFamily: "inherit", transition: "color 0.2s" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          Retour
        </button>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 20px 40px", position: "relative", zIndex: 1 }}>
        <div style={{ width: "100%", maxWidth: 400, animation: "loginFadeIn 0.6s ease-out both" }}>

          {/* Logo + title */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
              <img src="/icons/icon-96x96.png" alt="Uniflex" style={{ width: 28, height: 28, borderRadius: 6 }} />
              <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.3, color: L.text }}>Uniflex</span>
            </div>
            {step === "vendeur_code" && (
              <>
                <h1 style={{ fontSize: 32, fontWeight: 800, color: L.text, margin: "0 0 6px", letterSpacing: -1.5 }}>Connexion</h1>
                <p style={{ fontSize: 14, color: L.textMid, margin: 0 }}>Entrez votre code utilisateur</p>
              </>
            )}
            {step === "totp" && (
              <>
                <h1 style={{ fontSize: 32, fontWeight: 800, color: L.text, margin: "0 0 6px", letterSpacing: -1.5 }}>Authentification</h1>
                <p style={{ fontSize: 14, color: L.textMid, margin: 0 }}>Code Google Authenticator</p>
              </>
            )}
            {step === "enrollment_required" && (
              <>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: L.text, margin: "0 0 6px", letterSpacing: -1 }}>Configuration requise</h1>
                <p style={{ fontSize: 14, color: L.textMid, margin: 0 }}>Google Authenticator non configuré</p>
              </>
            )}
          </div>

          {/* STEP 1 — Vendeur code */}
          {step === "vendeur_code" && (
            <div style={{ animation: "stepSlide 0.3s ease-out both" }}>
              <div style={cardStyle}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: L.textMuted, marginBottom: 8, letterSpacing: 0.8, textTransform: "uppercase" }}>
                  Code utilisateur
                </label>
                <input
                  className="login-input"
                  type="text"
                  value={vendeurCode}
                  onChange={e => { setVendeurCode(formatVendeurCode(e.target.value)); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleNext()}
                  placeholder="XX.XXX.000"
                  maxLength={10}
                  autoFocus
                  style={inputStyle}
                />

                {error && (
                  <div style={{ fontSize: 13, color: L.red, marginTop: 12, padding: "10px 14px", background: "rgba(220,38,38,0.06)", borderRadius: 10, border: "1px solid rgba(220,38,38,0.12)" }}>
                    {error}
                  </div>
                )}

                <button onClick={handleNext} style={{ ...btnPrimary, marginTop: 20 }}>
                  Continuer
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 6, verticalAlign: "middle" }}><polyline points="9 18 15 12 9 6" /></svg>
                </button>

                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <button className="login-link" onClick={() => setShowRequest(true)} style={linkBtn}>
                    Demander un accès
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — TOTP */}
          {step === "totp" && (
            <div style={{ animation: "stepSlide 0.3s ease-out both" }}>
              <div style={cardStyle}>
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <span style={{ display: "inline-block", padding: "5px 16px", borderRadius: 100, background: L.bgAlt, border: `1px solid ${L.border}`, color: L.text, fontSize: 13, fontWeight: 700, fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: 2 }}>
                    {vendeurCode}
                  </span>
                </div>

                <p style={{ fontSize: 13, color: L.textMid, textAlign: "center", marginBottom: 20, lineHeight: 1.6 }}>
                  Ouvrez <strong style={{ color: L.text }}>Google Authenticator</strong> et entrez le code à 6 chiffres
                </p>

                <TotpCodeInput values={totpValues} onChange={setTotpValues} onComplete={handleTotpComplete} disabled={loading} autoFocus lightMode />

                {error && (
                  <div style={{ fontSize: 13, color: L.red, marginTop: 16, padding: "10px 14px", background: "rgba(220,38,38,0.06)", borderRadius: 10, border: "1px solid rgba(220,38,38,0.12)", textAlign: "center" }}>
                    {error}
                  </div>
                )}

                {loading && (
                  <p style={{ textAlign: "center", color: L.textMuted, fontSize: 13, marginTop: 16 }}>Vérification...</p>
                )}

                <button
                  className="login-link"
                  onClick={() => { setStep("vendeur_code"); setTotpValues(["", "", "", "", "", ""]); setError(""); }}
                  style={{ ...linkBtn, display: "block", margin: "20px auto 0" }}
                >
                  ← Changer de code
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — Enrollment required */}
          {step === "enrollment_required" && (
            <div style={{ animation: "stepSlide 0.3s ease-out both" }}>
              <div style={{ ...cardStyle, borderColor: "rgba(217,119,6,0.2)" }}>
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <p style={{ fontSize: 14, color: L.textMid, lineHeight: 1.6, margin: 0 }}>
                    Configurez <strong style={{ color: L.text }}>Google Authenticator</strong> avant de continuer.
                  </p>
                  <p style={{ fontSize: 12, color: L.textMuted, marginTop: 10, lineHeight: 1.5 }}>
                    Connectez-vous par courriel pour configurer votre authentificateur.
                  </p>
                </div>

                {!fallbackSent ? (
                  <>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: L.textMuted, marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>Votre courriel</label>
                    <input
                      className="login-input"
                      type="email"
                      value={fallbackEmail}
                      onChange={e => { setFallbackEmail(e.target.value); setError(""); }}
                      onKeyDown={e => e.key === "Enter" && handleSendFallbackOtp()}
                      placeholder="votre@courriel.com"
                      style={{ ...inputStyle, fontSize: 14, letterSpacing: 0, textAlign: "left" as const, fontFamily: "inherit", fontWeight: 500 }}
                    />
                    {error && (
                      <div style={{ fontSize: 13, color: L.red, marginTop: 10, padding: "10px 14px", background: "rgba(220,38,38,0.06)", borderRadius: 10 }}>{error}</div>
                    )}
                    <button
                      onClick={handleSendFallbackOtp}
                      disabled={loading}
                      style={{ ...btnPrimary, marginTop: 14, background: "#d97706", opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer" }}
                    >
                      {loading ? "Envoi..." : "Envoyer le code par courriel"}
                    </button>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 13, color: L.textMid, textAlign: "center", marginBottom: 16 }}>
                      Code envoyé à <strong style={{ color: L.text }}>{fallbackEmail}</strong>
                    </p>
                    <TotpCodeInput values={fallbackOtp} onChange={setFallbackOtp} onComplete={handleFallbackOtpComplete} disabled={loading} autoFocus lightMode />
                    {error && (
                      <div style={{ fontSize: 13, color: L.red, marginTop: 12, padding: "10px 14px", background: "rgba(220,38,38,0.06)", borderRadius: 10, textAlign: "center" }}>{error}</div>
                    )}
                  </>
                )}

                <button
                  className="login-link"
                  onClick={() => { setStep("vendeur_code"); setError(""); setFallbackEmail(""); setFallbackSent(false); setFallbackOtp(["", "", "", "", "", ""]); }}
                  style={{ ...linkBtn, display: "block", margin: "16px auto 0" }}
                >
                  ← Retour
                </button>
              </div>
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: 20 }}>
            <span style={{ fontSize: 11, color: L.textMuted }}>© {new Date().getFullYear()} Uniflex Distribution Inc.</span>
          </div>
        </div>
      </div>

      {/* Request access modal */}
      {showRequest && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 20 }}>
          <div style={{ background: L.card, borderRadius: 20, width: "100%", maxWidth: 480, padding: 32, boxShadow: "0 24px 60px rgba(0,0,0,0.12)", border: `1px solid ${L.cardBorder}` }}>
            {reqSuccess ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(22,163,74,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: L.text, marginBottom: 8 }}>Demande envoyée</h3>
                <p style={{ fontSize: 13, color: L.textMid, marginBottom: 24 }}>Notre équipe examinera votre demande sous peu.</p>
                <button onClick={() => { setShowRequest(false); setReqSuccess(false); setReqForm({ full_name: "", email: "", phone: "", company: "", role_requested: "", message: "", store_code_requested: "", country: "CA", province: "QC", city: "" }); }}
                  style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: L.accent, color: L.accentText, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Fermer
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: L.text, margin: 0 }}>Demande d'accès</h3>
                  <button onClick={() => setShowRequest(false)} style={{ border: "none", background: "none", cursor: "pointer", color: L.textMuted, padding: 4 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={{ fontSize: 11, fontWeight: 600, color: L.textMuted, display: "block", marginBottom: 4, letterSpacing: 0.3 }}>Nom complet *</label><input value={reqForm.full_name} onChange={e => setReqForm(f => ({ ...f, full_name: e.target.value }))} style={reqInputStyle} /></div>
                    <div><label style={{ fontSize: 11, fontWeight: 600, color: L.textMuted, display: "block", marginBottom: 4, letterSpacing: 0.3 }}>Courriel *</label><input type="email" value={reqForm.email} onChange={e => setReqForm(f => ({ ...f, email: e.target.value }))} style={reqInputStyle} /></div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={{ fontSize: 11, fontWeight: 600, color: L.textMuted, display: "block", marginBottom: 4 }}>Téléphone</label><input value={reqForm.phone} onChange={e => setReqForm(f => ({ ...f, phone: e.target.value }))} style={reqInputStyle} /></div>
                    <div><label style={{ fontSize: 11, fontWeight: 600, color: L.textMuted, display: "block", marginBottom: 4 }}>Entreprise</label><input value={reqForm.company} onChange={e => setReqForm(f => ({ ...f, company: e.target.value }))} style={reqInputStyle} /></div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: L.textMuted, display: "block", marginBottom: 4 }}>Rôle demandé</label>
                    <select value={reqForm.role_requested} onChange={e => setReqForm(f => ({ ...f, role_requested: e.target.value, store_code_requested: "" }))} style={{ ...reqInputStyle, background: "#fff" }}>
                      <option value="">-- Sélectionner --</option>
                      <option value="vendeur_autonome">Vendeur Autonome</option>
                      <option value="vendeur_equipe">Vendeur Avec Équipe</option>
                      <option value="magasin">Magasin</option>
                    </select>
                  </div>
                  {reqForm.role_requested === "magasin" && (
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: L.textMuted, display: "block", marginBottom: 4 }}>Code magasin (optionnel)</label>
                      <input value={reqForm.store_code_requested} onChange={e => setReqForm(f => ({ ...f, store_code_requested: e.target.value.toUpperCase() }))} placeholder="ex: BSB, MTL01..." style={reqInputStyle} />
                    </div>
                  )}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: L.textMuted, display: "block", marginBottom: 4 }}>Zone</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      <select value={reqForm.country} onChange={e => setReqForm(f => ({ ...f, country: e.target.value, province: PROVINCES[e.target.value]?.[0]?.code || "" }))} style={{ ...reqInputStyle, background: "#fff" }}>
                        {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                      </select>
                      <select value={reqForm.province} onChange={e => setReqForm(f => ({ ...f, province: e.target.value }))} style={{ ...reqInputStyle, background: "#fff" }}>
                        <option value="">— Province —</option>
                        {(PROVINCES[reqForm.country] || []).map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
                      </select>
                      <input value={reqForm.city} onChange={e => setReqForm(f => ({ ...f, city: e.target.value }))} placeholder="Ville" style={reqInputStyle} />
                    </div>
                  </div>
                  <div><label style={{ fontSize: 11, fontWeight: 600, color: L.textMuted, display: "block", marginBottom: 4 }}>Message</label><textarea value={reqForm.message} onChange={e => setReqForm(f => ({ ...f, message: e.target.value }))} rows={3} style={{ ...reqInputStyle, resize: "none" }} placeholder="Expliquez brièvement..." /></div>
                </div>
                {reqError && <p style={{ color: L.red, fontSize: 12, marginTop: 10 }}>{reqError}</p>}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                  <button onClick={() => setShowRequest(false)} style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${L.border}`, background: L.card, color: L.text, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
                  <button onClick={submitRequest} disabled={reqLoading} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: L.accent, color: L.accentText, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    {reqLoading ? "Envoi..." : "Envoyer"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
