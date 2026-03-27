import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { T } from "../../theme";
import { useLanguage } from "../../i18n/LanguageContext";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2 }).format(n);

const fmtPct = (n: number) => `${n.toFixed(1)} %`;

interface MemberProfile {
  id: string;
  full_name: string;
  seller_code: string | null;
  team_id: string | null;
}

interface CommissionConfig {
  member_id: string;
  commission_rate: number;
}

interface OrderRow {
  id: string;
  vendeur_code: string | null;
  subtotal_after_discount: number | null;
  subtotal: number | null;
  billing_status: string | null;
  products: unknown;
}

interface OrderItemRow {
  order_id?: string;
  product_id?: string | null;
  quantity: number;
  unit_price?: number;
}

interface TeamExpense {
  id: string;
  team_id: string;
  label: string;
  amount: number;
  expense_date: string;
  category: string;
  notes: string;
}

interface ProductCostMap {
  [productId: string]: number;
}

interface ExpenseForm {
  label: string;
  amount: string;
  expense_date: string;
  category: string;
  notes: string;
}

function emptyExpenseForm(): ExpenseForm {
  return {
    label: "",
    amount: "",
    expense_date: new Date().toISOString().slice(0, 10),
    category: "Général",
    notes: "",
  };
}

const EXPENSE_CATEGORIES = ["Général", "Marketing", "Transport", "Formation", "Équipement", "Autre"];

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  border: `1px solid ${T.border}`,
  borderRadius: 7,
  fontSize: 13,
  fontFamily: "inherit",
  color: T.text,
  background: T.bgCard,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

