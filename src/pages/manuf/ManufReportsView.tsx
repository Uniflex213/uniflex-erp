import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { T } from "../../theme";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-CA", { month: "short", day: "numeric", year: "numeric" });

type TabKey = "ventes" | "produits" | "clients" | "historique";

interface MonthRevenue { month: string; total: number; }
interface ProductRevenue { product: string; qty: number; total: number; }
interface ClientRevenue { client: string; orders: number; total: number; }
interface BillingLog { id: string; sent_at: string; num_documents: number; total_value: number; log_type: string; sent_by: string; recipients: string[]; }

function BarChart({ data, valueKey, labelKey, color }: {
  data: { [k: string]: number | string }[];
  valueKey: string; labelKey: string; color: string;
}) {
  const max = Math.max(...data.map(d => d[valueKey] as number), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 160, padding: "0 4px" }}>
      {data.map((d, i) => {
        const pct = ((d[valueKey] as number) / max) * 100;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ fontSize: 9, color: T.textLight, fontWeight: 600 }}>
              {typeof d[valueKey] === "number" && (d[valueKey] as number) > 1000
                ? `${((d[valueKey] as number) / 1000).toFixed(0)}k`
                : d[valueKey]}
            </div>
            <div style={{ width: "100%", display: "flex", alignItems: "flex-end", height: 120 }}>
              <div style={{ width: "100%", height: `${Math.max(pct, 3)}%`, background: color, borderRadius: "4px 4px 0 0", transition: "height 0.4s ease", minHeight: 3 }} />
            </div>
            <div style={{ fontSize: 9, color: T.textMid, textAlign: "center", lineHeight: 1.2 }}>{d[labelKey]}</div>
          </div>
        );
      })}
    </div>
  );
}

function HBar({ data, max, color }: { data: { label: string; value: number }[]; max: number; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 140, fontSize: 12, color: T.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>{d.label}</div>
          <div style={{ flex: 1, height: 20, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${(d.value / max) * 100}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.4s ease" }} />
          </div>
          <div style={{ fontSize: 12, color: T.textMid, fontWeight: 700, minWidth: 80, textAlign: "right" }}>{fmt(d.value)}</div>
        </div>
      ))}
    </div>
  );
}

