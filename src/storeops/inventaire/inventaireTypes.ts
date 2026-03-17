export interface InventaireProduct {
  id: string;
  name: string;
  sku: string;
  description: string;
  formats: string[];
  is_active: boolean;
  units_per_pallet: number | null;
  stock_qty: number;
  min_stock: number;
  cost_price: number;
  reserved_qty: number;
  available_qty: number;
  last_movement_at: string | null;
  last_reception_at: string | null;
}

export type MovementType =
  | 'reception'
  | 'pickup_out'
  | 'reservation'
  | 'release'
  | 'adjustment_plus'
  | 'adjustment_minus'
  | 'physical_inventory'
  | 'return'
  | 'damaged';

export interface StockMovement {
  id: string;
  product_id: string;
  product_name: string;
  movement_type: MovementType;
  quantity: number;
  stock_before: number;
  stock_after: number;
  reference_type: string;
  reference_id: string;
  reference_number: string;
  reason: string;
  agent_name: string;
  store_code: string;
  notes: string;
  created_at: string;
}

export interface StockReception {
  id: string;
  reception_number: string;
  store_code: string;
  received_at: string;
  supplier: string;
  delivery_note_number: string;
  carrier: string;
  tracking_number: string;
  received_by: string;
  notes: string;
  status: 'draft' | 'confirmed';
  total_units: number;
  total_units_ok: number;
  total_units_damaged: number;
  confirmed_at: string | null;
  created_at: string;
  items?: StockReceptionItem[];
}

export interface StockReceptionItem {
  id?: string;
  tempId?: string;
  reception_id?: string;
  product_id: string | null;
  product_name: string;
  quantity_received: number;
  format: string;
  batch_number: string;
  condition: 'good' | 'damaged_partial' | 'damaged_total';
  quantity_damaged: number;
  damage_description: string;
  quantity_ok: number;
  sort_order: number;
}

export interface PhysicalInventory {
  id: string;
  inventory_number: string;
  store_code: string;
  started_at: string;
  completed_at: string | null;
  status: 'in_progress' | 'completed';
  started_by: string;
  completed_by: string;
  total_products: number;
  products_with_discrepancy: number;
  total_discrepancy_value: number;
  notes: string;
}

export interface PhysicalInventoryItem {
  id?: string;
  inventory_id?: string;
  product_id: string | null;
  product_name: string;
  stock_system: number;
  stock_counted: number | null;
  discrepancy: number | null;
  cost_price: number;
  discrepancy_value: number | null;
  notes: string;
  sort_order: number;
}

export type StockStatus = 'in_stock' | 'ok' | 'low' | 'out_of_stock';

export function getStockStatus(product: InventaireProduct): StockStatus {
  if (product.stock_qty === 0) return 'out_of_stock';
  if (product.min_stock > 0 && product.stock_qty <= product.min_stock) return 'low';
  if (product.min_stock > 0 && product.stock_qty <= product.min_stock * 2) return 'ok';
  return 'in_stock';
}

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  in_stock: 'En stock',
  ok: 'Stock correct',
  low: 'Stock bas',
  out_of_stock: 'Rupture',
};

export const STOCK_STATUS_COLORS: Record<StockStatus, { bg: string; color: string; rowBg?: string }> = {
  in_stock: { bg: '#d1f5db', color: '#16a34a' },
  ok: { bg: '#d1fae5', color: '#059669' },
  low: { bg: '#fff3d4', color: '#d97706', rowBg: '#fffdf0' },
  out_of_stock: { bg: '#ffe5e3', color: '#dc2626', rowBg: '#fff8f8' },
};

export const ADJUSTMENT_REASONS = [
  'Erreur de comptage',
  'Casse / Perte',
  'Vol',
  'Retour fournisseur',
  'Retour client',
  'Échantillon',
  'Ajustement après inventaire physique',
  'Autre',
];

export const CARRIERS = [
  'LTL Freight',
  'Purolator',
  'UPS',
  'FedEx',
  'Livraison SCI directe',
  'Autre',
];

export const MOVEMENT_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; sign: string }> = {
  reception:          { label: 'ENTRÉE',        color: '#16a34a', bg: '#d1f5db', sign: '+' },
  pickup_out:         { label: 'SORTIE PICKUP', color: '#dc2626', bg: '#ffe5e3', sign: '-' },
  reservation:        { label: 'RÉSERVATION',   color: '#d97706', bg: '#fff3d4', sign: '~' },
  release:            { label: 'LIBÉRATION',    color: '#2563eb', bg: '#dbeafe', sign: '~' },
  adjustment_plus:    { label: 'AJUST. +',      color: '#2563eb', bg: '#dbeafe', sign: '+' },
  adjustment_minus:   { label: 'AJUST. -',      color: '#dc2626', bg: '#ffe5e3', sign: '-' },
  physical_inventory: { label: 'INV. PHYSIQUE', color: '#6b7280', bg: '#f3f4f6', sign: '±' },
  return:             { label: 'RETOUR',        color: '#16a34a', bg: '#d1f5db', sign: '+' },
  damaged:            { label: 'ENDOMMAGÉ',     color: '#dc2626', bg: '#ffe5e3', sign: '-' },
};

// STORE_CODE / STORE_NAME removed — now dynamic from AuthContext (useAuth().storeCode)
