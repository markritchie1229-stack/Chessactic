"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ClubQuickLinks } from "./ClubQuickLinks";

const STORAGE_KEY = "club-sidebar-collapsed";

type ClubSection = "club" | "members" | "invite" | "forum" | "settings";

type Props = {
  base: string;
  active: ClubSection;
  clubId: string;
};

export function ClubSidebarShell({ base, active, clubId }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      setCollapsed(saved === "true");
    } catch {
      // Ignore storage errors.
    }
  }, []);

  useEffect(() => {
    if (!ready) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // Ignore storage errors.
    }
  }, [collapsed, ready]);

  return (
    <aside
      className={`transition-all duration-300 ${
        collapsed ? "w-[76px]" : "w-[280px]"
      }`}
    >
      <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-3 shadow-2xl shadow-black/20 backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between gap-2">
          {!collapsed ? (
            <div className="px-2 text-[10px] uppercase tracking-[0.24em] text-slate-400">
              Club navigation
            </div>
          ) : (
            <div className="h-8" />
          )}

          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-950 text-slate-100 shadow-lg transition hover:bg-slate-900"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        <ClubQuickLinks
          base={base}
          active={active}
          clubId={clubId}
          collapsed={collapsed}
        />
      </div>
    </aside>
  );
}