export default function ManufReportsView() {
  const [tab, setTab] = useState<TabKey>("ventes");
  const [period, setPeriod] = useState<3 | 6 | 12>(6);
  const [ventes, setVentes] = useState<MonthRevenue[]>([]);
  const [produits, setProduits] = useState<ProductRevenue[]>([]);
  const [clients, setClients] = useState<ClientRevenue[]>([]);
  const [historique, setHistorique] = useState<BillingLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTab(tab);
  }, [tab, period]);

  const loadTab = async (t: TabKey) => {
    setLoading(true);
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - (t === "ventes" ? period : 12));

    try {
      if (t === "ventes") {
        const { data } = await supabase.from("orders").select("total, created_at").gte("created_at", cutoff.toISOString()).not("status", "eq", "rejected");
        const byMonth: Record<string, number> = {};
        for (const o of data ?? []) {
          const key = new Date(o.created_at).toLocaleDateString("fr-CA", { year: "2-digit", month: "short" });
          byMonth[key] = (byMonth[key] ?? 0) + (o.total ?? 0);
        }
        const sorted = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0])).map(([month, total]) => ({ month, total }));
        setVentes(sorted);
      } else if (t === "produits") {
        const { data } = await supabase.from("orders").select("products, created_at").gte("created_at", cutoff.toISOString()).not("status", "eq", "rejected");
        const byProduct: Record<string, { qty: number; total: number }> = {};
        for (const o of data ?? []) {
          for (const p of (o.products ?? []) as { product: string; qty: number; price: number }[]) {
            if (!byProduct[p.product]) byProduct[p.product] = { qty: 0, total: 0 };
            byProduct[p.product].qty += p.qty ?? 0;
            byProduct[p.product].total += (p.qty ?? 0) * (p.price ?? 0);
          }
        }
        const sorted = Object.entries(byProduct).sort((a, b) => b[1].total - a[1].total).slice(0, 10)
          .map(([product, v]) => ({ product, ...v }));
        setProduits(sorted);
      } else if (t === "clients") {
        const { data } = await supabase.from("orders").select("client, total, created_at").gte("created_at", cutoff.toISOString()).not("status", "eq", "rejected");
        const byClient: Record<string, { orders: number; total: number }> = {};
        for (const o of data ?? []) {
          const k = o.client || "Inconnu";
          if (!byClient[k]) byClient[k] = { orders: 0, total: 0 };
          byClient[k].orders++;
          byClient[k].total += o.total ?? 0;
        }
        const sorted = Object.entries(byClient).sort((a, b) => b[1].total - a[1].total).slice(0, 15)
          .map(([client, v]) => ({ client, ...v }));
        setClients(sorted);
      } else if (t === "historique") {
        const { data } = await supabase.from("sci_email_log").select("id, sent_at, num_documents, total_value, log_type, sent_by, recipients").order("sent_at", { ascending: false }).limit(50);
        setHistorique((data ?? []) as BillingLog[]);
      }
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const tabLabels: Record<TabKey, string> = { ventes: "Ventes", produits: "Produits", clients: "Clients", historique: "Historique facturation" };
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`Rapport SCI — ${tabLabels[tab]}`, 20, 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Généré le ${new Date().toLocaleString("fr-CA")}`, 20, 31);
    doc.line(20, 34, 190, 34);
    let y = 44;
    doc.setFontSize(10);

    if (tab === "ventes") {
      for (const v of ventes) {
        doc.text(`${v.month} : ${fmt(v.total)}`, 24, y); y += 7;
      }
    } else if (tab === "produits") {
      doc.setFont("helvetica", "bold");
      doc.text("Produit | Qté | Revenu", 24, y); y += 7;
      doc.setFont("helvetica", "normal");
      for (const p of produits) {
        doc.text(`${p.product.slice(0, 40)} | ${p.qty} | ${fmt(p.total)}`, 24, y); y += 7;
        if (y > 270) { doc.addPage(); y = 20; }
      }
    } else if (tab === "clients") {
      doc.setFont("helvetica", "bold");
      doc.text("Client | Commandes | Revenu total", 24, y); y += 7;
      doc.setFont("helvetica", "normal");
      for (const c of clients) {
        doc.text(`${(c.client ?? "").slice(0, 35)} | ${c.orders} | ${fmt(c.total)}`, 24, y); y += 7;
        if (y > 270) { doc.addPage(); y = 20; }
      }
    } else {
      for (const h of historique) {
        doc.text(`${new Date(h.sent_at).toLocaleDateString("fr-CA")} — ${h.num_documents} docs — ${fmt(h.total_value)}`, 24, y); y += 7;
        if (y > 270) { doc.addPage(); y = 20; }
      }
    }
    doc.save(`rapport-sci-${tab}-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "ventes", label: "Ventes", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg> },
    { key: "produits", label: "Produits", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg> },
    { key: "clients", label: "Clients", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> },
    { key: "historique", label: "Historique facturation", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> },
  ];

  const maxProduit = Math.max(...produits.map(p => p.total), 1);
  const maxClient = Math.max(...clients.map(c => c.total), 1);

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: T.text }}>Rapports SCI</h1>
            <span style={{ background: "#fffbeb", color: T.accent, fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 5, border: `1px solid ${T.accent}33` }}>LECTURE SEULE</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: T.textMid }}>Analyses et rapports de performance pour l'équipe de fabrication.</p>
        </div>
        <button onClick={exportPDF} style={{ display: "flex", alignItems: "center", gap: 7, background: T.main, color: "#fff", border: "none", borderRadius: 9, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Exporter rapport PDF
        </button>
      </div>

      <div style={{ display: "flex", gap: 2, marginBottom: 20, background: T.card, borderRadius: 10, padding: 4, border: `1px solid ${T.border}`, width: "fit-content" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: tab === t.key ? T.main : "transparent",
            color: tab === t.key ? "#fff" : T.textMid,
            border: "none", borderRadius: 7, padding: "8px 16px", fontSize: 13, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
          }}>{t.icon}{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: T.textMid }}>Chargement...</div>
      ) : (
        <>
          {tab === "ventes" && (
            <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: T.text }}>Revenu par mois</span>
                <div style={{ display: "flex", gap: 2, background: '#f5f4f0', borderRadius: 6, padding: 2 }}>
                  {([3, 6, 12] as const).map(p => (
                    <button key={p} onClick={() => setPeriod(p)} style={{
                      background: period === p ? '#fff' : 'transparent', color: period === p ? '#111' : '#999',
                      border: 'none', borderRadius: 4,
                      padding: "3px 8px", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                      boxShadow: period === p ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.15s ease', lineHeight: 1.4,
                    }}>{p} mois</button>
                  ))}
                </div>
              </div>
              {ventes.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: T.textMid, fontSize: 13 }}>Aucune donnée pour cette période.</div>
              ) : (
                <>
                  <BarChart data={ventes.map(v => ({ month: v.month, total: v.total }))} valueKey="total" labelKey="month" color={T.main} />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginTop: 20 }}>
                    {ventes.map(v => (
                      <div key={v.month} style={{ background: T.mainBg, borderRadius: 8, padding: "10px 14px" }}>
                        <div style={{ fontSize: 11, color: T.textMid, marginBottom: 4 }}>{v.month}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: T.main }}>{fmt(v.total)}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "produits" && (
            <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 20 }}>Top produits — 12 derniers mois</div>
              {produits.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: T.textMid, fontSize: 13 }}>Aucune donnée.</div>
              ) : (
                <>
                  <HBar data={produits.map(p => ({ label: p.product, value: p.total }))} max={maxProduit} color={T.main} />
                  <div style={{ marginTop: 20, overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#f8f9fb" }}>
                          {["Produit", "Quantité totale", "Revenu total"].map(h => (
                            <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {produits.map((p, i) => (
                          <tr key={p.product} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                            <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: T.text, borderBottom: `1px solid ${T.border}` }}>{p.product}</td>
                            <td style={{ padding: "10px 14px", fontSize: 13, color: T.textMid, borderBottom: `1px solid ${T.border}` }}>{p.qty} unités</td>
                            <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: T.main, borderBottom: `1px solid ${T.border}` }}>{fmt(p.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "clients" && (
            <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 20 }}>Top clients par revenu — 12 derniers mois</div>
              {clients.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: T.textMid, fontSize: 13 }}>Aucune donnée.</div>
              ) : (
                <>
                  <HBar data={clients.map(c => ({ label: c.client, value: c.total }))} max={maxClient} color="#0891b2" />
                  <div style={{ marginTop: 20, overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#f8f9fb" }}>
                          {["Client", "Nb commandes", "Revenu total"].map(h => (
                            <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.textMid, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {clients.map((c, i) => (
                          <tr key={c.client} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                            <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: T.text, borderBottom: `1px solid ${T.border}` }}>{c.client}</td>
                            <td style={{ padding: "10px 14px", fontSize: 13, color: T.textMid, borderBottom: `1px solid ${T.border}` }}>{c.orders}</td>
                            <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#0891b2", borderBottom: `1px solid ${T.border}` }}>{fmt(c.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "historique" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {historique.length === 0 ? (
                <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: 40, textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.textMid }}>Aucun historique</div>
                  <div style={{ fontSize: 13, color: T.textLight, marginTop: 4 }}>Les emails envoyés à SCI apparaîtront ici.</div>
                </div>
              ) : historique.map(log => (
                <div key={log.id} style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: log.log_type === "send" ? T.mainBg : "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={log.log_type === "send" ? T.main : "#d97706"} strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                      {log.log_type === "send" ? "Envoi initial" : "Relance"} — {log.num_documents} doc{log.num_documents !== 1 ? "s" : ""} — <span style={{ color: T.main }}>{fmt(log.total_value)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: T.textMid, marginTop: 2 }}>
                      {fmtDate(log.sent_at)} · Envoyé par : {log.sent_by} · À : {(log.recipients ?? []).join(", ")}
                    </div>
                  </div>
                  <span style={{ background: log.log_type === "send" ? T.mainBg : "#fef3c7", color: log.log_type === "send" ? T.main : "#d97706", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 5 }}>
                    {log.log_type === "send" ? "Envoi" : "Relance"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
