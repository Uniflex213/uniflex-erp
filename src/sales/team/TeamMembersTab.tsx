import React, { useState } from "react";
import { Team, TeamMember } from "./teamTypes";
import { fmtCurrency, fmtPct, timeAgo } from "./teamUtils";
import { supabase } from "../../supabaseClient";
import { T } from "../../theme";
import { useLanguage } from "../../i18n/LanguageContext";

function Avatar({ member, size = 44 }: { member: TeamMember; size?: number }) {
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: member.avatar_color, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.35, fontWeight: 800,
      }}>
        {member.agent_initials}
      </div>
      <div style={{
        position: "absolute", bottom: 2, right: 2,
        width: size * 0.26, height: size * 0.26, borderRadius: "50%",
        background: member.is_online ? T.green : "#9ca3af",
        border: "2px solid #fff",
      }} />
    </div>
  );
}

interface Props {
  team: Team;
  members: TeamMember[];
  currentMemberId: string;
  isLeader: boolean;
  onMembersChange: (members: TeamMember[]) => void;
}

export default function TeamMembersTab({ team, members, currentMemberId, isLeader, onMembersChange }: Props) {
  const { t } = useLanguage();
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [codeActive, setCodeActive] = useState(team.code_active);

  const copyCode = () => {
    navigator.clipboard.writeText(team.join_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemove = async (memberId: string) => {
    await supabase.from("team_members").update({ removed_at: new Date().toISOString() }).eq("id", memberId);
    onMembersChange(members.filter(m => m.id !== memberId));
    setConfirmRemove(null);
  };

  const handleToggleCode = async () => {
    const newVal = !codeActive;
    await supabase.from("teams").update({ code_active: newVal }).eq("id", team.id);
    setCodeActive(newVal);
  };

  return (
    <div style={{ padding: "24px 28px", maxWidth: 900 }}>
      {isLeader && (
        <div style={{
          background: T.bgCard, borderRadius: 14, padding: "16px 20px", border: `1px solid ${T.border}`,
          marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, marginBottom: 4 }}>{t("team_members.invite_code", "Code d'invitation")}</div>
            <div style={{ fontSize: 20, fontWeight: 900, fontFamily: "monospace", letterSpacing: 3, color: T.main }}>
              {team.join_code}
            </div>
          </div>
          <button
            onClick={copyCode}
            style={{
              padding: "9px 18px", borderRadius: 10, border: `1.5px solid ${T.main}`,
              background: copied ? T.main : "#fff", color: copied ? "#fff" : T.main,
              cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, transition: "all 0.2s",
            }}
          >
            {copied ? t("team_members.copied", "Copié !") : t("team_members.copy_code", "Copier le code")}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            <span style={{ fontSize: 12, color: T.textLight }}>{t("team_members.code_active", "Code actif")}</span>
            <div
              onClick={handleToggleCode}
              style={{
                width: 40, height: 22, borderRadius: 99, cursor: "pointer",
                background: codeActive ? T.main : "#d1d5db",
                position: "relative", transition: "background 0.2s",
              }}
            >
              <div style={{
                position: "absolute", top: 3, left: codeActive ? 21 : 3,
                width: 16, height: 16, borderRadius: "50%", background: T.bgCard,
                transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {members.map(member => (
          <div
            key={member.id}
            style={{
              background: T.bgCard, borderRadius: 14, padding: "16px 20px",
              border: `1px solid ${T.border}`,
              display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
            }}
          >
            <Avatar member={member} size={50} />

            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{member.agent_name}</span>
                {member.role === "leader" && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: "#fef3c7", color: "#92400e", borderRadius: 4, padding: "1px 6px" }}>
                    {t("team_members.team_leader", "Chef d'équipe")}
                  </span>
                )}
                {member.id === currentMemberId && (
                  <span style={{ fontSize: 10, color: T.textLight }}>({t("common.you", "vous")})</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 11, color: T.textLight, flexWrap: "wrap" }}>
                <span>✉ {member.agent_email}</span>
                <span>📞 {member.agent_phone || "—"}</span>
                <span>📍 {member.region || "—"}</span>
              </div>
              <div style={{ marginTop: 4 }}>
                {member.is_online ? (
                  <span style={{ fontSize: 10, color: T.green, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.green, display: "inline-block", boxShadow: `0 0 0 3px ${T.green}30`, animation: "pulse 1.5s infinite" }} />
                    {t("team_members.online", "En ligne")}
                  </span>
                ) : (
                  <span style={{ fontSize: 10, color: T.textLight }}>
                    {t("team_members.offline", "Hors ligne")} · {t("team_members.last_seen", "Dernière connexion")} {timeAgo(member.last_seen_at)}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {[
                { label: t("team_members.active_leads", "Leads actifs"), value: String(member.leads_active ?? 0) },
                { label: t("team_members.sales_mtd", "Ventes MTD"), value: fmtCurrency(member.sales_mtd ?? 0) },
                { label: t("team_members.deals", "Deals"), value: String(member.deals_closed ?? 0) },
                { label: t("team_members.conversion", "Conversion"), value: fmtPct(member.conversion_rate ?? 0) },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: T.text }}>{value}</div>
                  <div style={{ fontSize: 9, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
                </div>
              ))}
            </div>

            {isLeader && member.id !== currentMemberId && (
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                {confirmRemove === member.id ? (
                  <>
                    <span style={{ fontSize: 11, color: T.red, fontWeight: 600 }}>{t("team_members.remove_confirm", "Retirer ?")} </span>
                    <button onClick={() => handleRemove(member.id)} style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: T.red, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700 }}>{t("common.yes", "Oui")}</button>
                    <button onClick={() => setConfirmRemove(null)} style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.bgCard, cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>{t("common.no", "Non")}</button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmRemove(member.id)}
                    style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${T.red}40`, background: T.bgCard, color: T.red, cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 600 }}
                  >
                    {t("team_members.remove", "Retirer")}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
