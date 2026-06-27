"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { BarChart3, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

type ProfileRow = {
  games_solved?: number | null;
  current_streak?: number | null;
  longest_streak?: number | null;
  puzzle_rating?: number | null;
  accuracy?: number | null;
  favorite_theme?: string | null;
};

type StatCard = {
  label: string;
  value: string;
  helper?: string;
};

function formatNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString();
}

function formatAccuracy(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  const percentage = value <= 1 ? value * 100 : value;
  return `${percentage.toFixed(1)}%`;
}

export function StatsRail() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  const loadStats = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);

    if (!nextSession) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", nextSession.user.id)
      .maybeSingle();

    if (error) {
      console.warn("Could not load player stats:", error);
      setProfile(null);
      setLoading(false);
      return;
    }

    setProfile((data as ProfileRow | null) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    setHydrated(true);

    let mounted = true;

    const getInitialSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setLoading(true);
      await loadStats(data.session);
    };

    void getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setLoading(true);
      void loadStats(nextSession);
    });

    const handleMetricsUpdated = () => {
      const refresh = async () => {
        const { data } = await supabase.auth.getSession();
        await loadStats(data.session);
      };

      setLoading(true);
      void refresh();
    };

    window.addEventListener("profile-metrics-updated", handleMetricsUpdated);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener(
        "profile-metrics-updated",
        handleMetricsUpdated,
      );
    };
  }, [loadStats]);

  const statCards: StatCard[] = useMemo(
    () => [
      {
        label: "Games solved",
        value: formatNumber(profile?.games_solved ?? 0),
      },
      {
        label: "Current streak",
        value: formatNumber(profile?.current_streak),
        helper: "Consecutive days with at least one solve.",
      },
      {
        label: "Longest streak",
        value: formatNumber(profile?.longest_streak),
        helper: "Best solving streak ever.",
      },
      {
        label: "Puzzle rating",
        value: formatNumber(profile?.puzzle_rating),
        helper: "Your current training rating.",
      },
      {
        label: "Accuracy",
        value: formatAccuracy(profile?.accuracy),
        helper: "Correct solutions divided by attempts.",
      },
      {
        label: "Favorite theme",
        value: profile?.favorite_theme?.trim() || "—",
        helper: "The theme you solve most often.",
      },
    ],
    [profile],
  );

  const panel = (
    <>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-[60] bg-black/40"
        aria-label="Close player stats panel"
      />

      <aside className="fixed left-[88px] top-[104px] z-[70] w-[340px] rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between">
          <div className="text-sm uppercase tracking-wide text-slate-400">
            Player Stats
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl p-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
            aria-label="Close player stats panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!session ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
              You are not logged in.
            </div>

            <button
              onClick={() => router.push("/signup")}
              className="block w-full rounded-2xl bg-slate-100 px-4 py-3 text-center font-medium text-slate-950 transition hover:bg-white"
            >
              Log in / Sign up
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-sm text-slate-400">Games solved</div>
              <div className="mt-1 text-2xl font-semibold text-slate-100">
                {loading ? "..." : formatNumber(profile?.games_solved ?? 0)}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm">
              {statCards.slice(1).map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3"
                >
                  <div className="text-slate-500">{stat.label}</div>
                  <div className="mt-1 font-medium text-slate-100">
                    {loading ? "..." : stat.value}
                  </div>
                  {stat.helper ? (
                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      {stat.helper}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-400">
              These values refresh after each solved puzzle.
            </div>
          </div>
        )}
      </aside>
    </>
  );

  return (
    <div className="relative z-20">
      <div className="flex w-[72px] flex-col items-center rounded-3xl border border-slate-800 bg-slate-900/80 py-4 shadow-lg">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 transition hover:bg-slate-800"
          aria-label="Open player stats panel"
        >
          <BarChart3 className="h-6 w-6" />
        </button>
      </div>

      {open && hydrated && typeof document !== "undefined"
        ? createPortal(panel, document.body)
        : null}
    </div>
  );
}
