export type SaleProductFile = {
  id: string;
  file_type: string;
  file_url: string;
  file_name: string;
};

export type SaleProductImage = {
  id: string;
  image_type: string;
  image_url: string;
  sort_order: number;
};

export const PRODUCT_CATEGORIES = ["Resin", "Resin Add-On", "Torginol Flakes", "Finish Coats", "Repair Kits", "Quartz Mixed Resin", "Other"] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export type SaleProduct = {
  id: string;
  name: string;
  sku: string;
  description: string;
  category: string;
  components_count: number;
  formats: string[];
  formats_other: string;
  units_per_pallet: number | null;
  is_active: boolean;
  created_at: string;
  images?: SaleProductImage[];
  files?: SaleProductFile[];
};
