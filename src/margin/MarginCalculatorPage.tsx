import React, { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import {
  MarginLine, MarginScenario, SaleCurrency, SavedAnalysis, MOCK_ANALYSES,
  getMarginStatus, getMarginColor, getMarginBg,
} from "./marginTypes";
import { useApp } from "../AppContext";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { T } from "../theme";
import { useLanguage } from "../i18n/LanguageContext";

const mkId = () => Math.random().toString(36).slice(2, 9);

const fmtC = (n: number, currency: SaleCurrency | boolean = "CAD") => {
  const cur = currency === true ? "USD" : currency === false ? "CAD" : currency;
  return new Intl.NumberFormat("fr-CA", {
    style: "currency", currency: cur,
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n);
};

const fmtPct = (n: number) => `${n.toFixed(1)}%`;

type CRMClient = { id: string; name: string };

const DEFAULT_SCENARIO: MarginScenario = {
  reference: "",
  clientName: "",
  commissionPct: 8,
  globalDiscountPct: 0,
  transportCost: 0,
  transportIsUsd: false,
  extraFees: 0,
  extraIsUsd: false,
  saleCurrency: "CAD",
  exchangeRate: 1.38,
  eurExchangeRate: 1.50,
  lines: [],
};

function computeAnalysis(sc: MarginScenario) {
  const { globalDiscountPct, transportCost, transportIsUsd, extraFees, extraIsUsd, commissionPct, saleCurrency, exchangeRate, eurExchangeRate } = sc;

  const grossRevenue = sc.lines.reduce((s, l) => s + l.sellingPriceUnit * l.quantity, 0);
  const discountAmt = grossRevenue * (globalDiscountPct / 100);
  const netRevenue = grossRevenue - discountAmt;

  const transportCad = transportIsUsd ? transportCost * exchangeRate : transportCost;
  const extraFeesCad = extraIsUsd ? extraFees * exchangeRate : extraFees;

  const cogsBase = sc.lines.reduce((s, l) => s + l.cogsUnit * l.quantity, 0);
  const adjustedCogs = cogsBase + transportCad + extraFeesCad;
  const grossProfit = netRevenue - adjustedCogs;
  const grossMarginPct = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

  const commissionAmt = netRevenue * (commissionPct / 100);
  const netProfit = grossProfit - commissionAmt;
  const netMarginPct = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

  const rate = saleCurrency === "USD" ? exchangeRate : saleCurrency === "EUR" ? eurExchangeRate : 1;

  return {
    grossRevenue, discountAmt, netRevenue,
    cogsBase, adjustedCogs, grossProfit, grossMarginPct,
    commissionAmt, netProfit, netMarginPct,
    grossRevenueFx: grossRevenue / rate,
    netRevenueFx: netRevenue / rate,
    netProfitFx: netProfit / rate,
  };
}

function StatusBadge({ pct }: { pct: number }) {
  const status = getMarginStatus(pct);
  const color = getMarginColor(pct);
  const bg = getMarginBg(pct);
  const glow = pct > 50 ? `0 0 8px ${color}55` : "none";
  return (
    <span style={{
      background: bg, color, padding: "3px 9px", borderRadius: 6,
      fontSize: 11, fontWeight: 800, letterSpacing: 0.4, boxShadow: glow,
    }}>
      {status}
    </span>
  );
}

function MarginBar({ pct }: { pct: number }) {
  const capped = Math.min(Math.max(pct, 0), 100);
  return (
    <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: 4, height: 6, overflow: "hidden", width: "100%" }}>
      <div style={{
        width: `${capped}%`, height: "100%",
        background: getMarginColor(pct),
        transition: "width 0.3s ease",
        borderRadius: 4,
      }} />
    </div>
  );
}

function NumInput({
  value, onChange, prefix, suffix, min = 0, step = 0.1,
}: {
  value: number; onChange: (v: number) => void;
  prefix?: string; suffix?: string; min?: number; step?: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${T.border}`, borderRadius: 8, background: T.card, overflow: "hidden" }}>
      {prefix && <span style={{ padding: "0 8px", color: T.textMid, fontSize: 13, fontWeight: 600, background: T.cardAlt, borderRight: `1px solid ${T.border}`, lineHeight: "36px" }}>{prefix}</span>}
      <input
        type="number" value={value} min={min} step={step}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        style={{
          border: "none", outline: "none", padding: "0 10px", fontSize: 13,
          width: "80px", height: "36px", fontFamily: "inherit", background: "transparent",
        }}
      />
      {suffix && <span style={{ padding: "0 8px", color: T.textMid, fontSize: 12, background: T.cardAlt, borderLeft: `1px solid ${T.border}`, lineHeight: "36px" }}>{suffix}</span>}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
        background: value ? T.main : "#d1d5db", position: "relative",
        transition: "background 0.2s", padding: 0, flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: value ? 23 : 3, width: 18, height: 18,
        borderRadius: "50%", background: T.bgCard, transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

type SimulatorProps = {
  line: MarginLine;
  sc: MarginScenario;
  onClose: () => void;
};

function SimulatorPanel({ line, sc, onClose }: SimulatorProps) {
  const { t } = useLanguage();
  const [simPrice, setSimPrice] = useState(line.sellingPriceUnit);
  const minPrice = line.cogsUnit * 0.5;
  const maxPrice = line.cogsUnit * 3;
  const margin = simPrice > 0 ? ((simPrice - line.cogsUnit) / simPrice) * 100 : 0;
  const color = getMarginColor(margin);

  return (
    <div style={{
      position: "fixed", right: 0, top: 0, bottom: 0, width: 380,
      background: T.card, boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
      zIndex: 200, display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{t("margin.simulator_title")}</div>
          <div style={{ color: T.textMid, fontSize: 12, marginTop: 2 }}>{line.productName}</div>
        </div>
        <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 20, color: T.textMid }}>×</button>
      </div>
      <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>{t("margin.target_price")}</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: T.text, marginBottom: 4 }}>{fmtC(simPrice, sc.saleCurrency)}</div>
          <input
            type="range"
            min={minPrice} max={maxPrice} step={0.5}
            value={simPrice}
            onChange={e => setSimPrice(parseFloat(e.target.value))}
            style={{ width: "100%", marginTop: 8, accentColor: color }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.textLight, marginTop: 4 }}>
            <span>{fmtC(minPrice, sc.saleCurrency)}</span>
            <span>{fmtC(maxPrice, sc.saleCurrency)}</span>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>{t("margin.resulting_margin")}</div>
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <svg width="160" height="90" viewBox="0 0 160 90">
              <defs>
                <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="33%" stopColor="#f59e0b" />
                  <stop offset="66%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#15803d" />
                </linearGradient>
              </defs>
              <path d="M10 80 A70 70 0 0 1 150 80" fill="none" stroke="#e5e7eb" strokeWidth="12" strokeLinecap="round" />
              <path
                d="M10 80 A70 70 0 0 1 150 80"
                fill="none"
                stroke="url(#gaugeGrad)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${Math.PI * 70 * Math.min(Math.max(margin, 0), 100) / 100} ${Math.PI * 70}`}
              />
              <text x="80" y="68" textAnchor="middle" fontSize="24" fontWeight="900" fill={color}>{margin.toFixed(1)}%</text>
              <text x="80" y="83" textAnchor="middle" fontSize="10" fill={T.textMid}>{getMarginStatus(margin)}</text>
            </svg>
          </div>
        </div>

        <div style={{ background: T.cardAlt, borderRadius: 10, padding: 16, fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: T.textMid }}>{t("margin.cogs_unit")}</span>
            <span style={{ fontWeight: 700 }}>{fmtC(line.cogsUnit)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: T.textMid }}>{t("margin.simulated_price")}</span>
            <span style={{ fontWeight: 700, color: T.main }}>{fmtC(simPrice, sc.saleCurrency)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>
            <span style={{ color: T.textMid }}>{t("margin.gp_unit")}</span>
            <span style={{ fontWeight: 800, color: simPrice > line.cogsUnit ? T.green : T.red }}>
              {fmtC(simPrice - line.cogsUnit, sc.saleCurrency)}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: T.textMid }}>{t("margin.gp_total")} (×{line.quantity})</span>
            <span style={{ fontWeight: 800, color: simPrice > line.cogsUnit ? T.green : T.red }}>
              {fmtC((simPrice - line.cogsUnit) * line.quantity, sc.saleCurrency)}
            </span>
          </div>
        </div>

        <div style={{ marginTop: 16, padding: 12, background: `${color}11`, border: `1px solid ${color}33`, borderRadius: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 4 }}>
            {margin < 10 ? t("margin.price_too_low") : margin < 25 ? t("margin.tight_margin") : margin < 40 ? t("margin.acceptable_margin") : t("margin.excellent_margin")}
          </div>
          <div style={{ fontSize: 11, color: T.textMid, lineHeight: 1.5 }}>
            {margin < 10
              ? t("margin.price_too_low_desc")
              : margin < 25
              ? t("margin.tight_margin_desc")
              : margin < 40
              ? t("margin.acceptable_margin_desc")
              : t("margin.excellent_margin_desc")}
          </div>
        </div>
      </div>
    </div>
  );
}

