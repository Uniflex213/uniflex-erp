import React, { useState, useRef, useEffect, useCallback } from "react";
import { T } from "../theme";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

interface Suggestion {
  id: string;
  full_address: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: Suggestion) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export default function AddressAutocomplete({ value, onChange, onSelect, placeholder = "Rechercher une adresse...", style, disabled }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 3 || !MAPBOX_TOKEN) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(query)}&access_token=${MAPBOX_TOKEN}&country=ca,us&language=fr&limit=5&types=address`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Mapbox error");
      const data = await res.json();
      const mapped: Suggestion[] = (data.features || []).map((f: any) => {
        const ctx = f.properties?.context || {};
        return {
          id: f.id,
          full_address: f.properties?.full_address || f.properties?.name || "",
          address: f.properties?.name || "",
          city: ctx.place?.name || ctx.locality?.name || "",
          province: ctx.region?.region_code || ctx.region?.name || "",
          postal_code: ctx.postcode?.name || "",
          country: ctx.country?.name || "Canada",
        };
      });
      setSuggestions(mapped);
      setOpen(mapped.length > 0);
    } catch {
      setSuggestions([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (val: string) => {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSelect = (s: Suggestion) => {
    onChange(s.full_address);
    setOpen(false);
    setSuggestions([]);
    onSelect?.(s);
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <input
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        style={style}
      />
      {loading && (
        <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: T.textLight }}>...</div>
      )}
      {open && suggestions.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#ffffff", border: `1px solid ${T.border}`, borderRadius: 8,
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 9999, maxHeight: 220, overflowY: "auto",
        }}>
          {suggestions.map(s => (
            <div
              key={s.id}
              onClick={() => handleSelect(s)}
              style={{
                padding: "10px 14px", cursor: "pointer", fontSize: 13,
                borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8,
              }}
              onMouseOver={e => (e.currentTarget.style.background = "#f8f9ff")}
              onMouseOut={e => (e.currentTarget.style.background = "transparent")}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.textLight} strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              <div>
                <div style={{ fontWeight: 600, color: T.text }}>{s.address}</div>
                <div style={{ fontSize: 11, color: T.textMid }}>{s.city}{s.province ? `, ${s.province}` : ""}{s.postal_code ? ` ${s.postal_code}` : ""}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
