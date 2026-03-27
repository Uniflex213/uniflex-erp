import React, { useState } from "react";
import { InvoiceDoc, T, fmt, fmtDate, daysSince } from "./toInvoiceTypes";
import { useLanguage } from "../../i18n/LanguageContext";

interface Props {
  docs: InvoiceDoc[];
}

interface KpiModalData {
  title: string;
  rows: InvoiceDoc[];
  columns: string[];
}

function KpiCard({
  label, value, sub, warn, accent, success, onClick,
}: {
  label: string; value: string; sub?: string; warn?: boolean; accent?: boolean; success?: boolean; onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: T.card, borderRadius: 12, padding: "16px 18px",
        border: `1px solid ${hover && onClick ? T.main : T.border}`,
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: hover && onClick ? `0 0 0 3px ${T.mainBg}` : "none",
        flex: 1, minWidth: 130,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textMid, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: warn ? T.red : success ? T.green : accent ? T.main : T.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.textLight, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function ToInvoiceKpiBar({ docs }: Props) {
  const { t } = useLanguage();
  const [modal, setModal] = useState<KpiModalData | null>(null);

  const toSend = docs.filter(d => d.billing_status === "unbilled");
  const sent = docs.filter(d => d.billing_status === "sent");
  const billed = docs.filter(d => d.billing_status === "billed_by_sci");
  const paidDocs = billed.filter(d => d.payment_status === "Payé");
  const partialDocs = billed.filter(d => d.payment_status === "Partiel");
  const unpaidBilled = billed.filter(d => d.payment_status !== "Payé");
  const litigeDocs = billed.filter(d => d.payment_status === "En litige");

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const billedThisMonth = billed.filter(d => d.sci_billed_at && d.sci_billed_at.startsWith(thisMonth));

  const avgDelay = (() => {
    const withDelay = docs.filter(d => d.sci_billed_at && d.sent_to_sci_at);
    if (!withDelay.length) return 0;
    const total = withDelay.reduce((acc, d) => acc + daysSince(d.sent_to_sci_at) - daysSince(d.sci_billed_at), 0);
    return Math.round(total / withDelay.length);
  })();

  const late = sent.filter(d => daysSince(d.sent_to_sci_at) > 7);

  const toSendVal = toSend.reduce((a, d) => a + d.value, 0);
  const sentVal = sent.reduce((a, d) => a + d.value, 0);
  const billedVal = billedThisMonth.reduce((a, d) => a + d.value, 0);
  const paidVal = paidDocs.reduce((a, d) => a + (d.paid_amount || 0), 0);
  const unpaidVal = unpaidBilled.reduce((a, d) => a + ((d.sci_billed_amount > 0 ? d.sci_billed_amount : d.value) - (d.paid_amount || 0)), 0);

  return (
    <>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <KpiCard
          label={t("kpi.to_send")} value={String(toSend.length)}
          sub={toSend.length > 0 ? fmt(toSendVal) : undefined}
          warn={toSend.length > 0}
          onClick={toSend.length > 0 ? () => setModal({ title: t("kpi.modal_docs_to_send"), rows: toSend, columns: ["document", "client", "valeur", "age"] }) : undefined}
        />
        <KpiCard
          label={t("kpi.waiting_sci")} value={String(sent.length)}
          sub={sent.length > 0 ? fmt(sentVal) : undefined}
          onClick={sent.length > 0 ? () => setModal({ title: t("kpi.modal_docs_waiting"), rows: sent, columns: ["document", "client", "valeur", "envoye"] }) : undefined}
        />
        <KpiCard
          label={t("kpi.invoices_month")} value={String(billedThisMonth.length)}
          sub={billedThisMonth.length > 0 ? fmt(billedVal) : undefined}
          accent
          onClick={billedThisMonth.length > 0 ? () => setModal({ title: t("kpi.modal_invoices_month"), rows: billedThisMonth, columns: ["document", "client", "valeur", "facture"] }) : undefined}
        />
        <KpiCard
          label={t("kpi.unpaid_balance")} value={fmt(unpaidVal)}
          sub={`${unpaidBilled.length} ${unpaidBilled.length !== 1 ? t("kpi.invoices_s") : t("kpi.invoice_s")}`}
          warn={unpaidVal > 0}
          onClick={unpaidBilled.length > 0 ? () => setModal({ title: t("kpi.modal_unpaid"), rows: unpaidBilled, columns: ["document", "client", "valeur", "facture"] }) : undefined}
        />
        <KpiCard
          label={t("kpi.partially_paid")} value={String(partialDocs.length)}
          sub={partialDocs.length > 0 ? `${partialDocs.reduce((a, d) => a + (d.paid_amount || 0), 0).toFixed(0)}$ ${t("kpi.received")}` : undefined}
          accent={partialDocs.length > 0}
          onClick={partialDocs.length > 0 ? () => setModal({ title: t("kpi.modal_partial"), rows: partialDocs, columns: ["document", "client", "valeur", "facture"] }) : undefined}
        />
        <KpiCard
          label={t("kpi.total_paid")} value={fmt(paidVal)}
          sub={`${paidDocs.length} ${paidDocs.length !== 1 ? t("kpi.invoices_s") : t("kpi.invoice_s")} ${t("kpi.closed")}`}
          success
        />
        <KpiCard
          label={t("kpi.avg_delay")} value={avgDelay > 0 ? `${avgDelay}j` : "—"}
          sub={t("kpi.between_send_bill")}
        />
        <KpiCard
          label={t("kpi.late_7d")} value={String(late.length)}
          warn={late.length > 0}
          sub={t("kpi.sent_no_response")}
          onClick={late.length > 0 ? () => setModal({ title: t("kpi.modal_late"), rows: late, columns: ["document", "client", "valeur", "envoye"] }) : undefined}
        />
        {litigeDocs.length > 0 && (
          <KpiCard
            label={t("kpi.in_dispute")} value={String(litigeDocs.length)}
            warn
            sub={fmt(litigeDocs.reduce((a, d) => a + d.value, 0))}
            onClick={() => setModal({ title: t("kpi.modal_dispute"), rows: litigeDocs, columns: ["document", "client", "valeur", "facture"] })}
          />
        )}
      </div>

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(230,228,224,0.35)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", zIndex: 9000, display: "flex", justifyContent: "center", overflowY: "auto", padding: 20 }} onClick={() => setModal(null)}>
          <div style={{ background: T.card, borderRadius: 16, width: "100%", maxWidth: 700, margin: "auto", padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text }}>{modal.title}</h3>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: T.textMid, lineHeight: 1 }}>x</button>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {modal.columns.map(c => (
                    <th key={c} style={{ textAlign: "left", fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.6, padding: "6px 12px 10px", borderBottom: `1px solid ${T.border}` }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modal.rows.map(d => (
                  <tr key={d.id}>
                    <td style={{ padding: "10px 12px", borderBottom: `1px solid ${T.border}`, fontSize: 13, fontWeight: 600, color: T.text }}>{d.document_number}</td>
                    <td style={{ padding: "10px 12px", borderBottom: `1px solid ${T.border}`, fontSize: 13, color: T.text }}>{d.client_name}</td>
                    <td style={{ padding: "10px 12px", borderBottom: `1px solid ${T.border}`, fontSize: 13, fontWeight: 700, color: T.text }}>{fmt(d.value)}</td>
                    <td style={{ padding: "10px 12px", borderBottom: `1px solid ${T.border}`, fontSize: 12, color: T.textMid }}>
                      {modal.columns[3] === "age" && `${daysSince(d.issued_at)}j`}
                      {modal.columns[3] === "envoye" && fmtDate(d.sent_to_sci_at)}
                      {modal.columns[3] === "facture" && fmtDate(d.sci_billed_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
