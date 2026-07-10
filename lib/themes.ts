// lib/themes.ts

export type ThemeId = "forged-kings" | "standard" | "lilac";

export type ChessTheme = {
  id: ThemeId;
  name: string;
  description: string;
  available: boolean;
  background: {
    page: string;
    panel: string;
    border: string;
    accent: string;
  };
  board: {
    light: string;
    dark: string;
    selected: string;
    legalMove: string;
    image: string | null;
  };
  pieces: {
    folder: string | null;
  };
};

export const THEMES: Record<ThemeId, ChessTheme> = {
  "forged-kings": {
    id: "forged-kings",
    name: "Forged Kings",
    description: "Dark fantasy theme with custom artwork.",
    available: true,
    background: {
      page: "bg-[#080808]",
      panel: "bg-[#121212]",
      border: "border-amber-700/30",
      accent: "#d7ab32",
    },
    board: {
      light: "#d6b26d",
      dark: "#3a2c1c",
      selected: "rgba(251,191,36,0.45)",
      legalMove: "rgba(251,191,36,0.30)",
      image: "/boards/forged-kings/board-forged-kings.png",
    },
    pieces: {
      folder: "/chess-pieces/forged-kings",
    },
  },

  standard: {
    id: "standard",
    name: "Standard",
    description: "Classic tournament chess.",
    available: true,
    background: {
      page: "bg-slate-950",
      panel: "bg-slate-900",
      border: "border-slate-800",
      accent: "#3b82f6",
    },
    board: {
      light: "#f0d9b5",
      dark: "#b58863",
      selected: "rgba(59,130,246,0.35)",
      legalMove: "rgba(59,130,246,0.20)",
      image: null,
    },
    pieces: {
      folder: null,
    },
  },

  lilac: {
    id: "lilac",
    name: "Lilac",
    description: "Pink pastel theme with custom artwork.",
    available: true,
    background: {
      page: "bg-pink-50",
      panel: "bg-pink-100",
      border: "border-pink-300",
      accent: "#ec4899",
    },
    board: {
      light: "#ffe5f1",
      dark: "#f7b4d5",
      selected: "rgba(236,72,153,0.35)",
      legalMove: "rgba(236,72,153,0.20)",
      image: "/boards/lilac/board-lilac.png",
    },
    pieces: {
      folder: "/chess-pieces/lilac",
    },
  },
};

export const DEFAULT_THEME: ThemeId = "forged-kings";