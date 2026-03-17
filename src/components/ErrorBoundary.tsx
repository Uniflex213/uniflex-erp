import React from "react";
import { T } from "../theme";

interface Props {
  children: React.ReactNode;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          minHeight: 300, padding: 32, gap: 16, color: T.textMid ?? T.text,
        }}>
          <div style={{ fontSize: 40 }}>⚠</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.text }}>
            Une erreur est survenue
          </div>
          <div style={{ fontSize: 13, color: T.textMid ?? T.text, textAlign: "center", maxWidth: 400 }}>
            {this.props.fallbackLabel ?? "Cette section a rencontré un problème."}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
              background: T.main, color: "#fff", fontSize: 13, fontWeight: 600,
            }}
          >
            Réessayer
          </button>
          {this.state.error && (
            <pre style={{
              fontSize: 11, color: T.red ?? "#ef4444", maxWidth: "100%", overflow: "auto",
              background: "rgba(239,68,68,0.06)", padding: 12, borderRadius: 8, marginTop: 8,
            }}>
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
