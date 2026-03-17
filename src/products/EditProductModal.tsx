import React, { useState } from "react";
import { SaleProduct, SaleProductImage, SaleProductFile } from "../sales/productTypes";
import { supabase } from "../supabaseClient";
import { T } from "../theme";
import { CloseIcon, TrashIcon } from "./productIcons";
import { FormState, FORMAT_OPTIONS, countWords, uploadFile } from "./productFormTypes";
import { FileUploadZone, ExistingFileRow, ImageUploadZone, ExistingImageThumbs, Checkbox, inputStyle } from "./ProductFormHelpers";

type DeleteStep = "none" | "confirm1" | "confirm2";

export default function EditProductModal({
  product, onClose, onSave, onDelete,
}: {
  product: SaleProduct;
  onClose: () => void;
  onSave: (p: SaleProduct) => void;
  onDelete: (id: string) => void;
}) {
  const [form, setForm] = useState<FormState>(() => ({
    name: product.name,
    sku: product.sku || "",
    formats: product.formats,
    formatsOther: product.formats_other || "",
    unitsPalette: product.units_per_pallet != null ? String(product.units_per_pallet) : "",
    description: product.description || "",
    componentsCount: product.components_count,
    isActive: product.is_active,
    productImages: [],
    exampleImages: [],
    tdsFile: null,
    sdsA: !!(product.files?.find(f => f.file_type === "SDS-A")),
    sdsAFile: null,
    sdsB: !!(product.files?.find(f => f.file_type === "SDS-B")),
    sdsBFile: null,
    sdsC: !!(product.files?.find(f => f.file_type === "SDS-C")),
    sdsCFile: null,
  }));

  const [existingMainImages, setExistingMainImages] = useState<SaleProductImage[]>(
    product.images?.filter(i => i.image_type === "main") ?? []
  );
  const [existingExampleImages, setExistingExampleImages] = useState<SaleProductImage[]>(
    product.images?.filter(i => i.image_type === "example") ?? []
  );
  const existingTds = product.files?.find(f => f.file_type === "TDS");
  const [keepTds, setKeepTds] = useState(!!existingTds);
  const existingSdsA = product.files?.find(f => f.file_type === "SDS-A");
  const [keepSdsA, setKeepSdsA] = useState(!!existingSdsA);
  const existingSdsB = product.files?.find(f => f.file_type === "SDS-B");
  const [keepSdsB, setKeepSdsB] = useState(!!existingSdsB);
  const existingSdsC = product.files?.find(f => f.file_type === "SDS-C");
  const [keepSdsC, setKeepSdsC] = useState(!!existingSdsC);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteStep, setDeleteStep] = useState<DeleteStep>("none");
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const unitsPallet = form.unitsPalette !== "" ? parseInt(form.unitsPalette, 10) : null;
      const { error: updateError } = await supabase
        .from("sale_products")
        .update({
          name: form.name.trim(),
          sku: form.sku.trim(),
          description: form.description.trim(),
          components_count: form.componentsCount,
          formats: form.formats,
          formats_other: form.formatsOther,
          units_per_pallet: isNaN(unitsPallet as number) ? null : unitsPallet,
          is_active: form.isActive,
        })
        .eq("id", product.id);

      if (updateError) throw new Error(updateError.message);

      const pid = product.id;
      const finalImages: SaleProductImage[] = [];
      const finalFiles: SaleProductFile[] = [];

      const removedMainIds = (product.images?.filter(i => i.image_type === "main") ?? [])
        .filter(i => !existingMainImages.find(e => e.id === i.id)).map(i => i.id);
      for (const id of removedMainIds) await supabase.from("sale_product_images").delete().eq("id", id);

      const removedExampleIds = (product.images?.filter(i => i.image_type === "example") ?? [])
        .filter(i => !existingExampleImages.find(e => e.id === i.id)).map(i => i.id);
      for (const id of removedExampleIds) await supabase.from("sale_product_images").delete().eq("id", id);

      finalImages.push(...existingMainImages, ...existingExampleImages);

      if (form.productImages[0]) {
        const ext = form.productImages[0].name.split(".").pop();
        const url = await uploadFile("product-images", `${pid}/main-${Date.now()}.${ext}`, form.productImages[0]);
        const { data: imgRow } = await supabase.from("sale_product_images").insert({ product_id: pid, image_type: "main", image_url: url, sort_order: 0 }).select().single();
        if (imgRow) finalImages.push(imgRow as SaleProductImage);
      }

      for (let i = 0; i < form.exampleImages.length; i++) {
        const ext = form.exampleImages[i].name.split(".").pop();
        const url = await uploadFile("product-images", `${pid}/example-${Date.now()}-${i}.${ext}`, form.exampleImages[i]);
        const { data: imgRow } = await supabase.from("sale_product_images").insert({ product_id: pid, image_type: "example", image_url: url, sort_order: existingExampleImages.length + i }).select().single();
        if (imgRow) finalImages.push(imgRow as SaleProductImage);
      }

      const handleFile = async (existing: SaleProductFile | undefined, keep: boolean, newFile: File | null, type: string) => {
        if (!keep && existing) {
          await supabase.from("sale_product_files").delete().eq("id", existing.id);
        } else if (keep && existing) {
          finalFiles.push(existing);
        }
        if (newFile) {
          const url = await uploadFile("product-files", `${pid}/${type}-${Date.now()}-${newFile.name}`, newFile);
          const { data: fileRow } = await supabase.from("sale_product_files").insert({ product_id: pid, file_type: type, file_url: url, file_name: newFile.name }).select().single();
          if (fileRow) finalFiles.push(fileRow as SaleProductFile);
        }
      };

      await handleFile(existingTds, keepTds, form.tdsFile, "TDS");
      await handleFile(existingSdsA, keepSdsA, form.sdsA && form.sdsAFile ? form.sdsAFile : null, "SDS-A");
      await handleFile(existingSdsB, keepSdsB, form.sdsB && form.sdsBFile ? form.sdsBFile : null, "SDS-B");
      await handleFile(existingSdsC, keepSdsC, form.sdsC && form.sdsCFile ? form.sdsCFile : null, "SDS-C");

      const unitsPalletFinal = form.unitsPalette !== "" ? parseInt(form.unitsPalette, 10) : null;
      const updated: SaleProduct = {
        ...product,
        name: form.name.trim(),
        sku: form.sku.trim(),
        description: form.description.trim(),
        components_count: form.componentsCount,
        formats: form.formats,
        formats_other: form.formatsOther,
        units_per_pallet: isNaN(unitsPalletFinal as number) ? null : unitsPalletFinal,
        is_active: form.isActive,
        images: finalImages,
        files: finalFiles,
      };
      onSave(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await supabase.from("sale_product_images").delete().eq("product_id", product.id);
      await supabase.from("sale_product_files").delete().eq("product_id", product.id);
      await supabase.from("sale_products").delete().eq("id", product.id);
      onDelete(product.id);
    } catch {
      setError("Erreur lors de la suppression");
      setDeleting(false);
      setDeleteStep("none");
    }
  };

  const renderDeleteConfirm = () => {
    if (deleteStep === "confirm1") {
      return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: T.bgCard, borderRadius: 12, maxWidth: 420, width: "100%", padding: "28px 28px 24px", boxShadow: "0 24px 64px rgba(0,0,0,0.35)" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 10 }}>Supprimer "{product.name}" ?</div>
            <div style={{ fontSize: 13, color: T.textMid, marginBottom: 24, lineHeight: 1.5 }}>Cette action est irréversible. Le produit sera définitivement supprimé du catalogue.</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteStep("none")} style={{ padding: "9px 18px", background: T.cardAlt, border: `1px solid ${T.silverLight}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: T.textMid, fontFamily: "inherit" }}>Annuler</button>
              <button onClick={() => setDeleteStep("confirm2")} style={{ padding: "9px 18px", background: T.red, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#fff", fontFamily: "inherit" }}>Oui, supprimer</button>
            </div>
          </div>
        </div>
      );
    }
    if (deleteStep === "confirm2") {
      return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: T.bgCard, borderRadius: 12, maxWidth: 440, width: "100%", padding: "28px 28px 24px", boxShadow: "0 24px 64px rgba(0,0,0,0.35)" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.red, marginBottom: 10 }}>Derniere confirmation requise</div>
            <div style={{ fontSize: 13, color: T.textMid, marginBottom: 24, lineHeight: 1.5 }}>Ce produit pourrait être référencé dans des commandes ou pricelists existantes. Les références existantes garderont le nom du produit en texte, mais il n'apparaîtra plus dans les menus déroulants pour les nouvelles créations.</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteStep("none")} disabled={deleting} style={{ padding: "9px 18px", background: T.cardAlt, border: `1px solid ${T.silverLight}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: T.textMid, fontFamily: "inherit" }}>Annuler</button>
              <button onClick={handleConfirmDelete} disabled={deleting} style={{ padding: "9px 18px", background: T.red, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer", color: "#fff", fontFamily: "inherit", opacity: deleting ? 0.7 : 1 }}>{deleting ? "Suppression..." : "Oui, supprimer définitivement"}</button>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 16px", overflowY: "auto" }}
      >
        <div style={{ background: T.card, borderRadius: 14, width: "100%", maxWidth: 560, boxShadow: "0 24px 64px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 64px)" }}>
          <div style={{ padding: "18px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>Modifier — {product.name}</div>
              <div style={{ fontSize: 12, color: T.textMid, marginTop: 2 }}>Modifiez les informations du produit</div>
            </div>
            <button onClick={onClose} style={{ background: T.cardAlt, border: `1px solid ${T.silverLight}`, borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.textMid }}>
              <CloseIcon />
            </button>
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6 }}>1. Nom du produit <span style={{ color: T.red }}>*</span></label>
              <input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} maxLength={60} placeholder="Ex: Uni-100" style={inputStyle} onFocus={e => e.currentTarget.style.borderColor = T.main} onBlur={e => e.currentTarget.style.borderColor = T.silverLight} />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6 }}>2. SKU (Code produit)</label>
              <input value={form.sku} onChange={e => setForm(prev => ({ ...prev, sku: e.target.value.toUpperCase() }))} maxLength={30} placeholder="Ex: UNI-100, UNI-8085" style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: 1 }} onFocus={e => e.currentTarget.style.borderColor = T.main} onBlur={e => e.currentTarget.style.borderColor = T.silverLight} />
              <div style={{ fontSize: 11, color: T.textLight, marginTop: 4 }}>Code unique pour identifier le produit dans le systeme</div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8 }}>3. Formats possibles</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {FORMAT_OPTIONS.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Checkbox checked={form.formats.includes(f)} onChange={() => setForm(prev => ({ ...prev, formats: prev.formats.includes(f) ? prev.formats.filter(x => x !== f) : [...prev.formats, f] }))} label={f} />
                    {f === "Autre" && form.formats.includes("Autre") && (
                      <input value={form.formatsOther} onChange={e => setForm(prev => ({ ...prev, formatsOther: e.target.value }))} placeholder="Précisez..." style={{ flex: 1, padding: "5px 10px", border: `1.5px solid ${T.silverLight}`, borderRadius: 6, fontSize: 12, fontFamily: "inherit", outline: "none" }} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6 }}>4. Unites par palette</label>
              <input type="number" min={1} value={form.unitsPalette} onChange={e => setForm(prev => ({ ...prev, unitsPalette: e.target.value }))} placeholder="Ex: 36" style={inputStyle} onFocus={e => e.currentTarget.style.borderColor = T.main} onBlur={e => e.currentTarget.style.borderColor = T.silverLight} />
              <div style={{ fontSize: 11, color: T.textLight, marginTop: 4 }}>Combien d'unités du format commun forment une palette complète</div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8 }}>5. Photo du produit</label>
              {existingMainImages.length > 0 ? (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: T.textMid, marginBottom: 6 }}>Photo actuelle</div>
                  <ExistingImageThumbs images={existingMainImages} onRemove={id => setExistingMainImages(prev => prev.filter(i => i.id !== id))} />
                </div>
              ) : (
                <ImageUploadZone label="Photo principale du produit" maxImages={1} images={form.productImages} onAdd={f => setForm(prev => ({ ...prev, productImages: [f] }))} onRemove={() => setForm(prev => ({ ...prev, productImages: [] }))} />
              )}
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 4 }}>6. Images d'exemple de projet</label>
              <div style={{ fontSize: 11, color: T.textMid, marginBottom: 8 }}>3 images maximum</div>
              {existingExampleImages.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: T.textMid, marginBottom: 6 }}>Images actuelles</div>
                  <ExistingImageThumbs images={existingExampleImages} onRemove={id => setExistingExampleImages(prev => prev.filter(i => i.id !== id))} />
                </div>
              )}
              {(existingExampleImages.length + form.exampleImages.length) < 3 && (
                <ImageUploadZone label="Ajouter des exemples" maxImages={3 - existingExampleImages.length} images={form.exampleImages} onAdd={f => { if (form.exampleImages.length + existingExampleImages.length < 3) setForm(prev => ({ ...prev, exampleImages: [...prev.exampleImages, f] })); }} onRemove={i => setForm(prev => ({ ...prev, exampleImages: prev.exampleImages.filter((_, idx) => idx !== i) }))} />
              )}
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6 }}>7. Description du produit</label>
              <div style={{ position: "relative" }}>
                <textarea value={form.description} onChange={e => { const words = e.target.value.trim() === "" ? [] : e.target.value.trim().split(/\s+/); if (words.length <= 100) setForm(prev => ({ ...prev, description: e.target.value })); }} rows={5} style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${T.silverLight}`, borderRadius: 7, fontSize: 12.5, fontFamily: "inherit", outline: "none", resize: "vertical", lineHeight: 1.55, color: T.text, boxSizing: "border-box" }} onFocus={e => e.currentTarget.style.borderColor = T.main} onBlur={e => e.currentTarget.style.borderColor = T.silverLight} />
                <div style={{ textAlign: "right", fontSize: 11, color: countWords(form.description) >= 95 ? T.red : T.textLight, marginTop: 4 }}>{countWords(form.description)}/100 mots</div>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6 }}>8. Nombre de composants</label>
              <select value={form.componentsCount} onChange={e => setForm(prev => ({ ...prev, componentsCount: Number(e.target.value) }))} style={{ padding: "9px 12px", border: `1.5px solid ${T.silverLight}`, borderRadius: 7, fontSize: 13, fontFamily: "inherit", outline: "none", background: T.card, color: T.text, cursor: "pointer" }}>
                <option value={1}>1 composant</option>
                <option value={2}>2 composants</option>
                <option value={3}>3 composants</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6 }}>9. Fichier TDS</label>
              {existingTds && keepTds ? (
                <ExistingFileRow label="TDS" fileUrl={existingTds.file_url} fileName={existingTds.file_name} onRemove={() => setKeepTds(false)} />
              ) : (
                <FileUploadZone label="Déposer le fichier TDS (PDF)" accept=".pdf" onFile={f => setForm(prev => ({ ...prev, tdsFile: f }))} currentFile={form.tdsFile} onClear={() => setForm(prev => ({ ...prev, tdsFile: null }))} />
              )}
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8 }}>10. Fiches SDS</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {([
                  { letter: "A", existing: existingSdsA, keep: keepSdsA, setKeep: setKeepSdsA, sdsKey: "sdsA" as const, fileKey: "sdsAFile" as const },
                  { letter: "B", existing: existingSdsB, keep: keepSdsB, setKeep: setKeepSdsB, sdsKey: "sdsB" as const, fileKey: "sdsBFile" as const },
                  { letter: "C", existing: existingSdsC, keep: keepSdsC, setKeep: setKeepSdsC, sdsKey: "sdsC" as const, fileKey: "sdsCFile" as const },
                ]).map(({ letter, existing, keep, setKeep, sdsKey, fileKey }) => (
                  <div key={letter}>
                    <Checkbox checked={form[sdsKey]} onChange={v => setForm(prev => ({ ...prev, [sdsKey]: v }))} label={`SDS-${letter}`} />
                    {form[sdsKey] && (
                      <div style={{ marginTop: 8, marginLeft: 24 }}>
                        {existing && keep ? (
                          <ExistingFileRow label={`SDS-${letter}`} fileUrl={existing.file_url} fileName={existing.file_name} onRemove={() => setKeep(false)} />
                        ) : (
                          <FileUploadZone label={`Déposer SDS-${letter} (PDF)`} accept=".pdf" onFile={f => setForm(prev => ({ ...prev, [fileKey]: f }))} currentFile={form[fileKey]} onClear={() => setForm(prev => ({ ...prev, [fileKey]: null }))} />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8 }}>11. Statut du produit</label>
              <Checkbox checked={form.isActive} onChange={v => setForm(prev => ({ ...prev, isActive: v }))} label="Produit actif (visible aux agents de vente)" />
            </div>

          </div>
          </div>

          <div style={{ padding: "16px 24px", borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
            {error && (
              <div style={{ marginBottom: 12, padding: "8px 12px", background: T.redBg, border: `1px solid ${T.red}`, borderRadius: 7, fontSize: 12, color: T.red }}>{error}</div>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={() => setDeleteStep("confirm1")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: T.redBg, border: `1px solid ${T.red}`, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", color: T.red, fontFamily: "inherit" }}>
                <TrashIcon /> Supprimer ce produit
              </button>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={onClose} style={{ padding: "10px 20px", background: T.cardAlt, border: `1px solid ${T.silverLight}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: T.textMid, fontFamily: "inherit" }}>Annuler</button>
                <button onClick={handleSave} disabled={saving || !form.name.trim()} style={{ padding: "10px 24px", background: T.main, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving || !form.name.trim() ? "not-allowed" : "pointer", color: "#fff", fontFamily: "inherit", opacity: saving || !form.name.trim() ? 0.6 : 1, transition: "opacity 0.15s" }}>
                  {saving ? "Enregistrement..." : "Enregistrer les modifications"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {renderDeleteConfirm()}
    </>
  );
}
