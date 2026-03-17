export type AdminProfile = {
  id: string;
  full_name: string;
  email: string;
  role: "god_admin" | "admin" | "vendeur" | "manuf" | "magasin";
  seller_code: string | null;
  vendeur_code: string | null;
  region_code: string | null;
  commission_rate: number | null;
  phone: string | null;
  job_title: string | null;
  avatar_url: string | null;
  team_id: string | null;
  username: string | null;
  is_active: boolean;
  is_suspended: boolean;
  suspended_until: string | null;
  suspension_reason: string | null;
  last_login_at: string | null;
  created_at: string;
};

export type PlatformTeam = {
  id: string;
  name: string;
  description: string | null;
  manager_id: string | null;
  created_at: string;
};

export type AccountRequest = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  role_requested: string | null;
  message: string | null;
  country: string | null;
  province: string | null;
  city: string | null;
  store_code_requested: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type CreateUserPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  username: string;
  phone: string;
  jobTitle: string;
  role: "god_admin" | "admin" | "vendeur" | "manuf" | "magasin";
  teamId: string;
  permissions: string[];
  requestId?: string;
};
