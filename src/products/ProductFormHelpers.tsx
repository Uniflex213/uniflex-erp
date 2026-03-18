import React, { useState, useRef } from "react";
import { SaleProductImage } from "../sales/productTypes";
import { T } from "../theme";
import { TrashIcon, UploadIcon, PlusIcon, CloseIcon, CheckIcon } from "./productIcons";

export function FileUploadZone({
  label, accept, onFile, currentFile, onClear,
}: {
  label: string; accept: string; onFile: (f: File) => void; currentFile: File | null; onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div>
      {currentFile ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 7 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.main} strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span style={{ flex: 1, fontSize: 12, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentFile.name}</span>
          <button onClick={onClear} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMid, padding: 0, display: "flex" }}><TrashIcon /></button>
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `1.5px dashed ${dragging ? T.main : T.silverLight}`,
            borderRadius: 7, padding: "12px", textAlign: "center", cursor: "pointer",
            background: dragging ? "rgba(99,102,241,0.04)" : T.cardAlt,
            transition: "all 0.15s",
          }}
        >
          <div style={{ color: T.silverDark, fontSize: 12 }}>{label}</div>
          <div style={{ color: T.textLight, fontSize: 10.5, marginTop: 2 }}>Glisser-déposer ou cliquer</div>
          <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]); }} />
        </div>
      )}
    </div>
  );
}

export function ExistingFileRow({ label, fileUrl, fileName, onRemove }: { label: string; fileUrl: string; fileName: string; onRemove: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 7 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.main} strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      <span style={{ fontSize: 11, fontWeight: 600, color: T.main, flexShrink: 0 }}>{label}</span>
      <a href={fileUrl} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: 11, color: T.textMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: "none" }}>{fileName}</a>
      <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: T.red, padding: 0, display: "flex", flexShrink: 0 }}><TrashIcon /></button>
    </div>
  );
}

export function ImageUploadZone({
  label, maxImages, images, onAdd, onRemove,
}: {
  label: string; maxImages: number; images: File[]; onAdd: (f: File) => void; onRemove: (i: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div>
      {images.length < maxImages && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onAdd(f); }}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `1.5px dashed ${dragging ? T.main : T.silverLight}`,
            borderRadius: 7, padding: "14px", textAlign: "center", cursor: "pointer",
            background: dragging ? "rgba(99,102,241,0.04)" : T.cardAlt,
            transition: "all 0.15s", marginBottom: images.length > 0 ? 10 : 0,
          }}
        >
          <div style={{ color: T.silverDark, marginBottom: 4 }}><UploadIcon /></div>
          <div style={{ color: T.silverDark, fontSize: 12 }}>{label}</div>
          <div style={{ color: T.textLight, fontSize: 10.5, marginTop: 2 }}>{images.length}/{maxImages} images — Glisser-déposer ou cliquer</div>
          <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) onAdd(e.target.files[0]); }} />
        </div>
      )}
      {images.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {images.map((img, i) => (
            <div key={i} style={{ position: "relative", width: 72, height: 56, borderRadius: 6, overflow: "hidden", border: `1px solid ${T.border}` }}>
              <img src={URL.createObjectURL(img)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
              <button
                onClick={() => onRemove(i)}
                style={{
                  position: "absolute", top: 2, right: 2, width: 18, height: 18,
                  background: "rgba(230,228,224,0.35)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "none", borderRadius: "50%", cursor: "pointer",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                }}
              >
                <CloseIcon />
              </button>
            </div>
          ))}
          {images.length < maxImages && (
            <div
              onClick={() => inputRef.current?.click()}
              style={{
                width: 72, height: 56, borderRadius: 6, border: `1.5px dashed ${T.silverLight}`,
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                background: T.cardAlt, color: T.silverDark,
              }}
            >
              <PlusIcon />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ExistingImageThumbs({ images, onRemove }: { images: SaleProductImage[]; onRemove: (id: string) => void }) {
  if (images.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
      {images.map(img => (
        <div key={img.id} style={{ position: "relative", width: 72, height: 56, borderRadius: 6, overflow: "hidden", border: `1px solid ${T.border}` }}>
          <img src={img.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
          <button
            onClick={() => onRemove(img.id)}
            style={{
              position: "absolute", top: 2, right: 2, width: 18, height: 18,
              background: "rgba(200,0,0,0.75)", border: "none", borderRadius: "50%", cursor: "pointer",
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
            }}
          >
            <CloseIcon />
          </button>
        </div>
      ))}
    </div>
  );
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 16, height: 16, borderRadius: 4,
          background: checked ? T.main : T.card,
          border: `1.5px solid ${checked ? T.main : T.silverLight}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, transition: "all 0.15s", cursor: "pointer",
        }}
      >
        {checked && <span style={{ color: "#fff" }}><CheckIcon /></span>}
      </div>
      <span style={{ fontSize: 12.5, color: T.text }}>{label}</span>
    </label>
  );
}

export const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", border: `1.5px solid ${T.silverLight}`,
  borderRadius: 7, fontSize: 13, fontFamily: "inherit", outline: "none",
  boxSizing: "border-box", color: T.text,
};
