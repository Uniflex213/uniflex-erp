import React from "react";
import { T } from "../theme";
import { useLanguage } from "../i18n/LanguageContext";
import { FormState, FORMAT_OPTIONS, countWords } from "./productFormTypes";
import { PRODUCT_CATEGORIES } from "../sales/productTypes";
import { FileUploadZone, ImageUploadZone, Checkbox, inputStyle } from "./ProductFormHelpers";

export default function ProductFormBody({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
  const { t } = useLanguage();
  const wordCount = countWords(form.description);
  const set = (key: keyof FormState, val: unknown) => setForm(prev => ({ ...prev, [key]: val }));
  const toggleFormat = (f: string) => {
    setForm(prev => ({
      ...prev,
      formats: prev.formats.includes(f) ? prev.formats.filter(x => x !== f) : [...prev.formats, f],
    }));
  };

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6 }}>
          {t("prodform.name_label")} <span style={{ color: T.red }}>*</span>
        </label>
        <input
          value={form.name}
          onChange={e => set("name", e.target.value)}
          maxLength={60}
          placeholder="Ex: Uni-100"
          style={inputStyle}
          onFocus={e => e.currentTarget.style.borderColor = T.main}
          onBlur={e => e.currentTarget.style.borderColor = T.silverLight}
        />
      </div>

      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6 }}>
          {t("prodform.sku_label")}
        </label>
        <input
          value={form.sku}
          onChange={e => set("sku", e.target.value.toUpperCase())}
          maxLength={30}
          placeholder="Ex: UNI-100, UNI-8085"
          style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: 1 }}
          onFocus={e => e.currentTarget.style.borderColor = T.main}
          onBlur={e => e.currentTarget.style.borderColor = T.silverLight}
        />
        <div style={{ fontSize: 11, color: T.textLight, marginTop: 4 }}>{t("prodform.sku_help")}</div>
      </div>

      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8 }}>{t("prodform.category_label")}</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {PRODUCT_CATEGORIES.map(cat => {
            const active = form.category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => set("category", cat)}
                style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                  background: active ? T.main : T.cardAlt,
                  color: active ? "#fff" : T.textMid,
                  border: `1.5px solid ${active ? T.main : T.silverLight}`,
                  transition: "all 0.15s",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8 }}>{t("prodform.formats_label")}</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FORMAT_OPTIONS.map(f => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Checkbox checked={form.formats.includes(f)} onChange={() => toggleFormat(f)} label={f} />
              {f === "Autre" && form.formats.includes("Autre") && (
                <input
                  value={form.formatsOther}
                  onChange={e => set("formatsOther", e.target.value)}
                  placeholder={t("prodform.specify")}
                  style={{
                    flex: 1, padding: "5px 10px", border: `1.5px solid ${T.silverLight}`,
                    borderRadius: 6, fontSize: 12, fontFamily: "inherit", outline: "none",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = T.main}
                  onBlur={e => e.currentTarget.style.borderColor = T.silverLight}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6 }}>{t("prodform.units_palette_label")}</label>
        <input
          type="number"
          min={1}
          value={form.unitsPalette}
          onChange={e => set("unitsPalette", e.target.value)}
          placeholder="Ex: 36"
          style={inputStyle}
          onFocus={e => e.currentTarget.style.borderColor = T.main}
          onBlur={e => e.currentTarget.style.borderColor = T.silverLight}
        />
        <div style={{ fontSize: 11, color: T.textLight, marginTop: 4 }}>{t("prodform.units_palette_help")}</div>
      </div>

      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8 }}>{t("prodform.photo_label")}</label>
        <ImageUploadZone
          label={t("prodform.photo_main")}
          maxImages={1}
          images={form.productImages}
          onAdd={f => set("productImages", [f])}
          onRemove={() => set("productImages", [])}
        />
      </div>

      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 4 }}>
          {t("prodform.example_images_label")}
        </label>
        <div style={{ fontSize: 11, color: T.textMid, marginBottom: 8 }}>{t("prodform.max_3_images")}</div>
        <ImageUploadZone
          label={t("prodform.example_photos")}
          maxImages={3}
          images={form.exampleImages}
          onAdd={f => { if (form.exampleImages.length < 3) set("exampleImages", [...form.exampleImages, f]); }}
          onRemove={i => set("exampleImages", form.exampleImages.filter((_, idx) => idx !== i))}
        />
      </div>

      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6 }}>{t("prodform.description_label")}</label>
        <div style={{ position: "relative" }}>
          <textarea
            value={form.description}
            onChange={e => {
              const words = e.target.value.trim() === "" ? [] : e.target.value.trim().split(/\s+/);
              if (words.length <= 100) set("description", e.target.value);
            }}
            placeholder={t("prodform.description_placeholder")}
            rows={5}
            style={{
              width: "100%", padding: "10px 12px", border: `1.5px solid ${T.silverLight}`,
              borderRadius: 7, fontSize: 12.5, fontFamily: "inherit", outline: "none",
              resize: "vertical", lineHeight: 1.55, color: T.text, boxSizing: "border-box",
            }}
            onFocus={e => e.currentTarget.style.borderColor = T.main}
            onBlur={e => e.currentTarget.style.borderColor = T.silverLight}
          />
          <div style={{ textAlign: "right", fontSize: 11, color: wordCount >= 95 ? T.red : T.textLight, marginTop: 4 }}>
            {wordCount}/100 {t("prodform.words_count")}
          </div>
        </div>
      </div>

      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6 }}>{t("prodform.components_label")}</label>
        <select
          value={form.componentsCount}
          onChange={e => set("componentsCount", Number(e.target.value))}
          style={{
            padding: "9px 12px", border: `1.5px solid ${T.silverLight}`, borderRadius: 7,
            fontSize: 13, fontFamily: "inherit", outline: "none", background: T.card, color: T.text,
            cursor: "pointer",
          }}
          onFocus={e => e.currentTarget.style.borderColor = T.main}
          onBlur={e => e.currentTarget.style.borderColor = T.silverLight}
        >
          <option value={1}>1 {t("prodform.component")}</option>
          <option value={2}>2 {t("prodform.components")}</option>
          <option value={3}>3 {t("prodform.components")}</option>
        </select>
      </div>

      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6 }}>9. Fichier TDS (Technical Data Sheet)</label>
        <FileUploadZone
          label="Déposer le fichier TDS (PDF)"
          accept=".pdf"
          onFile={f => set("tdsFile", f)}
          currentFile={form.tdsFile}
          onClear={() => set("tdsFile", null)}
        />
      </div>

      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8 }}>10. Fiches SDS</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(["A", "B", "C"] as const).map((letter) => {
            const sdsKey = `sds${letter}` as keyof FormState;
            const sdsFileKey = `sds${letter}File` as keyof FormState;
            return (
              <div key={letter}>
                <Checkbox
                  checked={form[sdsKey] as boolean}
                  onChange={v => set(sdsKey, v)}
                  label={`SDS-${letter}`}
                />
                {form[sdsKey] && (
                  <div style={{ marginTop: 8, marginLeft: 24 }}>
                    <FileUploadZone
                      label={`Déposer SDS-${letter} (PDF)`}
                      accept=".pdf"
                      onFile={f => set(sdsFileKey, f)}
                      currentFile={form[sdsFileKey] as File | null}
                      onClear={() => set(sdsFileKey, null)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8 }}>11. Statut du produit</label>
        <Checkbox checked={form.isActive} onChange={v => set("isActive", v)} label="Produit actif (visible aux agents de vente)" />
      </div>

    </div>
  );
}
