import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { T } from "../../theme";
import { useCurrentAgent } from "../../hooks/useCurrentAgent";
import { TeamGoal, Team, TeamMember } from "./teamTypes";
import { fmtCurrency } from "./teamUtils";

const GOAL_TYPES = ["sales", "deals", "leads", "activities", "other"] as const;
const GOAL_TYPE_LABELS: Record<string, string> = { sales: "Ventes ($)", deals: "Nombre de deals", leads: "Nombre de leads", activities: "Activités", other: "Autre" };

function CircleProgress({ pct, size = 80 }: { pct: number; size?: number }) {
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const offset = c - pct * c;
  const color = pct >= 1 ? T.green : pct > 0.7 ? T.orange : T.main;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize={11} fontWeight={800}
        fill={color} style={{ transform: `rotate(90deg) translate(0px, -${size}px)` }}>
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

function GoalForm({ teamId, onSave, onClose }: { teamId: string; onSave: (g: TeamGoal) => void; onClose: () => void }) {
  const agent = useCurrentAgent();
  const today = new Date().toISOString().split("T")[0];
  const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState<string>("sales");
  const [target, setTarget] = useState("");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(nextMonth);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !target) return;
    setLoading(true);
    const { data } = await supabase.from("team_goals").insert({
      team_id: teamId, title: title.trim(), description: desc, goal_type: type,
      target_value: parseFloat(target), current_value: 0,
      start_date: start, end_date: end, status: "active", created_by: agent.name,
    }).select().maybeSingle();
    setLoading(false);
    if (data) { onSave(data as TeamGoal); onClose(); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.bgCard, borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 24px 80px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between" }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: T.text }}>Nouvel objectif</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: T.textLight }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {[["Titre", "text", title, setTitle, "Ex: Closer 20 clients ce trimestre"], ["Description", "text", desc, setDesc, "Notes optionnelles"]].map(([label, type, val, setter, ph]) => (
            <div key={label as string}>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.textLight, display: "block", marginBottom: 4 }}>{label as string}</label>
              <input value={val as string} onChange={e => (setter as (v: string) => void)(e.target.value)} placeholder={ph as string}
                style={{ width: "100%", height: 36, borderRadius: 8, border: `1px solid ${T.border}`, padding: "0 10px", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.textLight, display: "block", marginBottom: 4 }}>Type</label>
              <select value={type} onChange={e => setType(e.target.value)} style={{ width: "100%", height: 36, borderRadius: 8, border: `1px solid ${T.border}`, padding: "0 10px", fontSize: 13, fontFamily: "inherit", outline: "none" }}>
                {GOAL_TYPES.map(t => <option key={t} value={t}>{GOAL_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.textLight, display: "block", marginBottom: 4 }}>Valeur cible</label>
              <input type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="Ex: 200000"
                style={{ width: "100%", height: 36, borderRadius: 8, border: `1px solid ${T.border}`, padding: "0 10px", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.textLight, display: "block", marginBottom: 4 }}>Début</label>
              <input type="date" value={start} onChange={e => setStart(e.target.value)} style={{ width: "100%", height: 36, borderRadius: 8, border: `1px solid ${T.border}`, padding: "0 10px", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.textLight, display: "block", marginBottom: 4 }}>Fin</label>
              <input type="date" value={end} onChange={e => setEnd(e.target.value)} style={{ width: "100%", height: 36, borderRadius: 8, border: `1px solid ${T.border}`, padding: "0 10px", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
        </div>
        <div style={{ padding: "12px 24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Annuler</button>
          <button onClick={handleSave} disabled={!title.trim() || !target || loading} style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: title && target ? T.main : "#e5e7eb", color: title && target ? "#fff" : T.textLight, cursor: title && target ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>
            {loading ? "Création..." : "Créer l'objectif"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface Props { team: Team; members: TeamMember[]; isLeader: boolean; }

export default function TeamGoalsTab({ team, members, isLeader }: Props) {
  const [goals, setGoals] = useState<TeamGoal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("team_goals").select("*").eq("team_id", team.id).order("created_at", { ascending: false });
    if (data) setGoals(data as TeamGoal[]);
    setLoading(false);
  }, [team.id]);
  useEffect(() => { load(); }, [load]);

  const active = goals.filter(g => g.status !== "archived");
  const archived = goals.filter(g => g.status === "archived");
  const achieved = archived.filter(g => g.status === "achieved").length;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: "0 0 2px", fontSize: 16, fontWeight: 800, color: T.text }}>Objectifs d'équipe</h3>
          {archived.length > 0 && <div style={{ fontSize: 11, color: T.textLight }}>{achieved} objectifs atteints sur {archived.length} au total</div>}
        </div>
        {isLeader && (
          <button onClick={() => setShowForm(true)} style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: T.main, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>
            + Nouvel objectif
          </button>
        )}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: T.textLight }}>Chargement...</div>}

      {!loading && active.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: T.textLight }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Aucun objectif actif</div>
          {isLeader && <div style={{ fontSize: 12, marginTop: 4 }}>Créez le premier objectif de votre équipe</div>}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {active.map(goal => {
          const pct = goal.target_value > 0 ? Math.min(1, goal.current_value / goal.target_value) : 0;
          const daysLeft = Math.max(0, Math.ceil((new Date(goal.end_date).getTime() - Date.now()) / 86400000));
          const achieved = pct >= 1;
          const urgent = daysLeft <= 7 && !achieved;
          const isMonetary = goal.goal_type === "sales";

          return (
            <div key={goal.id} style={{ background: achieved ? "#f0fdf4" : "#fff", borderRadius: 16, padding: "20px 24px", border: `1px solid ${achieved ? "#bbf7d0" : T.border}` }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
                <div style={{ flexShrink: 0 }}>
                  <svg width={80} height={80} viewBox="0 0 80 80">
                    <circle cx={40} cy={40} r={32} fill="none" stroke="#e5e7eb" strokeWidth={6} />
                    <circle cx={40} cy={40} r={32} fill="none" stroke={pct >= 1 ? T.green : pct > 0.7 ? T.orange : T.main} strokeWidth={6}
                      strokeDasharray={`${2 * Math.PI * 32}`} strokeDashoffset={`${2 * Math.PI * 32 * (1 - pct)}`}
                      strokeLinecap="round" transform="rotate(-90 40 40)"
                      style={{ transition: "stroke-dashoffset 0.8s ease" }}
                    />
                    <text x={40} y={44} textAnchor="middle" fontSize={13} fontWeight={800} fill={pct >= 1 ? T.green : T.text}>
                      {Math.round(pct * 100)}%
                    </text>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{goal.title}</span>
                    {achieved && <span style={{ fontSize: 10, fontWeight: 800, background: "#dcfce7", color: T.green, padding: "2px 8px", borderRadius: 99 }}>✅ ATTEINT</span>}
                    {urgent && <span style={{ fontSize: 10, fontWeight: 800, background: "#fff7ed", color: T.orange, padding: "2px 8px", borderRadius: 99 }}>⚡ Dernière ligne droite</span>}
                  </div>
                  {goal.description && <p style={{ margin: "0 0 8px", fontSize: 12, color: T.textLight }}>{goal.description}</p>}
                  <div style={{ display: "flex", gap: 20, fontSize: 12, color: T.textLight, flexWrap: "wrap", marginBottom: 8 }}>
                    <span>Cible : <strong style={{ color: T.text }}>{isMonetary ? fmtCurrency(goal.target_value) : goal.target_value}</strong></span>
                    <span>Actuel : <strong style={{ color: T.main }}>{isMonetary ? fmtCurrency(goal.current_value) : goal.current_value}</strong></span>
                    <span>Jours restants : <strong style={{ color: daysLeft <= 7 ? T.orange : T.text }}>{daysLeft}</strong></span>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: "rgba(0,0,0,0.04)", overflow: "hidden", maxWidth: 400 }}>
                    <div style={{ height: "100%", borderRadius: 99, width: `${Math.round(pct * 100)}%`, background: achieved ? T.green : T.main, transition: "width 0.6s ease" }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && <GoalForm teamId={team.id} onSave={g => setGoals(prev => [g, ...prev])} onClose={() => setShowForm(false)} />}
    </div>
  );
}
