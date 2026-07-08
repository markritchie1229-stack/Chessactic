// lib/backgrounds.ts

import type { ChessTheme } from "@/lib/themes";

export function getPageBackground(theme: ChessTheme): string {
  switch (theme.id) {
    case "forged-kings":
      return [
        "radial-gradient(circle at top, rgba(255,244,210,0.10), rgba(255,255,255,0) 38%)",
        "radial-gradient(circle at 20% 80%, rgba(215,171,50,0.14), rgba(255,255,255,0) 34%)",
        "linear-gradient(180deg, #080808 0%, #0f0c09 100%)",
      ].join(", ");

    case "girly":
      return [
        "radial-gradient(circle at top, rgba(255,255,255,0.22), rgba(255,255,255,0) 34%)",
        "radial-gradient(circle at 18% 82%, rgba(236,72,153,0.22), rgba(255,255,255,0) 30%)",
        "radial-gradient(circle at 82% 78%, rgba(168,85,247,0.18), rgba(255,255,255,0) 32%)",
        "linear-gradient(180deg, #fff5fa 0%, #ffdceb 48%, #ffc4de 100%)",
      ].join(", ");

    case "standard":
    default:
      return [
        "radial-gradient(circle at top, rgba(59,130,246,0.08), rgba(255,255,255,0) 32%)",
        "linear-gradient(180deg, #020617 0%, #0f172a 100%)",
      ].join(", ");
  }
}

export function getPanelBackground(theme: ChessTheme): string {
  switch (theme.id) {
    case "forged-kings":
      return "rgba(15, 12, 9, 0.82)";

    case "girly":
      return "rgba(255, 248, 252, 0.82)";

    case "standard":
    default:
      return "rgba(15, 23, 42, 0.80)";
  }
}

export function getHeaderGlow(theme: ChessTheme): string {
  switch (theme.id) {
    case "forged-kings":
      return "radial-gradient(circle at top, rgba(255,244,210,0.10), rgba(255,255,255,0) 58%)";

    case "girly":
      return "radial-gradient(circle at top, rgba(255,255,255,0.35), rgba(255,255,255,0) 58%)";

    case "standard":
    default:
      return "radial-gradient(circle at top, rgba(59,130,246,0.08), rgba(255,255,255,0) 58%)";
  }
}