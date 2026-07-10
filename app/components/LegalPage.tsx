"use client";

import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { ChevronLeft, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

type LegalPageProps = {
  eyebrow: string;
  title: string;
  effectiveDate: string;
  intro: string[];
  sections: LegalSection[];
  contact?: ReactNode;
};

function getSurfaceStyles(themeId: string) {
  if (themeId === "lilac") {
    return {
      page: "linear-gradient(180deg, #fff6fb 0%, #fdeaf4 44%, #f9dceb 100%)",
      panel:
        "linear-gradient(135deg, rgba(255,255,255,0.72) 0%, rgba(255,232,245,0.64) 100%)",
      panelBorder: "rgba(236,72,153,0.22)",
      card:
        "linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(255,239,248,0.78) 100%)",
      ink: "#4b5563",
      heading: "#9d174d",
    };
  }

  if (themeId === "standard") {
    return {
      page: "linear-gradient(180deg, #020617 0%, #0f172a 48%, #020617 100%)",
      panel:
        "linear-gradient(135deg, rgba(15,23,42,0.96) 0%, rgba(30,41,59,0.88) 100%)",
      panelBorder: "rgba(71,85,105,0.9)",
      card:
        "linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(2,6,23,0.88) 100%)",
      ink: "#e2e8f0",
      heading: "#f8fafc",
    };
  }

  return {
    page: "linear-gradient(180deg, #070605 0%, #120f0c 42%, #070605 100%)",
    panel:
      "linear-gradient(135deg, rgba(26,21,18,0.96) 0%, rgba(16,13,11,0.90) 100%)",
    panelBorder: "rgba(217,190,121,0.25)",
    card:
      "linear-gradient(180deg, rgba(26,21,18,0.98) 0%, rgba(10,8,6,0.92) 100%)",
    ink: "#f8fafc",
    heading: "#fff7d6",
  };
}

export function LegalPage({
  eyebrow,
  title,
  effectiveDate,
  intro,
  sections,
  contact,
}: LegalPageProps) {
  const { theme } = useTheme();
  const surface = getSurfaceStyles(theme.id);
  const labelColor = theme.id === "lilac" ? "#6b7280" : "#94a3b8";

  return (
    <main
      className="min-h-screen text-slate-100 transition-colors duration-300"
      style={{ background: surface.page }}
    >
      <div className="mx-auto max-w-5xl px-4 py-6 md:py-10">
        <div
          className="mb-6 flex items-center justify-between rounded-3xl border px-4 py-3 shadow-lg"
          style={{ borderColor: surface.panelBorder, background: surface.panel }}
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium transition hover:opacity-80"
            style={{ color: surface.ink }}
          >
            <ChevronLeft className="h-4 w-4" />
            Back to home
          </Link>
          <div className="text-xs uppercase tracking-[0.3em]" style={{ color: labelColor }}>
            Chessactic
          </div>
        </div>

        <section
          className="rounded-3xl border p-6 shadow-2xl shadow-black/20 md:p-8"
          style={{ borderColor: surface.panelBorder, background: surface.panel }}
        >
          <div
            className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
            style={{ borderColor: surface.panelBorder, background: surface.card, color: surface.heading }}
          >
            {eyebrow}
          </div>

          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl" style={{ color: surface.heading }}>
            {title}
          </h1>
          <p className="mt-2 text-sm md:text-base" style={{ color: labelColor }}>
            Effective Date: {effectiveDate}
          </p>

          <div className="mt-6 grid gap-4">
            {intro.map((line) => (
              <p key={line} className="text-sm leading-7 md:text-base" style={{ color: surface.ink }}>
                {line}
              </p>
            ))}
          </div>
        </section>

        <div className="mt-6 grid gap-4">
          {sections.map((section, index) => (
            <section
              key={`${section.title}-${index}`}
              className="rounded-3xl border p-5 shadow-lg"
              style={{ borderColor: surface.panelBorder, background: surface.card }}
            >
              <h2 className="text-xl font-semibold" style={{ color: surface.heading }}>
                {section.title}
              </h2>

              {section.paragraphs?.length ? (
                <div className="mt-3 space-y-3">
                  {section.paragraphs.map((p) => (
                    <p key={p} className="text-sm leading-7 md:text-base" style={{ color: surface.ink }}>
                      {p}
                    </p>
                  ))}
                </div>
              ) : null}

              {section.bullets?.length ? (
                <ul className="mt-3 space-y-2 pl-5">
                  {section.bullets.map((item) => (
                    <li key={item} className="list-disc text-sm leading-7 md:text-base" style={{ color: surface.ink }}>
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        {contact ? (
          <section
            className="mt-6 rounded-3xl border p-5 shadow-lg"
            style={{ borderColor: surface.panelBorder, background: surface.panel }}
          >
            <h2 className="text-lg font-semibold" style={{ color: surface.heading }}>
              Contact
            </h2>
            <div className="mt-2 text-sm leading-7 md:text-base" style={{ color: surface.ink }}>
              {contact}
            </div>
          </section>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm" style={{ color: labelColor }}>
          <ExternalLink className="h-4 w-4" />
          <span>These pages are part of the Chessactic site and are styled to match your theme.</span>
        </div>
      </div>
    </main>
  );
}
