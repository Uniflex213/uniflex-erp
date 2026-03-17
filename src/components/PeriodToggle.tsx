import React from 'react';

export type PeriodOption = { key: string; label: string };

export default function PeriodToggle({ value, onChange, options }: {
  value: string;
  onChange: (k: string) => void;
  options: PeriodOption[];
}) {
  return (
    <div style={{ display: 'flex', gap: 2, background: '#f5f4f0', borderRadius: 6, padding: 2 }}>
      {options.map(o => (
        <button key={o.key} onClick={() => onChange(o.key)} style={{
          padding: '3px 8px', fontSize: 10, fontWeight: 600, border: 'none', borderRadius: 4,
          cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif",
          background: value === o.key ? '#fff' : 'transparent',
          color: value === o.key ? '#111' : '#999',
          boxShadow: value === o.key ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
          transition: 'all 0.15s ease', lineHeight: 1.4,
        }}>{o.label}</button>
      ))}
    </div>
  );
}
