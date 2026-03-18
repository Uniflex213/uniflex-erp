import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";

export type AgentOption = {
  id: string;
  name: string;
  initials: string;
  color: string;
  team_id: string | null;
};

const AGENT_COLORS = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#0891b2", "#dc2626", "#0d9488", "#7c3aed"];

let cachedAllAgents: AgentOption[] | null = null;
const cachedTeamAgents: Record<string, AgentOption[]> = {};

function mapAgents(data: any[]): AgentOption[] {
  return data.map((p, i) => ({
    id: p.id,
    name: p.full_name,
    initials: p.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
    color: AGENT_COLORS[i % AGENT_COLORS.length],
    team_id: p.team_id,
  }));
}

/** Fetch ALL agents (no team filter). Use for admin/god_admin views. */
export function useAgents() {
  const [agents, setAgents] = useState<AgentOption[]>(cachedAllAgents || []);

  useEffect(() => {
    if (cachedAllAgents) { setAgents(cachedAllAgents); return; }
    supabase
      .from("profiles")
      .select("id, full_name, team_id")
      .in("role", ["vendeur", "admin", "god_admin"])
      .eq("is_active", true)
      .order("full_name")
      .then(({ data }) => {
        if (data) {
          const mapped = mapAgents(data);
          cachedAllAgents = mapped;
          setAgents(mapped);
        }
      });
  }, []);

  return agents;
}

/**
 * Fetch agents scoped to the current user's ecosystem:
 * - god_admin / admin: see ALL agents
 * - everyone else: see only agents from their own team
 */
export function useTeamAgents(): AgentOption[] {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin" || profile?.role === "god_admin";
  const teamId = profile?.team_id;
  const cacheKey = isAdmin ? "__all__" : (teamId || "__none__");

  const [agents, setAgents] = useState<AgentOption[]>(cachedTeamAgents[cacheKey] || []);

  useEffect(() => {
    if (cachedTeamAgents[cacheKey]?.length) { setAgents(cachedTeamAgents[cacheKey]); return; }

    let q = supabase
      .from("profiles")
      .select("id, full_name, team_id")
      .in("role", ["vendeur", "admin", "god_admin"])
      .eq("is_active", true)
      .order("full_name");

    if (!isAdmin && teamId) {
      q = q.eq("team_id", teamId);
    }

    q.then(({ data }) => {
      if (data) {
        const mapped = mapAgents(data);
        cachedTeamAgents[cacheKey] = mapped;
        setAgents(mapped);
      }
    });
  }, [cacheKey, isAdmin, teamId]);

  return agents;
}
