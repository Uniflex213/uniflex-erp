import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";

export interface UserPreferences {
  personal_notes: string;
  dashboard_widgets: string[];
  dashboard_widget_order: string[];
  dashboard_sales_period: string;
  workstation_notes: string;
  workstation_widgets: string[];
  workstation_widget_order: string[];
  workstation_personal_goals: Record<string, number>;
  workstation_sticky_notes: any[];
}

const DEFAULT_PREFS: UserPreferences = {
  personal_notes: "",
  dashboard_widgets: [],
  dashboard_widget_order: [],
  dashboard_sales_period: "monthly",
  workstation_notes: "",
  workstation_widgets: [],
  workstation_widget_order: [],
  workstation_personal_goals: {},
  workstation_sticky_notes: [],
};

/**
 * Syncs user preferences to Supabase (user_preferences table).
 * Zero localStorage — everything is in the DB.
 */
export function useUserPreferences() {
  const { user } = useAuth();
  const userId = user?.id;
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestPrefs = useRef(prefs);
  latestPrefs.current = prefs;

  // Load on mount
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (data) {
        setPrefs({
          personal_notes: data.personal_notes || "",
          dashboard_widgets: data.dashboard_widgets || [],
          dashboard_widget_order: data.dashboard_widget_order || [],
          dashboard_sales_period: data.dashboard_sales_period || "monthly",
          workstation_notes: data.workstation_notes || "",
          workstation_widgets: data.workstation_widgets || [],
          workstation_widget_order: data.workstation_widget_order || [],
          workstation_personal_goals: data.workstation_personal_goals || {},
          workstation_sticky_notes: data.workstation_sticky_notes || [],
        });
      } else {
        // First time — create row with defaults
        await supabase.from("user_preferences").upsert({
          user_id: userId,
          ...DEFAULT_PREFS,
        });
      }
      setLoaded(true);
    })();
  }, [userId]);

  // Debounced save to Supabase
  const saveToDb = useCallback((updated: Partial<UserPreferences>) => {
    if (!userId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await supabase.from("user_preferences").upsert({
        user_id: userId,
        ...latestPrefs.current,
        ...updated,
        updated_at: new Date().toISOString(),
      });
    }, 600);
  }, [userId]);

  const updatePref = useCallback(<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPrefs(prev => {
      const next = { ...prev, [key]: value };
      latestPrefs.current = next;
      return next;
    });
    saveToDb({ [key]: value });
  }, [saveToDb]);

  return { prefs, loaded, updatePref };
}
