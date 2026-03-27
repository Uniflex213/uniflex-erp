import React, { useState, useEffect } from 'react';
import { Download, GitBranch, Clock, Thermometer, Globe } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { T, fmtNum, fmtPct, exportToCsv, exportToPdf } from './reportUtils';
import { useLanguage } from '../i18n/LanguageContext';

export default function ReportCRMPipeline() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [funnel, setFunnel] = useState<{ stage: string; count: number; value: number }[]>([]);
  const [conversions, setConversions] = useState<{ from: string; to: string; rate: number }[]>([]);
  const [tempDist, setTempDist] = useState<{ temp: string; count: number; color: string }[]>([]);
  const [sourceDist, setSourceDist] = useState<{ source: string; count: number }[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: leads } = await supabase
      .from('crm_leads')
      .select('id, stage, temperature, source, estimated_value, created_at, closed_at')
      .eq('archived', false);

    const allLeads = leads || [];
    setTotalLeads(allLeads.length);

    const stageOrder = ['Nouveau', 'Contact', 'Qualifie', 'Proposition', 'Negociation', 'Ferme Gagne', 'Ferme Perdu'];
    const stageMap: Record<string, { count: number; value: number }> = {};
    allLeads.forEach(l => {
      const s = l.stage || 'Nouveau';
      if (!stageMap[s]) stageMap[s] = { count: 0, value: 0 };
      stageMap[s].count += 1;
      stageMap[s].value += l.estimated_value || 0;
    });
    setFunnel(stageOrder.filter(s => stageMap[s]).map(s => ({ stage: s, ...stageMap[s] })));

    const convs: { from: string; to: string; rate: number }[] = [];
    for (let i = 0; i < stageOrder.length - 1; i++) {
      const fromCount = stageMap[stageOrder[i]]?.count || 0;
      const toCount = stageMap[stageOrder[i + 1]]?.count || 0;
      if (fromCount > 0) {
        convs.push({ from: stageOrder[i], to: stageOrder[i + 1], rate: (toCount / fromCount) * 100 });
      }
    }
    setConversions(convs);

    const temps: Record<string, number> = {};
    allLeads.forEach(l => {
      const t = l.temperature || 'Tiede';
      temps[t] = (temps[t] || 0) + 1;
    });
    const tempColors: Record<string, string> = { Chaud: T.red, Tiede: T.orange, Froid: '#007aff' };
    setTempDist(Object.entries(temps).map(([temp, count]) => ({ temp, count, color: tempColors[temp] || T.textMid })).sort((a, b) => b.count - a.count));

    const sources: Record<string, number> = {};
    allLeads.forEach(l => {
      const s = l.source || 'Autre';
      sources[s] = (sources[s] || 0) + 1;
    });
    setSourceDist(Object.entries(sources).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count));

    setLoading(false);
  };

  const maxFunnel = Math.max(...funnel.map(f => f.count), 1);

  const handleExport = (type: 'csv' | 'pdf') => {
    const headers = ['Etape', 'Leads', 'Valeur estimee'];
    const rows = funnel.map(f => [f.stage, String(f.count), `${f.value} $`]);
    if (type === 'csv') exportToCsv('rapport_crm_pipeline', headers, rows);
    else exportToPdf('Rapport CRM Pipeline', headers, rows);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: T.textLight }}>{t("common.loading", "Chargement...")}</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 20 }}>
        <button onClick={() => handleExport('csv')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 6, border: `1px solid ${T.border}`, background: '#fff', color: T.textMid, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}><Download size={12} /> CSV</button>
        <button onClick={() => handleExport('pdf')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 6, border: `1px solid ${T.border}`, background: '#fff', color: T.textMid, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}><Download size={12} /> PDF</button>
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px', background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ background: `${T.main}12`, borderRadius: 8, padding: 8, color: T.main, display: 'flex' }}><GitBranch size={18} /></div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: T.text }}>{fmtNum(totalLeads)}</div>
          <div style={{ fontSize: 12, color: T.textLight }}>{t("report_crm.total_active_leads", "Total leads actifs")}</div>
        </div>
        <div style={{ flex: '1 1 200px', background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ background: `${T.green}18`, borderRadius: 8, padding: 8, color: T.green, display: 'flex' }}><Globe size={18} /></div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: T.text }}>{funnel.find(f => f.stage === 'Ferme Gagne')?.count || 0}</div>
          <div style={{ fontSize: 12, color: T.textLight }}>{t("report_crm.leads_won", "Leads gagnés")}</div>
        </div>
        <div style={{ flex: '1 1 200px', background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ background: `${T.red}18`, borderRadius: 8, padding: 8, color: T.red, display: 'flex' }}><Thermometer size={18} /></div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: T.text }}>{tempDist.find(t => t.temp === 'Chaud')?.count || 0}</div>
          <div style={{ fontSize: 12, color: T.textLight }}>{t("report_crm.hot_leads", "Leads chauds")}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ flex: '2 1 450px', background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>{t("report_crm.conversion_funnel", "Entonnoir de conversion")}</div>
          {funnel.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: T.textLight, fontSize: 13 }}>{t("report_crm.no_leads", "Aucun lead")}</div>
          ) : (
            funnel.map((f, i) => {
              const barWidth = (f.count / maxFunnel) * 100;
              const isWon = f.stage.includes('Gagne');
              const isLost = f.stage.includes('Perdu');
              return (
                <div key={f.stage} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{f.stage}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: isWon ? T.green : isLost ? T.red : T.main }}>{f.count} leads</span>
                  </div>
                  <div style={{ height: 24, background: '#f3f4f6', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ height: '100%', width: `${barWidth}%`, background: isWon ? T.green : isLost ? T.red : `${T.main}${90 - i * 10}`, borderRadius: 6, transition: 'width 0.6s', display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                      {barWidth > 15 && <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{fmtPct(barWidth)}</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>{t("report_crm.lead_temperature", "Température des leads")}</div>
            {tempDist.map((t, i) => (
              <div key={t.temp} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < tempDist.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.color }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{t.temp}</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{t.count}</span>
                <span style={{ fontSize: 11, color: T.textLight }}>{totalLeads > 0 ? fmtPct((t.count / totalLeads) * 100) : '0%'}</span>
              </div>
            ))}
          </div>

          <div style={{ background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>{t("report_crm.leads_by_source", "Leads par source")}</div>
            {sourceDist.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 16, color: T.textLight, fontSize: 13 }}>{t("common.no_data", "Aucune donnée")}</div>
            ) : (
              sourceDist.slice(0, 6).map((s, i) => (
                <div key={s.source} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < Math.min(sourceDist.length, 6) - 1 ? `1px solid ${T.border}` : 'none' }}>
                  <span style={{ fontSize: 13, color: T.text }}>{s.source}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.main }}>{s.count}</span>
                </div>
              ))
            )}
          </div>

          {conversions.length > 0 && (
            <div style={{ background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>{t("report_crm.conversion_rate", "Taux de conversion")}</div>
              {conversions.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < conversions.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                  <span style={{ fontSize: 11, color: T.textLight, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.from} → {c.to}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: c.rate > 50 ? T.green : c.rate > 20 ? T.orange : T.red }}>{fmtPct(c.rate)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
