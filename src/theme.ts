// ── Light minimal theme (ERP shell) — Cal.com / particle inspired ──
export const T = {
  // Backgrounds — liquid glass
  bg: "#f5f4f0",
  bgAlt: "rgba(230,228,224,0.5)",
  bgCard: "rgba(230,228,224,0.5)",
  bgCard2: "rgba(220,218,214,0.45)",
  bgInput: "rgba(255,255,255,0.45)",
  bgHover: "rgba(255,255,255,0.55)",

  // Primary — sharp black accent (Cal.com style)
  main: "#111111",
  mainLight: "#333333",
  mainGlow: "rgba(17,17,17,0.08)",
  mainDark: "#000000",

  // Text — high contrast
  white: "#ffffff",
  text: "#111111",
  textMid: "#6b6b6b",
  textLight: "#a0a0a0",

  // Borders — ultra thin, subtle
  border: "rgba(0,0,0,0.08)",
  borderHover: "rgba(0,0,0,0.14)",
  borderActive: "rgba(0,0,0,0.22)",

  // Status colors — muted, sophisticated
  green: "#16a34a",
  greenBg: "rgba(22,163,74,0.08)",
  greenDark: "#15803d",
  orange: "#d97706",
  orangeBg: "rgba(217,119,6,0.08)",
  red: "#dc2626",
  redBg: "rgba(220,38,38,0.08)",
  blue: "#2563eb",
  blueBg: "rgba(37,99,235,0.08)",
  cyan: "#0891b2",
  cyanBg: "rgba(8,145,178,0.08)",

  // Card aliases
  card: "rgba(230,228,224,0.35)",
  cardAlt: "rgba(220,218,214,0.4)",
  silver: "#6b6b6b",
  silverLight: "#999999",
  silverDark: "#a0a0a0",
  black: "#111111",
  matte: "rgba(230,228,224,0.5)",
  matteLight: "rgba(240,238,234,0.4)",

  // Sidebar
  sidebar: "rgba(255,255,255,0.6)",
  sideHover: "rgba(255,255,255,0.8)",
  sideActive: "#111111",

  // Glass system — liquid glass
  glass: "rgba(230,228,224,0.5)",
  glassMid: "rgba(220,218,214,0.4)",
  glassHover: "rgba(240,238,234,0.6)",
  glassBorder: "rgba(255,255,255,0.4)",
  glassCard: "rgba(230,228,224,0.35)",
  glassCardBorder: "rgba(255,255,255,0.4)",
  glassBlur: "blur(24px)",

  // Layout
  headerH: "52px",

  // Accent marks
  neon: "#111111",
  neonGlow: "rgba(17,17,17,0.06)",
  textMono: "#16a34a",

  // Legacy aliases
  textMuted: "#a0a0a0",
  matteCard: "rgba(230,228,224,0.35)",
  gold: "#d97706",
  mainBg: "#111111",
  hover: "rgba(0,0,0,0.04)",
  bubble: "rgba(17,17,17,0.06)",
  bubbleOther: "rgba(0,0,0,0.04)",
  input: "rgba(255,255,255,0.5)",
  inputBorder: "rgba(255,255,255,0.6)",
  overlay: "rgba(0,0,0,0.4)",
  teamBg: "rgba(230,228,224,0.35)",
  active: "#111111",
  unreadBg: "rgba(17,17,17,0.05)",
  divider: "rgba(0,0,0,0.06)",

  // Shadows — glass
  shadowCard: "0 2px 12px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.7)",
  shadowHeavy: "0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)",
  shadowGlow: "0 0 0 1px rgba(255,255,255,0.5)",

  // Stepper
  stepCompleted: "#16a34a",
  stepActive: "#111111",
  stepPending: "#d4d4d4",
  stepLine: "#e5e5e5",

  // CRM accent
  mint: "#16a34a",
  mintBg: "rgba(22,163,74,0.08)",
  purple: "#7c3aed",
  purpleBg: "rgba(124,58,237,0.08)",

  // Gradients — glass
  gradientCard: "linear-gradient(145deg, rgba(235,233,228,0.6) 0%, rgba(215,213,208,0.5) 100%)",
  gradientMain: "linear-gradient(135deg, #111111 0%, #333333 100%)",
  gradientGold: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
  gradientShell: "linear-gradient(180deg, rgba(0,0,0,0.01) 0%, transparent 40%)",
};

// ── Light theme tokens (Landing page) ──
export const L = {
  bg: "#fafaf9",
  bgAlt: "#f3f2ee",
  card: "#ffffff",
  cardBorder: "#ece9e2",
  cardBorderLight: "#f5f2ed",

  text: "#080503",
  textMid: "#5e534a",
  textMuted: "#a89c92",
  textLight: "#c5c0b8",

  border: "#e0ddd6",
  borderLight: "#e8e4dd",
  borderHover: "#d0ccc4",

  accent: "#080503",
  accentBg: "#080503",
  accentText: "#fafaf9",

  green: "#16a34a",
  orange: "#d97706",
  red: "#dc2626",

  pill: "#080503",
  pillText: "#fafaf9",
  ghost: "#5e534a",

  headerBg: "rgba(250,250,249,0.88)",
  headerBlur: "blur(8px)",
  headerBorder: "#e8e4dd",

  shadowCard: "0 1px 3px rgba(0,0,0,0.04)",
  shadowPanel: "0 2px 8px rgba(0,0,0,0.06)",
};

// ── Spacing system ──
export const sp = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};
