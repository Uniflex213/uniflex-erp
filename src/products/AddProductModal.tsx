import React, { useState } from "react";
import { SaleProduct, SaleProductImage, SaleProductFile } from "../sales/productTypes";
import { supabase } from "../supabaseClient";
import { T } from "../theme";
import { CloseIcon } from "./productIcons";
import { FormState, emptyForm, uploadFile } from "./productFormTypes";
import ProductFormBody from "./ProductFormBody";

export default function AddProductModal({ onClose, onSave }: { onClose: () => void; onSave: (p: SaleProduct) => void }) {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const unitsPallet = form.unitsPalette !== "" ? parseInt(form.unitsPalette, 10) : null;
      const { data: product, error: insertError } = await supabase
        .from("sale_products")
        .insert({
          name: form.name.trim(),
          sku: form.sku.trim(),
          description: form.description.trim(),
          components_count: form.componentsCount,
          formats: form.formats,
          formats_other: form.formatsOther,
          units_per_pallet: isNaN(unitsPallet as number) ? null : unitsPallet,
          is_active: form.isActive,
        })
        .select()
        .single();

      if (insertError || !product) throw new Error(insertError?.message || "Erreur lors de la création");

      const pid = product.id as string;
      const images: SaleProductImage[] = [];
      const files: SaleProductFile[] = [];

      if (form.productImages[0]) {
        const ext = form.productImages[0].name.split(".").pop();
        const url = await uploadFile("product-images", `${pid}/main.${ext}`, form.productImages[0]);
        const { data: imgRow } = await supabase.from("sale_product_images").insert({ product_id: pid, image_type: "main", image_url: url, sort_order: 0 }).select().single();
        if (imgRow) images.push(imgRow as SaleProductImage);
      }

      for (let i = 0; i < form.exampleImages.length; i++) {
        const ext = form.exampleImages[i].name.split(".").pop();
        const url = await uploadFile("product-images", `${pid}/example-${i}.${ext}`, form.exampleImages[i]);
        const { data: imgRow } = await supabase.from("sale_product_images").insert({ product_id: pid, image_type: "example", image_url: url, sort_order: i }).select().single();
        if (imgRow) images.push(imgRow as SaleProductImage);
      }

      const pdfUploads: Array<{ file: File; type: string }> = [];
      if (form.tdsFile) pdfUploads.push({ file: form.tdsFile, type: "TDS" });
      if (form.sdsA && form.sdsAFile) pdfUploads.push({ file: form.sdsAFile, type: "SDS-A" });
      if (form.sdsB && form.sdsBFile) pdfUploads.push({ file: form.sdsBFile, type: "SDS-B" });
      if (form.sdsC && form.sdsCFile) pdfUploads.push({ file: form.sdsCFile, type: "SDS-C" });

      for (const { file, type } of pdfUploads) {
        const url = await uploadFile("product-files", `${pid}/${type}-${file.name}`, file);
        const { data: fileRow } = await supabase.from("sale_product_files").insert({ product_id: pid, file_type: type, file_url: url, file_name: file.name }).select().single();
        if (fileRow) files.push(fileRow as SaleProductFile);
      }

      const newProduct: SaleProduct = {
        id: pid,
        name: product.name,
        sku: product.sku || "",
        description: product.description,
        components_count: product.components_count,
        formats: product.formats || [],
        formats_other: product.formats_other || "",
        units_per_pallet: product.units_per_pallet ?? null,
        is_active: product.is_active,
        created_at: product.created_at,
        images,
        files,
      };
      onSave(newProduct);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      setSaving(false);
    }
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "32px 16px", overflowY: "auto",
      }}
    >
      <div style={{
        background: T.card, borderRadius: 14, width: "100%", maxWidth: 560,
        boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
        display: "flex", flexDirection: "column",
        maxHeight: "calc(100vh - 64px)",
      }}>
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>Ajouter un produit</div>
            <div style={{ fontSize: 12, color: T.textMid, marginTop: 2 }}>Remplissez les informations du nouveau produit</div>
          </div>
          <button onClick={onClose} style={{ background: T.cardAlt, border: `1px solid ${T.silverLight}`, borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.textMid }}>
            <CloseIcon />
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          <ProductFormBody form={form} setForm={setForm} />
        </div>

        <div style={{ padding: "16px 24px", borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
          {error && (
            <div style={{ marginBottom: 12, padding: "8px 12px", background: T.redBg, border: `1px solid ${T.red}`, borderRadius: 7, fontSize: 12, color: T.red }}>
              {error}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              onClick={onClose}
              style={{
                padding: "10px 20px", background: T.cardAlt, border: `1px solid ${T.silverLight}`,
                borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: T.textMid, fontFamily: "inherit",
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              style={{
                padding: "10px 24px", background: T.main, border: "none",
                borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving || !form.name.trim() ? "not-allowed" : "pointer", color: "#fff", fontFamily: "inherit",
                opacity: saving || !form.name.trim() ? 0.6 : 1, transition: "opacity 0.15s",
              }}
            >
              {saving ? "Enregistrement..." : "Enregistrer le produit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
