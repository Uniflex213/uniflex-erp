import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export type AgentOption = {
  id: string;
  name: string;
  initials: string;
  color: string;
  team_id: string | null;
};

const AGENT_COLORS = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#0891b2", "#dc2626", "#0d9488", "#7c3aed"];

let cachedAgents: AgentOption[] | null = null;

export function useAgents() {
  const [agents, setAgents] = useState<AgentOption[]>(cachedAgents || []);

  useEffect(() => {
    if (cachedAgents) { setAgents(cachedAgents); return; }
    supabase
      .from("profiles")
      .select("id, full_name, team_id")
      .in("role", ["vendeur", "admin", "god_admin"])
      .eq("is_active", true)
      .order("full_name")
      .then(({ data }) => {
        if (data) {
          const mapped = data.map((p, i) => ({
            id: p.id,
            name: p.full_name,
            initials: p.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
            color: AGENT_COLORS[i % AGENT_COLORS.length],
            team_id: p.team_id,
          }));
          cachedAgents = mapped;
          setAgents(mapped);
        }
      });
  }, []);

  return agents;
}
