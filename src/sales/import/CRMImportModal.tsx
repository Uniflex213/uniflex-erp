import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, Download, Check, X, AlertTriangle, ChevronRight, ChevronLeft,
  RefreshCw, FileSpreadsheet, Users, BarChart3,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useAuth, Profile } from '../../contexts/AuthContext';
import { useApp } from '../../AppContext';
import { STAGE_COLORS } from '../crmTypes';
import {
  ColumnMapping,
  ValidImportRow,
  InvalidImportRow,
  DuplicateImportRow,
  DistributionSlot,
} from './crmImportTypes';
import {
  parseFile,
  autoDetectMapping,
  processRows,
  detectDuplicates,
  distributeLeads,
  downloadExcelTemplate,
  downloadCSVTemplate,
} from './crmImportUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImported: (count: number) => void;
}

function initials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

const ROLE_COLORS: Record<string, string> = {
  god_admin: '#dc2626',
  admin: '#6366f1',
  vendeur: '#059669',
  manuf: '#d97706',
  magasin: '#0891b2',
};

const STEP_TITLES = [
  'Chargement du fichier',
  'Correspondance des colonnes',
  "Résultats de l'analyse",
  'Répartition des leads',
  'Import en cours',
];

const MAPPING_FIELDS: Array<{ key: keyof ColumnMapping; label: string; required: boolean }> = [
  { key: 'company_name', label: "Nom d'entreprise", required: true },
  { key: 'contact_first_name', label: 'Prénom contact', required: true },
  { key: 'contact_last_name', label: 'Nom contact', required: true },
  { key: 'phone', label: 'Téléphone', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'region', label: 'Région / Ville', required: false },
  { key: 'type', label: 'Type client', required: false },
];

