import * as XLSX from 'xlsx';
import {
  RawImportRow,
  ColumnMapping,
  TYPE_SYNONYMS,
  REGION_SYNONYMS,
  ValidImportRow,
  InvalidImportRow,
} from './crmImportTypes';
import { LeadType, REGIONS } from '../crmTypes';

export function parseFile(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonRows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, {
          raw: false,
          defval: '',
        });
        const headers = jsonRows.length > 0 ? Object.keys(jsonRows[0]) : [];
        resolve({ headers, rows: jsonRows });
      } catch {
        reject(new Error("Impossible de lire le fichier. Assurez-vous que c'est un fichier Excel (.xlsx, .xls) ou CSV valide."));
      }
    };
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier.'));
    reader.readAsBinaryString(file);
  });
}

export function autoDetectMapping(headers: string[]): ColumnMapping {
  const normalize = (s: string) =>
    s.toLowerCase().trim()
      .replace(/[\s_\-.]+/g, '_')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const FIELD_ALIASES: Record<keyof ColumnMapping, string[]> = {
    company_name: ['company', 'entreprise', 'compagnie', 'nom_entreprise', 'company_name', 'societe', 'organisation', 'org', 'business'],
    contact_first_name: ['prenom', 'first_name', 'firstname', 'contact_prenom', 'first', 'given_name', 'contact_first', 'prénom'],
    contact_last_name: ['nom', 'last_name', 'lastname', 'contact_nom', 'last', 'surname', 'family_name', 'contact_last'],
    phone: ['phone', 'telephone', 'tel', 'mobile', 'cell', 'numero', 'contact_phone', 'phone_number', 'téléphone'],
    email: ['email', 'courriel', 'mail', 'e_mail', 'contact_email', 'email_address'],
    region: ['region', 'ville', 'city', 'zone', 'secteur', 'territory', 'area', 'province', 'location', 'ville_region', 'city_region'],
    type: ['type', 'type_client', 'client_type', 'categorie', 'category', 'segment', 'client_segment'],
  };

  const mapping: ColumnMapping = {
    company_name: '', contact_first_name: '', contact_last_name: '',
    phone: '', email: '', region: '', type: '',
  };

  for (const header of headers) {
    const normalizedHeader = normalize(header);
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (!mapping[field as keyof ColumnMapping] &&
          aliases.some(alias => normalizedHeader.includes(alias) || alias.includes(normalizedHeader))) {
        mapping[field as keyof ColumnMapping] = header;
        break;
      }
    }
  }

  return mapping;
}

export function processRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
): { valid: ValidImportRow[]; invalid: InvalidImportRow[] } {
  const valid: ValidImportRow[] = [];
  const invalid: InvalidImportRow[] = [];

  rows.forEach((row, index) => {
    const raw: RawImportRow = {
      rowIndex: index + 2,
      raw: row,
      company_name: mapping.company_name ? row[mapping.company_name]?.trim() : '',
      contact_first_name: mapping.contact_first_name ? row[mapping.contact_first_name]?.trim() : '',
      contact_last_name: mapping.contact_last_name ? row[mapping.contact_last_name]?.trim() : '',
      phone: mapping.phone ? row[mapping.phone]?.trim() : '',
      email: mapping.email ? row[mapping.email]?.trim() : '',
      region: mapping.region ? row[mapping.region]?.trim() : '',
      type: mapping.type ? row[mapping.type]?.trim() : '',
    };

    const errors: string[] = [];

    if (!raw.company_name) errors.push("Nom d'entreprise manquant");
    if (!raw.contact_first_name && !raw.contact_last_name) errors.push('Nom du contact manquant');
    if (raw.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.email)) {
      errors.push(`Email invalide: "${raw.email}"`);
    }

    if (errors.length > 0) {
      invalid.push({ ...raw, status: 'invalid', errors });
      return;
    }

    const typeRaw = (raw.type ?? '').toLowerCase().trim();
    const mappedType: LeadType = TYPE_SYNONYMS[typeRaw] ?? 'Installateur';

    const regionRaw = (raw.region ?? '').toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let mappedRegion = 'Rive-Nord';

    const regionMatch = REGIONS.find(r =>
      r.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === regionRaw
    );
    if (regionMatch) {
      mappedRegion = regionMatch;
    } else {
      for (const [key, value] of Object.entries(REGION_SYNONYMS)) {
        const normKey = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (regionRaw.includes(normKey) || normKey.includes(regionRaw)) {
          mappedRegion = value;
          break;
        }
      }
    }

    valid.push({ ...raw, status: 'valid', mappedType, mappedRegion });
  });

  return { valid, invalid };
}

