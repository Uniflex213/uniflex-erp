import React, { useState, useEffect } from "react";
import { X, Copy, Check, RefreshCw, Shield, Mail, Send, Eye, EyeOff } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import PermissionsAccordion from "./PermissionsAccordion";
import { CreateUserPayload, PlatformTeam } from "./adminTypes";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../supabaseClient";
import { T } from "../../theme";
import { generateVendeurCode, getZoneCode, COUNTRIES, PROVINCES } from "../../lib/vendeurCodeUtils";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

function generatePassword(): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

type Props = {
  teams: PlatformTeam[];
  onClose: () => void;
  onCreated: () => void;
  prefill?: { full_name?: string; email?: string; role_requested?: string; requestId?: string; country?: string; province?: string; city?: string };
};

const STEPS = ["Informations", "Compte & Accès", "Permissions", "Authentification"];

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`,
  fontSize: 14, color: T.text, outline: "none", boxSizing: "border-box",
};
const selectStyle: React.CSSProperties = { ...inputStyle, background: T.bgCard };

function Field({ label, value, onChange, type = "text", placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: T.mid, display: "block", marginBottom: 4 }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  );
}

export default function CreateUserModal({ teams, onClose, onCreated, prefill }: Props) {
  const { session } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Step 4 — TOTP enrollment after creation
  const [createdUserId, setCreatedUserId] = useState("");
  const [otpauthUri, setOtpauthUri] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  const nameParts = (prefill?.full_name || "").split(" ");
  const [firstName, setFirstName] = useState(nameParts[0] || "");
  const [lastName, setLastName] = useState(nameParts.slice(1).join(" ") || "");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [role, setRole] = useState<CreateUserPayload["role"]>(() => {
    const req = prefill?.role_requested;
    if (req === "vendeur_autonome" || req === "vendeur_equipe") return "vendeur";
    return (req as CreateUserPayload["role"]) || "vendeur";
  });
  const [teamId, setTeamId] = useState("");
  const [email, setEmail] = useState(prefill?.email || "");
  const [username, setUsername] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [country, setCountry] = useState(prefill?.country || "CA");
  const [province, setProvince] = useState(prefill?.province || "QC");
  const [city, setCity] = useState(prefill?.city || "");
  const [vendeurCode, setVendeurCode] = useState("");
  const [regionCode, setRegionCode] = useState("");
  const [, setCodeUnique] = useState(true);

  // Store selection for magasin role
  const [stores, setStores] = useState<{ store_code: string; store_name: string }[]>([]);
  const [selectedStoreCode, setSelectedStoreCode] = useState("");
  const [newStoreCode, setNewStoreCode] = useState("");
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreCity, setNewStoreCity] = useState("");

  useEffect(() => {
    supabase.from("stores").select("store_code, store_name").eq("is_active", true).order("store_name").then(({ data }) => {
      if (data) setStores(data);
    });
  }, []);

  useEffect(() => {
    if (firstName && lastName) {
      const code = generateVendeurCode(firstName, lastName, province || "QC", city || "X");
      setVendeurCode(code);
      setRegionCode(getZoneCode(province || "QC", city || "X"));
      setCodeUnique(true);
    }
  }, [firstName, lastName, province, city]);

  const suggestEmail = () => {
    if (!firstName && !lastName) return "";
    return `${firstName.toLowerCase().replace(/\s/g, "")}.${lastName.toLowerCase().replace(/\s/g, "")}@uniflexdistribution.com`;
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const next = () => {
    if (step === 0 && (!firstName.trim() || !lastName.trim() || !role)) { setError("Prénom, nom et rôle requis."); return; }
    if (step === 1 && !email.trim()) { setError("Courriel requis."); return; }
    setError("");
    setStep((s) => s + 1);
  };

  const sendWelcomeEmail = async (uid: string, oauthUri: string, secret: string) => {
    setEmailSending(true); setEmailError("");
    try {
      const token = session?.access_token;
      if (!token) throw new Error("Session expirée — reconnectez-vous.");

      // Auto-retry TOTP enrollment if missing
      let uri = oauthUri;
      let sec = secret;
      if (!uri || !sec) {
        const enrollRes = await fetch(`${SUPABASE_URL}/functions/v1/totp-enroll`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "apikey": SUPABASE_ANON_KEY },
          body: JSON.stringify({ target_user_id: uid }),
        });
        const enrollData = await enrollRes.json();
        if (enrollRes.ok && enrollData.otpauth_uri) {
          uri = enrollData.otpauth_uri;
          sec = enrollData.secret;
          setOtpauthUri(uri);
          setTotpSecret(sec);
        } else {
          throw new Error(`TOTP non généré (HTTP ${enrollRes.status}) — ${enrollData.error || JSON.stringify(enrollData)}`);
        }
      }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-welcome-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "apikey": SUPABASE_ANON_KEY },
        body: JSON.stringify({
          full_name: `${firstName} ${lastName}`,
          email: email.trim().toLowerCase(),
          vendeur_code: vendeurCode || null,
          role,
          otpauth_uri: uri,
          secret: sec,
        }),
      });
      let d: Record<string, unknown>;
      try { d = await res.json(); } catch { d = { error: `Réponse invalide du serveur (HTTP ${res.status})` }; }
      if (!res.ok) setEmailError((d.error as string) || `Erreur d'envoi email (HTTP ${res.status})`);
      else setEmailSent(true);
    } catch (e) {
      console.error("sendWelcomeEmail error:", e);
      setEmailError(e instanceof Error ? e.message : "Erreur réseau lors de l'envoi.");
    } finally {
      setEmailSending(false);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, is_active, full_name")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();
      if (existingProfile) {
        throw new Error(
          existingProfile.is_active
            ? `Un utilisateur actif avec le courriel ${email} existe déjà (${existingProfile.full_name}).`
            : `Un utilisateur désactivé avec ce courriel existe déjà (${existingProfile.full_name}). Réactivez-le plutôt que d'en créer un nouveau.`
        );
      }
      const throwawayPassword = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      const payload: CreateUserPayload = {
        firstName, lastName, email, password: throwawayPassword, username,
        phone, jobTitle, role, teamId, permissions,
        requestId: prefill?.requestId,
      };
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/admin-create-user`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la création.");

      const userId: string = data.userId || data.user?.id || "";

      // Update vendeur_code / region_code on the new profile
      if (vendeurCode) {
        const profileUpdate: Record<string, unknown> = { vendeur_code: vendeurCode, region_code: regionCode };
        if (role === "vendeur" || role === "admin") profileUpdate.commission_rate = 0.05;
        await supabase
          .from("profiles")
          .update(profileUpdate)
          .eq("email", email.trim().toLowerCase());
      }

      // Assign store_code for magasin users
      if (role === "magasin" && selectedStoreCode) {
        let storeCode = selectedStoreCode;
        let storeName = stores.find(s => s.store_code === selectedStoreCode)?.store_name || "";
        if (selectedStoreCode === "__new__" && newStoreCode.trim() && newStoreName.trim()) {
          await supabase.from("stores").insert({
            store_code: newStoreCode.toUpperCase().trim(),
            store_name: newStoreName.trim(),
            store_city: newStoreCity.trim() || null,
          });
          storeCode = newStoreCode.toUpperCase().trim();
          storeName = newStoreName.trim();
        }
        if (storeCode !== "__new__") {
          await supabase
            .from("profiles")
            .update({ store_code: storeCode, store_name: storeName })
            .eq("email", email.trim().toLowerCase());
        }
      }

      // Generate TOTP for the new user (retry once on failure)
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const enrollRes = await fetch(`${SUPABASE_URL}/functions/v1/totp-enroll`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}`, "apikey": SUPABASE_ANON_KEY },
            body: JSON.stringify({ target_user_id: userId }),
          });
          const enrollData = await enrollRes.json();
          if (enrollRes.ok && enrollData.otpauth_uri) {
            setOtpauthUri(enrollData.otpauth_uri);
            setTotpSecret(enrollData.secret);
            break;
          }
          console.warn(`TOTP enroll attempt ${attempt + 1} failed (HTTP ${enrollRes.status}):`, enrollData);
        } catch (e) {
          if (attempt === 1) console.warn("TOTP enroll error:", e);
        }
        if (attempt === 0) await new Promise(r => setTimeout(r, 1000));
      }

      setCreatedUserId(userId);
      setSuccess(true);
      setStep(3);
      onCreated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 4 content is rendered inline in the form (no early return needed)

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: T.bgCard, borderRadius: 16, width: step === 2 ? 680 : step === 3 ? 560 : 480, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>Créer un utilisateur</h2>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer" }}><X size={18} /></button>
        </div>

        <div style={{ padding: "12px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", gap: 8, flexShrink: 0 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: i <= step ? T.main : "#e5e7eb", color: i <= step ? "#fff" : "#9ca3af", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {i + 1}
              </div>
              <span style={{ fontSize: 12, fontWeight: i === step ? 600 : 400, color: i === step ? T.text : T.mid }}>{s}</span>
              {i < STEPS.length - 1 && <div style={{ width: 24, height: 1, background: "rgba(0,0,0,0.04)", marginLeft: 4 }} />}
            </div>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {step === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Prénom *" value={firstName} onChange={setFirstName} />
                <Field label="Nom *" value={lastName} onChange={setLastName} />
              </div>
              <Field label="Téléphone" value={phone} onChange={setPhone} type="tel" />
              <Field label="Titre / poste" value={jobTitle} onChange={setJobTitle} />
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.mid, display: "block", marginBottom: 4 }}>Rôle *</label>
                <select value={role} onChange={(e) => setRole(e.target.value as CreateUserPayload["role"])} style={selectStyle}>
                  <option value="vendeur">Vendeur</option>
                  <option value="manuf">Manuf</option>
                  <option value="magasin">Magasin</option>
                  <option value="admin">Admin</option>
                  <option value="god_admin">God Admin</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.mid, display: "block", marginBottom: 4 }}>Équipe</label>
                <select value={teamId} onChange={(e) => setTeamId(e.target.value)} style={selectStyle}>
                  <option value="">— Aucune équipe —</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              {role === "magasin" && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.mid, display: "block", marginBottom: 4 }}>Magasin associé *</label>
                  <select value={selectedStoreCode} onChange={(e) => setSelectedStoreCode(e.target.value)} style={selectStyle}>
                    <option value="">— Sélectionner un magasin —</option>
                    {stores.map((s) => <option key={s.store_code} value={s.store_code}>{s.store_name} ({s.store_code})</option>)}
                    <option value="__new__">+ Créer un nouveau magasin</option>
                  </select>
                  {selectedStoreCode === "__new__" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10, padding: 12, background: "rgba(99,102,241,0.04)", borderRadius: 8, border: `1px solid ${T.border}` }}>
                      <input value={newStoreCode} onChange={(e) => setNewStoreCode(e.target.value.toUpperCase())} placeholder="Code magasin (ex: MTL01)" style={inputStyle} />
                      <input value={newStoreName} onChange={(e) => setNewStoreName(e.target.value)} placeholder="Nom du magasin (ex: Montréal Centre)" style={inputStyle} />
                      <input value={newStoreCity} onChange={(e) => setNewStoreCity(e.target.value)} placeholder="Ville" style={inputStyle} />
                    </div>
                  )}
                </div>
              )}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.mid, display: "block", marginBottom: 4 }}>Zone</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <select value={country} onChange={(e) => { setCountry(e.target.value); setProvince(PROVINCES[e.target.value]?.[0]?.code || ""); }} style={selectStyle}>
                    {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                  <select value={province} onChange={(e) => setProvince(e.target.value)} style={selectStyle}>
                    <option value="">— Province —</option>
                    {(PROVINCES[country] || []).map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
                  </select>
                  <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville" style={inputStyle} />
                </div>
              </div>
              {(
                <div style={{ background: "rgba(99,102,241,0.06)", borderRadius: 12, padding: 16, border: `2px solid ${T.main}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.mid, marginBottom: 8 }}>CODE UTILISATEUR GÉNÉRÉ</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <code style={{ fontSize: 20, fontWeight: 900, color: T.main, letterSpacing: 2 }}>{vendeurCode || "—"}</code>
                    <button
                      type="button"
                      onClick={() => {
                        const c = generateVendeurCode(firstName, lastName, province || "QC", city || "X");
                        setVendeurCode(c);
                        setRegionCode(getZoneCode(province || "QC", city || "X"));
                      }}
                      style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${T.main}`, background: "none", color: T.main, fontSize: 11, cursor: "pointer" }}
                    >
                      Régénérer
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: T.textLight, marginTop: 4 }}>Ce code identifie l'utilisateur sur toutes les commandes, leads et samples.</div>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <Field label="Courriel *" value={email} onChange={setEmail} type="email" />
                {!email && firstName && lastName && (
                  <button type="button" onClick={() => setEmail(suggestEmail())} style={{ fontSize: 11, color: T.main, background: "none", border: "none", cursor: "pointer", marginTop: 4, padding: 0 }}>
                    Suggérer: {suggestEmail()}
                  </button>
                )}
              </div>
              <Field label="Nom d'utilisateur" value={username} onChange={setUsername} placeholder="Optionnel" />
              <div style={{ background: "rgba(99,102,241,0.06)", borderRadius: 10, padding: 14, border: `1px solid rgba(99,102,241,0.15)` }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <Shield size={16} color={T.main} style={{ marginTop: 2 }} />
                  <p style={{ fontSize: 12, color: T.textMid, margin: 0, lineHeight: 1.6 }}>
                    Aucun mot de passe requis — le nouvel utilisateur se connectera avec son <strong style={{ color: T.text }}>code utilisateur</strong> + <strong style={{ color: T.text }}>Google Authenticator</strong>. Le QR code sera généré et envoyé par email automatiquement.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && <PermissionsAccordion selected={permissions} onChange={setPermissions} />}

          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(22,163,74,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Check size={20} color="#16a34a" />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Compte créé</div>
                  <div style={{ fontSize: 12, color: T.textMid }}>{email.trim().toLowerCase()}</div>
                </div>
              </div>

              {otpauthUri && (
                <div style={{ background: "rgba(99,102,241,0.04)", borderRadius: 12, border: `1px solid rgba(99,102,241,0.15)`, padding: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.main, marginBottom: 12 }}>QR CODE GOOGLE AUTHENTICATOR</div>
                  <p style={{ fontSize: 12, color: T.textMid, margin: "0 0 16px", lineHeight: 1.6 }}>
                    Partagez ce QR code avec <strong style={{ color: T.text }}>{firstName} {lastName}</strong> pour configurer Google Authenticator.
                    {vendeurCode && <> Son code utilisateur est <strong style={{ color: T.main, fontFamily: "monospace" }}>{vendeurCode}</strong>.</>}
                  </p>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                    <div style={{ padding: 10, background: "#fff", borderRadius: 10, display: "inline-block" }}>
                      <QRCodeSVG value={otpauthUri} size={160} level="M" />
                    </div>
                  </div>
                  <div style={{ background: T.bgCard, borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ fontSize: 10, color: T.textMid, marginBottom: 4 }}>CLÉ MANUELLE</div>
                    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12, color: T.text, letterSpacing: 2, wordBreak: "break-all" }}>
                      {totpSecret?.match(/.{1,4}/g)?.join(" ")}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ background: T.bgCard, borderRadius: 10, border: `1px solid ${T.border}`, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Mail size={14} color={T.textMid} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Email de bienvenue</span>
                  </div>
                  {!emailSent && (
                    <button onClick={() => setShowEmailPreview((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: `1px solid ${T.border}`, background: "none", color: T.mid, fontSize: 11, cursor: "pointer" }}>
                      {showEmailPreview ? <EyeOff size={12} /> : <Eye size={12} />}
                      {showEmailPreview ? "Masquer" : "Aperçu"}
                    </button>
                  )}
                </div>

                {showEmailPreview && !emailSent && (
                  <div style={{ background: "#fff", borderRadius: 8, border: `1px solid ${T.border}`, marginBottom: 12, maxHeight: 300, overflowY: "auto" }}>
                    <div style={{ padding: 16 }}>
                      <div style={{ fontSize: 11, color: "#8a8a8e", marginBottom: 4 }}>De: Uniflex ERP</div>
                      <div style={{ fontSize: 11, color: "#8a8a8e", marginBottom: 4 }}>À: <strong style={{ color: "#111" }}>{email.trim().toLowerCase()}</strong></div>
                      <div style={{ fontSize: 11, color: "#8a8a8e", marginBottom: 12 }}>Sujet: <strong style={{ color: "#111" }}>Bienvenue sur Uniflex ERP — Configuration de votre accès</strong></div>
                      <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
                        <div style={{ background: "#111", borderRadius: 8, padding: 16, textAlign: "center", marginBottom: 12 }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>UNIFLEX <span style={{ background: "#333", color: "#fff", fontSize: 9, padding: "2px 6px", borderRadius: 3, letterSpacing: 2, marginLeft: 4 }}>ERP</span></span>
                        </div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111", margin: "0 0 6px" }}>Bienvenue, {firstName} {lastName} 👋</h3>
                        <p style={{ fontSize: 12, color: "#636366", margin: "0 0 12px", lineHeight: 1.5 }}>Votre compte Uniflex ERP a été créé. Voici tout ce dont vous avez besoin pour vous connecter.</p>
                        <div style={{ background: "#f4f4f5", borderRadius: 8, padding: 12, marginBottom: 12 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#8a8a8e", letterSpacing: 1, marginBottom: 8 }}>VOS INFORMATIONS</div>
                          <div style={{ fontSize: 12, color: "#636366", marginBottom: 4 }}>Courriel: <strong style={{ color: "#111" }}>{email.trim().toLowerCase()}</strong></div>
                          <div style={{ fontSize: 12, color: "#636366", marginBottom: 4 }}>Rôle: <strong style={{ color: "#111" }}>{role}</strong></div>
                          {vendeurCode && <div style={{ fontSize: 12, color: "#636366" }}>Code utilisateur: <strong style={{ color: "#111", fontFamily: "monospace", letterSpacing: 2 }}>{vendeurCode}</strong></div>}
                        </div>
                        <div style={{ border: "1px solid #6366f1", borderRadius: 8, padding: 12, marginBottom: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#111", marginBottom: 6 }}>🔐 GOOGLE AUTHENTICATOR</div>
                          <p style={{ fontSize: 11, color: "#636366", margin: "0 0 8px", lineHeight: 1.4 }}>Le QR code et la clé manuelle seront inclus dans l'email.</p>
                          {otpauthUri && (
                            <div style={{ textAlign: "center" }}>
                              <div style={{ display: "inline-block", padding: 6, background: "#f4f4f5", borderRadius: 6 }}>
                                <QRCodeSVG value={otpauthUri} size={80} level="M" />
                              </div>
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 10, color: "#8a8a8e", marginTop: 8 }}>+ Instructions de connexion en 4 étapes</div>
                      </div>
                    </div>
                  </div>
                )}

                {emailSent ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Check size={14} color="#16a34a" />
                    <span style={{ fontSize: 12, color: "#16a34a" }}>Email envoyé à {email.trim().toLowerCase()} avec le QR code et les instructions.</span>
                  </div>
                ) : emailError ? (
                  <div>
                    <p style={{ fontSize: 12, color: T.red, margin: "0 0 8px" }}>{emailError}</p>
                    {emailError.toLowerCase().includes("smtp") && (
                      <p style={{ fontSize: 11, color: T.textMid, margin: "0 0 8px", lineHeight: 1.5 }}>
                        Configurez votre SMTP dans <strong>Admin &gt; Paramètres Email</strong> (host: smtp.hostinger.com, port: 465, SSL).
                      </p>
                    )}
                    <button
                      onClick={() => sendWelcomeEmail(createdUserId, otpauthUri, totpSecret)}
                      disabled={emailSending}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", background: T.main, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      <RefreshCw size={12} /> Réessayer l'envoi
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => sendWelcomeEmail(createdUserId, otpauthUri, totpSecret)}
                      disabled={emailSending}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", background: T.main, color: "#fff", fontSize: 13, fontWeight: 600, cursor: emailSending ? "not-allowed" : "pointer", opacity: emailSending ? 0.7 : 1 }}
                    >
                      <Send size={13} />
                      {emailSending ? "Envoi en cours..." : "Confirmer et envoyer"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && step < 3 && <p style={{ color: T.red, fontSize: 12, marginTop: 12 }}>{error}</p>}
        </div>

        <div style={{ padding: "16px 24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", flexShrink: 0 }}>
          {step < 3 ? (
            <button onClick={() => (step === 0 ? onClose() : setStep((s) => s - 1))} style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, fontSize: 14, cursor: "pointer", color: T.text }}>
              {step === 0 ? "Annuler" : "Retour"}
            </button>
          ) : <div />}
          {step < 2 ? (
            <button onClick={next} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: T.main, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Suivant
            </button>
          ) : step === 2 ? (
            <button onClick={submit} disabled={submitting} style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: submitting ? "#9ca3af" : T.main, color: "#fff", fontSize: 14, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer" }}>
              {submitting ? "Création..." : "Créer l'utilisateur"}
            </button>
          ) : (
            <button onClick={onClose} style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: T.main, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Terminer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
