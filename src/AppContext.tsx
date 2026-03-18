import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { CRMLead, CRMActivity, CRMReminder } from "./sales/crmTypes";
import { SampleRequest } from "./sales/sampleTypes";
import { SaleProduct } from "./sales/productTypes";
import { supabase } from "./supabaseClient";
import { useAuth } from "./contexts/AuthContext";
import { sendNotification } from "./lib/notifications";

export type PrefillData = {
  companyName?: string;
  address?: string;
  clientType?: string;
  contactName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientId?: string;
  destination?: string;
  leadId?: string;
};

export type TabItem = {
  id: string;
  pageKey: string;
  label: string;
  scrollPos: number;
  isDirty: boolean;
};

export type TabOverflowToast = {
  show: boolean;
  message: string;
};

interface AppContextValue {
  page: string;
  navigate: (page: string, prefill?: PrefillData) => void;
  prefillData: PrefillData | null;
  clearPrefill: () => void;
  tabs: TabItem[];
  activeTabIndex: number;
  openTab: (key: string, label: string) => void;
  closeTab: (index: number, force?: boolean) => void;
  switchTab: (index: number) => void;
  pinCurrentPage: (label: string) => void;
  canPinCurrentPage: () => boolean;
  tabOverflowToast: TabOverflowToast;
  dismissToast: () => void;
  saveScrollPosition: (scrollPos: number) => void;
  setTabDirty: (tabId: string, dirty: boolean) => void;
  getActiveTabId: () => string;
  leads: CRMLead[];
  setLeads: React.Dispatch<React.SetStateAction<CRMLead[]>>;
  updateLead: (lead: CRMLead) => Promise<void>;
  addLead: (data: Omit<CRMLead, "id" | "created_at" | "updated_at" | "activities" | "reminders" | "files">) => Promise<CRMLead | null>;
  deleteLead: (id: string) => Promise<void>;
  addActivity: (activity: Omit<CRMActivity, "id" | "created_at">) => Promise<CRMActivity | null>;
  addReminder: (reminder: Omit<CRMReminder, "id" | "created_at">) => Promise<CRMReminder | null>;
  updateReminder: (reminder: CRMReminder) => Promise<void>;
  reloadLeads: () => Promise<void>;
  samples: SampleRequest[];
  setSamples: React.Dispatch<React.SetStateAction<SampleRequest[]>>;
  addSample: (sample: SampleRequest) => void;
  updateSample: (sample: SampleRequest) => void;
  reloadSamples: () => Promise<void>;
  products: SaleProduct[];
  reloadProducts: () => Promise<void>;
  addProduct: (product: SaleProduct) => void;
  updateProduct: (product: SaleProduct) => void;
  deleteProduct: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

interface Props {
  children: (page: string, navigate: (page: string, prefill?: PrefillData) => void) => React.ReactNode;
}

function mapLead(row: any): CRMLead {
  return {
    ...row,
    activities: (row.crm_activities || []).sort((a: CRMActivity, b: CRMActivity) =>
      new Date(b.activity_at).getTime() - new Date(a.activity_at).getTime()
    ),
    reminders: row.crm_reminders || [],
    files: row.crm_files || [],
  };
}

const MAX_TABS = 10;

const STORAGE_KEY_TABS = "uniflex_tabs";
const STORAGE_KEY_ACTIVE = "uniflex_activeTab";
const STORAGE_KEY_PAGE = "uniflex_page";

function loadTabs(): { tabs: TabItem[]; activeTabIndex: number; page: string; nextId: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TABS);
    const idx = localStorage.getItem(STORAGE_KEY_ACTIVE);
    const pg = localStorage.getItem(STORAGE_KEY_PAGE);
    if (raw) {
      const parsed: TabItem[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const activeIdx = idx != null ? Math.min(Number(idx), parsed.length - 1) : 0;
        const maxId = parsed.reduce((m, t) => { const n = parseInt(t.id.replace("tab-", ""), 10); return isNaN(n) ? m : Math.max(m, n); }, 0);
        return { tabs: parsed.map(t => ({ ...t, scrollPos: 0, isDirty: false })), activeTabIndex: activeIdx, page: pg || parsed[activeIdx].pageKey, nextId: maxId + 1 };
      }
    }
  } catch { /* ignore */ }
  return null; // no saved tabs, will be set in AppProvider based on role
}

