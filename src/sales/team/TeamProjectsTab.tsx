import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { T } from "../../theme";
import { useCurrentAgent } from "../../hooks/useCurrentAgent";
import { TeamProject, TeamTask, TeamMember } from "./teamTypes";
import { useLanguage } from "../../i18n/LanguageContext";

const PRIORITY_STYLE: Record<string, { bg: string; color: string }> = {
  Haute: { bg: "#fef2f2", color: T.red },
  Moyenne: { bg: "#fffbeb", color: T.orange },
  Basse: { bg: "#f0fdf4", color: T.green },
};
const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  "En cours": { bg: "#eff6ff", color: T.main },
  "Complété": { bg: "#f0fdf4", color: T.green },
  "En pause": { bg: "#f9fafb", color: T.textLight },
};

function ProjectCard({ project, members, isLeader, onUpdate }: {
  project: TeamProject; members: TeamMember[]; isLeader: boolean;
  onUpdate: (p: TeamProject) => void;
}) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [tasks, setTasks] = useState<TeamTask[]>(project.tasks ?? []);
  const [newTask, setNewTask] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState(members[0]?.id ?? "");
  const [notes, setNotes] = useState(project.notes);
  const [savingNotes, setSavingNotes] = useState(false);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const pct = totalTasks > 0 ? completedTasks / totalTasks : 0;

  const toggleTask = async (task: TeamTask) => {
    const updated = { ...task, completed: !task.completed, completed_at: !task.completed ? new Date().toISOString() : undefined };
    await supabase.from("team_tasks").update({ completed: updated.completed, completed_at: updated.completed_at ?? null }).eq("id", task.id);
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
  };

  const addTask = async () => {
    if (!newTask.trim()) return;
    const assignee = members.find(m => m.id === newTaskAssignee);
    const { data } = await supabase.from("team_tasks").insert({
      project_id: project.id, title: newTask.trim(),
      assigned_to: assignee?.agent_name ?? "", assigned_member_id: newTaskAssignee || null, completed: false,
    }).select().maybeSingle();
    if (data) { setTasks(prev => [...prev, data as TeamTask]); setNewTask(""); }
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    await supabase.from("team_projects").update({ notes }).eq("id", project.id);
    setSavingNotes(false);
  };

  const pri = PRIORITY_STYLE[project.priority] ?? PRIORITY_STYLE.Moyenne;
  const stat = STATUS_STYLE[project.status] ?? STATUS_STYLE["En cours"];

  return (
    <div style={{ background: T.bgCard, borderRadius: 16, border: `1px solid ${T.border}`, overflow: "hidden" }}>
      <div
        style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
        onClick={() => setExpanded(v => !v)}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{project.name}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: pri.bg, color: pri.color }}>{project.priority}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: stat.bg, color: stat.color }}>{project.status}</span>
          </div>
          {project.description && <div style={{ fontSize: 11, color: T.textLight }}>{project.description}</div>}
          <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center" }}>
            <div style={{ height: 5, borderRadius: 99, background: "rgba(0,0,0,0.04)", overflow: "hidden", width: 120 }}>
              <div style={{ height: "100%", borderRadius: 99, width: `${Math.round(pct * 100)}%`, background: pct === 1 ? T.green : T.main, transition: "width 0.5s" }} />
            </div>
            <span style={{ fontSize: 10, color: T.textLight }}>{completedTasks}/{totalTasks} {t("team_projects.tasks", "tâches")}</span>
            <div style={{ display: "flex", gap: -4 }}>
              {project.assigned_member_ids.slice(0, 4).map(mid => {
                const m = members.find(mm => mm.id === mid);
                if (!m) return null;
                return (
                  <div key={mid} title={m.agent_name} style={{ width: 22, height: 22, borderRadius: "50%", background: m.avatar_color, color: "#fff", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff", marginLeft: -4 }}>
                    {m.agent_initials}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <span style={{ fontSize: 14, color: T.textLight }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${T.border}` }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>{t("team_projects.tasks", "Tâches")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {tasks.map(task => {
                const assignee = members.find(m => m.id === task.assigned_member_id);
                return (
                  <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input type="checkbox" checked={task.completed} onChange={() => toggleTask(task)} style={{ width: 16, height: 16, cursor: "pointer", accentColor: T.main }} />
                    <span style={{ flex: 1, fontSize: 12, color: task.completed ? T.textLight : T.text, textDecoration: task.completed ? "line-through" : "none" }}>
                      {task.title}
                    </span>
                    {assignee && (
                      <div title={assignee.agent_name} style={{ width: 20, height: 20, borderRadius: "50%", background: assignee.avatar_color, color: "#fff", fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {assignee.agent_initials}
                      </div>
                    )}
                    {task.due_date && <span style={{ fontSize: 10, color: T.textLight }}>{new Date(task.due_date).toLocaleDateString("fr-FR")}</span>}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()} placeholder={t("team_projects.add_task_placeholder", "+ Ajouter une tâche...")}
                style={{ flex: 1, height: 32, borderRadius: 8, border: `1px solid ${T.border}`, padding: "0 10px", fontSize: 12, fontFamily: "inherit", outline: "none" }} />
              <select value={newTaskAssignee} onChange={e => setNewTaskAssignee(e.target.value)}
                style={{ height: 32, borderRadius: 8, border: `1px solid ${T.border}`, padding: "0 8px", fontSize: 11, fontFamily: "inherit", outline: "none" }}>
                {members.map(m => <option key={m.id} value={m.id}>{m.agent_name.split(" ")[0]}</option>)}
              </select>
              <button onClick={addTask} style={{ height: 32, padding: "0 14px", borderRadius: 8, border: "none", background: T.main, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>
                {t("team_projects.add", "Ajouter")}
              </button>
            </div>
          </div>

          <div style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{t("team_projects.project_notes", "Notes du projet")}</div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder={t("team_projects.notes_placeholder", "Notes partagées entre tous les membres assignés...")}
              style={{ width: "100%", height: 80, padding: 10, borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 12, fontFamily: "inherit", resize: "none", outline: "none", boxSizing: "border-box" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectForm({ teamId, members, onSave, onClose }: { teamId: string; members: TeamMember[]; onSave: (p: TeamProject) => void; onClose: () => void }) {
  const { t } = useLanguage();
  const agent = useCurrentAgent();
  const today = new Date().toISOString().split("T")[0];
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("Moyenne");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const { data } = await supabase.from("team_projects").insert({
      team_id: teamId, name: name.trim(), description: desc, priority, status: "En cours",
      start_date: start, end_date: end, assigned_member_ids: assignees, notes: "", created_by: agent.name,
    }).select().maybeSingle();
    setLoading(false);
    if (data) { onSave({ ...(data as TeamProject), tasks: [] }); onClose(); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(230,228,224,0.35)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.bgCard, borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 24px 80px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between" }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: T.text }}>{t("team_projects.new_project", "Nouveau projet")}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: T.textLight }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.textLight, display: "block", marginBottom: 4 }}>{t("team_projects.project_name", "Nom du projet")} <span style={{ color: T.red }}>*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder={t("team_projects.project_name_placeholder", "Ex: Blitz prospection Rive-Sud")}
              style={{ width: "100%", height: 36, borderRadius: 8, border: `1px solid ${T.border}`, padding: "0 10px", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.textLight, display: "block", marginBottom: 4 }}>{t("team_projects.description", "Description")}</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder={t("team_projects.description_placeholder", "Décrivez l'objectif du projet...")}
              style={{ width: "100%", height: 70, padding: 10, borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: "inherit", resize: "none", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.textLight, display: "block", marginBottom: 4 }}>{t("team_projects.priority", "Priorité")}</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} style={{ width: "100%", height: 36, borderRadius: 8, border: `1px solid ${T.border}`, padding: "0 8px", fontSize: 12, fontFamily: "inherit", outline: "none" }}>
                {["Haute", "Moyenne", "Basse"].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.textLight, display: "block", marginBottom: 4 }}>{t("team_projects.start", "Début")}</label>
              <input type="date" value={start} onChange={e => setStart(e.target.value)} style={{ width: "100%", height: 36, borderRadius: 8, border: `1px solid ${T.border}`, padding: "0 8px", fontSize: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.textLight, display: "block", marginBottom: 4 }}>{t("team_projects.end", "Fin")}</label>
              <input type="date" value={end} onChange={e => setEnd(e.target.value)} style={{ width: "100%", height: 36, borderRadius: 8, border: `1px solid ${T.border}`, padding: "0 8px", fontSize: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.textLight, display: "block", marginBottom: 6 }}>{t("team_projects.assigned_members", "Membres assignés")}</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {members.map(m => {
                const selected = assignees.includes(m.id);
                return (
                  <button key={m.id} onClick={() => setAssignees(prev => selected ? prev.filter(id => id !== m.id) : [...prev, m.id])}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 99, border: `1.5px solid ${selected ? m.avatar_color : T.border}`, background: selected ? `${m.avatar_color}15` : "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: m.avatar_color, color: "#fff", fontSize: 7, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {m.agent_initials}
                    </div>
                    {m.agent_name.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div style={{ padding: "12px 24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bgCard, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>{t("common.cancel", "Annuler")}</button>
          <button onClick={handleSave} disabled={!name.trim() || loading} style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: name ? T.main : "#e5e7eb", color: name ? "#fff" : T.textLight, cursor: name ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>
            {loading ? t("common.creating", "Création...") : t("team_projects.create_project", "Créer le projet")}
          </button>
        </div>
      </div>
    </div>
  );
}

interface Props { team: { id: string }; members: TeamMember[]; isLeader: boolean; }

export default function TeamProjectsTab({ team, members, isLeader }: Props) {
  const { t } = useLanguage();
  const [projects, setProjects] = useState<TeamProject[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: projs } = await supabase.from("team_projects").select("*").eq("team_id", team.id).order("created_at", { ascending: false });
    if (!projs) { setLoading(false); return; }

    const projIds = projs.map((p: TeamProject) => p.id);
    let allTasks: TeamTask[] = [];
    if (projIds.length > 0) {
      const { data: tasks } = await supabase.from("team_tasks").select("*").in("project_id", projIds);
      if (tasks) allTasks = tasks as TeamTask[];
    }

    setProjects((projs as TeamProject[]).map(p => ({ ...p, tasks: allTasks.filter(t => t.project_id === p.id) })));
    setLoading(false);
  }, [team.id]);
  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ padding: "24px 28px", maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text }}>{t("team_projects.team_projects", "Projets d'équipe")}</h3>
        {isLeader && (
          <button onClick={() => setShowForm(true)} style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: T.main, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>
            + {t("team_projects.new_project", "Nouveau projet")}
          </button>
        )}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: T.textLight }}>{t("common.loading", "Chargement...")}</div>}
      {!loading && projects.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: T.textLight }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚀</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{t("team_projects.no_active_projects", "Aucun projet actif")}</div>
          {isLeader && <div style={{ fontSize: 12, marginTop: 4 }}>{t("team_projects.create_first_project", "Créez le premier projet de votre équipe")}</div>}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {projects.map(p => (
          <ProjectCard key={p.id} project={p} members={members} isLeader={isLeader} onUpdate={updated => setProjects(prev => prev.map(pp => pp.id === updated.id ? updated : pp))} />
        ))}
      </div>

      {showForm && <ProjectForm teamId={team.id} members={members} onSave={p => setProjects(prev => [p, ...prev])} onClose={() => setShowForm(false)} />}
    </div>
  );
}
