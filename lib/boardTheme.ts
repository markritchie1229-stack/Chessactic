import type { ChessTheme } from "@/lib/themes";

export type BoardTheme = {
  light: string;
  dark: string;
  selected: string;
  legalMove: string;
  accent: string;
  pieceFolder: string;
};

export function getBoardTheme(theme: ChessTheme): BoardTheme {
  switch (theme.id) {
    case "standard":
      return {
        light: "#f0d9b5",
        dark: "#b58863",
        selected: "rgba(59,130,246,0.35)",
        legalMove: "rgba(59,130,246,0.20)",
        accent: theme.background.accent,
        pieceFolder: "/pieces/standard",
      };

    case "girly":
      return {
        light: "#ffe4f1",
        dark: "#f7b4d5",
        selected: "rgba(236,72,153,0.35)",
        legalMove: "rgba(236,72,153,0.20)",
        accent: theme.background.accent,
        pieceFolder: "/pieces/girly",
      };

    case "forged-kings":
    default:
      return {
        light: "#d6b26d",
        dark: "#3a2c1c",
        selected: "rgba(251,191,36,0.35)",
        legalMove: "rgba(251,191,36,0.20)",
        accent: theme.background.accent,
        pieceFolder: "/pieces/forged-kings",
      };
  }
}