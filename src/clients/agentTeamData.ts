import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAgents, AgentOption } from "../hooks/useAgents";

export type SalesTeam = {
  id: string;
  name: string;
  chef: string;
  color: string;
  agents: string[];
};

const TEAM_COLORS = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#0891b2", "#dc2626"];

let cachedTeams: SalesTeam[] | null = null;

export function useTeams() {
  const agents = useAgents();
  const [teams, setTeams] = useState<SalesTeam[]>(cachedTeams || []);

  useEffect(() => {
    if (cachedTeams) { setTeams(cachedTeams); return; }
    supabase
      .from("teams")
      .select("id, name, region")
      .order("name")
      .then(({ data }) => {
        if (data && agents.length > 0) {
          const mapped: SalesTeam[] = data.map((t, i) => {
            const teamAgents = agents.filter(a => a.team_id === t.id);
            return {
              id: t.id,
              name: t.name,
              chef: teamAgents[0]?.name || "—",
              color: TEAM_COLORS[i % TEAM_COLORS.length],
              agents: teamAgents.map(a => a.id),
            };
          });
          const agentsWithoutTeam = agents.filter(a => !a.team_id || !data.find(t => t.id === a.team_id));
          if (agentsWithoutTeam.length > 0) {
            mapped.push({
              id: "team_solo",
              name: "Solo / Sans équipe",
              chef: "—",
              color: "#6b7280",
              agents: agentsWithoutTeam.map(a => a.id),
            });
          }
          cachedTeams = mapped;
          setTeams(mapped);
        }
      });
  }, [agents]);

  return teams;
}

// Keep backward-compatible exports for consumers that import ALL_AGENTS / SALES_TEAMS
// These are now empty — consumers must switch to hooks
export const SALES_TEAMS: SalesTeam[] = [];
export const ALL_AGENTS: { id: string; name: string; team: string }[] = [];
