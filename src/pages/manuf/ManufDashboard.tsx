import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { STATUS_CONFIG } from "../../orders/orderTypes";
import { SAMPLE_STATUS_COLORS, SAMPLE_STATUS_BG } from "../../sales/sampleTypes";
import { T } from "../../theme";
import { useLanguage } from "../../i18n/LanguageContext";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-CA", { month: "short", day: "numeric" });

function KpiCard({ label, value, icon, color, bg, sub }: {
  label: string; value: string | number; icon: React.ReactNode;
  color: string; bg: string; sub?: string;
}) {
  return (
    <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: "20px 22px", flex: 1, minWidth: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: T.textMid }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color: T.text, lineHeight: 1, letterSpacing: -0.5 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.textLight, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function StatusBadge({ status, config }: { status: string; config: Record<string, { label: string; color: string; bg: string }> }) {
  const c = config[status] ?? { label: status, color: T.textMid, bg: "#f3f4f6" };
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 5, whiteSpace: "nowrap" }}>
      {c.label}
    </span>
  );
}

interface KpiData { ordersEnCours: number; aFacturer: number; samplesEnAttente: number; alertesStock: number; }
interface RecentOrder { id: string; client: string; total: number; status: string; created_at: string; motif: string; }
interface RecentSample { id: string; lead_company_name: string; agent_name: string; status: string; created_at: string; items?: { product_name: string }[]; }

