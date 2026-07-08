"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, CheckCircle2, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";

type DailyResultRow = {
  date_key: string;
  label?: string | null;
  white_guess: number;
  black_guess: number;
  white_error: number;
  black_error: number;
  max_error: number;
  solved: boolean;
  submitted_at: string;
};

const TABLE_NAME = "daily_guess_the_elo_results";

function utcDayKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function formatDate(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export default function DailyArchivePage() {
  const [entries, setEntries] = useState<DailyResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const todayKey = utcDayKey();

  useEffect(() => {
    void (async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError) {
          console.error(userError);
          setEntries([]);
          return;
        }

        const user = userData.user;
        if (!user) {
          setEntries([]);
          return;
        }

        const { data, error } = await supabase
          .from(TABLE_NAME)
          .select(
            "date_key, label, white_guess, black_guess, white_error, black_error, max_error, solved, submitted_at",
          )
          .eq("user_id", user.id)
          .order("date_key", { ascending: false });

        if (error) {
          console.error(error);
          setEntries([]);
          return;
        }

        setEntries((data ?? []) as DailyResultRow[]);
      } catch (err) {
        console.error(err);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const solvedCount = useMemo(
    () => entries.filter((entry) => entry.date_key < todayKey && entry.solved).length,
    [entries, todayKey],
  );

  const totalRevealed = useMemo(
    () => entries.filter((entry) => entry.date_key < todayKey).length,
    [entries, todayKey],
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-sm text-slate-300">
              <CalendarDays className="h-4 w-4" />
              Daily Archive
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              Former daily results
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Results reveal after 00:00 UTC.
            </p>
          </div>

          <Link
            href="/daily"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to daily
          </Link>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="text-sm uppercase tracking-wide text-slate-400">
              Revealed
            </div>
            <div className="mt-2 text-3xl font-semibold">{totalRevealed}</div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="text-sm uppercase tracking-wide text-slate-400">
              Solved
            </div>
            <div className="mt-2 text-3xl font-semibold">{solvedCount}</div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="text-sm uppercase tracking-wide text-slate-400">
              Pending
            </div>
            <div className="mt-2 text-3xl font-semibold">
              {Math.max(0, entries.length - totalRevealed)}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-slate-400">
            Loading archive...
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-slate-400">
            No archived results yet.
          </div>
        ) : (
          <div className="grid gap-4">
            {entries.map((entry) => {
              const isLocked = entry.date_key === todayKey;
              const isRevealed = entry.date_key < todayKey;

              return (
                <div
                  key={entry.date_key}
                  className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/10"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold">
                        {formatDate(entry.date_key)}
                      </div>
                      <div className="mt-1 text-sm text-slate-400">
                        {entry.date_key}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {isLocked ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-slate-500/15 px-3 py-1 text-sm text-slate-300">
                          <Lock className="h-4 w-4" />
                          Pending until 00:00 UTC
                        </span>
                      ) : entry.solved ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-300">
                          <CheckCircle2 className="h-4 w-4" />
                          Solved
                        </span>
                      ) : (
                        <span className="rounded-full bg-rose-500/15 px-3 py-1 text-sm text-rose-300">
                          Missed by {entry.max_error}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        White guess
                      </div>
                      <div className="mt-1 text-xl font-semibold">
                        {entry.white_guess}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Black guess
                      </div>
                      <div className="mt-1 text-xl font-semibold">
                        {entry.black_guess}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        White miss
                      </div>
                      <div className="mt-1 text-xl font-semibold">
                        {isRevealed ? entry.white_error : "—"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Black miss
                      </div>
                      <div className="mt-1 text-xl font-semibold">
                        {isRevealed ? entry.black_error : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-slate-400">
                    Farthest miss: {isRevealed ? entry.max_error : "Locked"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}