export default function TeamBeneficePage() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const teamId = profile?.team_id ?? null;

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [configs, setConfigs] = useState<CommissionConfig[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
  const [costMap, setCostMap] = useState<ProductCostMap>({});
  const [expenses, setExpenses] = useState<TeamExpense[]>([]);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(emptyExpenseForm());
  const [savingExpense, setSavingExpense] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");

  const getPeriodStart = useCallback(() => {
    const now = new Date();
    if (period === "month") {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === "quarter") {
      const q = Math.floor(now.getMonth() / 3);
      return new Date(now.getFullYear(), q * 3, 1);
    } else {
      return new Date(now.getFullYear(), 0, 1);
    }
  }, [period]);

  const load = useCallback(async () => {
    if (!teamId) { setLoading(false); return; }
    setLoading(true);
    try {
      const periodStart = getPeriodStart();

      const [membersRes, configsRes, ordersRes, expensesRes, productsRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, seller_code, team_id").eq("team_id", teamId),
        supabase.from("team_commission_configs").select("member_id, commission_rate").eq("team_id", teamId),
        supabase.from("orders")
          .select("id, vendeur_code, subtotal_after_discount, subtotal, billing_status, products")
          .eq("billing_status", "billed_by_sci")
          .gte("created_at", periodStart.toISOString()),
        supabase.from("team_expenses").select("*").eq("team_id", teamId).order("expense_date", { ascending: false }),
        supabase.from("sale_products").select("id, cost_price"),
      ]);

      const memberList = (membersRes.data || []) as MemberProfile[];
      const configList = (configsRes.data || []) as CommissionConfig[];
      const orderList = (ordersRes.data || []) as OrderRow[];
      const expenseList = (expensesRes.data || []) as TeamExpense[];
      const products = (productsRes.data || []) as { id: string; cost_price: number }[];

      const cMap: ProductCostMap = {};
      for (const p of products) cMap[p.id] = Number(p.cost_price) || 0;

      // Try to fetch order_items if the table exists
      let items: OrderItemRow[] = [];
      if (orderList.length > 0) {
        const orderIds = orderList.map(o => o.id);
        const { data: itemsData } = await supabase
          .from("order_items")
          .select("order_id, product_id, quantity, unit_price")
          .in("order_id", orderIds);
        items = (itemsData || []) as OrderItemRow[];
      }

      setMembers(memberList);
      setConfigs(configList);
      setOrders(orderList);
      setOrderItems(items);
      setCostMap(cMap);
      setExpenses(expenseList);
    } finally {
      setLoading(false);
    }
  }, [teamId, getPeriodStart]);

  useEffect(() => { load(); }, [load]);

  const handleSaveExpense = async () => {
    if (!teamId || !expenseForm.label.trim() || !expenseForm.amount) return;
    setSavingExpense(true);
    const payload = {
      team_id: teamId,
      label: expenseForm.label.trim(),
      amount: parseFloat(expenseForm.amount) || 0,
      expense_date: expenseForm.expense_date,
      category: expenseForm.category,
      notes: expenseForm.notes,
    };
    const { data } = await supabase.from("team_expenses").insert(payload).select().maybeSingle();
    if (data) setExpenses(prev => [data as TeamExpense, ...prev]);
    setSavingExpense(false);
    setShowExpenseModal(false);
    setExpenseForm(emptyExpenseForm());
  };

  const handleDeleteExpense = async (id: string) => {
    setDeletingExpenseId(id);
    await supabase.from("team_expenses").delete().eq("id", id);
    setExpenses(prev => prev.filter(e => e.id !== id));
    setDeletingExpenseId(null);
  };

  // --- Calculations ---
  const memberCodes = new Set(members.map(m => m.seller_code).filter(Boolean) as string[]);

  const revenue = orders.reduce((s, o) => {
    const code = o.vendeur_code ?? "";
    if (!memberCodes.has(code)) return s;
    return s + (Number(o.subtotal_after_discount) || Number(o.subtotal) || 0);
  }, 0);

  // Compute costs: prefer order_items, fallback to products array in order row
  const costs = orders.reduce((s, o) => {
    const code = o.vendeur_code ?? "";
    if (!memberCodes.has(code)) return s;

    // Try order_items
    const items = orderItems.filter(i => i.order_id === o.id);
    if (items.length > 0) {
      return s + items.reduce((is, item) => {
        const cp = costMap[item.product_id ?? ""] || 0;
        return is + cp * (Number(item.quantity) || 0);
      }, 0);
    }

    // Fallback: products embedded in order row
    const prods = (o.products as Record<string, unknown>[]) || [];
    return s + prods.reduce((ps, p) => {
      const qty = Number(p.quantity) || 0;
      const pid = (p.id as string) || (p.productId as string) || "";
      const cp = costMap[pid] || 0;
      return ps + cp * qty;
    }, 0);
  }, 0);

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  // Commission per member
  interface MemberCommissionRow {
    member: MemberProfile;
    salesMTD: number;
    rate: number;
    commission: number;
  }

  const memberCommissions: MemberCommissionRow[] = members.map(m => {
    const code = m.seller_code ?? "";
    const salesMTD = code
      ? orders
          .filter(o => o.vendeur_code === code)
          .reduce((s, o) => s + (Number(o.subtotal_after_discount) || Number(o.subtotal) || 0), 0)
      : 0;
    const config = configs.find(c => c.member_id === m.id);
    const rate = config?.commission_rate ?? 0.05;
    return { member: m, salesMTD, rate, commission: salesMTD * rate };
  });

  const totalCommissions = memberCommissions.reduce((s, r) => s + r.commission, 0);
  const netProfit = revenue - costs - totalExpenses - totalCommissions;
  const marginPct = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const profitColor = netProfit >= 0 ? T.green : T.red;

  const periodLabel = period === "month" ? t("team_benefice.this_month", "Ce mois") : period === "quarter" ? t("team_benefice.this_quarter", "Ce trimestre") : t("team_benefice.this_year", "Cette année");

  if (!teamId) {
    return (
      <div style={{ padding: "24px 28px", background: T.bg, minHeight: "100%", fontFamily: "Inter, system-ui, sans-serif" }}>
        <div style={{ color: T.textMid, fontSize: 14 }}>{t("team_benefice.no_team", "Vous n'êtes pas assigné à une équipe.")}</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "24px 28px", background: T.bg, minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, system-ui, sans-serif" }}>
        <div style={{ fontSize: 14, color: T.textMid }}>{t("team_benefice.loading", "Chargement des données de bénéfice...")}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 28px", background: T.bg, minHeight: "100%", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: "0 0 4px" }}>{t("team_benefice.title", "Bénéfice Équipe")}</h1>
          <div style={{ fontSize: 13, color: T.textMid }}>{t("team_benefice.subtitle", "Analyse de rentabilité — commandes facturées par SCI")}</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: `1px solid ${T.border}` }}>
            {([["month", t("team_benefice.month", "Mois")], ["quarter", t("team_benefice.quarter", "Trimestre")], ["year", t("team_benefice.year", "Année")]] as [typeof period, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setPeriod(k)} style={{
                padding: "7px 14px", border: "none", cursor: "pointer",
                background: period === k ? T.main : T.bgCard,
                color: period === k ? "#fff" : T.textMid,
                fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                borderRight: k !== "year" ? `1px solid ${T.border}` : "none",
              }}>{l}</button>
            ))}
          </div>
          <button
            onClick={() => setShowExpenseModal(true)}
            style={{
              background: T.red, color: "#fff", border: "none", borderRadius: 8,
              padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            {t("team_benefice.add_expense", "Ajouter dépense")}
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { label: t("team_benefice.revenue", "Revenus"), value: fmt(revenue), color: T.main, bg: `${T.main}15`, sub: periodLabel },
          { label: t("team_benefice.product_costs", "Coûts produits"), value: fmt(costs), color: T.red, bg: T.redBg, sub: t("team_benefice.cost_prices", "Prix coutants") },
          { label: t("team_benefice.expenses", "Dépenses"), value: fmt(totalExpenses), color: T.orange, bg: T.orangeBg, sub: `${expenses.length} ${t("team_benefice.entries", "entrée(s)")}` },
          { label: t("team_benefice.commissions", "Commissions"), value: fmt(totalCommissions), color: T.cyan, bg: T.cyanBg, sub: `${members.length} ${t("team_benefice.members", "membres")}` },
          { label: t("team_benefice.net_profit", "Bénéfice net"), value: fmt(netProfit), color: profitColor, bg: netProfit >= 0 ? T.greenBg : T.redBg, sub: fmtPct(marginPct) + ` ${t("team_benefice.margin", "marge")}` },
        ].map(k => (
          <div key={k.label} style={{ flex: "1 1 160px", background: T.bgCard, borderRadius: 12, padding: "16px 18px", border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: k.color, marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 11, color: T.textMid }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Profit Circle */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative", width: 180, height: 180 }}>
            <svg width="180" height="180" viewBox="0 0 180 180">
              <circle cx="90" cy="90" r="75" fill="none" stroke={T.border} strokeWidth="14" />
              <circle
                cx="90" cy="90" r="75" fill="none"
                stroke={profitColor} strokeWidth="14" strokeLinecap="round"
                strokeDasharray="471"
                strokeDashoffset={471 - (471 * Math.min(Math.max(Math.abs(marginPct) / 100, 0), 1))}
                transform="rotate(-90 90 90)"
              />
            </svg>
            <div style={{
              position: "absolute", inset: 0, display: "flex",
              flexDirection: "column", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5 }}>{t("team_benefice.net_margin", "Marge nette")}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: profitColor }}>{fmtPct(marginPct)}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.textMid }}>{fmt(netProfit)}</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: T.textMid, textAlign: "center" }}>
            {t("team_benefice.formula", "Revenu − Coûts − Dépenses − Commissions")}
          </div>
        </div>
      </div>

      {/* Commission Breakdown */}
      <div style={{ background: T.bgCard, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden", marginBottom: 24 }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 3, height: 18, borderRadius: 2, background: T.cyan }} />
          <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{t("team_benefice.commissions_by_member", "Commissions par membre")}</span>
        </div>
        {memberCommissions.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: T.textMid, fontSize: 13 }}>{t("team_benefice.no_members", "Aucun membre dans l'équipe.")}</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: T.bg }}>
                  {[t("team_benefice.seller", "Vendeur"), t("team_benefice.code", "Code"), t("team_benefice.billed_sales", "Ventes facturées"), t("team_benefice.rate", "Taux"), t("team_benefice.commission", "Commission")].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 800, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {memberCommissions.map(row => {
                  const initials = row.member.full_name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <tr key={row.member.id} style={{ borderTop: `1px solid ${T.border}` }}>
                      <td style={{ padding: "11px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.main, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{initials}</div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{row.member.full_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "11px 16px" }}>
                        {row.member.seller_code ? (
                          <span style={{ background: `${T.main}15`, color: T.main, padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>{row.member.seller_code}</span>
                        ) : <span style={{ color: T.textLight }}>—</span>}
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 700, color: T.text }}>{fmt(row.salesMTD)}</td>
                      <td style={{ padding: "11px 16px", fontSize: 13, color: T.textMid }}>{fmtPct(row.rate * 100)}</td>
                      <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 800, color: T.cyan }}>{fmt(row.commission)}</td>
                    </tr>
                  );
                })}
                <tr style={{ borderTop: `2px solid ${T.border}`, background: T.bg }}>
                  <td colSpan={3} style={{ padding: "11px 16px", fontWeight: 900, color: T.text, fontSize: 13 }}>{t("team_benefice.total_commissions", "TOTAL COMMISSIONS")}</td>
                  <td style={{ padding: "11px 16px", color: T.textMid }}>—</td>
                  <td style={{ padding: "11px 16px", fontWeight: 900, color: T.cyan, fontSize: 14 }}>{fmt(totalCommissions)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expenses List */}
      <div style={{ background: T.bgCard, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 3, height: 18, borderRadius: 2, background: T.orange }} />
          <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{t("team_benefice.team_expenses", "Dépenses d'équipe")}</span>
          <span style={{ background: T.orangeBg, color: T.orange, borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 700, marginLeft: 4 }}>{expenses.length}</span>
        </div>
        {expenses.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: T.textMid, fontSize: 13 }}>
            {t("team_benefice.no_expenses", "Aucune dépense enregistrée. Cliquez sur « Ajouter dépense » pour commencer.")}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: T.bg }}>
                  {[t("common.date", "Date"), t("team_benefice.label", "Libellé"), t("team_benefice.category", "Catégorie"), t("team_benefice.amount", "Montant"), "Notes", ""].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 800, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id} style={{ borderTop: `1px solid ${T.border}` }}>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: T.textMid, whiteSpace: "nowrap" }}>
                      {new Date(e.expense_date).toLocaleDateString("fr-CA")}
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600, color: T.text }}>{e.label}</td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{ background: T.orangeBg, color: T.orange, padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{e.category}</span>
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 700, color: T.red }}>{fmt(e.amount)}</td>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: T.textMid }}>{e.notes || "—"}</td>
                    <td style={{ padding: "11px 16px" }}>
                      <button
                        onClick={() => handleDeleteExpense(e.id)}
                        disabled={deletingExpenseId === e.id}
                        style={{ background: T.redBg, color: T.red, border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", opacity: deletingExpenseId === e.id ? 0.5 : 1, display: "flex", alignItems: "center", gap: 4 }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: `2px solid ${T.border}`, background: T.bg }}>
                  <td colSpan={3} style={{ padding: "11px 16px", fontWeight: 900, color: T.text, fontSize: 13 }}>{t("team_benefice.total_expenses", "TOTAL DÉPENSES")}</td>
                  <td style={{ padding: "11px 16px", fontWeight: 900, color: T.red, fontSize: 14 }}>{fmt(totalExpenses)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(230,228,224,0.35)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: T.bgCard, borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 24px 64px rgba(0,0,0,0.35)", fontFamily: "Inter, system-ui, sans-serif" }}>
            <div style={{ padding: "18px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text }}>{t("team_benefice.add_expense_title", "Ajouter une dépense")}</h2>
              <button onClick={() => setShowExpenseModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMid, padding: 4 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>
                  {t("team_benefice.label", "Libellé")} <span style={{ color: T.red }}>*</span>
                </label>
                <input
                  style={inputStyle}
                  value={expenseForm.label}
                  onChange={e => setExpenseForm(f => ({ ...f, label: e.target.value }))}
                  placeholder={t("team_benefice.label_placeholder", "Ex: Déplacement client...")}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>
                    {t("team_benefice.amount_label", "Montant ($)")} <span style={{ color: T.red }}>*</span>
                  </label>
                  <input
                    type="number" step="0.01" min="0"
                    style={inputStyle}
                    value={expenseForm.amount}
                    onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>{t("common.date", "Date")}</label>
                  <input
                    type="date"
                    style={inputStyle}
                    value={expenseForm.expense_date}
                    onChange={e => setExpenseForm(f => ({ ...f, expense_date: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>{t("team_benefice.category", "Catégorie")}</label>
                <select
                  style={inputStyle}
                  value={expenseForm.category}
                  onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}
                >
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 }}>Notes</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
                  value={expenseForm.notes}
                  onChange={e => setExpenseForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder={t("team_benefice.notes_placeholder", "Notes optionnelles...")}
                />
              </div>
            </div>
            <div style={{ padding: "14px 24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setShowExpenseModal(false)}
                style={{ background: T.bg, color: T.textMid, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              >
                {t("common.cancel", "Annuler")}
              </button>
              <button
                onClick={handleSaveExpense}
                disabled={!expenseForm.label.trim() || !expenseForm.amount || savingExpense}
                style={{
                  background: expenseForm.label.trim() && expenseForm.amount ? T.red : T.textLight,
                  color: "#fff", border: "none", borderRadius: 8,
                  padding: "9px 22px", fontSize: 13, fontWeight: 700,
                  cursor: expenseForm.label.trim() && expenseForm.amount ? "pointer" : "default",
                  fontFamily: "inherit", opacity: savingExpense ? 0.7 : 1,
                  display: "flex", alignItems: "center", gap: 7,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                {savingExpense ? t("common.saving", "Sauvegarde...") : t("common.save", "Enregistrer")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
