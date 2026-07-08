"use client";

import { useRouter } from "next/navigation";
import { Palette } from "lucide-react";

export function ThemeRail() {
  const router = useRouter();

  return (
    <div className="relative z-20">
      <div className="flex w-[72px] flex-col items-center rounded-3xl border border-slate-800 bg-slate-900/80 py-4 shadow-lg">
        <button
          type="button"
          onClick={() => router.push("/themes")}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 transition hover:bg-slate-800"
          aria-label="Themes"
        >
          <Palette className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}