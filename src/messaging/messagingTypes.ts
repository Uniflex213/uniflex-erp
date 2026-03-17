export interface Conversation {
  id: string;
  created_at: string;
  last_message_at: string;
  participants?: ConversationParticipant[];
  last_message?: Message | null;
  other_user?: UserProfile | null;
  unread_count?: number;
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  last_read_at: string;
  profile?: UserProfile;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: UserProfile;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email?: string;
  role: string;
  avatar_url?: string | null;
  job_title?: string | null;
  team_id?: string | null;
}

export interface MessagingRule {
  id: string;
  source_role: string;
  target_role: string;
  can_message: boolean;
  created_at: string;
}

export const ROLE_LABELS: Record<string, string> = {
  god_admin: "God Admin",
  admin: "Admin",
  vendeur: "Vendeur",
  manuf: "Manuf",
  magasin: "Magasin",
};

export const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  god_admin: { bg: "#fee2e2", color: "#dc2626" },
  admin: { bg: "#dbeafe", color: "#2563eb" },
  vendeur: { bg: "#dcfce7", color: "#16a34a" },
  manuf: { bg: "#fef9c3", color: "#a16207" },
  magasin: { bg: "#fed7aa", color: "#ea580c" },
};

export const ALL_ROLES = ["god_admin", "admin", "vendeur", "manuf", "magasin"];

export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function avatarBg(role: string): string {
  return ROLE_COLORS[role]?.bg ?? "#f3f4f6";
}

export function avatarColor(role: string): string {
  return ROLE_COLORS[role]?.color ?? "#374151";
}
