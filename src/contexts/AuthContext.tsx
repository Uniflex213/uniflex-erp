import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";
import { logActivity } from "../lib/activityLogger";
import { can as canFn } from "../lib/permissions";
import { useSimulation } from "./SimulationContext";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: "god_admin" | "admin" | "vendeur" | "manuf" | "magasin";
  seller_code: string | null;
  vendeur_code: string | null;
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
  totp_enrolled?: boolean;
  store_code: string | null;
  store_name: string | null;
  store_role: "owner" | "manager" | "staff" | null;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  permissions: string[];
  realProfile: Profile | null;
  realPermissions: string[];
  loading: boolean;
  suspendedError: string | null;
  signOut: () => Promise<void>;
  storeCode: string | null;
  can: (key: string) => boolean;
  reloadProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadUserData(userId: string): Promise<{
  profile: Profile | null;
  permissions: string[];
  error?: string;
}> {
  const [profileRes, permRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("user_permissions")
      .select("permission_key")
      .eq("user_id", userId),
  ]);

  if (!profileRes.data) {
    return { profile: null, permissions: [], error: "Profil introuvable." };
  }

  const profile = profileRes.data as Profile;

  if (!profile.is_active) {
    return { profile: null, permissions: [], error: "Ce compte a été désactivé." };
  }

  if (profile.is_suspended) {
    if (
      profile.suspended_until &&
      new Date(profile.suspended_until) <= new Date()
    ) {
      await supabase
        .from("profiles")
        .update({
          is_suspended: false,
          suspended_until: null,
          suspension_reason: null,
        })
        .eq("id", userId);
      profile.is_suspended = false;
    } else {
      const until = profile.suspended_until
        ? new Date(profile.suspended_until).toLocaleDateString("fr-CA")
        : "indéfiniment";
      return {
        profile: null,
        permissions: [],
        error: `Compte suspendu${profile.suspended_until ? " jusqu'au " + until : ""}. ${profile.suspension_reason ?? ""}`,
      };
    }
  }

  const permissions = (permRes.data ?? []).map(
    (r: { permission_key: string }) => r.permission_key
  );

  return { profile, permissions };
}

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [suspendedError, setSuspendedError] = useState<string | null>(null);

  const simulation = useSimulation();

  const hydrateUser = async (s: Session | null, isNewLogin = false) => {
    if (!s?.user) {
      setProfile(null);
      setPermissions([]);
      setUser(null);
      setSession(null);
      setSuspendedError(null);
      setLoading(false);
      return;
    }
    setSession(s);
    setUser(s.user);
    const { profile: p, permissions: perms, error } = await loadUserData(s.user.id);
    if (error) {
      setSuspendedError(error);
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }
    if (p && isNewLogin) {
      await logActivity(supabase, s.user.id, "login", "auth");
      await supabase
        .from("profiles")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", s.user.id);
    }
    setProfile(p);
    setPermissions(perms);
    setSuspendedError(null);
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      hydrateUser(s);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      (async () => {
        if (_event === "SIGNED_OUT") {
          setProfile(null);
          setPermissions([]);
          setUser(null);
          setSession(null);
          setSuspendedError(null);
          setLoading(false);
          return;
        }
        if (_event === "SIGNED_IN") {
          await hydrateUser(s, true);
        } else if (_event === "TOKEN_REFRESHED") {
          await hydrateUser(s, false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (user) await logActivity(supabase, user.id, "logout", "auth");
    await supabase.auth.signOut();
  };

  const reloadProfile = async () => {
    if (!user) return;
    const { profile: p, permissions: perms } = await loadUserData(user.id);
    setProfile(p);
    setPermissions(perms);
  };

  const effectiveProfile = simulation.isSimulating ? simulation.simulatedProfile : profile;
  const effectivePermissions = simulation.isSimulating ? simulation.simulatedPermissions : permissions;
  const storeCode = effectiveProfile?.store_code ?? null;

  const canCheck = (key: string) => {
    if (simulation.isSimulating) {
      return effectivePermissions.includes(key);
    }
    return profile?.role === "god_admin" || canFn(permissions, key);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile: effectiveProfile,
        permissions: effectivePermissions,
        realProfile: profile,
        realPermissions: permissions,
        loading,
        suspendedError,
        storeCode,
        signOut,
        can: canCheck,
        reloadProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthProviderInner>{children}</AuthProviderInner>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