type CompareScenario = { label: string; scenario: MarginScenario };

function ComparePanel({
  baseScenario, onClose,
}: { baseScenario: MarginScenario; onClose: () => void }) {
  const { t } = useLanguage();
  const [scenarios, setScenarios] = useState<CompareScenario[]>([
    { label: "Scénario A", scenario: baseScenario },
    { label: "Scénario B", scenario: { ...baseScenario, lines: baseScenario.lines.map(l => ({ ...l, id: mkId() })) } },
  ]);

  const [editing, setEditing] = useState<number>(1);

  const updatePrice = (scIdx: number, lineIdx: number, price: number) => {
    setScenarios(prev => prev.map((sc, si) => si !== scIdx ? sc : {
      ...sc,
      scenario: {
        ...sc.scenario,
        lines: sc.scenario.lines.map((l, li) => li !== lineIdx ? l : { ...l, sellingPriceUnit: price }),
      },
    }));
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(230,228,224,0.35)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto",
    }}>
      <div style={{ background: T.card, borderRadius: 16, width: "min(96vw, 900px)", maxHeight: "90vh", overflowY: "auto", padding: 32, position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{t("margin.compare_title")}</div>
            <div style={{ color: T.textMid, fontSize: 13 }}>{t("margin.compare_subtitle")}</div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "#f4f5f9", cursor: "pointer", fontSize: 18, color: T.text, borderRadius: 8, width: 36, height: 36 }}>×</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {scenarios.map((sc, si) => {
            const calc = computeAnalysis(sc.scenario);
            return (
              <div key={si} style={{ border: `2px solid ${si === 0 ? T.main : T.orange}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ background: si === 0 ? T.main : T.orange, padding: "12px 16px", color: "#fff", fontWeight: 800, fontSize: 14 }}>
                  {sc.label}
                </div>
                <div style={{ padding: 16 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 16 }}>
                    <thead>
                      <tr style={{ background: T.cardAlt }}>
                        <th style={{ padding: "6px 8px", textAlign: "left", color: T.textLight, fontWeight: 700 }}>{t("margin.product_col")}</th>
                        <th style={{ padding: "6px 8px", textAlign: "right", color: T.textLight, fontWeight: 700 }}>{t("margin.selling_price_col")}</th>
                        <th style={{ padding: "6px 8px", textAlign: "right", color: T.textLight, fontWeight: 700 }}>{t("margin.margin_pct_col")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sc.scenario.lines.map((l, li) => {
                        const m = l.sellingPriceUnit > 0 ? ((l.sellingPriceUnit - l.cogsUnit) / l.sellingPriceUnit) * 100 : 0;
                        return (
                          <tr key={l.id}>
                            <td style={{ padding: "6px 8px" }}>{l.productName}</td>
                            <td style={{ padding: "6px 8px", textAlign: "right" }}>
                              {si === 1 ? (
                                <input
                                  type="number"
                                  value={l.sellingPriceUnit}
                                  onChange={e => updatePrice(si, li, parseFloat(e.target.value) || 0)}
                                  style={{ width: 70, border: `1px solid ${T.border}`, borderRadius: 5, padding: "2px 5px", fontSize: 12, textAlign: "right", fontFamily: "inherit" }}
                                />
                              ) : fmtC(l.sellingPriceUnit)}
                            </td>
                            <td style={{ padding: "6px 8px", textAlign: "right", color: getMarginColor(m), fontWeight: 700 }}>{fmtPct(m)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div style={{ fontSize: 13, borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ color: T.textMid }}>{t("margin.net_revenue")}</span>
                      <span style={{ fontWeight: 700 }}>{fmtC(calc.netRevenue)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ color: T.textMid }}>{t("margin.gross_margin")}</span>
                      <span style={{ fontWeight: 700, color: getMarginColor(calc.grossMarginPct) }}>{fmtPct(calc.grossMarginPct)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: T.textMid }}>{t("margin.net_margin")}</span>
                      <span style={{ fontWeight: 800, color: getMarginColor(calc.netMarginPct) }}>{fmtPct(calc.netMarginPct)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 20, padding: 16, background: T.cardAlt, borderRadius: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>{t("margin.direct_compare")}</div>
          {(() => {
            const a = computeAnalysis(scenarios[0].scenario);
            const b = computeAnalysis(scenarios[1].scenario);
            const diff = b.netMarginPct - a.netMarginPct;
            return (
              <div style={{ display: "flex", gap: 24, fontSize: 13 }}>
                <div>
                  <span style={{ color: T.textMid }}>{t("margin.net_margin_diff")}: </span>
                  <span style={{ fontWeight: 800, color: diff >= 0 ? T.green : T.red }}>{diff >= 0 ? "+" : ""}{fmtPct(diff)}</span>
                </div>
                <div>
                  <span style={{ color: T.textMid }}>{t("margin.net_revenue_diff")}: </span>
                  <span style={{ fontWeight: 800, color: b.netRevenue >= a.netRevenue ? T.green : T.red }}>
                    {b.netRevenue >= a.netRevenue ? "+" : ""}{fmtC(b.netRevenue - a.netRevenue)}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

export default function MarginCalculatorPage() {
  const { products: ctxProducts } = useApp();
  const { profile, realProfile } = useAuth();
  const { t } = useLanguage();
  const ownerId = realProfile?.id ?? profile?.id ?? null;
  const availableProducts = ctxProducts.filter(p => p.is_active).map(p => ({ name: p.name, description: "" })).sort((a, b) => a.name.localeCompare(b.name));
  const [sc, setSc] = useState<MarginScenario>(DEFAULT_SCENARIO);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>(MOCK_ANALYSES);
  const [showHistory, setShowHistory] = useState(false);
  const [simulatorLine, setSimulatorLine] = useState<MarginLine | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [crmClients, setCrmClients] = useState<CRMClient[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [cogsInputUsd, setCogsInputUsd] = useState(false);
  const [priceInputUsd, setPriceInputUsd] = useState(false);
  const [marginInputUsd, setMarginInputUsd] = useState(false);

  const calc = computeAnalysis(sc);

  const upSc = (patch: Partial<MarginScenario>) => setSc(prev => ({ ...prev, ...patch }));

  const addLine = () => setSc(prev => ({
    ...prev,
    lines: [...prev.lines, { id: mkId(), productName: "", format: "1GAL", cogsUnit: 0, sellingPriceUnit: 0, quantity: 0, unit: "kits" }],
  }));

  const removeLine = (id: string) => setSc(prev => ({ ...prev, lines: prev.lines.filter(l => l.id !== id) }));

  const dupLine = (id: string) => setSc(prev => ({
    ...prev,
    lines: prev.lines.flatMap(l => l.id === id ? [l, { ...l, id: mkId() }] : [l]),
  }));

  const upLine = (id: string, patch: Partial<MarginLine>) => setSc(prev => ({
    ...prev,
    lines: prev.lines.map(l => l.id === id ? { ...l, ...patch } : l),
  }));

  const selectProduct = (lineId: string, productName: string) => {
    upLine(lineId, {
      productName,
      cogsUnit: 0,
      sellingPriceUnit: 0,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const analysis: SavedAnalysis = {
      id: `MA-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      reference: sc.reference || t("margin.no_reference"),
      clientName: sc.clientName || "—",
      createdAt: new Date().toISOString().split("T")[0],
      scenario: { ...sc },
    };

    const { data, error } = await supabase.from("margin_analyses").insert({
      reference: sc.reference,
      client_name: sc.clientName,
      commission_pct: sc.commissionPct,
      global_discount_pct: sc.globalDiscountPct,
      transport_cost: sc.transportCost,
      transport_is_usd: sc.transportIsUsd,
      extra_fees: sc.extraFees,
      extra_is_usd: sc.extraIsUsd,
      is_usd: sc.saleCurrency === "USD",
      sale_currency: sc.saleCurrency,
      exchange_rate: sc.exchangeRate,
      eur_exchange_rate: sc.eurExchangeRate,
      owner_id: ownerId,
    }).select().maybeSingle();

    if (data) {
      for (const line of sc.lines) {
        await supabase.from("margin_analysis_lines").insert({
          analysis_id: data.id,
          product_name: line.productName,
          sku: line.sku,
          cogs_unit: line.cogsUnit,
          selling_price_unit: line.sellingPriceUnit,
          quantity: line.quantity,
          sort_order: sc.lines.indexOf(line),
        });
      }
    }

    setSavedAnalyses(prev => [analysis, ...prev]);
    setSaving(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2500);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const PW = 210, M = 18, cBlue = "#111111";
    let y = M;

    doc.setFillColor(9, 2, 184);
    doc.rect(0, 0, PW, 30, "F");
    doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
    doc.text("UNIFLEX Distribution", M, 13);
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text("Analyse de rentabilité — Document interne confidentiel", M, 20);
    doc.setFontSize(9);
    doc.text(new Date().toLocaleDateString("fr-CA"), PW - M, 13, { align: "right" });

    y = 40;
    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(9, 2, 184);
    doc.text(`Réf: ${sc.reference || "—"}`, M, y); y += 7;
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(60, 60, 60);
    doc.text(`Client: ${sc.clientName || "—"}   Commission: ${sc.commissionPct}%   Devise: ${sc.saleCurrency}`, M, y); y += 12;

    doc.setFillColor(240, 243, 250);
    doc.rect(M, y - 4, PW - 2 * M, 8, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(90, 90, 100);
    const cols = ["Produit", "SKU", "COGS/u", "Prix vente", "Qté", "COGS tot.", "Revenu", "Marge%"];
    const colX = [M, M + 28, M + 56, M + 76, M + 98, M + 110, M + 130, M + 155];
    cols.forEach((c, i) => doc.text(c, colX[i], y + 1));
    y += 10;

    doc.setFont("helvetica", "normal"); doc.setTextColor(30, 30, 30);
    sc.lines.forEach((line, idx) => {
      if (y > 260) { doc.addPage(); y = M; }
      if (idx % 2 === 0) { doc.setFillColor(248, 249, 252); doc.rect(M, y - 4, PW - 2 * M, 7, "F"); }
      const mPct = line.sellingPriceUnit > 0 ? ((line.sellingPriceUnit - line.cogsUnit) / line.sellingPriceUnit) * 100 : 0;
      doc.setFontSize(8);
      doc.text(line.productName.slice(0, 14), colX[0], y);
      doc.text(line.sku.slice(0, 10), colX[1], y);
      doc.text(fmtC(line.cogsUnit), colX[2], y);
      doc.text(fmtC(line.sellingPriceUnit), colX[3], y);
      doc.text(String(line.quantity), colX[4], y);
      doc.text(fmtC(line.cogsUnit * line.quantity), colX[5], y);
      doc.text(fmtC(line.sellingPriceUnit * line.quantity), colX[6], y);
      const mColor = mPct <= 20 ? [239, 68, 68] : mPct <= 35 ? [245, 158, 11] : mPct <= 50 ? [34, 197, 94] : [21, 128, 61];
      doc.setTextColor(mColor[0], mColor[1], mColor[2]);
      doc.text(`${mPct.toFixed(1)}%`, colX[7], y);
      doc.setTextColor(30, 30, 30);
      y += 7;
    });

    y += 6;
    doc.setDrawColor(9, 2, 184); doc.setLineWidth(0.3);
    doc.line(M, y, PW - M, y); y += 8;

    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(9, 2, 184);
    doc.text("RÉSUMÉ FINANCIER", M, y); y += 7;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60, 60, 60);

    const rows = [
      ["Revenu brut", fmtC(calc.grossRevenue)],
      [`Rabais global (${sc.globalDiscountPct}%)`, `-${fmtC(calc.discountAmt)}`],
      ["Revenu net", fmtC(calc.netRevenue)],
      ["COGS base", fmtC(calc.cogsBase)],
      ["Transport", fmtC(sc.transportCost)],
      ["Frais extra", fmtC(sc.extraFees)],
      ["COGS ajusté", fmtC(calc.adjustedCogs)],
      ["Marge brute", `${fmtC(calc.grossProfit)} (${calc.grossMarginPct.toFixed(1)}%)`],
      [`Commission (${sc.commissionPct}%)`, `-${fmtC(calc.commissionAmt)}`],
      ["MARGE NETTE", `${fmtC(calc.netProfit)} (${calc.netMarginPct.toFixed(1)}%)`],
    ];

    rows.forEach(([label, val], i) => {
      if (i === rows.length - 1) { doc.setFont("helvetica", "bold"); doc.setTextColor(9, 2, 184); }
      doc.text(label, M + 30, y, { align: "right" });
      doc.text(val, PW - M, y, { align: "right" });
      y += 6;
    });

    doc.setFontSize(8); doc.setTextColor(180, 180, 180); doc.setFont("helvetica", "italic");
    doc.text("DOCUMENT INTERNE — CONFIDENTIEL — UNIFLEX Distribution", PW / 2, 290, { align: "center" });

    doc.save(`Analyse_Marge_${sc.reference || "sans-ref"}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const loadAnalysis = (a: SavedAnalysis) => {
    setSc(a.scenario);
    setShowHistory(false);
  };

  const alerts: { type: "red" | "orange" | "blue"; msg: string }[] = [];
  if (sc.lines.length > 0) {
    if (calc.netMarginPct < 10) alerts.push({ type: "red", msg: t("margin.alert_critical") });
    else if (calc.netMarginPct < 20) alerts.push({ type: "orange", msg: t("margin.alert_tight") });
    if (calc.netRevenue > 0 && sc.transportCost / calc.netRevenue > 0.15)
      alerts.push({ type: "orange", msg: `${t("margin.alert_transport")} ${((sc.transportCost / calc.netRevenue) * 100).toFixed(1)}% ${t("margin.alert_transport_suffix")}` });
    sc.lines.forEach(l => {
      if (l.sellingPriceUnit > 0 && l.sellingPriceUnit < l.cogsUnit)
        alerts.push({ type: "red", msg: `"${l.productName}" ${t("margin.alert_sold_at_loss")}` });
    });
    if (sc.saleCurrency === "USD") {
      const withoutRate = computeAnalysis({ ...sc, exchangeRate: 1 });
      const diff = calc.netMarginPct - withoutRate.netMarginPct;
      if (Math.abs(diff) > 1)
        alerts.push({ type: "blue", msg: `USD/CAD (${sc.exchangeRate}) ${t("margin.alert_exchange_impact")} ${Math.abs(diff).toFixed(1)} ${t("margin.alert_exchange_points")}` });
    }
    if (sc.saleCurrency === "EUR") {
      const withoutRate = computeAnalysis({ ...sc, eurExchangeRate: 1 });
      const diff = calc.netMarginPct - withoutRate.netMarginPct;
      if (Math.abs(diff) > 1)
        alerts.push({ type: "blue", msg: `EUR/CAD (${sc.eurExchangeRate}) ${t("margin.alert_exchange_impact")} ${Math.abs(diff).toFixed(1)} ${t("margin.alert_exchange_points")}` });
    }
  }

  const inputStyle: React.CSSProperties = {
    border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "0 10px", height: 36,
    fontSize: 13, fontFamily: "inherit", outline: "none", background: T.card,
  } as React.CSSProperties & {
    MozAppearance?: string;
    appearance?: string;
  };

  const numberInputStyle: React.CSSProperties = {
    ...inputStyle,
    MozAppearance: "textfield" as any,
  };

  const cardStyle: React.CSSProperties = {
    background: T.card, borderRadius: 14, border: `1px solid ${T.border}`,
    padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase",
    letterSpacing: 0.6, marginBottom: 6,
  };

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", color: T.text }}>
      {simulatorLine && (
        <SimulatorPanel line={simulatorLine} sc={sc} onClose={() => setSimulatorLine(null)} />
      )}
      {showCompare && sc.lines.length > 0 && (
        <ComparePanel baseScenario={sc} onClose={() => setShowCompare(false)} />
      )}

      {showHistory && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(230,228,224,0.35)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: T.card, borderRadius: 16, width: "min(90vw, 700px)", maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{t("margin.saved_analyses_title")}</div>
              <button onClick={() => setShowHistory(false)} style={{ border: "none", background: "#f4f5f9", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {savedAnalyses.map(a => {
                const c = computeAnalysis(a.scenario);
                return (
                  <div key={a.id} onClick={() => loadAnalysis(a)} style={{ padding: "16px 24px", borderBottom: `1px solid ${T.border}`, cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = T.cardAlt)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: 14 }}>{a.reference}</span>
                      <span style={{ fontSize: 11, color: T.textLight }}>{a.createdAt}</span>
                    </div>
                    <div style={{ fontSize: 12, color: T.textMid, marginBottom: 6 }}>{a.clientName} · {a.scenario.lines.length} {t("margin.products_count")}</div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ fontSize: 12 }}>{t("margin.net_margin_label")}: <strong style={{ color: getMarginColor(c.netMarginPct) }}>{fmtPct(c.netMarginPct)}</strong></span>
                      <StatusBadge pct={c.netMarginPct} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800 }}>{t("margin.title")}</h2>
          <p style={{ margin: 0, color: T.textMid, fontSize: 14 }}>{t("margin.subtitle")}</p>
        </div>
        <button
          onClick={() => setShowHistory(true)}
          style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: T.text }}
        >
          {t("margin.saved_analyses")} ({savedAnalyses.length})
        </button>
      </div>

      {alerts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {alerts.map((al, i) => (
            <div key={i} style={{
              padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500,
              background: al.type === "red" ? "#fee2e2" : al.type === "orange" ? "#fef3c7" : "#dbeafe",
              color: al.type === "red" ? "#991b1b" : al.type === "orange" ? "#92400e" : "#1e40af",
              border: `1px solid ${al.type === "red" ? "#fecaca" : al.type === "orange" ? "#fde68a" : "#bfdbfe"}`,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              {al.type === "red" ? "⚠️" : al.type === "orange" ? "⚡" : "💱"} {al.msg}
            </div>
          ))}
        </div>
      )}

      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16 }}>{t("margin.deal_params")}</div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <div style={sectionLabelStyle}>{t("margin.reference")}</div>
            <input
              style={{ ...inputStyle, width: 160 }}
              placeholder="Ex: CMD-2026-001"
              value={sc.reference}
              onChange={e => upSc({ reference: e.target.value })}
            />
          </div>
          <div>
            <div style={sectionLabelStyle}>{t("margin.client")}</div>
            <input
              style={{ ...inputStyle, width: 160 }}
              placeholder="Nom du client"
              value={sc.clientName}
              onChange={e => upSc({ clientName: e.target.value })}
            />
          </div>
          <div>
            <div style={sectionLabelStyle}>{t("margin.commission")} %</div>
            <NumInput value={sc.commissionPct} onChange={v => upSc({ commissionPct: v })} suffix="%" step={0.5} />
          </div>
          <div>
            <div style={sectionLabelStyle}>{t("margin.global_discount")} %</div>
            <NumInput value={sc.globalDiscountPct} onChange={v => upSc({ globalDiscountPct: v })} suffix="%" step={0.5} />
          </div>
          <div>
            <div style={sectionLabelStyle}>{t("margin.sale_currency")}</div>
            <select
              value={sc.saleCurrency}
              onChange={e => {
                const c = e.target.value as SaleCurrency;
                upSc({ saleCurrency: c });
              }}
              style={{ ...inputStyle, width: 160, height: 36, cursor: "pointer", paddingRight: 8 }}
            >
              <option value="CAD">CAD — Dollar canadien</option>
              <option value="USD">USD — Dollar américain</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </div>
          {sc.saleCurrency === "USD" && (
            <div>
              <div style={sectionLabelStyle}>{t("margin.usd_cad_rate")}</div>
              <NumInput value={sc.exchangeRate} onChange={v => upSc({ exchangeRate: v })} step={0.01} min={0.5} />
            </div>
          )}
          {sc.saleCurrency === "EUR" && (
            <div>
              <div style={sectionLabelStyle}>{t("margin.eur_cad_rate")}</div>
              <NumInput value={sc.eurExchangeRate} onChange={v => upSc({ eurExchangeRate: v })} step={0.01} min={0.5} />
            </div>
          )}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={sectionLabelStyle}>{t("margin.transport_dollar")}</div>
              <div style={{ display: "flex", alignItems: "center", background: "rgba(0,0,0,0.04)", borderRadius: 20, padding: "2px 3px" }}>
                <button onClick={() => upSc({ transportIsUsd: false })} style={{ fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 14, border: "none", cursor: "pointer", background: !sc.transportIsUsd ? T.main : "transparent", color: !sc.transportIsUsd ? "#fff" : T.textMid, transition: "all 0.15s", fontFamily: "inherit", lineHeight: 1.4 }}>CAD</button>
                <button onClick={() => upSc({ transportIsUsd: true })} style={{ fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 14, border: "none", cursor: "pointer", background: sc.transportIsUsd ? "#16a34a" : "transparent", color: sc.transportIsUsd ? "#fff" : T.textMid, transition: "all 0.15s", fontFamily: "inherit", lineHeight: 1.4 }}>USD</button>
              </div>
            </div>
            <NumInput value={sc.transportCost} onChange={v => upSc({ transportCost: v })} prefix="$" step={10} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={sectionLabelStyle}>{t("margin.extra_fees_dollar")}</div>
              <div style={{ display: "flex", alignItems: "center", background: "rgba(0,0,0,0.04)", borderRadius: 20, padding: "2px 3px" }}>
                <button onClick={() => upSc({ extraIsUsd: false })} style={{ fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 14, border: "none", cursor: "pointer", background: !sc.extraIsUsd ? T.main : "transparent", color: !sc.extraIsUsd ? "#fff" : T.textMid, transition: "all 0.15s", fontFamily: "inherit", lineHeight: 1.4 }}>CAD</button>
                <button onClick={() => upSc({ extraIsUsd: true })} style={{ fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 14, border: "none", cursor: "pointer", background: sc.extraIsUsd ? "#16a34a" : "transparent", color: sc.extraIsUsd ? "#fff" : T.textMid, transition: "all 0.15s", fontFamily: "inherit", lineHeight: 1.4 }}>USD</button>
              </div>
            </div>
            <NumInput value={sc.extraFees} onChange={v => upSc({ extraFees: v })} prefix="$" step={10} />
          </div>
          {(sc.transportIsUsd || sc.extraIsUsd) && sc.saleCurrency !== "USD" && (
            <div>
              <div style={sectionLabelStyle}>{t("margin.usd_cad_transport")}</div>
              <NumInput value={sc.exchangeRate} onChange={v => upSc({ exchangeRate: v })} step={0.01} min={0.5} />
            </div>
          )}
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>{t("margin.order_products")}</div>
          <button
            onClick={addLine}
            style={{ background: T.main, color: "#fff", border: "none", borderRadius: 9, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.3 }}
          >
            {t("margin.add_product")}
          </button>
        </div>

        {sc.lines.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: T.textLight, fontSize: 14 }}>
            {t("margin.no_products")}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 980 }}>
              <thead>
                <tr style={{ background: T.cardAlt }}>
                  {["#", t("margin.product_col"), t("margin.format_col")].map(h => (
                    <th key={h} style={{ padding: "9px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.3, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                  {[
                    { label: t("margin.cogs_unit_col"), isUsd: cogsInputUsd, setUsd: setCogsInputUsd },
                    { label: t("margin.selling_price"), isUsd: priceInputUsd, setUsd: setPriceInputUsd },
                  ].map(({ label, isUsd, setUsd }) => (
                    <th key={label} style={{ padding: "5px 8px", textAlign: "right", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</span>
                        <div style={{ display: "flex", alignItems: "center", background: "rgba(0,0,0,0.04)", borderRadius: 20, padding: "2px 3px" }}>
                          <button onClick={() => setUsd(false)} style={{ fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 14, border: "none", cursor: "pointer", background: !isUsd ? T.main : "transparent", color: !isUsd ? "#fff" : T.textMid, transition: "all 0.15s", fontFamily: "inherit", lineHeight: 1.4 }}>CAD</button>
                          <button onClick={() => setUsd(true)} style={{ fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 14, border: "none", cursor: "pointer", background: isUsd ? "#16a34a" : "transparent", color: isUsd ? "#fff" : T.textMid, transition: "all 0.15s", fontFamily: "inherit", lineHeight: 1.4 }}>USD</button>
                        </div>
                      </div>
                    </th>
                  ))}
                  <th style={{ padding: "5px 8px", textAlign: "left", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.3 }}>{t("margin.qty_unit")}</span>
                  </th>
                  <th style={{ padding: "9px 10px", textAlign: "right", fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.3, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{t("margin.cogs_total_col")}</th>
                  <th style={{ padding: "9px 10px", textAlign: "right", fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.3, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{t("margin.revenue_col")}</th>
                  <th style={{ padding: "5px 8px", textAlign: "right", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.3 }}>{t("margin.margin_dollar")}</span>
                      <div style={{ display: "flex", alignItems: "center", background: "rgba(0,0,0,0.04)", borderRadius: 20, padding: "2px 3px" }}>
                        <button onClick={() => setMarginInputUsd(false)} style={{ fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 14, border: "none", cursor: "pointer", background: !marginInputUsd ? T.main : "transparent", color: !marginInputUsd ? "#fff" : T.textMid, transition: "all 0.15s", fontFamily: "inherit", lineHeight: 1.4 }}>CAD</button>
                        <button onClick={() => setMarginInputUsd(true)} style={{ fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 14, border: "none", cursor: "pointer", background: marginInputUsd ? "#16a34a" : "transparent", color: marginInputUsd ? "#fff" : T.textMid, transition: "all 0.15s", fontFamily: "inherit", lineHeight: 1.4 }}>USD</button>
                      </div>
                    </div>
                  </th>
                  {[t("margin.margin_pct"), t("margin.status_col"), ""].map(h => (
                    <th key={h} style={{ padding: "9px 10px", textAlign: h === t("margin.margin_pct") ? "right" : "left", fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.3, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sc.lines.map((line, idx) => {
                  const cogsTotal = line.cogsUnit * line.quantity;
                  const revenue = line.sellingPriceUnit * line.quantity;
                  const gp = revenue - cogsTotal;
                  const gpPct = revenue > 0 ? (gp / revenue) * 100 : 0;
                  const cogsDisplay = cogsInputUsd ? parseFloat((line.cogsUnit / sc.exchangeRate).toFixed(2)) : line.cogsUnit;
                  const priceDisplay = priceInputUsd ? parseFloat((line.sellingPriceUnit / sc.exchangeRate).toFixed(2)) : line.sellingPriceUnit;
                  const gpDisplay = marginInputUsd ? gp / sc.exchangeRate : gp;
                  return (
                    <tr key={line.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: "10px 10px", color: T.textLight, fontSize: 12, width: 30 }}>{idx + 1}</td>
                      <td style={{ padding: "10px 6px" }}>
                        <select
                          value={line.productName}
                          onChange={e => selectProduct(line.id, e.target.value)}
                          style={{ ...inputStyle, width: 140, height: 32, padding: "0 6px", fontSize: 12 }}
                        >
                          <option value="">{t("margin.select_product")}</option>
                          {availableProducts.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "10px 6px" }}>
                        <select
                          value={line.format}
                          onChange={e => upLine(line.id, { format: e.target.value as any })}
                          style={{ ...inputStyle, width: 110, height: 32, padding: "0 6px", fontSize: 11, fontWeight: 700, color: T.main }}
                        >
                          <option value="common">Common Kit (1GAL, 2GAL, 3GAL)</option>
                          <option value="large">Large Kit (5GAL, 10GAL, 15GAL)</option>
                          <option value="barrel">Barrel Kit (55 GAL per Barrel)</option>
                          <option value="tote">Tote Kit (250 GAL per Tote)</option>
                          <option value="special">Special (see with HO for options)</option>
                        </select>
                      </td>
                      <td style={{ padding: "10px 6px", textAlign: "right" }}>
                        <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                          <span style={{ position: "absolute", left: 7, fontSize: 9, fontWeight: 800, color: cogsInputUsd ? "#16a34a" : T.main, pointerEvents: "none", zIndex: 1 }}>{cogsInputUsd ? "US" : "CA"}</span>
                          <input
                            type="number" min={0} value={cogsDisplay}
                            onChange={e => {
                              const v = parseFloat(e.target.value) || 0;
                              upLine(line.id, { cogsUnit: cogsInputUsd ? parseFloat((v * sc.exchangeRate).toFixed(4)) : v });
                            }}
                            style={{ ...numberInputStyle, width: 88, height: 32, fontSize: 12, textAlign: "right", paddingLeft: 24, borderColor: cogsInputUsd ? "#16a34a55" : undefined }}
                          />
                        </div>
                      </td>
                      <td style={{ padding: "10px 6px", textAlign: "right" }}>
                        <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                          <span style={{ position: "absolute", left: 7, fontSize: 9, fontWeight: 800, color: priceInputUsd ? "#16a34a" : T.main, pointerEvents: "none", zIndex: 1 }}>{priceInputUsd ? "US" : "CA"}</span>
                          <input
                            type="number" min={0} value={priceDisplay}
                            onChange={e => {
                              const v = parseFloat(e.target.value) || 0;
                              upLine(line.id, { sellingPriceUnit: priceInputUsd ? parseFloat((v * sc.exchangeRate).toFixed(4)) : v });
                            }}
                            style={{ ...numberInputStyle, width: 88, height: 32, fontSize: 12, textAlign: "right", paddingLeft: 24, borderColor: priceInputUsd ? "#16a34a55" : undefined }}
                          />
                        </div>
                      </td>
                      <td style={{ padding: "10px 6px" }}>
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <input
                            type="number" min={0} value={line.quantity}
                            onChange={e => upLine(line.id, { quantity: parseInt(e.target.value) || 0 })}
                            style={{ ...numberInputStyle, width: 54, height: 32, fontSize: 12, textAlign: "center" }}
                          />
                          <select
                            value={line.unit}
                            onChange={e => upLine(line.id, { unit: e.target.value as "kits" | "gal" })}
                            style={{ ...inputStyle, width: 58, height: 32, padding: "0 4px", fontSize: 11, fontWeight: 700, color: T.main }}
                          >
                            <option value="kits">kits</option>
                            <option value="gal">gal</option>
                          </select>
                        </div>
                      </td>
                      <td style={{ padding: "10px 10px", textAlign: "right", fontSize: 12, color: T.textMid }}>{fmtC(cogsTotal)}</td>
                      <td style={{ padding: "10px 10px", textAlign: "right", fontSize: 12, fontWeight: 600 }}>{fmtC(revenue, sc.saleCurrency)}</td>
                      <td style={{ padding: "10px 10px", textAlign: "right", fontSize: 12, fontWeight: 700, color: gp >= 0 ? T.text : T.red }}>
                        {fmtC(gpDisplay, marginInputUsd ? "USD" : "CAD")}
                        {marginInputUsd && <span style={{ fontSize: 9, fontWeight: 800, color: "#16a34a", marginLeft: 2 }}>US</span>}
                      </td>
                      <td style={{ padding: "10px 10px", textAlign: "right", fontWeight: 800, color: getMarginColor(gpPct) }}>{fmtPct(gpPct)}</td>
                      <td style={{ padding: "10px 6px" }}><StatusBadge pct={gpPct} /></td>
                      <td />
                    </tr>
                  );
                })}
              </tbody>
              {sc.lines.length > 0 && (() => {
                const totCogs = sc.lines.reduce((s, l) => s + l.cogsUnit * l.quantity, 0);
                const totRev = sc.lines.reduce((s, l) => s + l.sellingPriceUnit * l.quantity, 0);
                const totGp = totRev - totCogs;
                const totPct = totRev > 0 ? (totGp / totRev) * 100 : 0;
                const totGpDisplay = marginInputUsd ? totGp / sc.exchangeRate : totGp;
                return (
                  <tfoot>
                    <tr style={{ background: `${T.main}08`, borderTop: `2px solid ${T.main}33` }}>
                      <td colSpan={6} style={{ padding: "12px 10px", fontWeight: 800, fontSize: 12, color: T.main, textTransform: "uppercase", letterSpacing: 0.5 }}>{t("margin.grand_total")}</td>
                      <td style={{ padding: "12px 10px", textAlign: "right", fontWeight: 700, fontSize: 13 }}>{fmtC(totCogs)}</td>
                      <td style={{ padding: "12px 10px", textAlign: "right", fontWeight: 800, fontSize: 13 }}>{fmtC(totRev, sc.saleCurrency)}</td>
                      <td style={{ padding: "12px 10px", textAlign: "right", fontWeight: 800, fontSize: 13, color: totGp >= 0 ? T.text : T.red }}>
                        {fmtC(totGpDisplay, marginInputUsd ? "USD" : "CAD")}
                        {marginInputUsd && <span style={{ fontSize: 9, fontWeight: 800, color: "#16a34a", marginLeft: 2 }}>US</span>}
                      </td>
                      <td style={{ padding: "12px 10px", textAlign: "right", fontWeight: 900, fontSize: 14, color: getMarginColor(totPct) }}>{fmtPct(totPct)}</td>
                      <td style={{ padding: "12px 6px" }}><StatusBadge pct={totPct} /></td>
                      <td />
                    </tr>
                  </tfoot>
                );
              })()}
            </table>
            {sc.lines.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
                {sc.lines.map(line => (
                  <div key={line.id} style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => setSimulatorLine(line)} title="Simulateur" style={{ background: "#eff6ff", color: T.main, border: "none", borderRadius: 6, width: 32, height: 32, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>⚡</button>
                    <button onClick={() => dupLine(line.id)} title="Dupliquer" style={{ background: T.cardAlt, color: T.textMid, border: "none", borderRadius: 6, width: 32, height: 32, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>⎘</button>
                    <button onClick={() => removeLine(line.id)} title="Supprimer" style={{ background: "#fee2e2", color: T.red, border: "none", borderRadius: 6, width: 32, height: 32, cursor: "pointer", fontSize: 16, fontWeight: 700 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {sc.lines.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 20, marginBottom: 20, alignItems: "start" }}>
          <div style={cardStyle}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 18, color: T.main }}>{t("margin.pnl_title")}</div>

            <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{t("margin.revenues")}</div>
            {[
              [t("margin.gross_revenue"), fmtC(calc.grossRevenue, sc.saleCurrency), false],
              [`${t("margin.global_discount")} (${sc.globalDiscountPct}%)`, `-${fmtC(calc.discountAmt, sc.saleCurrency)}`, true],
              [t("margin.net_revenue"), fmtC(calc.netRevenue, sc.saleCurrency), false, true],
            ].map(([l, v, neg, bold], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: i === 2 ? `2px solid ${T.border}` : "none", marginBottom: i === 2 ? 12 : 0 }}>
                <span style={{ fontSize: 13, color: T.textMid, fontWeight: bold ? 700 : 400 }}>{l}</span>
                <span style={{ fontSize: 13, fontWeight: bold ? 800 : 600, color: neg ? T.red : T.text }}>{v}</span>
              </div>
            ))}

            <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{t("margin.cogs_section")}</div>
            {[
              [t("margin.cogs_base"), fmtC(calc.cogsBase), false],
              [t("margin.transport"), fmtC(sc.transportCost), false],
              [t("margin.extra_fees"), fmtC(sc.extraFees), false],
              [t("margin.adjusted_cogs"), fmtC(calc.adjustedCogs), false, true],
            ].map(([l, v, neg, bold], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: i === 3 ? `2px solid ${T.border}` : "none", marginBottom: i === 3 ? 12 : 0 }}>
                <span style={{ fontSize: 13, color: T.textMid, fontWeight: bold ? 700 : 400 }}>{l}</span>
                <span style={{ fontSize: 13, fontWeight: bold ? 800 : 600 }}>{v}</span>
              </div>
            ))}

            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: `${getMarginColor(calc.grossMarginPct)}15`, borderRadius: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{t("margin.gross_margin")}</span>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: getMarginColor(calc.grossMarginPct) }}>{fmtC(calc.grossProfit, sc.saleCurrency)}</div>
                <div style={{ fontSize: 11, color: T.textMid }}>{fmtPct(calc.grossMarginPct)} {t("margin.of_net_revenue")}</div>
              </div>
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{t("margin.deductions")}</div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: T.textMid }}>{t("margin.commission")} ({sc.commissionPct}%)</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.red }}>-{fmtC(calc.commissionAmt, sc.saleCurrency)}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: `${getMarginColor(calc.netMarginPct)}15`, border: `2px solid ${getMarginColor(calc.netMarginPct)}33`, borderRadius: 10 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{t("margin.net_margin_upper")}</div>
                <div style={{ fontSize: 11, color: T.textMid, marginTop: 2 }}>{fmtPct(calc.netMarginPct)} {t("margin.of_net_revenue")}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 900, fontSize: 18, color: getMarginColor(calc.netMarginPct) }}>{fmtC(calc.netProfit, sc.saleCurrency)}</div>
                <StatusBadge pct={calc.netMarginPct} />
              </div>
            </div>

            {sc.saleCurrency !== "CAD" && (
              <div style={{
                marginTop: 14, padding: "10px 12px", borderRadius: 8, fontSize: 12,
                background: sc.saleCurrency === "EUR" ? "#fef9ec" : "#eff6ff",
                border: sc.saleCurrency === "EUR" ? "1px solid #fde68a" : "1px solid #bfdbfe",
              }}>
                <div style={{ fontWeight: 700, color: sc.saleCurrency === "EUR" ? "#92400e" : "#1e40af", marginBottom: 6 }}>
                  {t("margin.in_currency")} {sc.saleCurrency} ({sc.saleCurrency === "EUR" ? sc.eurExchangeRate : sc.exchangeRate})
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: T.textMid }}>{t("margin.net_revenue_fx")} {sc.saleCurrency}</span>
                  <span style={{ fontWeight: 700 }}>{fmtC(calc.netRevenueFx, sc.saleCurrency)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: T.textMid }}>{t("margin.net_margin_fx")} {sc.saleCurrency}</span>
                  <span style={{ fontWeight: 800, color: getMarginColor(calc.netMarginPct) }}>{fmtC(calc.netProfitFx, sc.saleCurrency)}</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { label: t("margin.gross_margin_upper"), pct: calc.grossMarginPct, amt: calc.grossProfit, main: false },
                { label: t("margin.net_margin_upper"), pct: calc.netMarginPct, amt: calc.netProfit, main: true },
              ].map(({ label, pct, amt, main }) => (
                <div key={label} style={{
                  ...cardStyle,
                  padding: 20,
                  border: main ? `2px solid ${getMarginColor(pct)}44` : `1px solid ${T.border}`,
                  boxShadow: main ? `0 4px 20px ${getMarginColor(pct)}22` : "0 2px 12px rgba(0,0,0,0.06)",
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
                    {label} {main && <span style={{ color: T.main, fontSize: 9 }}>★ {t("margin.key_indicator")}</span>}
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: getMarginColor(pct), lineHeight: 1, marginBottom: 4 }}>
                    {fmtPct(pct)}
                  </div>
                  <div style={{ fontSize: 13, color: T.textMid, marginBottom: 12 }}>{fmtC(amt, sc.saleCurrency)}</div>
                  <MarginBar pct={pct} />
                  <div style={{ marginTop: 10 }}><StatusBadge pct={pct} /></div>
                </div>
              ))}
            </div>

            <div style={cardStyle}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 14 }}>{t("margin.product_breakdown")}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {sc.lines.map(line => {
                  const rev = line.sellingPriceUnit * line.quantity;
                  const cogs = line.cogsUnit * line.quantity;
                  const gp = rev - cogs;
                  const gpPct = rev > 0 ? (gp / rev) * 100 : 0;
                  const totRev = sc.lines.reduce((s, l) => s + l.sellingPriceUnit * l.quantity, 0);
                  const sharePct = totRev > 0 ? (rev / totRev) * 100 : 0;
                  return (
                    <div key={line.id} style={{ paddingBottom: 12, borderBottom: `1px solid ${T.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{line.productName || "—"}</span>
                          <span style={{ color: T.textLight, fontSize: 11, marginLeft: 8 }}>×{line.quantity}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: getMarginColor(gpPct) }}>{fmtPct(gpPct)}</span>
                          <StatusBadge pct={gpPct} />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 16, fontSize: 11, color: T.textMid, marginBottom: 6 }}>
                        <span>Revenu: {fmtC(rev, sc.saleCurrency)}</span>
                        <span>COGS: {fmtC(cogs)}</span>
                        <span>GP: <strong style={{ color: gp >= 0 ? T.text : T.red }}>{fmtC(gp, sc.saleCurrency)}</strong></span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, background: "rgba(0,0,0,0.04)", borderRadius: 4, height: 5, overflow: "hidden" }}>
                          <div style={{ width: `${sharePct}%`, height: "100%", background: T.main, borderRadius: 4, transition: "width 0.3s" }} />
                        </div>
                        <span style={{ fontSize: 10, color: T.textLight, width: 36, textAlign: "right" }}>{sharePct.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ ...cardStyle, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: T.textMid, marginRight: 4 }}>{t("margin.tools")} :</div>
        <button
          onClick={() => sc.lines.length > 0 ? setSimulatorLine(sc.lines[0]) : null}
          disabled={sc.lines.length === 0}
          style={{ background: sc.lines.length > 0 ? "#eff6ff" : T.cardAlt, color: sc.lines.length > 0 ? T.main : T.textLight, border: `1.5px solid ${sc.lines.length > 0 ? T.main + "44" : T.border}`, borderRadius: 9, padding: "9px 18px", fontSize: 12, fontWeight: 700, cursor: sc.lines.length > 0 ? "pointer" : "not-allowed", fontFamily: "inherit" }}
        >
          ⚡ {t("margin.simulator")}
        </button>
        <button
          onClick={() => sc.lines.length > 0 ? setShowCompare(true) : null}
          disabled={sc.lines.length === 0}
          style={{ background: sc.lines.length > 0 ? "#fff7ed" : T.cardAlt, color: sc.lines.length > 0 ? T.orange : T.textLight, border: `1.5px solid ${sc.lines.length > 0 ? T.orange + "44" : T.border}`, borderRadius: 9, padding: "9px 18px", fontSize: 12, fontWeight: 700, cursor: sc.lines.length > 0 ? "pointer" : "not-allowed", fontFamily: "inherit" }}
        >
          ⇄ {t("margin.compare_scenarios")}
        </button>
        <button
          onClick={() => sc.lines.length > 0 ? handleExportPdf() : null}
          disabled={sc.lines.length === 0}
          style={{ background: sc.lines.length > 0 ? "#f0fdf4" : T.cardAlt, color: sc.lines.length > 0 ? T.greenDark : T.textLight, border: `1.5px solid ${sc.lines.length > 0 ? T.greenDark + "44" : T.border}`, borderRadius: 9, padding: "9px 18px", fontSize: 12, fontWeight: 700, cursor: sc.lines.length > 0 ? "pointer" : "not-allowed", fontFamily: "inherit" }}
        >
          {t("margin.export_pdf")}
        </button>
        <button
          onClick={() => sc.lines.length > 0 ? handleSave() : null}
          disabled={sc.lines.length === 0 || saving}
          style={{ background: sc.lines.length > 0 ? T.main : T.cardAlt, color: sc.lines.length > 0 ? "#fff" : T.textLight, border: "none", borderRadius: 9, padding: "9px 18px", fontSize: 12, fontWeight: 700, cursor: sc.lines.length > 0 && !saving ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "opacity 0.2s", opacity: saving ? 0.7 : 1 }}
        >
          {saving ? t("margin.saving") : savedFlash ? t("margin.saved") : t("margin.save")}
        </button>
        <button
          onClick={() => { setSc(DEFAULT_SCENARIO); }}
          style={{ background: T.bgCard, color: T.red, border: `1.5px solid ${T.red}33`, borderRadius: 9, padding: "9px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginLeft: "auto" }}
        >
          {t("margin.reset")}
        </button>
      </div>
    </div>
  );
}
