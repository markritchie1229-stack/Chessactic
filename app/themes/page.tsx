"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Palette,
  Sparkles,
  Sword,
  Shield,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { THEMES, type ThemeId } from "@/lib/themes";

const THEME_ORDER: ThemeId[] = ["forged-kings", "standard", "lilac"];

export default function ThemesPage() {
  const router = useRouter();
  const { themeId, theme, setTheme } = useTheme();

  const primaryText = themeId === "lilac" ? "#831843" : "#f8fafc";
  const secondaryText = themeId === "lilac" ? "#9f1239" : "#94a3b8";
  const mutedText = themeId === "lilac" ? "#be185d" : "#64748b";
  const panelText = themeId === "lilac" ? "#9f1239" : "#cbd5e1";
  const buttonText = themeId === "lilac" ? "#9f1239" : "#f8fafc";

  return (
    <main
      className="min-h-screen transition-colors duration-300"
      style={{
        background:
          themeId === "forged-kings"
            ? "linear-gradient(180deg, #080808 0%, #0f0c09 100%)"
            : themeId === "lilac"
              ? "linear-gradient(180deg, #fff7fb 0%, #ffe8f2 100%)"
              : "linear-gradient(180deg, #020617 0%, #0f172a 100%)",
        color: primaryText,
      }}
    >
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 md:px-6 md:py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium transition hover:bg-slate-800"
            style={{ color: buttonText }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
            style={{
              borderColor: theme.background.border,
              background:
                themeId === "lilac"
                  ? "rgba(255,255,255,0.55)"
                  : "rgba(15,23,42,0.65)",
              color: themeId === "lilac" ? "#9f1239" : "#cbd5e1",
            }}
          >
            <Palette className="h-4 w-4" />
            Theme Selection
          </div>
        </div>

        <div className="mb-8 max-w-3xl">
          <h1
            className="text-3xl font-semibold tracking-tight md:text-5xl"
            style={{ color: primaryText }}
          >
            Choose your theme
          </h1>
          <p
            className="mt-3 text-sm leading-6 md:text-base"
            style={{ color: secondaryText }}
          >
            Your theme changes the board, pieces, backgrounds, and mini games across the app.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {THEME_ORDER.map((id) => {
            const card = THEMES[id];
            const isActive = themeId === card.id;
            const isComingSoon = !card.available;

            const cardShell =
              card.id === "forged-kings"
                ? "linear-gradient(135deg, rgba(26,21,18,0.96) 0%, rgba(16,13,11,0.96) 55%, rgba(7,6,5,0.98) 100%)"
                : card.id === "lilac"
                  ? "linear-gradient(135deg, rgba(255,248,252,0.98) 0%, rgba(255,234,244,0.98) 100%)"
                  : "linear-gradient(135deg, rgba(15,23,42,0.96) 0%, rgba(2,6,23,0.98) 100%)";

            const titleColor =
              card.id === "lilac" ? "#9f1239" : "#f8fafc";

            const textColor =
              card.id === "lilac" ? "#be185d" : "#94a3b8";

            return (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  if (card.available) setTheme(card.id);
                }}
                disabled={isComingSoon}
                className={[
                  "group rounded-[2rem] border p-5 text-left shadow-lg transition",
                  isActive ? "shadow-black/30" : "hover:bg-slate-800",
                  isComingSoon ? "cursor-not-allowed opacity-75" : "",
                ].join(" ")}
                style={{
                  borderColor: isActive ? theme.background.accent : theme.background.border,
                  background: cardShell,
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.28em]"
                      style={{
                        borderColor:
                          card.id === "lilac"
                            ? "rgba(236,72,153,0.25)"
                            : "rgba(51,65,85,1)",
                        background:
                          card.id === "lilac"
                            ? "rgba(255,255,255,0.7)"
                            : "rgba(2,6,23,0.7)",
                        color: card.id === "lilac" ? "#9f1239" : "#94a3b8",
                      }}
                    >
                      {card.id === "forged-kings" ? (
                        <Sword className="h-3.5 w-3.5" />
                      ) : card.id === "standard" ? (
                        <Shield className="h-3.5 w-3.5" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {card.available ? "Available" : "Coming Soon"}
                    </div>

                    <h2 className="mt-4 text-2xl font-semibold" style={{ color: titleColor }}>
                      {card.name}
                    </h2>

                    <p className="mt-2 text-sm leading-6" style={{ color: textColor }}>
                      {card.description}
                    </p>
                  </div>

                  {isActive ? (
                    <div
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
                      style={{
                        background:
                          themeId === "lilac"
                            ? "rgba(236,72,153,0.12)"
                            : "rgba(16,185,129,0.12)",
                        color: themeId === "lilac" ? "#be185d" : "#86efac",
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Active
                    </div>
                  ) : null}
                </div>

                <div
                  className="mt-5 overflow-hidden rounded-[1.5rem] border p-3"
                  style={{
                    borderColor:
                      card.id === "lilac"
                        ? "rgba(236,72,153,0.18)"
                        : "rgba(51,65,85,0.95)",
                    background:
                      card.id === "lilac"
                        ? "rgba(255,255,255,0.65)"
                        : "rgba(2,6,23,0.65)",
                  }}
                >
                  <div className="grid aspect-[5/3] grid-cols-2 grid-rows-2 gap-2">
                    <div className="rounded-2xl" style={{ background: card.board.light }} />
                    <div className="rounded-2xl" style={{ background: card.board.dark }} />
                    <div
                      className="rounded-2xl"
                      style={{
                        background:
                          card.id === "lilac"
                            ? "linear-gradient(135deg, #fff1f8 0%, #ffd9ea 100%)"
                            : card.background.panel,
                      }}
                    />
                    <div
                      className="rounded-2xl border"
                      style={{
                        background: card.background.page,
                        borderColor: card.background.accent,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <span style={{ color: textColor }}>
                    {card.available ? "Tap to select" : "Not ready yet"}
                  </span>
                  <span
                    className="font-medium"
                    style={{
                      color: isActive ? theme.background.accent : card.background.accent,
                    }}
                  >
                    {isActive ? "Selected" : card.name}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div
          className="mt-8 rounded-[2rem] border p-5"
          style={{
            borderColor: theme.background.border,
            background:
              themeId === "lilac"
                ? "rgba(255,255,255,0.75)"
                : "rgba(15,23,42,0.8)",
          }}
        >
          <div
            className="text-sm uppercase tracking-wide"
            style={{ color: mutedText }}
          >
            Current theme
          </div>
          <div className="mt-2 text-2xl font-semibold" style={{ color: theme.background.accent }}>
            {theme.name}
          </div>
          <p className="mt-2 text-sm leading-6" style={{ color: secondaryText }}>
            This is the theme currently applied across the app.
          </p>
        </div>
      </div>
    </main>
  );
}