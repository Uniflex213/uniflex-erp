import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { BilledDoc, BilledDocItem, StoreExpense, WeekData, T, fmt, fmtPct, getWeekStart, getWeekLabel } from "./beneficeTypes";
import ProfitCircle from "./ProfitCircle";
import ProfitInvoiceLog from "./ProfitInvoiceLog";
import ProfitDetailModal from "./ProfitDetailModal";
import AddExpenseModal from "./AddExpenseModal";
import { useLanguage } from "../../i18n/LanguageContext";

interface ProductCostMap {
  [productId: string]: number;
}

function buildWeeks(docs: BilledDoc[], generalExpenses: StoreExpense[]): WeekData[] {
  const weekMap = new Map<string, WeekData>();

  for (const doc of docs) {
    const d = new Date(doc.billed_at);
    const ws = getWeekStart(d);
    const key = ws.toISOString();
    if (!weekMap.has(key)) {
      const end = new Date(ws);
      end.setDate(end.getDate() + 6);
      weekMap.set(key, {
        label: getWeekLabel(d),
        start: ws, end,
        revenue: 0, cost: 0, expenses: 0, profit: 0, docs: [],
      });
    }
    const w = weekMap.get(key)!;
    w.revenue += doc.selling_price;
    w.cost += doc.cost_total;
    w.expenses += doc.expenses_total;
    w.profit += doc.profit;
    w.docs.push(doc);
  }

  for (const exp of generalExpenses) {
    const d = new Date(exp.expense_date);
    const ws = getWeekStart(d);
    const key = ws.toISOString();
    if (!weekMap.has(key)) {
      const end = new Date(ws);
      end.setDate(end.getDate() + 6);
      weekMap.set(key, {
        label: getWeekLabel(d),
        start: ws, end,
        revenue: 0, cost: 0, expenses: 0, profit: 0, docs: [],
      });
    }
    const w = weekMap.get(key)!;
    w.expenses += exp.amount;
    w.profit -= exp.amount;
  }

  return Array.from(weekMap.values()).sort((a, b) => b.start.getTime() - a.start.getTime());
}

