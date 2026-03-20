export type FormState = {
  name: string;
  sku: string;
  category: string;
  formats: string[];
  formatsOther: string;
  unitsPalette: string;
  description: string;
  componentsCount: number;
  isActive: boolean;
  productImages: File[];
  exampleImages: File[];
  tdsFile: File | null;
  sdsA: boolean; sdsAFile: File | null;
  sdsB: boolean; sdsBFile: File | null;
  sdsC: boolean; sdsCFile: File | null;
};

export const emptyForm = (): FormState => ({
  name: "", sku: "", category: "Other", formats: [], formatsOther: "", unitsPalette: "",
  description: "", componentsCount: 1, isActive: true,
  productImages: [], exampleImages: [],
  tdsFile: null,
  sdsA: false, sdsAFile: null,
  sdsB: false, sdsBFile: null,
  sdsC: false, sdsCFile: null,
});

export const FORMAT_OPTIONS = ["2 GAL", "3 GAL", "5 GAL", "10 GAL", "15 GAL", "Kit Baril (55 gallons)", "Totes", "Autre"];

export const PARTIE_LABELS = ["A", "B", "C"];

export function countWords(str: string) {
  return str.trim() === "" ? 0 : str.trim().split(/\s+/).length;
}

export async function uploadFile(bucket: string, path: string, file: File): Promise<string> {
  const { supabase } = await import("../supabaseClient");
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
