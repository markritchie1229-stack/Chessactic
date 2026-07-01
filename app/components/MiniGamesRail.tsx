"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowUpRight, X } from "lucide-react";

type MiniGameItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

function StackedBoardsIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect
        x="4"
        y="4"
        width="12"
        height="12"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="8"
        y="8"
        width="12"
        height="12"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="12"
        y="12"
        width="8"
        height="8"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function KingHunterIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle
        cx="14"
        cy="10"
        r="5.75"
        stroke="currentColor"
        strokeWidth="1.6"
        opacity="0.45"
      />
      <circle cx="14" cy="10" r="2.7" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M8 18.5h10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10.5 16.8h7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12.5 6.2v2.2M11.4 7.3h2.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M7.7 6.7c.8-1 1.9-1.9 3.3-2.3.4-.1.8.3.7.7l-.4 2c-.1.3.1.6.4.6h1.1c.3 0 .5-.2.4-.5l-.3-2c-.1-.4.3-.8.7-.7 1.4.4 2.5 1.2 3.3 2.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const miniGameItems: MiniGameItem[] = [
  {
    href: "/minigames/king-hunter",
    label: "King Hunter",
    icon: KingHunterIcon,
  },
  {
    href: "/minigames/chess-puzzle",
    label: "Chess Puzzle",
    icon: StackedBoardsIcon,
  },
] as const;

export function MiniGamesRail() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const panel =
    open && mounted
      ? createPortal(
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[60] bg-black/40"
              aria-label="Close mini games menu"
            />

            <aside className="fixed left-[88px] top-[184px] z-[70] w-[340px] max-w-[calc(100vw-112px)] max-h-[calc(100vh-128px)] overflow-y-auto overscroll-contain rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm uppercase tracking-wide text-slate-400">
                    Mini Games
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Jump into a game
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl p-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
                  aria-label="Close mini games menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                {miniGameItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 transition hover:bg-slate-800"
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-slate-300" />
                        {item.label}
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-slate-500" />
                    </Link>
                  );
                })}
              </div>
            </aside>
          </>,
          document.body,
        )
      : null;

  return (
    <div className="relative z-20">
      <div className="flex w-[72px] flex-col items-center rounded-3xl border border-slate-800 bg-slate-900/80 py-4 shadow-lg">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 transition hover:bg-slate-800"
          aria-label="Open mini games menu"
        >
          <StackedBoardsIcon className="h-6 w-6" />
        </button>
      </div>

      {panel}
    </div>
  );
}