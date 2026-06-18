/** Mapify brand palette — extracted from public/vector logo gradient */
export const BRAND = {
  blue: "#0067F5",
  cyan: "#0DC5E7",
  gradient: "linear-gradient(135deg, #0067F5 0%, #0DC5E7 100%)",
  canvasBg: "#f8fafc",
  canvasDot: "#cbd5e1",
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    500: "#64748b",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
  },
} as const;

export const BRAND_ASSETS = {
  /** Icon-only mark — use in nav to avoid duplicate wordmark next to logo lockup */
  logoNav: "/mapify-logo.svg",
  logoMark: "/vector/isolated-layout.svg",
  logoFull: "/vector/default.svg",
  favicon: "/profile.png",
  ogImage: "/default.png",
} as const;

export const PRO_ICON_COLORS = {
  excel: "#16a34a",
  csv: "#64748b",
  json: "#4f46e5",
  powerBi: "#ea580c",
  ml: "#7c3aed",
  dashboard: "#0067F5",
  python: "#0d9488",
  api: "#0067F5",
  etl: "#dc2626",
  user: "#475569",
  custom: "#0067F5",
  block: "#0067F5",
} as const;
