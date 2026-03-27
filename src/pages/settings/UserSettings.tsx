import React, { useState, useEffect, useRef } from "react";
import { Camera, Lock, Activity, Eye, EyeOff, Check, Mail, Shield, RefreshCw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../../supabaseClient";
import { logActivity } from "../../lib/activityLogger";
import { useAuth } from "../../contexts/AuthContext";
import { T } from "../../theme";
import TotpCodeInput from "../../components/auth/TotpCodeInput";
import { useLanguage } from "../../i18n/LanguageContext";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

type ActivityLog = { id: string; action: string; module: string; created_at: string };

function pwStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Faible", color: T.red };
  if (score <= 3) return { score, label: "Moyen", color: "#d97706" };
  return { score, label: "Fort", color: T.green };
}

export default function UserSettings() {
  const { t } = useLanguage();
  const { profile, user, reloadProfile } = useAuth();
  const [tab, setTab] = useState<"profile" | "security" | "activity" | "email">("profile");
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [jobTitle, setJobTitle] = useState(profile?.job_title ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");

  // TOTP enrollment
  const [totpEnrolled, setTotpEnrolled] = useState<boolean | null>(null);
  const [enrollStep, setEnrollStep] = useState<"idle" | "qr" | "verify" | "done">("idle");
  const [otpauthUri, setOtpauthUri] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [totpVerifyValues, setTotpVerifyValues] = useState(["", "", "", "", "", ""]);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [enrollMsg, setEnrollMsg] = useState("");

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsPage, setLogsPage] = useState(0);
  const [logsTotal, setLogsTotal] = useState(0);
  const PER_PAGE = 20;

  const [emailFromEmail, setEmailFromEmail] = useState("");
  const [emailFromName, setEmailFromName] = useState("");
  const [emailSmtpPassword, setEmailSmtpPassword] = useState("");
  const [showSmtpPw, setShowSmtpPw] = useState(false);
  const [emailIsVerified, setEmailIsVerified] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailTesting, setEmailTesting] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");
  const [emailError, setEmailError] = useState("");

  const [imapTesting, setImapTesting] = useState(false);
  const [imapMsg, setImapMsg] = useState("");
  const [imapError, setImapError] = useState("");
  const [imapDetails, setImapDetails] = useState<{ inbox_count?: number; folders_count?: number } | null>(null);

  const strength = pwStrength(newPw);

  // Load TOTP enrollment status when switching to security tab
  useEffect(() => {
    if (tab !== "security" || !user) return;
    supabase.from("profiles").select("totp_enrolled").eq("id", user.id).maybeSingle()
      .then(({ data }) => setTotpEnrolled(data?.totp_enrolled ?? false));
  }, [tab, user]);

  const startEnroll = async () => {
    setEnrollLoading(true); setEnrollError(""); setEnrollMsg("");
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/totp-enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}`, "apikey": SUPABASE_ANON_KEY },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!res.ok) { setEnrollError(data.error || "Erreur"); setEnrollLoading(false); return; }
    setOtpauthUri(data.otpauth_uri);
    setTotpSecret(data.secret);
    setEnrollStep("qr");
    setEnrollLoading(false);
  };

  const verifyEnroll = async (code: string) => {
    setEnrollLoading(true); setEnrollError("");
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/totp-verify-enrollment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}`, "apikey": SUPABASE_ANON_KEY },
      body: JSON.stringify({ totp_code: code }),
    });
    const data = await res.json();
    if (!res.ok) {
      setEnrollError(data.error || "Code incorrect");
      setTotpVerifyValues(["", "", "", "", "", ""]);
      setEnrollLoading(false);
      return;
    }
    setTotpEnrolled(true);
    setEnrollStep("done");
    setEnrollLoading(false);
  };

  useEffect(() => {
    if (!user || tab !== "email") return;
    supabase.from("user_smtp_configs").select("from_email, from_name, is_verified").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setEmailFromEmail(data.from_email ?? "");
        setEmailFromName(data.from_name ?? "");
        setEmailIsVerified(data.is_verified ?? false);
      }
    });
  }, [user, tab]);

  useEffect(() => {
    if (!user || tab !== "activity") return;
    const from = logsPage * PER_PAGE;
    supabase
      .from("activity_logs")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, from + PER_PAGE - 1)
      .then(({ data, count }) => {
        setLogs((data as ActivityLog[]) ?? []);
        setLogsTotal(count ?? 0);
      });
  }, [user, tab, logsPage]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { alert("5 MB maximum."); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
      setAvatarUrl(data.publicUrl);
      await reloadProfile();
    }
    setUploading(false);
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").update({ full_name: fullName, phone, job_title: jobTitle }).eq("id", user.id);
    await logActivity(supabase, user.id, "profile_updated", "settings");
    await reloadProfile();
    setProfileMsg(t("settings.profile_updated", "Profil mis à jour"));
    setSaving(false);
    setTimeout(() => setProfileMsg(""), 2500);
  };

  const changePassword = async () => {
    setPwError("");
    setPwMsg("");
    if (!newPw || newPw !== confirmPw) { setPwError("Les mots de passe ne correspondent pas."); return; }
    if (strength.score < 2) { setPwError("Mot de passe trop faible."); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) setPwError(error.message);
    else {
      if (user) await logActivity(supabase, user.id, "password_changed", "settings");
      setPwMsg("Mot de passe mis à jour.");
      setNewPw("");
      setConfirmPw("");
    }
    setSaving(false);
  };

  const saveEmailConfig = async () => {
    if (!user) return;
    setEmailError("");
    setEmailSaving(true);
    const upsertData: Record<string, unknown> = {
      user_id: user.id,
      smtp_email: emailFromEmail,
      from_email: emailFromEmail,
      from_name: emailFromName,
      updated_at: new Date().toISOString(),
    };
    if (emailSmtpPassword) {
      upsertData.smtp_password = emailSmtpPassword;
      upsertData.smtp_password_enc = emailSmtpPassword;
    }
    const { error } = await supabase.from("user_smtp_configs").upsert(upsertData, { onConflict: "user_id" });
    if (error) setEmailError(error.message);
    else { setEmailMsg("Configuration sauvegardée"); setTimeout(() => setEmailMsg(""), 2500); }
    setEmailSaving(false);
  };

  const testSmtp = async () => {
    if (!user || !emailFromEmail || !emailSmtpPassword) {
      setEmailError("Remplissez tous les champs avant de tester.");
      return;
    }
    setEmailError("");
    setEmailTesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-smtp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ config_type: "user_personal", from_email: emailFromEmail, from_name: emailFromName, smtp_password: emailSmtpPassword }),
      });
      const raw = await res.text();
      let result: Record<string, unknown>;
      try {
        result = JSON.parse(raw);
      } catch {
        setEmailError(`Erreur serveur (HTTP ${res.status}): ${raw.slice(0, 200)}`);
        return;
      }
      if (result.success) {
        setEmailIsVerified(true);
        setEmailMsg(String(result.message ?? "Connexion SMTP réussie"));
        setTimeout(() => setEmailMsg(""), 4000);
      } else {
        const detail = result.details ? `\n${result.details}` : "";
        setEmailError(String(result.error ?? "Échec du test SMTP.") + detail);
      }
    } catch (e: unknown) {
      setEmailError("Erreur réseau : " + ((e as Error).message || "impossible de joindre le serveur."));
    } finally {
      setEmailTesting(false);
    }
  };

  const testImap = async () => {
    if (!user || !emailFromEmail || !emailSmtpPassword) {
      setImapError("Remplissez tous les champs avant de tester.");
      return;
    }
    setImapError("");
    setImapMsg("");
    setImapDetails(null);
    setImapTesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-imap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ from_email: emailFromEmail, smtp_password: emailSmtpPassword }),
      });
      const raw = await res.text();
      let result: Record<string, unknown>;
      try {
        result = JSON.parse(raw);
      } catch {
        setImapError(`Erreur serveur (HTTP ${res.status}): ${raw.slice(0, 200)}`);
        return;
      }
      if (result.success) {
        setImapMsg(String(result.message ?? "Connexion IMAP reussie"));
        if (result.details) {
          setImapDetails(result.details as { inbox_count?: number; folders_count?: number });
        }
        setTimeout(() => setImapMsg(""), 6000);
      } else {
        const detail = result.details ? `\n${result.details}` : "";
        const stepsInfo = Array.isArray(result.steps) ? `\nEtapes: ${(result.steps as string[]).join(" -> ")}` : "";
        setImapError(String(result.error ?? "Echec du test IMAP.") + detail + stepsInfo);
      }
    } catch (e: unknown) {
      setImapError("Erreur reseau : " + ((e as Error).message || "impossible de joindre le serveur."));
    } finally {
      setImapTesting(false);
    }
  };

  const initials = profile?.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "??";

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: 0 }}>{t("settings.title", "Paramètres")}</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>{t("settings.subtitle", "Gérez votre profil et la sécurité de votre compte")}</p>
      </div>

      <div style={{ background: T.bgCard, borderRadius: 16, overflow: "hidden", border: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, padding: "0 8px" }}>
          {(["profile", "security", "email", "activity"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "16px 20px", border: "none", background: "none", cursor: "pointer", fontSize: 14, fontWeight: tab === t ? 600 : 400, color: tab === t ? T.mainLight : T.textMid, borderBottom: tab === t ? `2px solid ${T.main}` : "2px solid transparent", display: "flex", alignItems: "center", gap: 6 }}>
              {t === "profile" ? <><Camera size={14} />Profil</> : t === "security" ? <><Lock size={14} />Sécurité</> : t === "email" ? <><Mail size={14} />Email</> : <><Activity size={14} />Activité</>}
            </button>
          ))}
        </div>

        <div style={{ padding: 32 }}>
          {tab === "profile" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ position: "relative" }}>
                  <div style={{ width: 80, height: 80, borderRadius: "50%", background: T.main, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "#fff", fontSize: 28, fontWeight: 700 }}>{initials}</span>}
                  </div>
                  <button onClick={() => fileRef.current?.click()} style={{ position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: "50%", background: T.main, border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <Camera size={12} color="#fff" />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: T.text }}>{profile?.full_name}</div>
                  <div style={{ fontSize: 13, color: T.textMid }}>{profile?.email}</div>
                  <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>
                    {profile?.role && <span style={{ background: T.mainGlow, color: T.mainLight, padding: "1px 8px", borderRadius: 4, fontWeight: 600 }}>{profile.role}</span>}
                    {profile?.seller_code && <span style={{ marginLeft: 8 }}>Code: {profile.seller_code}</span>}
                  </div>
                  {uploading && <div style={{ fontSize: 12, color: T.textMid, marginTop: 4 }}>{t("settings.uploading", "Téléversement...")}</div>}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 4 }}>{t("settings.full_name", "Nom complet")}</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} style={iStyle} /></div>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 4 }}>{t("settings.phone", "Téléphone")}</label><input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" style={iStyle} /></div>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 4 }}>{t("settings.job_title", "Titre / poste")}</label><input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} style={iStyle} /></div>
              </div>

              <div style={{ background: "rgba(0,0,0,0.03)", borderRadius: 10, padding: 14, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.textMid, marginBottom: 8 }}>{t("settings.read_only", "Lecture seule")}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><div style={{ fontSize: 11, color: T.textLight, marginBottom: 2 }}>{t("settings.email_label", "Courriel")}</div><div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{profile?.email ?? "—"}</div></div>
                  <div><div style={{ fontSize: 11, color: T.textLight, marginBottom: 2 }}>{t("settings.role", "Rôle")}</div><div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{profile?.role ?? "—"}</div></div>
                  {profile?.seller_code && <div><div style={{ fontSize: 11, color: T.textLight, marginBottom: 2 }}>{t("settings.seller_code", "Code vendeur")}</div><div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{profile.seller_code}</div></div>}
                  {profile?.username && <div><div style={{ fontSize: 11, color: T.textLight, marginBottom: 2 }}>{t("settings.username", "Nom d'utilisateur")}</div><div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{profile.username}</div></div>}
                </div>
              </div>

              {profileMsg && <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: T.green }}><Check size={14} />{profileMsg}</div>}
              <button onClick={saveProfile} disabled={saving} style={{ alignSelf: "flex-start", padding: "10px 24px", borderRadius: 8, border: "none", background: saving ? "#9ca3af" : T.main, color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? t("common.saving", "Sauvegarde...") : t("common.save", "Sauvegarder")}
              </button>
            </div>
          )}

          {tab === "security" && (
            <div style={{ maxWidth: 460, display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: "0 0 4px" }}>{t("settings.2fa_title", "Authentification à deux facteurs")}</h3>
                <p style={{ fontSize: 13, color: T.textMid, margin: 0 }}>{t("settings.2fa_subtitle", "Sécurisez votre connexion avec Google Authenticator.")}</p>
              </div>

              {totpEnrolled === null && (
                <p style={{ fontSize: 13, color: T.textMid }}>{t("common.loading", "Chargement...")}</p>
              )}

              {/* ENROLLED — show status + reconfigure option */}
              {totpEnrolled === true && enrollStep !== "qr" && enrollStep !== "verify" && (
                <div style={{ background: "rgba(22,163,74,0.06)", borderRadius: 12, border: "1px solid rgba(22,163,74,0.2)", padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(22,163,74,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Shield size={18} color="#16a34a" />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{t("settings.totp_enabled", "Google Authenticator activé")}</div>
                      <div style={{ fontSize: 12, color: T.textMid }}>{t("settings.2fa_protected", "Votre compte est protégé par 2FA")}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setEnrollStep("idle"); setTotpEnrolled(false); setEnrollMsg(""); setEnrollError(""); }}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(220,38,38,0.3)", background: "rgba(220,38,38,0.06)", color: "#dc2626", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    <RefreshCw size={13} /> {t("settings.reconfigure", "Reconfigurer")}
                  </button>
                  {enrollMsg && <p style={{ color: T.green, fontSize: 12, marginTop: 10 }}>{enrollMsg}</p>}
                </div>
              )}

              {/* NOT ENROLLED — start button */}
              {totpEnrolled === false && enrollStep === "idle" && (
                <div style={{ background: T.bgCard, borderRadius: 12, border: `1px solid ${T.border}`, padding: 20 }}>
                  <p style={{ fontSize: 13, color: T.textMid, marginBottom: 16, lineHeight: 1.6 }}>
                    Scannez un QR code avec l'application <strong style={{ color: T.text }}>Google Authenticator</strong> pour sécuriser votre compte. Vous n'aurez plus besoin de mot de passe — seulement votre code vendeur et le code à 6 chiffres de l'app.
                  </p>
                  {enrollError && <p style={{ color: T.red, fontSize: 12, marginBottom: 12 }}>{enrollError}</p>}
                  <button
                    onClick={startEnroll}
                    disabled={enrollLoading}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 9, border: "none", background: T.main, color: "#fff", fontSize: 14, fontWeight: 600, cursor: enrollLoading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: enrollLoading ? 0.7 : 1 }}
                  >
                    <Shield size={15} />
                    {enrollLoading ? t("settings.generating", "Génération...") : t("settings.configure_totp", "Configurer Google Authenticator")}
                  </button>
                </div>
              )}

              {/* QR CODE step */}
              {enrollStep === "qr" && otpauthUri && (
                <div style={{ background: T.bgCard, borderRadius: 12, border: `1px solid ${T.border}`, padding: 24 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: "0 0 4px" }}>{t("settings.scan_qr", "Scannez ce QR code")}</h4>
                  <p style={{ fontSize: 12, color: T.textMid, margin: "0 0 20px", lineHeight: 1.5 }}>Ouvrez Google Authenticator → + → Scanner un QR code</p>

                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                    <div style={{ padding: 12, background: "#fff", borderRadius: 12, display: "inline-block" }}>
                      <QRCodeSVG value={otpauthUri} size={180} level="M" />
                    </div>
                  </div>

                  <div style={{ background: "rgba(0,0,0,0.03)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, border: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 11, color: T.textMid, marginBottom: 4 }}>Clé manuelle (si vous ne pouvez pas scanner)</div>
                    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, color: T.text, letterSpacing: 2, wordBreak: "break-all" }}>
                      {totpSecret.match(/.{1,4}/g)?.join(" ")}
                    </div>
                  </div>

                  <p style={{ fontSize: 13, color: T.textMid, marginBottom: 12 }}>Entrez le code à 6 chiffres affiché dans l'application :</p>
                  <TotpCodeInput
                    values={totpVerifyValues}
                    onChange={setTotpVerifyValues}
                    onComplete={verifyEnroll}
                    disabled={enrollLoading}
                    autoFocus
                  />
                  {enrollError && <p style={{ color: T.red, fontSize: 12, marginTop: 12, textAlign: "center" }}>{enrollError}</p>}
                  {enrollLoading && <p style={{ color: T.textMid, fontSize: 12, marginTop: 12, textAlign: "center" }}>{t("settings.verifying", "Vérification...")}</p>}
                </div>
              )}

              {/* DONE */}
              {enrollStep === "done" && (
                <div style={{ background: "rgba(22,163,74,0.06)", borderRadius: 12, border: "1px solid rgba(22,163,74,0.2)", padding: 20, textAlign: "center" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(22,163,74,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                    <Check size={22} color="#16a34a" />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6 }}>{t("settings.totp_configured", "Google Authenticator configuré !")}</div>
                  <div style={{ fontSize: 13, color: T.textMid }}>À partir de maintenant, connectez-vous avec votre code vendeur + le code de l'app.</div>
                </div>
              )}
            </div>
          )}

          {tab === "email" && (
            <div style={{ maxWidth: 520, display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: "0 0 4px" }}>{t("settings.personal_email", "Boite email personnelle")}</h3>
                <p style={{ fontSize: 13, color: T.textMid, margin: 0 }}>{t("settings.email_config_desc", "Configurez votre adresse Hostinger pour envoyer et recevoir des emails.")}</p>
              </div>

              {emailIsVerified && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.green, fontWeight: 600 }}>
                  <Check size={14} /> Configuration verifiee
                </div>
              )}

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 4 }}>{t("settings.email_address", "Adresse email")} *</label>
                <input value={emailFromEmail} onChange={e => setEmailFromEmail(e.target.value)} placeholder="vous@votredomaine.com" type="email" style={iStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 4 }}>{t("settings.display_name", "Nom affiché")}</label>
                <input value={emailFromName} onChange={e => setEmailFromName(e.target.value)} placeholder="Votre Nom — Uniflex" style={iStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 4 }}>{t("settings.password", "Mot de passe")}</label>
                <div style={{ position: "relative" }}>
                  <input type={showSmtpPw ? "text" : "password"} value={emailSmtpPassword} onChange={e => setEmailSmtpPassword(e.target.value)} placeholder="Entrer pour modifier" style={{ ...iStyle, paddingRight: 36 }} />
                  <button type="button" onClick={() => setShowSmtpPw(!showSmtpPw)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.textMid }}>
                    {showSmtpPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <button onClick={saveEmailConfig} disabled={emailSaving || !emailFromEmail} style={{ alignSelf: "flex-start", padding: "10px 24px", borderRadius: 8, border: "none", background: emailSaving || !emailFromEmail ? "#9ca3af" : T.main, color: "#fff", fontSize: 14, fontWeight: 600, cursor: emailSaving || !emailFromEmail ? "not-allowed" : "pointer" }}>
                {emailSaving ? t("common.saving", "Sauvegarde...") : t("common.save", "Sauvegarder")}
              </button>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
                <div style={{ background: "rgba(0,0,0,0.03)", borderRadius: 12, padding: 16, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6" }} />
                    SMTP (Envoi)
                  </div>
                  <div style={{ fontSize: 11, color: T.textMid, marginBottom: 12 }}>
                    <div>smtp.hostinger.com</div>
                    <div>Port 465 · SSL</div>
                  </div>
                  <button onClick={testSmtp} disabled={emailTesting || !emailFromEmail || !emailSmtpPassword} style={{ width: "100%", padding: "8px 14px", borderRadius: 8, border: `1px solid ${T.main}`, background: "transparent", color: T.mainLight, fontSize: 12, fontWeight: 600, cursor: emailTesting || !emailFromEmail || !emailSmtpPassword ? "not-allowed" : "pointer", opacity: !emailFromEmail || !emailSmtpPassword ? 0.5 : 1 }}>
                    {emailTesting ? "Test..." : t("settings.test_smtp", "Tester SMTP")}
                  </button>
                  {emailError && <p style={{ color: T.red, fontSize: 11, margin: "8px 0 0", whiteSpace: "pre-wrap" }}>{emailError}</p>}
                  {emailMsg && <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: T.green, marginTop: 8 }}><Check size={12} />{emailMsg}</div>}
                </div>

                <div style={{ background: "rgba(0,0,0,0.03)", borderRadius: 12, padding: 16, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
                    IMAP (Reception)
                  </div>
                  <div style={{ fontSize: 11, color: T.textMid, marginBottom: 12 }}>
                    <div>imap.hostinger.com</div>
                    <div>Port 993 · SSL</div>
                  </div>
                  <button onClick={testImap} disabled={imapTesting || !emailFromEmail || !emailSmtpPassword} style={{ width: "100%", padding: "8px 14px", borderRadius: 8, border: "1px solid #10b981", background: "transparent", color: "#10b981", fontSize: 12, fontWeight: 600, cursor: imapTesting || !emailFromEmail || !emailSmtpPassword ? "not-allowed" : "pointer", opacity: !emailFromEmail || !emailSmtpPassword ? 0.5 : 1 }}>
                    {imapTesting ? "Test..." : t("settings.test_imap", "Tester IMAP")}
                  </button>
                  {imapError && <p style={{ color: T.red, fontSize: 11, margin: "8px 0 0", whiteSpace: "pre-wrap" }}>{imapError}</p>}
                  {imapMsg && <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: T.green, marginTop: 8 }}><Check size={12} />{imapMsg}</div>}
                  {imapDetails && (
                    <div style={{ fontSize: 11, color: T.textMid, marginTop: 6 }}>
                      {imapDetails.inbox_count !== undefined && <div>Messages: {imapDetails.inbox_count}</div>}
                      {imapDetails.folders_count !== undefined && <div>Dossiers: {imapDetails.folders_count}</div>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === "activity" && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, margin: "0 0 16px" }}>{t("settings.activity_logs", "Journaux d'activité")}</h3>
              {logs.length === 0 ? <div style={{ padding: 32, textAlign: "center", color: T.textMid }}>{t("settings.no_activity", "Aucune activité.")}</div> : (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {logs.map((log) => (
                      <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(0,0,0,0.03)", borderRadius: 8, fontSize: 13, border: `1px solid ${T.border}` }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.mainGlow, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Activity size={12} color={T.mainLight} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 600, color: T.text }}>{log.action}</span>
                          <span style={{ fontSize: 11, background: T.mainGlow, color: T.mainLight, padding: "1px 6px", borderRadius: 4, marginLeft: 8 }}>{log.module}</span>
                        </div>
                        <div style={{ fontSize: 11, color: T.textLight, whiteSpace: "nowrap" }}>
                          {new Date(log.created_at).toLocaleString("fr-CA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
                    <span style={{ fontSize: 12, color: T.textMid }}>{logsTotal} entrées</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button disabled={logsPage === 0} onClick={() => setLogsPage((p) => p - 1)} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: "rgba(0,0,0,0.04)", color: T.text, fontSize: 12, cursor: logsPage === 0 ? "not-allowed" : "pointer", opacity: logsPage === 0 ? 0.5 : 1 }}>{t("common.previous", "Précédent")}</button>
                      <button disabled={(logsPage + 1) * PER_PAGE >= logsTotal} onClick={() => setLogsPage((p) => p + 1)} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: "rgba(0,0,0,0.04)", color: T.text, fontSize: 12, cursor: "pointer" }}>{t("common.next", "Suivant")}</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const iStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid rgba(0,0,0,0.06)`, background: "rgba(0,0,0,0.04)", color: "#fafafa", fontSize: 14, boxSizing: "border-box", outline: "none" };

function PwField({ label, value, onChange, show, onToggle }: { label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 4 }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} style={{ ...iStyle, paddingRight: 36 }} />
        <button type="button" onClick={onToggle} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.textMid }}>
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}
