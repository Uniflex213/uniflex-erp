import React, { useState, useEffect } from 'react';
import { Download, DollarSign, CreditCard, AlertCircle, TrendingUp } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { T, fmt, fmtNum, exportToCsv, exportToPdf } from './reportUtils';
import { useLanguage } from '../i18n/LanguageContext';

export default function ReportFinancial() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState(0);
  const [ticketsBilled, setTicketsBilled] = useState(0);
  const [outstanding, setOutstanding] = useState(0);
  const [paid, setPaid] = useState(0);
  const [pending, setPending] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: string; revenue: number; expenses: number }[]>([]);
  const [expenses, setExpenses] = useState(0);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();

    const [ordersRes, ticketsRes, paymentsRes, expensesRes] = await Promise.all([
      supabase.from('orders').select('id, total, billing_status, created_at').gte('created_at', startOfYear),
      supabase.from('pickup_tickets').select('id, total_amount, billing_status, created_at').gte('created_at', startOfYear),
      supabase.from('invoice_payments').select('amount, created_at').gte('created_at', startOfYear),
      supabase.from('store_expenses').select('amount, created_at').gte('created_at', startOfYear),
    ]);

    const orders = ordersRes.data || [];
    const tickets = ticketsRes.data || [];
    const payments = paymentsRes.data || [];
    const storeExpenses = expensesRes.data || [];

    const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    setRevenue(totalRevenue);

    const billed = tickets.filter(t => t.billing_status === 'billed_by_sci').reduce((s, t) => s + (t.total_amount || 0), 0);
    setTicketsBilled(billed);

    const outstandingOrders = orders.filter(o => o.billing_status !== 'billed_by_sci' && o.billing_status !== 'paid');
    setOutstanding(outstandingOrders.reduce((s, o) => s + (o.total || 0), 0));

    const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
    setPaid(totalPaid);
    setPending(totalRevenue - totalPaid);

    const totalExpenses = storeExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    setExpenses(totalExpenses);

    const monthly: Record<string, { revenue: number; expenses: number }> = {};
    orders.forEach(o => {
      const m = new Date(o.created_at).toISOString().slice(0, 7);
      if (!monthly[m]) monthly[m] = { revenue: 0, expenses: 0 };
      monthly[m].revenue += o.total || 0;
    });
    storeExpenses.forEach(e => {
      const m = new Date(e.created_at).toISOString().slice(0, 7);
      if (!monthly[m]) monthly[m] = { revenue: 0, expenses: 0 };
      monthly[m].expenses += e.amount || 0;
    });
    const sorted = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b)).map(([month, data]) => ({ month, ...data }));
    setMonthlyRevenue(sorted);

    setLoading(false);
  };

  const maxMonthly = Math.max(...monthlyRevenue.map(m => Math.max(m.revenue, m.expenses)), 1);
  const profit = revenue - expenses;

  const handleExport = (type: 'csv' | 'pdf') => {
    const headers = ['Mois', 'Revenus', 'Depenses', 'Profit'];
    const rows = monthlyRevenue.map(m => [m.month, fmt(m.revenue), fmt(m.expenses), fmt(m.revenue - m.expenses)]);
    if (type === 'csv') exportToCsv('rapport_financier', headers, rows);
    else exportToPdf('Rapport Financier', headers, rows);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: T.textLight }}>{t("common.loading", "Chargement...")}</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 20 }}>
        <button onClick={() => handleExport('csv')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 6, border: `1px solid ${T.border}`, background: '#fff', color: T.textMid, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}><Download size={12} /> CSV</button>
        <button onClick={() => handleExport('pdf')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 6, border: `1px solid ${T.border}`, background: '#fff', color: T.textMid, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}><Download size={12} /> PDF</button>
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { icon: <DollarSign size={18} />, label: t("report_financial.revenue_ytd", "Revenu YTD"), value: fmt(revenue), color: T.main },
          { icon: <TrendingUp size={18} />, label: t("report_financial.estimated_profit", "Profit estimé"), value: fmt(profit), color: profit > 0 ? T.green : T.red },
          { icon: <CreditCard size={18} />, label: t("report_financial.payments_received", "Paiements reçus"), value: fmt(paid), color: T.green },
          { icon: <AlertCircle size={18} />, label: t("report_financial.pending", "En attente"), value: fmt(pending), color: T.orange },
        ].map((kpi, i) => (
          <div key={i} style={{ flex: '1 1 200px', background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ background: `${kpi.color}12`, borderRadius: 8, padding: 8, color: kpi.color, display: 'flex' }}>{kpi.icon}</div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: T.text }}>{kpi.value}</div>
            <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ flex: '2 1 450px', background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>{t("report_financial.revenue_vs_expenses", "Revenu vs Dépenses par mois")}</div>
          {monthlyRevenue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: T.textLight, fontSize: 13 }}>{t("common.no_data", "Aucune donnée")}</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 200, padding: '8px 0' }}>
              {monthlyRevenue.map((m, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', width: '100%', justifyContent: 'center', height: '100%' }}>
                    <div style={{ width: '40%', maxWidth: 20, height: `${Math.max((m.revenue / maxMonthly) * 100, 3)}%`, background: T.main, borderRadius: '3px 3px 0 0' }} />
                    <div style={{ width: '40%', maxWidth: 20, height: `${Math.max((m.expenses / maxMonthly) * 100, 3)}%`, background: T.red, borderRadius: '3px 3px 0 0', opacity: 0.6 }} />
                  </div>
                  <span style={{ fontSize: 10, color: T.textMid }}>{m.month.split('-')[1]}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.textMid }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: T.main }} /> {t("report_financial.revenues", "Revenus")}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.textMid }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: T.red, opacity: 0.6 }} /> {t("report_financial.expenses", "Dépenses")}
            </div>
          </div>
        </div>

        <div style={{ flex: '1 1 280px', background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>{t("report_financial.financial_summary", "Résumé financier")}</div>
          {[
            [t("report_financial.gross_revenue", "Revenu brut"), revenue, T.text],
            [t("report_financial.store_expenses", "Dépenses magasin"), -expenses, T.red],
            [t("report_financial.sci_invoices", "Factures SCI"), -ticketsBilled, T.orange],
            [t("report_financial.outstanding", "Impayé"), outstanding, T.orange],
          ].map(([label, value, color], i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${T.border}`, fontSize: 13 }}>
              <span style={{ color: T.textMid }}>{label as string}</span>
              <strong style={{ color: color as string }}>{fmt(value as number)}</strong>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: `2px solid ${T.border}`, marginTop: 4, fontSize: 14 }}>
            <span style={{ fontWeight: 800 }}>{t("report_financial.net_profit_estimated", "Profit net estimé")}</span>
            <strong style={{ color: profit > 0 ? T.green : T.red, fontSize: 18 }}>{fmt(profit)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