function defaultTabsForRole(role?: string): { tabs: TabItem[]; activeTabIndex: number; page: string; nextId: number } {
  if (role === "magasin") return { tabs: [{ id: "tab-0", pageKey: "pickup_tickets", label: "Tickets Cueillette", scrollPos: 0, isDirty: false }], activeTabIndex: 0, page: "pickup_tickets", nextId: 1 };
  if (role === "manuf") return { tabs: [{ id: "tab-0", pageKey: "manuf_dashboard", label: "Dashboard Fabrication", scrollPos: 0, isDirty: false }], activeTabIndex: 0, page: "manuf_dashboard", nextId: 1 };
  if (role === "admin" || role === "god_admin") return { tabs: [{ id: "tab-0", pageKey: "dash_company", label: "Dashboard Compagnie", scrollPos: 0, isDirty: false }], activeTabIndex: 0, page: "dash_company", nextId: 1 };
  return { tabs: [{ id: "tab-0", pageKey: "dash_user", label: "Dashboard Personnel", scrollPos: 0, isDirty: false }], activeTabIndex: 0, page: "dash_user", nextId: 1 };
}

export function AppProvider({ children }: Props) {
  const { profile, realProfile } = useAuth();
  const ownerId = realProfile?.id ?? profile?.id ?? null;
  const stored = useRef(loadTabs() || defaultTabsForRole(profile?.role));
  const [page, setPage] = useState(stored.current.page);
  const [prefillData, setPrefillData] = useState<PrefillData | null>(null);
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [samples, setSamples] = useState<SampleRequest[]>([]);
  const [products, setProducts] = useState<SaleProduct[]>([]);

  const [tabs, setTabs] = useState<TabItem[]>(stored.current.tabs);
  const tabIdCounter = useRef(stored.current.nextId);
  const [activeTabIndex, setActiveTabIndex] = useState(stored.current.activeTabIndex);
  const [tabOverflowToast, setTabOverflowToast] = useState<TabOverflowToast>({ show: false, message: "" });
  const toastTimeoutRef = useRef<number | null>(null);

  // Persist tabs state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TABS, JSON.stringify(tabs));
    localStorage.setItem(STORAGE_KEY_ACTIVE, String(activeTabIndex));
    localStorage.setItem(STORAGE_KEY_PAGE, page);
  }, [tabs, activeTabIndex, page]);

  // ── Fetch team member IDs for scoping leads & samples ──
  const teamMemberIdsRef = useRef<string[] | null>(null);
  const isAdmin = profile?.role === "admin" || profile?.role === "god_admin";

  useEffect(() => {
    if (!profile) return;
    if (isAdmin) { teamMemberIdsRef.current = null; return; } // admins see all
    if (profile.team_id) {
      supabase.from("profiles").select("id").eq("team_id", profile.team_id).eq("is_active", true)
        .then(({ data }) => {
          teamMemberIdsRef.current = data?.map(p => p.id) || [profile.id];
        });
    } else {
      teamMemberIdsRef.current = [profile.id]; // solo: only own data
    }
  }, [profile?.id, profile?.team_id, isAdmin]);

  const reloadLeads = useCallback(async () => {
    let query = supabase
      .from("crm_leads")
      .select("*, crm_activities(*), crm_reminders(*), crm_files(*)")
      .eq("archived", false)
      .order("created_at", { ascending: false });

    // Scope by team members (or self) for non-admins
    const memberIds = teamMemberIdsRef.current;
    if (memberIds) {
      query = query.or(
        memberIds.map(id => `assigned_agent_id.eq.${id}`).join(",")
        + "," + memberIds.map(id => `owner_id.eq.${id}`).join(",")
        + ",assigned_agent_id.eq.,assigned_agent_id.is.null"
      );
    }

    const { data, error } = await query;
    if (!error && data) setLeads(data.map(mapLead));
  }, []);

  const reloadSamples = useCallback(async () => {
    let query = supabase
      .from("sample_requests")
      .select("*, sample_items(*), sample_activities(*)")
      .order("created_at", { ascending: false });

    // Scope by team members (or self) for non-admins
    const memberIds = teamMemberIdsRef.current;
    if (memberIds) {
      query = query.or(
        memberIds.map(id => `agent_id.eq.${id}`).join(",")
        + "," + memberIds.map(id => `owner_id.eq.${id}`).join(",")
      );
    }

    const { data, error } = await query;
    if (!error && data) {
      setSamples(data.map((s: any) => ({
        ...s,
        items: s.sample_items || [],
        activities: s.sample_activities || [],
      })));
    }
  }, []);

  const reloadProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from("sale_products")
      .select("*, sale_product_images(*), sale_product_files(*)")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setProducts(data.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        components_count: p.components_count,
        formats: p.formats || [],
        formats_other: p.formats_other || "",
        units_per_pallet: p.units_per_pallet ?? null,
        is_active: p.is_active,
        created_at: p.created_at,
        images: p.sale_product_images || [],
        files: p.sale_product_files || [],
      })));
    }
  }, []);

  useEffect(() => {
    reloadLeads();
    reloadSamples();
    reloadProducts();
  }, [reloadLeads, reloadSamples, reloadProducts]);

  const navigate = useCallback((newPage: string, prefill?: PrefillData) => {
    setPage(newPage);
    setTabs(prev => prev.map((t, i) => i === activeTabIndex ? { ...t, pageKey: newPage } : t));
    if (prefill) setPrefillData(prefill);
  }, [activeTabIndex]);

  const clearPrefill = useCallback(() => setPrefillData(null), []);

  const updateLead = useCallback(async (updated: CRMLead) => {
    const prev = leads.find(l => l.id === updated.id);
    setLeads(p => p.map(l => l.id === updated.id ? updated : l));
    // Notify newly assigned agent
    if (updated.assigned_agent_id && updated.assigned_agent_id !== prev?.assigned_agent_id) {
      sendNotification(updated.assigned_agent_id, "lead", `Lead assigné : ${updated.company_name}`, `${updated.contact_first_name} ${updated.contact_last_name}`, "lead", updated.id);
    }
    await supabase.from("crm_leads").update({
      company_name: updated.company_name,
      contact_first_name: updated.contact_first_name,
      contact_last_name: updated.contact_last_name,
      contact_title: updated.contact_title,
      phone: updated.phone,
      email: updated.email,
      website: updated.website,
      address: updated.address,
      region: updated.region,
      postal_code: updated.postal_code,
      type: updated.type,
      source: updated.source,
      temperature: updated.temperature,
      stage: updated.stage,
      estimated_value: updated.estimated_value,
      monthly_volume: updated.monthly_volume,
      products_interest: updated.products_interest,
      closing_probability: updated.closing_probability,
      target_closing_date: updated.target_closing_date || null,
      annual_revenue_goal: updated.annual_revenue_goal,
      monthly_volume_goal: updated.monthly_volume_goal,
      notes: updated.notes,
      assigned_agent_id: updated.assigned_agent_id,
      assigned_agent_name: updated.assigned_agent_name,
      assigned_agent_initials: updated.assigned_agent_initials,
      assigned_agent_color: updated.assigned_agent_color,
      last_activity_at: updated.last_activity_at,
      closed_at: updated.closed_at || null,
      archived: updated.archived,
      updated_at: new Date().toISOString(),
    }).eq("id", updated.id);
  }, []);

  const addLead = useCallback(async (data: Omit<CRMLead, "id" | "created_at" | "updated_at" | "activities" | "reminders" | "files">) => {
    const now = new Date().toISOString();
    const { data: row, error } = await supabase.from("crm_leads").insert({
      company_name: data.company_name,
      contact_first_name: data.contact_first_name,
      contact_last_name: data.contact_last_name,
      contact_title: data.contact_title || "",
      phone: data.phone || "",
      email: data.email || "",
      website: data.website || "",
      address: data.address || "",
      region: data.region || "",
      postal_code: data.postal_code || "",
      type: data.type,
      source: data.source,
      temperature: data.temperature,
      stage: data.stage,
      estimated_value: data.estimated_value || 0,
      monthly_volume: data.monthly_volume || 0,
      products_interest: data.products_interest || [],
      closing_probability: data.closing_probability || 0,
      target_closing_date: data.target_closing_date || null,
      annual_revenue_goal: data.annual_revenue_goal || 0,
      monthly_volume_goal: data.monthly_volume_goal || 0,
      notes: data.notes || "",
      assigned_agent_id: data.assigned_agent_id,
      assigned_agent_name: data.assigned_agent_name,
      assigned_agent_initials: data.assigned_agent_initials,
      assigned_agent_color: data.assigned_agent_color,
      vendeur_code: data.vendeur_code ?? null,
      last_activity_at: now,
      archived: false,
      owner_id: ownerId,
    }).select().maybeSingle();
    if (error || !row) return null;
    const newLead: CRMLead = { ...row, activities: [], reminders: [], files: [] };
    setLeads(prev => [newLead, ...prev]);
    return newLead;
  }, []);

  const deleteLead = useCallback(async (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
    await supabase.from("crm_leads").update({ archived: true, updated_at: new Date().toISOString() }).eq("id", id);
  }, []);

  const addActivity = useCallback(async (activity: Omit<CRMActivity, "id" | "created_at">) => {
    const { data: row, error } = await supabase.from("crm_activities").insert({
      lead_id: activity.lead_id,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      call_duration: activity.call_duration ?? null,
      call_result: activity.call_result ?? null,
      email_subject: activity.email_subject ?? null,
      meeting_location: activity.meeting_location ?? null,
      meeting_duration: activity.meeting_duration ?? null,
      meeting_attendees: activity.meeting_attendees ?? null,
      proposal_amount: activity.proposal_amount ?? null,
      sample_products: activity.sample_products ?? null,
      sample_qty: activity.sample_qty ?? null,
      loss_reason: activity.loss_reason ?? null,
      stage_from: activity.stage_from ?? null,
      stage_to: activity.stage_to ?? null,
      logged_by_name: activity.logged_by_name,
      logged_by_initials: activity.logged_by_initials,
      activity_at: activity.activity_at,
    }).select().maybeSingle();
    if (error || !row) return null;
    setLeads(prev => prev.map(l => {
      if (l.id !== activity.lead_id) return l;
      return {
        ...l,
        last_activity_at: activity.activity_at,
        activities: [row as CRMActivity, ...(l.activities || [])],
      };
    }));
    return row as CRMActivity;
  }, []);

  const addReminder = useCallback(async (reminder: Omit<CRMReminder, "id" | "created_at">) => {
    const { data: row, error } = await supabase.from("crm_reminders").insert({
      lead_id: reminder.lead_id,
      title: reminder.title,
      reminder_at: reminder.reminder_at,
      priority: reminder.priority,
      recurrence: reminder.recurrence,
      notes: reminder.notes,
      completed: reminder.completed,
      completed_at: reminder.completed_at ?? null,
      assigned_agent_name: reminder.assigned_agent_name,
    }).select().maybeSingle();
    if (error || !row) return null;
    setLeads(prev => prev.map(l => {
      if (l.id !== reminder.lead_id) return l;
      return { ...l, reminders: [...(l.reminders || []), row as CRMReminder] };
    }));
    return row as CRMReminder;
  }, []);

  const updateReminder = useCallback(async (reminder: CRMReminder) => {
    await supabase.from("crm_reminders").update({
      title: reminder.title,
      reminder_at: reminder.reminder_at,
      priority: reminder.priority,
      recurrence: reminder.recurrence,
      notes: reminder.notes,
      completed: reminder.completed,
      completed_at: reminder.completed_at ?? null,
      assigned_agent_name: reminder.assigned_agent_name,
    }).eq("id", reminder.id);
    setLeads(prev => prev.map(l => {
      if (l.id !== reminder.lead_id) return l;
      return { ...l, reminders: (l.reminders || []).map(r => r.id === reminder.id ? reminder : r) };
    }));
  }, []);

  const addSample = useCallback((sample: SampleRequest) => {
    setSamples(prev => [...prev, sample]);
  }, []);

  const updateSample = useCallback((updated: SampleRequest) => {
    setSamples(prev => prev.map(s => s.id === updated.id ? updated : s));
  }, []);

  const addProduct = useCallback((product: SaleProduct) => {
    setProducts(prev => [product, ...prev]);
  }, []);

  const updateProduct = useCallback(async (updated: SaleProduct) => {
    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
    await supabase.from("sale_products").update({
      name: updated.name,
      description: updated.description,
      components_count: updated.components_count,
      formats: updated.formats,
      formats_other: updated.formats_other,
      units_per_pallet: updated.units_per_pallet,
      is_active: updated.is_active,
    }).eq("id", updated.id);
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    await supabase.from("sale_products").update({ is_active: false }).eq("id", id);
  }, []);

  const dismissToast = useCallback(() => {
    setTabOverflowToast({ show: false, message: "" });
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
  }, []);

  const showOverflowToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setTabOverflowToast({ show: true, message });
    toastTimeoutRef.current = window.setTimeout(() => {
      setTabOverflowToast({ show: false, message: "" });
      toastTimeoutRef.current = null;
    }, 3000);
  }, []);

  const saveScrollPosition = useCallback((scrollPos: number) => {
    setTabs(prev => prev.map((t, i) => i === activeTabIndex ? { ...t, scrollPos } : t));
  }, [activeTabIndex]);

  const openTab = useCallback((key: string, label: string) => {
    if (tabs.length >= MAX_TABS) {
      showOverflowToast("Maximum 10 onglets ouverts. Fermez un onglet pour continuer.");
      return;
    }
    saveScrollPosition(document.querySelector("main")?.scrollTop || 0);
    const newTabId = `tab-${tabIdCounter.current++}`;
    const newTab: TabItem = { id: newTabId, pageKey: key, label, scrollPos: 0, isDirty: false };
    setTabs(prev => [...prev, newTab]);
    setActiveTabIndex(tabs.length);
    setPage(key);
  }, [tabs, saveScrollPosition, showOverflowToast]);

  const closeTab = useCallback((index: number, force?: boolean) => {
    if (tabs.length === 1) return;
    const tab = tabs[index];
    if (tab.isDirty && !force) {
      return;
    }
    const newTabs = tabs.filter((_, i) => i !== index);
    setTabs(newTabs);
    if (index === activeTabIndex) {
      const newIndex = Math.min(index, newTabs.length - 1);
      setActiveTabIndex(newIndex);
      setPage(newTabs[newIndex].pageKey);
    } else if (index < activeTabIndex) {
      setActiveTabIndex(activeTabIndex - 1);
    }
  }, [tabs, activeTabIndex]);

  const switchTab = useCallback((index: number) => {
    if (index === activeTabIndex || index < 0 || index >= tabs.length) return;
    saveScrollPosition(document.querySelector("main")?.scrollTop || 0);
    setActiveTabIndex(index);
    setPage(tabs[index].pageKey);
  }, [tabs, activeTabIndex, saveScrollPosition]);

  const canPinCurrentPage = useCallback(() => {
    return tabs.length < MAX_TABS;
  }, [tabs]);

  const pinCurrentPage = useCallback((label: string) => {
    if (tabs.length >= MAX_TABS) {
      showOverflowToast("Maximum 10 onglets ouverts. Fermez un onglet pour continuer.");
      return;
    }
    const newTabId = `tab-${tabIdCounter.current++}`;
    const newTab: TabItem = { id: newTabId, pageKey: page, label, scrollPos: 0, isDirty: false };
    setTabs(prev => [...prev, newTab]);
    setActiveTabIndex(tabs.length);
  }, [tabs, page, showOverflowToast]);

  const setTabDirty = useCallback((tabId: string, dirty: boolean) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, isDirty: dirty } : t));
  }, []);

  const getActiveTabId = useCallback(() => {
    return tabs[activeTabIndex]?.id || "";
  }, [tabs, activeTabIndex]);

  return (
    <AppContext.Provider value={{
      page, navigate, prefillData, clearPrefill,
      leads, setLeads, updateLead, addLead, deleteLead,
      addActivity, addReminder, updateReminder, reloadLeads,
      samples, setSamples, addSample, updateSample, reloadSamples,
      products, reloadProducts, addProduct, updateProduct, deleteProduct,
      tabs, activeTabIndex, openTab, closeTab, switchTab, pinCurrentPage, canPinCurrentPage, tabOverflowToast, dismissToast, saveScrollPosition, setTabDirty, getActiveTabId,
    }}>
      {children(page, navigate)}
    </AppContext.Provider>
  );
}
