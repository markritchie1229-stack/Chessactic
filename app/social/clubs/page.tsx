"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Search, Shield, Sparkles } from "lucide-react";

import { CreateClubForm } from "./_components/CreateClubForm";
import { searchClubs } from "./_lib/queries";
import type { ClubRecord } from "./_lib/types";

export default function ClubsPage() {
  const [clubs, setClubs] = useState<ClubRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreateFlow, setShowCreateFlow] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadClubs() {
      try {
        setLoading(true);
        const results = await searchClubs("");
        if (mounted) {
          setClubs(results);
          setError("");
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load clubs.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadClubs();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredClubs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clubs;

    return clubs.filter((club) => {
      return (
        club.title.toLowerCase().includes(term) ||
        (club.description ?? "").toLowerCase().includes(term) ||
        club.title_search.toLowerCase().includes(term)
      );
    });
  }, [clubs, search]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.28em] text-slate-400">
              Social
            </div>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Clubs</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Browse clubs here. Each club has its own page for forum, members,
              invites, and settings.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateFlow(true)}
            className="inline-flex h-fit items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            <Sparkles className="h-4 w-4" />
            Create a new club
          </button>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
          <main className="space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Club list</h2>
                  <p className="text-sm text-slate-400">
                    Open a club page or search for a club by title.
                  </p>
                </div>
                <div className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
                  {filteredClubs.length} clubs
                </div>
              </div>

              <div className="relative mb-5">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search clubs"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 py-3 pl-11 pr-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500"
                />
              </div>

              {loading ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-sm text-slate-400">
                  Loading clubs...
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                  {error}
                </div>
              ) : filteredClubs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-sm text-slate-400">
                  No clubs found.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredClubs.map((club) => (
                    <Link
                      key={club.id}
                      href={`/social/clubs/${club.title_search}`}
                      className="group block rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-cyan-500/40 hover:bg-slate-950"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-100 group-hover:text-cyan-300">
                              {club.title}
                            </span>
                            <Shield className="h-4 w-4 text-slate-500" />
                          </div>
                          <div className="text-sm text-slate-500">
                            Created by {club.created_by ?? "unknown"}
                          </div>
                        </div>

                        <div className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-400">
                          Open club page
                        </div>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        {club.description?.trim() || "No description yet."}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                        <span className="rounded-full bg-slate-900 px-3 py-1">
                          Slug: {club.title_search}
                        </span>
                        {club.banner_url ? (
                          <span className="rounded-full bg-slate-900 px-3 py-1">
                            Banner set
                          </span>
                        ) : null}
                        {club.avatar_url ? (
                          <span className="rounded-full bg-slate-900 px-3 py-1">
                            Avatar set
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </main>

          <aside className="space-y-6">
            {showCreateFlow ? (
              <CreateClubForm />
            ) : (
              <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
                <div className="mb-4 flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-cyan-400" />
                  <div>
                    <h2 className="text-xl font-semibold">Create a new club</h2>
                    <p className="text-sm text-slate-400">
                      Start the club creation flow from here.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCreateFlow(true)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  Create a new club
                  <ArrowRight className="h-4 w-4" />
                </button>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}