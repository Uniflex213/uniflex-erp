import { Stage, LeadType } from '../crmTypes';

export interface RawImportRow {
  rowIndex: number;
  raw: Record<string, string>;
  company_name?: string;
  contact_first_name?: string;
  contact_last_name?: string;
  phone?: string;
  email?: string;
  region?: string;
  city?: string;
  type?: string;
}

export interface ValidImportRow extends RawImportRow {
  status: 'valid';
  mappedType: LeadType;
  mappedRegion: string;
}

export interface InvalidImportRow extends RawImportRow {
  status: 'invalid';
  errors: string[];
}

export interface DuplicateImportRow extends RawImportRow {
  status: 'duplicate';
  existingLeadId: string;
  existingLeadStage: Stage;
  existingLeadCreatedAt: string;
  decision?: 'skip' | 'merge';
}

export type ImportRow = ValidImportRow | InvalidImportRow | DuplicateImportRow;

export interface DistributionSlot {
  profileId: string;
  profileName: string;
  sellerCode: string | null;
  avatarColor: string;
  count: number;
}

export interface ColumnMapping {
  company_name: string;
  contact_first_name: string;
  contact_last_name: string;
  phone: string;
  email: string;
  region: string;
  type: string;
}

export const TYPE_SYNONYMS: Record<string, LeadType> = {
  'installateur': 'Installateur',
  'install': 'Installateur',
  'installer': 'Installateur',
  'distributeur': 'Distributeur',
  'distributor': 'Distributeur',
  'distrib': 'Distributeur',
  'large scale': 'Large Scale',
  'large': 'Large Scale',
  'largescale': 'Large Scale',
  'entreprise': 'Installateur',
};

export const REGION_SYNONYMS: Record<string, string> = {
  'montreal': 'Montréal',
  'montréal': 'Montréal',
  'mtl': 'Montréal',
  'quebec': 'Québec',
  'québec': 'Québec',
  'qc': 'Québec',
  'laval': 'Laval',
  'rive-sud': 'Rive-Sud',
  'rive sud': 'Rive-Sud',
  'brossard': 'Rive-Sud',
  'longueuil': 'Rive-Sud',
  'rive-nord': 'Rive-Nord',
  'rive nord': 'Rive-Nord',
  'boisbriand': 'Rive-Nord',
  'outaouais': 'Outaouais',
  'gatineau': 'Outaouais',
  'estrie': 'Estrie',
  'sherbrooke': 'Estrie',
  'ontario': 'Ontario',
  'on': 'Ontario',
};
