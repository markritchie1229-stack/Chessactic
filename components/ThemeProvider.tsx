"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  DEFAULT_THEME,
  THEMES,
  ThemeId,
} from "@/lib/themes";

type ThemeContextType = {
  themeId: ThemeId;
  theme: (typeof THEMES)[ThemeId];
  setTheme: (theme: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextType | null>(
  null
);

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [themeId, setThemeId] =
    useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    const saved = localStorage.getItem(
      "chessactic-theme"
    ) as ThemeId | null;

    if (saved && THEMES[saved]) {
      setThemeId(saved);
    }
  }, []);

  const setTheme = (theme: ThemeId) => {
    setThemeId(theme);
    localStorage.setItem(
      "chessactic-theme",
      theme
    );
  };

  return (
    <ThemeContext.Provider
      value={{
        themeId,
        theme: THEMES[themeId],
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider."
    );
  }

  return context;
}