export function detectDuplicates(
  validRows: ValidImportRow[],
  existingLeads: Array<{ id: string; company_name: string; stage: string; created_at: string }>,
): {
  unique: ValidImportRow[];
  duplicates: Array<ValidImportRow & { existingLeadId: string; existingLeadStage: string; existingLeadCreatedAt: string; decision: 'skip' | 'merge' }>;
} {
  const normalizeCompany = (s: string) =>
    s.toLowerCase().trim()
      .replace(/[\s\-.&,]+/g, ' ')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const existingMap = new Map(
    existingLeads.map(l => [normalizeCompany(l.company_name), l])
  );

  const unique: ValidImportRow[] = [];
  const duplicates: any[] = [];

  for (const row of validRows) {
    const normalizedCompany = normalizeCompany(row.company_name ?? '');
    const existing = existingMap.get(normalizedCompany);
    if (existing) {
      duplicates.push({
        ...row,
        status: 'duplicate',
        existingLeadId: existing.id,
        existingLeadStage: existing.stage,
        existingLeadCreatedAt: existing.created_at,
        decision: 'skip',
      });
    } else {
      unique.push(row);
    }
  }

  return { unique, duplicates };
}

export function distributeLeads<T>(
  leads: T[],
  slots: Array<{ profileId: string; count: number }>,
): Array<{ lead: T; profileId: string }> {
  const result: Array<{ lead: T; profileId: string }> = [];
  let leadIndex = 0;

  for (const slot of slots) {
    for (let i = 0; i < slot.count && leadIndex < leads.length; i++) {
      result.push({ lead: leads[leadIndex], profileId: slot.profileId });
      leadIndex++;
    }
  }

  while (leadIndex < leads.length && slots.length > 0) {
    result.push({ lead: leads[leadIndex], profileId: slots[0].profileId });
    leadIndex++;
  }

  return result;
}

export function downloadExcelTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Entreprise', 'Prénom', 'Nom', 'Téléphone', 'Email', 'Ville/Région', 'Type'],
    ['Époxy Pro Inc.', 'Jean', 'Tremblay', '514-555-1234', 'jean@epoxypro.ca', 'Montréal', 'Installateur'],
    ['Distribution XYZ', 'Marie', 'Gagnon', '450-555-5678', 'marie@xyz.ca', 'Rive-Sud', 'Distributeur'],
  ]);
  ws['!cols'] = [
    { wch: 25 }, { wch: 15 }, { wch: 15 },
    { wch: 18 }, { wch: 28 }, { wch: 18 }, { wch: 20 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leads CRM');
  XLSX.writeFile(wb, 'modele_import_crm_uniflex.xlsx');
}

export function downloadCSVTemplate() {
  const csv = [
    'Entreprise,Prénom,Nom,Téléphone,Email,Ville/Région,Type',
    'Époxy Pro Inc.,Jean,Tremblay,514-555-1234,jean@epoxypro.ca,Montréal,Installateur',
    'Distribution XYZ,Marie,Gagnon,450-555-5678,marie@xyz.ca,Rive-Sud,Distributeur',
  ].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modele_import_crm_uniflex.csv';
  a.click();
  URL.revokeObjectURL(url);
}
