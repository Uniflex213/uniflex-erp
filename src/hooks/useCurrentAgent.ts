import { useAuth } from "../contexts/AuthContext";

export type AgentInfo = {
  id: string;
  name: string;
  firstName: string;
  initials: string;
  color: string;
  commissionRate: number;
};

export function useCurrentAgent(): AgentInfo {
  const { profile } = useAuth();
  const fullName = profile?.full_name || "Agent";
  const parts = fullName.split(" ");
  const initials = parts.map(n => n[0]).join("").toUpperCase().slice(0, 2);
  return {
    id: profile?.id || "",
    name: fullName,
    firstName: parts[0] || "Agent",
    initials,
    color: "#111",
    commissionRate: 8,
  };
}
