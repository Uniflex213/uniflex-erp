import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { T } from "../../theme";
import { Team, AVATAR_COLORS } from "./teamTypes";
import { getInitials, generateTeamCode } from "./teamUtils";

interface Props {
  currentUser: string;
  onJoined: (team: Team, memberId: string) => void;
}

function RequestModal({ onClose, onSuccess, currentUser }: {
  onClose: () => void;
  onSuccess: () => void;
  currentUser: string;
}) {
  const [reason, setReason] = useState("");
  const [members, setMembers] = useState("");
  const [region, setRegion] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSend = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    await supabase.from("team_join_requests").insert({
      requester_name: currentUser,
      reason: reason.trim(),
      estimated_members: parseInt(members) || 0,
      target_region: region.trim(),
      status: "pending",
    });
    setLoading(false);
    setDone(true);
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: T.bgCard, borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 24px 80px rgba(0,0,0,0.2)" }}
      >
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: T.text }}>Demander la création d'une équipe</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: T.textLight }}>✕</button>
        </div>
        {done ? (
          <div style={{ padding: "36px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>✅</div>
            <h4 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 800, color: T.green }}>Demande envoyée !</h4>
            <p style={{ fontSize: 13, color: T.textLight, margin: "0 0 20px" }}>
              Votre demande a été envoyée aux administrateurs. Vous recevrez un code d'équipe sous peu.
            </p>
            <button onClick={onClose} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: T.main, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>
              Fermer
            </button>
          </div>
        ) : (
          <>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.textLight, display: "block", marginBottom: 5 }}>
                  Raison de la demande <span style={{ color: T.red }}>*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Ex: Je veux structurer mon réseau de vendeurs dans la région de Montréal..."
                  style={{ width: "100%", height: 80, padding: 10, borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: "inherit", resize: "none", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.textLight, display: "block", marginBottom: 5 }}>Nombre estimé de membres</label>
                  <input
                    type="number" value={members} onChange={e => setMembers(e.target.value)} min={1} max={50}
                    style={{ width: "100%", height: 36, borderRadius: 8, border: `1px solid ${T.border}`, padding: "0 10px", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.textLight, display: "block", marginBottom: 5 }}>Région cible</label>
                  <input
                    value={region} onChange={e => setRegion(e.target.value)} placeholder="Ex: Montréal, Rive-Sud..."
                    style={{ width: "100%", height: 36, borderRadius: 8, border: `1px solid ${T.border}`, padding: "0 10px", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>
            </div>
            <div style={{ padding: "14px 24px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Annuler</button>
              <button
                onClick={handleSend}
                disabled={!reason.trim() || loading}
                style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: reason.trim() ? T.main : "#e5e7eb", color: reason.trim() ? "#fff" : T.textLight, cursor: reason.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}
              >
                {loading ? "Envoi..." : "Envoyer la demande"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function NoTeamView({ currentUser, onJoined }: Props) {
  const { profile, reloadProfile } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [joining, setJoining] = useState(false);
  const [requestDone, setRequestDone] = useState(false);

  const handleJoin = async () => {
    if (!code.trim()) return;
    setJoining(true);
    setCodeError("");

    const { data: team, error } = await supabase
      .from("teams")
      .select("*")
      .eq("join_code", code.trim().toUpperCase())
      .eq("code_active", true)
      .maybeSingle();

    if (error || !team) {
      console.error("team lookup error:", error, "code:", code.trim().toUpperCase());
      setCodeError("Code invalide. Vérifiez avec votre chef d'équipe.");
      setJoining(false);
      return;
    }
    console.log("team found:", team.id, team.name, "user:", profile?.id);

    // Check if user already has an active membership in this team
    let member: any = null;
    if (profile?.id) {
      const { data: existing } = await supabase
        .from("team_members")
        .select("*")
        .eq("team_id", team.id)
        .eq("user_id", profile.id)
        .is("removed_at", null)
        .maybeSingle();
      if (existing) {
        member = existing;
      }
    }

    // Insert new membership if not already a member
    if (!member) {
      const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      const { data: newMember, error: memberErr } = await supabase
        .from("team_members")
        .insert({
          team_id: team.id,
          user_id: profile?.id ?? null,
          agent_name: currentUser,
          agent_initials: getInitials(currentUser),
          role: "member",
          is_online: true,
          last_seen_at: new Date().toISOString(),
          avatar_color: color,
        })
        .select()
        .maybeSingle();

      if (memberErr || !newMember) {
        console.error("team_members insert error:", memberErr);
        setCodeError(`Erreur lors de la connexion à l'équipe: ${memberErr?.message ?? "no data returned"}`);
        setJoining(false);
        return;
      }
      member = newMember;

      await supabase.from("team_messages").insert({
        team_id: team.id,
        member_id: member.id,
        content: `${currentUser} a rejoint l'équipe`,
        is_system: true,
        message_type: "system",
      });
    }

    // Sync profile.team_id so TeamLeaderDashboard and other components work
    if (profile?.id) {
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ team_id: team.id })
        .eq("id", profile.id);
      if (profileErr) {
        console.error("profile team_id update failed:", profileErr);
      } else {
        console.log("profile.team_id updated to", team.id, "for user", profile.id);
      }
      await reloadProfile();
    }

    onJoined(team, member.id);
    setJoining(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 42, fontWeight: 900, color: T.text, letterSpacing: -1 }}>Mon Équipe</div>
        <p style={{ fontSize: 14, color: T.textLight, marginTop: 8 }}>Rejoignez une équipe de vente ou créez la vôtre</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, width: "100%", maxWidth: 700 }}>
        <div style={{ background: T.bgCard, borderRadius: 20, padding: 32, border: `1px solid ${T.border}`, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: `${T.main}15`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18, fontSize: 26 }}>
            👥
          </div>
          <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 800, color: T.text }}>Créer une nouvelle équipe</h3>
          <p style={{ margin: "0 0 24px", fontSize: 13, color: T.textLight, lineHeight: 1.6 }}>
            Demandez la création d'une équipe de vente aux administrateurs. Vous recevrez un code unique pour inviter vos membres.
          </p>
          {requestDone ? (
            <div style={{ padding: "12px 16px", background: "#f0fdf4", border: `1px solid #bbf7d0`, borderRadius: 10, fontSize: 12, color: T.green, fontWeight: 600 }}>
              ✅ Demande envoyée aux administrateurs
            </div>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              style={{
                width: "100%", padding: "12px", borderRadius: 12, border: "none",
                background: T.main, color: "#fff", cursor: "pointer",
                fontFamily: "inherit", fontSize: 13, fontWeight: 800,
              }}
            >
              Demander la création d'une équipe
            </button>
          )}
        </div>

        <div style={{ background: T.bgCard, borderRadius: 20, padding: 32, border: `1px solid ${T.border}`, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#fef3c715", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18, fontSize: 26 }}>
            🔑
          </div>
          <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 800, color: T.text }}>Rejoindre une équipe existante</h3>
          <p style={{ margin: "0 0 18px", fontSize: 13, color: T.textLight, lineHeight: 1.6 }}>
            Entrez le code d'équipe fourni par votre chef d'équipe pour rejoindre l'équipe.
          </p>
          <div style={{ position: "relative", marginBottom: 10 }}>
            <input
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setCodeError(""); }}
              placeholder="XXXX-0000"
              maxLength={9}
              style={{
                width: "100%", height: 48, borderRadius: 12, textAlign: "center",
                border: `2px solid ${codeError ? T.red : code ? T.main : T.border}`,
                fontSize: 20, fontWeight: 800, fontFamily: "monospace",
                letterSpacing: 4, outline: "none", boxSizing: "border-box",
                background: "#fafafa",
              }}
              onKeyDown={e => { if (e.key === "Enter") handleJoin(); }}
            />
          </div>
          {codeError && (
            <div style={{ fontSize: 11, color: T.red, marginBottom: 10, textAlign: "center", fontWeight: 600 }}>
              {codeError}
            </div>
          )}
          <button
            onClick={handleJoin}
            disabled={!code.trim() || joining}
            style={{
              width: "100%", padding: "12px", borderRadius: 12, border: "none",
              background: code.trim() ? "#d97706" : "#e5e7eb",
              color: code.trim() ? "#fff" : T.textLight,
              cursor: code.trim() ? "pointer" : "not-allowed",
              fontFamily: "inherit", fontSize: 13, fontWeight: 800,
            }}
          >
            {joining ? "Vérification..." : "Rejoindre l'équipe"}
          </button>
        </div>
      </div>

      {showModal && (
        <RequestModal
          currentUser={currentUser}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); setRequestDone(true); }}
        />
      )}
    </div>
  );
}
