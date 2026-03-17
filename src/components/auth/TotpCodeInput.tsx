import React, { useRef, useEffect } from "react";
import { T } from "../../theme";

interface Props {
  values: string[];
  onChange: (values: string[]) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  lightMode?: boolean;
}

export default function TotpCodeInput({ values, onChange, onComplete, disabled, autoFocus, lightMode }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const handleChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...values];
    next[index] = digit;
    onChange(next);

    if (digit && index < 5) {
      refs.current[index + 1]?.focus();
    }
    if (next.every(v => v !== "") && next.join("").length === 6) {
      onComplete?.(next.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (values[index]) {
        const next = [...values];
        next[index] = "";
        onChange(next);
      } else if (index > 0) {
        refs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    onChange(next);
    const focusIdx = Math.min(pasted.length, 5);
    refs.current[focusIdx]?.focus();
    if (pasted.length === 6) onComplete?.(pasted);
  };

  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      {values.map((val, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={val}
          disabled={disabled}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          onFocus={e => e.target.select()}
          style={{
            width: 44,
            height: 54,
            borderRadius: 10,
            border: `2px solid ${val ? T.main : lightMode ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.10)"}`,
            background: lightMode ? "rgba(0,0,0,0.03)" : "rgba(0,0,0,0.03)",
            color: lightMode ? "#1a1a2e" : "#111",
            fontSize: 22,
            fontWeight: 700,
            fontFamily: "'Inter', system-ui, sans-serif",
            textAlign: "center",
            outline: "none",
            transition: "border-color 0.15s ease",
            cursor: disabled ? "not-allowed" : "text",
            opacity: disabled ? 0.5 : 1,
          }}
        />
      ))}
    </div>
  );
}