export default function ManufDashboard() {
  const { t } = useLanguage();
  const [kpis, setKpis] = useState<KpiData>({ ordersEnCours: 0, aFacturer: 0, samplesEnAttente: 0, alertesStock: 0 });
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [samples, setSamples] = useState<RecentSample[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [ordersRes, invoiceRes, samplesRes, stockRes, recentOrdersRes, recentSamplesRes] = await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true })
        .not("status", "in", '("completed","rejected")'),
      supabase.from("orders").select("total").neq("billing_status", "billed_by_sci"),
      supabase.from("sample_requests").select("id", { count: "exact", head: true })
        .in("status", ["En attente d'approbation", "Approuvé", "En préparation"]),
      supabase.from("sale_products").select("id", { count: "exact", head: true })
        .eq("is_active", true).gt("min_stock", 0).filter("stock_qty", "lte", "min_stock"),
      supabase.from("orders").select("id, client, total, status, created_at, motif")
        .order("created_at", { ascending: false }).limit(10),
      supabase.from("sample_requests").select("id, lead_company_name, agent_name, status, created_at, items:sample_items(product_name)")
        .order("created_at", { ascending: false }).limit(5),
    ]);

    const aFacturer = (invoiceRes.data ?? []).reduce((sum: number, r: { total: number }) => sum + (r.total || 0), 0);

    setKpis({
      ordersEnCours: ordersRes.count ?? 0,
      aFacturer,
      samplesEnAttente: samplesRes.count ?? 0,
      alertesStock: stockRes.count ?? 0,
    });
    setOrders((recentOrdersRes.data ?? []) as RecentOrder[]);
    setSamples((recentSamplesRes.data ?? []) as RecentSample[]);
    setLoading(false);
  };

  const exportPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(t("manuf_dashboard.pdf_title", "Résumé MANUF / SCI"), 20, 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`${t("manuf_dashboard.generated_on", "Généré le")} ${new Date().toLocaleString("fr-CA")}`, 20, 32);
    doc.setLineWidth(0.4);
    doc.line(20, 36, 190, 36);

    const kpiData = [
      [t("manuf_dashboard.orders_in_progress", "Commandes en cours"), String(kpis.ordersEnCours)],
      [t("manuf_dashboard.to_invoice", "À facturer (SCI)"), fmt(kpis.aFacturer)],
      [t("manuf_dashboard.samples_pending", "Échantillons en attente"), String(kpis.samplesEnAttente)],
      [t("manuf_dashboard.stock_alerts", "Alertes stock"), String(kpis.alertesStock)],
    ];
    let y = 46;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(t("manuf_dashboard.key_indicators", "Indicateurs clés"), 20, y);
    y += 10;
    for (const [label, val] of kpiData) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`${label} :`, 24, y);
      doc.setFont("helvetica", "bold");
      doc.text(val, 100, y);
      y += 8;
    }
    doc.save(`manuf-resume-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: T.text }}>{t("manuf_dashboard.title", "Dashboard SCI")}</h1>
            <span style={{ background: T.accentBg, color: T.accent, fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 5, border: `1px solid ${T.accent}33`, letterSpacing: 0.4 }}>{t("manuf_common.read_only", "LECTURE SEULE")}</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: T.textMid }}>{t("manuf_dashboard.subtitle", "Vue d'ensemble de la plateforme pour l'équipe de fabrication.")}</p>
        </div>
        <button onClick={exportPDF} style={{ display: "flex", alignItems: "center", gap: 7, background: T.main, color: "#fff", border: "none", borderRadius: 9, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          {t("manuf_dashboard.export_pdf", "Exporter résumé PDF")}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: T.textMid }}>{t("common.loading", "Chargement...")}</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
            <KpiCard label={t("manuf_dashboard.orders_in_progress", "Commandes en cours")} value={kpis.ordersEnCours}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>}
              color={T.main} bg={T.mainBg} sub={t("manuf_dashboard.not_completed", "Statut non complété")} />
            <KpiCard label={t("manuf_dashboard.to_invoice", "À facturer (SCI)")} value={fmt(kpis.aFacturer)}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>}
              color={T.green} bg={T.greenBg} sub="Non facturé par SCI" />
            <KpiCard label="Échantillons en attente" value={kpis.samplesEnAttente}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>}
              color="#7c3aed\" bg="#f5f3ff\" sub="En attente ou approuvés" />
            <KpiCard label="Alertes stock" value={kpis.alertesStock}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
              color={T.red} bg={T.redBg} sub="Produits sous seuil minimum" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.main} strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>10 dernières commandes</span>
              </div>
              <div>
                {orders.length === 0 ? (
                  <div style={{ padding: 32, textAlign: "center", color: T.textMid, fontSize: 13 }}>Aucune commande.</div>
                ) : orders.map((o, i) => (
                  <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", borderBottom: i < orders.length - 1 ? `1px solid ${T.border}` : "none" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.client || "—"}</div>
                      <div style={{ fontSize: 11, color: T.textLight }}>{o.id?.slice(0, 20)}... · {fmtDate(o.created_at)}</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.main, whiteSpace: "nowrap" }}>{fmt(o.total ?? 0)}</div>
                    <StatusBadge status={o.status} config={STATUS_CONFIG} />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="2"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>
                <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>5 derniers échantillons</span>
              </div>
              <div>
                {samples.length === 0 ? (
                  <div style={{ padding: 32, textAlign: "center", color: T.textMid, fontSize: 13 }}>Aucun échantillon.</div>
                ) : samples.map((s, i) => (
                  <div key={s.id} style={{ padding: "12px 18px", borderBottom: i < samples.length - 1 ? `1px solid ${T.border}` : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{s.lead_company_name || "—"}</div>
                      <span style={{ background: SAMPLE_STATUS_BG[s.status as keyof typeof SAMPLE_STATUS_BG] ?? "#f3f4f6", color: SAMPLE_STATUS_COLORS[s.status as keyof typeof SAMPLE_STATUS_COLORS] ?? T.textMid, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4 }}>
                        {s.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: T.textMid }}>
                      {s.items?.slice(0, 2).map(it => it.product_name).join(", ") || "Produits non spécifiés"}
                      {(s.items?.length ?? 0) > 2 && ` +${(s.items?.length ?? 0) - 2}`}
                    </div>
                    <div style={{ fontSize: 10, color: T.textLight, marginTop: 2 }}>{fmtDate(s.created_at)} · {s.agent_name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
