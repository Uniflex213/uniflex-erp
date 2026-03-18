import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { UserProfile, ROLE_COLORS, ROLE_LABELS, getInitials } from "./messagingTypes";
import { T } from "../theme";

interface Props {
  currentUser: UserProfile;
  allowedRoles: string[];
  onStart: (userId: string) => void;
  onClose: () => void;
}

type Tab = "team" | "search" | "contacts";

export default function NewConversationModal({ currentUser, allowedRoles, onStart, onClose }: Props) {
  const [tab, setTab] = useState<Tab>(currentUser.team_id ? "team" : "search");
  const [teammates, setTeammates] = useState<UserProfile[]>([]);
  const [roleUsers, setRoleUsers] = useState<UserProfile[]>([]);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [query, setQuery] = useState("");
  const [emailQuery, setEmailQuery] = useState("");
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [loadingRole, setLoadingRole] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);

  useEffect(() => {
    if (currentUser.team_id) {
      supabase
        .from("profiles")
        .select("id, full_name, email, role, avatar_url, job_title, team_id")
        .eq("team_id", currentUser.team_id)
        .neq("id", currentUser.id)
        .eq("is_active", true)
        .order("full_name")
        .then(({ data }) => {
          setTeammates((data as UserProfile[]) ?? []);
          setLoadingTeam(false);
        });
    } else {
      setLoadingTeam(false);
    }
  }, [currentUser.team_id, currentUser.id]);

  useEffect(() => {
    if (allowedRoles.length === 0) { setLoadingRole(false); return; }
    supabase
      .from("profiles")
      .select("id, full_name, email, role, avatar_url, job_title, team_id")
      .neq("id", currentUser.id)
      .eq("is_active", true)
      .in("role", ["admin", "god_admin"])
      .order("full_name")
      .then(({ data }) => {
        setRoleUsers((data as UserProfile[]) ?? []);
        setLoadingRole(false);
      });
  }, [allowedRoles, currentUser.id]);

  const handleEmailSearch = useCallback(async () => {
    const q = emailQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchDone(false);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, avatar_url, job_title, team_id")
      .neq("id", currentUser.id)
      .eq("is_active", true)
      .or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
      .order("full_name")
      .limit(20);
    setSearchResults((data as UserProfile[]) ?? []);
    setSearching(false);
    setSearchDone(true);
  }, [emailQuery, currentUser.id]);

  const filteredTeammates = teammates.filter(u => !query || u.full_name.toLowerCase().includes(query.toLowerCase()));

  const filteredRoleUsers = roleUsers.filter(u =>
    !query || u.full_name.toLowerCase().includes(query.toLowerCase()) || (ROLE_LABELS[u.role] ?? "").toLowerCase().includes(query.toLowerCase())
  );
  const grouped: Record<string, UserProfile[]> = {};
  for (const u of filteredRoleUsers) {
    if (!grouped[u.role]) grouped[u.role] = [];
    grouped[u.role].push(u);
  }
  const roleOrder = ["god_admin", "admin", "vendeur", "manuf", "magasin"];

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: "team", label: "Mon equipe", show: !!currentUser.team_id },
    { key: "search", label: "Rechercher", show: true },
    { key: "contacts", label: "Contacts", show: true },
  ];

  const renderUser = (user: UserProfile, showEmail = false) => {
    const rc = ROLE_COLORS[user.role] ?? { bg: "#374151", color: "#9ca3af" };
    const isSameTeam = currentUser.team_id && user.team_id === currentUser.team_id;
    return (
      <button
        key={user.id}
        onClick={() => onStart(user.id)}
        style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", borderBottom: `1px solid ${T.border}`, cursor: "pointer", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, transition: "background 0.1s" }}
        onMouseEnter={e => (e.currentTarget.style.background = T.hover)}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: rc.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: rc.color, flexShrink: 0 }}>
            {getInitials(user.full_name)}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.full_name}</span>
            {isSameTeam && (
              <span style={{ fontSize: 9, fontWeight: 700, background: T.teamBg, color: T.main, padding: "1px 6px", borderRadius: 4, flexShrink: 0 }}>Equipe</span>
            )}
          </div>
          {showEmail && user.email ? (
            <div style={{ fontSize: 11, color: T.textMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
          ) : user.job_title ? (
            <div style={{ fontSize: 11, color: T.textMid }}>{user.job_title}</div>
          ) : (
            <div style={{ fontSize: 11, color: T.textMid }}>{ROLE_LABELS[user.role] ?? user.role}</div>
          )}
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, background: rc.bg, color: rc.color, padding: "2px 7px", borderRadius: 4, flexShrink: 0 }}>
          {ROLE_LABELS[user.role] ?? user.role}
        </span>
      </button>
    );
  };

  const searchInput = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.input, borderRadius: 8, padding: "8px 12px" }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.textMid} strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Filtrer par nom..."
        autoFocus
        style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, color: T.text, fontFamily: "inherit", flex: 1 }}
      />
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: T.overlay, backdropFilter: "blur(4px)", zIndex: 9700, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: T.card, borderRadius: 16, width: "100%", maxWidth: 440, maxHeight: "82vh", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.5)", border: `1px solid ${T.border}` }}>
        <div style={{ padding: "16px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: T.text }}>Nouvelle conversation</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMid, display: "flex", padding: 4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, padding: "0 14px" }}>
          {tabs.filter(t => t.show).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                background: "none", border: "none",
                borderBottom: tab === t.key ? `2px solid ${T.main}` : "2px solid transparent",
                cursor: "pointer", padding: "10px 14px", fontSize: 12,
                fontWeight: tab === t.key ? 700 : 500,
                color: tab === t.key ? T.text : T.textMid,
                fontFamily: "inherit", transition: "all 0.15s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "team" && (
          <>
            <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}` }}>{searchInput}</div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {loadingTeam ? (
                <div style={{ padding: 24, textAlign: "center", color: T.textMid, fontSize: 13 }}>Chargement...</div>
              ) : filteredTeammates.length === 0 ? (
                <div style={{ padding: "32px 16px", textAlign: "center", color: T.textMid, fontSize: 13, lineHeight: 1.6 }}>
                  {teammates.length === 0 ? "Aucun coequipier trouve." : "Aucun resultat pour ce filtre."}
                </div>
              ) : (
                filteredTeammates.map(u => renderUser(u))
              )}
            </div>
          </>
        )}

        {tab === "search" && (
          <>
            <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 12, color: T.textMid, marginBottom: 8 }}>Recherchez un utilisateur par adresse courriel ou nom</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.input, borderRadius: 8, padding: "8px 12px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.textMid} strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  value={emailQuery}
                  onChange={e => setEmailQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleEmailSearch()}
                  placeholder="nom@exemple.com ou nom..."
                  autoFocus
                  style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, color: T.text, fontFamily: "inherit", flex: 1 }}
                />
                <button
                  onClick={handleEmailSearch}
                  disabled={!emailQuery.trim() || searching}
                  style={{
                    background: emailQuery.trim() && !searching ? T.main : "rgba(0,0,0,0.06)",
                    color: emailQuery.trim() && !searching ? "#fff" : T.textMid,
                    border: "none", borderRadius: 6, padding: "5px 12px",
                    fontSize: 12, fontWeight: 700,
                    cursor: emailQuery.trim() && !searching ? "pointer" : "default",
                    fontFamily: "inherit",
                  }}
                >
                  {searching ? "..." : "Chercher"}
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {searching ? (
                <div style={{ padding: 24, textAlign: "center", color: T.textMid, fontSize: 13 }}>Recherche...</div>
              ) : searchDone && searchResults.length === 0 ? (
                <div style={{ padding: "32px 16px", textAlign: "center", color: T.textMid, fontSize: 13, lineHeight: 1.6 }}>
                  Aucun utilisateur trouve pour "{emailQuery}".
                </div>
              ) : searchResults.length > 0 ? (
                <>
                  <div style={{ padding: "8px 14px 4px", fontSize: 10, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.7 }}>
                    {searchResults.length} resultat{searchResults.length > 1 ? "s" : ""}
                  </div>
                  {searchResults.map(u => renderUser(u, true))}
                </>
              ) : (
                <div style={{ padding: "40px 16px", textAlign: "center", color: T.textMid, fontSize: 13, lineHeight: 1.6 }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3, marginBottom: 8 }}>
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <br/>Tapez un courriel ou nom pour trouver un utilisateur
                </div>
              )}
            </div>
          </>
        )}

        {tab === "contacts" && (
          <>
            <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}` }}>{searchInput}</div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {loadingRole ? (
                <div style={{ padding: 24, textAlign: "center", color: T.textMid, fontSize: 13 }}>Chargement...</div>
              ) : filteredRoleUsers.length === 0 ? (
                <div style={{ padding: "32px 16px", textAlign: "center", color: T.textMid, fontSize: 13 }}>Aucun contact disponible.</div>
              ) : (
                roleOrder.filter(r => grouped[r]?.length).map(role => (
                  <div key={role}>
                    <div style={{ padding: "8px 14px 4px", fontSize: 10, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.7 }}>
                      {ROLE_LABELS[role] ?? role}
                    </div>
                    {grouped[role].map(user => renderUser(user))}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