export default function CRMImportModal({ isOpen, onClose, onImported }: Props) {
  const { profile, realProfile } = useAuth();
  const { reloadLeads } = useApp();
  const currentProfile = realProfile ?? profile;

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    company_name: '', contact_first_name: '', contact_last_name: '',
    phone: '', email: '', region: '', type: '',
  });
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [validRows, setValidRows] = useState<ValidImportRow[]>([]);
  const [invalidRows, setInvalidRows] = useState<InvalidImportRow[]>([]);
  const [duplicateRows, setDuplicateRows] = useState<DuplicateImportRow[]>([]);
  const [uniqueRows, setUniqueRows] = useState<ValidImportRow[]>([]);
  const [analysing, setAnalysing] = useState(false);
  const [activeTab, setActiveTab] = useState<'valid' | 'duplicates' | 'errors'>('valid');
  const [vendeurs, setVendeurs] = useState<Profile[]>([]);
  const [distribution, setDistribution] = useState<DistributionSlot[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; merged: number; errors: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1); setFile(null); setHeaders([]); setRawRows([]);
    setMapping({ company_name: '', contact_first_name: '', contact_last_name: '', phone: '', email: '', region: '', type: '' });
    setParsing(false); setParseError(null); setValidRows([]); setInvalidRows([]);
    setDuplicateRows([]); setUniqueRows([]); setVendeurs([]); setDistribution([]);
    setImporting(false); setImportProgress(0); setImportResult(null); setImportError(null);
    setShowCloseConfirm(false);
  }, [isOpen]);

  const handleFileSelected = useCallback(async (f: File) => {
    setFile(f); setParsing(true); setParseError(null);
    try {
      const { headers: h, rows } = await parseFile(f);
      setHeaders(h);
      setRawRows(rows);
      setMapping(autoDetectMapping(h));
    } catch (err: any) {
      setParseError(err.message);
      setFile(null);
    } finally {
      setParsing(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelected(f);
  }, [handleFileSelected]);

  const handleAnalyse = useCallback(async () => {
    setAnalysing(true);
    const { valid, invalid } = processRows(rawRows, mapping);
    setValidRows(valid); setInvalidRows(invalid);

    const { data: existingLeads } = await supabase
      .from('crm_leads')
      .select('id, company_name, stage, created_at')
      .eq('archived', false);

    const { unique, duplicates } = detectDuplicates(valid, existingLeads ?? []);
    setUniqueRows(unique);
    setDuplicateRows(duplicates as DuplicateImportRow[]);
    setActiveTab(unique.length > 0 ? 'valid' : duplicates.length > 0 ? 'duplicates' : 'errors');
    setAnalysing(false);
    setStep(3);
  }, [rawRows, mapping]);

  const loadVendeurs = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, seller_code, phone, job_title, avatar_url, team_id, username, is_active, is_suspended, suspended_until, suspension_reason, last_login_at, created_at')
      .eq('is_active', true)
      .in('role', ['vendeur', 'admin', 'god_admin'])
      .order('full_name');
    const profiles = (data ?? []) as Profile[];
    setVendeurs(profiles);
    const totalLeads = uniqueRows.length + duplicateRows.filter(d => d.decision === 'merge').length;
    const perPerson = profiles.length > 0 ? Math.floor(totalLeads / profiles.length) : 0;
    const remainder = profiles.length > 0 ? totalLeads % profiles.length : 0;
    setDistribution(profiles.map((p, i) => ({
      profileId: p.id,
      profileName: p.full_name,
      sellerCode: p.seller_code,
      avatarColor: ROLE_COLORS[p.role] ?? '#6577a8',
      count: perPerson + (i < remainder ? 1 : 0),
    })));
  }, [uniqueRows, duplicateRows]);

  useEffect(() => {
    if (step === 4) loadVendeurs();
  }, [step, loadVendeurs]);

  const totalLeadsToImport = uniqueRows.length + duplicateRows.filter(d => d.decision === 'merge').length;
  const totalAssigned = distribution.reduce((s, d) => s + d.count, 0);

  const handleImport = useCallback(async () => {
    if (!currentProfile) return;
    setImporting(true); setImportError(null); setImportProgress(0);

    try {
      const mergeRows = duplicateRows.filter(d => d.decision === 'merge');
      const assigned = distributeLeads(uniqueRows, distribution.filter(d => d.count > 0));

      const remaining = uniqueRows.length - assigned.length;
      const extraAssigned = uniqueRows.slice(assigned.length).map(lead => ({
        lead, profileId: currentProfile.id,
      }));
      const allAssigned = [...assigned, ...extraAssigned];
      void remaining;

      const now = new Date().toISOString();
      const leadsToInsert = allAssigned.map(({ lead, profileId }) => {
        const assignedVendeur = vendeurs.find(v => v.id === profileId) ?? currentProfile;
        return {
          company_name: lead.company_name ?? '',
          contact_first_name: lead.contact_first_name ?? '',
          contact_last_name: lead.contact_last_name ?? '',
          contact_title: '',
          phone: lead.phone ?? '',
          email: lead.email ?? '',
          website: '',
          address: '',
          region: lead.mappedRegion,
          postal_code: '',
          type: lead.mappedType,
          source: 'Autre',
          temperature: 'Cold',
          stage: 'Nouveau Lead',
          estimated_value: 0,
          monthly_volume: 0,
          products_interest: [],
          closing_probability: 10,
          annual_revenue_goal: 0,
          monthly_volume_goal: 0,
          notes: '',
          assigned_agent_id: assignedVendeur.id,
          assigned_agent_name: assignedVendeur.full_name,
          assigned_agent_initials: initials(assignedVendeur.full_name),
          assigned_agent_color: ROLE_COLORS[assignedVendeur.role] ?? '#6577a8',
          last_activity_at: now,
          archived: false,
          owner_id: profileId,
        };
      });

      const BATCH = 50;
      let inserted = 0;
      let insertErrors = 0;

      for (let i = 0; i < leadsToInsert.length; i += BATCH) {
        const batch = leadsToInsert.slice(i, i + BATCH);
        const { error } = await supabase.from('crm_leads').insert(batch);
        if (error) insertErrors += batch.length;
        else inserted += batch.length;
        setImportProgress(Math.round(((i + batch.length) / (leadsToInsert.length + mergeRows.length)) * 85));
      }

      let merged = 0;
      await Promise.all(mergeRows.map(async (row) => {
        const updates: Record<string, string> = {};
        if (row.phone) updates.phone = row.phone;
        if (row.email) updates.email = row.email;
        if (row.region) updates.region = row.region;
        await supabase.from('crm_leads').update({ ...updates, updated_at: now }).eq('id', row.existingLeadId);
        merged++;
      }));

      setImportProgress(100);
      setImportResult({
        imported: inserted,
        skipped: duplicateRows.filter(d => d.decision === 'skip').length,
        merged,
        errors: insertErrors,
      });

      await reloadLeads();
    } catch (err: any) {
      setImportError(err.message ?? 'Erreur lors de l\'import');
    } finally {
      setImporting(false);
    }
  }, [uniqueRows, duplicateRows, distribution, vendeurs, currentProfile, reloadLeads]);

  useEffect(() => {
    if (step === 5 && !importing && !importResult && !importError) {
      handleImport();
    }
  }, [step]);

  const handleClose = () => {
    if (step > 1 && !importResult) { setShowCloseConfirm(true); return; }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(230,228,224,0.85)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: 760, maxWidth: '96vw',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 12, color: '#8e8e93', fontWeight: 600, letterSpacing: 0.5 }}>
                ÉTAPE {step} / 5
              </span>
              <h2 style={{ margin: '2px 0 0', fontSize: 17, fontWeight: 700, color: '#1c1c1e' }}>
                {STEP_TITLES[step - 1]}
              </h2>
            </div>
            <button onClick={handleClose} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8,
              color: '#8e8e93', display: 'flex', alignItems: 'center',
            }}>
              <X size={20} />
            </button>
          </div>
          <div style={{ height: 3, background: '#f0f0f0', borderRadius: 2, marginBottom: 0 }}>
            <div style={{
              height: '100%', background: '#6366f1', borderRadius: 2,
              width: `${(step / 5) * 100}%`,
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {showCloseConfirm ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <AlertTriangle size={40} color="#d97706" style={{ marginBottom: 16 }} />
              <p style={{ fontSize: 16, fontWeight: 600, color: '#1c1c1e', margin: '0 0 8px' }}>
                Annuler l'import ?
              </p>
              <p style={{ fontSize: 14, color: '#636366', margin: '0 0 24px' }}>
                Votre progression sera perdue.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button onClick={() => setShowCloseConfirm(false)} style={btnOutline}>
                  Non, continuer
                </button>
                <button onClick={onClose} style={{ ...btnPrimary, background: '#dc2626' }}>
                  Oui, annuler
                </button>
              </div>
            </div>
          ) : step === 1 ? (
            <Step1
              file={file} parsing={parsing} parseError={parseError}
              rawRows={rawRows} isDragging={isDragging}
              fileInputRef={fileInputRef}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onFileSelected={handleFileSelected}
            />
          ) : step === 2 ? (
            <Step2
              headers={headers} mapping={mapping} rawRows={rawRows}
              onMappingChange={(k, v) => setMapping(prev => ({ ...prev, [k]: v }))}
            />
          ) : step === 3 ? (
            <Step3
              uniqueRows={uniqueRows} invalidRows={invalidRows}
              duplicateRows={duplicateRows} rawRows={rawRows}
              activeTab={activeTab} onTabChange={setActiveTab}
              onDuplicateDecision={(idx, decision) => {
                setDuplicateRows(prev => prev.map((r, i) => i === idx ? { ...r, decision } : r));
              }}
              onAllDuplicates={(decision) => {
                setDuplicateRows(prev => prev.map(r => ({ ...r, decision })));
              }}
            />
          ) : step === 4 ? (
            <Step4
              vendeurs={vendeurs} distribution={distribution}
              totalLeads={totalLeadsToImport}
              onDistChange={(profileId, count) => {
                setDistribution(prev => prev.map(d => d.profileId === profileId ? { ...d, count } : d));
              }}
              onEqualDistrib={() => {
                const n = vendeurs.length;
                if (!n) return;
                const per = Math.floor(totalLeadsToImport / n);
                const rem = totalLeadsToImport % n;
                setDistribution(prev => prev.map((d, i) => ({ ...d, count: per + (i < rem ? 1 : 0) })));
              }}
              onAssignSelf={() => {
                if (!currentProfile) return;
                setDistribution(prev => prev.map(d => ({
                  ...d, count: d.profileId === currentProfile.id ? totalLeadsToImport : 0,
                })));
              }}
              currentProfileId={currentProfile?.id ?? ''}
              totalAssigned={totalAssigned}
            />
          ) : (
            <Step5
              importing={importing}
              progress={importProgress}
              result={importResult}
              error={importError}
              onBack={() => { setStep(4); setImportResult(null); setImportError(null); }}
            />
          )}
        </div>

        {/* Footer */}
        {!showCloseConfirm && step !== 5 && (
          <div style={{
            padding: '16px 24px', borderTop: '1px solid #f0f0f0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexShrink: 0,
          }}>
            <button
              onClick={() => step > 1 ? setStep((step - 1) as any) : handleClose}
              style={btnOutline}
            >
              <ChevronLeft size={15} />
              {step === 1 ? 'Annuler' : 'Retour'}
            </button>

            {step === 1 && (
              <button
                disabled={!file || parsing || rawRows.length === 0}
                onClick={() => setStep(2)}
                style={{ ...btnPrimary, opacity: (!file || parsing || rawRows.length === 0) ? 0.45 : 1 }}
              >
                Continuer <ChevronRight size={15} />
              </button>
            )}
            {step === 2 && (
              <button
                disabled={analysing || !mapping.company_name}
                onClick={handleAnalyse}
                style={{ ...btnPrimary, opacity: analysing || !mapping.company_name ? 0.45 : 1 }}
              >
                {analysing ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                Analyser <ChevronRight size={15} />
              </button>
            )}
            {step === 3 && (
              <button onClick={() => setStep(4)} style={btnPrimary}>
                Répartition <ChevronRight size={15} />
              </button>
            )}
            {step === 4 && (
              <button
                disabled={totalAssigned > totalLeadsToImport}
                onClick={() => setStep(5)}
                style={{ ...btnPrimary, opacity: totalAssigned > totalLeadsToImport ? 0.45 : 1 }}
              >
                Importer <ChevronRight size={15} />
              </button>
            )}
          </div>
        )}

        {step === 5 && importResult && (
          <div style={{
            padding: '16px 24px', borderTop: '1px solid #f0f0f0',
            display: 'flex', justifyContent: 'flex-end', gap: 12, flexShrink: 0,
          }}>
            <button onClick={() => { onImported(importResult.imported); onClose(); }} style={btnOutline}>
              Fermer
            </button>
            <button onClick={() => { onImported(importResult.imported); onClose(); }} style={btnPrimary}>
              Voir le pipeline <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── STEP 1 ───────────────────────────────────────────────────────────────────

function Step1({ file, parsing, parseError, rawRows, isDragging, fileInputRef, onDrop, onDragOver, onDragLeave, onFileSelected }: {
  file: File | null; parsing: boolean; parseError: string | null;
  rawRows: Record<string, string>[]; isDragging: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onFileSelected: (f: File) => void;
}) {
  return (
    <div>
      <div
        onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? '#6366f1' : '#d1d5db'}`,
          borderRadius: 12, padding: '40px 24px', textAlign: 'center',
          cursor: 'pointer', background: isDragging ? 'rgba(99,102,241,0.04)' : '#fafafa',
          transition: 'all 0.2s',
        }}
      >
        <Upload size={48} color="#6366f1" style={{ marginBottom: 12 }} />
        <p style={{ fontSize: 16, fontWeight: 600, color: '#1c1c1e', margin: '0 0 6px' }}>
          Glissez votre fichier Excel ou CSV ici
        </p>
        <p style={{ fontSize: 13, color: '#8e8e93', margin: '0 0 16px' }}>
          Formats acceptés: .xlsx, .xls, .csv — Max 10 MB
        </p>
        <span style={{
          display: 'inline-block', padding: '8px 20px', borderRadius: 8,
          border: '1px solid #d1d5db', background: '#fff',
          fontSize: 13, fontWeight: 600, color: '#1c1c1e',
        }}>
          Ou choisir un fichier
        </span>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onFileSelected(f); }}
        />
      </div>

      {parsing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, color: '#636366' }}>
          <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 13 }}>Lecture du fichier...</span>
        </div>
      )}

      {parseError && (
        <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertTriangle size={16} color="#dc2626" />
          <span style={{ fontSize: 13, color: '#dc2626' }}>{parseError}</span>
        </div>
      )}

      {file && rawRows.length > 0 && (
        <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', gap: 8, alignItems: 'center' }}>
          <Check size={16} color="#059669" />
          <span style={{ fontSize: 13, color: '#059669', fontWeight: 600 }}>
            {file.name} — {rawRows.length} ligne{rawRows.length !== 1 ? 's' : ''} détectée{rawRows.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div style={{ marginTop: 24, padding: '16px', borderRadius: 10, background: '#f8f9fb', border: '1px solid #e8eaed' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#636366', margin: '0 0 10px' }}>
          Télécharger un modèle
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={(e) => { e.stopPropagation(); downloadExcelTemplate(); }} style={btnOutline}>
            <FileSpreadsheet size={14} />
            Modèle Excel
          </button>
          <button onClick={(e) => { e.stopPropagation(); downloadCSVTemplate(); }} style={btnOutline}>
            <Download size={14} />
            Modèle CSV
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── STEP 2 ───────────────────────────────────────────────────────────────────

function Step2({ headers, mapping, rawRows, onMappingChange }: {
  headers: string[]; mapping: ColumnMapping;
  rawRows: Record<string, string>[];
  onMappingChange: (key: keyof ColumnMapping, value: string) => void;
}) {
  const preview = rawRows.slice(0, 3);
  const firstRow = rawRows[0];

  return (
    <div>
      {preview.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#636366', margin: '0 0 8px' }}>
            Aperçu du fichier (3 premières lignes)
          </p>
          <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e8eaed' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8f9fb' }}>
                  {headers.map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#636366', fontWeight: 600, borderBottom: '1px solid #e8eaed', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    {headers.map(h => (
                      <td key={h} style={{ padding: '7px 12px', color: '#1c1c1e', whiteSpace: 'nowrap', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row[h] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p style={{ fontSize: 13, fontWeight: 600, color: '#636366', margin: '0 0 12px' }}>
        Correspondance des colonnes
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {MAPPING_FIELDS.map(({ key, label, required }) => {
          const mapped = mapping[key];
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 180, flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#1c1c1e' }}>
                  {label}{required && <span style={{ color: '#dc2626' }}> *</span>}
                </span>
              </div>
              <select
                value={mapped}
                onChange={e => onMappingChange(key, e.target.value)}
                style={{
                  flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid #d1d5db',
                  fontSize: 13, background: '#fff', color: '#1c1c1e', fontFamily: 'inherit',
                }}
              >
                <option value="">— Ne pas importer —</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <div style={{ width: 90, textAlign: 'right' }}>
                {mapped ? (
                  <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>✓ Détecté</span>
                ) : (
                  <span style={{ fontSize: 11, color: required ? '#d97706' : '#8e8e93', fontWeight: 600 }}>
                    {required ? '⚠ Requis' : '—'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {firstRow && mapping.company_name && (
        <div style={{ marginTop: 20, padding: '14px', borderRadius: 10, background: '#f0f4ff', border: '1px solid #c7d2fe' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', margin: '0 0 8px' }}>
            Aperçu de la 1ère ligne avec votre correspondance
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {MAPPING_FIELDS.filter(f => mapping[f.key]).map(({ key, label }) => (
              <div key={key}>
                <span style={{ fontSize: 11, color: '#6577a8' }}>{label}</span>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#1c1c1e' }}>
                  {firstRow[mapping[key]] || '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STEP 3 ───────────────────────────────────────────────────────────────────

function Step3({ uniqueRows, invalidRows, duplicateRows, rawRows, activeTab, onTabChange, onDuplicateDecision, onAllDuplicates }: {
  uniqueRows: ValidImportRow[]; invalidRows: InvalidImportRow[];
  duplicateRows: DuplicateImportRow[]; rawRows: Record<string, string>[];
  activeTab: 'valid' | 'duplicates' | 'errors';
  onTabChange: (t: 'valid' | 'duplicates' | 'errors') => void;
  onDuplicateDecision: (idx: number, d: 'skip' | 'merge') => void;
  onAllDuplicates: (d: 'skip' | 'merge') => void;
}) {
  const tabs: Array<{ id: 'valid' | 'duplicates' | 'errors'; label: string; count: number; color: string }> = [
    { id: 'valid', label: 'Valides', count: uniqueRows.length, color: '#059669' },
    { id: 'duplicates', label: 'Doublons', count: duplicateRows.length, color: '#d97706' },
    { id: 'errors', label: 'Erreurs', count: invalidRows.length, color: '#dc2626' },
  ];

  return (
    <div>
      {/* KPI bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Prêts à importer', value: uniqueRows.length, color: '#059669', bg: '#f0fdf4' },
          { label: 'Doublons', value: duplicateRows.length, color: '#d97706', bg: '#fffbeb' },
          { label: 'Impossibles', value: invalidRows.length, color: '#dc2626', bg: '#fef2f2' },
          { label: 'Total lu', value: rawRows.length, color: '#636366', bg: '#f8f9fb' },
        ].map(kpi => (
          <div key={kpi.label} style={{ padding: '14px', borderRadius: 10, background: kpi.bg, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: kpi.color, fontWeight: 500, marginTop: 2 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #e8eaed' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => onTabChange(t.id)} style={{
            padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
            color: activeTab === t.id ? t.color : '#8e8e93',
            borderBottom: activeTab === t.id ? `2px solid ${t.color}` : '2px solid transparent',
            marginBottom: -1,
          }}>
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {activeTab === 'valid' && (
        <div style={{ maxHeight: 320, overflowY: 'auto', borderRadius: 8, border: '1px solid #e8eaed' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f8f9fb' }}>
              <tr>
                {['Entreprise', 'Contact', 'Téléphone', 'Email', 'Région', 'Type'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#636366', fontWeight: 600, borderBottom: '1px solid #e8eaed' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {uniqueRows.slice(0, 10).map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={tdStyle}>{r.company_name}</td>
                  <td style={tdStyle}>{[r.contact_first_name, r.contact_last_name].filter(Boolean).join(' ')}</td>
                  <td style={tdStyle}>{r.phone || '—'}</td>
                  <td style={tdStyle}>{r.email || '—'}</td>
                  <td style={tdStyle}>{r.mappedRegion}</td>
                  <td style={tdStyle}>{r.mappedType}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {uniqueRows.length > 10 && (
            <div style={{ padding: '8px 12px', fontSize: 12, color: '#8e8e93', textAlign: 'center' }}>
              et {uniqueRows.length - 10} autre{uniqueRows.length - 10 > 1 ? 's' : ''}...
            </div>
          )}
        </div>
      )}

      {activeTab === 'duplicates' && duplicateRows.length > 0 && (
        <div>
          <p style={{ fontSize: 13, color: '#636366', margin: '0 0 10px' }}>
            Ces entreprises existent déjà dans votre CRM. Choisissez l'action pour chacune.
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button onClick={() => onAllDuplicates('skip')} style={{ ...btnOutline, fontSize: 12 }}>
              Tout ignorer
            </button>
            <button onClick={() => onAllDuplicates('merge')} style={{ ...btnOutline, fontSize: 12 }}>
              Tout fusionner
            </button>
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto', borderRadius: 8, border: '1px solid #e8eaed' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8f9fb' }}>
                <tr>
                  {['Entreprise', 'Contact', 'Étape actuelle', 'Date création', 'Action'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#636366', fontWeight: 600, borderBottom: '1px solid #e8eaed' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {duplicateRows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={tdStyle}>{r.company_name}</td>
                    <td style={tdStyle}>{[r.contact_first_name, r.contact_last_name].filter(Boolean).join(' ')}</td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                        color: STAGE_COLORS[r.existingLeadStage as keyof typeof STAGE_COLORS] ?? '#636366',
                        background: `${STAGE_COLORS[r.existingLeadStage as keyof typeof STAGE_COLORS]}22`,
                      }}>
                        {r.existingLeadStage}
                      </span>
                    </td>
                    <td style={tdStyle}>{new Date(r.existingLeadCreatedAt).toLocaleDateString('fr-CA')}</td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {(['skip', 'merge'] as const).map(d => (
                          <button key={d} onClick={() => onDuplicateDecision(i, d)} style={{
                            padding: '4px 10px', borderRadius: 6, border: `1px solid ${r.decision === d ? '#6366f1' : '#d1d5db'}`,
                            background: r.decision === d ? '#6366f1' : '#fff',
                            color: r.decision === d ? '#fff' : '#636366',
                            fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                          }}>
                            {d === 'skip' ? 'Ignorer' : 'Fusionner'}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'errors' && invalidRows.length > 0 && (
        <div>
          <div style={{ maxHeight: 320, overflowY: 'auto', borderRadius: 8, border: '1px solid #e8eaed' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8f9fb' }}>
                <tr>
                  {['Ligne #', 'Données brutes', 'Raisons'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#636366', fontWeight: 600, borderBottom: '1px solid #e8eaed' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invalidRows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={tdStyle}>{r.rowIndex}</td>
                    <td style={tdStyle}>
                      {Object.values(r.raw).slice(0, 3).filter(Boolean).join(' | ') || '—'}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {r.errors.map((err, ei) => (
                          <span key={ei} style={{
                            display: 'inline-block', padding: '2px 7px', borderRadius: 10,
                            background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 500,
                          }}>{err}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 12, color: '#8e8e93', marginTop: 10 }}>
            Ces contacts ne seront pas importés. Corrigez le fichier source et réimportez.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── STEP 4 ───────────────────────────────────────────────────────────────────

function Step4({ vendeurs, distribution, totalLeads, onDistChange, onEqualDistrib, onAssignSelf, currentProfileId, totalAssigned }: {
  vendeurs: Profile[]; distribution: DistributionSlot[]; totalLeads: number;
  onDistChange: (profileId: string, count: number) => void;
  onEqualDistrib: () => void; onAssignSelf: () => void;
  currentProfileId: string; totalAssigned: number;
}) {
  const remaining = totalLeads - totalAssigned;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1c1c1e' }}>
            {totalLeads} lead{totalLeads !== 1 ? 's' : ''} à distribuer
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onEqualDistrib} style={{ ...btnOutline, fontSize: 12 }}>
            <Users size={13} /> Répartir également
          </button>
          <button onClick={onAssignSelf} style={{ ...btnOutline, fontSize: 12 }}>
            <BarChart3 size={13} /> Tout à moi
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {distribution.map(slot => (
          <div key={slot.profileId} style={{
            padding: '12px 16px', borderRadius: 10, border: '1px solid #e8eaed', background: '#fafafa',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: slot.avatarColor, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, flexShrink: 0,
              }}>
                {slot.profileName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1c1c1e' }}>
                  {slot.profileName}
                  {slot.profileId === currentProfileId && (
                    <span style={{ marginLeft: 6, fontSize: 11, color: '#6366f1' }}>(vous)</span>
                  )}
                </p>
                {slot.sellerCode && (
                  <p style={{ margin: 0, fontSize: 11, color: '#8e8e93' }}>Code: {slot.sellerCode}</p>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => onDistChange(slot.profileId, Math.max(0, slot.count - 1))} style={stepperBtn}>−</button>
                <input
                  type="number" min={0} max={totalLeads}
                  value={slot.count}
                  onChange={e => onDistChange(slot.profileId, Math.max(0, parseInt(e.target.value) || 0))}
                  style={{ width: 52, textAlign: 'center', padding: '4px 0', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, fontWeight: 600, fontFamily: 'inherit' }}
                />
                <button onClick={() => onDistChange(slot.profileId, slot.count + 1)} style={stepperBtn}>+</button>
              </div>
            </div>
            {totalLeads > 0 && (
              <div style={{ marginTop: 8, height: 4, background: '#e8eaed', borderRadius: 2 }}>
                <div style={{
                  height: '100%', background: slot.avatarColor, borderRadius: 2,
                  width: `${Math.min(100, (slot.count / totalLeads) * 100)}%`,
                  transition: 'width 0.2s',
                }} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{
        padding: '12px 16px', borderRadius: 10, border: `1px solid ${totalAssigned > totalLeads ? '#fecaca' : remaining > 0 ? '#fed7aa' : '#bbf7d0'}`,
        background: totalAssigned > totalLeads ? '#fef2f2' : remaining > 0 ? '#fffbeb' : '#f0fdf4',
      }}>
        {totalAssigned > totalLeads ? (
          <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
            Vous avez dépassé le total disponible de {totalAssigned - totalLeads} lead{totalAssigned - totalLeads > 1 ? 's' : ''}
          </span>
        ) : remaining > 0 ? (
          <span style={{ fontSize: 13, color: '#d97706', fontWeight: 500 }}>
            Il reste {remaining} lead{remaining > 1 ? 's' : ''} non assigné{remaining > 1 ? 's' : ''} — ils seront attribués à votre compte
          </span>
        ) : (
          <span style={{ fontSize: 13, color: '#059669', fontWeight: 600 }}>
            ✓ Tous les leads sont répartis — Assignés: {totalAssigned} / {totalLeads}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── STEP 5 ───────────────────────────────────────────────────────────────────

function Step5({ importing, progress, result, error, onBack }: {
  importing: boolean; progress: number;
  result: { imported: number; skipped: number; merged: number; errors: number } | null;
  error: string | null; onBack: () => void;
}) {
  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <X size={48} color="#dc2626" style={{ marginBottom: 16 }} />
        <p style={{ fontSize: 16, fontWeight: 700, color: '#1c1c1e', margin: '0 0 8px' }}>Erreur lors de l'import</p>
        <p style={{ fontSize: 13, color: '#dc2626', margin: '0 0 24px', padding: '10px 16px', background: '#fef2f2', borderRadius: 8 }}>{error}</p>
        <button onClick={onBack} style={btnOutline}><ChevronLeft size={15} /> Retour</button>
      </div>
    );
  }

  if (importing || (!result && !error)) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <RefreshCw size={40} color="#6366f1" style={{ animation: 'spin 1s linear infinite', marginBottom: 16 }} />
        <p style={{ fontSize: 16, fontWeight: 600, color: '#1c1c1e', margin: '0 0 20px' }}>Import en cours...</p>
        <div style={{ maxWidth: 400, margin: '0 auto' }}>
          <div style={{ height: 8, background: '#e8eaed', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: 'linear-gradient(90deg,#6366f1,#6577a8)',
              borderRadius: 4, width: `${progress}%`, transition: 'width 0.3s ease',
            }} />
          </div>
          <p style={{ fontSize: 13, color: '#8e8e93', marginTop: 8 }}>{progress}%</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', background: '#f0fdf4',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
        }}>
          <Check size={36} color="#059669" />
        </div>
        <p style={{ fontSize: 18, fontWeight: 800, color: '#1c1c1e', margin: '0 0 6px' }}>Import terminé avec succès</p>
        <p style={{ fontSize: 14, color: '#8e8e93', margin: '0 0 28px' }}>Les leads ont été ajoutés au pipeline CRM</p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { label: 'Leads créés', value: result.imported, color: '#059669', bg: '#f0fdf4' },
            { label: 'Fusionnés', value: result.merged, color: '#6366f1', bg: '#f0f4ff' },
            { label: 'Ignorés', value: result.skipped, color: '#636366', bg: '#f8f9fb' },
            ...(result.errors > 0 ? [{ label: 'Erreurs', value: result.errors, color: '#dc2626', bg: '#fef2f2' }] : []),
          ].map(stat => (
            <div key={stat.label} style={{ padding: '16px 24px', borderRadius: 12, background: stat.bg, textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: stat.color, fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

// ─── SHARED STYLES ────────────────────────────────────────────────────────────

const btnPrimary: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '9px 20px', borderRadius: 8, border: 'none',
  background: '#6366f1', color: '#fff',
  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
};

const btnOutline: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '9px 16px', borderRadius: 8, border: '1px solid #d1d5db',
  background: '#fff', color: '#1c1c1e',
  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
};

const stepperBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6, border: '1px solid #d1d5db',
  background: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#1c1c1e', fontFamily: 'inherit',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px', color: '#1c1c1e',
  maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};
