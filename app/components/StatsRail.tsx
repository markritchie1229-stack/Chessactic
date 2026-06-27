"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { BarChart3, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

type ProfileRow = {
  games_solved: number | null;
};

export function StatsRail() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [open, setOpen] = useState(false);
  const [gamesSolved, setGamesSolved] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadStats = async (nextSession: Session | null) => {
      if (!mounted) return;

      setSession(nextSession);

      if (!nextSession) {
        setGamesSolved(0);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("games_solved")
        .eq("id", nextSession.user.id)
        .maybeSingle();

      if (!mounted) return;

      const row = data as ProfileRow | null;
      setGamesSolved(row?.games_solved ?? 0);
      setLoading(false);
    };

    const getInitialSession = async () => {
      const { data } = await supabase.auth.getSession();
      void loadStats(data.session);
    };

    void getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setLoading(true);
      void loadStats(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const statCards = [
    { label: "Games solved", value: gamesSolved.toLocaleString() },
    { label: "Current streak", value: "Soon" },
    { label: "Longest streak", value: "Soon" },
    { label: "Puzzle rating", value: "Soon" },
    { label: "Accuracy", value: "Soon" },
    { label: "Favorite theme", value: "Soon" },
  ];

  if (!session) {
    return (
      <div className="relative">
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

        {open ? (
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/40"
              aria-label="Close player stats panel"
            />

            <aside className="fixed left-[88px] top-[104px] z-50 w-[320px] rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-black/40">
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
            </aside>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative">
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

      {open ? (
        <>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/40"
            aria-label="Close player stats panel"
          />

          <aside className="fixed left-[88px] top-[104px] z-50 w-[320px] rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-black/40">
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

            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-sm text-slate-400">Games solved</div>
                <div className="mt-1 text-2xl font-semibold text-slate-100">
                  {loading ? "..." : gamesSolved.toLocaleString()}
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
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-400">
                More puzzle stats coming soon.
              </div>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}