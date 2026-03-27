import React from "react";
import { InvoiceDoc, T, fmt, fmtDate } from "./toInvoiceTypes";
import { useLanguage } from "../../i18n/LanguageContext";

interface Props {
  docs: InvoiceDoc[];
}

function BarChart({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 160, marginTop: 8 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{d.value > 0 ? fmt(d.value) : "—"}</div>
          <div style={{ width: "100%", height: Math.max((d.value / max) * 120, 2), background: d.color || T.main, borderRadius: "4px 4px 0 0", transition: "height 0.3s" }} />
          <div style={{ fontSize: 10, color: T.textMid, textAlign: "center", lineHeight: 1.2 }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function PieChart({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const { t } = useLanguage();
  const total = slices.reduce((a, s) => a + s.value, 0);
  if (total === 0) return <div style={{ fontSize: 13, color: T.textMid, padding: 20 }}>{t("analytics.no_data")}</div>;
  let cumulative = 0;
  const paths = slices.map(s => {
    const pct = s.value / total;
    const start = cumulative;
    cumulative += pct;
    const startAngle = start * 2 * Math.PI - Math.PI / 2;
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    const x1 = 60 + 55 * Math.cos(startAngle);
    const y1 = 60 + 55 * Math.sin(startAngle);
    const x2 = 60 + 55 * Math.cos(endAngle);
    const y2 = 60 + 55 * Math.sin(endAngle);
    const large = pct > 0.5 ? 1 : 0;
    return { ...s, d: `M 60 60 L ${x1} ${y1} A 55 55 0 ${large} 1 ${x2} ${y2} Z`, pct };
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <svg width="120" height="120">
        {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} />)}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.text }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span>{s.label}</span>
            <span style={{ fontWeight: 700 }}>{s.value}</span>
            <span style={{ color: T.textMid }}>({total > 0 ? Math.round((s.value / total) * 100) : 0}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: "18px 20px" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

export default function TabAnalytics({ docs }: Props) {
  const { t } = useLanguage();
  const now = new Date();

  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("fr-CA", { month: "short", year: "2-digit" }),
    };
  });

  const billedDocs = docs.filter(d => d.billing_status === "billed_by_sci");

  const monthlyBilled = last6Months.map(m => ({
    label: m.label,
    value: billedDocs
      .filter(d => d.sci_billed_at && d.sci_billed_at.startsWith(m.key))
      .reduce((a, d) => a + d.sci_billed_amount, 0),
  }));

  const avgSendDelay = (() => {
    const with2 = docs.filter(d => d.sent_to_sci_at && d.issued_at);
    if (!with2.length) return 0;
    const total = with2.reduce((acc, d) => {
      return acc + Math.floor((new Date(d.sent_to_sci_at!).getTime() - new Date(d.issued_at).getTime()) / 86400000);
    }, 0);
    return Math.round(total / with2.length);
  })();

  const avgBillDelay = (() => {
    const withBoth = billedDocs.filter(d => d.sci_billed_at && d.sent_to_sci_at);
    if (!withBoth.length) return 0;
    const total = withBoth.reduce((acc, d) => {
      return acc + Math.floor((new Date(d.sci_billed_at!).getTime() - new Date(d.sent_to_sci_at!).getTime()) / 86400000);
    }, 0);
    return Math.round(total / withBoth.length);
  })();

  const docsWithEcart = billedDocs.filter(d => d.sci_billed_amount > 0 && Math.abs(d.sci_billed_amount - d.value) > 0.01);

  const clientTotals = Object.entries(
    billedDocs.reduce<Record<string, number>>((acc, d) => {
      acc[d.client_name] = (acc[d.client_name] || 0) + d.sci_billed_amount;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const pickupCount = docs.filter(d => d.document_type === "pickup").length;
  const orderCount = docs.filter(d => d.document_type === "order").length;

  const backlog = docs.filter(d => d.billing_status !== "billed_by_sci").reduce((a, d) => a + d.value, 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <div style={{ gridColumn: "1 / -1" }}>
        <Card title={t("analytics.billed_volume_6m")}>
          <BarChart data={monthlyBilled} />
        </Card>
      </div>

      <Card title={t("analytics.avg_delays")}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{t("analytics.pickup_to_send")}</div>
              <div style={{ fontSize: 11, color: T.textLight }}>{t("analytics.slow_sending")}</div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: avgSendDelay > 3 ? T.orange : T.green }}>{avgSendDelay > 0 ? `${avgSendDelay}j` : "—"}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{t("analytics.send_to_billed")}</div>
              <div style={{ fontSize: 11, color: T.textLight }}>{t("analytics.sci_processing")}</div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: avgBillDelay > 7 ? T.orange : T.green }}>{avgBillDelay > 0 ? `${avgBillDelay}j` : "—"}</div>
          </div>
        </div>
      </Card>

      <Card title={t("analytics.pickup_vs_orders")}>
        <PieChart slices={[
          { label: t("analytics.pickup_tickets"), value: pickupCount, color: T.blue },
          { label: t("analytics.orders"), value: orderCount, color: T.green },
        ]} />
      </Card>

      <Card title={t("analytics.unbilled_backlog")}>
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: backlog > 0 ? T.red : T.green }}>{fmt(backlog)}</div>
          <div style={{ fontSize: 12, color: T.textMid, marginTop: 6 }}>
            {docs.filter(d => d.billing_status !== "billed_by_sci").length} {t("analytics.unbilled_docs")}
          </div>
        </div>
      </Card>

      <Card title={t("analytics.top_clients")}>
        {clientTotals.length === 0 ? (
          <div style={{ fontSize: 13, color: T.textMid }}>{t("analytics.no_data_available")}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {clientTotals.map(([name, val], i) => {
              const max = clientTotals[0][1];
              return (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 11, color: T.textMid, width: 14, textAlign: "right", fontWeight: 700 }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 3 }}>{name}</div>
                    <div style={{ height: 6, borderRadius: 3, background: T.cardAlt, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(val / max) * 100}%`, background: T.main, borderRadius: 3 }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text, whiteSpace: "nowrap" }}>{fmt(val)}</div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {docsWithEcart.length > 0 && (
        <div style={{ gridColumn: "1 / -1" }}>
          <Card title={`${t("analytics.ecart_docs")} (${docsWithEcart.length})`}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[t("analytics.doc_number"), t("analytics.client"), t("analytics.doc_value"), t("analytics.sci_amount"), t("analytics.ecart"), t("analytics.billed_date")].map(h => (
                    <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.6, padding: "6px 10px 8px", borderBottom: `1px solid ${T.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docsWithEcart.map(d => {
                  const ecart = d.sci_billed_amount - d.value;
                  return (
                    <tr key={d.id}>
                      <td style={{ padding: "9px 10px", borderBottom: `1px solid ${T.border}`, fontSize: 13, fontWeight: 600, color: T.main }}>{d.document_number}</td>
                      <td style={{ padding: "9px 10px", borderBottom: `1px solid ${T.border}`, fontSize: 13 }}>{d.client_name}</td>
                      <td style={{ padding: "9px 10px", borderBottom: `1px solid ${T.border}`, fontSize: 13, fontWeight: 700 }}>{fmt(d.value)}</td>
                      <td style={{ padding: "9px 10px", borderBottom: `1px solid ${T.border}`, fontSize: 13, fontWeight: 700 }}>{fmt(d.sci_billed_amount)}</td>
                      <td style={{ padding: "9px 10px", borderBottom: `1px solid ${T.border}` }}>
                        <span style={{ background: T.orangeBg, color: T.orange, padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700 }}>{ecart > 0 ? "+" : ""}{fmt(ecart)}</span>
                      </td>
                      <td style={{ padding: "9px 10px", borderBottom: `1px solid ${T.border}`, fontSize: 12, color: T.textMid }}>{fmtDate(d.sci_billed_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
