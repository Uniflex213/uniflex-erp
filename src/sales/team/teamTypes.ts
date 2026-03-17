export interface Team {
  id: string;
  name: string;
  description: string;
  join_code: string;
  code_active: boolean;
  region: string;
  monthly_target: number;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  agent_name: string;
  agent_initials: string;
  agent_email: string;
  agent_phone: string;
  region: string;
  role: "leader" | "member";
  is_online: boolean;
  last_seen_at: string;
  avatar_color: string;
  joined_at: string;
  removed_at?: string | null;
  sales_mtd?: number;
  deals_closed?: number;
  leads_active?: number;
  conversion_rate?: number;
  commission_mtd?: number;
}

export interface TeamJoinRequest {
  id: string;
  requester_name: string;
  requester_email: string;
  reason: string;
  estimated_members: number;
  target_region: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string;
  generated_code?: string;
  team_id?: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface TeamMessage {
  id: string;
  team_id: string;
  member_id: string;
  content: string;
  message_type: "text" | "file" | "system";
  file_url?: string;
  file_name?: string;
  file_type?: string;
  is_system: boolean;
  created_at: string;
  member?: TeamMember;
  reactions?: TeamMessageReaction[];
}

export interface TeamMessageReaction {
  id: string;
  message_id: string;
  member_id: string;
  emoji: string;
  created_at: string;
}

export interface TeamGoal {
  id: string;
  team_id: string;
  title: string;
  description: string;
  goal_type: "sales" | "deals" | "leads" | "activities" | "other";
  target_value: number;
  current_value: number;
  start_date: string;
  end_date: string;
  status: "active" | "achieved" | "archived";
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TeamProject {
  id: string;
  team_id: string;
  name: string;
  description: string;
  priority: "Haute" | "Moyenne" | "Basse";
  status: "En cours" | "Complété" | "En pause";
  start_date: string;
  end_date: string;
  notes: string;
  assigned_member_ids: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  tasks?: TeamTask[];
}

export interface TeamTask {
  id: string;
  project_id: string;
  title: string;
  assigned_to: string;
  assigned_member_id?: string;
  due_date?: string;
  completed: boolean;
  completed_at?: string;
  created_at: string;
}

export interface TeamCommission {
  id: string;
  team_id: string;
  member_id: string;
  period_start: string;
  period_end: string;
  gross_sales: number;
  commission_rate: number;
  gross_commission: number;
  deductions: number;
  net_commission: number;
  payment_status: "pending" | "paid" | "waiting";
  payment_date?: string;
  payment_method?: string;
  payment_ref?: string;
  notes: string;
  created_at: string;
  member?: TeamMember;
}

export interface TeamActivityItem {
  id: string;
  type: "deal_closed" | "lead_created" | "pricelist_sent" | "order_placed" | "call_logged" | "joined" | "other";
  member_name: string;
  member_initials: string;
  avatar_color: string;
  description: string;
  amount?: number;
  lead_name?: string;
  created_at: string;
}

export type TeamTab = "overview" | "members" | "chat" | "crm" | "goals" | "commissions" | "projects";

export const AVATAR_COLORS = [
  "#6366f1", "#16a34a", "#ea580c", "#0891b2", "#7c3aed",
  "#dc2626", "#0d9488", "#d97706", "#6366f1", "#db2777",
];