export default function BeneficeMagasinPage() {
  const { profile, storeCode } = useAuth();
  const { t } = useLanguage();
  const [docs, setDocs] = useState<BilledDoc[]>([]);
  const [generalExpenses, setGeneralExpenses] = useState<StoreExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailDoc, setDetailDoc] = useState<BilledDoc | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const isMagasin = profile?.role === "magasin";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let pickupQuery = supabase.from("pickup_tickets").select("*").eq("billing_status", "billed_by_sci").order("sci_billed_at", { ascending: false });
      if (isMagasin && storeCode) pickupQuery = pickupQuery.eq("store_code", storeCode);

      let orderQuery = supabase.from("orders").select("*").eq("billing_status", "billed_by_sci").order("sci_billed_at", { ascending: false });
      if (isMagasin && storeCode) orderQuery = orderQuery.eq("store_code", storeCode);

      let expensesQuery = supabase.from("store_expenses").select("*").order("expense_date", { ascending: false });
      if (isMagasin && storeCode) expensesQuery = expensesQuery.eq("store_code", storeCode);

      const [pickupRes, orderRes, pickupItemsRes, expensesRes, productsRes] = await Promise.all([
        pickupQuery,
        orderQuery,
        supabase.from("pickup_ticket_items").select("*"),
        expensesQuery,
        supabase.from("sale_products").select("id, name, cost_price"),
      ]);

      const costMap: ProductCostMap = {};
      for (const p of (productsRes.data || [])) {
        costMap[p.id] = Number(p.cost_price) || 0;
      }

      const allExpenses = (expensesRes.data || []) as StoreExpense[];
      const pickupItems = (pickupItemsRes.data || []) as Record<string, unknown>[];

      const pickupDocs: BilledDoc[] = (pickupRes.data || []).map((row: Record<string, unknown>) => {
        const id = row.id as string;
        const items: BilledDocItem[] = pickupItems
          .filter(i => i.ticket_id === id)
          .map(i => {
            const qty = Number(i.quantity) || 0;
            const unitPrice = Number(i.unit_price) || 0;
            const costPrice = costMap[i.product_id as string] || 0;
            const subtotal = Number(i.subtotal) || qty * unitPrice;
            const costTotal = costPrice * qty;
            return {
              product_name: (i.product_name as string) || "",
              quantity: qty,
              unit_price: unitPrice,
              subtotal,
              cost_price: costPrice,
              cost_total: costTotal,
              profit: subtotal - costTotal,
            };
          });

        const docExpenses = allExpenses.filter(e => e.document_id === id && e.document_type === "pickup");
        const sellingPrice = Number(row.subtotal_after_discount) || Number(row.total_value) || 0;
        const costTotal = items.reduce((a, i) => a + i.cost_total, 0);
        const expensesTotal = docExpenses.reduce((a, e) => a + e.amount, 0);
        const profit = sellingPrice - costTotal - expensesTotal;

        return {
          id,
          document_type: "pickup" as const,
          document_number: (row.ticket_number as string) || "",
          client_name: (row.client_name as string) || (row.walkin_name as string) || "—",
          selling_price: sellingPrice,
          cost_total: costTotal,
          expenses_total: expensesTotal,
          profit,
          margin_pct: sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0,
          billed_at: (row.sci_billed_at as string) || (row.issued_at as string),
          sci_invoice_number: (row.sci_invoice_number as string) || "",
          sci_billed_amount: Number(row.sci_billed_amount) || 0,
          payment_status: (row.payment_status as string) || "En attente",
          paid_amount: Number(row.paid_amount) || 0,
          items,
          expenses: docExpenses,
        };
      });

      const orderDocs: BilledDoc[] = (orderRes.data || []).map((row: Record<string, unknown>) => {
        const id = row.id as string;
        const products = (row.products as Record<string, unknown>[]) || [];
        const items: BilledDocItem[] = products.map(p => {
          const qty = Number(p.quantity) || 0;
          const unitPrice = Number(p.unitPrice) || Number(p.unit_price) || 0;
          const costPrice = costMap[p.id as string] || costMap[p.productId as string] || 0;
          const subtotal = Number(p.subtotal) || qty * unitPrice;
          const costTotal = costPrice * qty;
          return {
            product_name: (p.name as string) || (p.product_name as string) || "",
            quantity: qty,
            unit_price: unitPrice,
            subtotal,
            cost_price: costPrice,
            cost_total: costTotal,
            profit: subtotal - costTotal,
          };
        });

        const docExpenses = allExpenses.filter(e => e.document_id === id && e.document_type === "order");
        const sellingPrice = Number(row.subtotal_after_discount) || Number(row.subtotal) || 0;
        const costTotal = items.reduce((a, i) => a + i.cost_total, 0);
        const expensesTotal = docExpenses.reduce((a, e) => a + e.amount, 0);
        const profit = sellingPrice - costTotal - expensesTotal;

        return {
          id,
          document_type: "order" as const,
          document_number: id,
          client_name: (row.client as string) || "—",
          selling_price: sellingPrice,
          cost_total: costTotal,
          expenses_total: expensesTotal,
          profit,
          margin_pct: sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0,
          billed_at: (row.sci_billed_at as string) || (row.date as string) || "",
          sci_invoice_number: (row.sci_invoice_number as string) || "",
          sci_billed_amount: Number(row.sci_billed_amount) || 0,
          payment_status: (row.payment_status as string) || "En attente",
          paid_amount: Number(row.paid_amount) || 0,
          items,
          expenses: docExpenses,
        };
      });

      setDocs([...pickupDocs, ...orderDocs]);
      setGeneralExpenses(allExpenses.filter(e => e.document_type === "general"));
    } finally {
      setLoading(false);
    }
  }, [isMagasin, storeCode]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = () => setScrollY(el.scrollTop);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  const weeks = buildWeeks(docs, generalExpenses);
  const currentWeek = weeks[selectedWeekIdx];
  const totals = {
    revenue: currentWeek?.revenue || 0,
    cost: currentWeek?.cost || 0,
    expenses: currentWeek?.expenses || 0,
    profit: currentWeek?.profit || 0,
  };

  const circleThreshold = 280;
  const circleOpacity = Math.max(0, 1 - scrollY / circleThreshold);
  const circleScale = Math.max(0.6, 1 - scrollY / (circleThreshold * 2.5));
  const stickyOpacity = Math.min(1, (scrollY - circleThreshold * 0.5) / (circleThreshold * 0.5));
  const showSticky = scrollY > circleThreshold * 0.4;

  const profitColor = totals.profit >= 0 ? T.green : T.red;
  const marginPct = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;

  if (loading) {
    return (
      <div style={{ padding: "28px 32px", background: T.cardAlt, minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 14, color: T.textMid }}>{t("benefice.loading")}</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ height: "100%", overflowY: "auto", background: T.cardAlt, position: "relative" }}
    >
      {showSticky && (
        <div style={{
          position: "sticky", top: 0, zIndex: 100,
          background: `linear-gradient(135deg, ${profitColor}08 0%, ${profitColor}15 100%)`,
          backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${T.border}`,
          padding: "12px 32px",
          opacity: stickyOpacity,
          transition: "opacity 0.1s",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: totals.profit >= 0 ? "#f0fdf4" : "#fef2f2",
              border: `2px solid ${profitColor}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke={T.border} strokeWidth="6" />
                <circle
                  cx="50" cy="50" r="45" fill="none" stroke={profitColor} strokeWidth="6" strokeLinecap="round"
                  strokeDasharray="283" strokeDashoffset={283 - (283 * Math.min(Math.max(marginPct / 100, 0), 1))}
                  transform="rotate(-90 50 50)"
                />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 1 }}>{t("benefice.weekly_profit")}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: profitColor, lineHeight: 1, marginTop: 2 }}>{fmt(totals.profit)}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 20 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.textMid, textTransform: "uppercase" }}>{t("benefice.revenue")}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{fmt(totals.revenue)}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.textMid, textTransform: "uppercase" }}>{t("benefice.costs")}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: T.red }}>{fmt(totals.cost)}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.textMid, textTransform: "uppercase" }}>{t("benefice.expenses")}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: T.orange }}>{fmt(totals.expenses)}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.textMid, textTransform: "uppercase" }}>{t("benefice.margin")}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: profitColor }}>{fmtPct(marginPct)}</div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: T.textMid, fontWeight: 600 }}>
            {currentWeek?.label || "—"}
          </div>
        </div>
      )}

      <div style={{ padding: "28px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: T.text, margin: 0 }}>{t("benefice.store_profit")}</h1>
            <div style={{ fontSize: 13, color: T.textMid, marginTop: 4 }}>{t("benefice.weekly_tracking")}</div>
          </div>
          <button
            onClick={() => setShowExpenseModal(true)}
            style={{
              background: T.red, color: "#fff", border: "none", borderRadius: 9,
              padding: "11px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 7,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {t("benefice.add_expense")}
          </button>
        </div>

        {weeks.length > 1 && (
          <div style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
            {weeks.map((w, i) => (
              <button
                key={i}
                onClick={() => setSelectedWeekIdx(i)}
                style={{
                  background: selectedWeekIdx === i ? T.main : T.card,
                  color: selectedWeekIdx === i ? "#fff" : T.textMid,
                  border: `1px solid ${selectedWeekIdx === i ? T.main : T.border}`,
                  borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 700,
                  cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                {w.label}
              </button>
            ))}
          </div>
        )}

        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          minHeight: 360, marginBottom: 20,
          position: "relative",
        }}>
          <ProfitCircle
            profit={totals.profit}
            revenue={totals.revenue}
            cost={totals.cost}
            expenses={totals.expenses}
            opacity={circleOpacity}
            scale={circleScale}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 3, height: 18, borderRadius: 2, background: T.green }} />
            <span style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{t("benefice.invoices")} — {currentWeek?.label || t("benefice.this_week", "Cette semaine")}</span>
            <span style={{ background: T.greenBg, color: T.green, borderRadius: 20, padding: "1px 9px", fontSize: 11, fontWeight: 700 }}>
              {currentWeek?.docs.length || 0}
            </span>
          </div>
          <ProfitInvoiceLog docs={currentWeek?.docs || []} onDocClick={setDetailDoc} />
        </div>
      </div>

      {detailDoc && <ProfitDetailModal doc={detailDoc} onClose={() => setDetailDoc(null)} />}
      {showExpenseModal && <AddExpenseModal onClose={() => setShowExpenseModal(false)} onSaved={() => { setShowExpenseModal(false); load(); }} />}
    </div>
  );
}
