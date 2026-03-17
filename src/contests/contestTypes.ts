export interface Contest {
  id: string;
  title: string;
  description: string;
  prize_description: string;
  prize_value: number;
  start_date: string;
  end_date: string;
  scoring_rule: 'sales_total' | 'new_clients' | 'orders_count' | 'custom_points';
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  min_participants: number;
  created_by: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  participants?: ContestParticipant[];
  prizes?: ContestPrize[];
}

export interface ContestParticipant {
  id: string;
  contest_id: string;
  user_id: string;
  total_points: number;
  current_rank: number;
  opted_in_at: string;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string;
    avatar_url: string | null;
    role: string;
  };
}

export interface ContestPointEvent {
  id: string;
  contest_id: string;
  user_id: string;
  event_type: 'sale' | 'new_client' | 'order' | 'manual_adjustment' | 'bonus';
  points: number;
  reference_id: string | null;
  description: string;
  created_by: string | null;
  owner_id: string | null;
  created_at: string;
  created_by_name?: string;
  user_name?: string;
}

export interface ContestPrize {
  id: string;
  contest_id: string;
  rank_from: number;
  rank_to: number;
  prize_description: string;
  prize_value: number;
  created_at: string;
}

export const SCORING_RULES: { key: Contest['scoring_rule']; label: string }[] = [
  { key: 'sales_total', label: 'Total des ventes ($)' },
  { key: 'new_clients', label: 'Nouveaux clients' },
  { key: 'orders_count', label: 'Nombre de commandes' },
  { key: 'custom_points', label: 'Points manuels' },
];

export const CONTEST_STATUSES: { key: Contest['status']; label: string; color: string; bg: string }[] = [
  { key: 'draft', label: 'Brouillon', color: '#636366', bg: '#f3f4f6' },
  { key: 'active', label: 'Actif', color: '#34c759', bg: '#d1f5db' },
  { key: 'completed', label: 'Termine', color: '#007aff', bg: '#dbeafe' },
  { key: 'cancelled', label: 'Annule', color: '#ff3b30', bg: '#ffe5e3' },
];
